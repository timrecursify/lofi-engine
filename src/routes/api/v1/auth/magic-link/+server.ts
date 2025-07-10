import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createClerkClient } from '@clerk/backend'

// Types for magic-link requests
interface MagicLinkRequest {
  email: string
  redirectUrl?: string
}

interface MagicLinkResponse {
  success: boolean
  message: string
  id?: string
}

interface ErrorResponse {
  error: string
  message: string
  code?: string
}

// POST: Create magic-link and send email
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    // Get Clerk secret from environment
    const clerkSecret = (platform as any)?.env?.CLERK_SECRET_KEY
    if (!clerkSecret) {
      console.error('CLERK_SECRET_KEY not found in environment')
      return json({ 
        error: 'Service Configuration Error', 
        message: 'Authentication service not properly configured' 
      }, { status: 500 })
    }

    // Parse request body
    let body: MagicLinkRequest
    try {
      body = await request.json()
    } catch (e) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid JSON in request body' 
      }, { status: 400 })
    }

    // Validate email
    if (!body.email || !isValidEmail(body.email)) {
      return json({ 
        error: 'Bad Request', 
        message: 'Valid email address is required' 
      }, { status: 400 })
    }

    // Create Clerk client
    const clerk = createClerkClient({
      secretKey: clerkSecret,
      apiUrl: 'https://api.clerk.dev',
      apiVersion: 'v1'
    })

    // Create magic-link invitation
    try {
      const invitation = await clerk.invitations.createInvitation({
        emailAddress: body.email,
        redirectUrl: body.redirectUrl || `${request.url.split('/api')[0]}/auth/callback`,
        notify: true, // Send email
        ignoreExisting: true // Don't fail if user already exists
      })

      return json({
        success: true,
        message: 'Magic link sent successfully',
        id: invitation.id
      })

    } catch (clerkError: any) {
      console.error('Clerk API error:', clerkError)
      
      // Handle specific Clerk errors
      if (clerkError.status === 422) {
        return json({ 
          error: 'Invalid Request', 
          message: 'Invalid email address or parameters' 
        }, { status: 400 })
      }
      
      if (clerkError.status === 429) {
        return json({ 
          error: 'Too Many Requests', 
          message: 'Please wait before requesting another magic link' 
        }, { status: 429 })
      }

      return json({ 
        error: 'Authentication Service Error', 
        message: 'Failed to send magic link' 
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Magic-link route error:', error)
    return json({ 
      error: 'Internal Server Error', 
      message: 'An unexpected error occurred' 
    }, { status: 500 })
  }
}

// Helper function to validate email format
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// OPTIONS: Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    }
  })
} 