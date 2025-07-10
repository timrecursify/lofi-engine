import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { QueueOrchestrator } from '$lib/services/queue-orchestrator'
import { logger } from '$lib/utils/logger'

interface CronResponse {
  success: boolean
  message: string
  jobs?: any[]
  error?: string
}

// POST: Handle cron trigger for content generation
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

    // Get secrets from environment
    const grokApiKey = (platform as any)?.env?.GROK_API_KEY
    const elevenLabsApiKey = (platform as any)?.env?.ELEVENLABS_API_KEY
    const elevenLabsVoiceId = (platform as any)?.env?.ELEVENLABS_VOICE_ID

    if (!grokApiKey || !elevenLabsApiKey || !elevenLabsVoiceId) {
      return json({ 
        error: 'Server Configuration Error', 
        message: 'Content generation secrets not configured' 
      }, { status: 500 })
    }

    // Process all topics
    const jobs = await QueueOrchestrator.processAllTopics(platform, {
      grokApiKey,
      elevenLabsApiKey,
      elevenLabsVoiceId
    })

    const successfulJobs = jobs.filter(job => job.status === 'completed')
    const failedJobs = jobs.filter(job => job.status === 'failed')

    logger.info(`Content generation completed: ${successfulJobs.length} successful, ${failedJobs.length} failed`, 'cron-content-generation', {
      successfulJobs: successfulJobs.length,
      failedJobs: failedJobs.length,
      totalJobs: jobs.length
    })

    return json({
      success: true,
      message: `Content generation completed: ${successfulJobs.length} successful, ${failedJobs.length} failed`,
      jobs: jobs.map(job => ({
        id: job.id,
        topic: job.topic,
        status: job.status,
        progress: job.progress,
        clipId: job.clipId,
        error: job.error
      }))
    })

  } catch (error) {
    logger.error('Cron content generation error', 'cron-content-generation', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return json({ 
      error: 'Internal Server Error', 
      message: 'Content generation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// GET: Status check endpoint
export const GET: RequestHandler = async ({ platform }) => {
  try {
    const status = await QueueOrchestrator.getQueueStatus(platform)
    
    return json({
      success: true,
      status
    })
  } catch (error) {
    logger.error('Status check error', 'cron-content-generation', { 
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