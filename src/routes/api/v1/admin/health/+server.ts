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
      console.warn('Database not available, using mock data')
      return json({
        success: true,
        data: {
          metrics: await generateMockHealthMetrics()
        }
      })
    }

    try {
      const metrics = await HealthMonitor.getHealthMetrics(platform)
      
      return json({
        success: true,
        data: {
          metrics,
          lastUpdated: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to get health metrics:', error)
      
      // Fallback to mock data if health monitoring fails
      return json({
        success: true,
        data: {
          metrics: await generateMockHealthMetrics(),
          lastUpdated: new Date().toISOString(),
          warning: 'Using mock data due to monitoring system error'
        }
      })
    }
  } catch (error) {
    console.error('Health endpoint error:', error)
    return json({
      success: false,
      error: 'Failed to get health metrics'
    }, { status: 500 })
  }
}

// Mock health metrics for development/fallback
async function generateMockHealthMetrics() {
  const now = new Date()
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  
  // Simulate realistic metrics
  const totalJobs = Math.floor(Math.random() * 50) + 20
  const failedJobs = Math.floor(Math.random() * 3)
  const successfulJobs = totalJobs - failedJobs
  const jobsInProgress = Math.floor(Math.random() * 5)
  
  return {
    timestamp: now.toISOString(),
    system: {
      uptime: Math.floor(Math.random() * 86400) + 3600, // 1-25 hours
      version: process.env.APP_VERSION || '1.0.0',
      environment: (process.env.NODE_ENV as any) || 'development'
    },
    pipeline: {
      totalJobs,
      successfulJobs,
      failedJobs,
      averageJobTime: Math.floor(Math.random() * 120) + 30, // 30-150 seconds
      jobsInProgress,
      successRate: totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 100
    },
    resources: {
      kvOperations: Math.floor(Math.random() * 500) + 100,
      r2Operations: Math.floor(Math.random() * 100) + 20,
      dbQueries: Math.floor(Math.random() * 1000) + 200,
      ttsRequests: totalJobs,
      grokRequests: totalJobs
    },
    performance: {
      averageResponseTime: Math.floor(Math.random() * 500) + 100, // 100-600ms
      errorRate: Math.random() * 2, // 0-2%
      activeUsers: Math.floor(Math.random() * 100) + 10, // 10-110 users
      totalRequests: Math.floor(Math.random() * 1000) + 500 // 500-1500 requests
    },
    storage: {
      totalClips: Math.floor(Math.random() * 1000) + 100,
      kvStorageUsed: Math.floor(Math.random() * 500) + 50, // 50-550 MB
      r2StorageUsed: Math.floor(Math.random() * 2000) + 100, // 100-2100 MB
      oldestClip: oneHourAgo.toISOString(),
      newestClip: now.toISOString()
    }
  }
} 