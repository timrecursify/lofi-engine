// TTS Renderer Service - ElevenLabs API integration for text-to-speech
// Production-safe implementation for Cloudflare Pages Functions

import type { ScriptGenerationResponse } from './script-generator'

interface TTSRequest {
  text: string
  ssml?: string
  voiceId: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

interface TTSResponse {
  audioUrl?: string
  audioBuffer?: ArrayBuffer
  clipId: string
  duration: number
  size: number
  storageLocation: 'kv' | 'r2'
  error?: string
}

interface AudioClipMetadata {
  id: string
  title: string
  duration: number
  size: number
  topic: string
  sources: string[]
  voiceId: string
  createdAt: string
  storageLocation: 'kv' | 'r2'
  url?: string
}

// ElevenLabs API configuration
const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
const DEFAULT_VOICE_SETTINGS = {
  stability: 0.75,
  similarity_boost: 0.85,
  style: 0.0,
  use_speaker_boost: true
}

export class TTSRenderer {
  private static async callElevenLabsAPI(
    text: string,
    voiceId: string,
    apiKey: string,
    options: Partial<TTSRequest> = {}
  ): Promise<ArrayBuffer> {
    try {
      const response = await fetch(`${ELEVENLABS_API_URL}/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': apiKey
        },
        body: JSON.stringify({
          text: options.ssml || text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: options.stability || DEFAULT_VOICE_SETTINGS.stability,
            similarity_boost: options.similarityBoost || DEFAULT_VOICE_SETTINGS.similarity_boost,
            style: options.style || DEFAULT_VOICE_SETTINGS.style,
            use_speaker_boost: options.useSpeakerBoost !== undefined ? options.useSpeakerBoost : DEFAULT_VOICE_SETTINGS.use_speaker_boost
          }
        }),
        signal: AbortSignal.timeout(60000) // 60 second timeout
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }

      return await response.arrayBuffer()
    } catch (error) {
      console.error('ElevenLabs API call failed:', error)
      throw error
    }
  }

  private static generateClipId(): string {
    return `clip_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static async storeAudioClip(
    audioBuffer: ArrayBuffer,
    clipId: string,
    metadata: AudioClipMetadata,
    platform: any
  ): Promise<{ url: string; storageLocation: 'kv' | 'r2' }> {
    const audioSize = audioBuffer.byteLength
    const kvSizeLimit = parseInt(platform.env.KV_SIZE_LIMIT || '10485760') // 10MB default
    
    if (audioSize < kvSizeLimit) {
      // Store in KV for small files
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)))
      const kvData = {
        audio: base64Audio,
        metadata,
        contentType: 'audio/mpeg',
        size: audioSize
      }
      
      await platform.env.CLIPS_KV.put(clipId, JSON.stringify(kvData))
      
      return {
        url: `/api/v1/clip/${clipId}`,
        storageLocation: 'kv'
      }
    } else {
      // Store in R2 for large files
      const audioFile = new File([audioBuffer], `${clipId}.mp3`, { type: 'audio/mpeg' })
      
      await platform.env.CLIPS_R2.put(clipId, audioFile, {
        httpMetadata: {
          contentType: 'audio/mpeg',
          contentDisposition: `attachment; filename="${clipId}.mp3"`
        },
        customMetadata: {
          clipId,
          topic: metadata.topic,
          duration: metadata.duration.toString(),
          createdAt: metadata.createdAt
        }
      })
      
      return {
        url: `/api/v1/clip/${clipId}`,
        storageLocation: 'r2'
      }
    }
  }

  private static async saveClipToDatabase(
    metadata: AudioClipMetadata,
    platform: any
  ): Promise<void> {
    try {
      const db = platform.env.DB
      const stmt = db.prepare(`
        INSERT INTO content_clips (
          id, title, duration, size, topic, sources, voice_id, 
          created_at, storage_location, url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      await stmt.bind(
        metadata.id,
        metadata.title,
        metadata.duration,
        metadata.size,
        metadata.topic,
        JSON.stringify(metadata.sources),
        metadata.voiceId,
        metadata.createdAt,
        metadata.storageLocation,
        metadata.url
      ).run()
    } catch (error) {
      console.error('Failed to save clip to database:', error)
      // Don't throw - we still want to return the clip even if DB save fails
    }
  }

  static async renderScript(
    script: ScriptGenerationResponse,
    apiKey: string,
    voiceId: string,
    platform: any,
    options: {
      stability?: number
      similarityBoost?: number
      style?: number
      useSpeakerBoost?: boolean
    } = {}
  ): Promise<TTSResponse> {
    try {
      if (!apiKey) {
        throw new Error('ElevenLabs API key is required')
      }

      if (!voiceId) {
        throw new Error('Voice ID is required')
      }

      if (!script.script) {
        throw new Error('Script content is required')
      }

      // Generate audio using ElevenLabs API
      const audioBuffer = await this.callElevenLabsAPI(
        script.script,
        voiceId,
        apiKey,
        {
          ssml: script.ssml,
          ...options
        }
      )

      const clipId = this.generateClipId()
      const audioSize = audioBuffer.byteLength

      // Create metadata object
      const metadata: AudioClipMetadata = {
        id: clipId,
        title: `${script.topic} - ${new Date().toLocaleDateString()}`,
        duration: script.duration,
        size: audioSize,
        topic: script.topic,
        sources: script.sources,
        voiceId,
        createdAt: new Date().toISOString(),
        storageLocation: audioSize < parseInt(platform.env.KV_SIZE_LIMIT || '10485760') ? 'kv' : 'r2'
      }

      // Store audio clip
      const storage = await this.storeAudioClip(audioBuffer, clipId, metadata, platform)
      metadata.url = storage.url
      metadata.storageLocation = storage.storageLocation

      // Save to database
      await this.saveClipToDatabase(metadata, platform)

      return {
        audioUrl: storage.url,
        clipId,
        duration: script.duration,
        size: audioSize,
        storageLocation: storage.storageLocation
      }
    } catch (error) {
      console.error('TTS rendering failed:', error)
      return {
        clipId: '',
        duration: 0,
        size: 0,
        storageLocation: 'kv',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async renderTextToSpeech(
    text: string,
    apiKey: string,
    voiceId: string,
    platform: any,
    options: {
      topic?: string
      sources?: string[]
      stability?: number
      similarityBoost?: number
      style?: number
      useSpeakerBoost?: boolean
    } = {}
  ): Promise<TTSResponse> {
    const scriptData: ScriptGenerationResponse = {
      script: text,
      ssml: text,
      duration: Math.ceil(text.split(/\s+/).length / 150 * 60), // Estimate duration
      topic: options.topic || 'general',
      sources: options.sources || []
    }

    return await this.renderScript(scriptData, apiKey, voiceId, platform, options)
  }

  static async getClipMetadata(clipId: string, platform: any): Promise<AudioClipMetadata | null> {
    try {
      const db = platform.env.DB
      const stmt = db.prepare(`
        SELECT id, title, duration, size, topic, sources, voice_id, 
               created_at, storage_location, url
        FROM content_clips 
        WHERE id = ?
      `)
      
      const result = await stmt.bind(clipId).first()
      
      if (!result) {
        return null
      }

      return {
        id: result.id,
        title: result.title,
        duration: result.duration,
        size: result.size,
        topic: result.topic,
        sources: JSON.parse(result.sources),
        voiceId: result.voice_id,
        createdAt: result.created_at,
        storageLocation: result.storage_location,
        url: result.url
      }
    } catch (error) {
      console.error('Failed to get clip metadata:', error)
      return null
    }
  }

  static async deleteClip(clipId: string, platform: any): Promise<boolean> {
    try {
      const metadata = await this.getClipMetadata(clipId, platform)
      if (!metadata) {
        return false
      }

      // Delete from storage
      if (metadata.storageLocation === 'kv') {
        await platform.env.CLIPS_KV.delete(clipId)
      } else {
        await platform.env.CLIPS_R2.delete(clipId)
      }

      // Delete from database
      const db = platform.env.DB
      const stmt = db.prepare('DELETE FROM content_clips WHERE id = ?')
      await stmt.bind(clipId).run()

      return true
    } catch (error) {
      console.error('Failed to delete clip:', error)
      return false
    }
  }
}

// Export types
export type { TTSRequest, TTSResponse, AudioClipMetadata } 