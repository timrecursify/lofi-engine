// Script Generator Service - Grok API integration for content summarization
// Production-safe implementation for Cloudflare Pages Functions

import type { FeedItem } from './content-fetcher'

interface ScriptGenerationRequest {
  items: FeedItem[]
  topic: string
  maxLength: number
  voiceStyle: 'news' | 'casual' | 'educational'
}

interface ScriptGenerationResponse {
  script: string
  ssml: string
  duration: number
  topic: string
  sources: string[]
  error?: string
}

// Grok API configuration
const GROK_API_URL = 'https://api.x.ai/v1/chat/completions'
const GROK_MODEL = 'grok-3-latest'

// Voice style configurations
const VOICE_STYLES = {
  news: {
    tone: 'professional and authoritative',
    pace: 'steady and clear',
    personality: 'news anchor'
  },
  casual: {
    tone: 'conversational and friendly',
    pace: 'relaxed and natural',
    personality: 'friend sharing interesting stories'
  },
  educational: {
    tone: 'informative and engaging',
    pace: 'thoughtful and measured',
    personality: 'knowledgeable educator'
  }
}

export class ScriptGenerator {
  private static async callGrokAPI(prompt: string, apiKey: string): Promise<string> {
    try {
      const response = await fetch(GROK_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a professional radio script writer for a lo-fi ambient radio station. Your job is to create engaging, concise content that fits the calm, atmospheric vibe of lo-fi radio.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          model: GROK_MODEL,
          stream: false,
          temperature: 0.7,
          max_tokens: 2048
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (!response.ok) {
        throw new Error(`Grok API error: ${response.status} - ${response.statusText}`)
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Grok API')
      }

      return data.choices[0].message.content.trim()
    } catch (error) {
      console.error('Grok API call failed:', error)
      throw error
    }
  }

  private static generatePrompt(request: ScriptGenerationRequest): string {
    const { items, topic, maxLength, voiceStyle } = request
    const style = VOICE_STYLES[voiceStyle]
    
    // Prepare source material
    const sourceContent = items.slice(0, 5).map(item => 
      `• ${item.title}: ${item.description} (Source: ${item.source})`
    ).join('\n')

    return `Create a ${maxLength}-second radio script for a lo-fi ambient radio station.

TOPIC: ${topic}
VOICE STYLE: ${style.tone}, ${style.pace}, speaking as a ${style.personality}
TARGET DURATION: ${maxLength} seconds (approximately ${Math.floor(maxLength / 60 * 150)} words)

SOURCE MATERIAL:
${sourceContent}

REQUIREMENTS:
1. Synthesize the most interesting and relevant information from the sources
2. Write in a ${style.tone} tone that fits a lo-fi radio atmosphere
3. Keep the script conversational and engaging
4. Include smooth transitions between topics
5. End with a gentle conclusion that flows back to music
6. Target exactly ${maxLength} seconds of speaking time
7. Do not mention specific times, dates, or "breaking news" - keep it timeless
8. Focus on the human interest or broader implications of the stories

OUTPUT FORMAT:
Return only the script text, no additional formatting or metadata. The script should be ready to be converted to SSML and spoken naturally.`
  }

  private static convertToSSML(script: string, voiceStyle: 'news' | 'casual' | 'educational'): string {
    // Basic SSML conversion with appropriate pacing and emphasis
    let ssml = script
      .replace(/\n\n/g, '<break time="1s"/>')
      .replace(/\n/g, '<break time="0.5s"/>')
      .replace(/\.\.\./g, '<break time="0.8s"/>')
      .replace(/([.!?])\s+/g, '$1<break time="0.6s"/>')
      .replace(/,\s+/g, ',<break time="0.3s"/>')

    // Add voice style specific SSML tags
    const styleSettings = {
      news: '<prosody rate="medium" pitch="medium">',
      casual: '<prosody rate="slow" pitch="medium">',
      educational: '<prosody rate="medium-slow" pitch="medium">'
    }

    ssml = `<speak>
${styleSettings[voiceStyle]}
${ssml}
</prosody>
</speak>`

    return ssml
  }

  private static estimateDuration(script: string): number {
    // Estimate duration based on word count (average 150 words per minute)
    const wordCount = script.split(/\s+/).length
    return Math.ceil(wordCount / 150 * 60)
  }

  static async generateScript(request: ScriptGenerationRequest, apiKey: string): Promise<ScriptGenerationResponse> {
    try {
      if (!apiKey) {
        throw new Error('Grok API key is required')
      }

      if (!request.items || request.items.length === 0) {
        throw new Error('No source items provided')
      }

      const prompt = this.generatePrompt(request)
      const script = await this.callGrokAPI(prompt, apiKey)
      
      if (!script) {
        throw new Error('Empty script generated')
      }

      const ssml = this.convertToSSML(script, request.voiceStyle)
      const duration = this.estimateDuration(script)
      const sources = [...new Set(request.items.map(item => item.source))]

      return {
        script,
        ssml,
        duration,
        topic: request.topic,
        sources
      }
    } catch (error) {
      console.error('Script generation failed:', error)
      return {
        script: '',
        ssml: '',
        duration: 0,
        topic: request.topic,
        sources: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async generateForTopic(
    topic: string,
    items: FeedItem[],
    apiKey: string,
    options: {
      maxLength?: number
      voiceStyle?: 'news' | 'casual' | 'educational'
    } = {}
  ): Promise<ScriptGenerationResponse> {
    const request: ScriptGenerationRequest = {
      items,
      topic,
      maxLength: options.maxLength || 45,
      voiceStyle: options.voiceStyle || 'casual'
    }

    return await this.generateScript(request, apiKey)
  }
}

// Export types
export type { ScriptGenerationRequest, ScriptGenerationResponse } 