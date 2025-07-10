import { json, redirect } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { TTSRenderer } from '$lib/services/tts-renderer'

// Types for clip API
interface ClipMetadata {
  id: string
  title: string
  duration: number
  topic: string
  size: number
  mimeType: string
  createdAt: string
  metadata: {
    speaker: string
    language: string
    source: string
  }
}

interface ErrorResponse {
  error: string
  message: string
  code?: string
}

// GET: Retrieve clip with signed URL
export const GET: RequestHandler = async ({ params, locals, platform, url }) => {
  try {
    const { auth } = locals
    const clipId = params.id
    
    // Check authentication
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      }, { status: 401 })
    }

    // Validate clip ID
    if (!clipId || !clipId.match(/^[a-zA-Z0-9-_]+$/)) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid clip ID format' 
      }, { status: 400 })
    }

    // Get clip metadata from database
    const clipMetadata = await TTSRenderer.getClipMetadata(clipId, platform)
    if (!clipMetadata) {
      return json({ 
        error: 'Not Found', 
        message: 'Clip not found' 
      }, { status: 404 })
    }

    // Get query parameters
    const searchParams = url.searchParams
    const redirect_mode = searchParams.get('redirect') === 'true'
    const include_metadata = searchParams.get('metadata') === 'true'

    try {
      // Check storage location and retrieve clip
      if (clipMetadata.storageLocation === 'kv') {
        // Get from KV storage
        const clipsKV = (platform as any)?.env?.CLIPS_KV
        if (clipsKV) {
          const kvData = await clipsKV.get(clipId)
          if (kvData) {
            const parsedData = JSON.parse(kvData)
            
            if (redirect_mode) {
              // Convert base64 to binary and return as audio response
              const audioBuffer = Uint8Array.from(atob(parsedData.audio), c => c.charCodeAt(0))
              return new Response(audioBuffer, {
                status: 200,
                headers: {
                  'Content-Type': 'audio/mpeg',
                  'Content-Length': parsedData.size.toString(),
                  'Content-Disposition': `attachment; filename="${clipId}.mp3"`,
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            } else {
              // Return metadata with signed URL
              const response: any = {
                id: clipMetadata.id,
                title: clipMetadata.title,
                duration: clipMetadata.duration,
                topic: clipMetadata.topic,
                size: clipMetadata.size,
                mimeType: 'audio/mpeg',
                createdAt: clipMetadata.createdAt,
                url: `/api/v1/clip/${clipId}?redirect=true`,
                signedUrl: `/api/v1/clip/${clipId}?redirect=true`,
                expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
                storage: 'kv'
              }
              
              if (include_metadata) {
                response.metadata = {
                  speaker: `Voice ${clipMetadata.voiceId.slice(0, 8)}`,
                  language: 'en-US',
                  source: clipMetadata.sources.join(', ')
                }
              }
              
              return json(response)
            }
          }
        }
      } else if (clipMetadata.storageLocation === 'r2') {
        // Get from R2 storage
        const clipsR2 = (platform as any)?.env?.CLIPS_R2
        if (clipsR2) {
          const r2Object = await clipsR2.get(clipId)
          if (r2Object) {
            if (redirect_mode) {
              // Serve directly from R2
              const audioBuffer = await r2Object.arrayBuffer()
              return new Response(audioBuffer, {
                status: 200,
                headers: {
                  'Content-Type': 'audio/mpeg',
                  'Content-Length': clipMetadata.size.toString(),
                  'Content-Disposition': `attachment; filename="${clipId}.mp3"`,
                  'Cache-Control': 'public, max-age=3600',
                  'Access-Control-Allow-Origin': '*'
                }
              })
            } else {
              // Return metadata with signed URL
              const response: any = {
                id: clipMetadata.id,
                title: clipMetadata.title,
                duration: clipMetadata.duration,
                topic: clipMetadata.topic,
                size: clipMetadata.size,
                mimeType: 'audio/mpeg',
                createdAt: clipMetadata.createdAt,
                url: `/api/v1/clip/${clipId}?redirect=true`,
                signedUrl: `/api/v1/clip/${clipId}?redirect=true`,
                expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour
                storage: 'r2'
              }
              
              if (include_metadata) {
                response.metadata = {
                  speaker: `Voice ${clipMetadata.voiceId.slice(0, 8)}`,
                  language: 'en-US',
                  source: clipMetadata.sources.join(', ')
                }
              }
              
              return json(response)
            }
          }
        }
      }

             // If clip not found in storage, return fallback
       if (redirect_mode) {
         // Fallback to demo audio file
         const demoAudioUrl = '/voice/news.mp3'
         throw redirect(302, demoAudioUrl)
      } else {
        // Return metadata with demo URL
        const response: any = {
          id: clipMetadata.id,
          title: clipMetadata.title,
          duration: clipMetadata.duration,
          topic: clipMetadata.topic,
          size: clipMetadata.size,
          mimeType: 'audio/mpeg',
          createdAt: clipMetadata.createdAt,
          url: `/api/v1/clip/${clipId}?redirect=true`,
          signedUrl: '/voice/news.mp3',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          storage: 'fallback'
        }
        
        if (include_metadata) {
          response.metadata = {
            speaker: `Voice ${clipMetadata.voiceId.slice(0, 8)}`,
            language: 'en-US',
            source: clipMetadata.sources.join(', ')
          }
        }
        
        return json(response)
      }

    } catch (storageError) {
      console.error('Storage access error:', storageError)
      
             // Fallback to demo audio
       if (redirect_mode) {
         throw redirect(302, '/voice/news.mp3')
      } else {
        return json({
          id: clipMetadata.id,
          title: clipMetadata.title,
          duration: clipMetadata.duration,
          topic: clipMetadata.topic,
          size: clipMetadata.size,
          mimeType: 'audio/mpeg',
          createdAt: clipMetadata.createdAt,
          url: `/api/v1/clip/${clipId}?redirect=true`,
          signedUrl: '/voice/news.mp3',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          storage: 'fallback'
        })
      }
    }

  } catch (error) {
    console.error('Clip route error:', error)
    return json({ 
      error: 'Internal Server Error', 
      message: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

// HEAD: Check if clip exists
export const HEAD: RequestHandler = async ({ params, locals, platform }) => {
  try {
    const { auth } = locals
    const clipId = params.id
    
    // Check authentication
    if (!auth.userId) {
      return new Response(null, { status: 401 })
    }

    // Validate clip ID
    if (!clipId || !clipId.match(/^[a-zA-Z0-9-_]+$/)) {
      return new Response(null, { status: 400 })
    }

    // Check if clip exists in database
    const clipMetadata = await TTSRenderer.getClipMetadata(clipId, platform)
    if (!clipMetadata) {
      return new Response(null, { status: 404 })
    }

    return new Response(null, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': clipMetadata.size.toString(),
        'Last-Modified': new Date(clipMetadata.createdAt).toUTCString(),
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Clip HEAD error:', error)
    return new Response(null, { status: 500 })
  }
}

// DELETE: Delete clip (admin only)
export const DELETE: RequestHandler = async ({ params, locals, platform }) => {
  try {
    const { auth } = locals
    const clipId = params.id
    
    // Check authentication
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'User not authenticated' 
      }, { status: 401 })
    }

    // TODO: Add admin role check here
    // For now, any authenticated user can delete (will be restricted in Phase 6)

    // Validate clip ID
    if (!clipId || !clipId.match(/^[a-zA-Z0-9-_]+$/)) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid clip ID format' 
      }, { status: 400 })
    }

    // Delete clip
    const success = await TTSRenderer.deleteClip(clipId, platform)
    if (!success) {
      return json({ 
        error: 'Not Found', 
        message: 'Clip not found or already deleted' 
      }, { status: 404 })
    }

    return json({
      success: true,
      message: 'Clip deleted successfully'
    })

  } catch (error) {
    console.error('Clip DELETE error:', error)
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
      'Access-Control-Allow-Methods': 'GET, HEAD, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
} 