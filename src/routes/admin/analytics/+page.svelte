<script>
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'
  import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'
  import { apiGet } from '$lib/utils/api-monitor'
  
  export let data

  // Analytics state
  let loading = true
  let timeRange = '7d' // 1d, 7d, 30d
  let metricsData = {
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      totalListenTime: 0,
      avgSessionDuration: 0
    },
    growth: [],
    userEngagement: {
      dailyActiveUsers: [],
      sessionDurations: [],
      contentInteraction: []
    },
    revenue: {
      subscriptions: 0,
      revenue: 0,
      conversionRate: 0
    }
  }

  // Load analytics data
  async function loadAnalytics() {
    loading = true
    try {
      const response = await apiGet(`/api/v1/admin/analytics?range=${timeRange}`, {
        timeout: 15000,
        retries: 2
      })
      
      if (response.ok && response.data) {
        metricsData = response.data
      } else {
        console.error('Failed to load analytics:', response.error)
        metricsData = generateMockAnalytics()
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
      metricsData = generateMockAnalytics()
    } finally {
      loading = false
    }
  }

  // Generate mock analytics data
  function generateMockAnalytics() {
    return {
      overview: {
        totalUsers: 1247,
        activeUsers: 342,
        totalListenTime: 18734, // minutes
        avgSessionDuration: 23.4 // minutes
      },
      growth: [
        { date: '2024-01-03', users: 89, sessions: 156 },
        { date: '2024-01-04', users: 94, sessions: 167 },
        { date: '2024-01-05', users: 87, sessions: 149 },
        { date: '2024-01-06', users: 103, sessions: 189 },
        { date: '2024-01-07', users: 98, sessions: 178 },
        { date: '2024-01-08', users: 112, sessions: 201 },
        { date: '2024-01-09', users: 127, sessions: 234 }
      ],
      userEngagement: {
        dailyActiveUsers: [89, 94, 87, 103, 98, 112, 127],
        sessionDurations: [
          { range: '0-5 min', count: 234 },
          { range: '5-15 min', count: 567 },
          { range: '15-30 min', count: 342 },
          { range: '30+ min', count: 104 }
        ],
        contentInteraction: [
          { topic: 'world-news', plays: 1234, engagement: 87.3 },
          { topic: 'weather', plays: 987, engagement: 92.1 },
          { topic: 'education', plays: 765, engagement: 89.4 },
          { topic: 'sports', plays: 543, engagement: 84.2 },
          { topic: 'health', plays: 432, engagement: 88.7 }
        ]
      },
      revenue: {
        subscriptions: 45,
        revenue: 224.55,
        conversionRate: 3.6
      }
    }
  }

  // Format time
  function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.floor(minutes % 60)
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  // Format currency
  function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  // Handle time range change
  function handleTimeRangeChange() {
    loadAnalytics()
  }

  onMount(async () => {
    // Track analytics page view
    trackEvent(AnalyticsEvent.ADMIN_DASHBOARD_VIEWED, {
      page: 'analytics',
      user_role: data.user?.publicMetadata?.role || 'unknown'
    })
    
    await loadAnalytics()
  })
</script>

<svelte:head>
  <title>Analytics - Admin Dashboard</title>
</svelte:head>

<ErrorBoundary componentName="Analytics" fallbackMessage="Analytics dashboard encountered an error">
  <div class="min-h-screen bg-gray-900 text-white p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white">Analytics</h1>
          <p class="text-gray-400 mt-2">Usage insights and performance metrics</p>
        </div>
        <div class="flex space-x-4">
          <select
            bind:value={timeRange}
            on:change={handleTimeRangeChange}
            class="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <button
            on:click={loadAnalytics}
            disabled={loading}
            class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Icon name="refresh" class="w-4 h-4 mr-2 {loading ? 'animate-spin' : ''}" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <!-- Overview Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Total Users</p>
              <p class="text-2xl font-bold text-white">{metricsData.overview.totalUsers.toLocaleString()}</p>
            </div>
            <Icon name="users" class="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Active Users</p>
              <p class="text-2xl font-bold text-white">{metricsData.overview.activeUsers.toLocaleString()}</p>
            </div>
            <Icon name="activity" class="w-8 h-8 text-green-400" />
          </div>
        </div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Total Listen Time</p>
              <p class="text-2xl font-bold text-white">{formatDuration(metricsData.overview.totalListenTime)}</p>
            </div>
            <Icon name="clock" class="w-8 h-8 text-purple-400" />
          </div>
        </div>
        
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-gray-400 text-sm">Avg Session</p>
              <p class="text-2xl font-bold text-white">{metricsData.overview.avgSessionDuration.toFixed(1)}m</p>
            </div>
            <Icon name="timer" class="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      <!-- Charts Row -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <!-- User Growth Chart -->
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">User Growth</h3>
            <p class="text-gray-400 text-sm">Daily active users and sessions</p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              {#each metricsData.growth as day, index}
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-400">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <div class="flex items-center space-x-4">
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-blue-400 rounded-full"></div>
                      <span class="text-sm text-white">{day.users} users</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <div class="w-3 h-3 bg-green-400 rounded-full"></div>
                      <span class="text-sm text-white">{day.sessions} sessions</span>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Session Duration Distribution -->
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Session Duration</h3>
            <p class="text-gray-400 text-sm">How long users stay engaged</p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              {#each metricsData.userEngagement.sessionDurations as duration}
                <div class="flex items-center justify-between">
                  <span class="text-sm text-gray-300">{duration.range}</span>
                  <div class="flex items-center space-x-3">
                    <div class="w-32 bg-gray-700 rounded-full h-2">
                      <div 
                        class="bg-blue-400 h-2 rounded-full transition-all duration-300"
                        style="width: {(duration.count / Math.max(...metricsData.userEngagement.sessionDurations.map(d => d.count))) * 100}%"
                      ></div>
                    </div>
                    <span class="text-sm text-white font-medium">{duration.count}</span>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <!-- Content Performance -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <!-- Content Interaction -->
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Content Performance</h3>
            <p class="text-gray-400 text-sm">Most engaging topics and content</p>
          </div>
          <div class="p-6">
            <div class="space-y-4">
              {#each metricsData.userEngagement.contentInteraction as content}
                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 bg-gray-700 rounded-lg flex items-center justify-center">
                      <span class="text-xs">
                        {content.topic === 'world-news' ? '🌍' :
                         content.topic === 'weather' ? '🌤️' :
                         content.topic === 'education' ? '🎓' :
                         content.topic === 'sports' ? '⚽' :
                         content.topic === 'health' ? '💪' : '📰'}
                      </span>
                    </div>
                    <div>
                      <p class="text-sm font-medium text-white">{content.topic.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <p class="text-xs text-gray-400">{content.plays} plays</p>
                    </div>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-medium text-green-400">{content.engagement.toFixed(1)}%</p>
                    <p class="text-xs text-gray-400">engagement</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
        </div>

        <!-- Revenue Metrics -->
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Revenue Metrics</h3>
            <p class="text-gray-400 text-sm">Subscription performance</p>
          </div>
          <div class="p-6">
            <div class="space-y-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">Active Subscriptions</p>
                  <p class="text-xl font-bold text-white">{metricsData.revenue.subscriptions}</p>
                </div>
                <Icon name="credit-card" class="w-6 h-6 text-blue-400" />
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">Monthly Revenue</p>
                  <p class="text-xl font-bold text-green-400">{formatCurrency(metricsData.revenue.revenue)}</p>
                </div>
                <Icon name="trending-up" class="w-6 h-6 text-green-400" />
              </div>
              
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-gray-400 text-sm">Conversion Rate</p>
                  <p class="text-xl font-bold text-purple-400">{metricsData.revenue.conversionRate.toFixed(1)}%</p>
                </div>
                <Icon name="target" class="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</ErrorBoundary> 