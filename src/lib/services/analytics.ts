import { browser } from '$app/environment'
import { isFeatureEnabled } from './feature-flags'
import type { ClerkUser } from '$lib/auth'

// PostHog types
interface PostHogEvent {
  event: string
  properties?: Record<string, any>
  timestamp?: Date
}

interface PostHogConfig {
  apiKey: string
  apiHost?: string
  debug?: boolean
  capturePageview?: boolean
  crossSubdomainCookie?: boolean
  secureCookie?: boolean
}

// User journey stages for funnel analysis
export enum UserJourneyStage {
  LANDING = 'landing',
  SIGN_UP = 'sign_up',
  FIRST_PLAY = 'first_play',
  ENGAGEMENT = 'engagement',
  SUBSCRIPTION_INTEREST = 'subscription_interest',
  SUBSCRIPTION_CHECKOUT = 'subscription_checkout',
  SUBSCRIPTION_COMPLETE = 'subscription_complete',
  RETENTION_7_DAYS = 'retention_7_days',
  RETENTION_30_DAYS = 'retention_30_days'
}

// Funnel definitions for conversion tracking
export const CONVERSION_FUNNELS = {
  SIGN_UP_FUNNEL: [
    UserJourneyStage.LANDING,
    UserJourneyStage.SIGN_UP,
    UserJourneyStage.FIRST_PLAY
  ],
  SUBSCRIPTION_FUNNEL: [
    UserJourneyStage.ENGAGEMENT,
    UserJourneyStage.SUBSCRIPTION_INTEREST,
    UserJourneyStage.SUBSCRIPTION_CHECKOUT,
    UserJourneyStage.SUBSCRIPTION_COMPLETE
  ],
  RETENTION_FUNNEL: [
    UserJourneyStage.FIRST_PLAY,
    UserJourneyStage.RETENTION_7_DAYS,
    UserJourneyStage.RETENTION_30_DAYS
  ]
}

// Behavioral cohorts for user segmentation
export enum UserCohort {
  NEW_USER = 'new_user',           // First 7 days
  ENGAGED_USER = 'engaged_user',   // 10+ sessions in 30 days
  POWER_USER = 'power_user',       // 50+ sessions in 30 days
  PREMIUM_USER = 'premium_user',   // Has active subscription
  CHURNED_USER = 'churned_user',   // No activity in 30 days
  TRIAL_USER = 'trial_user',       // In trial period
  CONVERTED_USER = 'converted_user' // Completed subscription after trial
}

// Analytics events enum for type safety
export enum AnalyticsEvent {
  // Authentication Events
  USER_SIGNED_UP = 'user_signed_up',
  USER_SIGNED_IN = 'user_signed_in',
  USER_SIGNED_OUT = 'user_signed_out',
  
  // Music Player Events
  MUSIC_PLAY_STARTED = 'music_play_started',
  MUSIC_PLAY_PAUSED = 'music_play_paused',
  MUSIC_TRACK_SKIPPED = 'music_track_skipped',
  MUSIC_VOLUME_CHANGED = 'music_volume_changed',
  
  // Voice Content Events
  VOICE_CLIP_PLAYED = 'voice_clip_played',
  VOICE_CLIP_SKIPPED = 'voice_clip_skipped',
  VOICE_CLIP_COMPLETED = 'voice_clip_completed',
  CONTENT_QUEUE_REORDERED = 'content_queue_reordered',
  CONTENT_GENERATED = 'content_generated',
  
  // Subscription Events
  SUBSCRIPTION_CHECKOUT_STARTED = 'subscription_checkout_started',
  SUBSCRIPTION_CHECKOUT_COMPLETED = 'subscription_checkout_completed',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  UPGRADE_PAGE_VIEWED = 'upgrade_page_viewed',
  FREE_TRIAL_STARTED = 'free_trial_started',
  FREE_TRIAL_ENDED = 'free_trial_ended',
  
  // Feature Usage Events
  STYLE_PRESET_CHANGED = 'style_preset_changed',
  BACKGROUND_CHANGED = 'background_changed',
  TOPIC_TOGGLED = 'topic_toggled',
  SETTINGS_CHANGED = 'settings_changed',
  QUEUE_VIEWED = 'queue_viewed',
  HELP_VIEWED = 'help_viewed',
  
  // Engagement Events
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  IDLE_DETECTED = 'idle_detected',
  RETURN_FROM_IDLE = 'return_from_idle',
  PAGE_VIEW = 'page_view',
  TIME_ON_PAGE = 'time_on_page',
  
  // Content Interaction Events
  TOPIC_PREFERENCE_LEARNED = 'topic_preference_learned',
  LISTENING_PATTERN_DETECTED = 'listening_pattern_detected',
  CONTENT_RECOMMENDATION_SHOWN = 'content_recommendation_shown',
  CONTENT_RECOMMENDATION_CLICKED = 'content_recommendation_clicked',
  
  // Ad Events
  AD_IMPRESSION = 'ad_impression',
  AD_CLICK = 'ad_click',
  AD_SKIPPED = 'ad_skipped',
  AD_COMPLETED = 'ad_completed',
  
  // Admin Events
  ADMIN_DASHBOARD_VIEWED = 'admin_dashboard_viewed',
  FEATURE_FLAG_TOGGLED = 'feature_flag_toggled',
  ADMIN_ACTION_PERFORMED = 'admin_action_performed',
  
  // Error Events
  ERROR_OCCURRED = 'error_occurred',
  API_ERROR = 'api_error',
  CONTENT_LOAD_FAILED = 'content_load_failed',
  
  // Performance Events
  PAGE_LOAD_TIME = 'page_load_time',
  AUDIO_LOAD_TIME = 'audio_load_time',
  API_RESPONSE_TIME = 'api_response_time',
  
  // Funnel Events
  FUNNEL_STEP_COMPLETED = 'funnel_step_completed',
  CONVERSION_GOAL_REACHED = 'conversion_goal_reached',
  USER_COHORT_UPDATED = 'user_cohort_updated',
  FEATURE_FLAG_VIEWED = 'feature_flag_viewed'
}

interface UserBehaviorMetrics {
  sessionCount: number
  totalListeningTime: number
  favoriteTopics: string[]
  averageSessionDuration: number
  lastActiveDate: string
  signupDate: string
  subscriptionStatus: string
  trialEndDate?: string
}

class AnalyticsService {
  private posthog: any = null
  private initialized = false
  private eventQueue: PostHogEvent[] = []
  private userId: string | null = null
  private sessionStart: number | null = null
  private pageLoadTime: number | null = null
  private currentCohort: UserCohort | null = null

  constructor() {
    if (browser) {
      this.initialize()
      this.trackPageLoad()
      this.setupSessionTracking()
    }
  }

  // Initialize PostHog
  private async initialize(): Promise<void> {
    if (this.initialized || !browser) return

    // Check if analytics tracking is enabled via feature flag
    if (!isFeatureEnabled('analytics_tracking')) {
      console.log('Analytics tracking disabled via feature flag')
      return
    }

    try {
      // Dynamic import to avoid SSR issues
      const { default: posthog } = await import('posthog-js')
      
      // Get PostHog configuration from environment
      const config: PostHogConfig = {
        apiKey: this.getPostHogApiKey(),
        apiHost: this.getPostHogHost(),
        debug: this.isDevelopment(),
        capturePageview: true,
        crossSubdomainCookie: false,
        secureCookie: !this.isDevelopment()
      }

      if (!config.apiKey) {
        console.warn('PostHog API key not configured')
        return
      }

      // Initialize PostHog with enhanced configuration
      posthog.init(config.apiKey, {
        api_host: config.apiHost,
        debug: config.debug,
        capture_pageview: config.capturePageview,
        cross_subdomain_cookie: config.crossSubdomainCookie,
        secure_cookie: config.secureCookie,
        persistence: 'localStorage',
        autocapture: false, // We'll track events manually for better control
        disable_session_recording: !this.isDevelopment(), // Enable in dev for debugging
        opt_out_capturing_by_default: false,
        capture_performance: true, // Track web vitals
        enable_recording_console_log: this.isDevelopment(),
        session_recording: {
          maskAllInputs: true, // Privacy-focused
          recordCrossOriginIframes: false
        },
        loaded: () => {
          console.log('PostHog analytics initialized')
          this.initialized = true
          this.flushEventQueue()
          this.setupAdvancedTracking()
        }
      })

      this.posthog = posthog
    } catch (error) {
      console.error('Failed to initialize PostHog:', error)
    }
  }

  // Track feature flag usage
  trackFeatureFlag(flagId: string, isEnabled: boolean, rolloutType: 'full' | 'rollout'): void {
    this.track(AnalyticsEvent.FEATURE_FLAG_VIEWED, {
      flag_id: flagId,
      is_enabled: isEnabled,
      rollout_type: rolloutType
    })
  }

  // Setup advanced tracking features
  private setupAdvancedTracking(): void {
    if (!this.posthog) return

    // Setup cohort analysis
    this.initializeCohortTracking()
    
    // Track user engagement patterns
    this.setupEngagementTracking()
  }

  // Initialize cohort tracking
  private initializeCohortTracking(): void {
    // This will be called when user data is available
    // to determine which cohort the user belongs to
  }

  // Setup engagement tracking
  private setupEngagementTracking(): void {
    // Track scroll depth
    let maxScrollDepth = 0
    const trackScrollDepth = () => {
      const scrolled = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100)
      if (scrolled > maxScrollDepth) {
        maxScrollDepth = scrolled
        if (maxScrollDepth >= 25 && maxScrollDepth < 50) {
          this.track(AnalyticsEvent.PAGE_VIEW, { scroll_depth: '25%' })
        } else if (maxScrollDepth >= 50 && maxScrollDepth < 75) {
          this.track(AnalyticsEvent.PAGE_VIEW, { scroll_depth: '50%' })
        } else if (maxScrollDepth >= 75 && maxScrollDepth < 100) {
          this.track(AnalyticsEvent.PAGE_VIEW, { scroll_depth: '75%' })
        } else if (maxScrollDepth >= 100) {
          this.track(AnalyticsEvent.PAGE_VIEW, { scroll_depth: '100%' })
        }
      }
    }

    window.addEventListener('scroll', trackScrollDepth, { passive: true })

    // Track idle detection
    let idleTimer: NodeJS.Timeout
    let isIdle = false
    
    const resetIdleTimer = () => {
      clearTimeout(idleTimer)
      if (isIdle) {
        isIdle = false
        this.track(AnalyticsEvent.RETURN_FROM_IDLE, {
          idle_duration: Date.now() - (this.sessionStart || Date.now())
        })
      }
      
      idleTimer = setTimeout(() => {
        if (!isIdle) {
          isIdle = true
          this.track(AnalyticsEvent.IDLE_DETECTED, {
            time_before_idle: Date.now() - (this.sessionStart || Date.now())
          })
        }
      }, 300000) // 5 minutes
    }

    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
      window.addEventListener(event, resetIdleTimer, { passive: true })
    })
  }

  // Track page load time
  private trackPageLoad(): void {
    this.pageLoadTime = Date.now()
    
    window.addEventListener('load', () => {
      if (this.pageLoadTime) {
        const loadTime = Date.now() - this.pageLoadTime
        this.track(AnalyticsEvent.PAGE_LOAD_TIME, {
          load_time: loadTime,
          page_url: window.location.href
        })
      }
    })
  }

  // Setup session tracking
  private setupSessionTracking(): void {
    this.sessionStart = Date.now()
    this.track(AnalyticsEvent.SESSION_STARTED, {
      timestamp: new Date().toISOString(),
      session_id: this.generateSessionId()
    })

    // Track session end on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession()
    })

    // Track session duration every 30 seconds
    setInterval(() => {
      if (this.sessionStart) {
        const sessionDuration = Date.now() - this.sessionStart
        this.track(AnalyticsEvent.TIME_ON_PAGE, {
          session_duration: sessionDuration,
          page_url: window.location.href
        })
      }
    }, 30000)
  }

  // End session tracking
  private endSession(): void {
    if (this.sessionStart) {
      const sessionDuration = Date.now() - this.sessionStart
      this.track(AnalyticsEvent.SESSION_ENDED, {
        session_duration: sessionDuration,
        timestamp: new Date().toISOString()
      })
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2)}`
  }

  // Get PostHog API key from environment
  private getPostHogApiKey(): string {
    if (typeof window !== 'undefined') {
      return (window as any).__POSTHOG_API_KEY__ || ''
    }
    return ''
  }

  // Get PostHog host from environment
  private getPostHogHost(): string {
    return 'https://app.posthog.com' // Default PostHog host
  }

  // Check if running in development
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  // Check if analytics is enabled
  private isEnabled(): boolean {
    return isFeatureEnabled('analytics_tracking') && browser
  }

  // Identify user with enhanced properties
  identify(user: ClerkUser): void {
    if (!this.isEnabled()) return

    const userProperties = {
      email: user.email,
      name: user.fullName || user.firstName,
      plan: user.publicMetadata?.plan || 'free',
      role: user.publicMetadata?.role || 'user',
      signup_date: new Date().toISOString(),
      email_verified: user.emailAddresses?.[0]?.verification?.status === 'verified'
    }

    if (this.initialized && this.posthog) {
      this.posthog.identify(user.id, userProperties)
      this.userId = user.id
      
      // Set user as person property for cohort analysis
      this.posthog.people.set(userProperties)
      
      // Determine and set user cohort
      this.updateUserCohort(user)
    } else {
      this.userId = user.id
      // Store for later when PostHog is initialized
      this.queueEvent({
        event: 'identify',
        properties: { userId: user.id, ...userProperties }
      })
    }
  }

  // Update user cohort based on behavior
  updateUserCohort(user: ClerkUser, behaviorMetrics?: UserBehaviorMetrics): void {
    if (!this.isEnabled() || !this.posthog) return

    let newCohort: UserCohort

    const signupDate = new Date(user.publicMetadata?.signupDate || Date.now())
    const daysSinceSignup = (Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24)
    
    const plan = user.publicMetadata?.plan || 'free'
    const hasActiveSubscription = plan === 'pro'
    
    if (hasActiveSubscription) {
      newCohort = UserCohort.PREMIUM_USER
    } else if (daysSinceSignup <= 7) {
      newCohort = UserCohort.NEW_USER
    } else if (behaviorMetrics) {
      if (behaviorMetrics.sessionCount >= 50) {
        newCohort = UserCohort.POWER_USER
      } else if (behaviorMetrics.sessionCount >= 10) {
        newCohort = UserCohort.ENGAGED_USER
      } else {
        const daysSinceLastActive = (Date.now() - new Date(behaviorMetrics.lastActiveDate).getTime()) / (1000 * 60 * 60 * 24)
        newCohort = daysSinceLastActive > 30 ? UserCohort.CHURNED_USER : UserCohort.NEW_USER
      }
    } else {
      newCohort = UserCohort.NEW_USER
    }

    if (newCohort !== this.currentCohort) {
      this.currentCohort = newCohort
      
      // Set cohort as user property
      this.posthog.people.set({ user_cohort: newCohort })
      
      // Track cohort change event
      this.track(AnalyticsEvent.USER_COHORT_UPDATED, {
        previous_cohort: this.currentCohort,
        new_cohort: newCohort,
        days_since_signup: daysSinceSignup
      })
    }
  }

  // Track funnel step completion
  trackFunnelStep(funnelName: string, step: UserJourneyStage, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return

    this.track(AnalyticsEvent.FUNNEL_STEP_COMPLETED, {
      funnel_name: funnelName,
      funnel_step: step,
      step_order: this.getFunnelStepOrder(funnelName, step),
      ...properties
    })

    // Check if this completes a conversion goal
    this.checkConversionGoals(funnelName, step)
  }

  // Get step order in funnel
  private getFunnelStepOrder(funnelName: string, step: UserJourneyStage): number {
    const funnel = CONVERSION_FUNNELS[funnelName as keyof typeof CONVERSION_FUNNELS]
    return funnel ? funnel.indexOf(step) + 1 : 0
  }

  // Check if conversion goals are reached
  private checkConversionGoals(funnelName: string, step: UserJourneyStage): void {
    const conversionGoals = {
      [UserJourneyStage.FIRST_PLAY]: 'first_play_conversion',
      [UserJourneyStage.SUBSCRIPTION_COMPLETE]: 'subscription_conversion',
      [UserJourneyStage.RETENTION_30_DAYS]: 'retention_conversion'
    }

    const goal = conversionGoals[step]
    if (goal) {
      this.track(AnalyticsEvent.CONVERSION_GOAL_REACHED, {
        conversion_goal: goal,
        funnel_name: funnelName,
        completion_step: step
      })
    }
  }

  // Track event with enhanced properties
  track(event: AnalyticsEvent | string, properties?: Record<string, any>): void {
    if (!this.isEnabled()) return

    const eventData: PostHogEvent = {
      event,
      properties: {
        ...properties,
        timestamp: new Date().toISOString(),
        user_plan: this.getCurrentUserPlan(),
        user_cohort: this.currentCohort,
        session_id: this.generateSessionId(),
        page_url: browser ? window.location.href : undefined,
        user_agent: browser ? navigator.userAgent : undefined,
        viewport_width: browser ? window.innerWidth : undefined,
        viewport_height: browser ? window.innerHeight : undefined,
        session_duration: this.sessionStart ? Date.now() - this.sessionStart : 0
      }
    }

    if (this.initialized && this.posthog) {
      this.posthog.capture(eventData.event, eventData.properties)
    } else {
      this.queueEvent(eventData)
    }
  }

  // Track revenue events for subscription analytics
  trackRevenue(amount: number, currency: string = 'USD', properties?: Record<string, any>): void {
    if (!this.isEnabled()) return

    this.track(AnalyticsEvent.SUBSCRIPTION_CHECKOUT_COMPLETED, {
      revenue: amount,
      currency,
      ...properties
    })

    // Set revenue properties on user
    if (this.posthog) {
      this.posthog.people.set({
        total_revenue: amount,
        last_purchase_date: new Date().toISOString()
      })
    }
  }

  // Create feature flag experiment
  createExperiment(experimentName: string, variants: string[], properties?: Record<string, any>): void {
    if (!this.isEnabled() || !this.posthog) return

    const variant = this.posthog.getFeatureFlag(experimentName)
    
    this.track('experiment_started', {
      experiment_name: experimentName,
      variant,
      available_variants: variants,
      ...properties
    })
  }

  // Get feature flag value with analytics tracking
  getFeatureFlag(flagName: string): any {
    if (!this.isEnabled() || !this.posthog) return false

    const value = this.posthog.getFeatureFlag(flagName)
    
    // Track feature flag exposure
    this.track('feature_flag_exposed', {
      flag_name: flagName,
      flag_value: value,
      timestamp: new Date().toISOString()
    })

    return value
  }

  // Reset user (for sign out)
  reset(): void {
    if (!this.isEnabled()) return

    this.userId = null
    this.currentCohort = null
    this.endSession()

    if (this.posthog) {
      this.posthog.reset()
    }
  }

  // Get current user plan
  private getCurrentUserPlan(): string {
    // This would be retrieved from user context/store
    return 'free' // Default fallback
  }

  // Queue event for later sending
  private queueEvent(event: PostHogEvent): void {
    this.eventQueue.push(event)
    
    // Limit queue size to prevent memory issues
    if (this.eventQueue.length > 100) {
      this.eventQueue.shift()
    }
  }

  // Flush queued events
  private flushEventQueue(): void {
    if (!this.initialized || !this.posthog) return

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift()
      if (event) {
        if (event.event === 'identify' && event.properties?.userId) {
          this.posthog.identify(event.properties.userId, event.properties)
        } else {
          this.posthog.capture(event.event, event.properties)
        }
      }
    }
  }

  // Get analytics instance for advanced usage
  getPostHogInstance(): any {
    return this.posthog
  }
}

// Create and export singleton instance
export const analytics = new AnalyticsService()

// Export convenience functions
export const trackEvent = (event: AnalyticsEvent | string, properties?: Record<string, any>) => {
  analytics.track(event, properties)
}

export const identifyUser = (user: ClerkUser) => {
  analytics.identify(user)
}

export const trackFunnel = (funnelName: string, step: UserJourneyStage, properties?: Record<string, any>) => {
  analytics.trackFunnelStep(funnelName, step, properties)
}

export const trackRevenue = (amount: number, currency?: string, properties?: Record<string, any>) => {
  analytics.trackRevenue(amount, currency, properties)
}

export const resetAnalytics = () => {
  analytics.reset()
} 