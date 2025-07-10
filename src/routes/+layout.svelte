<script lang="ts">
  import '../styles.css'
  import { onMount, onDestroy } from 'svelte'
  import { authState } from '$lib/auth'
  import { analytics, trackEvent, identifyUser, AnalyticsEvent, UserJourneyStage, trackFunnel } from '$lib/services/analytics'
  import { browser } from '$app/environment'
  import { page } from '$app/stores'

  let unsubscribeAuth: (() => void) | null = null

  onMount(() => {
    // Track landing/page view
    if (browser) {
      trackEvent(AnalyticsEvent.PAGE_VIEW, {
        page_path: $page.url.pathname,
        page_title: document.title
      })

      // Track landing funnel step
      trackFunnel('SIGN_UP_FUNNEL', UserJourneyStage.LANDING, {
        referrer: document.referrer,
        utm_source: $page.url.searchParams.get('utm_source'),
        utm_medium: $page.url.searchParams.get('utm_medium'),
        utm_campaign: $page.url.searchParams.get('utm_campaign')
      })
    }

    // Subscribe to auth state changes
    unsubscribeAuth = authState.subscribe((auth) => {
      if (auth.isLoaded && auth.user) {
        // Identify user for analytics
        identifyUser(auth.user)
        
        // Track sign-in funnel step if user just signed in
        if (auth.isSignedIn) {
          trackFunnel('SIGN_UP_FUNNEL', UserJourneyStage.SIGN_UP, {
            user_plan: auth.user.publicMetadata?.plan || 'free',
            user_id: auth.user.id
          })
        }
      }
    })
  })

  onDestroy(() => {
    if (unsubscribeAuth) {
      unsubscribeAuth()
    }
  })

  // Track page changes
  $: if (browser && $page.url) {
    trackEvent(AnalyticsEvent.PAGE_VIEW, {
      page_path: $page.url.pathname,
      page_title: document.title,
      session_duration: analytics.getPostHogInstance()?.sessionManager?.getSessionDuration?.() || 0
    })
  }
</script>

<main class="app">
  <slot />
</main>

<style>
  .app {
    display: contents;
  }
</style> 