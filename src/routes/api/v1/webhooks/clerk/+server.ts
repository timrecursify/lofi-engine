import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { logger } from '$lib/utils/logger'

// Types for Clerk webhook events
interface ClerkWebhookEvent {
  type: string
  data: {
    id: string
    email_addresses: Array<{
      email_address: string
      verification?: {
        status: string
      }
    }>
    first_name?: string
    last_name?: string
    image_url?: string
    created_at: number
    updated_at: number
    primary_email_address_id?: string
  }
  object: string
  timestamp: number
}

interface ErrorResponse {
  error: string
  message: string
  code?: string
}

// POST: Handle Clerk webhook events
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    // Get webhook secret from environment
    const webhookSecret = (platform as any)?.env?.CLERK_WEBHOOK_SECRET
    if (!webhookSecret) {
      logger.error('CLERK_WEBHOOK_SECRET not found in environment', 'clerk-webhook', {
        platform: !!platform,
        env: !!(platform as any)?.env
      })
      return json({ 
        error: 'Service Configuration Error', 
        message: 'Webhook service not properly configured' 
      }, { status: 500 })
    }

    // Get the raw body for signature verification
    const body = await request.text()
    const signature = request.headers.get('svix-signature')
    
    if (!signature) {
      return json({ 
        error: 'Bad Request', 
        message: 'Missing signature header' 
      }, { status: 400 })
    }

    // Verify webhook signature
    if (!(await verifyWebhookSignature(body, signature, webhookSecret))) {
      logger.error('Invalid webhook signature', 'clerk-webhook', {
        hasSignature: !!signature,
        hasSecret: !!webhookSecret
      })
      return json({ 
        error: 'Unauthorized', 
        message: 'Invalid webhook signature' 
      }, { status: 401 })
    }

    // Parse the webhook event
    let event: ClerkWebhookEvent
    try {
      event = JSON.parse(body)
    } catch (e) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid JSON payload' 
      }, { status: 400 })
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB
    if (!db) {
      logger.error('D1 database not available', 'clerk-webhook', {
        platform: !!platform,
        env: !!(platform as any)?.env
      })
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 })
    }

    // Handle different event types
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event, db)
        break
      
      case 'user.updated':
        await handleUserUpdated(event, db)
        break
      
      case 'user.deleted':
        await handleUserDeleted(event, db)
        break
      
      default:
        logger.info(`Unhandled webhook event type: ${event.type}`, 'clerk-webhook', {
          eventType: event.type,
          userId: event.data.id
        })
        // Return success for unhandled events to avoid retries
        return json({ received: true, message: `Event type ${event.type} not handled` })
    }

    return json({ received: true, message: 'Webhook processed successfully' })

  } catch (error) {
    logger.error('Webhook processing error', 'clerk-webhook', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to process webhook' 
    }, { status: 500 })
  }
}

// Handle user creation
async function handleUserCreated(event: ClerkWebhookEvent, db: any): Promise<void> {
  const userData = event.data
  
  // Get primary email
  const primaryEmail = userData.email_addresses.find(
    email => email.email_address
  )?.email_address || ''

  // Check email verification status
  const emailVerified = userData.email_addresses.some(
    email => email.verification?.status === 'verified'
  )

  // Build full name
  const fullName = [userData.first_name, userData.last_name]
    .filter(Boolean)
    .join(' ') || null

  // Insert user into database
  await db.prepare(`
    INSERT OR REPLACE INTO users (
      id, email, clerk_id, full_name, image_url, 
      email_verified, plan, created_at, updated_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'free', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `).bind(
    userData.id,
    primaryEmail,
    userData.id,
    fullName,
    userData.image_url || null,
    emailVerified ? 1 : 0
  ).run()

  logger.info(`User created in database: ${userData.id} (${primaryEmail})`, 'clerk-webhook', {
    userId: userData.id,
    email: primaryEmail,
    emailVerified,
    hasFullName: !!fullName
  })
}

// Handle user updates
async function handleUserUpdated(event: ClerkWebhookEvent, db: any): Promise<void> {
  const userData = event.data
  
  // Get primary email
  const primaryEmail = userData.email_addresses.find(
    email => email.email_address
  )?.email_address || ''

  // Check email verification status
  const emailVerified = userData.email_addresses.some(
    email => email.verification?.status === 'verified'
  )

  // Build full name
  const fullName = [userData.first_name, userData.last_name]
    .filter(Boolean)
    .join(' ') || null

  // Update user in database
  await db.prepare(`
    UPDATE users 
    SET 
      email = ?,
      full_name = ?,
      image_url = ?,
      email_verified = ?,
      updated_at = CURRENT_TIMESTAMP
    WHERE clerk_id = ?
  `).bind(
    primaryEmail,
    fullName,
    userData.image_url || null,
    emailVerified ? 1 : 0,
    userData.id
  ).run()

  logger.info(`User updated in database: ${userData.id} (${primaryEmail})`, 'clerk-webhook', {
    userId: userData.id,
    email: primaryEmail,
    emailVerified,
    hasFullName: !!fullName
  })
}

// Handle user deletion
async function handleUserDeleted(event: ClerkWebhookEvent, db: any): Promise<void> {
  const userData = event.data

  // Instead of hard delete, we'll deactivate the user and anonymize data
  // This preserves analytics and references while respecting deletion
  await db.prepare(`
    UPDATE users 
    SET 
      email = ?,
      full_name = 'Deleted User',
      image_url = NULL,
      updated_at = CURRENT_TIMESTAMP,
      last_seen_at = CURRENT_TIMESTAMP
    WHERE clerk_id = ?
  `).bind(
    `deleted-${userData.id}@deleted.local`,
    userData.id
  ).run()

  // Also deactivate all user preferences
  await db.prepare(`
    UPDATE user_preferences 
    SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
  `).bind(userData.id).run()

  logger.info(`User soft-deleted in database: ${userData.id}`, 'clerk-webhook', {
    userId: userData.id,
    deletedEmail: `deleted-${userData.id}@deleted.local`
  })
}

// Verify Clerk webhook signature using Web Crypto API
async function verifyWebhookSignature(body: string, signature: string, secret: string): Promise<boolean> {
  try {
    // Clerk uses Svix for webhooks, which uses HMAC-SHA256
    // The signature header format is: "v1,{signature}"
    const sigParts = signature.split(',')
    if (sigParts.length !== 2 || !sigParts[0].startsWith('v1')) {
      return false
    }

    const expectedSignature = sigParts[1]
    
    // Convert secret to Uint8Array
    const secretBytes = new TextEncoder().encode(secret)
    
    // Import the key for HMAC
    const key = await crypto.subtle.importKey(
      'raw',
      secretBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    // Convert body to Uint8Array
    const bodyBytes = new TextEncoder().encode(body)
    
    // Compute HMAC signature
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, bodyBytes)
    const computedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

    // Use timing-safe comparison
    return timingSafeEqual(expectedSignature, computedSignature)
  } catch (error) {
    logger.error('Signature verification error', 'clerk-webhook', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return false
  }
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

// OPTIONS: Handle CORS preflight
export const OPTIONS: RequestHandler = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, svix-signature',
      'Access-Control-Max-Age': '86400'
    }
  })
} 