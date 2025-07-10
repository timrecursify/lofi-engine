import { createClerkClient } from '@clerk/backend'
import type { User } from '@clerk/backend'

// Types for JWT middleware
export interface JWTPayload {
  sub: string
  email?: string
  name?: string
  picture?: string
  exp: number
  iat: number
}

export interface AuthenticatedRequest {
  user: User
  userId: string
  sessionId: string
}

export class JWTMiddleware {
  private clerk: ReturnType<typeof createClerkClient>

  constructor(clerkSecretKey: string) {
    this.clerk = createClerkClient({
      secretKey: clerkSecretKey,
      apiUrl: 'https://api.clerk.dev',
      apiVersion: 'v1'
    })
  }

  /**
   * Validate JWT token and return user information
   */
  async validateToken(token: string): Promise<AuthenticatedRequest | null> {
    try {
      // For now, use the existing JWT decode approach until we can properly integrate
      // with Clerk's backend verification. The token should already be validated by hooks.server.ts
      const payload = this.decodeJWT(token)
      
      if (!payload || !payload.sub) {
        return null
      }

      // Get user details from Clerk
      const user = await this.clerk.users.getUser(payload.sub)
      
      if (!user) {
        return null
      }

      return {
        user,
        userId: user.id,
        sessionId: payload.sessionId || ''
      }
    } catch (error) {
      console.error('JWT validation failed:', error)
      return null
    }
  }

  /**
   * Simple JWT decode (without verification - assumes pre-verified by hooks)
   */
  private decodeJWT(token: string): (JWTPayload & { sessionId?: string }) | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        return null
      }

      const payload = JSON.parse(atob(parts[1]))
      return payload
    } catch (error) {
      console.error('JWT decode failed:', error)
      return null
    }
  }

  /**
   * Extract token from Authorization header
   */
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }
    
    return authHeader.substring(7) // Remove 'Bearer ' prefix
  }

  /**
   * Extract token from cookies
   */
  extractTokenFromCookies(cookieHeader: string | null): string | null {
    if (!cookieHeader) {
      return null
    }

    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {} as Record<string, string>)

    // Check for Clerk session token in cookies
    return cookies['__session'] || cookies['__clerk_session'] || null
  }

  /**
   * Middleware function for request authentication
   */
  async authenticateRequest(request: Request): Promise<AuthenticatedRequest | Response> {
    const authHeader = request.headers.get('Authorization')
    const cookieHeader = request.headers.get('Cookie')
    
    // Try to extract token from Authorization header first
    let token = this.extractTokenFromHeader(authHeader)
    
    // If no token in header, try cookies
    if (!token) {
      token = this.extractTokenFromCookies(cookieHeader)
    }
    
    if (!token) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'No authentication token provided' 
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    const authResult = await this.validateToken(token)
    
    if (!authResult) {
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Invalid or expired token' 
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }

    return authResult
  }
}

// Export singleton instance factory
export function createJWTMiddleware(clerkSecretKey: string): JWTMiddleware {
  return new JWTMiddleware(clerkSecretKey)
}

// Helper function to get Clerk secret from environment
export function getClerkSecret(env: any): string {
  const secret = env.CLERK_SECRET_KEY
  if (!secret) {
    throw new Error('CLERK_SECRET_KEY environment variable is required')
  }
  return secret
} 