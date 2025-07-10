// Stripe configuration and product management
// Production-safe configuration for payments and subscriptions

export interface StripeConfig {
  publishableKey: string;
  proPriceId: string;
  webhookSecret: string;
  environment: 'development' | 'staging' | 'production';
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  prices: StripePrice[];
  features: string[];
  metadata: Record<string, string>;
}

export interface StripePrice {
  id: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  nickname: string;
  metadata: Record<string, string>;
}

// Pro plan configuration
export const PRO_PLAN_FEATURES = [
  'Unlimited listening hours',
  'Ad-free experience',
  'Priority content updates',
  'Custom voice preferences',
  'Offline listening (60 min cache)',
  'Advanced scene customization',
  'Early access to new features',
  'Premium support'
];

// Stripe product configuration
export const STRIPE_PRODUCTS: Record<string, StripeProduct> = {
  pro: {
    id: 'prod_pro_plan',
    name: 'ChillCast Pro',
    description: 'Premium lo-fi radio experience with unlimited features',
    features: PRO_PLAN_FEATURES,
    metadata: {
      plan: 'pro',
      tier: 'premium',
      billingType: 'subscription'
    },
    prices: [
      {
        id: 'price_pro_monthly',
        amount: 999, // $9.99
        currency: 'usd',
        interval: 'month',
        intervalCount: 1,
        nickname: 'Pro Monthly',
        metadata: {
          plan: 'pro',
          interval: 'monthly'
        }
      },
      {
        id: 'price_pro_yearly',
        amount: 9999, // $99.99 (17% discount)
        currency: 'usd',
        interval: 'year',
        intervalCount: 1,
        nickname: 'Pro Yearly',
        metadata: {
          plan: 'pro',
          interval: 'yearly',
          discount: '17'
        }
      }
    ]
  }
};

// Get environment-specific Stripe configuration
export function getStripeConfig(platform: any): StripeConfig {
  const env = platform?.env;
  const environment = env?.ENVIRONMENT || 'development';
  
  let publishableKey: string;
  let proPriceId: string;
  
  switch (environment) {
    case 'production':
      publishableKey = env?.STRIPE_PUBLISHABLE_KEY_PRODUCTION || '';
      proPriceId = env?.STRIPE_PRO_PRICE_ID_PRODUCTION || '';
      break;
    case 'staging':
      publishableKey = env?.STRIPE_PUBLISHABLE_KEY_STAGING || '';
      proPriceId = env?.STRIPE_PRO_PRICE_ID_STAGING || '';
      break;
    default:
      publishableKey = env?.STRIPE_PUBLISHABLE_KEY_DEV || '';
      proPriceId = env?.STRIPE_PRO_PRICE_ID_DEV || '';
  }
  
  return {
    publishableKey,
    proPriceId,
    webhookSecret: env?.STRIPE_WEBHOOK_SECRET || '',
    environment: environment as 'development' | 'staging' | 'production'
  };
}

// Validate Stripe configuration
export function validateStripeConfig(config: StripeConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (!config.publishableKey) {
    errors.push('Stripe publishable key is required');
  }
  
  if (!config.proPriceId) {
    errors.push('Stripe Pro price ID is required');
  }
  
  if (!config.webhookSecret) {
    errors.push('Stripe webhook secret is required');
  }
  
  if (!config.publishableKey.startsWith('pk_')) {
    errors.push('Invalid Stripe publishable key format');
  }
  
  if (config.environment === 'production' && config.publishableKey.includes('test')) {
    errors.push('Test keys should not be used in production');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

// Format price for display
export function formatPrice(amount: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2
  }).format(amount / 100);
}

// Calculate discount percentage
export function calculateDiscount(monthlyAmount: number, yearlyAmount: number): number {
  const yearlyMonthly = yearlyAmount / 12;
  const discount = ((monthlyAmount - yearlyMonthly) / monthlyAmount) * 100;
  return Math.round(discount);
}

// Get plan features for display
export function getPlanFeatures(planId: string): string[] {
  const product = STRIPE_PRODUCTS[planId];
  return product?.features || [];
}

// Environment-specific error messages
export const STRIPE_ERROR_MESSAGES = {
  INVALID_CARD: 'Your card was declined. Please try a different payment method.',
  INSUFFICIENT_FUNDS: 'Your card has insufficient funds. Please try a different payment method.',
  EXPIRED_CARD: 'Your card has expired. Please try a different payment method.',
  INCORRECT_CVC: 'Your card\'s security code is incorrect. Please try again.',
  PROCESSING_ERROR: 'There was an error processing your payment. Please try again.',
  NETWORK_ERROR: 'Connection error. Please check your internet connection and try again.',
  SUBSCRIPTION_INACTIVE: 'Your subscription is not active. Please update your payment method.',
  SUBSCRIPTION_CANCELLED: 'Your subscription has been cancelled.',
  GENERIC_ERROR: 'An unexpected error occurred. Please try again or contact support.'
}; 