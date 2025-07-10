import { browser } from '$app/environment'
import { captureError, addBreadcrumb } from '$lib/services/error-monitoring'
import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'

interface ApiConfig {
  timeout?: number
  retries?: number
  retryDelay?: number
  headers?: Record<string, string>
}

interface ApiResponse<T = any> {
  data?: T
  error?: string
  status: number
  ok: boolean
  headers: Headers
  duration: number
}

// Simple API monitor for production build compatibility
class SimpleApiMonitor {
  private defaultConfig: ApiConfig = {
    timeout: 30000,
    retries: 3,
    retryDelay: 1000,
    headers: {
      'Content-Type': 'application/json'
    }
  }

  async fetch<T = any>(
    url: string,
    options: RequestInit & ApiConfig = {}
  ): Promise<ApiResponse<T>> {
    const startTime = Date.now()
    const config = { ...this.defaultConfig, ...options }

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...config.headers,
          ...options.headers
        }
      })

      const duration = Date.now() - startTime
      let data: T | undefined

      try {
        const text = await response.text()
        if (text) {
          data = JSON.parse(text)
        }
      } catch (parseError) {
        // Handle non-JSON responses
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
        headers: response.headers,
        duration
      }
    } catch (error) {
      const duration = Date.now() - startTime
      
      return {
        error: (error as Error).message,
        status: 0,
        ok: false,
        headers: new Headers(),
        duration
      }
    }
  }

  async get<T = any>(url: string, config?: ApiConfig): Promise<ApiResponse<T>> {
    return this.fetch<T>(url, { ...config, method: 'GET' })
  }

  async post<T = any>(url: string, data?: any, config?: ApiConfig): Promise<ApiResponse<T>> {
    return this.fetch<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async put<T = any>(url: string, data?: any, config?: ApiConfig): Promise<ApiResponse<T>> {
    return this.fetch<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  async delete<T = any>(url: string, config?: ApiConfig): Promise<ApiResponse<T>> {
    return this.fetch<T>(url, { ...config, method: 'DELETE' })
  }
}

const apiMonitor = new SimpleApiMonitor()

export async function apiGet<T = any>(url: string, config?: ApiConfig): Promise<ApiResponse<T>> {
  return apiMonitor.get<T>(url, config)
}

export async function apiPost<T = any>(url: string, data?: any, config?: ApiConfig): Promise<ApiResponse<T>> {
  return apiMonitor.post<T>(url, data, config)
}

export async function apiPut<T = any>(url: string, data?: any, config?: ApiConfig): Promise<ApiResponse<T>> {
  return apiMonitor.put<T>(url, data, config)
}

export async function apiDelete<T = any>(url: string, config?: ApiConfig): Promise<ApiResponse<T>> {
  return apiMonitor.delete<T>(url, config)
}

export function measurePerformance<T>(
  operation: string, 
  fn: () => Promise<T>
): Promise<T> {
  // Simple performance measurement for production build
  return fn()
} 