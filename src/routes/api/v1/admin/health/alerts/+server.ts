import { json } from '@sveltejs/kit'
import { requireSuperAdmin } from '$lib/auth'
import { HealthMonitor } from '$lib/services/health-monitor'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, using mock alerts')
      return json({
        success: true,
        data: {
          alerts: generateMockAlerts()
        }
      })
    }

    try {
      const alerts = await HealthMonitor.getActiveAlerts(platform)
      
      return json({
        success: true,
        data: {
          alerts,
          lastUpdated: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to get alerts:', error)
      
      // Fallback to mock data if alerts system fails
      return json({
        success: true,
        data: {
          alerts: generateMockAlerts(),
          lastUpdated: new Date().toISOString(),
          warning: 'Using mock data due to alerts system error'
        }
      })
    }
  } catch (error) {
    console.error('Alerts endpoint error:', error)
    return json({
      success: false,
      error: 'Failed to get alerts'
    }, { status: 500 })
  }
}

// Mock alerts for development/fallback
function generateMockAlerts() {
  const now = new Date()
  const alerts = []

  // Randomly generate some alerts for testing
  const alertTypes = [
    {
      type: 'warning',
      severity: 'medium',
      title: 'High Response Time',
      message: 'API response time is elevated at 850ms, above normal threshold',
      category: 'performance'
    },
    {
      type: 'error',
      severity: 'high',
      title: 'Pipeline Job Failures',
      message: 'Multiple content generation jobs have failed in the last hour',
      category: 'pipeline'
    },
    {
      type: 'warning',
      severity: 'low',
      title: 'Storage Usage Warning',
      message: 'KV storage usage is approaching 75% of capacity',
      category: 'storage'
    }
  ]

  // Generate 0-2 random alerts
  const numAlerts = Math.floor(Math.random() * 3)
  
  for (let i = 0; i < numAlerts; i++) {
    const alert = alertTypes[Math.floor(Math.random() * alertTypes.length)]
    const timestamp = new Date(now.getTime() - Math.random() * 60 * 60 * 1000) // Within last hour
    
    alerts.push({
      id: `mock_alert_${Date.now()}_${i}`,
      type: alert.type,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      category: alert.category,
      timestamp: timestamp.toISOString(),
      acknowledged: Math.random() > 0.7, // 30% chance of being acknowledged
      acknowledgedBy: Math.random() > 0.7 ? 'admin@example.com' : undefined,
      acknowledgedAt: Math.random() > 0.7 ? timestamp.toISOString() : undefined,
      resolved: false,
      resolvedAt: undefined
    })
  }

  return alerts
} 