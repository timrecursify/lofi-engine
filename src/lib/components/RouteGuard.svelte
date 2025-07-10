<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { authState, initializeClerk } from '$lib/auth';

  export let requireAuth = false;
  export let requireProPlan = false;
  export let requiredRole: string | null = null;
  export let fallbackUrl = '/auth/signin';
  export let loadingComponent: any = null;

  let isLoading = true;
  let isAuthorized = false;
  let errorMessage = '';

  onMount(async () => {
    try {
      // Initialize Clerk and wait for auth state
      await initializeClerk();
      
      // Wait for auth state to be populated
      const unsubscribe = authState.subscribe(async (state) => {
        if (state.isLoaded) {
          await checkAuthorization(state);
          unsubscribe();
        }
      });

      // Timeout fallback in case auth never loads
      setTimeout(() => {
        if (isLoading) {
          console.warn('Auth state loading timeout, proceeding with fallback');
          handleUnauthorized('Authentication timeout');
        }
      }, 5000);

    } catch (error) {
      console.error('Route guard initialization error:', error);
      handleUnauthorized('Authentication initialization failed');
    }
  });

  async function checkAuthorization(state: any) {
    try {
      // Check if authentication is required
      if (requireAuth && !state.isSignedIn) {
        handleUnauthorized('Authentication required');
        return;
      }

      // Check pro plan requirement
      if (requireProPlan && state.isSignedIn) {
        const user = state.user;
        const hasProPlan = user?.publicMetadata?.plan === 'pro' || 
                          user?.privateMetadata?.plan === 'pro';
        
        if (!hasProPlan) {
          handleUnauthorized('Pro plan required', '/upgrade');
          return;
        }
      }

      // Check role requirement
      if (requiredRole && state.isSignedIn) {
        const user = state.user;
        const userRole = user?.publicMetadata?.role || 
                        user?.organizationMemberships?.[0]?.role;
        
        if (userRole !== requiredRole) {
          handleUnauthorized('Insufficient permissions');
          return;
        }
      }

      // All checks passed
      isAuthorized = true;
      isLoading = false;

    } catch (error) {
      console.error('Authorization check error:', error);
      handleUnauthorized('Authorization check failed');
    }
  }

  function handleUnauthorized(message: string, redirectUrl?: string) {
    errorMessage = message;
    isLoading = false;
    isAuthorized = false;

    // Redirect after a brief moment to show error
    setTimeout(() => {
      const targetUrl = redirectUrl || fallbackUrl;
      const currentPath = $page.url.pathname;
      
      // Add return URL for signin redirects
      if (targetUrl === '/auth/signin' && currentPath !== '/') {
        goto(`${targetUrl}?returnUrl=${encodeURIComponent(currentPath)}`);
      } else {
        goto(targetUrl);
      }
    }, 1500);
  }
</script>

{#if isLoading}
  {#if loadingComponent}
    <svelte:component this={loadingComponent} />
  {:else}
    <div class="route-guard-loading">
      <div class="loading-spinner">
        <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
      <p class="loading-text">Verifying access...</p>
    </div>
  {/if}
{:else if !isAuthorized}
  <div class="route-guard-error">
    <div class="error-icon">🔒</div>
    <h2 class="error-title">Access Restricted</h2>
    <p class="error-message">{errorMessage}</p>
    <p class="redirect-notice">Redirecting...</p>
  </div>
{:else}
  <slot />
{/if}

<style>
  .route-guard-loading,
  .route-guard-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    text-align: center;
    background: var(--color-bg, #191414);
  }

  .loading-spinner {
    margin-bottom: 1rem;
  }

  .loading-text {
    color: var(--color-secondary, #b3b3b3);
    font-size: 1rem;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-primary, #1db954);
    margin-bottom: 0.5rem;
  }

  .error-message {
    color: var(--color-secondary, #b3b3b3);
    font-size: 1rem;
    margin-bottom: 1rem;
  }

  .redirect-notice {
    color: var(--color-muted, #8b8b8b);
    font-size: 0.875rem;
    font-style: italic;
  }
</style> 