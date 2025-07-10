<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from './Icon.svelte';

  export let currentPreset = 'balanced';
  export let isVisible = false;

  const dispatch = createEventDispatcher();

  interface StylePreset {
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    settings: {
      bpm: number;
      melodyDensity: number;
      progressionLength: number;
      swing: number;
      kickPattern: 'standard' | 'minimal' | 'heavy';
      snarePattern: 'standard' | 'minimal' | 'jazzy';
      hatPattern: 'standard' | 'minimal' | 'busy';
      chordVoicing: 'simple' | 'extended' | 'jazz';
      filterCutoff: number;
      compression: 'light' | 'medium' | 'heavy';
    };
  }

  const stylePresets: StylePreset[] = [
    {
      id: 'chillhop',
      name: 'Chillhop',
      description: 'Relaxed hip-hop beats with warm chords',
      icon: '🎧',
      color: '#FF6B6B',
      settings: {
        bpm: 85,
        melodyDensity: 0.4,
        progressionLength: 8,
        swing: 1.2,
        kickPattern: 'standard',
        snarePattern: 'standard',
        hatPattern: 'standard',
        chordVoicing: 'extended',
        filterCutoff: 2500,
        compression: 'medium'
      }
    },
    {
      id: 'jazzhop',
      name: 'Jazzhop',
      description: 'Jazz-influenced with complex harmonies',
      icon: '🎷',
      color: '#4ECDC4',
      settings: {
        bpm: 70,
        melodyDensity: 0.6,
        progressionLength: 8,
        swing: 1.8,
        kickPattern: 'minimal',
        snarePattern: 'jazzy',
        hatPattern: 'busy',
        chordVoicing: 'jazz',
        filterCutoff: 3000,
        compression: 'light'
      }
    },
    {
      id: 'ambient',
      name: 'Ambient',
      description: 'Spacious and atmospheric',
      icon: '🌙',
      color: '#A8E6CF',
      settings: {
        bpm: 60,
        melodyDensity: 0.2,
        progressionLength: 12,
        swing: 1.0,
        kickPattern: 'minimal',
        snarePattern: 'minimal',
        hatPattern: 'minimal',
        chordVoicing: 'extended',
        filterCutoff: 1800,
        compression: 'light'
      }
    },
    {
      id: 'balanced',
      name: 'Balanced',
      description: 'Classic lo-fi sound',
      icon: '⚖️',
      color: '#FFB347',
      settings: {
        bpm: 70,
        melodyDensity: 0.33,
        progressionLength: 8,
        swing: 1.0,
        kickPattern: 'standard',
        snarePattern: 'standard',
        hatPattern: 'standard',
        chordVoicing: 'simple',
        filterCutoff: 2000,
        compression: 'medium'
      }
    },
    {
      id: 'upbeat',
      name: 'Upbeat',
      description: 'Energetic and driving',
      icon: '⚡',
      color: '#FF8B94',
      settings: {
        bpm: 95,
        melodyDensity: 0.5,
        progressionLength: 6,
        swing: 1.1,
        kickPattern: 'heavy',
        snarePattern: 'standard',
        hatPattern: 'busy',
        chordVoicing: 'simple',
        filterCutoff: 2800,
        compression: 'heavy'
      }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Stripped down and spacious',
      icon: '🔘',
      color: '#D4B5FF',
      settings: {
        bpm: 65,
        melodyDensity: 0.15,
        progressionLength: 4,
        swing: 1.0,
        kickPattern: 'minimal',
        snarePattern: 'minimal',
        hatPattern: 'minimal',
        chordVoicing: 'simple',
        filterCutoff: 1500,
        compression: 'light'
      }
    }
  ];

  function selectPreset(preset: StylePreset) {
    currentPreset = preset.id;
    dispatch('presetChanged', {
      presetId: preset.id,
      settings: preset.settings
    });
  }

  function getPresetById(id: string): StylePreset | undefined {
    return stylePresets.find(p => p.id === id);
  }

  $: currentPresetData = getPresetById(currentPreset);
</script>

{#if isVisible}
  <div class="style-presets">
    <div class="presets-header">
      <h3 class="presets-title">
        <Icon name="music" size={16} />
        Style Presets
      </h3>
      <p class="presets-description">Choose your lo-fi vibe</p>
    </div>

    <div class="presets-grid">
      {#each stylePresets as preset}
        <button
          class="preset-card"
          class:active={currentPreset === preset.id}
          style="--preset-color: {preset.color}"
          on:click={() => selectPreset(preset)}
          aria-label="Select {preset.name} style"
        >
          <div class="preset-icon">{preset.icon}</div>
          <div class="preset-content">
            <h4 class="preset-name">{preset.name}</h4>
            <p class="preset-description">{preset.description}</p>
            <div class="preset-details">
              <span class="detail-item">{preset.settings.bpm} BPM</span>
              <span class="detail-item">{preset.settings.progressionLength} chords</span>
            </div>
          </div>
          {#if currentPreset === preset.id}
            <div class="active-indicator">
              <Icon name="check" size={16} />
            </div>
          {/if}
        </button>
      {/each}
    </div>

    {#if currentPresetData}
      <div class="current-preset">
        <div class="current-preset-header">
          <span class="current-icon">{currentPresetData.icon}</span>
          <div class="current-info">
            <span class="current-name">{currentPresetData.name}</span>
            <span class="current-description">{currentPresetData.description}</span>
          </div>
        </div>
        
        <div class="preset-settings">
          <div class="setting-group">
            <span class="setting-label">Tempo</span>
            <span class="setting-value">{currentPresetData.settings.bpm} BPM</span>
          </div>
          <div class="setting-group">
            <span class="setting-label">Melody</span>
            <span class="setting-value">{Math.round(currentPresetData.settings.melodyDensity * 100)}%</span>
          </div>
          <div class="setting-group">
            <span class="setting-label">Swing</span>
            <span class="setting-value">{currentPresetData.settings.swing}x</span>
          </div>
          <div class="setting-group">
            <span class="setting-label">Filter</span>
            <span class="setting-value">{currentPresetData.settings.filterCutoff}Hz</span>
          </div>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .style-presets {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
    max-width: 400px;
    max-height: 500px;
    overflow-y: auto;
  }

  .presets-header {
    margin-bottom: 1.5rem;
    text-align: center;
  }

  .presets-title {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 0.25rem 0;
  }

  .presets-description {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }

  .presets-grid {
    display: grid;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .preset-card {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    position: relative;
    width: 100%;
  }

  .preset-card:hover {
    border-color: var(--preset-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .preset-card.active {
    border-color: var(--preset-color);
    background: color-mix(in srgb, var(--preset-color) 10%, var(--color-bg));
  }

  .preset-icon {
    font-size: 1.5rem;
    min-width: 2rem;
    text-align: center;
  }

  .preset-content {
    flex: 1;
    min-width: 0;
  }

  .preset-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 0.25rem 0;
  }

  .preset-description {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0 0 0.5rem 0;
    line-height: 1.3;
  }

  .preset-details {
    display: flex;
    gap: 0.75rem;
  }

  .detail-item {
    font-size: 0.65rem;
    color: var(--preset-color);
    font-weight: 500;
    background: color-mix(in srgb, var(--preset-color) 15%, transparent);
    padding: 0.125rem 0.375rem;
    border-radius: var(--radius-sm);
  }

  .active-indicator {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    color: var(--preset-color);
  }

  .current-preset {
    border-top: 1px solid var(--color-accent);
    padding-top: 1rem;
  }

  .current-preset-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .current-icon {
    font-size: 1.25rem;
  }

  .current-info {
    display: flex;
    flex-direction: column;
  }

  .current-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
  }

  .current-description {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .preset-settings {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .setting-group {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .setting-label {
    font-size: 0.65rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .setting-value {
    font-size: 0.75rem;
    color: var(--color-secondary);
    font-weight: 600;
  }

  /* Scrollbar styling */
  .style-presets::-webkit-scrollbar {
    width: 0.5rem;
  }

  .style-presets::-webkit-scrollbar-track {
    background: var(--color-accent);
    border-radius: 0.25rem;
  }

  .style-presets::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: 0.25rem;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .style-presets {
      max-width: 100%;
      padding: 1rem;
    }

    .preset-card {
      padding: 0.75rem;
      gap: 0.75rem;
    }

    .preset-icon {
      font-size: 1.25rem;
      min-width: 1.5rem;
    }

    .preset-settings {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
  }
</style> 