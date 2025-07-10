// Production Error Handling Utility
// Provides comprehensive error handling for auth, network, and application errors

export interface AppError {
  code: string
  message: string
  userMessage: string
  category: 'auth' | 'network' | 'validation' | 'system' | 'clerk'
  severity: 'low' | 'medium' | 'high' | 'critical'
  retryable: boolean
  timestamp: number
  context?: Record<string, any>
}

export interface ErrorHandlingOptions {
  showToUser?: boolean
  logToConsole?: boolean
  logToService?: boolean
  trackAnalytics?: boolean
  redirectOnAuth?: boolean
  redirectUrl?: string
}

// Error type definitions
export const ERROR_CODES = {
  // Authentication errors
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_EXPIRED: 'AUTH_EXPIRED',
  AUTH_INVALID: 'AUTH_INVALID',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  CLERK_INIT_FAILED: 'CLERK_INIT_FAILED',
  CLERK_SESSION_INVALID: 'CLERK_SESSION_INVALID',
  MAGIC_LINK_EXPIRED: 'MAGIC_LINK_EXPIRED',
  MAGIC_LINK_INVALID: 'MAGIC_LINK_INVALID',
  
  // Network errors
  NETWORK_OFFLINE: 'NETWORK_OFFLINE',
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  NETWORK_ERROR: 'NETWORK_ERROR',
  API_UNAVAILABLE: 'API_UNAVAILABLE',
  RATE_LIMITED: 'RATE_LIMITED',
  
  // Database errors
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_SYNC_FAILED: 'DB_SYNC_FAILED',
  
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_PREFERENCES: 'INVALID_PREFERENCES',
  
  // System errors
  UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  FEATURE_DISABLED: 'FEATURE_DISABLED',
  
  // Content Pipeline errors (Phase 4)
  CONTENT_FETCH_FAILED: 'CONTENT_FETCH_FAILED',
  SCRIPT_GENERATION_FAILED: 'SCRIPT_GENERATION_FAILED',
  TTS_RENDER_FAILED: 'TTS_RENDER_FAILED',
  GROK_API_ERROR: 'GROK_API_ERROR',
  ELEVENLABS_API_ERROR: 'ELEVENLABS_API_ERROR',
  CLIP_STORAGE_FAILED: 'CLIP_STORAGE_FAILED',
  PIPELINE_TIMEOUT: 'PIPELINE_TIMEOUT'
} as const

type ErrorCode = keyof typeof ERROR_CODES

// Default error messages for users
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // Auth errors
  AUTH_REQUIRED: 'Please sign in to continue',
  AUTH_EXPIRED: 'Your session has expired. Please sign in again',
  AUTH_INVALID: 'Authentication failed. Please try signing in again',
  AUTH_FORBIDDEN: 'You don\'t have permission to access this feature',
  CLERK_INIT_FAILED: 'Authentication service is temporarily unavailable',
  CLERK_SESSION_INVALID: 'Your session is invalid. Please sign in again',
  MAGIC_LINK_EXPIRED: 'Your magic link has expired. Please request a new one',
  MAGIC_LINK_INVALID: 'This magic link is invalid or has already been used',
  
  // Network errors
  NETWORK_OFFLINE: 'You appear to be offline. Please check your connection',
  NETWORK_TIMEOUT: 'Request timed out. Please try again',
  NETWORK_ERROR: 'Network error occurred. Please try again',
  API_UNAVAILABLE: 'Service is temporarily unavailable. Please try again later',
  RATE_LIMITED: 'Too many requests. Please wait a moment and try again',
  
  // Database errors
  DB_CONNECTION_FAILED: 'Database connection failed. Please try again',
  DB_QUERY_FAILED: 'Failed to retrieve data. Please try again',
  DB_SYNC_FAILED: 'Failed to sync your preferences. Changes saved locally',
  
  // Validation errors
  INVALID_INPUT: 'Please check your input and try again',
  INVALID_EMAIL: 'Please enter a valid email address',
  INVALID_PREFERENCES: 'Invalid preferences format',
  
  // System errors
  UNEXPECTED_ERROR: 'Something went wrong. Please try again',
  SERVICE_UNAVAILABLE: 'This service is temporarily unavailable',
  FEATURE_DISABLED: 'This feature is currently disabled',
  
  // Content Pipeline errors (Phase 4)
  CONTENT_FETCH_FAILED: 'Failed to fetch latest content. Please try again',
  SCRIPT_GENERATION_FAILED: 'Failed to generate content script. Please try again',
  TTS_RENDER_FAILED: 'Failed to generate audio. Please try again',
  GROK_API_ERROR: 'Content generation service is temporarily unavailable',
  ELEVENLABS_API_ERROR: 'Audio generation service is temporarily unavailable',
  CLIP_STORAGE_FAILED: 'Failed to store audio clip. Please try again',
  PIPELINE_TIMEOUT: 'Content generation is taking longer than expected'
}

// Error severity mapping
const ERROR_SEVERITY: Record<ErrorCode, AppError['severity']> = {
  AUTH_REQUIRED: 'medium',
  AUTH_EXPIRED: 'medium',
  AUTH_INVALID: 'high',
  AUTH_FORBIDDEN: 'medium',
  CLERK_INIT_FAILED: 'critical',
  CLERK_SESSION_INVALID: 'medium',
  MAGIC_LINK_EXPIRED: 'low',
  MAGIC_LINK_INVALID: 'medium',
  
  NETWORK_OFFLINE: 'high',
  NETWORK_TIMEOUT: 'medium',
  NETWORK_ERROR: 'medium',
  API_UNAVAILABLE: 'high',
  RATE_LIMITED: 'low',
  
  DB_CONNECTION_FAILED: 'high',
  DB_QUERY_FAILED: 'medium',
  DB_SYNC_FAILED: 'low',
  
  INVALID_INPUT: 'low',
  INVALID_EMAIL: 'low',
  INVALID_PREFERENCES: 'low',
  
  UNEXPECTED_ERROR: 'high',
  SERVICE_UNAVAILABLE: 'high',
  FEATURE_DISABLED: 'medium',
  
  // Content Pipeline errors (Phase 4)
  CONTENT_FETCH_FAILED: 'medium',
  SCRIPT_GENERATION_FAILED: 'medium',
  TTS_RENDER_FAILED: 'medium',
  GROK_API_ERROR: 'high',
  ELEVENLABS_API_ERROR: 'high',
  CLIP_STORAGE_FAILED: 'medium',
  PIPELINE_TIMEOUT: 'medium'
}

// Error category mapping
const ERROR_CATEGORY: Record<ErrorCode, AppError['category']> = {
  AUTH_REQUIRED: 'auth',
  AUTH_EXPIRED: 'auth',
  AUTH_INVALID: 'auth',
  AUTH_FORBIDDEN: 'auth',
  CLERK_INIT_FAILED: 'clerk',
  CLERK_SESSION_INVALID: 'clerk',
  MAGIC_LINK_EXPIRED: 'auth',
  MAGIC_LINK_INVALID: 'auth',
  
  NETWORK_OFFLINE: 'network',
  NETWORK_TIMEOUT: 'network',
  NETWORK_ERROR: 'network',
  API_UNAVAILABLE: 'network',
  RATE_LIMITED: 'network',
  
  DB_CONNECTION_FAILED: 'system',
  DB_QUERY_FAILED: 'system',
  DB_SYNC_FAILED: 'system',
  
  INVALID_INPUT: 'validation',
  INVALID_EMAIL: 'validation',
  INVALID_PREFERENCES: 'validation',
  
  UNEXPECTED_ERROR: 'system',
  SERVICE_UNAVAILABLE: 'system',
  FEATURE_DISABLED: 'system',
  
  // Content Pipeline errors (Phase 4)
  CONTENT_FETCH_FAILED: 'system',
  SCRIPT_GENERATION_FAILED: 'system',
  TTS_RENDER_FAILED: 'system',
  GROK_API_ERROR: 'system',
  ELEVENLABS_API_ERROR: 'system',
  CLIP_STORAGE_FAILED: 'system',
  PIPELINE_TIMEOUT: 'system'
}

// Retryable errors
const RETRYABLE_ERRORS: Set<ErrorCode> = new Set([
  'NETWORK_TIMEOUT',
  'NETWORK_ERROR',
  'API_UNAVAILABLE',
  'DB_CONNECTION_FAILED',
  'DB_QUERY_FAILED',
  'CLERK_INIT_FAILED',
  'CONTENT_FETCH_FAILED',
  'SCRIPT_GENERATION_FAILED',
  'TTS_RENDER_FAILED',
  'GROK_API_ERROR',
  'ELEVENLABS_API_ERROR',
  'CLIP_STORAGE_FAILED'
])

// Create standardized error
export function createError(
  code: ErrorCode,
  originalError?: Error,
  context?: Record<string, any>,
  customMessage?: string
): AppError {
  return {
    code,
    message: originalError?.message || `Error: ${code}`,
    userMessage: customMessage || ERROR_MESSAGES[code],
    category: ERROR_CATEGORY[code],
    severity: ERROR_SEVERITY[code],
    retryable: RETRYABLE_ERRORS.has(code),
    timestamp: Date.now(),
    context: {
      ...context,
      originalStack: originalError?.stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    }
  }
}

// Handle network errors specifically
export function handleNetworkError(error: any, context?: Record<string, any>): AppError {
  // Check if offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return createError('NETWORK_OFFLINE', error, context)
  }
  
  // Check for timeout
  if (error.name === 'AbortError' || error.message?.includes('timeout')) {
    return createError('NETWORK_TIMEOUT', error, context)
  }
  
  // Check for rate limiting
  if (error.status === 429) {
    return createError('RATE_LIMITED', error, context)
  }
  
  // Check for service unavailable
  if (error.status >= 500) {
    return createError('API_UNAVAILABLE', error, context)
  }
  
  return createError('NETWORK_ERROR', error, context)
}

// Handle authentication errors specifically
export function handleAuthError(error: any, context?: Record<string, any>): AppError {
  const errorMessage = error.message?.toLowerCase() || ''
  
  if (errorMessage.includes('magic') && errorMessage.includes('expired')) {
    return createError('MAGIC_LINK_EXPIRED', error, context)
  }
  
  if (errorMessage.includes('magic') && errorMessage.includes('invalid')) {
    return createError('MAGIC_LINK_INVALID', error, context)
  }
  
  if (errorMessage.includes('session') && errorMessage.includes('expired')) {
    return createError('AUTH_EXPIRED', error, context)
  }
  
  if (errorMessage.includes('session') && errorMessage.includes('invalid')) {
    return createError('CLERK_SESSION_INVALID', error, context)
  }
  
  if (errorMessage.includes('unauthorized') || error.status === 401) {
    return createError('AUTH_REQUIRED', error, context)
  }
  
  if (errorMessage.includes('forbidden') || error.status === 403) {
    return createError('AUTH_FORBIDDEN', error, context)
  }
  
  if (errorMessage.includes('clerk') && errorMessage.includes('init')) {
    return createError('CLERK_INIT_FAILED', error, context)
  }
  
  return createError('AUTH_INVALID', error, context)
}

// Handle fetch errors with retry logic
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<Response> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Add timeout to fetch requests
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      return response
      
    } catch (error) {
      lastError = error
      
      // Don't retry on certain errors
      if (error instanceof Error && 
          (error.message.includes('400') || error.message.includes('401') || error.message.includes('403'))) {
        break
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
    }
  }
  
  throw handleNetworkError(lastError, { url, attempts: maxRetries + 1 })
}

// Global error handler
export function handleError(
  error: any,
  options: ErrorHandlingOptions = {}
): AppError {
  const {
    showToUser = true,
    logToConsole = true,
    logToService = false,
    trackAnalytics = false,
    redirectOnAuth = true,
    redirectUrl = '/auth/signin'
  } = options
  
  let appError: AppError
  
  // Determine error type and create appropriate AppError
  if (error instanceof Error) {
    if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      appError = handleAuthError(error)
    } else if (error.message.includes('network') || error.message.includes('fetch')) {
      appError = handleNetworkError(error)
    } else {
      appError = createError('UNEXPECTED_ERROR', error)
    }
  } else if (typeof error === 'string') {
    appError = createError('UNEXPECTED_ERROR', new Error(error))
  } else {
    appError = createError('UNEXPECTED_ERROR', new Error('Unknown error occurred'))
  }
  
  // Log to console in development
  if (logToConsole && (import.meta.env.DEV || import.meta.env.MODE === 'development')) {
    console.error('App Error:', appError)
  }
  
  // Log to external service in production
  if (logToService && import.meta.env.PROD) {
    // In production, send to error tracking service like Sentry
    console.error('Production Error:', appError)
  }
  
  // Track analytics
  if (trackAnalytics) {
    // In production, send to analytics service
    console.log('Error Analytics:', {
      code: appError.code,
      category: appError.category,
      severity: appError.severity
    })
  }
  
  // Handle auth redirects
  if (redirectOnAuth && appError.category === 'auth' && typeof window !== 'undefined') {
    const currentPath = window.location.pathname
    if (currentPath !== '/auth/signin' && currentPath !== '/auth/error') {
      setTimeout(() => {
        window.location.href = `${redirectUrl}?returnUrl=${encodeURIComponent(currentPath)}&error=${appError.code}`
      }, 2000) // Give user time to see the error message
    }
  }
  
  return appError
}

// Error notification system (could be replaced with toast library)
export function showErrorNotification(error: AppError) {
  if (typeof window === 'undefined') return
  
  // Create simple error notification
  const notification = document.createElement('div')
  notification.className = 'error-notification'
  notification.style.cssText = `
    position: fixed;
    top: 1rem;
    right: 1rem;
    background: #dc2626;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 9999;
    max-width: 24rem;
    font-size: 0.875rem;
    animation: slideIn 0.3s ease-out;
  `
  
  notification.innerHTML = `
    <div style="display: flex; align-items: center; gap: 0.5rem;">
      <span style="font-weight: 600;">Error</span>
      <button onclick="this.parentElement.parentElement.remove()" style="margin-left: auto; background: none; border: none; color: white; cursor: pointer; font-size: 1.25rem;">&times;</button>
    </div>
    <div style="margin-top: 0.25rem;">${error.userMessage}</div>
    ${error.retryable ? '<div style="margin-top: 0.5rem; font-size: 0.75rem; opacity: 0.8;">Please try again</div>' : ''}
  `
  
  document.body.appendChild(notification)
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentElement) {
      notification.remove()
    }
  }, 5000)
}

// Retry utility
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: any
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      
      const appError = handleError(error, { showToUser: false, logToConsole: false })
      
      if (!appError.retryable || attempt === maxRetries) {
        break
      }
      
      await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
    }
  }
  
  throw lastError
}

// Add global styles for error notifications
if (typeof document !== 'undefined' && !document.getElementById('error-notification-styles')) {
  const style = document.createElement('style')
  style.id = 'error-notification-styles'
  style.textContent = `
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(100%);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  `
  document.head.appendChild(style)
} 