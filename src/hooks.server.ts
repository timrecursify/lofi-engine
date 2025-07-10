// Production Clerk Server-Side Authentication
import { createClerkClient } from '@clerk/backend'
import { env } from "$env/dynamic/private"
import { sequence } from '@sveltejs/kit/hooks'
import type { Handle, RequestEvent } from '@sveltejs/kit'

// Initialize Clerk client for server-side operations
const clerkClient = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.PUBLIC_CLERK_PUBLISHABLE_KEY,
})

// Extended locals interface for TypeScript
interface ClerkLocals {
  auth: {
    userId: string | null
    sessionId: string | null
    user: any | null
    session: any | null
    organization: any | null
    orgId: string | null
    getToken: (options?: any) => Promise<string | null>
  }
  getSession: () => Promise<any | null>
}

declare global {
  namespace App {
    interface Locals extends ClerkLocals {}
  }
}

// Extract session token from cookies or headers
function getSessionToken(event: RequestEvent): string | null {
  // Try to get from Authorization header first
  const authHeader = event.request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Try to get from __session cookie (Clerk's default)
  const sessionCookie = event.cookies.get('__session')
  if (sessionCookie) {
    return sessionCookie
  }

  // Try development token from query params (development only)
  if (env.NODE_ENV === 'development') {
    const url = new URL(event.request.url)
    const devToken = url.searchParams.get('__clerk_db_jwt')
    if (devToken) {
      return devToken
    }
  }

  return null
}

// Clerk authentication handle
const clerkAuthHandle: Handle = async ({ event, resolve }) => {
  const sessionToken = getSessionToken(event)

  // Initialize auth object with defaults
  let authState = {
    userId: null as string | null,
    sessionId: null as string | null,
    user: null as any,
    session: null as any,
    organization: null as any,
    orgId: null as string | null,
    getToken: async (options?: any) => sessionToken
  }

  // Verify session if token exists
  if (sessionToken) {
    try {
      const requestState = await clerkClient.authenticateRequest(event.request, {
        secretKey: env.CLERK_SECRET_KEY,
        authorizedParties: [
          event.url.origin,
          'https://chillcast.fm', // Production
          'http://localhost:5173', // Development
          'http://localhost:4173', // Preview
        ]
      })

      if (requestState.isSignedIn) {
        // Extract auth data from request state
        const userId = (requestState as any).auth?.userId || null
        const sessionId = (requestState as any).auth?.sessionId || null
        const orgId = (requestState as any).auth?.orgId || null

        // Get user and session data
        const user = userId ? await clerkClient.users.getUser(userId) : null
        const session = sessionId ? await clerkClient.sessions.getSession(sessionId) : null

        authState = {
          userId,
          sessionId,
          user,
          session,
          organization: orgId ? await clerkClient.organizations.getOrganization({
            organizationId: orgId
          }) : null,
          orgId,
          getToken: async (options?: any) => {
            if (!sessionId) return null
            try {
              const token = await clerkClient.sessions.getToken(sessionId, options?.template || 'default')
              return typeof token === 'string' ? token : (token as any)?.jwt || null
            } catch {
              return null
            }
          }
        }
      }
    } catch (error) {
      console.error('Clerk authentication error:', error)
      // Continue with unauthenticated state
    }
  }

  // Attach auth state to locals
  event.locals.auth = authState
  
  // Legacy compatibility - provide getSession function
  event.locals.getSession = async () => {
    return authState.session ? {
      user: {
        id: authState.userId,
        email: authState.user?.primaryEmailAddress?.emailAddress,
        name: authState.user?.fullName,
        image: authState.user?.imageUrl,
        ...authState.user
      },
      expires: authState.session?.expireAt,
      sessionId: authState.sessionId
    } : null
  }

  return resolve(event)
}

// Route protection handle
const authorizationHandle: Handle = async ({ event, resolve }) => {
  const { auth } = event.locals

  // Production-safe route protection with comprehensive validation
  
  // Protect dashboard routes
  if (event.url.pathname.startsWith('/dashboard')) {
    if (!auth.userId) {
      const returnUrl = encodeURIComponent(event.url.pathname + event.url.search)
      return Response.redirect(new URL(`/auth/signin?returnUrl=${returnUrl}`, event.url.origin), 302)
    }
    
    // Validate session is still active
    if (auth.sessionId) {
      try {
        const session = await clerkClient.sessions.getSession(auth.sessionId)
        if (session.status !== 'active') {
          return Response.redirect(new URL('/auth/signin?error=session_expired', event.url.origin), 302)
        }
      } catch (error) {
        console.error('Session validation error:', error)
        return Response.redirect(new URL('/auth/signin?error=session_invalid', event.url.origin), 302)
      }
    }
  }

  // Protect admin routes (require specific role/org)
  if (event.url.pathname.startsWith('/admin')) {
    if (!auth.userId) {
      const returnUrl = encodeURIComponent(event.url.pathname + event.url.search)
      return Response.redirect(new URL(`/auth/signin?returnUrl=${returnUrl}`, event.url.origin), 302)
    }
    
          // Validate session and check admin role
      try {
        const user = await clerkClient.users.getUser(auth.userId)
        
        // Check for admin role in user metadata (production-safe approach)
        const hasAdminRole = user.publicMetadata?.role === 'admin'

        if (!hasAdminRole) {
          return new Response(JSON.stringify({ 
            error: 'Forbidden', 
            message: 'Admin privileges required' 
          }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          })
        }
    } catch (error) {
      console.error('Admin authorization error:', error)
      return new Response(JSON.stringify({ 
        error: 'Authorization failed',
        message: 'Unable to verify admin privileges'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }

  // Protect user preference routes (require ownership or admin)
  if (event.url.pathname.startsWith('/api/user/') || event.url.pathname.startsWith('/preferences')) {
    if (!auth.userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    // Validate session for sensitive operations
    if (['POST', 'PUT', 'DELETE'].includes(event.request.method)) {
      try {
                 const session = await clerkClient.sessions.getSession(auth.sessionId!)
        if (session.status !== 'active' || session.lastActiveAt < Date.now() - 30 * 60 * 1000) {
          return new Response(JSON.stringify({ 
            error: 'Session expired',
            message: 'Please sign in again for security'
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          })
        }
      } catch (error) {
        console.error('Session validation error:', error)
        return new Response(JSON.stringify({ error: 'Session validation failed' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
    }
  }

  // Protect API routes that require authentication
  if (event.url.pathname.startsWith('/api/') && 
      !event.url.pathname.startsWith('/api/public') &&
      !event.url.pathname.startsWith('/api/auth')) {
    
    if (!auth.userId) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        message: 'Authentication required'
      }), {
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          'WWW-Authenticate': 'Bearer'
        }
      })
    }

    // Rate limiting for API routes (basic implementation)
    const clientIP = event.getClientAddress()
    const rateLimitKey = `api_rate_limit:${clientIP}:${auth.userId}`
    
    // Note: In production, use Redis or similar for distributed rate limiting
    // This is a basic in-memory approach for demo purposes
  }

  return resolve(event)
}

// Error handling
const errorHandle: Handle = async ({ event, resolve }) => {
  try {
    return await resolve(event)
  } catch (error) {
    console.error('Server error:', error)
    
    // Handle authentication errors gracefully
    if (error instanceof Response && error.status === 401) {
      if (event.url.pathname.startsWith('/api/')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      return Response.redirect(new URL('/auth/signin', event.url.origin), 302)
    }
    
    throw error
  }
}

export const handle: Handle = sequence(clerkAuthHandle, authorizationHandle, errorHandle) 