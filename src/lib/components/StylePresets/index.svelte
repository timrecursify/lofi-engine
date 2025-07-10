<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from '../Icon.svelte';
  
  const dispatch = createEventDispatcher();
  
  export let currentPreset: string = 'balanced';
  
  // Style presets with music parameters
  const stylePresets = {
    chillhop: {
      name: 'Chillhop',
      description: 'Classic chill hop beats with laid-back groove',
      icon: '🎵',
      color: '#3B82F6',
      parameters: {
        bpm: 85,
        melodyDensity: 0.4,
        progressionLength: 8,
        swing: 1.2,
        drumIntensity: {
          kickProbability: 0.85,
          snareProbability: 0.8,
          hatProbability: 0.75
        },
        chordVariation: 0.15,
        filterCutoff: 1800,
        vinylFx: {
          warmth: 0.3,
          crackle: 0.2
        }
      }
    },
    jazzhop: {
      name: 'Jazzhop',
      description: 'Jazz-influenced progressions with complex chords',
      icon: '🎷',
      color: '#10B981',
      parameters: {
        bpm: 75,
        melodyDensity: 0.25,
        progressionLength: 12,
        swing: 1.4,
        drumIntensity: {
          kickProbability: 0.75,
          snareProbability: 0.7,
          hatProbability: 0.85
        },
        chordVariation: 0.25,
        filterCutoff: 2200,
        vinylFx: {
          warmth: 0.4,
          crackle: 0.15
        }
      }
    },
    ambient: {
      name: 'Ambient',
      description: 'Spacious and atmospheric with minimal drums',
      icon: '🌙',
      color: '#6366F1',
      parameters: {
        bpm: 65,
        melodyDensity: 0.15,
        progressionLength: 16,
        swing: 1.0,
        drumIntensity: {
          kickProbability: 0.6,
          snareProbability: 0.4,
          hatProbability: 0.3
        },
        chordVariation: 0.35,
        filterCutoff: 1400,
        vinylFx: {
          warmth: 0.5,
          crackle: 0.1
        }
      }
    },
    balanced: {
      name: 'Balanced',
      description: 'Well-rounded lo-fi with moderate intensity',
      icon: '⚖️',
      color: '#F59E0B',
      parameters: {
        bpm: 70,
        melodyDensity: 0.33,
        progressionLength: 8,
        swing: 1.0,
        drumIntensity: {
          kickProbability: 0.9,
          snareProbability: 0.8,
          hatProbability: 0.8
        },
        chordVariation: 0.2,
        filterCutoff: 2000,
        vinylFx: {
          warmth: 0.25,
          crackle: 0.15
        }
      }
    },
    upbeat: {
      name: 'Upbeat',
      description: 'Energetic lo-fi with driving rhythms',
      icon: '🔥',
      color: '#EF4444',
      parameters: {
        bpm: 95,
        melodyDensity: 0.5,
        progressionLength: 6,
        swing: 1.1,
        drumIntensity: {
          kickProbability: 0.95,
          snareProbability: 0.9,
          hatProbability: 0.85
        },
        chordVariation: 0.1,
        filterCutoff: 2400,
        vinylFx: {
          warmth: 0.2,
          crackle: 0.25
        }
      }
    },
    minimal: {
      name: 'Minimal',
      description: 'Stripped-down focus on melody and space',
      icon: '○',
      color: '#8B5CF6',
      parameters: {
        bpm: 60,
        melodyDensity: 0.2,
        progressionLength: 4,
        swing: 0.9,
        drumIntensity: {
          kickProbability: 0.7,
          snareProbability: 0.5,
          hatProbability: 0.4
        },
        chordVariation: 0.4,
        filterCutoff: 1600,
        vinylFx: {
          warmth: 0.6,
          crackle: 0.05
        }
      }
    }
  };
  
  function selectPreset(presetId: string) {
    if (presetId === currentPreset) return;
    
    currentPreset = presetId;
    const preset = stylePresets[presetId];
    
    // Dispatch event with preset parameters
    dispatch('presetChanged', {
      presetId,
      preset: preset.name,
      parameters: preset.parameters
    });
  }
  
  function getCurrentParameters() {
    return stylePresets[currentPreset]?.parameters || stylePresets.balanced.parameters;
  }
  
  // Export current parameters for parent component
  $: currentParameters = getCurrentParameters();
</script>

<div class="style-presets">
  <div class="presets-header">
    <h3 class="presets-title">
      <Icon name="music" size={16} />
      Music Style
    </h3>
    <span class="current-preset">{stylePresets[currentPreset]?.name || 'Balanced'}</span>
  </div>
  
  <div class="presets-grid">
    {#each Object.entries(stylePresets) as [id, preset]}
      <button
        class="preset-card"
        class:active={currentPreset === id}
        style="--preset-color: {preset.color}"
        on:click={() => selectPreset(id)}
        aria-pressed={currentPreset === id}
      >
        <div class="preset-icon">{preset.icon}</div>
        <div class="preset-info">
          <h4 class="preset-name">{preset.name}</h4>
          <p class="preset-description">{preset.description}</p>
        </div>
        
        {#if currentPreset === id}
          <div class="active-indicator">
            <Icon name="check" size={16} />
          </div>
        {/if}
      </button>
    {/each}
  </div>
  
  <!-- Current Settings Display -->
  <div class="current-settings">
    <h4 class="settings-title">Current Settings</h4>
    <div class="settings-grid">
      <div class="setting-item">
        <span class="setting-label">BPM</span>
        <span class="setting-value">{currentParameters.bpm}</span>
      </div>
      <div class="setting-item">
        <span class="setting-label">Melody</span>
        <span class="setting-value">{Math.round(currentParameters.melodyDensity * 100)}%</span>
      </div>
      <div class="setting-item">
        <span class="setting-label">Progression</span>
        <span class="setting-value">{currentParameters.progressionLength} bars</span>
      </div>
      <div class="setting-item">
        <span class="setting-label">Swing</span>
        <span class="setting-value">{currentParameters.swing}x</span>
      </div>
    </div>
  </div>
</div>

<style>
  .style-presets {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.75rem;
    padding: 1.5rem;
    width: 100%;
  }
  
  .presets-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.25rem;
  }
  
  .presets-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0;
  }
  
  .current-preset {
    font-size: 0.875rem;
    color: var(--color-muted);
    background: var(--color-bg);
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    border: 1px solid var(--color-accent);
  }
  
  .presets-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }
  
  .preset-card {
    position: relative;
    display: flex;
    align-items: center;
    gap: 1rem;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: 0.75rem;
    padding: 1rem;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    width: 100%;
  }
  
  .preset-card:hover {
    border-color: var(--preset-color);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .preset-card.active {
    border-color: var(--preset-color);
    background: rgba(var(--preset-color-rgb, 59, 130, 246), 0.05);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  }
  
  .preset-icon {
    font-size: 1.5rem;
    min-width: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .preset-info {
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
    margin: 0;
    line-height: 1.3;
  }
  
  .active-indicator {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    color: var(--preset-color);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 1.5rem;
    height: 1.5rem;
    background: var(--color-bg);
    border-radius: 50%;
    border: 1px solid var(--preset-color);
  }
  
  .current-settings {
    border-top: 1px solid var(--color-accent);
    padding-top: 1rem;
  }
  
  .settings-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 0.75rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .settings-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
    gap: 0.75rem;
  }
  
  .setting-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 0.5rem;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 0.5rem;
  }
  
  .setting-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  
  .setting-value {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
  }
  
  /* Responsive Design */
  @media (max-width: 768px) {
    .style-presets {
      padding: 1rem;
    }
    
    .presets-grid {
      grid-template-columns: 1fr;
      gap: 0.5rem;
    }
    
    .preset-card {
      padding: 0.75rem;
      gap: 0.75rem;
    }
    
    .settings-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 0.5rem;
    }
    
    .setting-item {
      padding: 0.375rem;
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .preset-card.active {
      background: var(--color-accent);
    }
  }
</style> 