<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { IconSettings, IconMoon, IconSun, IconPalette, IconBell, IconBellOff } from "@tabler/icons-svelte";

  const PREFERENCES_KEY = "UserPreferences";
  const DEFAULT_PREFERENCES = {
    autoSave: true,
    voiceContent: true,
    notifications: false,
    theme: "dark",
    narrationSpeed: 1.0,
    enabledTopics: [
      "world-news",
      "local-news", 
      "weather",
      "education",
      "health"
    ],
    ambientSounds: true,
    vinylEffects: false,
  };

  let preferences = DEFAULT_PREFERENCES;

  onMount(() => {
    if (!browser) return;
    
    // Load saved preferences from localStorage
    const savedPreferences = localStorage.getItem(PREFERENCES_KEY);
    if (savedPreferences) {
      preferences = { ...DEFAULT_PREFERENCES, ...JSON.parse(savedPreferences) };
    }
  });

  function updatePreference(key: string, value: any) {
    preferences[key] = value;
    
    if (browser) {
      localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
    }
  }

  function toggleTopic(topicId: string) {
    const currentTopics = [...preferences.enabledTopics];
    const topicIndex = currentTopics.indexOf(topicId);
    
    if (topicIndex > -1) {
      currentTopics.splice(topicIndex, 1);
    } else {
      currentTopics.push(topicId);
    }
    
    updatePreference('enabledTopics', currentTopics);
  }

  const availableTopics = [
    { id: 'world-news', label: 'World News', description: 'Global news updates', free: true },
    { id: 'local-news', label: 'Local News', description: 'Regional news', free: true },
    { id: 'weather', label: 'Weather', description: 'Weather forecasts', free: true },
    { id: 'sports', label: 'Sports', description: 'Sports highlights', free: true },
    { id: 'education', label: 'Education', description: 'Learning content', free: true },
    { id: 'health', label: 'Health', description: 'Health tips', free: true },
    { id: 'markets', label: 'Markets', description: 'Financial markets', free: false },
    { id: 'crypto', label: 'Crypto', description: 'Cryptocurrency news', free: false },
    { id: 'social', label: 'Social Buzz', description: 'Trending topics', free: false },
    { id: 'reddit', label: 'Reddit', description: 'Popular Reddit posts', free: false },
  ];

  const themes = [
    { id: 'dark', label: 'Dark', icon: IconMoon },
    { id: 'light', label: 'Light', icon: IconSun },
    { id: 'auto', label: 'Auto', icon: IconPalette },
  ];

  const narrationSpeeds = [
    { value: 0.8, label: 'Slow' },
    { value: 1.0, label: 'Normal' },
    { value: 1.2, label: 'Fast' },
    { value: 1.5, label: 'Very Fast' },
  ];
</script>

<div class="control-panel">
  <!-- General Settings -->
  <div class="settings-section">
    <h4 class="section-title">
      <IconSettings size={16} />
      General Settings
    </h4>
    
    <div class="setting-item">
      <div class="setting-info">
        <span class="setting-label">Auto-save preferences</span>
        <span class="setting-description">Save settings automatically</span>
      </div>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          bind:checked={preferences.autoSave}
          on:change={() => updatePreference('autoSave', preferences.autoSave)}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <span class="setting-label">Voice content</span>
        <span class="setting-description">Enable voice narration</span>
      </div>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          bind:checked={preferences.voiceContent}
          on:change={() => updatePreference('voiceContent', preferences.voiceContent)}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <span class="setting-label">Notifications</span>
        <span class="setting-description">Breaking news alerts</span>
      </div>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          bind:checked={preferences.notifications}
          on:change={() => updatePreference('notifications', preferences.notifications)}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <span class="setting-label">Ambient sounds</span>
        <span class="setting-description">Background nature sounds</span>
      </div>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          bind:checked={preferences.ambientSounds}
          on:change={() => updatePreference('ambientSounds', preferences.ambientSounds)}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>

    <div class="setting-item">
      <div class="setting-info">
        <span class="setting-label">Vinyl effects</span>
        <span class="setting-description">Nostalgic crackling sounds</span>
      </div>
      <label class="toggle-switch">
        <input 
          type="checkbox" 
          bind:checked={preferences.vinylEffects}
          on:change={() => updatePreference('vinylEffects', preferences.vinylEffects)}
        />
        <span class="toggle-slider"></span>
      </label>
    </div>
  </div>

  <!-- Theme Selection -->
  <div class="settings-section">
    <h4 class="section-title">Theme</h4>
    <div class="theme-selection">
      {#each themes as theme}
        <button 
          class="theme-button"
          class:active={preferences.theme === theme.id}
          on:click={() => updatePreference('theme', theme.id)}
        >
          <svelte:component this={theme.icon} size={18} />
          {theme.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Narration Speed -->
  <div class="settings-section">
    <h4 class="section-title">Narration Speed</h4>
    <div class="speed-controls">
      {#each narrationSpeeds as speed}
        <button 
          class="speed-button"
          class:active={preferences.narrationSpeed === speed.value}
          on:click={() => updatePreference('narrationSpeed', speed.value)}
        >
          {speed.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Content Topics -->
  <div class="settings-section">
    <h4 class="section-title">Content Topics</h4>
    <div class="topics-grid">
      {#each availableTopics as topic}
        <label class="topic-item" class:pro={!topic.free}>
          <input 
            type="checkbox" 
            checked={preferences.enabledTopics.includes(topic.id)}
            on:change={() => toggleTopic(topic.id)}
            disabled={!topic.free}
          />
          <div class="topic-content">
            <span class="topic-label">
              {topic.label}
              {#if !topic.free}
                <span class="pro-badge">PRO</span>
              {/if}
            </span>
            <span class="topic-description">{topic.description}</span>
          </div>
        </label>
      {/each}
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="settings-section">
    <h4 class="section-title">Quick Actions</h4>
    <div class="action-buttons">
      <button 
        class="action-button"
        on:click={() => {
          // Reset to defaults
          preferences = { ...DEFAULT_PREFERENCES };
          updatePreference('reset', true);
        }}
      >
        Reset to Defaults
      </button>
      <button 
        class="action-button primary"
        on:click={() => {
          // Export preferences
          const blob = new Blob([JSON.stringify(preferences, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'lofi-radio-preferences.json';
          a.click();
          URL.revokeObjectURL(url);
        }}
      >
        Export Settings
      </button>
    </div>
  </div>
</div>

<style>
  .control-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .setting-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 0;
    border-bottom: 1px solid var(--color-accent);
  }

  .setting-item:last-child {
    border-bottom: none;
  }

  .setting-info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .setting-label {
    font-size: 0.875rem;
    color: var(--color-secondary);
    font-weight: 500;
  }

  .setting-description {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  /* Toggle Switch */
  .toggle-switch {
    position: relative;
    width: 2.5rem;
    height: 1.25rem;
    cursor: pointer;
  }

  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .toggle-slider {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--color-accent);
    border-radius: 1.25rem;
    transition: 0.3s;
  }

  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 1rem;
    width: 1rem;
    left: 0.125rem;
    bottom: 0.125rem;
    background: var(--color-secondary);
    border-radius: 50%;
    transition: 0.3s;
  }

  input:checked + .toggle-slider {
    background: var(--color-primary);
  }

  input:checked + .toggle-slider:before {
    transform: translateX(1.25rem);
  }

  /* Theme Selection */
  .theme-selection {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .theme-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-secondary);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .theme-button.active {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
  }

  .theme-button:hover:not(.active) {
    background: var(--color-accent);
  }

  /* Speed Controls */
  .speed-controls {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .speed-button {
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-secondary);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .speed-button.active {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
  }

  .speed-button:hover:not(.active) {
    background: var(--color-accent);
  }

  /* Topics Grid */
  .topics-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }

  .topic-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .topic-item.pro {
    opacity: 0.6;
  }

  .topic-item:hover:not(.pro) {
    background: var(--color-accent);
  }

  .topic-item input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
    accent-color: var(--color-primary);
  }

  .topic-content {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .topic-label {
    font-size: 0.875rem;
    color: var(--color-secondary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .topic-description {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .pro-badge {
    background: var(--color-primary);
    color: #000000;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 600;
  }

  /* Action Buttons */
  .action-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .action-button {
    padding: 0.75rem 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-secondary);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .action-button.primary {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
  }

  .action-button:hover {
    background: var(--color-accent);
  }

  .action-button.primary:hover {
    background: var(--color-primary-hover);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .control-panel {
      gap: 1rem;
    }

    .setting-item {
      gap: 0.75rem;
    }

    .theme-selection,
    .speed-controls {
      gap: 0.375rem;
    }

    .theme-button,
    .speed-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }

    .action-buttons {
      flex-direction: column;
    }

    .action-button {
      width: 100%;
    }
  }
</style> 