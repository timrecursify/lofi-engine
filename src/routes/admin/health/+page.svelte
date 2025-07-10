<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { page } from '$app/stores';
  import Icon from '$lib/components/Icon.svelte';
  import type { HealthMetrics, HealthAlert } from '$lib/services/health-monitor';

  let healthData: HealthMetrics | null = null;
  let alerts: HealthAlert[] = [];
  let isLoading = true;
  let error: string | null = null;
  let autoRefresh = true;
  let refreshInterval: NodeJS.Timeout | null = null;

  // Health status colors
  const statusColors = {
    healthy: '#1DB954',
    warning: '#FFA500', 
    critical: '#FF6B6B',
    unknown: '#888888'
  };

  function getHealthStatus() {
    if (!healthData) return 'unknown';
    
    const criticalIssues = alerts.filter(a => a.severity === 'critical' && !a.resolved).length;
    const warnings = alerts.filter(a => a.severity === 'medium' && !a.resolved).length;
    
    if (criticalIssues > 0) return 'critical';
    if (warnings > 0 || healthData.pipeline.successRate < 95) return 'warning';
    return 'healthy';
  }

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  function formatFileSize(mb: number): string {
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(1)} GB`;
  }

  function getAlertIcon(type: string) {
    switch (type) {
      case 'error': return 'alert-circle';
      case 'warning': return 'alert-triangle';
      case 'info': return 'info';
      default: return 'alert-circle';
    }
  }

  function getAlertColor(severity: string) {
    switch (severity) {
      case 'critical': return '#FF6B6B';
      case 'high': return '#FF8E53';
      case 'medium': return '#FFA500';
      case 'low': return '#4ECDC4';
      default: return '#888888';
    }
  }

  async function loadHealthData() {
    try {
      isLoading = true;
      error = null;

      const [healthResponse, alertsResponse] = await Promise.all([
        fetch('/api/v1/admin/health'),
        fetch('/api/v1/admin/health/alerts')
      ]);

      if (!healthResponse.ok) {
        throw new Error(`Health API error: ${healthResponse.status}`);
      }

      if (!alertsResponse.ok) {
        throw new Error(`Alerts API error: ${alertsResponse.status}`);
      }

      const healthResult = await healthResponse.json();
      const alertsResult = await alertsResponse.json();

      if (healthResult.success) {
        healthData = healthResult.data.metrics;
      } else {
        throw new Error(healthResult.error || 'Failed to load health data');
      }

      if (alertsResult.success) {
        alerts = alertsResult.data.alerts;
      } else {
        console.warn('Failed to load alerts:', alertsResult.error);
        alerts = [];
      }
    } catch (err) {
      console.error('Failed to load health data:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      isLoading = false;
    }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const response = await fetch(`/api/v1/admin/health/alerts/${alertId}/acknowledge`, {
        method: 'POST'
      });

      if (response.ok) {
        // Update local state
        alerts = alerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, acknowledged: true, acknowledgedAt: new Date().toISOString() }
            : alert
        );
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  }

  async function resolveAlert(alertId: string) {
    try {
      const response = await fetch(`/api/v1/admin/health/alerts/${alertId}/resolve`, {
        method: 'POST'
      });

      if (response.ok) {
        // Update local state
        alerts = alerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, resolved: true, resolvedAt: new Date().toISOString() }
            : alert
        );
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  }

  function startAutoRefresh() {
    if (refreshInterval) clearInterval(refreshInterval);
    
    if (autoRefresh) {
      refreshInterval = setInterval(loadHealthData, 30000); // Refresh every 30 seconds
    }
  }

  function toggleAutoRefresh() {
    autoRefresh = !autoRefresh;
    startAutoRefresh();
  }

  onMount(() => {
    loadHealthData();
    startAutoRefresh();
  });

  onDestroy(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }
  });

  // Reactive statement to restart auto-refresh when setting changes
  $: if (autoRefresh) {
    startAutoRefresh();
  } else if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
</script>

<div class="health-dashboard">
  <!-- Header -->
  <div class="dashboard-header">
    <div class="header-left">
      <h1 class="dashboard-title">System Health</h1>
      <p class="dashboard-subtitle">Real-time monitoring and alerts</p>
    </div>
    
    <div class="header-actions">
      <button
        class="refresh-btn"
        class:auto={autoRefresh}
        on:click={toggleAutoRefresh}
        title="Toggle auto-refresh"
      >
        <Icon name="refresh-cw" size={16} />
        {autoRefresh ? 'Auto' : 'Manual'}
      </button>
      
      <button
        class="refresh-btn"
        on:click={loadHealthData}
        disabled={isLoading}
        title="Refresh now"
      >
        <Icon name="refresh-cw" size={16} class={isLoading ? 'spinning' : ''} />
        Refresh
      </button>
    </div>
  </div>

  {#if error}
    <div class="error-message">
      <Icon name="alert-circle" size={20} />
      <span>Error loading health data: {error}</span>
      <button on:click={loadHealthData} class="retry-btn">Retry</button>
    </div>
  {/if}

  {#if isLoading && !healthData}
    <div class="loading-state">
      <Icon name="loader" size={24} class="spinning" />
      <span>Loading health data...</span>
    </div>
  {:else if healthData}
    <!-- System Status Overview -->
    <div class="status-overview">
      <div class="status-card main-status">
        <div class="status-indicator" style="background-color: {statusColors[getHealthStatus()]}"></div>
        <div class="status-content">
          <h3>System Status</h3>
          <p class="status-value">{getHealthStatus().toUpperCase()}</p>
          <p class="status-detail">
            Uptime: {formatUptime(healthData.system.uptime)} | 
            Environment: {healthData.system.environment}
          </p>
        </div>
      </div>

      <div class="status-card">
        <Icon name="zap" size={24} color={statusColors.healthy} />
        <div class="status-content">
          <h4>Pipeline Success</h4>
          <p class="status-value">{healthData.pipeline.successRate.toFixed(1)}%</p>
          <p class="status-detail">{healthData.pipeline.successfulJobs}/{healthData.pipeline.totalJobs} jobs</p>
        </div>
      </div>

      <div class="status-card">
        <Icon name="users" size={24} color={statusColors.healthy} />
        <div class="status-content">
          <h4>Active Users</h4>
          <p class="status-value">{healthData.performance.activeUsers}</p>
          <p class="status-detail">{healthData.performance.totalRequests} requests</p>
        </div>
      </div>

      <div class="status-card">
        <Icon name="database" size={24} color={statusColors.healthy} />
        <div class="status-content">
          <h4>Total Clips</h4>
          <p class="status-value">{healthData.storage.totalClips}</p>
          <p class="status-detail">
            {formatFileSize(healthData.storage.kvStorageUsed + healthData.storage.r2StorageUsed)}
          </p>
        </div>
      </div>
    </div>

    <!-- Detailed Metrics -->
    <div class="metrics-grid">
      <!-- Pipeline Metrics -->
      <div class="metric-card">
        <div class="metric-header">
          <Icon name="settings" size={20} />
          <h3>Pipeline Health</h3>
        </div>
        <div class="metric-content">
          <div class="metric-row">
            <span>Success Rate</span>
            <span class="metric-value">{healthData.pipeline.successRate.toFixed(1)}%</span>
          </div>
          <div class="metric-row">
            <span>Average Job Time</span>
            <span class="metric-value">{healthData.pipeline.averageJobTime.toFixed(1)}s</span>
          </div>
          <div class="metric-row">
            <span>Jobs in Progress</span>
            <span class="metric-value">{healthData.pipeline.jobsInProgress}</span>
          </div>
          <div class="metric-row">
            <span>Failed Jobs</span>
            <span class="metric-value">{healthData.pipeline.failedJobs}</span>
          </div>
        </div>
      </div>

      <!-- Performance Metrics -->
      <div class="metric-card">
        <div class="metric-header">
          <Icon name="activity" size={20} />
          <h3>Performance</h3>
        </div>
        <div class="metric-content">
          <div class="metric-row">
            <span>Response Time</span>
            <span class="metric-value">{healthData.performance.averageResponseTime}ms</span>
          </div>
          <div class="metric-row">
            <span>Error Rate</span>
            <span class="metric-value">{healthData.performance.errorRate.toFixed(1)}%</span>
          </div>
          <div class="metric-row">
            <span>Active Users</span>
            <span class="metric-value">{healthData.performance.activeUsers}</span>
          </div>
          <div class="metric-row">
            <span>Total Requests</span>
            <span class="metric-value">{healthData.performance.totalRequests}</span>
          </div>
        </div>
      </div>

      <!-- Resource Usage -->
      <div class="metric-card">
        <div class="metric-header">
          <Icon name="cpu" size={20} />
          <h3>Resource Usage</h3>
        </div>
        <div class="metric-content">
          <div class="metric-row">
            <span>KV Operations</span>
            <span class="metric-value">{healthData.resources.kvOperations}</span>
          </div>
          <div class="metric-row">
            <span>R2 Operations</span>
            <span class="metric-value">{healthData.resources.r2Operations}</span>
          </div>
          <div class="metric-row">
            <span>TTS Requests</span>
            <span class="metric-value">{healthData.resources.ttsRequests}</span>
          </div>
          <div class="metric-row">
            <span>DB Queries</span>
            <span class="metric-value">{healthData.resources.dbQueries}</span>
          </div>
        </div>
      </div>

      <!-- Storage Metrics -->
      <div class="metric-card">
        <div class="metric-header">
          <Icon name="hard-drive" size={20} />
          <h3>Storage</h3>
        </div>
        <div class="metric-content">
          <div class="metric-row">
            <span>Total Clips</span>
            <span class="metric-value">{healthData.storage.totalClips}</span>
          </div>
          <div class="metric-row">
            <span>KV Storage</span>
            <span class="metric-value">{formatFileSize(healthData.storage.kvStorageUsed)}</span>
          </div>
          <div class="metric-row">
            <span>R2 Storage</span>
            <span class="metric-value">{formatFileSize(healthData.storage.r2StorageUsed)}</span>
          </div>
          <div class="metric-row">
            <span>Total Storage</span>
            <span class="metric-value">
              {formatFileSize(healthData.storage.kvStorageUsed + healthData.storage.r2StorageUsed)}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Alerts Section -->
    <div class="alerts-section">
      <div class="section-header">
        <h3>Active Alerts</h3>
        <span class="alert-count">{alerts.filter(a => !a.resolved).length} active</span>
      </div>

      {#if alerts.filter(a => !a.resolved).length === 0}
        <div class="no-alerts">
          <Icon name="check-circle" size={48} color={statusColors.healthy} />
          <h4>All Clear!</h4>
          <p>No active alerts at this time.</p>
        </div>
      {:else}
        <div class="alerts-list">
          {#each alerts.filter(a => !a.resolved) as alert}
            <div class="alert-card" class:acknowledged={alert.acknowledged}>
              <div class="alert-header">
                <Icon 
                  name={getAlertIcon(alert.type)} 
                  size={20} 
                  color={getAlertColor(alert.severity)} 
                />
                <div class="alert-info">
                  <h4>{alert.title}</h4>
                  <p class="alert-category">{alert.category} • {alert.severity}</p>
                </div>
                <div class="alert-actions">
                  {#if !alert.acknowledged}
                    <button 
                      class="alert-action-btn"
                      on:click={() => acknowledgeAlert(alert.id)}
                      title="Acknowledge alert"
                    >
                      <Icon name="check" size={16} />
                    </button>
                  {/if}
                  <button 
                    class="alert-action-btn"
                    on:click={() => resolveAlert(alert.id)}
                    title="Resolve alert"
                  >
                    <Icon name="x" size={16} />
                  </button>
                </div>
              </div>
              <p class="alert-message">{alert.message}</p>
              <div class="alert-meta">
                <span class="alert-time">
                  {new Date(alert.timestamp).toLocaleString()}
                </span>
                {#if alert.acknowledged}
                  <span class="alert-ack">Acknowledged</span>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .health-dashboard {
    padding: 1.5rem;
    max-width: 1400px;
    margin: 0 auto;
  }

  .dashboard-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .dashboard-title {
    font-size: 1.875rem;
    font-weight: 700;
    color: var(--color-secondary);
    margin: 0 0 0.5rem 0;
  }

  .dashboard-subtitle {
    color: var(--color-muted);
    margin: 0;
  }

  .header-actions {
    display: flex;
    gap: 0.75rem;
  }

  .refresh-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .refresh-btn:hover {
    border-color: var(--color-primary);
  }

  .refresh-btn.auto {
    background: rgba(29, 185, 84, 0.1);
    border-color: var(--color-primary);
  }

  .refresh-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    background: rgba(255, 107, 107, 0.1);
    border: 2px solid #FF6B6B;
    border-radius: 0.5rem;
    color: #FF6B6B;
    margin-bottom: 1.5rem;
  }

  .retry-btn {
    padding: 0.25rem 0.75rem;
    background: #FF6B6B;
    color: white;
    border: none;
    border-radius: 0.25rem;
    cursor: pointer;
    font-size: 0.875rem;
  }

  .loading-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding: 3rem;
    color: var(--color-muted);
  }

  .status-overview {
    display: grid;
    grid-template-columns: 2fr repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .status-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.75rem;
  }

  .status-card.main-status {
    position: relative;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }

  .status-indicator {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .status-content h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 0.5rem 0;
  }

  .status-content h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-muted);
    margin: 0 0 0.25rem 0;
  }

  .status-value {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0 0 0.25rem 0;
  }

  .status-detail {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0;
  }

  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .metric-card {
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .metric-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .metric-header h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0;
  }

  .metric-content {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .metric-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }

  .metric-row span:first-child {
    color: var(--color-muted);
  }

  .metric-value {
    font-weight: 600;
    color: var(--color-secondary);
  }

  .alerts-section {
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }

  .section-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0;
  }

  .alert-count {
    font-size: 0.875rem;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
  }

  .no-alerts {
    text-align: center;
    padding: 2rem;
  }

  .no-alerts h4 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 1rem 0 0.5rem 0;
  }

  .no-alerts p {
    color: var(--color-muted);
    margin: 0;
  }

  .alerts-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .alert-card {
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: 0.5rem;
    padding: 1rem;
    transition: all 0.2s ease;
  }

  .alert-card.acknowledged {
    opacity: 0.7;
    border-style: dashed;
  }

  .alert-header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .alert-info {
    flex: 1;
  }

  .alert-info h4 {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 0.25rem 0;
  }

  .alert-category {
    font-size: 0.75rem;
    color: var(--color-muted);
    text-transform: capitalize;
    margin: 0;
  }

  .alert-actions {
    display: flex;
    gap: 0.5rem;
  }

  .alert-action-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
    color: var(--color-muted);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .alert-action-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .alert-message {
    font-size: 0.875rem;
    color: var(--color-secondary);
    margin: 0 0 0.5rem 0;
    line-height: 1.4;
  }

  .alert-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .alert-ack {
    background: rgba(29, 185, 84, 0.2);
    color: var(--color-primary);
    padding: 0.25rem 0.5rem;
    border-radius: 0.25rem;
  }

  :global(.spinning) {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 768px) {
    .status-overview {
      grid-template-columns: 1fr;
    }
    
    .metrics-grid {
      grid-template-columns: 1fr;
    }
    
    .dashboard-header {
      flex-direction: column;
      gap: 1rem;
    }
  }
</style> 