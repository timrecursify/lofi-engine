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
      // Update user status to active
      await db.prepare(`
        UPDATE users 
        SET status = 'active', updated_at = CURRENT_TIMESTAMP
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
      `).bind(adminId, 'unban_user', userId, 'User unbanned by admin').run()

      return json({
        success: true,
        message: 'User unbanned successfully'
      })
    } catch (error) {
      console.error('Failed to unban user:', error)
      return json({
        success: false,
        error: 'Failed to unban user'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Unban user endpoint error:', error)
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 