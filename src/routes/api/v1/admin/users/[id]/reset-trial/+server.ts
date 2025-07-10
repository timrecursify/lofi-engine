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
      // Reset trial by creating a new trial subscription
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 14) // 14 day trial

      await db.prepare(`
        INSERT OR REPLACE INTO subscriptions (
          id, user_id, stripe_subscription_id, plan_type, status,
          current_period_start, current_period_end, cancel_at_period_end
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        `trial_reset_${userId}_${Date.now()}`,
        userId,
        `trial_reset_${Date.now()}`,
        'pro_trial',
        'trialing',
        new Date().toISOString(),
        trialEnd.toISOString(),
        false
      ).run()

      // Update user plan to pro during trial
      await db.prepare(`
        UPDATE users 
        SET plan = 'pro', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(userId).run()

      // Log the admin action
      let currentAuthState
      authState.subscribe(state => currentAuthState = state)()
      const adminId = currentAuthState?.user?.id || 'unknown'

      await db.prepare(`
        INSERT INTO admin_actions (
          admin_id, action, target_user_id, details, timestamp
        ) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `).bind(adminId, 'reset_trial', userId, 'Trial reset by admin').run()

      return json({
        success: true,
        message: 'Trial reset successfully',
        data: {
          trialEndsAt: trialEnd.toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to reset trial:', error)
      return json({
        success: false,
        error: 'Failed to reset trial'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Reset trial endpoint error:', error)
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 