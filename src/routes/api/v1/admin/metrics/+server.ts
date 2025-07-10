import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { requireSuperAdmin } from '$lib/auth'

interface AdminMetrics {
  activeUsers: number
  totalUsers: number
  clipPoolDepth: number
  ttsSpend: number
  adRevenue: number
  systemHealth: 'healthy' | 'warning' | 'error'
  lastUpdated: string
}

export const GET: RequestHandler = async ({ locals, platform }) => {
  const { auth } = locals
  
  // Check admin access
  if (!auth.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userRole = auth.user?.publicMetadata?.role
  if (!userRole || (userRole !== 'admin' && userRole !== 'super-admin')) {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const db = (platform as any)?.env?.DB
    if (!db) {
      return json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    const now = new Date()
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
    const currentMonth = now.toISOString().slice(0, 7) // YYYY-MM format
    
    // Get active users (users who were active in the last 30 minutes)
    const activeUsersResult = await db.prepare(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM user_preferences 
      WHERE updated_at >= ? AND is_active = TRUE
    `).bind(thirtyMinutesAgo.toISOString()).first()
    
    // Get total registered users
    const totalUsersResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM users
      WHERE created_at IS NOT NULL
    `).first()
    
    // Get clip pool depth (available clips)
    const clipPoolResult = await db.prepare(`
      SELECT COUNT(*) as count
      FROM content_clips 
      WHERE expires_at > ? AND status = 'ready'
    `).bind(now.toISOString()).first()
    
    // Get TTS spend this month (approximate based on clip count and average cost)
    const ttsSpendResult = await db.prepare(`
      SELECT COUNT(*) as clip_count
      FROM content_clips 
      WHERE created_at >= ? AND tts_cost > 0
    `).bind(currentMonth + '-01').first()
    
    // Calculate approximate TTS spend (assuming $0.003 per clip average)
    const ttsSpend = ((ttsSpendResult?.clip_count as number) || 0) * 0.003
    
    // Get ad revenue this month (from ad impressions)
    const adRevenueResult = await db.prepare(`
      SELECT COUNT(*) as impression_count
      FROM ad_impressions 
      WHERE created_at >= ? AND event_type = 'impression'
    `).bind(currentMonth + '-01').first()
    
    // Calculate approximate ad revenue (assuming $0.001 CPM)
    const adRevenue = ((adRevenueResult?.impression_count as number) || 0) * 0.001
    
    // Determine system health based on metrics
    let systemHealth: 'healthy' | 'warning' | 'error' = 'healthy'
    
    const clipCount = (clipPoolResult?.count as number) || 0
    const activeUsers = (activeUsersResult?.count as number) || 0
    
    if (clipCount < 10) {
      systemHealth = 'error' // Critical: Low clip pool
    } else if (clipCount < 50 || activeUsers === 0) {
      systemHealth = 'warning' // Warning: Low resources or no active users
    }
    
    const metrics: AdminMetrics = {
      activeUsers: activeUsers,
      totalUsers: (totalUsersResult?.count as number) || 0,
      clipPoolDepth: clipCount,
      ttsSpend: Math.round(ttsSpend * 100) / 100, // Round to 2 decimal places
      adRevenue: Math.round(adRevenue * 100) / 100, // Round to 2 decimal places
      systemHealth,
      lastUpdated: now.toISOString()
    }
    
    return json(metrics)
    
  } catch (error) {
    console.error('Failed to fetch admin metrics:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST endpoint for manual metrics refresh
export const POST: RequestHandler = async ({ locals, platform }) => {
  const { auth } = locals
  
  // Check admin access
  if (!auth.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userRole = auth.user?.publicMetadata?.role
  if (!userRole || (userRole !== 'admin' && userRole !== 'super-admin')) {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const db = (platform as any)?.env?.DB
    if (!db) {
      return json({ error: 'Database unavailable' }, { status: 503 })
    }
    
    // Force refresh of content pipeline if needed
    await db.prepare(`
      UPDATE content_clips 
      SET updated_at = ?
      WHERE status = 'ready' AND expires_at > ?
    `).bind(new Date().toISOString(), new Date().toISOString()).run()
    
    return json({ success: true, message: 'Metrics refreshed' })
    
  } catch (error) {
    console.error('Failed to refresh metrics:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
} 