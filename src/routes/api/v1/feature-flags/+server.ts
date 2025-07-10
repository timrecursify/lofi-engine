import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { DEFAULT_FEATURE_FLAGS } from '$lib/services/feature-flags'
import type { FeatureFlag } from '$lib/services/feature-flags'

const FEATURE_FLAGS_KV_KEY = 'feature_flags'

export const GET: RequestHandler = async ({ platform, url }) => {
  try {
    const kv = (platform as any)?.env?.KV_FEATURE_FLAGS
    if (!kv) {
      console.warn('KV storage not available, falling back to defaults')
      return json(getDefaultFlags())
    }

    // Try to get feature flags from KV
    const storedFlags = await kv.get(FEATURE_FLAGS_KV_KEY, { type: 'json' })
    
    if (storedFlags && Array.isArray(storedFlags)) {
      // Filter by environment if specified
      const env = url.searchParams.get('env') as 'development' | 'staging' | 'production'
      if (env) {
        const filteredFlags = storedFlags.filter((flag: FeatureFlag) => 
          flag.environments.includes(env)
        )
        return json(filteredFlags)
      }
      
      return json(storedFlags)
    }

    // If no flags in KV, initialize with defaults
    await initializeDefaultFlags(kv)
    return json(getDefaultFlags())

  } catch (error) {
    console.error('Failed to fetch feature flags:', error)
    return json(getDefaultFlags())
  }
}

// Helper function to get default flags
function getDefaultFlags(): FeatureFlag[] {
  const now = new Date().toISOString()
  return DEFAULT_FEATURE_FLAGS.map(flag => ({
    ...flag,
    createdAt: now,
    updatedAt: now,
    createdBy: 'system'
  }))
}

// Helper function to initialize default flags in KV
async function initializeDefaultFlags(kv: any): Promise<void> {
  try {
    const defaultFlags = getDefaultFlags()
    await kv.put(FEATURE_FLAGS_KV_KEY, JSON.stringify(defaultFlags))
    console.log('Initialized default feature flags in KV')
  } catch (error) {
    console.error('Failed to initialize default feature flags:', error)
  }
} 