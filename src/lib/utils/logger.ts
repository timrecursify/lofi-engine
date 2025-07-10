// Centralized Logger Utility - Production-grade logging for SvelteKit
// Following senior engineer production development rules

import { browser } from '$app/environment';
import { dev } from '$app/environment';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  environment: string;
  component: string;
  userId?: string;
  sessionId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
}

interface ExternalLogService {
  sendLog(entry: LogEntry): void;
}

class Logger {
  private levels: LogLevel[] = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
  private currentLevel: LogLevel;
  private externalServices: ExternalLogService[] = [];
  private isProduction: boolean;

  constructor() {
    this.isProduction = !dev;
    this.currentLevel = this.isProduction ? LogLevel.WARN : LogLevel.DEBUG;
  }

  private shouldLog(level: LogLevel): boolean {
    const currentIndex = this.levels.indexOf(this.currentLevel);
    const messageIndex = this.levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    component: string,
    metadata: Record<string, any> = {}
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: dev ? 'development' : 'production',
      component,
      correlationId: metadata.correlationId || this.generateCorrelationId(),
      metadata: this.sanitizeMetadata(metadata)
    };
  }

  private generateCorrelationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sensitiveKeys = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...metadata };

    for (const key in sanitized) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private outputToConsole(entry: LogEntry): void {
    if (!browser) return;

    const consoleMethod = console[entry.level] || console.log;
    const prefix = `[${entry.level.toUpperCase()}] ${entry.timestamp} [${entry.component}]`;
    
    consoleMethod(
      `${prefix}: ${entry.message}`,
      entry.metadata
    );
  }

  private sendToExternalServices(entry: LogEntry): void {
    if (!this.isProduction || !browser) return;

    this.externalServices.forEach(service => {
      try {
        service.sendLog(entry);
      } catch (error) {
        // Fallback to console if external service fails
        console.error('Failed to send log to external service:', error);
      }
    });
  }

  public addExternalService(service: ExternalLogService): void {
    this.externalServices.push(service);
  }

  public log(
    level: LogLevel,
    message: string,
    component: string,
    metadata: Record<string, any> = {}
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, component, metadata);
    
    this.outputToConsole(entry);
    this.sendToExternalServices(entry);
  }

  public debug(message: string, component: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.DEBUG, message, component, metadata);
  }

  public info(message: string, component: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.INFO, message, component, metadata);
  }

  public warn(message: string, component: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.WARN, message, component, metadata);
  }

  public error(message: string, component: string, metadata: Record<string, any> = {}): void {
    this.log(LogLevel.ERROR, message, component, metadata);
  }

  public setLogLevel(level: LogLevel): void {
    this.currentLevel = level;
  }
}

// Singleton instance
export const logger = new Logger();

// Component logging hook for Svelte components
export function createComponentLogger(componentName: string) {
  return {
    mounted: () => {
      logger.debug(`${componentName} mounted`, componentName);
    },
    
    unmounted: () => {
      logger.debug(`${componentName} unmounted`, componentName);
    },
    
    logUserAction: (action: string, metadata: Record<string, any> = {}) => {
      logger.info(`User action: ${action}`, componentName, { action, ...metadata });
    },
    
    logError: (error: Error | string, context: Record<string, any> = {}) => {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;
      
      logger.error(
        `Error in ${componentName}: ${errorMessage}`,
        componentName,
        { error: errorMessage, stack: errorStack, ...context }
      );
    },
    
    logInfo: (message: string, metadata: Record<string, any> = {}) => {
      logger.info(`${componentName}: ${message}`, componentName, metadata);
    },
    
    logWarning: (message: string, metadata: Record<string, any> = {}) => {
      logger.warn(`${componentName}: ${message}`, componentName, metadata);
    }
  };
}

// API call logging utility
export function logAPICall(
  endpoint: string,
  method: string,
  component: string,
  metadata: Record<string, any> = {}
) {
  const startTime = Date.now();
  const correlationId = logger['generateCorrelationId']();
  
  logger.info(
    `API call initiated: ${method} ${endpoint}`,
    component,
    { endpoint, method, correlationId, ...metadata }
  );
  
  return {
    success: (response: any, statusCode?: number) => {
      const duration = Date.now() - startTime;
      logger.info(
        `API call successful: ${method} ${endpoint}`,
        component,
        { endpoint, method, statusCode, duration, correlationId }
      );
    },
    
    error: (error: Error | string, statusCode?: number) => {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : error;
      
      logger.error(
        `API call failed: ${method} ${endpoint}`,
        component,
        { endpoint, method, statusCode, duration, error: errorMessage, correlationId }
      );
    }
  };
}

// Form logging utility
export function logFormSubmission(
  formName: string,
  component: string,
  metadata: Record<string, any> = {}
) {
  return {
    attempt: (formData: Record<string, any>) => {
      const sanitizedData = logger['sanitizeMetadata'](formData);
      logger.info(
        `Form submission attempt: ${formName}`,
        component,
        { formName, data: sanitizedData, ...metadata }
      );
    },
    
    success: (result: any) => {
      logger.info(
        `Form submission successful: ${formName}`,
        component,
        { formName, result, ...metadata }
      );
    },
    
    validationError: (errors: Record<string, string>) => {
      logger.warn(
        `Form validation failed: ${formName}`,
        component,
        { formName, validationErrors: errors, ...metadata }
      );
    },
    
    error: (error: Error | string) => {
      const errorMessage = error instanceof Error ? error.message : error;
      logger.error(
        `Form submission error: ${formName}`,
        component,
        { formName, error: errorMessage, ...metadata }
      );
    }
  };
}

export default logger; 