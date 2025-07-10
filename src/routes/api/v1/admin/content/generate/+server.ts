import { json } from '@sveltejs/kit'
import { requireSuperAdmin } from '$lib/auth'
import type { RequestHandler } from './$types'

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    // Verify super admin access
    const user = await requireSuperAdmin()
    if (!user) {
      return json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { topic, category, content, voice, priority } = body

    // Validate required fields
    if (!topic || !category) {
      return json({ error: 'Missing required fields: topic and category' }, { status: 400 })
    }

    // Validate category
    const validCategories = ['news', 'weather', 'education', 'entertainment']
    if (!validCategories.includes(category)) {
      return json({ error: 'Invalid category' }, { status: 400 })
    }

    // Validate priority
    const validPriorities = ['low', 'normal', 'high']
    const finalPriority = validPriorities.includes(priority) ? priority : 'normal'

    const db = (platform as any)?.env?.DB
    
    if (!db) {
      console.warn('Database not available, simulating generation')
      return json({
        success: true,
        data: {
          id: `gen_${Date.now()}`,
          title: topic,
          category,
          contentType: 'manual',
          status: 'queued',
          priority: finalPriority,
          progress: 0,
          estimatedTime: estimateGenerationTime(category, content),
          sourceId: null,
          errorMessage: null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null
        }
      })
    }

    try {
      const generationId = `gen_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()
      const estimatedTime = estimateGenerationTime(category, content)

      // Insert into generation queue
      await db.prepare(`
        INSERT INTO content_generation_queue (
          id, title, category, content_type, status, priority, progress, 
          estimated_time, custom_content, voice_preference, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        generationId,
        topic,
        category,
        'manual',
        'queued',
        finalPriority,
        0,
        estimatedTime,
        content || null,
        voice || 'default',
        now,
        now
      ).run()

      // If high priority, trigger immediate processing
      if (finalPriority === 'high') {
        // In a real implementation, this would trigger the content generation worker
        console.log(`High priority content generation triggered: ${generationId}`)
      }

      const newGenerationItem = {
        id: generationId,
        title: topic,
        category,
        contentType: 'manual',
        status: 'queued',
        priority: finalPriority,
        progress: 0,
        estimatedTime,
        sourceId: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        startedAt: null,
        completedAt: null
      }

      return json({
        success: true,
        data: newGenerationItem
      })
    } catch (error) {
      console.error('Database error:', error)
      return json({ error: 'Failed to queue content generation' }, { status: 500 })
    }
  } catch (error) {
    console.error('Failed to generate content:', error)
    return json({ error: 'Failed to generate content' }, { status: 500 })
  }
}

// Estimate generation time based on content type and length
function estimateGenerationTime(category: string, content?: string): number {
  // Base time estimates in seconds
  const baseTimes = {
    news: 180,      // 3 minutes
    weather: 120,   // 2 minutes
    education: 300, // 5 minutes
    entertainment: 240 // 4 minutes
  }

  let baseTime = baseTimes[category as keyof typeof baseTimes] || 180

  // Adjust based on content length
  if (content) {
    const contentLength = content.length
    if (contentLength > 500) {
      baseTime += 60 // Add 1 minute for longer content
    } else if (contentLength > 1000) {
      baseTime += 120 // Add 2 minutes for very long content
    }
  } else {
    // Add time for AI content generation
    baseTime += 60
  }

  return baseTime
} 