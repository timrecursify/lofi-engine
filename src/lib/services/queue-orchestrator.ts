// Queue Orchestrator Service - Content pipeline coordination
// Production-safe implementation for Cloudflare Pages Functions

import { ContentFetcher } from './content-fetcher'
import { ScriptGenerator } from './script-generator'
import { TTSRenderer } from './tts-renderer'
import type { FeedItem } from './content-fetcher'
import type { AudioClipMetadata } from './tts-renderer'

interface QueueConfig {
  maxClipsPerTopic: number
  contentFetchInterval: number
  topics: string[]
  voiceStyles: Record<string, 'news' | 'casual' | 'educational'>
}

interface PipelineJobStatus {
  id: string
  topic: string
  status: 'pending' | 'fetching' | 'generating' | 'rendering' | 'completed' | 'failed'
  progress: number
  startTime: string
  endTime?: string
  error?: string
  clipId?: string
}

interface QueueStatus {
  totalClips: number
  clipsByTopic: Record<string, number>
  lastUpdate: string
  activePipeline: PipelineJobStatus[]
  errors: string[]
}

export class QueueOrchestrator {
  private static readonly DEFAULT_CONFIG: QueueConfig = {
    maxClipsPerTopic: 50,
    contentFetchInterval: 900, // 15 minutes
    topics: ['world-news', 'sports', 'crypto', 'technology'],
    voiceStyles: {
      'world-news': 'news',
      'sports': 'casual',
      'crypto': 'casual',
      'technology': 'educational'
    }
  }

  private static async getConfig(platform: any): Promise<QueueConfig> {
    try {
      const config = await platform.env.CACHE_KV.get('queue-config')
      if (config) {
        return { ...this.DEFAULT_CONFIG, ...JSON.parse(config) }
      }
    } catch (error) {
      console.error('Failed to load queue config:', error)
    }
    return this.DEFAULT_CONFIG
  }

  private static async saveConfig(config: QueueConfig, platform: any): Promise<void> {
    try {
      await platform.env.CACHE_KV.put('queue-config', JSON.stringify(config))
    } catch (error) {
      console.error('Failed to save queue config:', error)
    }
  }

  private static async getCurrentClipCount(topic: string, platform: any): Promise<number> {
    try {
      const db = platform.env.DB
      const stmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM content_clips 
        WHERE topic = ? AND created_at > datetime('now', '-24 hours')
      `)
      
      const result = await stmt.bind(topic).first()
      return result?.count || 0
    } catch (error) {
      console.error('Failed to get clip count:', error)
      return 0
    }
  }

  private static async shouldGenerateContent(topic: string, platform: any): Promise<boolean> {
    const config = await this.getConfig(platform)
    const currentCount = await this.getCurrentClipCount(topic, platform)
    
    return currentCount < config.maxClipsPerTopic
  }

  private static async getLastContentFetch(topic: string, platform: any): Promise<Date | null> {
    try {
      const lastFetch = await platform.env.CACHE_KV.get(`last-fetch-${topic}`)
      return lastFetch ? new Date(lastFetch) : null
    } catch (error) {
      console.error('Failed to get last fetch time:', error)
      return null
    }
  }

  private static async updateLastContentFetch(topic: string, platform: any): Promise<void> {
    try {
      await platform.env.CACHE_KV.put(`last-fetch-${topic}`, new Date().toISOString())
    } catch (error) {
      console.error('Failed to update last fetch time:', error)
    }
  }

  private static async logPipelineJob(job: PipelineJobStatus, platform: any): Promise<void> {
    try {
      const db = platform.env.DB
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO pipeline_jobs 
        (id, topic, status, progress, start_time, end_time, error, clip_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `)
      
      await stmt.bind(
        job.id,
        job.topic,
        job.status,
        job.progress,
        job.startTime,
        job.endTime || null,
        job.error || null,
        job.clipId || null
      ).run()
    } catch (error) {
      console.error('Failed to log pipeline job:', error)
    }
  }

  private static async runContentPipeline(
    topic: string,
    platform: any,
    secrets: {
      grokApiKey: string
      elevenLabsApiKey: string
      elevenLabsVoiceId: string
    }
  ): Promise<PipelineJobStatus> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const job: PipelineJobStatus = {
      id: jobId,
      topic,
      status: 'pending',
      progress: 0,
      startTime: new Date().toISOString()
    }

    try {
      // Step 1: Fetch content
      job.status = 'fetching'
      job.progress = 10
      await this.logPipelineJob(job, platform)

      const feedItems = await ContentFetcher.fetchForTopic(topic)
      
      if (feedItems.length === 0) {
        throw new Error(`No content found for topic: ${topic}`)
      }

      // Step 2: Generate script
      job.status = 'generating'
      job.progress = 40
      await this.logPipelineJob(job, platform)

      const config = await this.getConfig(platform)
      const voiceStyle = config.voiceStyles[topic] || 'casual'
      
      const scriptResponse = await ScriptGenerator.generateForTopic(
        topic,
        feedItems,
        secrets.grokApiKey,
        {
          maxLength: 45,
          voiceStyle
        }
      )

      if (scriptResponse.error) {
        throw new Error(`Script generation failed: ${scriptResponse.error}`)
      }

      // Step 3: Render TTS
      job.status = 'rendering'
      job.progress = 70
      await this.logPipelineJob(job, platform)

      const ttsResponse = await TTSRenderer.renderScript(
        scriptResponse,
        secrets.elevenLabsApiKey,
        secrets.elevenLabsVoiceId,
        platform
      )

      if (ttsResponse.error) {
        throw new Error(`TTS rendering failed: ${ttsResponse.error}`)
      }

      // Step 4: Complete
      job.status = 'completed'
      job.progress = 100
      job.endTime = new Date().toISOString()
      job.clipId = ttsResponse.clipId
      await this.logPipelineJob(job, platform)

      // Update last fetch time
      await this.updateLastContentFetch(topic, platform)

      return job
    } catch (error) {
      job.status = 'failed'
      job.error = error instanceof Error ? error.message : 'Unknown error'
      job.endTime = new Date().toISOString()
      await this.logPipelineJob(job, platform)
      
      console.error(`Pipeline failed for topic ${topic}:`, error)
      return job
    }
  }

  static async processAllTopics(
    platform: any,
    secrets: {
      grokApiKey: string
      elevenLabsApiKey: string
      elevenLabsVoiceId: string
    }
  ): Promise<PipelineJobStatus[]> {
    const config = await this.getConfig(platform)
    const jobs: PipelineJobStatus[] = []

    for (const topic of config.topics) {
      try {
        // Check if we need to generate content for this topic
        if (await this.shouldGenerateContent(topic, platform)) {
          const job = await this.runContentPipeline(topic, platform, secrets)
          jobs.push(job)
        }
      } catch (error) {
        console.error(`Failed to process topic ${topic}:`, error)
        jobs.push({
          id: `error_${Date.now()}`,
          topic,
          status: 'failed',
          progress: 0,
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return jobs
  }

  static async processTopic(
    topic: string,
    platform: any,
    secrets: {
      grokApiKey: string
      elevenLabsApiKey: string
      elevenLabsVoiceId: string
    }
  ): Promise<PipelineJobStatus> {
    return await this.runContentPipeline(topic, platform, secrets)
  }

  static async getQueueStatus(platform: any): Promise<QueueStatus> {
    try {
      const config = await this.getConfig(platform)
      const db = platform.env.DB
      
      // Get total clips count
      const totalStmt = db.prepare(`
        SELECT COUNT(*) as count 
        FROM content_clips 
        WHERE created_at > datetime('now', '-24 hours')
      `)
      const totalResult = await totalStmt.first()
      const totalClips = totalResult?.count || 0

      // Get clips by topic
      const clipsByTopic: Record<string, number> = {}
      for (const topic of config.topics) {
        const count = await this.getCurrentClipCount(topic, platform)
        clipsByTopic[topic] = count
      }

      // Get active pipeline jobs
      const pipelineStmt = db.prepare(`
        SELECT id, topic, status, progress, start_time, end_time, error, clip_id
        FROM pipeline_jobs 
        WHERE created_at > datetime('now', '-1 hour')
        ORDER BY created_at DESC
        LIMIT 20
      `)
      const pipelineResults = await pipelineStmt.all()
      
      const activePipeline: PipelineJobStatus[] = pipelineResults.map(row => ({
        id: row.id,
        topic: row.topic,
        status: row.status,
        progress: row.progress,
        startTime: row.start_time,
        endTime: row.end_time || undefined,
        error: row.error || undefined,
        clipId: row.clip_id || undefined
      }))

      // Get recent errors
      const errorStmt = db.prepare(`
        SELECT error, topic, created_at
        FROM pipeline_jobs 
        WHERE status = 'failed' AND created_at > datetime('now', '-2 hours')
        ORDER BY created_at DESC
        LIMIT 10
      `)
      const errorResults = await errorStmt.all()
      const errors = errorResults.map(row => 
        `${row.topic}: ${row.error} (${new Date(row.created_at).toLocaleString()})`
      )

      return {
        totalClips,
        clipsByTopic,
        lastUpdate: new Date().toISOString(),
        activePipeline,
        errors
      }
    } catch (error) {
      console.error('Failed to get queue status:', error)
      return {
        totalClips: 0,
        clipsByTopic: {},
        lastUpdate: new Date().toISOString(),
        activePipeline: [],
        errors: [`Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  static async getTopicClips(topic: string, platform: any, limit: number = 20): Promise<AudioClipMetadata[]> {
    try {
      const db = platform.env.DB
      const stmt = db.prepare(`
        SELECT id, title, duration, size, topic, sources, voice_id, 
               created_at, storage_location, url
        FROM content_clips 
        WHERE topic = ? AND created_at > datetime('now', '-24 hours')
        ORDER BY created_at DESC 
        LIMIT ?
      `)
      
      const results = await stmt.bind(topic, limit).all()
      
      return results.map(row => ({
        id: row.id,
        title: row.title,
        duration: row.duration,
        size: row.size,
        topic: row.topic,
        sources: JSON.parse(row.sources),
        voiceId: row.voice_id,
        createdAt: row.created_at,
        storageLocation: row.storage_location,
        url: row.url
      }))
    } catch (error) {
      console.error('Failed to get topic clips:', error)
      return []
    }
  }

  static async cleanupOldClips(platform: any, maxAge: number = 86400): Promise<number> {
    try {
      const db = platform.env.DB
      
      // Get old clips
      const selectStmt = db.prepare(`
        SELECT id, storage_location
        FROM content_clips 
        WHERE created_at < datetime('now', '-${maxAge} seconds')
      `)
      
      const oldClips = await selectStmt.all()
      let deletedCount = 0

      for (const clip of oldClips) {
        try {
          // Delete from storage
          if (clip.storage_location === 'kv') {
            await platform.env.CLIPS_KV.delete(clip.id)
          } else {
            await platform.env.CLIPS_R2.delete(clip.id)
          }
          
          // Delete from database
          const deleteStmt = db.prepare('DELETE FROM content_clips WHERE id = ?')
          await deleteStmt.bind(clip.id).run()
          
          deletedCount++
        } catch (error) {
          console.error(`Failed to delete clip ${clip.id}:`, error)
        }
      }

      return deletedCount
    } catch (error) {
      console.error('Failed to cleanup old clips:', error)
      return 0
    }
  }
}

// Export types
export type { QueueConfig, PipelineJobStatus, QueueStatus } 