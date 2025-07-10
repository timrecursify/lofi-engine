// Environment Configuration Validator - Production-grade validation system
// Following senior engineer production development rules

import { logger, createComponentLogger } from './logger';
import { browser } from '$app/environment';
import { dev } from '$app/environment';

export enum EnvironmentType {
  DEVELOPMENT = 'development',
  STAGING = 'staging',
  PRODUCTION = 'production'
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  environment: EnvironmentType;
  score: number; // 0-100 readiness score
}

interface RequiredConfig {
  name: string;
  required: boolean;
  environments: EnvironmentType[];
  description: string;
  validator?: (value: string) => boolean;
  suggestion?: string;
}

// Comprehensive configuration requirements
const REQUIRED_CONFIGURATIONS: RequiredConfig[] = [
  // Clerk Authentication
  {
    name: 'CLERK_SECRET_KEY',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'Clerk authentication secret key',
    validator: (value) => value.startsWith('sk_'),
    suggestion: 'Set via: wrangler secret put CLERK_SECRET_KEY --env [environment]'
  },
  {
    name: 'CLERK_WEBHOOK_SECRET',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'Clerk webhook verification secret',
    validator: (value) => value.startsWith('whsec_'),
    suggestion: 'Set via: wrangler secret put CLERK_WEBHOOK_SECRET --env [environment]'
  },

  // Content Pipeline APIs
  {
    name: 'GROK_API_KEY',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'Grok API key for content script generation',
    validator: (value) => value.startsWith('xai-'),
    suggestion: 'Set via: wrangler secret put GROK_API_KEY --env [environment]'
  },
  {
    name: 'ELEVENLABS_API_KEY',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'ElevenLabs TTS API key',
    validator: (value) => value.length > 20,
    suggestion: 'Set via: wrangler secret put ELEVENLABS_API_KEY --env [environment]'
  },
  {
    name: 'ELEVENLABS_VOICE_ID',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'ElevenLabs voice ID for TTS',
    validator: (value) => value.length === 20,
    suggestion: 'Set via: wrangler secret put ELEVENLABS_VOICE_ID --env [environment]'
  },

  // Payment Processing
  {
    name: 'STRIPE_SECRET_KEY',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'Stripe payment processing secret key',
    validator: (value) => value.startsWith('sk_'),
    suggestion: 'Set via: wrangler secret put STRIPE_SECRET_KEY --env [environment]'
  },
  {
    name: 'STRIPE_WEBHOOK_SECRET',
    required: true,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'Stripe webhook endpoint secret',
    validator: (value) => value.startsWith('whsec_'),
    suggestion: 'Set via: wrangler secret put STRIPE_WEBHOOK_SECRET --env [environment]'
  },

  // Analytics & Monitoring
  {
    name: 'PUBLIC_POSTHOG_API_KEY',
    required: false,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'PostHog analytics API key',
    validator: (value) => value.startsWith('phc_'),
    suggestion: 'Configure in wrangler.toml vars section'
  },
  {
    name: 'PUBLIC_SENTRY_DSN',
    required: false,
    environments: [EnvironmentType.STAGING, EnvironmentType.PRODUCTION],
    description: 'Sentry error monitoring DSN',
    validator: (value) => value.startsWith('https://') && value.includes('@sentry.io'),
    suggestion: 'Configure in wrangler.toml vars section'
  },

  // OpenWeatherMap (Future Phase)
  {
    name: 'OPENWEATHER_API_KEY',
    required: false,
    environments: [EnvironmentType.PRODUCTION],
    description: 'OpenWeatherMap API key for weather content',
    validator: (value) => value.length === 32,
    suggestion: 'Set via: wrangler secret put OPENWEATHER_API_KEY --env production'
  },

  // Alpha Vantage (Future Phase)
  {
    name: 'ALPHA_VANTAGE_API_KEY',
    required: false,
    environments: [EnvironmentType.PRODUCTION],
    description: 'Alpha Vantage API key for market data',
    validator: (value) => value.length > 10,
    suggestion: 'Set via: wrangler secret put ALPHA_VANTAGE_API_KEY --env production'
  }
];

// Cloudflare resource requirements
const REQUIRED_RESOURCES = [
  {
    name: 'D1 Database',
    binding: 'DB',
    description: 'Primary application database',
    checkCommand: 'wrangler d1 list'
  },
  {
    name: 'KV Namespace - Clips',
    binding: 'CLIPS_KV',
    description: 'Storage for small audio clips',
    checkCommand: 'wrangler kv:namespace list'
  },
  {
    name: 'KV Namespace - Cache',
    binding: 'CACHE_KV',
    description: 'Application cache storage',
    checkCommand: 'wrangler kv:namespace list'
  },
  {
    name: 'KV Namespace - Feature Flags',
    binding: 'KV_FEATURE_FLAGS',
    description: 'Feature flag storage',
    checkCommand: 'wrangler kv:namespace list'
  },
  {
    name: 'R2 Bucket - Clips',
    binding: 'CLIPS_R2',
    description: 'Storage for large audio clips',
    checkCommand: 'wrangler r2 bucket list'
  }
];

class EnvironmentValidator {
  private componentLogger = createComponentLogger('EnvironmentValidator');
  private currentEnvironment: EnvironmentType;

  constructor() {
    this.currentEnvironment = this.detectEnvironment();
  }

  // Detect current environment
  private detectEnvironment(): EnvironmentType {
    if (dev) return EnvironmentType.DEVELOPMENT;
    
    // Check for staging indicators
    if (browser) {
      const hostname = window.location.hostname;
      if (hostname.includes('staging') || hostname.includes('dev')) {
        return EnvironmentType.STAGING;
      }
    }
    
    return EnvironmentType.PRODUCTION;
  }

  // Get environment variable (server-side)
  private getServerEnvVar(name: string, platform?: any): string | undefined {
    if (browser) return undefined;
    
    // Try platform environment first (Cloudflare)
    if (platform?.env && platform.env[name]) {
      return platform.env[name];
    }
    
    // Fallback to process environment
    return process.env[name];
  }

  // Get environment variable (client-side)
  private getClientEnvVar(name: string): string | undefined {
    if (!browser) return undefined;
    
    // Check public environment variables
    if (name.startsWith('PUBLIC_')) {
      return (window as any)[name] || import.meta.env[name];
    }
    
    return undefined;
  }

  // Validate single configuration
  private validateConfig(config: RequiredConfig, platform?: any): {
    name: string;
    value?: string;
    isValid: boolean;
    error?: string;
    warning?: string;
  } {
    const value = this.getServerEnvVar(config.name, platform) || 
                  this.getClientEnvVar(config.name);

    const result = {
      name: config.name,
      value: value ? '[REDACTED]' : undefined,
      isValid: false,
      error: undefined as string | undefined,
      warning: undefined as string | undefined
    };

    // Check if configuration is required for current environment
    if (!config.environments.includes(this.currentEnvironment)) {
      result.isValid = true;
      return result;
    }

    // Check if value exists
    if (!value || value.includes('placeholder')) {
      if (config.required) {
        result.error = `Missing required configuration: ${config.name}. ${config.suggestion}`;
      } else {
        result.warning = `Optional configuration missing: ${config.name}. ${config.suggestion}`;
        result.isValid = true;
      }
      return result;
    }

    // Validate value format
    if (config.validator && !config.validator(value)) {
      result.error = `Invalid format for ${config.name}. Expected format validation failed.`;
      return result;
    }

    result.isValid = true;
    return result;
  }

  // Validate all configurations
  async validateEnvironment(platform?: any): Promise<ValidationResult> {
    this.componentLogger.logInfo('Starting environment validation', {
      environment: this.currentEnvironment
    });

    const results = REQUIRED_CONFIGURATIONS.map(config => 
      this.validateConfig(config, platform)
    );

    const errors: string[] = [];
    const warnings: string[] = [];

    results.forEach(result => {
      if (result.error) {
        errors.push(result.error);
      }
      if (result.warning) {
        warnings.push(result.warning);
      }
    });

    // Calculate readiness score
    const totalRequired = REQUIRED_CONFIGURATIONS.filter(config => 
      config.required && config.environments.includes(this.currentEnvironment)
    ).length;
    const validRequired = results.filter(result => 
      result.isValid && !result.error
    ).length;
    
    const score = totalRequired > 0 ? Math.round((validRequired / totalRequired) * 100) : 100;

    const validationResult: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      environment: this.currentEnvironment,
      score
    };

    this.componentLogger.logInfo('Environment validation completed', {
      isValid: validationResult.isValid,
      errorCount: errors.length,
      warningCount: warnings.length,
      score
    });

    if (!validationResult.isValid) {
      this.componentLogger.logError(
        new Error('Environment validation failed'),
        {
          errors,
          environment: this.currentEnvironment
        }
      );
    }

    return validationResult;
  }

  // Generate deployment checklist
  generateDeploymentChecklist(): string[] {
    const checklist: string[] = [];
    
    checklist.push('# Deployment Checklist');
    checklist.push('');
    checklist.push('## 1. Cloudflare Resources');
    
    REQUIRED_RESOURCES.forEach(resource => {
      checklist.push(`- [ ] Create ${resource.name} (${resource.binding})`);
      checklist.push(`  Command: \`${resource.checkCommand}\``);
    });
    
    checklist.push('');
    checklist.push('## 2. Environment Secrets');
    
    const requiredConfigs = REQUIRED_CONFIGURATIONS.filter(config =>
      config.required && config.environments.includes(EnvironmentType.PRODUCTION)
    );
    
    requiredConfigs.forEach(config => {
      checklist.push(`- [ ] ${config.description}`);
      checklist.push(`  ${config.suggestion}`);
    });
    
    checklist.push('');
    checklist.push('## 3. Optional Configurations');
    
    const optionalConfigs = REQUIRED_CONFIGURATIONS.filter(config =>
      !config.required && config.environments.includes(EnvironmentType.PRODUCTION)
    );
    
    optionalConfigs.forEach(config => {
      checklist.push(`- [ ] ${config.description} (Optional)`);
      checklist.push(`  ${config.suggestion}`);
    });
    
    checklist.push('');
    checklist.push('## 4. Validation Commands');
    checklist.push('- [ ] Run environment validation: `npm run validate:env`');
    checklist.push('- [ ] Test deployment: `wrangler deploy --env staging`');
    checklist.push('- [ ] Production deployment: `wrangler deploy --env production`');
    
    return checklist;
  }

  // Check if ready for CI/CD
  async isReadyForCICD(platform?: any): Promise<{
    ready: boolean;
    blockingIssues: string[];
    recommendations: string[];
  }> {
    const validation = await this.validateEnvironment(platform);
    
    const blockingIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Critical requirements for CI/CD
    if (validation.score < 80) {
      blockingIssues.push(`Environment validation score too low: ${validation.score}%. Minimum 80% required.`);
    }
    
    if (validation.errors.length > 0) {
      blockingIssues.push(...validation.errors);
    }
    
    // Recommendations
    if (validation.warnings.length > 0) {
      recommendations.push(...validation.warnings);
    }
    
    if (this.currentEnvironment === EnvironmentType.PRODUCTION) {
      recommendations.push('Consider setting up monitoring dashboards');
      recommendations.push('Verify backup and recovery procedures');
      recommendations.push('Test rollback procedures');
    }
    
    return {
      ready: blockingIssues.length === 0,
      blockingIssues,
      recommendations
    };
  }
}

// Singleton instance
export const environmentValidator = new EnvironmentValidator();

// Convenience functions
export async function validateEnvironment(platform?: any): Promise<ValidationResult> {
  return environmentValidator.validateEnvironment(platform);
}

export async function isReadyForDeployment(platform?: any): Promise<boolean> {
  const result = await environmentValidator.isReadyForCICD(platform);
  return result.ready;
}

export function generateDeploymentChecklist(): string[] {
  return environmentValidator.generateDeploymentChecklist();
}

export default environmentValidator; 