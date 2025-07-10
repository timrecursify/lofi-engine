import { browser } from '$app/environment'

export interface FeatureFlag {
  id: string
  name: string
  description: string
  enabled: boolean
  category: 'ui' | 'api' | 'content' | 'payments' | 'ads' | 'system'
  rolloutPercentage: number // 0-100
  createdAt: string
  updatedAt: string
  createdBy: string
  environments: ('development' | 'staging' | 'production')[]
}

export interface FeatureFlagUpdate {
  enabled?: boolean
  rolloutPercentage?: number
  description?: string
  environments?: ('development' | 'staging' | 'production')[]
}

// Default feature flags
export const DEFAULT_FEATURE_FLAGS: Omit<FeatureFlag, 'createdAt' | 'updatedAt' | 'createdBy'>[] = [
  {
    id: 'ads_enabled',
    name: 'Advertisements',
    description: 'Enable audio and banner advertisements for free tier users',
    enabled: true,
    category: 'ads',
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production']
  },
  {
    id: 'pro_features',
    name: 'Pro Features',
    description: 'Enable pro-only features like advanced topics and settings',
    enabled: true,
    category: 'ui',
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production']
  },
  {
    id: 'content_pipeline',
    name: 'Content Pipeline',
    description: 'Enable automated content generation and TTS rendering',
    enabled: true,
    category: 'content',
    rolloutPercentage: 100,
    environments: ['development', 'staging', 'production']
  },
  {
    id: 'payments_enabled',
    name: 'Payment Processing',
    description: 'Enable Stripe payment processing for pro subscriptions',
    enabled: true,
    category: 'payments',
    rolloutPercentage: 100,
    environments: ['staging', 'production']
  },
  {
    id: 'analytics_tracking',
    name: 'Analytics Tracking',
    description: 'Enable PostHog analytics and event tracking',
    enabled: false,
    category: 'system',
    rolloutPercentage: 0,
    environments: ['development', 'staging', 'production']
  },
  {
    id: 'error_reporting',
    name: 'Error Reporting',
    description: 'Enable Sentry error reporting and performance monitoring',
    enabled: false,
    category: 'system',
    rolloutPercentage: 0,
    environments: ['development', 'staging', 'production']
  },
  {
    id: 'experimental_ui',
    name: 'Experimental UI',
    description: 'Enable experimental UI features and components',
    enabled: false,
    category: 'ui',
    rolloutPercentage: 0,
    environments: ['development']
  },
  {
    id: 'maintenance_mode',
    name: 'Maintenance Mode',
    description: 'Enable maintenance mode to restrict access',
    enabled: false,
    category: 'system',
    rolloutPercentage: 0,
    environments: ['development', 'staging', 'production']
  }
]

class FeatureFlagService {
  private cache = new Map<string, FeatureFlag>()
  private initialized = false

  // Get current environment
  private getCurrentEnvironment(): 'development' | 'staging' | 'production' {
    if (!browser) return 'development'
    
    const hostname = window.location.hostname
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development'
    } else if (hostname.includes('staging') || hostname.includes('dev')) {
      return 'staging'
    } else {
      return 'production'
    }
  }

  // Initialize feature flags (called on app startup)
  async initialize(): Promise<void> {
    if (this.initialized) return
    
    try {
      // Load from API
      const response = await fetch('/api/v1/feature-flags')
      if (response.ok) {
        const flags: FeatureFlag[] = await response.json()
        
        // Update cache
        this.cache.clear()
        flags.forEach(flag => {
          this.cache.set(flag.id, flag)
        })
      }
      
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize feature flags:', error)
      
      // Fallback to defaults if API fails
      this.initializeDefaults()
    }
  }

  // Initialize with default flags
  private initializeDefaults(): void {
    this.cache.clear()
    const now = new Date().toISOString()
    
    DEFAULT_FEATURE_FLAGS.forEach(defaultFlag => {
      const flag: FeatureFlag = {
        ...defaultFlag,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system'
      }
      this.cache.set(flag.id, flag)
    })
    
    this.initialized = true
  }

  // Check if a feature is enabled
  isEnabled(flagId: string, userId?: string): boolean {
    if (!this.initialized) {
      console.warn('Feature flags not initialized, falling back to defaults')
      const defaultFlag = DEFAULT_FEATURE_FLAGS.find(f => f.id === flagId)
      return defaultFlag?.enabled || false
    }

    const flag = this.cache.get(flagId)
    if (!flag) {
      console.warn(`Feature flag '${flagId}' not found`)
      return false
    }

    // Check if flag is enabled for current environment
    const currentEnv = this.getCurrentEnvironment()
    if (!flag.environments.includes(currentEnv)) {
      return false
    }

    // Check if flag is enabled
    if (!flag.enabled) {
      return false
    }

    // Check rollout percentage
    let isUserInRollout = true
    if (flag.rolloutPercentage < 100) {
      // Simple hash-based rollout using userId or random fallback
      const identifier = userId || 'anonymous'
      const hash = this.hashString(identifier + flagId)
      const userPercentage = hash % 100
      
      if (userPercentage >= flag.rolloutPercentage) {
        isUserInRollout = false
      }
    }

    // Track feature flag evaluation for analytics
    if (browser && typeof window !== 'undefined') {
      // Dynamic import to avoid circular dependency
      import('./analytics').then(({ analytics }) => {
        analytics.trackFeatureFlag(flagId, isUserInRollout, flag.rolloutPercentage < 100 ? 'rollout' : 'full')
      }).catch(() => {
        // Silently fail if analytics not available
      })
    }

    return isUserInRollout
  }

  // Get all feature flags
  getAll(): FeatureFlag[] {
    return Array.from(this.cache.values())
  }

  // Get a specific feature flag
  getFlag(flagId: string): FeatureFlag | undefined {
    return this.cache.get(flagId)
  }

  // Admin function to update a feature flag
  async updateFlag(flagId: string, update: FeatureFlagUpdate, userId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/v1/admin/feature-flags/${flagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(update)
      })

      if (response.ok) {
        const updatedFlag: FeatureFlag = await response.json()
        this.cache.set(flagId, updatedFlag)
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to update feature flag:', error)
      return false
    }
  }

  // Simple hash function for consistent rollout
  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash)
  }
}

// Global instance
export const featureFlags = new FeatureFlagService()

// Convenience functions
export function isFeatureEnabled(flagId: string, userId?: string): boolean {
  return featureFlags.isEnabled(flagId, userId)
}

export function getFeatureFlag(flagId: string): FeatureFlag | undefined {
  return featureFlags.getFlag(flagId)
}

// Initialize on app startup (browser only)
if (browser) {
  featureFlags.initialize().catch(console.error)
} 