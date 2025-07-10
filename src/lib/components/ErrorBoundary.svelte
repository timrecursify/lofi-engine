<!--
  ErrorBoundary Component
  
  Provides error boundary functionality for Svelte components
  with integrated error monitoring and user-friendly fallbacks.
-->
<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { slide } from 'svelte/transition'
  import { captureError, addBreadcrumb } from '$lib/services/error-monitoring'
  import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'
  import Icon from './Icon.svelte'

  export let componentName = 'Unknown'
  export let fallbackMessage = 'Something went wrong. Please try refreshing the page.'
  export let showDetails = false
  export let onError: ((error: Error) => void) | null = null

  let hasError = false
  let errorMessage = ''
  let errorStack = ''
  let retryCount = 0
  let mounted = false

  onMount(() => {
    mounted = true
    addBreadcrumb(`${componentName} mounted`, 'component', 'info', { component: componentName })
    
    // Set up global error listener specific to this component
    const handleError = (event: ErrorEvent) => {
      if (event.error && mounted) {
        handleErrorState(event.error)
      }
    }

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (mounted) {
        const error = new Error(`Unhandled promise rejection: ${event.reason}`)
        handleErrorState(error)
      }
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  })

  onDestroy(() => {
    mounted = false
    addBreadcrumb(`${componentName} unmounted`, 'component', 'info', { component: componentName })
  })

  function handleErrorState(error: Error) {
    console.error(`Error in ${componentName}:`, error)
    
    hasError = true
    errorMessage = error.message
    errorStack = error.stack || ''
    
    // Capture error with context
    captureError(error, {
      tags: { 
        component: componentName,
        type: 'component_error'
      },
      extra: {
        retry_count: retryCount,
        component_name: componentName,
        error_boundary: true
      },
      level: 'error'
    })

    // Track error in analytics
    trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      error_type: 'component_error',
      error_message: error.message,
      component: componentName,
      retry_count: retryCount
    })

    // Call custom error handler if provided
    if (onError) {
      onError(error)
    }

    // Add breadcrumb for error
    addBreadcrumb(`Error caught in ${componentName}`, 'error', 'error', {
      error_message: error.message,
      component: componentName
    })
  }

  function retry() {
    retryCount++
    hasError = false
    errorMessage = ''
    errorStack = ''
    
    // Track retry attempt
    trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      action: 'error_boundary_retry',
      component: componentName,
      retry_count: retryCount
    })

    addBreadcrumb(`${componentName} retry attempt ${retryCount}`, 'user', 'info', {
      component: componentName,
      retry_count: retryCount
    })
  }

  function toggleDetails() {
    showDetails = !showDetails
    trackEvent(AnalyticsEvent.ERROR_OCCURRED, {
      action: showDetails ? 'show_error_details' : 'hide_error_details',
      component: componentName
    })
  }

  // Reactive statement to catch errors in component updates
  $: if (mounted && !hasError) {
    try {
      // This reactive block will re-run when dependencies change
      // Any errors thrown here will be caught by the global error handler
    } catch (error) {
      if (error instanceof Error) {
        handleErrorState(error)
      }
    }
  }
</script>

{#if hasError}
  <!-- Error State -->
  <div class="error-boundary" role="alert" aria-live="assertive">
    <div class="error-content">
      <div class="error-icon">
        <Icon name="alert-triangle" size={48} color="#ef4444" />
      </div>
      
      <div class="error-details">
        <h3 class="error-title">Oops! Something went wrong</h3>
        <p class="error-message">{fallbackMessage}</p>
        
        {#if showDetails}
          <div class="error-technical" transition:slide={{ duration: 200 }}>
            <h4>Technical Details:</h4>
            <p class="error-component">Component: {componentName}</p>
            <p class="error-text">Error: {errorMessage}</p>
            {#if errorStack && retryCount < 3}
              <details class="error-stack">
                <summary>Stack Trace</summary>
                <pre>{errorStack}</pre>
              </details>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="error-actions">
        <button 
          class="retry-button"
          on:click={retry}
          disabled={retryCount >= 3}
        >
          <Icon name="refresh-cw" size={16} />
          {retryCount >= 3 ? 'Max retries reached' : 'Try Again'}
        </button>
        
        <button 
          class="details-button"
          on:click={toggleDetails}
        >
          {showDetails ? 'Hide' : 'Show'} Details
        </button>
      </div>
      
      {#if retryCount >= 3}
        <div class="error-help">
          <p>If this problem persists, try:</p>
          <ul>
            <li>Refreshing the page</li>
            <li>Clearing your browser cache</li>
            <li>Checking your internet connection</li>
          </ul>
        </div>
      {/if}
    </div>
  </div>
{:else}
  <!-- Normal Content -->
  <slot />
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    padding: 2rem;
    background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
    border: 1px solid #fecaca;
    border-radius: 12px;
    margin: 1rem 0;
  }

  .error-content {
    text-align: center;
    max-width: 500px;
    width: 100%;
  }

  .error-icon {
    margin-bottom: 1rem;
    opacity: 0.8;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #dc2626;
    margin: 0 0 0.5rem 0;
  }

  .error-message {
    font-size: 1rem;
    color: #7f1d1d;
    margin: 0 0 1.5rem 0;
    line-height: 1.5;
  }

  .error-technical {
    background: #fef7f7;
    border: 1px solid #f3e8e8;
    border-radius: 8px;
    padding: 1rem;
    margin: 1rem 0;
    text-align: left;
  }

  .error-technical h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: #991b1b;
    margin: 0 0 0.75rem 0;
  }

  .error-component,
  .error-text {
    font-size: 0.875rem;
    color: #7f1d1d;
    margin: 0.5rem 0;
    font-family: 'Monaco', 'Consolas', monospace;
  }

  .error-stack {
    margin-top: 0.75rem;
  }

  .error-stack summary {
    font-size: 0.875rem;
    color: #991b1b;
    cursor: pointer;
    padding: 0.25rem 0;
  }

  .error-stack pre {
    background: #f5f5f5;
    border: 1px solid #e5e5e5;
    border-radius: 4px;
    padding: 0.75rem;
    margin: 0.5rem 0 0 0;
    font-size: 0.75rem;
    color: #374151;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .error-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin: 1.5rem 0;
  }

  .retry-button,
  .details-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    border: 1px solid;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .retry-button {
    color: #dc2626;
    border-color: #dc2626;
  }

  .retry-button:hover:not(:disabled) {
    background: #dc2626;
    color: white;
  }

  .retry-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .details-button {
    color: #6b7280;
    border-color: #d1d5db;
  }

  .details-button:hover {
    background: #f9fafb;
    color: #374151;
  }

  .error-help {
    background: #fffbeb;
    border: 1px solid #fed7aa;
    border-radius: 8px;
    padding: 1rem;
    margin-top: 1rem;
    text-align: left;
  }

  .error-help p {
    font-size: 0.875rem;
    color: #92400e;
    margin: 0 0 0.5rem 0;
    font-weight: 500;
  }

  .error-help ul {
    margin: 0;
    padding-left: 1.25rem;
  }

  .error-help li {
    font-size: 0.875rem;
    color: #b45309;
    margin: 0.25rem 0;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .error-boundary {
      background: linear-gradient(135deg, #1f1f1f 0%, #2a2a2a 100%);
      border-color: #404040;
    }

    .error-title {
      color: #f87171;
    }

    .error-message {
      color: #fca5a5;
    }

    .error-technical {
      background: #1a1a1a;
      border-color: #333333;
    }

    .error-technical h4 {
      color: #f87171;
    }

    .error-component,
    .error-text {
      color: #fca5a5;
    }

    .error-stack pre {
      background: #262626;
      border-color: #404040;
      color: #d1d5db;
    }

    .retry-button,
    .details-button {
      background: #1f1f1f;
    }

    .retry-button {
      color: #f87171;
      border-color: #f87171;
    }

    .retry-button:hover:not(:disabled) {
      background: #f87171;
      color: #1f1f1f;
    }

    .details-button {
      color: #9ca3af;
      border-color: #4b5563;
    }

    .details-button:hover {
      background: #2a2a2a;
      color: #d1d5db;
    }

    .error-help {
      background: #2a1f0a;
      border-color: #d97706;
    }

    .error-help p {
      color: #fbbf24;
    }

    .error-help li {
      color: #f59e0b;
    }
  }
</style> 