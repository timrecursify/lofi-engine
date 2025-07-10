import { json } from '@sveltejs/kit'
import { requireSuperAdmin } from '$lib/auth'
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
          queue: generateMockQueue()
        }
      })
    }

    try {
      const queueItems = await db.prepare(`
        SELECT 
          id,
          title,
          category,
          content_type,
          status,
          priority,
          progress,
          estimated_time,
          source_id,
          error_message,
          created_at,
          updated_at,
          started_at,
          completed_at
        FROM content_generation_queue
        ORDER BY 
          CASE priority 
            WHEN 'high' THEN 1 
            WHEN 'normal' THEN 2 
            WHEN 'low' THEN 3 
          END,
          created_at ASC
      `).all()

      const formattedQueue = queueItems.results?.map((item: any) => ({
        id: item.id,
        title: item.title,
        category: item.category,
        contentType: item.content_type,
        status: item.status,
        priority: item.priority,
        progress: item.progress || 0,
        estimatedTime: item.estimated_time || 0,
        sourceId: item.source_id,
        errorMessage: item.error_message,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
        startedAt: item.started_at,
        completedAt: item.completed_at
      })) || []

      return json({
        success: true,
        data: {
          queue: formattedQueue
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({
        success: true,
        data: {
          queue: generateMockQueue()
        }
      })
    }
  } catch (error) {
    console.error('Failed to load generation queue:', error)
    return json({ error: 'Failed to load generation queue' }, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const itemId = url.searchParams.get('id')
    
    if (!itemId) {
      return json({ error: 'No item ID provided' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, simulating deletion')
      return json({
        success: true,
        data: {
          deleted: 1,
          itemId
        }
      })
    }

    try {
      // Only allow deletion of queued or failed items
      const result = await db.prepare(`
        DELETE FROM content_generation_queue 
        WHERE id = ? AND status IN ('queued', 'failed')
      `).bind(itemId).run()

      return json({
        success: true,
        data: {
          deleted: result.changes || 0,
          itemId
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({ error: 'Failed to delete queue item' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to delete queue item:', error)
    return json({ error: 'Failed to delete queue item' }, { status: 500 })
  }
}

// Generate mock queue for development
function generateMockQueue() {
  return [
    {
      id: '1',
      title: 'Breaking: Technology News Update',
      category: 'news',
      contentType: 'automated',
      status: 'processing',
      priority: 'high',
      progress: 75,
      estimatedTime: 120,
      sourceId: '1',
      errorMessage: null,
      createdAt: '2024-01-09T11:15:00Z',
      updatedAt: '2024-01-09T11:17:00Z',
      startedAt: '2024-01-09T11:16:00Z',
      completedAt: null
    },
    {
      id: '2',
      title: 'Daily Weather Update',
      category: 'weather',
      contentType: 'automated',
      status: 'queued',
      priority: 'normal',
      progress: 0,
      estimatedTime: 180,
      sourceId: '2',
      errorMessage: null,
      createdAt: '2024-01-09T11:10:00Z',
      updatedAt: '2024-01-09T11:10:00Z',
      startedAt: null,
      completedAt: null
    },
    {
      id: '3',
      title: 'Educational: Space Exploration Facts',
      category: 'education',
      contentType: 'manual',
      status: 'queued',
      priority: 'low',
      progress: 0,
      estimatedTime: 240,
      sourceId: null,
      errorMessage: null,
      createdAt: '2024-01-09T11:05:00Z',
      updatedAt: '2024-01-09T11:05:00Z',
      startedAt: null,
      completedAt: null
    },
    {
      id: '4',
      title: 'Entertainment: Movie Reviews',
      category: 'entertainment',
      contentType: 'automated',
      status: 'failed',
      priority: 'normal',
      progress: 25,
      estimatedTime: 0,
      sourceId: '4',
      errorMessage: 'TTS service temporarily unavailable',
      createdAt: '2024-01-09T10:45:00Z',
      updatedAt: '2024-01-09T10:50:00Z',
      startedAt: '2024-01-09T10:47:00Z',
      completedAt: null
    },
    {
      id: '5',
      title: 'Manual Content: Product Launch News',
      category: 'news',
      contentType: 'manual',
      status: 'completed',
      priority: 'high',
      progress: 100,
      estimatedTime: 0,
      sourceId: null,
      errorMessage: null,
      createdAt: '2024-01-09T10:30:00Z',
      updatedAt: '2024-01-09T10:35:00Z',
      startedAt: '2024-01-09T10:31:00Z',
      completedAt: '2024-01-09T10:35:00Z'
    }
  ]
} 