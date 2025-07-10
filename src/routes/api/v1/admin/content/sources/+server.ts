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
          sources: generateMockSources()
        }
      })
    }

    try {
      const sources = await db.prepare(`
        SELECT 
          id,
          name,
          type,
          url,
          category,
          enabled,
          fetch_interval,
          max_items,
          last_fetch,
          items_generated,
          status,
          created_at,
          updated_at
        FROM content_sources
        ORDER BY created_at DESC
      `).all()

      const formattedSources = sources.results?.map((source: any) => ({
        id: source.id,
        name: source.name,
        type: source.type,
        url: source.url,
        category: source.category,
        enabled: Boolean(source.enabled),
        fetchInterval: source.fetch_interval,
        maxItems: source.max_items,
        lastFetch: source.last_fetch,
        itemsGenerated: source.items_generated || 0,
        status: source.status,
        createdAt: source.created_at,
        updatedAt: source.updated_at
      })) || []

      return json({
        success: true,
        data: {
          sources: formattedSources
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({
        success: true,
        data: {
          sources: generateMockSources()
        }
      })
    }
  } catch (error) {
    console.error('Failed to load content sources:', error)
    return json({ error: 'Failed to load content sources' }, { status: 500 })
  }
}

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, url, category, enabled, fetchInterval, maxItems } = body

    // Validate required fields
    if (!name || !type || !url || !category) {
      return json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, simulating creation')
      return json({
        success: true,
        data: {
          id: `mock-${Date.now()}`,
          name,
          type,
          url,
          category,
          enabled: enabled !== false,
          fetchInterval: fetchInterval || 3600,
          maxItems: maxItems || 10,
          lastFetch: null,
          itemsGenerated: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      })
    }

    try {
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      await db.prepare(`
        INSERT INTO content_sources (
          id, name, type, url, category, enabled, fetch_interval, max_items, 
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sourceId,
        name,
        type,
        url,
        category,
        enabled !== false ? 1 : 0,
        fetchInterval || 3600,
        maxItems || 10,
        'active',
        now,
        now
      ).run()

      const newSource = {
        id: sourceId,
        name,
        type,
        url,
        category,
        enabled: enabled !== false,
        fetchInterval: fetchInterval || 3600,
        maxItems: maxItems || 10,
        lastFetch: null,
        itemsGenerated: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now
      }

      return json({
        success: true,
        data: newSource
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({ error: 'Failed to create content source' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to create content source:', error)
    return json({ error: 'Failed to create content source' }, { status: 500 })
  }
}

// Generate mock sources for development
function generateMockSources() {
  return [
    {
      id: '1',
      name: 'TechCrunch RSS',
      type: 'rss',
      url: 'https://techcrunch.com/feed/',
      category: 'news',
      enabled: true,
      fetchInterval: 3600,
      maxItems: 10,
      lastFetch: '2024-01-09T11:00:00Z',
      itemsGenerated: 45,
      status: 'active',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-09T11:00:00Z'
    },
    {
      id: '2',
      name: 'Weather API',
      type: 'api',
      url: 'https://api.openweathermap.org/data/2.5/weather',
      category: 'weather',
      enabled: true,
      fetchInterval: 1800,
      maxItems: 5,
      lastFetch: '2024-01-09T10:30:00Z',
      itemsGenerated: 12,
      status: 'active',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-09T10:30:00Z'
    },
    {
      id: '3',
      name: 'Educational Content Feed',
      type: 'rss',
      url: 'https://example.edu/feed/',
      category: 'education',
      enabled: false,
      fetchInterval: 7200,
      maxItems: 8,
      lastFetch: '2024-01-08T15:00:00Z',
      itemsGenerated: 23,
      status: 'disabled',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-08T15:00:00Z'
    },
    {
      id: '4',
      name: 'Entertainment News',
      type: 'rss',
      url: 'https://entertainment.com/rss',
      category: 'entertainment',
      enabled: true,
      fetchInterval: 3600,
      maxItems: 12,
      lastFetch: '2024-01-09T09:00:00Z',
      itemsGenerated: 67,
      status: 'active',
      createdAt: '2024-01-01T10:00:00Z',
      updatedAt: '2024-01-09T09:00:00Z'
    }
  ]
} 