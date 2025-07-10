<script>
  import { onMount } from 'svelte'
  import Icon from '$lib/components/Icon.svelte'
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'
  import { trackEvent, AnalyticsEvent } from '$lib/services/analytics'
  import { apiGet, apiPost, apiDelete } from '$lib/utils/api-monitor'

  export let data

  // Content state
  let contentClips = []
  let contentSources = []
  let generationQueue = []
  
  // UI state
  let loading = true
  let activeTab = 'clips' // clips, sources, queue, generate
  let selectedClips = new Set()
  let showSourceModal = false
  let showGenerateModal = false

  // Content source form
  let newSource = {
    name: '',
    type: 'rss', // rss, api, manual
    url: '',
    category: 'news', // news, weather, education, entertainment
    enabled: true,
    fetchInterval: 3600, // 1 hour default
    maxItems: 10
  }

  // Manual generation form
  let manualGeneration = {
    topic: '',
    category: 'news',
    content: '',
    voice: 'default',
    priority: 'normal' // low, normal, high
  }

  // Pagination
  let currentPage = 1
  let itemsPerPage = 20
  let totalItems = 0

  // Load content data
  async function loadContent() {
    loading = true
    try {
      const [clipsResponse, sourcesResponse, queueResponse] = await Promise.all([
        apiGet(`/api/v1/admin/content/clips?page=${currentPage}&limit=${itemsPerPage}`),
        apiGet('/api/v1/admin/content/sources'),
        apiGet('/api/v1/admin/content/queue')
      ])

      if (clipsResponse.ok) {
        contentClips = clipsResponse.data?.clips || []
        totalItems = clipsResponse.data?.total || 0
      }

      if (sourcesResponse.ok) {
        contentSources = sourcesResponse.data?.sources || []
      }

      if (queueResponse.ok) {
        generationQueue = queueResponse.data?.queue || []
      }
    } catch (error) {
      console.error('Error loading content:', error)
      // Use mock data for development
      loadMockData()
    } finally {
      loading = false
    }
  }

  // Load mock data for development
  function loadMockData() {
    contentClips = [
      {
        id: '1',
        title: 'Tech News Update: AI Breakthrough',
        category: 'news',
        status: 'published',
        duration: 45,
        size: 1.2,
        voice: 'default',
        createdAt: '2024-01-09T10:30:00Z',
        playCount: 234
      },
      {
        id: '2',
        title: 'Weather Forecast for Today',
        category: 'weather',
        status: 'generating',
        duration: 30,
        size: 0.8,
        voice: 'weather',
        createdAt: '2024-01-09T09:15:00Z',
        playCount: 0
      },
      {
        id: '3',
        title: 'Educational: Space Exploration',
        category: 'education',
        status: 'published',
        duration: 60,
        size: 1.5,
        voice: 'educational',
        createdAt: '2024-01-09T08:00:00Z',
        playCount: 156
      }
    ]

    contentSources = [
      {
        id: '1',
        name: 'TechCrunch RSS',
        type: 'rss',
        url: 'https://techcrunch.com/feed/',
        category: 'news',
        enabled: true,
        lastFetch: '2024-01-09T11:00:00Z',
        itemsGenerated: 45,
        status: 'active'
      },
      {
        id: '2',
        name: 'Weather API',
        type: 'api',
        url: 'https://api.weather.gov/',
        category: 'weather',
        enabled: true,
        lastFetch: '2024-01-09T10:30:00Z',
        itemsGenerated: 12,
        status: 'active'
      },
      {
        id: '3',
        name: 'Educational Content Feed',
        type: 'rss',
        url: 'https://example.edu/feed/',
        category: 'education',
        enabled: false,
        lastFetch: '2024-01-08T15:00:00Z',
        itemsGenerated: 23,
        status: 'disabled'
      }
    ]

    generationQueue = [
      {
        id: '1',
        title: 'Breaking: Technology News',
        category: 'news',
        status: 'processing',
        priority: 'high',
        progress: 75,
        estimatedTime: 120,
        createdAt: '2024-01-09T11:15:00Z'
      },
      {
        id: '2',
        title: 'Daily Weather Update',
        category: 'weather',
        status: 'queued',
        priority: 'normal',
        progress: 0,
        estimatedTime: 180,
        createdAt: '2024-01-09T11:10:00Z'
      }
    ]
  }

  // Delete selected clips
  async function deleteSelectedClips() {
    if (selectedClips.size === 0) return

    const clipIds = Array.from(selectedClips)
    
    try {
      const promises = clipIds.map(id => apiDelete(`/api/v1/admin/content/clips/${id}`))
      await Promise.all(promises)
      
      // Remove from local state
      contentClips = contentClips.filter(clip => !selectedClips.has(clip.id))
      selectedClips.clear()
      
      trackEvent(AnalyticsEvent.ADMIN_ACTION_PERFORMED, {
        action: 'delete_clips',
        clip_count: clipIds.length
      })
    } catch (error) {
      console.error('Error deleting clips:', error)
    }
  }

  // Add new content source
  async function addContentSource() {
    try {
      const response = await apiPost('/api/v1/admin/content/sources', newSource)
      
      if (response.ok) {
        contentSources = [...contentSources, response.data]
        resetSourceForm()
        showSourceModal = false
        
        trackEvent(AnalyticsEvent.ADMIN_ACTION_PERFORMED, {
          action: 'add_content_source',
          source_type: newSource.type,
          source_category: newSource.category
        })
      }
    } catch (error) {
      console.error('Error adding source:', error)
    }
  }

  // Generate manual content
  async function generateManualContent() {
    try {
      const response = await apiPost('/api/v1/admin/content/generate', manualGeneration)
      
      if (response.ok) {
        generationQueue = [...generationQueue, response.data]
        resetGenerationForm()
        showGenerateModal = false
        
        trackEvent(AnalyticsEvent.ADMIN_ACTION_PERFORMED, {
          action: 'generate_manual_content',
          category: manualGeneration.category,
          priority: manualGeneration.priority
        })
      }
    } catch (error) {
      console.error('Error generating content:', error)
    }
  }

  // Toggle source enabled status
  async function toggleSource(sourceId) {
    try {
      const source = contentSources.find(s => s.id === sourceId)
      if (!source) return

      const response = await apiPost(`/api/v1/admin/content/sources/${sourceId}/toggle`)
      
      if (response.ok) {
        source.enabled = !source.enabled
        source.status = source.enabled ? 'active' : 'disabled'
        contentSources = [...contentSources]
        
        trackEvent(AnalyticsEvent.ADMIN_ACTION_PERFORMED, {
          action: 'toggle_content_source',
          source_id: sourceId,
          enabled: source.enabled
        })
      }
    } catch (error) {
      console.error('Error toggling source:', error)
    }
  }

  // Reset forms
  function resetSourceForm() {
    newSource = {
      name: '',
      type: 'rss',
      url: '',
      category: 'news',
      enabled: true,
      fetchInterval: 3600,
      maxItems: 10
    }
  }

  function resetGenerationForm() {
    manualGeneration = {
      topic: '',
      category: 'news',
      content: '',
      voice: 'default',
      priority: 'normal'
    }
  }

  // Format utilities
  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function formatDuration(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  function formatFileSize(sizeInMB) {
    return `${sizeInMB.toFixed(1)} MB`
  }

  function getStatusColor(status) {
    switch (status) {
      case 'published': return 'text-green-400 bg-green-900/20'
      case 'generating': return 'text-yellow-400 bg-yellow-900/20'
      case 'processing': return 'text-blue-400 bg-blue-900/20'
      case 'queued': return 'text-gray-400 bg-gray-900/20'
      case 'failed': return 'text-red-400 bg-red-900/20'
      case 'active': return 'text-green-400 bg-green-900/20'
      case 'disabled': return 'text-gray-400 bg-gray-900/20'
      default: return 'text-gray-400 bg-gray-900/20'
    }
  }

  function getPriorityColor(priority) {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'normal': return 'text-blue-400'
      case 'low': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  onMount(async () => {
    // Track content management page view
    trackEvent(AnalyticsEvent.ADMIN_DASHBOARD_VIEWED, {
      page: 'content',
      user_role: data.user?.publicMetadata?.role || 'unknown'
    })
    
    await loadContent()
  })
</script>

<svelte:head>
  <title>Content Management - Admin Dashboard</title>
</svelte:head>

<ErrorBoundary componentName="ContentManagement" fallbackMessage="Content management interface encountered an error">
  <div class="min-h-screen bg-gray-900 text-white p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8">
        <div>
          <h1 class="text-3xl font-bold text-white">Content Management</h1>
          <p class="text-gray-400 mt-2">Manage clips, sources, and content generation</p>
        </div>
        <div class="flex space-x-4">
          <button
            on:click={() => showSourceModal = true}
            class="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Icon name="plus" class="w-4 h-4 mr-2" />
            Add Source
          </button>
          <button
            on:click={() => showGenerateModal = true}
            class="flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Icon name="microphone" class="w-4 h-4 mr-2" />
            Generate Content
          </button>
          <button
            on:click={loadContent}
            disabled={loading}
            class="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
          >
            <Icon name="refresh" class="w-4 h-4 mr-2 {loading ? 'animate-spin' : ''}" />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="border-b border-gray-700 mb-6">
        <nav class="flex space-x-8">
          <button
            on:click={() => activeTab = 'clips'}
            class="py-2 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'clips' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}"
          >
            Content Clips ({contentClips.length})
          </button>
          <button
            on:click={() => activeTab = 'sources'}
            class="py-2 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'sources' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}"
          >
            Content Sources ({contentSources.length})
          </button>
          <button
            on:click={() => activeTab = 'queue'}
            class="py-2 px-1 border-b-2 font-medium text-sm transition-colors {activeTab === 'queue' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400 hover:text-gray-300'}"
          >
            Generation Queue ({generationQueue.length})
          </button>
        </nav>
      </div>

      <!-- Content Clips Tab -->
      {#if activeTab === 'clips'}
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <!-- Clips Header -->
          <div class="p-6 border-b border-gray-700">
            <div class="flex justify-between items-center">
              <h3 class="text-lg font-semibold text-white">Content Clips</h3>
              <div class="flex space-x-2">
                {#if selectedClips.size > 0}
                  <button
                    on:click={deleteSelectedClips}
                    class="flex items-center px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                  >
                    <Icon name="trash" class="w-4 h-4 mr-1" />
                    Delete ({selectedClips.size})
                  </button>
                {/if}
              </div>
            </div>
          </div>

          <!-- Clips Table -->
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-750">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      class="rounded border-gray-600 bg-gray-700 text-blue-600"
                      on:change={(e) => {
                        if (e.target.checked) {
                          selectedClips = new Set(contentClips.map(c => c.id))
                        } else {
                          selectedClips.clear()
                        }
                        selectedClips = selectedClips
                      }}
                    />
                  </th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Content</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Category</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Plays</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-700">
                {#each contentClips as clip}
                  <tr class="hover:bg-gray-750">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        class="rounded border-gray-600 bg-gray-700 text-blue-600"
                        checked={selectedClips.has(clip.id)}
                        on:change={(e) => {
                          if (e.target.checked) {
                            selectedClips.add(clip.id)
                          } else {
                            selectedClips.delete(clip.id)
                          }
                          selectedClips = selectedClips
                        }}
                      />
                    </td>
                    <td class="px-6 py-4">
                      <div class="max-w-xs">
                        <div class="text-sm font-medium text-white truncate">{clip.title}</div>
                        <div class="text-xs text-gray-400">Voice: {clip.voice} • {formatFileSize(clip.size)}</div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300 capitalize">
                        {clip.category}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(clip.status)}">
                        {clip.status.toUpperCase()}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDuration(clip.duration)}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {clip.playCount.toLocaleString()}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(clip.createdAt)}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Pagination -->
          {#if totalItems > itemsPerPage}
            <div class="px-6 py-3 border-t border-gray-700 flex justify-between items-center">
              <div class="text-sm text-gray-400">
                Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} clips
              </div>
              <div class="flex space-x-2">
                <button
                  disabled={currentPage === 1}
                  on:click={() => { currentPage--; loadContent() }}
                  class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded transition-colors"
                >
                  Previous
                </button>
                <button
                  disabled={currentPage * itemsPerPage >= totalItems}
                  on:click={() => { currentPage++; loadContent() }}
                  class="px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 text-white rounded transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      <!-- Content Sources Tab -->
      {#if activeTab === 'sources'}
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Content Sources</h3>
          </div>
          
          <div class="divide-y divide-gray-700">
            {#each contentSources as source}
              <div class="p-6 hover:bg-gray-750 transition-colors">
                <div class="flex items-center justify-between">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-white">{source.name}</h4>
                      <span class="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">
                        {source.type.toUpperCase()}
                      </span>
                      <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(source.status)}">
                        {source.status.toUpperCase()}
                      </span>
                    </div>
                    <p class="text-gray-400 text-sm mb-2">{source.url}</p>
                    <div class="flex items-center space-x-4 text-xs text-gray-400">
                      <span>Category: {source.category}</span>
                      <span>Generated: {source.itemsGenerated} items</span>
                      <span>Last fetch: {formatDate(source.lastFetch)}</span>
                    </div>
                  </div>
                  <div class="flex items-center space-x-3">
                    <button
                      on:click={() => toggleSource(source.id)}
                      class="px-3 py-1 text-sm rounded transition-colors {source.enabled ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}"
                    >
                      {source.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Generation Queue Tab -->
      {#if activeTab === 'queue'}
        <div class="bg-gray-800 rounded-lg border border-gray-700">
          <div class="p-6 border-b border-gray-700">
            <h3 class="text-lg font-semibold text-white">Generation Queue</h3>
          </div>
          
          <div class="divide-y divide-gray-700">
            {#each generationQueue as item}
              <div class="p-6">
                <div class="flex items-center justify-between mb-3">
                  <div class="flex-1">
                    <div class="flex items-center space-x-3 mb-2">
                      <h4 class="font-medium text-white">{item.title}</h4>
                      <span class="px-2 py-1 text-xs font-medium rounded-full {getStatusColor(item.status)}">
                        {item.status.toUpperCase()}
                      </span>
                      <span class="text-xs font-medium {getPriorityColor(item.priority)}">
                        {item.priority.toUpperCase()} PRIORITY
                      </span>
                    </div>
                    <p class="text-gray-400 text-sm">Category: {item.category} • ETA: {Math.floor(item.estimatedTime / 60)}m</p>
                  </div>
                  <div class="text-right">
                    <div class="text-sm text-gray-300">{item.progress}%</div>
                    <div class="text-xs text-gray-400">{formatDate(item.createdAt)}</div>
                  </div>
                </div>
                
                {#if item.status === 'processing' && item.progress > 0}
                  <div class="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      class="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style="width: {item.progress}%"
                    ></div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <!-- Add Source Modal -->
  {#if showSourceModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-4">Add Content Source</h3>
        
        <div class="space-y-4">
          <div>
            <label for="newSourceName" class="block text-sm font-medium text-gray-300 mb-1">Name</label>
            <input
              id="newSourceName"
              type="text"
              bind:value={newSource.name}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="Source name"
            />
          </div>
          
          <div>
            <label for="newSourceType" class="block text-sm font-medium text-gray-300 mb-1">Type</label>
            <select
              id="newSourceType"
              bind:value={newSource.type}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="rss">RSS Feed</option>
              <option value="api">API Endpoint</option>
              <option value="manual">Manual Entry</option>
            </select>
          </div>
          
          <div>
            <label for="newSourceUrl" class="block text-sm font-medium text-gray-300 mb-1">URL</label>
            <input
              id="newSourceUrl"
              type="url"
              bind:value={newSource.url}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="https://example.com/feed"
            />
          </div>
          
          <div>
            <label for="newSourceCategory" class="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              id="newSourceCategory"
              bind:value={newSource.category}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="news">News</option>
              <option value="weather">Weather</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            on:click={() => { showSourceModal = false; resetSourceForm() }}
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={addContentSource}
            class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Add Source
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Generate Content Modal -->
  {#if showGenerateModal}
    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div class="bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-700">
        <h3 class="text-lg font-semibold text-white mb-4">Generate Content</h3>
        
        <div class="space-y-4">
          <div>
            <label for="manualGenerationTopic" class="block text-sm font-medium text-gray-300 mb-1">Topic</label>
            <input
              id="manualGenerationTopic"
              type="text"
              bind:value={manualGeneration.topic}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              placeholder="Content topic"
            />
          </div>
          
          <div>
            <label for="manualGenerationCategory" class="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              id="manualGenerationCategory"
              bind:value={manualGeneration.category}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="news">News</option>
              <option value="weather">Weather</option>
              <option value="education">Education</option>
              <option value="entertainment">Entertainment</option>
            </select>
          </div>
          
          <div>
            <label for="manualGenerationContent" class="block text-sm font-medium text-gray-300 mb-1">Content</label>
            <textarea
              id="manualGenerationContent"
              bind:value={manualGeneration.content}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
              rows="3"
              placeholder="Content to synthesize"
            ></textarea>
          </div>
          
          <div>
            <label for="manualGenerationPriority" class="block text-sm font-medium text-gray-300 mb-1">Priority</label>
            <select
              id="manualGenerationPriority"
              bind:value={manualGeneration.priority}
              class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            on:click={() => { showGenerateModal = false; resetGenerationForm() }}
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            on:click={generateManualContent}
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  {/if}
</ErrorBoundary> 