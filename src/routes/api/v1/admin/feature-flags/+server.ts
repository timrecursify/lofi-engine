import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { DEFAULT_FEATURE_FLAGS } from '$lib/services/feature-flags'
import type { FeatureFlag, FeatureFlagUpdate } from '$lib/services/feature-flags'

const FEATURE_FLAGS_KV_KEY = 'feature_flags'

// GET: List all feature flags (admin only)
export const GET: RequestHandler = async ({ locals, platform }) => {
  const { auth } = locals
  
  // Check admin access
  if (!auth.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userRole = auth.user?.publicMetadata?.role
  if (!userRole || (userRole !== 'admin' && userRole !== 'super-admin')) {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const kv = (platform as any)?.env?.KV_FEATURE_FLAGS
    if (!kv) {
      return json({ error: 'KV storage unavailable' }, { status: 503 })
    }

    // Get feature flags from KV
    const storedFlags = await kv.get(FEATURE_FLAGS_KV_KEY, { type: 'json' })
    
    if (storedFlags && Array.isArray(storedFlags)) {
      return json(storedFlags)
    }

    // If no flags in KV, initialize with defaults
    const defaultFlags = getDefaultFlags()
    await kv.put(FEATURE_FLAGS_KV_KEY, JSON.stringify(defaultFlags))
    return json(defaultFlags)

  } catch (error) {
    console.error('Failed to fetch feature flags:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT: Update all feature flags (admin only)
export const PUT: RequestHandler = async ({ request, locals, platform }) => {
  const { auth } = locals
  
  // Check admin access
  if (!auth.userId) {
    return json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const userRole = auth.user?.publicMetadata?.role
  if (!userRole || (userRole !== 'admin' && userRole !== 'super-admin')) {
    return json({ error: 'Forbidden' }, { status: 403 })
  }
  
  try {
    const kv = (platform as any)?.env?.KV_FEATURE_FLAGS
    if (!kv) {
      return json({ error: 'KV storage unavailable' }, { status: 503 })
    }

    const body = await request.json()
    const flags: FeatureFlag[] = body.flags
    
    if (!Array.isArray(flags)) {
      return json({ error: 'Invalid request body' }, { status: 400 })
    }

    // Validate flags
    for (const flag of flags) {
      if (!flag.id || typeof flag.enabled !== 'boolean') {
        return json({ error: 'Invalid flag format' }, { status: 400 })
      }
    }

    // Update timestamps and user
    const now = new Date().toISOString()
    const updatedFlags = flags.map(flag => ({
      ...flag,
      updatedAt: now,
      createdBy: auth.user?.email || auth.userId
    }))

    // Save to KV
    await kv.put(FEATURE_FLAGS_KV_KEY, JSON.stringify(updatedFlags))
    
    return json(updatedFlags)

  } catch (error) {
    console.error('Failed to update feature flags:', error)
    return json({ error: 'Internal server error' }, { status: 500 })
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