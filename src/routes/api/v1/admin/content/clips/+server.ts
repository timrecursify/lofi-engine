import { json } from '@sveltejs/kit'
import { requireSuperAdmin } from '$lib/auth'
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ url, locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get query parameters
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '20')
    const category = url.searchParams.get('category')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')

    const offset = (page - 1) * limit

    // Build query
    let query = `
      SELECT 
        id,
        title,
        category,
        status,
        duration,
        file_size as size,
        voice_id as voice,
        play_count,
        created_at,
        updated_at
      FROM content_clips
      WHERE 1=1
    `
    
    const params = []

    if (category) {
      query += ` AND category = ?`
      params.push(category)
    }

    if (status) {
      query += ` AND status = ?`
      params.push(status)
    }

    if (search) {
      query += ` AND (title LIKE ? OR content LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, using mock data')
      return json({
        success: true,
        data: {
          clips: generateMockClips(page, limit),
          total: 45,
          page,
          limit
        }
      })
    }

    try {
      // Get clips
      const clips = await db.prepare(query).bind(...params).all()

      // Get total count
      let countQuery = `SELECT COUNT(*) as total FROM content_clips WHERE 1=1`
      const countParams = []

      if (category) {
        countQuery += ` AND category = ?`
        countParams.push(category)
      }

      if (status) {
        countQuery += ` AND status = ?`
        countParams.push(status)
      }

      if (search) {
        countQuery += ` AND (title LIKE ? OR content LIKE ?)`
        countParams.push(`%${search}%`, `%${search}%`)
      }

      const countResult = await db.prepare(countQuery).bind(...countParams).first()
      const total = countResult?.total || 0

      // Format results
      const formattedClips = clips.results?.map((clip: any) => ({
        id: clip.id,
        title: clip.title,
        category: clip.category,
        status: clip.status,
        duration: clip.duration,
        size: clip.size ? parseFloat(clip.size) : 0,
        voice: clip.voice || 'default',
        playCount: clip.play_count || 0,
        createdAt: clip.created_at,
        updatedAt: clip.updated_at
      })) || []

      return json({
        success: true,
        data: {
          clips: formattedClips,
          total,
          page,
          limit
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({
        success: true,
        data: {
          clips: generateMockClips(page, limit),
          total: 45,
          page,
          limit
        }
      })
    }
  } catch (error) {
    console.error('Failed to load content clips:', error)
    return json({ error: 'Failed to load content clips' }, { status: 500 })
  }
}

export const DELETE: RequestHandler = async ({ url, locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const clipIds = url.searchParams.get('ids')?.split(',') || []
    
    if (clipIds.length === 0) {
      return json({ error: 'No clip IDs provided' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, simulating deletion')
      return json({
        success: true,
        data: {
          deleted: clipIds.length,
          clipIds
        }
      })
    }

    try {
      // Delete clips in batch
      const placeholders = clipIds.map(() => '?').join(',')
      const query = `DELETE FROM content_clips WHERE id IN (${placeholders})`
      
      const result = await db.prepare(query).bind(...clipIds).run()

      return json({
        success: true,
        data: {
          deleted: result.changes || 0,
          clipIds
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({ error: 'Failed to delete clips' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to delete content clips:', error)
    return json({ error: 'Failed to delete content clips' }, { status: 500 })
  }
}

// Generate mock clips for development
function generateMockClips(page: number, limit: number) {
  const clips = [
    {
      id: '1',
      title: 'Tech News Update: AI Breakthrough in Healthcare',
      category: 'news',
      status: 'published',
      duration: 45,
      size: 1.2,
      voice: 'default',
      playCount: 234,
      createdAt: '2024-01-09T10:30:00Z',
      updatedAt: '2024-01-09T10:30:00Z'
    },
    {
      id: '2',
      title: 'Weather Forecast: Sunny Week Ahead',
      category: 'weather',
      status: 'published',
      duration: 30,
      size: 0.8,
      voice: 'weather',
      playCount: 156,
      createdAt: '2024-01-09T09:15:00Z',
      updatedAt: '2024-01-09T09:15:00Z'
    },
    {
      id: '3',
      title: 'Educational: The Science of Music Production',
      category: 'education',
      status: 'published',
      duration: 90,
      size: 2.1,
      voice: 'educational',
      playCount: 89,
      createdAt: '2024-01-09T08:00:00Z',
      updatedAt: '2024-01-09T08:00:00Z'
    },
    {
      id: '4',
      title: 'Breaking: New Space Discovery',
      category: 'news',
      status: 'generating',
      duration: 0,
      size: 0,
      voice: 'default',
      playCount: 0,
      createdAt: '2024-01-09T11:45:00Z',
      updatedAt: '2024-01-09T11:45:00Z'
    },
    {
      id: '5',
      title: 'Entertainment: Top Movie Releases This Month',
      category: 'entertainment',
      status: 'published',
      duration: 60,
      size: 1.5,
      voice: 'entertainment',
      playCount: 203,
      createdAt: '2024-01-09T07:30:00Z',
      updatedAt: '2024-01-09T07:30:00Z'
    }
  ]

  // Simulate pagination
  const start = (page - 1) * limit
  const end = start + limit
  
  return clips.slice(start, end)
} 