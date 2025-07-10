<!-- Production Error Boundary - Comprehensive error handling for SvelteKit -->
<!-- Following senior engineer production development rules -->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { logger, createComponentLogger } from '$lib/utils/logger';
  import { browser } from '$app/environment';
  
  export let componentName: string = 'ErrorBoundary';
  export let fallbackMessage: string = 'Something went wrong. Please try again.';
  export let showDetails: boolean = false;
  export let retryButton: boolean = true;
  
  let hasError = false;
  let errorInfo: any = null;
  let retryCount = 0;
  let maxRetries = 3;
  
  const componentLogger = createComponentLogger(componentName);
  
  // Global error handler for unhandled promise rejections
  function handleUnhandledRejection(event: PromiseRejectionEvent) {
    componentLogger.logError(
      new Error(event.reason || 'Unhandled promise rejection'),
      {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
        retryCount
      }
    );
    
    setErrorState(event.reason, 'Promise rejection');
  }
  
  // Global error handler for JavaScript errors
  function handleGlobalError(event: ErrorEvent) {
    componentLogger.logError(
      new Error(event.message || 'Global JavaScript error'),
      {
        type: 'global_error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        retryCount
      }
    );
    
    setErrorState(event.error || event.message, 'Global error');
  }
  
  function setErrorState(error: any, source: string) {
    hasError = true;
    errorInfo = {
      error,
      source,
      timestamp: new Date().toISOString(),
      userAgent: browser ? navigator.userAgent : 'Unknown',
      url: browser ? window.location.href : 'Unknown',
      retryCount
    };
    
    // Log comprehensive error information
    logger.error(
      `Error boundary caught error from ${source}`,
      componentName,
      {
        errorMessage: error?.message || error,
        errorStack: error?.stack,
        source,
        errorInfo,
        component: componentName
      }
    );
  }
  
  function handleRetry() {
    if (retryCount >= maxRetries) {
      componentLogger.logWarning('Maximum retry attempts reached', {
        maxRetries,
        retryCount
      });
      return;
    }
    
    retryCount++;
    hasError = false;
    errorInfo = null;
    
    componentLogger.logInfo('Error boundary retry attempt', {
      retryCount,
      maxRetries
    });
    
    // Trigger a re-render by dispatching a custom event
    if (browser) {
      window.dispatchEvent(new CustomEvent('error-boundary-retry'));
    }
  }
  
  function handleReportError() {
    componentLogger.logInfo('User reported error', {
      errorInfo,
      retryCount
    });
    
    // In production, this could send to external error reporting service
    if (browser) {
      const errorReport = {
        message: errorInfo?.error?.message || 'Unknown error',
        stack: errorInfo?.error?.stack,
        timestamp: errorInfo?.timestamp,
        url: window.location.href,
        userAgent: navigator.userAgent,
        componentName,
        retryCount
      };
      
      // This would typically send to Sentry or similar service
      console.warn('Error reported:', errorReport);
    }
  }
  
  onMount(() => {
    componentLogger.mounted();
    
    if (browser) {
      // Set up global error handlers
      window.addEventListener('error', handleGlobalError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);
    }
  });
  
  onDestroy(() => {
    componentLogger.unmounted();
    
    if (browser) {
      // Clean up global error handlers
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    }
  });
</script>

{#if hasError}
  <div class="error-boundary" role="alert" aria-live="assertive">
    <div class="error-content">
      <div class="error-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" stroke-width="2"/>
          <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" stroke-width="2"/>
        </svg>
      </div>
      
      <h2 class="error-title">Oops! Something went wrong</h2>
      
      <p class="error-message">{fallbackMessage}</p>
      
      {#if showDetails && errorInfo}
        <details class="error-details">
          <summary>Technical Details</summary>
          <pre class="error-stack">
            Error: {errorInfo.error?.message || 'Unknown error'}
            Source: {errorInfo.source}
            Time: {errorInfo.timestamp}
            Component: {componentName}
            Retry Count: {retryCount}/{maxRetries}
          </pre>
        </details>
      {/if}
      
      <div class="error-actions">
        {#if retryButton && retryCount < maxRetries}
          <button 
            class="retry-button"
            on:click={handleRetry}
            type="button"
          >
            Try Again ({maxRetries - retryCount} attempts left)
          </button>
        {/if}
        
        <button 
          class="report-button"
          on:click={handleReportError}
          type="button"
        >
          Report Issue
        </button>
        
        <button 
          class="reload-button"
          on:click={() => browser && window.location.reload()}
          type="button"
        >
          Reload Page
        </button>
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 400px;
    padding: 2rem;
    background-color: var(--error-bg, #fef2f2);
    border: 1px solid var(--error-border, #fecaca);
    border-radius: 8px;
    margin: 1rem 0;
  }
  
  .error-content {
    text-align: center;
    max-width: 500px;
  }
  
  .error-icon {
    color: var(--error-color, #dc2626);
    margin-bottom: 1rem;
  }
  
  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--error-color, #dc2626);
    margin-bottom: 0.5rem;
  }
  
  .error-message {
    color: var(--text-secondary, #6b7280);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }
  
  .error-details {
    text-align: left;
    margin-bottom: 1.5rem;
    border: 1px solid var(--border-color, #e5e7eb);
    border-radius: 4px;
    padding: 1rem;
    background-color: var(--bg-secondary, #f9fafb);
  }
  
  .error-details summary {
    cursor: pointer;
    font-weight: 500;
    margin-bottom: 0.5rem;
  }
  
  .error-stack {
    font-family: monospace;
    font-size: 0.875rem;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--text-muted, #6b7280);
    margin: 0;
  }
  
  .error-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .retry-button,
  .report-button,
  .reload-button {
    padding: 0.5rem 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid transparent;
  }
  
  .retry-button {
    background-color: var(--primary-color, #3b82f6);
    color: white;
    border-color: var(--primary-color, #3b82f6);
  }
  
  .retry-button:hover {
    background-color: var(--primary-hover, #2563eb);
  }
  
  .report-button {
    background-color: var(--secondary-color, #6b7280);
    color: white;
    border-color: var(--secondary-color, #6b7280);
  }
  
  .report-button:hover {
    background-color: var(--secondary-hover, #4b5563);
  }
  
  .reload-button {
    background-color: transparent;
    color: var(--text-primary, #374151);
    border-color: var(--border-color, #e5e7eb);
  }
  
  .reload-button:hover {
    background-color: var(--bg-hover, #f3f4f6);
  }
  
  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .error-boundary {
      background-color: var(--error-bg-dark, #1f1f1f);
      border-color: var(--error-border-dark, #404040);
    }
    
    .error-details {
      background-color: var(--bg-secondary-dark, #2a2a2a);
      border-color: var(--border-color-dark, #404040);
    }
  }
</style> 