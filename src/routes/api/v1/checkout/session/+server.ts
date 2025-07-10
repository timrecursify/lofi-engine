// Stripe checkout session creation endpoint
// POST /api/v1/checkout/session - Creates Stripe checkout session for subscription

import { json, type RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';
import { getStripeConfig, validateStripeConfig, STRIPE_ERROR_MESSAGES } from '$lib/stripe/config';
import { createError } from '$lib/utils/errorHandler';

interface CheckoutSessionRequest {
  priceId?: string;
  successUrl: string;
  cancelUrl: string;
  allowPromotionCodes?: boolean;
  metadata?: Record<string, string>;
}

interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
  publishableKey: string;
}

// POST: Create Stripe checkout session
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    // Authenticate user
    const { auth } = locals;
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'Authentication required to create checkout session' 
      }, { status: 401 });
    }

    // Get and validate Stripe configuration
    const stripeConfig = getStripeConfig(platform);
    const configValidation = validateStripeConfig(stripeConfig);
    
    if (!configValidation.isValid) {
      console.error('Stripe configuration invalid:', configValidation.errors);
      return json({ 
        error: 'Service Configuration Error', 
        message: 'Payment service temporarily unavailable' 
      }, { status: 503 });
    }

    // Initialize Stripe with secret key
    const stripe = new Stripe((platform as any)?.env?.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });

    // Parse request body
    let body: CheckoutSessionRequest;
    try {
      body = await request.json();
    } catch (e) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    // Validate required fields
    if (!body.successUrl || !body.cancelUrl) {
      return json({ 
        error: 'Bad Request', 
        message: 'successUrl and cancelUrl are required' 
      }, { status: 400 });
    }

    // Use provided price ID or default to Pro plan
    const priceId = body.priceId || stripeConfig.proPriceId;
    
    if (!priceId) {
      return json({ 
        error: 'Service Configuration Error', 
        message: 'No price ID configured for Pro plan' 
      }, { status: 503 });
    }

    // Get D1 database for user validation
    const db = (platform as any)?.env?.DB;
    let userEmail = auth.user?.email;
    
    if (db && auth.userId) {
      try {
        // Get user data from database
        const userResult = await db.prepare(`
          SELECT email, plan, stripe_customer_id 
          FROM users 
          WHERE id = ? AND is_active = TRUE
        `).bind(auth.userId).first();

        if (userResult) {
          userEmail = userResult.email as string;
          
          // Check if user already has Pro plan
          if (userResult.plan === 'pro') {
            return json({ 
              error: 'Bad Request', 
              message: 'User already has Pro plan' 
            }, { status: 400 });
          }
        }
      } catch (dbError) {
        console.error('Database error during checkout:', dbError);
        // Continue with checkout even if DB fails
      }
    }

    // Create checkout session
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: body.successUrl,
      cancel_url: body.cancelUrl,
      customer_email: userEmail,
      client_reference_id: auth.userId,
      allow_promotion_codes: body.allowPromotionCodes ?? true,
      billing_address_collection: 'auto',
      metadata: {
        userId: auth.userId,
        environment: stripeConfig.environment,
        ...body.metadata
      },
      subscription_data: {
        metadata: {
          userId: auth.userId,
          plan: 'pro',
          source: 'web_checkout'
        }
      }
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (!session.id || !session.url) {
      console.error('Stripe session creation failed:', session);
      return json({ 
        error: 'Payment Service Error', 
        message: STRIPE_ERROR_MESSAGES.PROCESSING_ERROR 
      }, { status: 500 });
    }

    // Log successful checkout session creation
    console.log(`Checkout session created: ${session.id} for user: ${auth.userId}`);

    return json({
      sessionId: session.id,
      url: session.url,
      publishableKey: stripeConfig.publishableKey
    });

  } catch (error) {
    console.error('Checkout session creation error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      const errorMessage = error.type === 'StripeInvalidRequestError' 
        ? STRIPE_ERROR_MESSAGES.PROCESSING_ERROR
        : STRIPE_ERROR_MESSAGES.GENERIC_ERROR;
        
      return json({ 
        error: 'Payment Service Error', 
        message: errorMessage 
      }, { status: 500 });
    }

    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
};

// GET: Get checkout session details
export const GET: RequestHandler = async ({ url, locals, platform }) => {
  try {
    // Authenticate user
    const { auth } = locals;
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) {
      return json({ 
        error: 'Bad Request', 
        message: 'session_id parameter is required' 
      }, { status: 400 });
    }

    // Get Stripe configuration
    const stripeConfig = getStripeConfig(platform);
    const stripe = new Stripe((platform as any)?.env?.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });

    // Retrieve session details
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Verify session belongs to authenticated user
    if (session.client_reference_id !== auth.userId) {
      return json({ 
        error: 'Forbidden', 
        message: 'Access denied to this checkout session' 
      }, { status: 403 });
    }

    return json({
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerEmail: session.customer_email,
      amountTotal: session.amount_total,
      currency: session.currency,
      metadata: session.metadata
    });

  } catch (error) {
    console.error('Checkout session retrieval error:', error);
    
    if (error instanceof Stripe.errors.StripeError) {
      return json({ 
        error: 'Payment Service Error', 
        message: STRIPE_ERROR_MESSAGES.GENERIC_ERROR 
      }, { status: 500 });
    }

    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
}; 