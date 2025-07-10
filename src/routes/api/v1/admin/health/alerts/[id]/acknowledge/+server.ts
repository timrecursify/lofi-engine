import { json } from '@sveltejs/kit'
import { requireSuperAdmin, authState } from '$lib/auth'
import { HealthMonitor } from '$lib/services/health-monitor'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, platform }) => {
  try {
    // Verify super admin access
    const hasAccess = requireSuperAdmin()
    if (!hasAccess) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current user from auth state
    let currentAuthState
    authState.subscribe(state => currentAuthState = state)()
    const userId = currentAuthState?.user?.id || 'unknown'

    const alertId = params.id
    if (!alertId) {
      return json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, cannot acknowledge alert')
      return json({
        success: false,
        error: 'Database not available'
      }, { status: 503 })
    }

    try {
      const success = await HealthMonitor.acknowledgeAlert(alertId, userId, platform)
      
      if (success) {
        return json({
          success: true,
          message: 'Alert acknowledged successfully'
        })
      } else {
        return json({
          success: false,
          error: 'Failed to acknowledge alert'
        }, { status: 500 })
      }
    } catch (error) {
      console.error('Failed to acknowledge alert:', error)
      return json({
        success: false,
        error: 'Failed to acknowledge alert'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Acknowledge alert endpoint error:', error)
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
} 