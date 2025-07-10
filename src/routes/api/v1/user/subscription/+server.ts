// User subscription status API endpoint
// GET /api/v1/user/subscription - Get current user's subscription status

import { json, type RequestHandler } from '@sveltejs/kit';
import { createError } from '$lib/utils/errorHandler';

interface SubscriptionResponse {
  subscriptionId: string | null;
  customerId: string | null;
  status: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  priceId: string | null;
  lastPaymentStatus: string | null;
  plan: 'free' | 'pro';
  isActive: boolean;
  isTrialing: boolean;
  daysUntilTrialEnd: number | null;
}

// GET: Get user subscription status
export const GET: RequestHandler = async ({ locals, platform }) => {
  try {
    // Authenticate user
    const { auth } = locals;
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB;
    if (!db) {
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 });
    }

    try {
      // Get user's current subscription
      const subscriptionResult = await db.prepare(`
        SELECT 
          s.stripe_subscription_id,
          s.stripe_customer_id,
          s.status,
          s.current_period_start,
          s.current_period_end,
          s.cancel_at_period_end,
          s.trial_end,
          s.stripe_price_id,
          u.plan,
          u.subscription_status,
          u.trial_ends_at
        FROM users u
        LEFT JOIN subscriptions s ON u.id = s.user_id 
          AND s.status IN ('active', 'trialing', 'past_due', 'unpaid')
        WHERE u.id = ? AND u.is_active = TRUE
      `).bind(auth.userId).first();

      if (!subscriptionResult) {
        // User not found, return error
        return json({ 
          error: 'Not Found', 
          message: 'User not found' 
        }, { status: 404 });
      }

      // Get last payment status
      let lastPaymentStatus: string | null = null;
      if (subscriptionResult.stripe_subscription_id) {
        const lastPaymentResult = await db.prepare(`
          SELECT status
          FROM payments
          WHERE stripe_subscription_id = ?
          ORDER BY created_at DESC
          LIMIT 1
        `).bind(subscriptionResult.stripe_subscription_id).first();

        lastPaymentStatus = lastPaymentResult?.status as string || null;
      }

      // Calculate days until trial end
      let daysUntilTrialEnd: number | null = null;
      const trialEndDate = subscriptionResult.trial_end || subscriptionResult.trial_ends_at;
      
      if (trialEndDate && subscriptionResult.status === 'trialing') {
        const trialEnd = new Date(trialEndDate);
        const now = new Date();
        const diffTime = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        daysUntilTrialEnd = diffDays > 0 ? diffDays : 0;
      }

      // Determine if subscription is active
      const isActive = ['active', 'trialing'].includes(subscriptionResult.status || '');
      const isTrialing = subscriptionResult.status === 'trialing';

      // Build response
      const response: SubscriptionResponse = {
        subscriptionId: subscriptionResult.stripe_subscription_id || null,
        customerId: subscriptionResult.stripe_customer_id || null,
        status: subscriptionResult.status || null,
        currentPeriodStart: subscriptionResult.current_period_start || null,
        currentPeriodEnd: subscriptionResult.current_period_end || null,
        cancelAtPeriodEnd: Boolean(subscriptionResult.cancel_at_period_end),
        trialEnd: trialEndDate || null,
        priceId: subscriptionResult.stripe_price_id || null,
        lastPaymentStatus,
        plan: subscriptionResult.plan || 'free',
        isActive,
        isTrialing,
        daysUntilTrialEnd
      };

      return json(response);

    } catch (dbError) {
      console.error('Database error retrieving subscription:', dbError);
      return json({ 
        error: 'Internal Server Error', 
        message: 'Failed to retrieve subscription status' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Subscription status endpoint error:', error);
    
    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
};

// POST: Update subscription preferences (for plan changes, etc.)
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  try {
    // Authenticate user
    const { auth } = locals;
    if (!auth.userId) {
      return json({ 
        error: 'Unauthorized', 
        message: 'Authentication required' 
      }, { status: 401 });
    }

    // Parse request body
    let body: { action: string; metadata?: any };
    try {
      body = await request.json();
    } catch (e) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB;
    if (!db) {
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 });
    }

    // Handle different actions
    switch (body.action) {
      case 'cancel_subscription':
        return await handleCancelSubscription(auth.userId, db, body.metadata);
      
      case 'reactivate_subscription':
        return await handleReactivateSubscription(auth.userId, db, body.metadata);
      
      case 'update_payment_method':
        return await handleUpdatePaymentMethod(auth.userId, db, body.metadata);
      
      default:
        return json({ 
          error: 'Bad Request', 
          message: 'Invalid action specified' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Subscription update endpoint error:', error);
    
    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
};

// Handle subscription cancellation
async function handleCancelSubscription(userId: string, db: any, metadata: any) {
  try {
    // Get current subscription
    const subscription = await db.prepare(`
      SELECT stripe_subscription_id, status 
      FROM subscriptions 
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `).bind(userId).first();

    if (!subscription) {
      return json({ 
        error: 'Not Found', 
        message: 'No active subscription found' 
      }, { status: 404 });
    }

    // Note: In a real implementation, you would call Stripe API here
    // For now, we'll just update the database to mark for cancellation
    await db.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = TRUE, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).bind(subscription.stripe_subscription_id).run();

    return json({ 
      success: true, 
      message: 'Subscription will be canceled at the end of the current period' 
    });

  } catch (error) {
    console.error('Cancel subscription error:', error);
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to cancel subscription' 
    }, { status: 500 });
  }
}

// Handle subscription reactivation
async function handleReactivateSubscription(userId: string, db: any, metadata: any) {
  try {
    // Get current subscription
    const subscription = await db.prepare(`
      SELECT stripe_subscription_id, status 
      FROM subscriptions 
      WHERE user_id = ? AND status IN ('active', 'trialing')
    `).bind(userId).first();

    if (!subscription) {
      return json({ 
        error: 'Not Found', 
        message: 'No active subscription found' 
      }, { status: 404 });
    }

    // Note: In a real implementation, you would call Stripe API here
    // For now, we'll just update the database to remove cancellation
    await db.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = FALSE, updated_at = datetime('now')
      WHERE stripe_subscription_id = ?
    `).bind(subscription.stripe_subscription_id).run();

    return json({ 
      success: true, 
      message: 'Subscription reactivated successfully' 
    });

  } catch (error) {
    console.error('Reactivate subscription error:', error);
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to reactivate subscription' 
    }, { status: 500 });
  }
}

// Handle payment method update
async function handleUpdatePaymentMethod(userId: string, db: any, metadata: any) {
  try {
    // Get current subscription
    const subscription = await db.prepare(`
      SELECT stripe_subscription_id, stripe_customer_id 
      FROM subscriptions 
      WHERE user_id = ? AND status IN ('active', 'trialing', 'past_due')
    `).bind(userId).first();

    if (!subscription) {
      return json({ 
        error: 'Not Found', 
        message: 'No active subscription found' 
      }, { status: 404 });
    }

    // Note: In a real implementation, you would:
    // 1. Call Stripe API to create payment method update session
    // 2. Return the session URL for frontend redirect
    
    // For now, return a placeholder response
    return json({ 
      success: true, 
      message: 'Payment method update initiated',
      updateUrl: '/billing/update-payment-method' // Placeholder
    });

  } catch (error) {
    console.error('Update payment method error:', error);
    return json({ 
      error: 'Internal Server Error', 
      message: 'Failed to update payment method' 
    }, { status: 500 });
  }
} 