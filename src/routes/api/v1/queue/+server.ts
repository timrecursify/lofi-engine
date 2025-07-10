import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { QueueOrchestrator } from '$lib/services/queue-orchestrator'

// Types for queue API
interface QueueClip {
  id: string
  title: string
  duration: number
  topic: string
  description: string
  priority: number
  createdAt: string
  url?: string
  metadata: {
    speaker: string
    language: string
    source: string
  }
}

interface QueueResponse {
  clips: QueueClip[]
  totalCount: number
  nextPage?: string
  lastUpdated: string
}

interface ErrorResponse {
  error: string
  message: string
  code?: string
}

// GET: Retrieve queue clips
export const GET: RequestHandler = async ({ request, locals, platform, url }) => {
  try {
    const { auth } = locals
    
    // Check authentication
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      }, { status: 401 })
    }

    // Get query parameters
    const searchParams = url.searchParams
    const topic = searchParams.get('topic')
    const limit = parseInt(searchParams.get('limit') || '10')
    const page = parseInt(searchParams.get('page') || '1')
    const includeUrl = searchParams.get('include_url') === 'true'

    // Validate parameters
    if (limit < 1 || limit > 50) {
      return json({ 
        error: 'Bad Request', 
        message: 'Limit must be between 1 and 50' 
      }, { status: 400 })
    }

    if (page < 1) {
      return json({ 
        error: 'Bad Request', 
        message: 'Page must be greater than 0' 
      }, { status: 400 })
    }

    // Get clips from the queue orchestrator
    let clipMetadata
    if (topic) {
      clipMetadata = await QueueOrchestrator.getTopicClips(topic, platform, limit * page)
    } else {
      // Get clips from all topics
      const allTopics = ['world-news', 'sports', 'crypto', 'technology']
      const allClips = []
      
      for (const topicName of allTopics) {
        const topicClips = await QueueOrchestrator.getTopicClips(topicName, platform, 10)
        allClips.push(...topicClips)
      }
      
      // Sort by creation date
      allClips.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      clipMetadata = allClips
    }

    // Convert to API format
    const clips: QueueClip[] = clipMetadata.map((clip, index) => ({
      id: clip.id,
      title: clip.title,
      duration: clip.duration,
      topic: clip.topic,
      description: `Generated from: ${clip.sources.join(', ')}`,
      priority: index + 1,
      createdAt: clip.createdAt,
      url: includeUrl ? clip.url : undefined,
      metadata: {
        speaker: `Voice ${clip.voiceId.slice(0, 8)}`,
        language: 'en-US',
        source: clip.sources.join(', ')
      }
    }))

    // Paginate results
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedClips = clips.slice(startIndex, endIndex)
    
    // Check if there are more pages
    const hasNextPage = endIndex < clips.length
    const nextPage = hasNextPage ? `${page + 1}` : undefined

    return json({
      clips: paginatedClips,
      totalCount: clips.length,
      nextPage,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Queue route error:', error)
    return json({ 
      error: 'Internal Server Error', 
      message: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

// POST: Manual content generation (for testing/admin)
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    const { auth } = locals
    
    // Check authentication
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { topic, force } = body

    if (!topic) {
      return json({ 
        error: 'Bad Request', 
        message: 'Topic is required' 
      }, { status: 400 })
    }

    // Get secrets from environment
    const grokApiKey = (platform as any)?.env?.GROK_API_KEY
    const elevenLabsApiKey = (platform as any)?.env?.ELEVENLABS_API_KEY
    const elevenLabsVoiceId = (platform as any)?.env?.ELEVENLABS_VOICE_ID

    if (!grokApiKey || !elevenLabsApiKey || !elevenLabsVoiceId) {
      return json({ 
        error: 'Server Configuration Error', 
        message: 'Content generation is not properly configured' 
      }, { status: 500 })
    }

    // Run content pipeline for topic
    const job = await QueueOrchestrator.processTopic(topic, platform, {
      grokApiKey,
      elevenLabsApiKey,
      elevenLabsVoiceId
    })

    return json({
      success: true,
      job: {
        id: job.id,
        topic: job.topic,
        status: job.status,
        progress: job.progress,
        clipId: job.clipId,
        error: job.error
      }
    })

  } catch (error) {
    console.error('Queue POST error:', error)
    return json({ 
      error: 'Internal Server Error', 
      message: 'An unexpected error occurred' 
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