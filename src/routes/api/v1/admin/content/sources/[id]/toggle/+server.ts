import { json } from '@sveltejs/kit'
import { requireSuperAdmin } from '$lib/auth'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ params, locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sourceId = params.id
    
    if (!sourceId) {
      return json({ error: 'Source ID required' }, { status: 400 })
    }

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, simulating toggle')
      return json({
        success: true,
        data: {
          id: sourceId,
          enabled: true, // Mock response
          status: 'active'
        }
      })
    }

    try {
      // Get current source status
      const currentSource = await db.prepare(`
        SELECT id, enabled, status FROM content_sources WHERE id = ?
      `).bind(sourceId).first()

      if (!currentSource) {
        return json({ error: 'Content source not found' }, { status: 404 })
      }

      // Toggle enabled status
      const newEnabled = !Boolean(currentSource.enabled)
      const newStatus = newEnabled ? 'active' : 'disabled'
      const now = new Date().toISOString()

      await db.prepare(`
        UPDATE content_sources 
        SET enabled = ?, status = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        newEnabled ? 1 : 0,
        newStatus,
        now,
        sourceId
      ).run()

      return json({
        success: true,
        data: {
          id: sourceId,
          enabled: newEnabled,
          status: newStatus,
          updatedAt: now
        }
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({ error: 'Failed to toggle content source' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to toggle content source:', error)
    return json({ error: 'Failed to toggle content source' }, { status: 500 })
  }
} 