import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'

// Types for API responses
interface PreferencesResponse {
  preferences: UserPreferences
  version: number
  lastSyncedAt: string
}

interface UserPreferences {
  volumes: {
    music: number
    voice: number
    effects: number
    ads: number
  }
  narrationSpeed: number
  enabledTopics: string[]
  theme: string
  scene: string
  vinylFx: boolean
}

interface ErrorResponse {
  error: string
  message: string
  code?: string
}

// Default preferences
const DEFAULT_PREFERENCES: UserPreferences = {
  volumes: { music: 0.7, voice: 0.8, effects: 0.5, ads: 0.5 },
  narrationSpeed: 1.0,
  enabledTopics: ['world-news', 'local-news', 'weather', 'education', 'health'],
  theme: 'dark',
  scene: 'auto',
  vinylFx: false
}

// GET: Retrieve user preferences
export const GET: RequestHandler = async ({ locals, platform }) => {
  try {
    const { auth } = locals
    
    if (!auth.userId) {
      return json({ error: 'Unauthorized', message: 'User not authenticated' }, { status: 401 })
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB
    if (!db) {
      console.error('D1 database not available')
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 })
    }

    // Query user preferences from D1
    const result = await db.prepare(`
      SELECT 
        volume_music, volume_voice, volume_effects, volume_ads,
        narration_speed, theme, scene, vinyl_fx, enabled_topics,
        version, synced_at
      FROM user_preferences 
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY version DESC
      LIMIT 1
    `).bind(auth.userId).first()

    if (!result) {
      // No preferences found, return defaults
      return json({
        preferences: DEFAULT_PREFERENCES,
        version: 1,
        lastSyncedAt: new Date().toISOString()
      })
    }

    // Parse enabled topics JSON
    let enabledTopics: string[]
    try {
      enabledTopics = JSON.parse(result.enabled_topics as string)
    } catch (e) {
      console.warn('Failed to parse enabled_topics JSON, using defaults')
      enabledTopics = DEFAULT_PREFERENCES.enabledTopics
    }

    const preferences: UserPreferences = {
      volumes: {
        music: result.volume_music as number,
        voice: result.volume_voice as number,
        effects: result.volume_effects as number,
        ads: result.volume_ads as number
      },
      narrationSpeed: result.narration_speed as number,
      enabledTopics,
      theme: result.theme as string,
      scene: result.scene as string,
      vinylFx: Boolean(result.vinyl_fx)
    }

    return json({
      preferences,
      version: result.version as number,
      lastSyncedAt: result.synced_at as string
    })

  } catch (err) {
    console.error('Failed to retrieve user preferences:', err)
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to retrieve preferences' 
    }, { status: 500 })
  }
}

// POST: Create or update user preferences
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    const { auth } = locals
    
    if (!auth.userId) {
      return json({ error: 'Unauthorized', message: 'User not authenticated' }, { status: 401 })
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB
    if (!db) {
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 })
    }

    // Parse request body
    let body: { preferences: UserPreferences }
    try {
      body = await request.json()
    } catch (e) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid JSON in request body' 
      }, { status: 400 })
    }

    if (!body.preferences) {
      return json({ 
        error: 'Bad Request', 
        message: 'Missing preferences in request body' 
      }, { status: 400 })
    }

    const prefs = body.preferences

    // Validate preferences data
    const validationError = validatePreferences(prefs)
    if (validationError) {
      return json({ 
        error: 'Bad Request', 
        message: validationError 
      }, { status: 400 })
    }

    // Start database transaction
    try {
      // First, ensure user exists in users table
      await db.prepare(`
        INSERT OR IGNORE INTO users (id, email, clerk_id, plan)
        VALUES (?, ?, ?, 'free')
      `).bind(auth.userId, auth.user?.email || '', auth.userId).run()

      // Deactivate previous preferences (soft delete)
      await db.prepare(`
        UPDATE user_preferences 
        SET is_active = FALSE 
        WHERE user_id = ? AND is_active = TRUE
      `).bind(auth.userId).run()

      // Get next version number
      const versionResult = await db.prepare(`
        SELECT COALESCE(MAX(version), 0) + 1 as next_version
        FROM user_preferences 
        WHERE user_id = ?
      `).bind(auth.userId).first()

      const nextVersion = versionResult?.next_version as number || 1

      // Insert new preferences
      const now = new Date().toISOString()
      const enabledTopicsJson = JSON.stringify(prefs.enabledTopics)

      await db.prepare(`
        INSERT INTO user_preferences (
          user_id, volume_music, volume_voice, volume_effects, volume_ads,
          narration_speed, theme, scene, vinyl_fx, enabled_topics,
          version, is_active, synced_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)
      `).bind(
        auth.userId,
        prefs.volumes.music,
        prefs.volumes.voice,
        prefs.volumes.effects,
        prefs.volumes.ads,
        prefs.narrationSpeed,
        prefs.theme,
        prefs.scene,
        prefs.vinylFx ? 1 : 0,
        enabledTopicsJson,
        nextVersion,
        now,
        now,
        now
      ).run()

      // Update user's last seen timestamp
      await db.prepare(`
        UPDATE users 
        SET last_seen_at = ?, updated_at = ?
        WHERE id = ?
      `).bind(now, now, auth.userId).run()

      return json({
        preferences: prefs,
        version: nextVersion,
        lastSyncedAt: now
      })

    } catch (dbError) {
      console.error('Database transaction failed:', dbError)
      return json({ 
        error: 'Internal Server Error', 
        message: 'Failed to save preferences' 
      }, { status: 500 })
    }

  } catch (err) {
    console.error('Failed to update user preferences:', err)
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to update preferences' 
    }, { status: 500 })
  }
}

// DELETE: Reset preferences to defaults
export const DELETE: RequestHandler = async ({ locals, platform }) => {
  try {
    const { auth } = locals
    
    if (!auth.userId) {
      return json({ error: 'Unauthorized', message: 'User not authenticated' }, { status: 401 })
    }

    const db = (platform as any)?.env?.DB
    if (!db) {
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 })
    }

    // Deactivate all existing preferences
    const now = new Date().toISOString()
    await db.prepare(`
      UPDATE user_preferences 
      SET is_active = FALSE, updated_at = ?
      WHERE user_id = ? AND is_active = TRUE
    `).bind(now, auth.userId).run()

    return json({
      preferences: DEFAULT_PREFERENCES,
      version: 1,
      lastSyncedAt: now
    })

  } catch (err) {
    console.error('Failed to reset user preferences:', err)
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to reset preferences' 
    }, { status: 500 })
  }
}

// Validation helper
function validatePreferences(prefs: any): string | null {
  if (!prefs || typeof prefs !== 'object') {
    return 'Preferences must be an object'
  }

  // Validate volumes
  if (!prefs.volumes || typeof prefs.volumes !== 'object') {
    return 'Volumes must be an object'
  }

  const volumeKeys = ['music', 'voice', 'effects', 'ads']
  for (const key of volumeKeys) {
    const value = prefs.volumes[key]
    if (typeof value !== 'number' || value < 0 || value > 1) {
      return `Volume.${key} must be a number between 0 and 1`
    }
  }

  // Validate narration speed
  if (typeof prefs.narrationSpeed !== 'number' || prefs.narrationSpeed < 0.8 || prefs.narrationSpeed > 1.5) {
    return 'narrationSpeed must be a number between 0.8 and 1.5'
  }

  // Validate enabled topics
  if (!Array.isArray(prefs.enabledTopics)) {
    return 'enabledTopics must be an array'
  }

  if (prefs.enabledTopics.some((topic: any) => typeof topic !== 'string')) {
    return 'All enabledTopics must be strings'
  }

  // Validate theme
  const validThemes = ['dark', 'light', 'amoled', 'sepia']
  if (!validThemes.includes(prefs.theme)) {
    return `theme must be one of: ${validThemes.join(', ')}`
  }

  // Validate scene
  const validScenes = ['auto', 'city', 'nature', 'space', 'underwater']
  if (!validScenes.includes(prefs.scene)) {
    return `scene must be one of: ${validScenes.join(', ')}`
  }

  // Validate vinyl fx
  if (typeof prefs.vinylFx !== 'boolean') {
    return 'vinylFx must be a boolean'
  }

  return null
} 