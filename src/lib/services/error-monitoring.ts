/**
 * Error Monitoring Service - Production-grade error tracking with Sentry
 * 
 * Comprehensive error monitoring with Sentry integration, analytics tracking,
 * and production-safe error handling following senior engineer standards.
 */

import { browser } from '$app/environment'
import { dev } from '$app/environment'
import { isFeatureEnabled } from './feature-flags'
import { analytics, trackEvent, AnalyticsEvent } from './analytics'
import { logger, createComponentLogger } from '$lib/utils/logger'
import type * as Sentry from '@sentry/browser'

interface ErrorContext {
  tags?: Record<string, string>
  extra?: Record<string, any>
  user?: {
    id?: string
    email?: string
    username?: string
  }
  level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  fingerprint?: string[]
  component?: string
}

interface SentryConfig {
  dsn: string
  environment: string
  debug: boolean
  tracesSampleRate: number
  profilesSampleRate?: number
  beforeSend?: (event: any, hint: any) => any
}

class ErrorMonitoringService {
  private initialized = false
  private errorQueue: Array<{ error: Error; context?: ErrorContext }> = []
  private userId: string | null = null
  private sentry: typeof Sentry | null = null
  private componentLogger = createComponentLogger('ErrorMonitoringService')

  constructor() {
    if (browser) {
      this.initialize()
      this.setupGlobalErrorHandlers()
    }
  }

  // Initialize error monitoring with Sentry
  private async initialize(): Promise<void> {
    if (this.initialized || !browser) return

    // Check if error monitoring is enabled
    if (!isFeatureEnabled('error_monitoring')) {
      this.componentLogger.logInfo('Error monitoring disabled via feature flag')
      return
    }

    try {
      // Dynamic import to avoid SSR issues
      const sentryModule = await import('@sentry/browser')
      this.sentry = sentryModule

      const config = this.getSentryConfig()
      if (!config.dsn) {
        this.componentLogger.logWarning('Sentry DSN not configured, using basic error monitoring')
        this.initialized = true
        this.flushErrorQueue()
        return
      }

      // Initialize Sentry with production configuration
      this.sentry.init({
        dsn: config.dsn,
        environment: config.environment,
        debug: config.debug,
        tracesSampleRate: config.tracesSampleRate,
        profilesSampleRate: config.profilesSampleRate,
        
        // Enhanced configuration for production
        integrations: [
          sentryModule.browserTracingIntegration(),
          sentryModule.replayIntegration({
            // Only record replays for sessions with errors in production
            maskAllText: !dev,
            blockAllMedia: !dev,
          }),
        ],
        
        // Data scrubbing for privacy
        beforeSend: this.createBeforeSendFilter(),
        
        // Custom error filtering
        ignoreErrors: [
          // Ignore common browser extension errors
          'Non-Error promise rejection captured',
          'ResizeObserver loop limit exceeded',
          'Script error.',
          // Add more patterns as needed
        ],

        // Network configuration
        transport: dev ? undefined : sentryModule.makeBrowserOfflineTransport(sentryModule.makeFetchTransport),
      })

      this.componentLogger.logInfo('Sentry error monitoring initialized', {
        environment: config.environment,
        debug: config.debug
      })

      this.initialized = true
      this.flushErrorQueue()

    } catch (error) {
      this.componentLogger.logError(error as Error, {
        context: 'Failed to initialize Sentry'
      })
      
      // Fallback to basic error monitoring
      this.initialized = true
      this.flushErrorQueue()
    }
  }

  // Get Sentry configuration from environment
  private getSentryConfig(): SentryConfig {
    return {
      dsn: this.getSentryDSN(),
      environment: dev ? 'development' : 'production',
      debug: dev,
      tracesSampleRate: dev ? 1.0 : 0.1,
      profilesSampleRate: dev ? 1.0 : 0.1,
    }
  }

  // Get Sentry DSN from environment
  private getSentryDSN(): string {
    if (browser && 'PUBLIC_SENTRY_DSN' in window) {
      return (window as any).PUBLIC_SENTRY_DSN || ''
    }
    return import.meta.env.PUBLIC_SENTRY_DSN || ''
  }

  // Create before send filter for data privacy
  private createBeforeSendFilter() {
    return (event: any, hint: any) => {
      // Filter out sensitive data
      if (event.user && event.user.email) {
        event.user.email = event.user.email.replace(/(.{2}).*@/, '$1***@')
      }

      // Remove sensitive query parameters
      if (event.request && event.request.url) {
        event.request.url = event.request.url.replace(/([?&])(token|key|secret|password)=[^&]*/g, '$1$2=***')
      }

      // In development, always send
      if (dev) return event

      // In production, filter based on severity
      if (event.level === 'debug' || event.level === 'info') {
        return null
      }

      return event
    }
  }

  // Setup global error handlers
  private setupGlobalErrorHandlers(): void {
    if (!browser) return

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = new Error(`Unhandled Promise Rejection: ${event.reason}`)
      this.captureError(error, {
        tags: { type: 'unhandled_rejection' },
        extra: { reason: event.reason }
      })

      // Also track in analytics
      trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
        error_type: 'unhandled_rejection',
        error_message: String(event.reason)
      })
    })

    // Catch global errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message)
      this.captureError(error, {
        tags: { type: 'global_error' },
        extra: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      })

      trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
        error_type: 'global_error',
        error_message: event.message,
        filename: event.filename
      })
    })
  }

  // Check if development environment
  private isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  // Check if error monitoring is enabled
  private isEnabled(): boolean {
    return isFeatureEnabled('error_monitoring') && browser
  }

  // Set user context
  setUser(user: { id: string; email?: string; username?: string }): void {
    if (!this.isEnabled()) return
    
    this.userId = user.id
    
    if (this.sentry) {
      this.sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username || user.email
      })
    }

    this.componentLogger.logInfo('User context set for error monitoring', {
      userId: user.id,
      hasEmail: !!user.email
    })
  }

  // Clear user context
  clearUser(): void {
    if (!this.isEnabled()) return
    
    this.userId = null
    
    if (this.sentry) {
      this.sentry.setUser(null)
    }

    this.componentLogger.logInfo('User context cleared')
  }

  // Add breadcrumb for debugging context
  addBreadcrumb(message: string, category: string = 'default', level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info', data?: Record<string, any>): void {
    if (!this.isEnabled()) return

    const breadcrumb = {
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
      data
    }

    if (this.sentry) {
      this.sentry.addBreadcrumb(breadcrumb)
    }

    // Also log through our centralized logger
    logger.debug(`Breadcrumb: ${message}`, 'ErrorMonitoring', {
      category,
      level,
      data
    })

    // Track breadcrumb in analytics for debugging
    trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      error_type: 'breadcrumb',
      error_message: message,
      category,
      level,
      user_id: this.userId
    })
  }

  // Capture error with comprehensive context
  captureError(error: Error, context?: ErrorContext): string | null {
    if (!this.isEnabled()) return null

    // Always log through centralized logger
    logger.error(
      `Error captured: ${error.message}`,
      context?.component || 'ErrorMonitoring',
      {
        error: error.message,
        stack: error.stack,
        context,
        userId: this.userId
      }
    )

    let eventId: string | null = null

         if (this.sentry && this.initialized) {
       // Set context if provided
       eventId = this.sentry.withScope((scope) => {
         if (context) {
           if (context.tags) {
             Object.entries(context.tags).forEach(([key, value]) => {
               scope.setTag(key, value)
             })
           }
           if (context.extra) {
             Object.entries(context.extra).forEach(([key, value]) => {
               scope.setExtra(key, value)
             })
           }
           if (context.level) {
             scope.setLevel(context.level)
           }
           if (context.fingerprint) {
             scope.setFingerprint(context.fingerprint)
           }
         }
         return this.sentry!.captureException(error)
       })
    } else {
      // Queue error if Sentry not initialized
      this.queueError(error, context)
      eventId = `queued_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Track error in analytics
    trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      error_type: 'captured_error',
      error_message: error.message,
      error_stack: error.stack,
      component: context?.component || context?.tags?.component || 'unknown',
      user_id: this.userId,
      event_id: eventId
    })

    return eventId
  }

  // Capture message with context
  captureMessage(message: string, context?: ErrorContext): string | null {
    if (!this.isEnabled()) return null

    // Log through centralized logger
    logger.info(
      `Message captured: ${message}`,
      context?.component || 'ErrorMonitoring',
      {
        context,
        userId: this.userId
      }
    )

    let eventId: string | null = null

         if (this.sentry && this.initialized) {
       // Set context if provided
       eventId = this.sentry.withScope((scope) => {
         if (context) {
           if (context.tags) {
             Object.entries(context.tags).forEach(([key, value]) => {
               scope.setTag(key, value)
             })
           }
           if (context.extra) {
             Object.entries(context.extra).forEach(([key, value]) => {
               scope.setExtra(key, value)
             })
           }
           if (context.level) {
             scope.setLevel(context.level)
           }
         }
         return this.sentry!.captureMessage(message, context?.level)
       })
    } else {
      eventId = `message_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }

    // Track in analytics
    trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      error_type: 'captured_message',
      error_message: message,
      component: context?.component || context?.tags?.component || 'unknown',
      user_id: this.userId,
      event_id: eventId
    })

    return eventId
  }

  // Test error reporting (development only)
  testErrorReporting(): void {
    if (!this.isDevelopment()) return

    console.log('Testing error reporting...')
    
    // Test captured exception
    this.captureError(new Error('Test error from error monitoring service'), {
      tags: { type: 'test' },
      extra: { test_data: 'This is a test error' }
    })

    // Test captured message
    this.captureMessage('Test message from error monitoring service', {
      level: 'info',
      tags: { type: 'test' }
    })

    console.log('Error reporting test completed')
  }

  // Queue error for later sending
  private queueError(error: Error, context?: ErrorContext): void {
    this.errorQueue.push({ error, context })
    
    // Limit queue size
    if (this.errorQueue.length > 50) {
      this.errorQueue.shift()
    }
  }

  // Flush queued errors
  private flushErrorQueue(): void {
    if (!this.initialized) return

    while (this.errorQueue.length > 0) {
      const { error, context } = this.errorQueue.shift()!
      this.captureError(error, context)
    }
  }
}

// Create and export singleton instance
export const errorMonitoring = new ErrorMonitoringService()

// Export convenience functions
export const captureError = (error: Error, context?: ErrorContext) => {
  return errorMonitoring.captureError(error, context)
}

export const captureMessage = (message: string, context?: ErrorContext) => {
  return errorMonitoring.captureMessage(message, context)
}

export const addBreadcrumb = (message: string, category?: string, level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug', data?: Record<string, any>) => {
  errorMonitoring.addBreadcrumb(message, category, level, data)
}

export const setUser = (user: { id: string; email?: string; username?: string }) => {
  errorMonitoring.setUser(user)
}

export const clearUser = () => {
  errorMonitoring.clearUser()
} 