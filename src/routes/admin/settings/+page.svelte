<script>
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'
  import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'
  import { apiGet, apiPost } from '$lib/utils/api-monitor'
  
  export let data

  // Settings state
  let loading = true
  let saving = false
  let settings = {
    featureFlags: {
      contentGeneration: true,
      voiceClips: true,
      proFeatures: true,
      analytics: true,
      maintenance: false
    },
    system: {
      maxConcurrentUsers: 1000,
      clipRetentionDays: 30,
      maxClipsPerUser: 50,
      ttsRateLimit: 100 // requests per hour
    },
    content: {
      autoGenerateContent: true,
      contentModerationEnabled: true,
      defaultTopics: ['world-news', 'weather', 'education'],
      proOnlyTopics: ['markets', 'crypto', 'twitter', 'reddit']
    }
  }

  // Load current settings
  async function loadSettings() {
    loading = true
    try {
      const response = await apiGet('/api/v1/admin/settings', {
        timeout: 10000,
        retries: 2
      })
      
      if (response.ok && response.data) {
        settings = { ...settings, ...response.data }
      } else {
        console.error('Failed to load settings:', response.error)
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      loading = false
    }
  }

  // Save settings
  async function saveSettings() {
    saving = true
    try {
      const response = await apiPost('/api/v1/admin/settings', settings)
      
      if (response.ok) {
        trackEvent(AnalyticsEvent.ADMIN_ACTION_PERFORMED, {
          action: 'update_settings',
          settings_updated: Object.keys(settings)
        })
        
        alert('Settings saved successfully!')
      } else {
        throw new Error(response.error || 'Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      alert(`Failed to save settings: ${error.message}`)
    } finally {
      saving = false
    }
  }

  // Handle feature flag toggle
  function toggleFeatureFlag(flag) {
    settings.featureFlags[flag] = !settings.featureFlags[flag]
    settings = { ...settings } // Trigger reactivity
  }

  // Handle system setting change
  function updateSystemSetting(key, value) {
    settings.system[key] = value
    settings = { ...settings }
  }

  // Handle content setting change  
  function updateContentSetting(key, value) {
    settings.content[key] = value
    settings = { ...settings }
  }

  onMount(async () => {
    trackEvent(AnalyticsEvent.ADMIN_DASHBOARD_VIEWED, {
      page: 'settings',
      user_role: data.user?.publicMetadata?.role || 'unknown'
    })
    
    await loadSettings()
  })
</script>

<svelte:head>
  <title>Settings - Admin Dashboard</title>
</svelte:head>

<ErrorBoundary componentName="AdminSettings" fallbackMessage="Admin settings page encountered an error">
  <div class="min-h-screen bg-gray-900 text-white p-6">
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white">Settings</h1>
          <p class="text-gray-400 mt-2">Manage feature flags and system configuration</p>
        </div>
        <div class="flex space-x-4">
          <button
            on:click={loadSettings}
            disabled={loading}
            class="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-800 text-white rounded-lg transition-colors"
          >
            <Icon name="refresh" class="w-4 h-4 mr-2 {loading ? 'animate-spin' : ''}" />
            {loading ? 'Loading...' : 'Reload'}
          </button>
          <button
            on:click={saveSettings}
            disabled={saving || loading}
            class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Icon name="save" class="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <!-- Feature Flags -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div class="p-6 border-b border-gray-700">
          <h3 class="text-lg font-semibold text-white">Feature Flags</h3>
          <p class="text-gray-400 text-sm">Enable or disable features across the platform</p>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            {#each Object.entries(settings.featureFlags) as [flag, enabled]}
              <div class="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 class="font-medium text-white capitalize">
                    {flag.replace(/([A-Z])/g, ' $1').trim()}
                  </h4>
                  <p class="text-sm text-gray-400">
                    {flag === 'contentGeneration' ? 'Automatic content generation pipeline' :
                     flag === 'voiceClips' ? 'Voice clip playback and TTS synthesis' :
                     flag === 'proFeatures' ? 'Pro subscription features and content' :
                     flag === 'analytics' ? 'Analytics tracking and reporting' :
                     flag === 'maintenance' ? 'Maintenance mode (blocks normal usage)' :
                     'Feature description'}
                  </p>
                </div>
                <button
                  on:click={() => toggleFeatureFlag(flag)}
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 {enabled ? 'bg-blue-600' : 'bg-gray-600'}"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {enabled ? 'translate-x-6' : 'translate-x-1'}"
                  />
                </button>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- System Configuration -->
      <div class="bg-gray-800 rounded-lg border border-gray-700 mb-8">
        <div class="p-6 border-b border-gray-700">
          <h3 class="text-lg font-semibold text-white">System Configuration</h3>
          <p class="text-gray-400 text-sm">Core system limits and performance settings</p>
        </div>
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label for="maxConcurrentUsers" class="block text-sm font-medium text-gray-300 mb-2">
                Max Concurrent Users
              </label>
              <input
                id="maxConcurrentUsers"
                type="number"
                bind:value={settings.system.maxConcurrentUsers}
                min="1"
                max="10000"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <p class="text-xs text-gray-400 mt-1">Maximum number of concurrent active users</p>
            </div>
            
            <div>
              <label for="clipRetentionDays" class="block text-sm font-medium text-gray-300 mb-2">
                Clip Retention (Days)
              </label>
              <input
                id="clipRetentionDays"
                type="number"
                bind:value={settings.system.clipRetentionDays}
                min="1"
                max="365"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <p class="text-xs text-gray-400 mt-1">How long to keep generated content clips</p>
            </div>
            
            <div>
              <label for="maxClipsPerUser" class="block text-sm font-medium text-gray-300 mb-2">
                Max Clips Per User
              </label>
              <input
                id="maxClipsPerUser"
                type="number"
                bind:value={settings.system.maxClipsPerUser}
                min="1"
                max="1000"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <p class="text-xs text-gray-400 mt-1">Maximum clips a user can have in queue</p>
            </div>
            
            <div>
              <label for="ttsRateLimit" class="block text-sm font-medium text-gray-300 mb-2">
                TTS Rate Limit (per hour)
              </label>
              <input
                id="ttsRateLimit"
                type="number"
                bind:value={settings.system.ttsRateLimit}
                min="1"
                max="1000"
                class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              />
              <p class="text-xs text-gray-400 mt-1">TTS API requests per hour per user</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Management -->
      <div class="bg-gray-800 rounded-lg border border-gray-700">
        <div class="p-6 border-b border-gray-700">
          <h3 class="text-lg font-semibold text-white">Content Management</h3>
          <p class="text-gray-400 text-sm">Content generation and topic configuration</p>
        </div>
        <div class="p-6">
          <div class="space-y-6">
            <!-- Content Settings -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 class="font-medium text-white">Auto-Generate Content</h4>
                  <p class="text-sm text-gray-400">Automatically create new content clips</p>
                </div>
                <button
                  on:click={() => updateContentSetting('autoGenerateContent', !settings.content.autoGenerateContent)}
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 {settings.content.autoGenerateContent ? 'bg-blue-600' : 'bg-gray-600'}"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {settings.content.autoGenerateContent ? 'translate-x-6' : 'translate-x-1'}"
                  />
                </button>
              </div>
              
              <div class="flex items-center justify-between p-4 bg-gray-750 rounded-lg">
                <div>
                  <h4 class="font-medium text-white">Content Moderation</h4>
                  <p class="text-sm text-gray-400">Filter inappropriate content automatically</p>
                </div>
                <button
                  on:click={() => updateContentSetting('contentModerationEnabled', !settings.content.contentModerationEnabled)}
                  class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 {settings.content.contentModerationEnabled ? 'bg-blue-600' : 'bg-gray-600'}"
                >
                  <span
                    class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform {settings.content.contentModerationEnabled ? 'translate-x-6' : 'translate-x-1'}"
                  />
                </button>
              </div>
            </div>

            <!-- Topic Configuration -->
            <div>
              <h4 class="font-medium text-white mb-3">Default Topics (Free Users)</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                {#each ['world-news', 'local-news', 'weather', 'sports', 'education', 'health'] as topic}
                  <label class="flex items-center space-x-2 p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.content.defaultTopics.includes(topic)}
                      on:change={(e) => {
                        if (e.target.checked) {
                          settings.content.defaultTopics = [...settings.content.defaultTopics, topic]
                        } else {
                          settings.content.defaultTopics = settings.content.defaultTopics.filter(t => t !== topic)
                        }
                      }}
                      class="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span class="text-sm text-white capitalize">{topic.replace('-', ' ')}</span>
                  </label>
                {/each}
              </div>
            </div>

            <div>
              <h4 class="font-medium text-white mb-3">Pro-Only Topics</h4>
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
                {#each ['markets', 'crypto', 'twitter', 'reddit'] as topic}
                  <label class="flex items-center space-x-2 p-3 bg-gray-750 rounded-lg cursor-pointer hover:bg-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={settings.content.proOnlyTopics.includes(topic)}
                      on:change={(e) => {
                        if (e.target.checked) {
                          settings.content.proOnlyTopics = [...settings.content.proOnlyTopics, topic]
                        } else {
                          settings.content.proOnlyTopics = settings.content.proOnlyTopics.filter(t => t !== topic)
                        }
                      }}
                      class="rounded border-gray-600 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span class="text-sm text-white capitalize flex items-center">
                      {topic.replace('-', ' ')}
                      <Icon name="crown" class="w-3 h-3 ml-1 text-yellow-400" />
                    </span>
                  </label>
                {/each}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</ErrorBoundary> 