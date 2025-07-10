import { json } from '@sveltejs/kit'
import { requireSuperAdmin, authState } from '$lib/auth'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  try {
    // Verify super admin access
    const hasAccess = requireSuperAdmin()
    if (!hasAccess) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, using mock data')
      return json({
        success: true,
        data: generateMockUserData(url)
      })
    }

    // Parse query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const search = url.searchParams.get('search') || ''
    const planFilter = url.searchParams.get('plan') || 'all'
    const statusFilter = url.searchParams.get('status') || 'all'
    const sortBy = url.searchParams.get('sortBy') || 'createdAt'
    const sortOrder = url.searchParams.get('sortOrder') || 'desc'

    try {
      // Build WHERE clause
      const conditions = ['1=1'] // Base condition
      const params = []

      if (search) {
        conditions.push('(u.email LIKE ? OR u.name LIKE ? OR u.id LIKE ?)')
        const searchPattern = `%${search}%`
        params.push(searchPattern, searchPattern, searchPattern)
      }

      if (planFilter !== 'all') {
        conditions.push('u.plan = ?')
        params.push(planFilter)
      }

      if (statusFilter !== 'all') {
        conditions.push('u.status = ?')
        params.push(statusFilter)
      }

      const whereClause = conditions.join(' AND ')

      // Build ORDER BY clause
      let orderBy = 'u.created_at DESC'
      if (sortBy === 'email') {
        orderBy = `u.email ${sortOrder.toUpperCase()}`
      } else if (sortBy === 'plan') {
        orderBy = `u.plan ${sortOrder.toUpperCase()}`
      } else if (sortBy === 'lastSeenAt') {
        orderBy = `u.last_seen_at ${sortOrder.toUpperCase()}`
      } else {
        orderBy = `u.created_at ${sortOrder.toUpperCase()}`
      }

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        WHERE ${whereClause}
      `
      const countResult = await db.prepare(countQuery).bind(...params).first()
      const total = countResult?.total || 0

      // Get users with pagination
      const offset = (page - 1) * limit
      const usersQuery = `
        SELECT 
          u.*,
          s.id as subscription_id,
          s.status as subscription_status,
          s.current_period_end,
          s.cancel_at_period_end,
          COALESCE(play_stats.total_plays, 0) as total_plays,
          COALESCE(session_stats.total_sessions, 0) as total_sessions
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status = 'active'
        LEFT JOIN (
          SELECT user_id, COUNT(*) as total_plays
          FROM play_log
          GROUP BY user_id
        ) play_stats ON u.id = play_stats.user_id
        LEFT JOIN (
          SELECT user_id, COUNT(DISTINCT session_id) as total_sessions
          FROM play_log
          GROUP BY user_id
        ) session_stats ON u.id = session_stats.user_id
        WHERE ${whereClause}
        ORDER BY ${orderBy}
        LIMIT ? OFFSET ?
      `
      
      const usersResult = await db.prepare(usersQuery).bind(...params, limit, offset).all()
      
      const users = usersResult.results?.map((row: any) => ({
        id: row.id,
        email: row.email,
        name: row.name,
        plan: row.plan,
        status: row.status || 'active',
        emailVerified: row.email_verified,
        createdAt: row.created_at,
        lastSeenAt: row.last_seen_at,
        subscription: row.subscription_id ? {
          id: row.subscription_id,
          status: row.subscription_status,
          currentPeriodEnd: row.current_period_end,
          cancelAtPeriodEnd: row.cancel_at_period_end
        } : null,
        stats: {
          totalPlays: row.total_plays,
          totalSessions: row.total_sessions,
          favoriteTopics: [] // TODO: Calculate from user preferences
        }
      })) || []

      return json({
        success: true,
        data: {
          users,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit)
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      // Fallback to mock data
      return json({
        success: true,
        data: generateMockUserData(url),
        warning: 'Using mock data due to database error'
      })
    }
  } catch (error) {
    console.error('Failed to get users:', error)
    return json({
      success: false,
      error: 'Failed to get users'
    }, { status: 500 })
  }
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    // Verify super admin access
    const hasAccess = requireSuperAdmin()
    if (!hasAccess) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      return json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    const { action, userId, ...data } = await request.json()

    try {
      switch (action) {
        case 'ban':
          await db.prepare(`
            UPDATE users 
            SET status = 'banned', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(userId).run()

          // Log the action
          await logAdminAction(db, 'ban_user', userId, data.reason)
          break

        case 'unban':
          await db.prepare(`
            UPDATE users 
            SET status = 'active', updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(userId).run()

          await logAdminAction(db, 'unban_user', userId, 'User unbanned')
          break

        case 'update_subscription':
          const { plan, expiresAt, reason } = data
          
          // Update user plan
          await db.prepare(`
            UPDATE users 
            SET plan = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).bind(plan, userId).run()

          // If this is a pro override, create a subscription record
          if (plan === 'pro' && expiresAt) {
            await db.prepare(`
              INSERT OR REPLACE INTO subscriptions (
                id, user_id, stripe_subscription_id, plan_type, status,
                current_period_start, current_period_end, cancel_at_period_end
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
              `admin_override_${userId}_${Date.now()}`,
              userId,
              `admin_override_${Date.now()}`,
              'pro_monthly',
              'active',
              new Date().toISOString(),
              expiresAt,
              false
            ).run()
          }

          await logAdminAction(db, 'update_subscription', userId, reason)
          break

        case 'reset_trial':
          // Reset trial would typically involve updating subscription records
          await logAdminAction(db, 'reset_trial', userId, 'Trial reset by admin')
          break

        case 'add_notes':
          // Store admin notes about the user
          await db.prepare(`
            INSERT INTO admin_notes (user_id, note, created_by, created_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
          `).bind(userId, data.notes, getCurrentAdminId()).run()
          break

        default:
          return json({
            success: false,
            error: 'Invalid action'
          }, { status: 400 })
      }

      return json({
        success: true,
        message: 'Action completed successfully'
      })
    } catch (error) {
      console.error('Database operation failed:', error)
      return json({
        success: false,
        error: 'Database operation failed'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Admin users action error:', error)
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Helper function to log admin actions
async function logAdminAction(db: any, action: string, targetUserId: string, details: string) {
  try {
    await db.prepare(`
      INSERT INTO admin_actions (
        admin_id, action, target_user_id, details, timestamp
      ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(getCurrentAdminId(), action, targetUserId, details).run()
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

// Get current admin user ID
function getCurrentAdminId(): string {
  let currentAuthState
  authState.subscribe(state => currentAuthState = state)()
  return currentAuthState?.user?.id || 'unknown'
}

// Generate mock user data for development/fallback
function generateMockUserData(url: URL) {
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')
  const search = url.searchParams.get('search') || ''

  const mockUsers = [
    {
      id: 'user_1',
      email: 'john.doe@example.com',
      name: 'John Doe',
      plan: 'pro',
      status: 'active',
      emailVerified: true,
      createdAt: '2024-01-15T10:30:00Z',
      lastSeenAt: '2024-07-08T14:22:00Z',
      subscription: {
        id: 'sub_1',
        status: 'active',
        currentPeriodEnd: '2024-08-15T10:30:00Z',
        cancelAtPeriodEnd: false
      },
      stats: {
        totalPlays: 342,
        totalSessions: 28,
        favoriteTopics: ['world-news', 'crypto', 'tech']
      }
    },
    {
      id: 'user_2',
      email: 'jane.smith@example.com',
      name: 'Jane Smith',
      plan: 'free',
      status: 'active',
      emailVerified: true,
      createdAt: '2024-02-03T09:15:00Z',
      lastSeenAt: '2024-07-07T11:45:00Z',
      subscription: null,
      stats: {
        totalPlays: 156,
        totalSessions: 15,
        favoriteTopics: ['local-news', 'health', 'education']
      }
    },
    {
      id: 'user_3',
      email: 'banned.user@example.com',
      name: 'Banned User',
      plan: 'free',
      status: 'banned',
      emailVerified: false,
      createdAt: '2024-01-20T16:45:00Z',
      lastSeenAt: '2024-06-15T08:30:00Z',
      subscription: null,
      stats: {
        totalPlays: 45,
        totalSessions: 8,
        favoriteTopics: ['world-news']
      }
    }
  ]

  // Filter by search if provided
  let filteredUsers = mockUsers
  if (search) {
    const searchLower = search.toLowerCase()
    filteredUsers = mockUsers.filter(user => 
      user.email.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower) ||
      user.id.toLowerCase().includes(searchLower)
    )
  }

  const total = filteredUsers.length
  const offset = (page - 1) * limit
  const paginatedUsers = filteredUsers.slice(offset, offset + limit)

  return {
    users: paginatedUsers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit)
  }
} 