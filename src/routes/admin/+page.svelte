<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'
  import type { PageData } from './$types'

  export let data: PageData

  // Mock data for now - will be replaced with real API calls
  let metrics = {
    activeUsers: 0,
    totalUsers: 0,
    clipPoolDepth: 0,
    ttsSpend: 0,
    adRevenue: 0,
    systemHealth: 'healthy'
  }

  let isLoading = true

  onMount(async () => {
    // Track admin dashboard view
    trackEvent(AnalyticsEvent.ADMIN_DASHBOARD_VIEWED, {
      user_role: data.user?.publicMetadata?.role || 'unknown',
      timestamp: new Date().toISOString()
    })
    
    await loadMetrics()
  })

  async function loadMetrics() {
    isLoading = true
    try {
      const { apiGet } = await import('$lib/utils/api-monitor')
      const response = await apiGet('/api/v1/admin/metrics', {
        timeout: 15000, // 15 seconds for admin metrics
        retries: 2
      })
      
      if (response.ok && response.data) {
        metrics = {
          activeUsers: response.data.activeUsers,
          totalUsers: response.data.totalUsers,
          clipPoolDepth: response.data.clipPoolDepth,
          ttsSpend: response.data.ttsSpend,
          adRevenue: response.data.adRevenue,
          systemHealth: response.data.systemHealth
        }
      } else {
        console.error('Failed to load metrics:', response.error)
        // Fallback to mock data for demo
        metrics = {
          activeUsers: 247,
          totalUsers: 1432,
          clipPoolDepth: 156,
          ttsSpend: 23.45,
          adRevenue: 187.92,
          systemHealth: 'healthy'
        }
      }
    } catch (error) {
      console.error('Error loading metrics:', error)
      // Fallback to mock data for demo
      metrics = {
        activeUsers: 247,
        totalUsers: 1432,
        clipPoolDepth: 156,
        ttsSpend: 23.45,
        adRevenue: 187.92,
        systemHealth: 'healthy'
      }
    } finally {
      isLoading = false
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  function getHealthColor(health: string): string {
    switch (health) {
      case 'healthy': return 'text-green-400'
      case 'warning': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }
</script>

<div class="admin-dashboard">
  <!-- Dashboard Header -->
  <header class="dashboard-header">
    <div class="header-content">
      <h1 class="dashboard-title">Admin Dashboard</h1>
      <p class="dashboard-subtitle">
        System overview and management controls
      </p>
    </div>
    
    <div class="header-actions">
      <button class="refresh-btn" on:click={loadMetrics}>
        <Icon name="refresh" size={16} />
        Refresh
      </button>
    </div>
  </header>

  <!-- Metrics Grid -->
  <div class="metrics-grid">
    <!-- Active Users Card -->
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon active-users">
          <Icon name="users" size={24} />
        </div>
        <div class="metric-info">
          <h3 class="metric-title">Active Users</h3>
          <p class="metric-subtitle">Currently online</p>
        </div>
      </div>
      
      <div class="metric-value">
        {#if isLoading}
          <div class="loading-value"></div>
        {:else}
          <span class="value">{metrics.activeUsers}</span>
          <span class="unit">users</span>
        {/if}
      </div>
    </div>

    <!-- Total Users Card -->
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon total-users">
          <Icon name="user-group" size={24} />
        </div>
        <div class="metric-info">
          <h3 class="metric-title">Total Users</h3>
          <p class="metric-subtitle">All registered</p>
        </div>
      </div>
      
      <div class="metric-value">
        {#if isLoading}
          <div class="loading-value"></div>
        {:else}
          <span class="value">{metrics.totalUsers}</span>
          <span class="unit">users</span>
        {/if}
      </div>
    </div>

    <!-- Clip Pool Depth Card -->
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon clip-pool">
          <Icon name="music-note" size={24} />
        </div>
        <div class="metric-info">
          <h3 class="metric-title">Clip Pool Depth</h3>
          <p class="metric-subtitle">Ready clips</p>
        </div>
      </div>
      
      <div class="metric-value">
        {#if isLoading}
          <div class="loading-value"></div>
        {:else}
          <span class="value">{metrics.clipPoolDepth}</span>
          <span class="unit">clips</span>
        {/if}
      </div>
    </div>

    <!-- TTS Spend Card -->
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon tts-spend">
          <Icon name="currency-dollar" size={24} />
        </div>
        <div class="metric-info">
          <h3 class="metric-title">TTS Spend</h3>
          <p class="metric-subtitle">This month</p>
        </div>
      </div>
      
      <div class="metric-value">
        {#if isLoading}
          <div class="loading-value"></div>
        {:else}
          <span class="value">{formatCurrency(metrics.ttsSpend)}</span>
        {/if}
      </div>
    </div>

    <!-- Ad Revenue Card -->
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon ad-revenue">
          <Icon name="chart-bar" size={24} />
        </div>
        <div class="metric-info">
          <h3 class="metric-title">Ad Revenue</h3>
          <p class="metric-subtitle">This month</p>
        </div>
      </div>
      
      <div class="metric-value">
        {#if isLoading}
          <div class="loading-value"></div>
        {:else}
          <span class="value">{formatCurrency(metrics.adRevenue)}</span>
        {/if}
      </div>
    </div>

    <!-- System Health Card -->
    <div class="metric-card">
      <div class="metric-header">
        <div class="metric-icon system-health">
          <Icon name="shield-check" size={24} />
        </div>
        <div class="metric-info">
          <h3 class="metric-title">System Health</h3>
          <p class="metric-subtitle">Overall status</p>
        </div>
      </div>
      
      <div class="metric-value">
        {#if isLoading}
          <div class="loading-value"></div>
        {:else}
          <span class="value health-value {getHealthColor(metrics.systemHealth)}">
            {metrics.systemHealth}
          </span>
        {/if}
      </div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="quick-actions">
    <h2 class="section-title">Quick Actions</h2>
    
    <div class="action-grid">
      <button class="action-card" on:click={() => console.log('Generate content')}>
        <Icon name="plus" size={20} />
        <span>Generate Content</span>
      </button>
      
      <button class="action-card" on:click={() => console.log('Clear cache')}>
        <Icon name="trash" size={20} />
        <span>Clear Cache</span>
      </button>
      
      <button class="action-card" on:click={() => console.log('Toggle ads')}>
        <Icon name="toggle-left" size={20} />
        <span>Toggle Ads</span>
      </button>
      
      <button class="action-card" on:click={() => console.log('Export logs')}>
        <Icon name="download" size={20} />
        <span>Export Logs</span>
      </button>
    </div>
  </div>
</div>

<style>
  .admin-dashboard {
    max-width: 1200px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--color-border, #333);
  }

  .header-content {
    flex: 1;
  }

  .dashboard-title {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text, #ffffff);
    margin: 0 0 0.5rem 0;
  }

  .dashboard-subtitle {
    color: var(--color-text-secondary, #888);
    font-size: 1rem;
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 1rem;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary, #3b82f6);
    color: white;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .refresh-btn:hover {
    background: var(--color-primary-hover, #2563eb);
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1.5rem;
    margin-bottom: 3rem;
  }

  .metric-card {
    background: var(--color-bg-secondary, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 0.5rem;
    padding: 1.5rem;
    transition: all 0.2s;
  }

  .metric-card:hover {
    border-color: var(--color-border-hover, #555);
    transform: translateY(-1px);
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .metric-icon {
    width: 48px;
    height: 48px;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .metric-icon.active-users {
    background: rgba(34, 197, 94, 0.1);
    color: rgb(34, 197, 94);
  }

  .metric-icon.total-users {
    background: rgba(59, 130, 246, 0.1);
    color: rgb(59, 130, 246);
  }

  .metric-icon.clip-pool {
    background: rgba(168, 85, 247, 0.1);
    color: rgb(168, 85, 247);
  }

  .metric-icon.tts-spend {
    background: rgba(239, 68, 68, 0.1);
    color: rgb(239, 68, 68);
  }

  .metric-icon.ad-revenue {
    background: rgba(245, 158, 11, 0.1);
    color: rgb(245, 158, 11);
  }

  .metric-icon.system-health {
    background: rgba(16, 185, 129, 0.1);
    color: rgb(16, 185, 129);
  }

  .metric-info {
    flex: 1;
    min-width: 0;
  }

  .metric-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text, #ffffff);
    margin: 0 0 0.25rem 0;
  }

  .metric-subtitle {
    font-size: 0.75rem;
    color: var(--color-text-secondary, #888);
    margin: 0;
  }

  .metric-value {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .metric-value .value {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--color-text, #ffffff);
  }

  .metric-value .unit {
    font-size: 0.875rem;
    color: var(--color-text-secondary, #888);
  }

  .health-value {
    text-transform: capitalize;
  }

  .loading-value {
    width: 80px;
    height: 32px;
    background: var(--color-bg-tertiary, #333);
    border-radius: 0.25rem;
    animation: pulse 1.5s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .quick-actions {
    margin-bottom: 2rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text, #ffffff);
    margin: 0 0 1rem 0;
  }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }

  .action-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: var(--color-bg-secondary, #1a1a1a);
    border: 1px solid var(--color-border, #333);
    border-radius: 0.5rem;
    color: var(--color-text, #ffffff);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .action-card:hover {
    background: var(--color-bg-tertiary, #333);
    border-color: var(--color-border-hover, #555);
    transform: translateY(-1px);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }

    .metrics-grid {
      grid-template-columns: 1fr;
    }

    .action-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 