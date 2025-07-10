// Stripe webhook handler for subscription events
// POST /api/v1/webhooks/stripe - Handles Stripe webhook events

import { json, type RequestHandler } from '@sveltejs/kit';
import Stripe from 'stripe';
import { getStripeConfig, STRIPE_ERROR_MESSAGES } from '$lib/stripe/config';
import { createError } from '$lib/utils/errorHandler';

interface WebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
    previous_attributes?: any;
  };
  created: number;
}

interface SubscriptionEventData {
  userId: string;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  status: string;
  currentPeriodStart: number;
  currentPeriodEnd: number;
  cancelAtPeriodEnd: boolean;
  metadata: Record<string, string>;
}

// POST: Handle Stripe webhook events
export const POST: RequestHandler = async ({ request, platform }) => {
  try {
    // Get webhook signature from headers
    const signature = request.headers.get('stripe-signature');
    if (!signature) {
      console.error('No Stripe signature found in webhook request');
      return json({ 
        error: 'Bad Request', 
        message: 'Missing Stripe signature' 
      }, { status: 400 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    
    // Get Stripe configuration
    const stripeConfig = getStripeConfig(platform);
    if (!stripeConfig.webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return json({ 
        error: 'Service Configuration Error', 
        message: 'Webhook handler not properly configured' 
      }, { status: 503 });
    }

    // Initialize Stripe
    const stripe = new Stripe((platform as any)?.env?.STRIPE_SECRET_KEY || '', {
      apiVersion: '2023-10-16'
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        stripeConfig.webhookSecret
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid webhook signature' 
      }, { status: 400 });
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB;
    if (!db) {
      console.error('D1 database not available for webhook processing');
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 });
    }

    // Process the webhook event
    const result = await processWebhookEvent(event, db);
    
    if (!result.success) {
      console.error('Webhook processing failed:', result.error);
      return json({ 
        error: 'Processing Error', 
        message: result.error 
      }, { status: 500 });
    }

    // Log successful webhook processing
    console.log(`Webhook processed successfully: ${event.type} (${event.id})`);
    
    return json({ 
      received: true, 
      eventType: event.type,
      eventId: event.id 
    });

  } catch (error) {
    console.error('Webhook handler error:', error);
    
    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
};

// Process different webhook event types
async function processWebhookEvent(
  event: Stripe.Event, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        return await handleSubscriptionCreated(event.data.object as Stripe.Subscription, db);
      
      case 'customer.subscription.updated':
        return await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, db);
      
      case 'customer.subscription.deleted':
        return await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, db);
      
      case 'invoice.payment_succeeded':
        return await handlePaymentSucceeded(event.data.object as Stripe.Invoice, db);
      
      case 'invoice.payment_failed':
        return await handlePaymentFailed(event.data.object as Stripe.Invoice, db);
      
      case 'customer.subscription.trial_will_end':
        return await handleTrialWillEnd(event.data.object as Stripe.Subscription, db);
      
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
        return { success: true }; // Don't fail for unhandled events
    }
  } catch (error) {
    console.error('Error processing webhook event:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Handle subscription created event
async function handleSubscriptionCreated(
  subscription: Stripe.Subscription, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriptionData = extractSubscriptionData(subscription);
    
    // Insert subscription record
    await db.prepare(`
      INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, 
        stripe_price_id, status, current_period_start, 
        current_period_end, cancel_at_period_end, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      subscriptionData.userId,
      subscriptionData.customerId,
      subscriptionData.subscriptionId,
      subscriptionData.priceId,
      subscriptionData.status,
      new Date(subscriptionData.currentPeriodStart * 1000).toISOString(),
      new Date(subscriptionData.currentPeriodEnd * 1000).toISOString(),
      subscriptionData.cancelAtPeriodEnd ? 1 : 0,
      JSON.stringify(subscriptionData.metadata),
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    // Update user plan to pro
    await db.prepare(`
      UPDATE users 
      SET plan = 'pro', updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), subscriptionData.userId).run();

    console.log(`Subscription created for user: ${subscriptionData.userId}`);
    return { success: true };

  } catch (error) {
    console.error('Error handling subscription created:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error' 
    };
  }
}

// Handle subscription updated event
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriptionData = extractSubscriptionData(subscription);
    
    // Update subscription record
    await db.prepare(`
      UPDATE subscriptions 
      SET 
        status = ?, 
        current_period_start = ?, 
        current_period_end = ?, 
        cancel_at_period_end = ?, 
        metadata = ?,
        updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(
      subscriptionData.status,
      new Date(subscriptionData.currentPeriodStart * 1000).toISOString(),
      new Date(subscriptionData.currentPeriodEnd * 1000).toISOString(),
      subscriptionData.cancelAtPeriodEnd ? 1 : 0,
      JSON.stringify(subscriptionData.metadata),
      new Date().toISOString(),
      subscriptionData.subscriptionId
    ).run();

    // Update user plan based on subscription status
    const newPlan = ['active', 'trialing'].includes(subscriptionData.status) ? 'pro' : 'free';
    await db.prepare(`
      UPDATE users 
      SET plan = ?, updated_at = ?
      WHERE id = ?
    `).bind(newPlan, new Date().toISOString(), subscriptionData.userId).run();

    console.log(`Subscription updated for user: ${subscriptionData.userId}, status: ${subscriptionData.status}`);
    return { success: true };

  } catch (error) {
    console.error('Error handling subscription updated:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error' 
    };
  }
}

// Handle subscription deleted event
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriptionData = extractSubscriptionData(subscription);
    
    // Update subscription status to canceled
    await db.prepare(`
      UPDATE subscriptions 
      SET status = 'canceled', updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(new Date().toISOString(), subscriptionData.subscriptionId).run();

    // Downgrade user to free plan
    await db.prepare(`
      UPDATE users 
      SET plan = 'free', updated_at = ?
      WHERE id = ?
    `).bind(new Date().toISOString(), subscriptionData.userId).run();

    console.log(`Subscription canceled for user: ${subscriptionData.userId}`);
    return { success: true };

  } catch (error) {
    console.error('Error handling subscription deleted:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error' 
    };
  }
}

// Handle payment succeeded event
async function handlePaymentSucceeded(
  invoice: Stripe.Invoice, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!invoice.subscription) {
      return { success: true }; // Not a subscription payment
    }

    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;

    // Update payment record
    await db.prepare(`
      INSERT INTO payments (
        stripe_invoice_id, stripe_subscription_id, amount, 
        currency, status, stripe_charge_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      invoice.id,
      subscriptionId,
      invoice.amount_paid,
      invoice.currency,
      'succeeded',
      invoice.charge || null,
      new Date().toISOString()
    ).run();

    console.log(`Payment succeeded for invoice: ${invoice.id}`);
    return { success: true };

  } catch (error) {
    console.error('Error handling payment succeeded:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error' 
    };
  }
}

// Handle payment failed event
async function handlePaymentFailed(
  invoice: Stripe.Invoice, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!invoice.subscription) {
      return { success: true }; // Not a subscription payment
    }

    const subscriptionId = typeof invoice.subscription === 'string' 
      ? invoice.subscription 
      : invoice.subscription.id;

    // Update payment record
    await db.prepare(`
      INSERT INTO payments (
        stripe_invoice_id, stripe_subscription_id, amount, 
        currency, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      invoice.id,
      subscriptionId,
      invoice.amount_due,
      invoice.currency,
      'failed',
      new Date().toISOString()
    ).run();

    console.log(`Payment failed for invoice: ${invoice.id}`);
    return { success: true };

  } catch (error) {
    console.error('Error handling payment failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error' 
    };
  }
}

// Handle trial will end event
async function handleTrialWillEnd(
  subscription: Stripe.Subscription, 
  db: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const subscriptionData = extractSubscriptionData(subscription);
    
    // Log trial ending (could send notification email here)
    console.log(`Trial will end for user: ${subscriptionData.userId}`);
    
    // Could implement notification logic here
    // await sendTrialEndingNotification(subscriptionData.userId);
    
    return { success: true };

  } catch (error) {
    console.error('Error handling trial will end:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing error' 
    };
  }
}

// Extract subscription data from Stripe object
function extractSubscriptionData(subscription: Stripe.Subscription): SubscriptionEventData {
  const userId = subscription.metadata.userId;
  
  if (!userId) {
    throw new Error('User ID not found in subscription metadata');
  }

  return {
    userId,
    customerId: subscription.customer as string,
    subscriptionId: subscription.id,
    priceId: subscription.items.data[0]?.price.id || '',
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start,
    currentPeriodEnd: subscription.current_period_end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    metadata: subscription.metadata
  };
} 