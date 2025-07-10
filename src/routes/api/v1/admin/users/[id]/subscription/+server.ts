import { json } from '@sveltejs/kit'
import { requireSuperAdmin, authState } from '$lib/auth'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, request, locals, platform }) => {
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

    const { plan, expiresAt, reason } = await request.json()
    if (!plan || !reason?.trim()) {
      return json({ error: 'Plan and reason are required' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      return json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    try {
      // Update user plan
      await db.prepare(`
        UPDATE users 
        SET plan = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(plan, userId).run()

      // If this is a pro override with expiration, create a subscription record
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

      // Log the admin action
      let currentAuthState
      authState.subscribe(state => currentAuthState = state)()
      const adminId = currentAuthState?.user?.id || 'unknown'

      await db.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(adminId, 'update_subscription', userId, reason).run()

      return json({
        success: true,
        message: 'Subscription updated successfully'
      })
    } catch (error) {
      console.error('Failed to update subscription:', error)
      return json({
        success: false,
        error: 'Failed to update subscription'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Subscription endpoint error:', error)
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 