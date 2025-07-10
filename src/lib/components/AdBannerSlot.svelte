<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import type { VASTAd } from '$lib/services/ad-engine';
  
  export let slotId: string = 'banner-slot-1';
  export let width: number = 728;
  export let height: number = 90;
  export let position: 'top' | 'bottom' | 'sidebar' = 'top';
  export let showForFreeOnly: boolean = true;
  export let refreshInterval: number = 300000; // 5 minutes
  export let fallbackImageUrl: string = '/assets/images/fallback-banner.jpg';
  export let userPlan: 'free' | 'pro' = 'free';
  export let currentAd: VASTAd | null = null;
  
  interface BannerAdConfig {
    slotId: string;
    width: number;
    height: number;
    adUnitPath: string;
    targeting?: Record<string, string>;
  }
  
  let bannerElement: HTMLElement;
  let isLoading = false;
  let hasError = false;
  let errorMessage = '';
  let adContent: string | null = null;
  let companionAd: VASTAd['companionAds'][0] | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;
  let impressionTracked = false;
  
  // Responsive breakpoints
  const breakpoints = {
    mobile: 320,
    tablet: 768,
    desktop: 1024
  };
  
  // Standard banner sizes
  const bannerSizes = {
    'mobile-banner': { width: 320, height: 50 },
    'leaderboard': { width: 728, height: 90 },
    'medium-rectangle': { width: 300, height: 250 },
    'large-rectangle': { width: 336, height: 280 },
    'wide-skyscraper': { width: 160, height: 600 },
    'banner': { width: 468, height: 60 }
  };
  
  // Check if ads should be shown
  $: shouldShowAds = showForFreeOnly ? userPlan === 'free' : true;
  
  // Update companion ad when currentAd changes
  $: {
    if (currentAd && currentAd.companionAds) {
      companionAd = findBestCompanionAd(currentAd.companionAds);
    } else {
      companionAd = null;
    }
  }
  
  // Find the best companion ad for this slot
  function findBestCompanionAd(companions: VASTAd['companionAds']): VASTAd['companionAds'][0] | null {
    if (!companions || companions.length === 0) return null;
    
    // Find exact match first
    let bestMatch = companions.find(ad => 
      ad.width === width && ad.height === height
    );
    
    // If no exact match, find closest size
    if (!bestMatch) {
      const targetArea = width * height;
      bestMatch = companions.reduce((best, current) => {
        const currentArea = current.width * current.height;
        const bestArea = best.width * best.height;
        
        return Math.abs(currentArea - targetArea) < Math.abs(bestArea - targetArea) 
          ? current 
          : best;
      });
    }
    
    return bestMatch;
  }
  
  // Get responsive banner size
  function getResponsiveBannerSize(): { width: number; height: number } {
    if (!browser) return { width, height };
    
    const screenWidth = window.innerWidth;
    
    if (screenWidth < breakpoints.tablet) {
      return bannerSizes['mobile-banner'];
    } else if (screenWidth < breakpoints.desktop) {
      return position === 'sidebar' 
        ? bannerSizes['medium-rectangle'] 
        : bannerSizes['banner'];
    } else {
      return position === 'sidebar' 
        ? bannerSizes['wide-skyscraper'] 
        : bannerSizes['leaderboard'];
    }
  }
  
  // Load banner ad
  async function loadBannerAd(): Promise<void> {
    if (!shouldShowAds) return;
    
    isLoading = true;
    hasError = false;
    errorMessage = '';
    
    try {
      // If we have a companion ad, use it
      if (companionAd) {
        adContent = createCompanionAdHtml(companionAd);
        trackImpression(companionAd.resourceUrl);
        return;
      }
      
      // Otherwise, try to load from ad network
      const adData = await fetchAdFromNetwork();
      if (adData) {
        adContent = adData.html;
        trackImpression(adData.impressionUrl);
      } else {
        // Show fallback
        adContent = createFallbackAdHtml();
      }
      
    } catch (error) {
      console.error('Failed to load banner ad:', error);
      hasError = true;
      errorMessage = error instanceof Error ? error.message : 'Failed to load ad';
      adContent = createFallbackAdHtml();
    } finally {
      isLoading = false;
    }
  }
  
  // Create HTML for companion ad
  function createCompanionAdHtml(ad: VASTAd['companionAds'][0]): string {
    const clickHandler = ad.clickThroughUrl 
      ? `onclick="window.open('${ad.clickThroughUrl}', '_blank')"` 
      : '';
    
    return `
      <div class="companion-ad" ${clickHandler} style="cursor: ${ad.clickThroughUrl ? 'pointer' : 'default'};">
        <img src="${ad.resourceUrl}" 
             alt="Advertisement" 
             style="width: 100%; height: 100%; object-fit: cover;"
             onload="this.style.opacity = '1';"
             onerror="this.style.display = 'none';" />
      </div>
    `;
  }
  
  // Create fallback ad HTML
  function createFallbackAdHtml(): string {
    return `
      <div class="fallback-ad">
        <img src="${fallbackImageUrl}" 
             alt="ChillCast - Upgrade to Pro" 
             style="width: 100%; height: 100%; object-fit: cover;"
             onclick="window.location.href='/upgrade'" />
      </div>
    `;
  }
  
  // Fetch ad from network (placeholder implementation)
  async function fetchAdFromNetwork(): Promise<{ html: string; impressionUrl: string } | null> {
    // This would integrate with an actual ad network
    // For now, return null to show fallback
    
    try {
      // Simulate ad network request
      const response = await fetch('/api/v1/ads/banner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slotId,
          width,
          height,
          position,
          targeting: {
            userPlan,
            page: window.location.pathname
          }
        })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Ad network request failed:', error);
    }
    
    return null;
  }
  
  // Track impression
  function trackImpression(adUrl: string): void {
    if (impressionTracked) return;
    
    // Fire impression pixel
    const img = new Image();
    img.onload = () => {
      impressionTracked = true;
      console.log('Banner impression tracked');
    };
    img.onerror = () => {
      console.warn('Failed to track banner impression');
    };
    img.src = adUrl;
    
    // Track in analytics
    if (browser) {
      fetch('/api/v1/analytics/banner-impression', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slotId,
          adUrl,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          referrer: document.referrer
        })
      }).catch(error => {
        console.warn('Failed to track banner analytics:', error);
      });
    }
  }
  
  // Handle ad click
  function handleAdClick(): void {
    if (companionAd && companionAd.clickThroughUrl) {
      // Track click
      fetch('/api/v1/analytics/banner-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          slotId,
          clickUrl: companionAd.clickThroughUrl,
          timestamp: new Date().toISOString()
        })
      }).catch(error => {
        console.warn('Failed to track banner click:', error);
      });
    }
  }
  
  // Refresh ad
  function refreshAd(): void {
    impressionTracked = false;
    loadBannerAd();
  }
  
  // Setup refresh timer
  function setupRefreshTimer(): void {
    if (refreshTimer) clearInterval(refreshTimer);
    
    refreshTimer = setInterval(() => {
      if (shouldShowAds) {
        refreshAd();
      }
    }, refreshInterval);
  }
  
  // Handle window resize
  function handleResize(): void {
    const newSize = getResponsiveBannerSize();
    if (newSize.width !== width || newSize.height !== height) {
      width = newSize.width;
      height = newSize.height;
      refreshAd();
    }
  }
  
  onMount(() => {
    if (browser) {
      const responsiveSize = getResponsiveBannerSize();
      width = responsiveSize.width;
      height = responsiveSize.height;
      
      if (shouldShowAds) {
        loadBannerAd();
        setupRefreshTimer();
      }
      
      window.addEventListener('resize', handleResize);
    }
  });
  
  onDestroy(() => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
    }
    
    if (browser) {
      window.removeEventListener('resize', handleResize);
    }
  });
</script>

{#if shouldShowAds}
  <div
    class="ad-banner-slot"
    class:loading={isLoading}
    class:error={hasError}
    class:top={position === 'top'}
    class:bottom={position === 'bottom'}
    class:sidebar={position === 'sidebar'}
    style="width: {width}px; height: {height}px;"
    bind:this={bannerElement}
  >
    {#if isLoading}
      <div class="loading-state">
        <div class="spinner"></div>
        <span>Loading ad...</span>
      </div>
    {:else if hasError && !adContent}
      <div class="error-state">
        <span class="error-icon">⚠️</span>
        <span class="error-text">Ad loading failed</span>
        <button class="retry-button" on:click={refreshAd}>Retry</button>
      </div>
    {:else if adContent}
      <div 
        class="ad-content"
        on:click={handleAdClick}
        on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAdClick()}
        role="button"
        aria-label="Advertisement"
        tabindex="0"
      >
        {@html adContent}
      </div>
    {/if}
    
    <!-- Ad label -->
    <div class="ad-label">
      <span>Ad</span>
    </div>
  </div>
{/if}

<style>
  .ad-banner-slot {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-bg-secondary, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
    margin: 8px 0;
  }
  
  .ad-banner-slot.loading {
    opacity: 0.7;
  }
  
  .ad-banner-slot.error {
    border-color: var(--color-error, #ef4444);
  }
  
  .ad-banner-slot.top {
    margin-bottom: 16px;
  }
  
  .ad-banner-slot.bottom {
    margin-top: 16px;
  }
  
  .ad-banner-slot.sidebar {
    margin: 8px 0;
    max-width: 100%;
  }
  
  .loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--color-text-secondary, #888);
    font-size: 14px;
  }
  
  .spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--color-border, #333);
    border-top: 2px solid var(--color-primary, #3b82f6);
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: var(--color-error, #ef4444);
    font-size: 14px;
  }
  
  .error-icon {
    font-size: 24px;
  }
  
  .error-text {
    margin-bottom: 4px;
  }
  
  .retry-button {
    padding: 4px 12px;
    background: var(--color-primary, #3b82f6);
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background 0.2s;
  }
  
  .retry-button:hover {
    background: var(--color-primary-hover, #2563eb);
  }
  
  .ad-content {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
  }
  
  .ad-content :global(img) {
    transition: opacity 0.3s ease;
    opacity: 0;
  }
  
  .ad-content :global(.companion-ad) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
  }
  
  .ad-content :global(.companion-ad:hover) {
    transform: scale(1.02);
  }
  
  .ad-content :global(.fallback-ad) {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    cursor: pointer;
    transition: filter 0.2s ease;
  }
  
  .ad-content :global(.fallback-ad:hover) {
    filter: brightness(1.1);
  }
  
  .ad-label {
    position: absolute;
    top: 2px;
    right: 2px;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 2px 6px;
    font-size: 10px;
    border-radius: 2px;
    pointer-events: none;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  /* Responsive styles */
  @media (max-width: 768px) {
    .ad-banner-slot {
      max-width: 100%;
      margin: 8px auto;
    }
    
    .ad-banner-slot.sidebar {
      width: 100% !important;
      height: 100px !important;
    }
  }
  
  @media (max-width: 480px) {
    .ad-banner-slot {
      margin: 4px auto;
      border-radius: 4px;
    }
    
    .loading-state,
    .error-state {
      font-size: 12px;
    }
    
    .spinner {
      width: 20px;
      height: 20px;
    }
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    .ad-banner-slot {
      border-width: 2px;
      border-color: currentColor;
    }
    
    .ad-label {
      background: black;
      color: white;
    }
  }
  
  /* Reduced motion */
  @media (prefers-reduced-motion: reduce) {
    .ad-banner-slot,
    .ad-content :global(.companion-ad),
    .ad-content :global(.fallback-ad),
    .spinner {
      transition: none;
      animation: none;
    }
  }
</style> 