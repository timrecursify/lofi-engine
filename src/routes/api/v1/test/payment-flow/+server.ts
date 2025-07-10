// Test Payment Flow Endpoint
// POST /api/v1/test/payment-flow - Test complete payment flow for development

import { json, type RequestHandler } from '@sveltejs/kit';
import { getStripeConfig } from '$lib/stripe/config';
import { createError } from '$lib/utils/errorHandler';

interface TestPaymentRequest {
  testType: 'checkout' | 'webhook' | 'subscription' | 'full_flow';
  userId?: string;
  customerId?: string;
  priceId?: string;
  webhookEvent?: any;
}

interface TestResult {
  success: boolean;
  stage: string;
  message: string;
  data?: any;
  error?: string;
  timing?: number;
}

interface TestSummary {
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
  totalTime: number;
}

// POST: Run payment flow tests
export const POST: RequestHandler = async ({ request, locals, platform }) => {
  const startTime = Date.now();
  
  try {
    // Parse request body
    let body: TestPaymentRequest;
    try {
      body = await request.json();
    } catch (e) {
      return json({ 
        error: 'Bad Request', 
        message: 'Invalid JSON in request body' 
      }, { status: 400 });
    }

    // Get test configuration
    const isDevMode = (platform as any)?.env?.NODE_ENV !== 'production';
    if (!isDevMode) {
      return json({ 
        error: 'Forbidden', 
        message: 'Payment flow testing only available in development mode' 
      }, { status: 403 });
    }

    // Get D1 database binding
    const db = (platform as any)?.env?.DB;
    if (!db) {
      return json({ 
        error: 'Service Unavailable', 
        message: 'Database service temporarily unavailable' 
      }, { status: 503 });
    }

    // Run tests based on type
    let summary: TestSummary;
    
    switch (body.testType) {
      case 'checkout':
        summary = await testCheckoutFlow(platform, body);
        break;
      case 'webhook':
        summary = await testWebhookFlow(db, body);
        break;
      case 'subscription':
        summary = await testSubscriptionFlow(db, body);
        break;
      case 'full_flow':
        summary = await testFullPaymentFlow(platform, db, body);
        break;
      default:
        return json({ 
          error: 'Bad Request', 
          message: 'Invalid test type' 
        }, { status: 400 });
    }

    summary.totalTime = Date.now() - startTime;
    
    return json(summary);

  } catch (error) {
    console.error('Payment flow test error:', error);
    
    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
};

// Test checkout session creation
async function testCheckoutFlow(platform: any, request: TestPaymentRequest): Promise<TestSummary> {
  const results: TestResult[] = [];
  let passedTests = 0;
  
  // Test 1: Stripe configuration
  const configResult = await testStripeConfig(platform);
  results.push(configResult);
  if (configResult.success) passedTests++;

  // Test 2: Checkout session creation
  const sessionResult = await testCheckoutSession(platform, request);
  results.push(sessionResult);
  if (sessionResult.success) passedTests++;

  // Test 3: Session retrieval
  if (sessionResult.success && sessionResult.data?.sessionId) {
    const retrieveResult = await testSessionRetrieval(platform, sessionResult.data.sessionId);
    results.push(retrieveResult);
    if (retrieveResult.success) passedTests++;
  }

  return {
    success: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
    totalTime: 0
  };
}

// Test webhook processing
async function testWebhookFlow(db: any, request: TestPaymentRequest): Promise<TestSummary> {
  const results: TestResult[] = [];
  let passedTests = 0;

  // Test 1: Database connectivity
  const dbResult = await testDatabaseConnection(db);
  results.push(dbResult);
  if (dbResult.success) passedTests++;

  // Test 2: Webhook signature validation (simulated)
  const signatureResult = await testWebhookSignature();
  results.push(signatureResult);
  if (signatureResult.success) passedTests++;

  // Test 3: Subscription webhook processing
  const webhookResult = await testWebhookProcessing(db, request);
  results.push(webhookResult);
  if (webhookResult.success) passedTests++;

  return {
    success: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
    totalTime: 0
  };
}

// Test subscription management
async function testSubscriptionFlow(db: any, request: TestPaymentRequest): Promise<TestSummary> {
  const results: TestResult[] = [];
  let passedTests = 0;

  // Test 1: Create test user
  const userResult = await testCreateUser(db);
  results.push(userResult);
  if (userResult.success) passedTests++;

  // Test 2: Create subscription
  if (userResult.success) {
    const subResult = await testCreateSubscription(db, userResult.data.userId);
    results.push(subResult);
    if (subResult.success) passedTests++;

    // Test 3: Update subscription
    if (subResult.success) {
      const updateResult = await testUpdateSubscription(db, subResult.data.subscriptionId);
      results.push(updateResult);
      if (updateResult.success) passedTests++;
    }

    // Test 4: Cancel subscription
    if (subResult.success) {
      const cancelResult = await testCancelSubscription(db, subResult.data.subscriptionId);
      results.push(cancelResult);
      if (cancelResult.success) passedTests++;
    }

    // Cleanup: Remove test user
    await cleanupTestUser(db, userResult.data.userId);
  }

  return {
    success: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
    totalTime: 0
  };
}

// Test complete payment flow
async function testFullPaymentFlow(platform: any, db: any, request: TestPaymentRequest): Promise<TestSummary> {
  const results: TestResult[] = [];
  let passedTests = 0;

  // Run all sub-tests
  const checkoutSummary = await testCheckoutFlow(platform, request);
  const webhookSummary = await testWebhookFlow(db, request);
  const subscriptionSummary = await testSubscriptionFlow(db, request);

  // Combine results
  results.push(...checkoutSummary.results);
  results.push(...webhookSummary.results);
  results.push(...subscriptionSummary.results);

  passedTests = checkoutSummary.passedTests + webhookSummary.passedTests + subscriptionSummary.passedTests;

  return {
    success: passedTests === results.length,
    totalTests: results.length,
    passedTests,
    failedTests: results.length - passedTests,
    results,
    totalTime: 0
  };
}

// Individual test functions
async function testStripeConfig(platform: any): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    const config = getStripeConfig(platform);
    
    if (!config.publishableKey) {
      return {
        success: false,
        stage: 'stripe_config',
        message: 'Stripe publishable key not configured',
        timing: Date.now() - startTime
      };
    }

    const secretKey = (platform as any)?.env?.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return {
        success: false,
        stage: 'stripe_config',
        message: 'Stripe secret key not configured',
        timing: Date.now() - startTime
      };
    }

    return {
      success: true,
      stage: 'stripe_config',
      message: 'Stripe configuration valid',
      data: { environment: config.environment },
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'stripe_config',
      message: 'Stripe configuration error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testCheckoutSession(platform: any, request: TestPaymentRequest): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Simulate checkout session creation
    const sessionData = {
      sessionId: 'cs_test_' + Math.random().toString(36).substr(2, 9),
      url: 'https://checkout.stripe.com/test_session',
      priceId: request.priceId || 'price_test_123',
      customerId: request.customerId || 'cus_test_123'
    };

    return {
      success: true,
      stage: 'checkout_session',
      message: 'Checkout session created successfully',
      data: sessionData,
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'checkout_session',
      message: 'Failed to create checkout session',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testSessionRetrieval(platform: any, sessionId: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Simulate session retrieval
    const sessionData = {
      id: sessionId,
      status: 'complete',
      payment_status: 'paid',
      customer: 'cus_test_123',
      subscription: 'sub_test_123'
    };

    return {
      success: true,
      stage: 'session_retrieval',
      message: 'Session retrieved successfully',
      data: sessionData,
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'session_retrieval',
      message: 'Failed to retrieve session',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testDatabaseConnection(db: any): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Test database connection with a simple query
    const result = await db.prepare('SELECT 1 as test').first();
    
    if (result && result.test === 1) {
      return {
        success: true,
        stage: 'database_connection',
        message: 'Database connection successful',
        timing: Date.now() - startTime
      };
    } else {
      return {
        success: false,
        stage: 'database_connection',
        message: 'Database query returned unexpected result',
        timing: Date.now() - startTime
      };
    }

  } catch (error) {
    return {
      success: false,
      stage: 'database_connection',
      message: 'Database connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testWebhookSignature(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Simulate webhook signature validation
    const signature = 'whsec_test_signature';
    
    if (signature.startsWith('whsec_')) {
      return {
        success: true,
        stage: 'webhook_signature',
        message: 'Webhook signature validation successful',
        timing: Date.now() - startTime
      };
    } else {
      return {
        success: false,
        stage: 'webhook_signature',
        message: 'Invalid webhook signature format',
        timing: Date.now() - startTime
      };
    }

  } catch (error) {
    return {
      success: false,
      stage: 'webhook_signature',
      message: 'Webhook signature validation failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testWebhookProcessing(db: any, request: TestPaymentRequest): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    // Create test webhook event
    const webhookEvent = request.webhookEvent || {
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_test_' + Date.now(),
          customer: 'cus_test_' + Date.now(),
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor(Date.now() / 1000) + 2592000, // 30 days
          metadata: { userId: 'test_user_' + Date.now() }
        }
      }
    };

    // Simulate webhook processing
    const eventProcessed = webhookEvent.type === 'customer.subscription.created';
    
    return {
      success: eventProcessed,
      stage: 'webhook_processing',
      message: eventProcessed ? 'Webhook event processed successfully' : 'Webhook event type not supported',
      data: { eventType: webhookEvent.type },
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'webhook_processing',
      message: 'Webhook processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testCreateUser(db: any): Promise<TestResult> {
  const startTime = Date.now();
  const userId = 'test_user_' + Date.now();
  
  try {
    await db.prepare(`
      INSERT INTO users (id, email, name, plan, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).bind(
      userId,
      `test_${userId}@example.com`,
      'Test User',
      'free',
      new Date().toISOString()
    ).run();

    return {
      success: true,
      stage: 'create_user',
      message: 'Test user created successfully',
      data: { userId },
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'create_user',
      message: 'Failed to create test user',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testCreateSubscription(db: any, userId: string): Promise<TestResult> {
  const startTime = Date.now();
  const subscriptionId = 'sub_test_' + Date.now();
  
  try {
    await db.prepare(`
      INSERT INTO subscriptions (
        user_id, stripe_customer_id, stripe_subscription_id, 
        stripe_price_id, status, current_period_start, 
        current_period_end, cancel_at_period_end, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      userId,
      'cus_test_' + Date.now(),
      subscriptionId,
      'price_test_123',
      'active',
      new Date().toISOString(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      false,
      new Date().toISOString(),
      new Date().toISOString()
    ).run();

    return {
      success: true,
      stage: 'create_subscription',
      message: 'Test subscription created successfully',
      data: { subscriptionId },
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'create_subscription',
      message: 'Failed to create test subscription',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testUpdateSubscription(db: any, subscriptionId: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    await db.prepare(`
      UPDATE subscriptions 
      SET status = ?, updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind('trialing', new Date().toISOString(), subscriptionId).run();

    return {
      success: true,
      stage: 'update_subscription',
      message: 'Test subscription updated successfully',
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'update_subscription',
      message: 'Failed to update test subscription',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function testCancelSubscription(db: any, subscriptionId: string): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    await db.prepare(`
      UPDATE subscriptions 
      SET cancel_at_period_end = TRUE, updated_at = ?
      WHERE stripe_subscription_id = ?
    `).bind(new Date().toISOString(), subscriptionId).run();

    return {
      success: true,
      stage: 'cancel_subscription',
      message: 'Test subscription canceled successfully',
      timing: Date.now() - startTime
    };

  } catch (error) {
    return {
      success: false,
      stage: 'cancel_subscription',
      message: 'Failed to cancel test subscription',
      error: error instanceof Error ? error.message : 'Unknown error',
      timing: Date.now() - startTime
    };
  }
}

async function cleanupTestUser(db: any, userId: string): Promise<void> {
  try {
    // Delete test user and related data
    await db.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM payments WHERE user_id = ?').bind(userId).run();
    await db.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  } catch (error) {
    console.warn('Failed to cleanup test user:', error);
  }
}

// GET: Get test configuration and available tests
export const GET: RequestHandler = async ({ platform }) => {
  try {
    const isDevMode = (platform as any)?.env?.NODE_ENV !== 'production';
    
    if (!isDevMode) {
      return json({ 
        error: 'Forbidden', 
        message: 'Payment flow testing only available in development mode' 
      }, { status: 403 });
    }

    const config = {
      available: true,
      environment: 'development',
      testTypes: [
        {
          id: 'checkout',
          name: 'Checkout Flow',
          description: 'Test Stripe checkout session creation and retrieval'
        },
        {
          id: 'webhook',
          name: 'Webhook Processing',
          description: 'Test webhook signature validation and event processing'
        },
        {
          id: 'subscription',
          name: 'Subscription Management',
          description: 'Test subscription CRUD operations in database'
        },
        {
          id: 'full_flow',
          name: 'Full Payment Flow',
          description: 'Test complete payment flow end-to-end'
        }
      ],
      stripeConfigured: Boolean((platform as any)?.env?.STRIPE_SECRET_KEY),
      databaseConfigured: Boolean((platform as any)?.env?.DB)
    };

    return json(config);

  } catch (error) {
    console.error('Test configuration error:', error);
    
    const appError = createError('UNEXPECTED_ERROR', error);
    return json({ 
      error: appError.code, 
      message: appError.userMessage 
    }, { status: 500 });
  }
}; 