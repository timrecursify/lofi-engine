import { json } from '@sveltejs/kit'
import { requireSuperAdmin, authState } from '$lib/auth'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, platform }) => {
  try {
    // Verify super admin access
    const hasAccess = requireSuperAdmin()
    if (!hasAccess) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = params.id
    if (!userId) {
      return json({ error: 'User ID is required' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      return json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    try {
      // Check if user exists and is not banned
      const user = await db.prepare(`
        SELECT id, email, status FROM users WHERE id = ?
      `).bind(userId).first()

      if (!user) {
        return json({
          success: false,
          error: 'User not found'
        }, { status: 404 })
      }

      if (user.status === 'banned') {
        return json({
          success: false,
          error: 'Cannot impersonate banned user'
        }, { status: 400 })
      }

      // Create impersonation token (valid for 1 hour)
      const impersonationToken = `imp_${Date.now()}_${userId}_${Math.random().toString(36).substring(2)}`
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

      await db.prepare(`
        INSERT INTO impersonation_tokens (
          token, admin_id, user_id, expires_at, created_at
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        impersonationToken,
        getCurrentAdminId(),
        userId,
        expiresAt.toISOString()
      ).run()

      // Log the admin action
      await db.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(
        getCurrentAdminId(),
        'impersonate_user',
        userId,
        `Impersonation session started for user ${user.email}`
      ).run()

      return json({
        success: true,
        message: 'Impersonation token created',
        data: {
          token: impersonationToken,
          expiresAt: expiresAt.toISOString(),
          redirectUrl: `/?impersonate=${impersonationToken}`
        }
      })
    } catch (error) {
      console.error('Failed to create impersonation token:', error)
      return json({
        success: false,
        error: 'Failed to create impersonation token'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Impersonate endpoint error:', error)
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Get current admin user ID
function getCurrentAdminId(): string {
  let currentAuthState
  authState.subscribe(state => currentAuthState = state)()
  return currentAuthState?.user?.id || 'unknown'
} 