import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { ContentFetcher } from '$lib/services/content-fetcher'
import { ScriptGenerator } from '$lib/services/script-generator'
import { TTSRenderer } from '$lib/services/tts-renderer'
import { QueueOrchestrator } from '$lib/services/queue-orchestrator'

interface TestResponse {
  success: boolean
  message: string
  stage: string
  data?: any
  error?: string
}

// POST: Test the entire content pipeline
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
    const { stage, topic } = body
    
    const testTopic = topic || 'world-news'
    
    // Stage 1: Test content fetching
    if (!stage || stage === 'fetch') {
      try {
        const feedItems = await ContentFetcher.fetchForTopic(testTopic)
        return json({
          success: true,
          message: `Successfully fetched ${feedItems.length} items for topic: ${testTopic}`,
          stage: 'fetch',
          data: {
            topic: testTopic,
            itemCount: feedItems.length,
            items: feedItems.slice(0, 3).map(item => ({
              title: item.title,
              source: item.source,
              category: item.category
            }))
          }
        })
      } catch (error) {
        return json({
          success: false,
          message: 'Content fetching failed',
          stage: 'fetch',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Stage 2: Test script generation
    if (stage === 'script') {
      try {
        const grokApiKey = (platform as any)?.env?.GROK_API_KEY
        if (!grokApiKey) {
          return json({
            success: false,
            message: 'Grok API key not configured',
            stage: 'script',
            error: 'GROK_API_KEY environment variable not set'
          })
        }
        
        const feedItems = await ContentFetcher.fetchForTopic(testTopic)
        if (feedItems.length === 0) {
          return json({
            success: false,
            message: 'No content available for script generation',
            stage: 'script',
            error: 'No feed items found'
          })
        }
        
        const scriptResponse = await ScriptGenerator.generateForTopic(
          testTopic,
          feedItems,
          grokApiKey,
          {
            maxLength: 30,
            voiceStyle: 'casual'
          }
        )
        
        if (scriptResponse.error) {
          return json({
            success: false,
            message: 'Script generation failed',
            stage: 'script',
            error: scriptResponse.error
          })
        }
        
        return json({
          success: true,
          message: 'Script generated successfully',
          stage: 'script',
          data: {
            topic: scriptResponse.topic,
            duration: scriptResponse.duration,
            sources: scriptResponse.sources,
            scriptLength: scriptResponse.script.length,
            scriptPreview: scriptResponse.script.substring(0, 200) + '...'
          }
        })
      } catch (error) {
        return json({
          success: false,
          message: 'Script generation failed',
          stage: 'script',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Stage 3: Test TTS rendering
    if (stage === 'tts') {
      try {
        const grokApiKey = (platform as any)?.env?.GROK_API_KEY
        const elevenLabsApiKey = (platform as any)?.env?.ELEVENLABS_API_KEY
        const elevenLabsVoiceId = (platform as any)?.env?.ELEVENLABS_VOICE_ID
        
        if (!grokApiKey || !elevenLabsApiKey || !elevenLabsVoiceId) {
          return json({
            success: false,
            message: 'TTS API keys not configured',
            stage: 'tts',
            error: 'Required environment variables not set'
          })
        }
        
        const feedItems = await ContentFetcher.fetchForTopic(testTopic)
        if (feedItems.length === 0) {
          return json({
            success: false,
            message: 'No content available for TTS rendering',
            stage: 'tts',
            error: 'No feed items found'
          })
        }
        
        const scriptResponse = await ScriptGenerator.generateForTopic(
          testTopic,
          feedItems,
          grokApiKey,
          {
            maxLength: 30,
            voiceStyle: 'casual'
          }
        )
        
        if (scriptResponse.error) {
          return json({
            success: false,
            message: 'Script generation failed during TTS test',
            stage: 'tts',
            error: scriptResponse.error
          })
        }
        
        const ttsResponse = await TTSRenderer.renderScript(
          scriptResponse,
          elevenLabsApiKey,
          elevenLabsVoiceId,
          platform
        )
        
        if (ttsResponse.error) {
          return json({
            success: false,
            message: 'TTS rendering failed',
            stage: 'tts',
            error: ttsResponse.error
          })
        }
        
        return json({
          success: true,
          message: 'TTS rendering completed successfully',
          stage: 'tts',
          data: {
            clipId: ttsResponse.clipId,
            duration: ttsResponse.duration,
            size: ttsResponse.size,
            storageLocation: ttsResponse.storageLocation,
            audioUrl: ttsResponse.audioUrl
          }
        })
      } catch (error) {
        return json({
          success: false,
          message: 'TTS rendering failed',
          stage: 'tts',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Stage 4: Test full pipeline
    if (stage === 'full') {
      try {
        const grokApiKey = (platform as any)?.env?.GROK_API_KEY
        const elevenLabsApiKey = (platform as any)?.env?.ELEVENLABS_API_KEY
        const elevenLabsVoiceId = (platform as any)?.env?.ELEVENLABS_VOICE_ID
        
        if (!grokApiKey || !elevenLabsApiKey || !elevenLabsVoiceId) {
          return json({
            success: false,
            message: 'Pipeline API keys not configured',
            stage: 'full',
            error: 'Required environment variables not set'
          })
        }
        
        const job = await QueueOrchestrator.processTopic(testTopic, platform, {
          grokApiKey,
          elevenLabsApiKey,
          elevenLabsVoiceId
        })
        
        return json({
          success: job.status === 'completed',
          message: job.status === 'completed' ? 'Full pipeline completed successfully' : 'Pipeline failed',
          stage: 'full',
          data: {
            jobId: job.id,
            topic: job.topic,
            status: job.status,
            progress: job.progress,
            clipId: job.clipId,
            error: job.error,
            duration: job.endTime ? 
              new Date(job.endTime).getTime() - new Date(job.startTime).getTime() : undefined
          }
        })
      } catch (error) {
        return json({
          success: false,
          message: 'Full pipeline test failed',
          stage: 'full',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Default: Return test instructions
    return json({
      success: true,
      message: 'Content pipeline test endpoint',
      stage: 'info',
      data: {
        usage: 'POST with { "stage": "fetch|script|tts|full", "topic": "world-news|sports|crypto|technology" }',
        stages: {
          fetch: 'Test RSS content fetching',
          script: 'Test Grok API script generation',
          tts: 'Test ElevenLabs TTS rendering',
          full: 'Test complete pipeline'
        },
        topics: ['world-news', 'sports', 'crypto', 'technology']
      }
    })

  } catch (error) {
    console.error('Content pipeline test error:', error)
    return json({ 
      error: 'Internal Server Error', 
      message: 'Test endpoint failed',
      stage: 'error'
    }, { status: 500 })
  }
}

// GET: Test status and configuration
export const GET: RequestHandler = async ({ platform }) => {
  try {
    const grokApiKey = (platform as any)?.env?.GROK_API_KEY
    const elevenLabsApiKey = (platform as any)?.env?.ELEVENLABS_API_KEY
    const elevenLabsVoiceId = (platform as any)?.env?.ELEVENLABS_VOICE_ID
    
    const status = await QueueOrchestrator.getQueueStatus(platform)
    
    return json({
      success: true,
      message: 'Content pipeline status',
      configuration: {
        grokApiConfigured: !!grokApiKey,
        elevenLabsApiConfigured: !!elevenLabsApiKey,
        elevenLabsVoiceConfigured: !!elevenLabsVoiceId,
        databaseConnected: !!(platform as any)?.env?.DB,
        storageConnected: !!(platform as any)?.env?.CLIPS_KV && !!(platform as any)?.env?.CLIPS_R2
      },
      queueStatus: status
    })

  } catch (error) {
    console.error('Pipeline status error:', error)
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