import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { logger } from '$lib/utils/logger'
import { QueueOrchestrator } from '$lib/services/queue-orchestrator'

interface CleanupResponse {
  success: boolean
  message: string
  deletedCount?: number
  error?: string
}

// POST: Handle cron trigger for cleanup
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    // Verify this is a cron request (Cloudflare adds specific headers)
    const cronHeader = request.headers.get('CF-Cron')
    if (!cronHeader) {
      return json({ 
        error: 'Forbidden', 
        message: 'This endpoint is only accessible via cron trigger' 
      }, { status: 403 })
    }

    // Clean up old clips (older than 24 hours)
    const deletedCount = await QueueOrchestrator.cleanupOldClips(platform, 86400)

    // Clean up old pipeline jobs (older than 7 days)
    const db = (platform as any)?.env?.DB
    if (db) {
      const cleanupStmt = db.prepare(`
        DELETE FROM pipeline_jobs 
        WHERE created_at < datetime('now', '-7 days')
      `)
      await cleanupStmt.run()
    }

    logger.info(`Cleanup completed: ${deletedCount} clips deleted`, 'cron-cleanup', {
      deletedCount,
      timestamp: new Date().toISOString()
    })

    return json({
      success: true,
      message: `Cleanup completed: ${deletedCount} clips deleted`,
      deletedCount
    })

  } catch (error) {
    logger.error('Cleanup cron error', 'cron-cleanup', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return json({ 
      error: 'Internal Server Error', 
      message: 'Cleanup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET: Status check endpoint
export const GET: RequestHandler = async ({ platform }) => {
  try {
    const db = (platform as any)?.env?.DB
    if (!db) {
      return json({ 
        error: 'Database Error', 
        message: 'Database not available' 
      }, { status: 500 })
    }

    // Get cleanup statistics
    const clipCountStmt = db.prepare(`
      SELECT COUNT(*) as total_clips,
             COUNT(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 END) as recent_clips
      FROM content_clips
    `)
    const clipStats = await clipCountStmt.first()

    const jobCountStmt = db.prepare(`
      SELECT COUNT(*) as total_jobs,
             COUNT(CASE WHEN created_at > datetime('now', '-24 hours') THEN 1 END) as recent_jobs
      FROM pipeline_jobs
    `)
    const jobStats = await jobCountStmt.first()

    return json({
      success: true,
      stats: {
        clips: {
          total: clipStats.total_clips,
          recent: clipStats.recent_clips
        },
        jobs: {
          total: jobStats.total_jobs,
          recent: jobStats.recent_jobs
        }
      }
    })

  } catch (error) {
    logger.error('Cleanup status error', 'cron-cleanup', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return json({ 
      error: 'Internal Server Error', 
      message: 'Status check failed' 
    }, { status: 500 })
  }
}

// OPTIONS: Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
} 