<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import { IconVolume, IconVolume2, IconVolume3, IconVolumeOff } from "@tabler/icons-svelte";
  import { user } from '$lib/stores';

  const STORAGE_KEY = "Volumes";
  const DEFAULT_VOLUMES = {
    main_track: 0.7,
    rain: 0.5,
    thunder: 0.3,
    campfire: 0.4,
    jungle: 0.3,
    voice: 0.8,
    effects: 0.6,
    ads: 0.5,
  };

  const DEFAULT_VINYL_SETTINGS = {
    enabled: true,
    warmth: 0.3,
    crackle: 0.2,
    flutter: 0.15,
    highCut: 0.4,
  };

  let volumes = DEFAULT_VOLUMES;
  let vinylSettings = DEFAULT_VINYL_SETTINGS;
  let showVinylControls = false;

  onMount(() => {
    if (!browser) return;
    
    // Load saved volumes from localStorage
    const savedVolumes = localStorage.getItem(STORAGE_KEY);
    if (savedVolumes) {
      volumes = { ...DEFAULT_VOLUMES, ...JSON.parse(savedVolumes) };
    }

    // Load vinyl settings
    const savedVinyl = localStorage.getItem('VinylSettings');
    if (savedVinyl) {
      vinylSettings = { ...DEFAULT_VINYL_SETTINGS, ...JSON.parse(savedVinyl) };
    }
  });

  function updateVolume(channel: string, value: number) {
    volumes[channel] = value;
    
    if (browser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(volumes));
    }
  }

  function updateVinylSetting(setting: string, value: number | boolean) {
    vinylSettings[setting] = value;
    
    if (browser) {
      localStorage.setItem('VinylSettings', JSON.stringify(vinylSettings));
    }
    
    // Dispatch event for music player to update effects
    if (browser) {
      window.dispatchEvent(new CustomEvent('vinylSettingsChanged', {
        detail: vinylSettings
      }));
    }
  }

  function getVolumeIcon(volume: number) {
    if (volume === 0) return IconVolumeOff;
    if (volume < 0.3) return IconVolume;
    if (volume < 0.7) return IconVolume2;
    return IconVolume3;
  }

  function toggleMute(channel: string) {
    const currentVolume = volumes[channel];
    updateVolume(channel, currentVolume === 0 ? 0.5 : 0);
  }
  
  function handleMasterVolumeChange(event: Event) {
    const masterVolume = parseFloat((event.target as HTMLInputElement).value);
    const ratio = masterVolume / Math.max(...Object.values(volumes));
    volumeChannels.forEach(channel => {
      updateVolume(channel.key, Math.min(1, volumes[channel.key] * ratio));
    });
  }

  $: volumeChannels = [
    { key: 'main_track', label: 'Music', description: 'Main lo-fi track' },
    { key: 'voice', label: 'Voice', description: 'Voice content & narration' },
    { key: 'effects', label: 'Effects', description: 'Sound effects' },
    { key: 'rain', label: 'Rain', description: 'Rain ambience' },
    { key: 'thunder', label: 'Thunder', description: 'Thunder effects' },
    { key: 'campfire', label: 'Campfire', description: 'Campfire crackling' },
    { key: 'jungle', label: 'Jungle', description: 'Jungle sounds' },
    ...($user && $user.plan === 'free' ? [{ key: 'ads', label: 'Ads', description: 'Advertisement volume' }] : []),
  ];
</script>

<div class="volume-control">
  {#each volumeChannels as channel}
    <div class="volume-channel">
      <div class="channel-header">
        <button 
          class="volume-icon-button"
          on:click={() => toggleMute(channel.key)}
          aria-label={`Toggle ${channel.label} mute`}
        >
          <svelte:component 
            this={getVolumeIcon(volumes[channel.key])} 
            size={18} 
            class="volume-icon"
          />
        </button>
        <div class="channel-info">
          <span class="channel-label">{channel.label}</span>
          <span class="channel-description">{channel.description}</span>
        </div>
        <span class="volume-value">{Math.round(volumes[channel.key] * 100)}%</span>
      </div>
      
      <div class="slider-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          bind:value={volumes[channel.key]}
          on:change={() => updateVolume(channel.key, volumes[channel.key])}
          class="volume-slider"
          aria-label={`${channel.label} volume`}
        />
        <div 
          class="slider-fill" 
          style="width: {volumes[channel.key] * 100}%"
        ></div>
      </div>
    </div>
  {/each}

  <!-- Master Volume -->
  <div class="master-volume">
    <h4 class="master-title">Master Volume</h4>
    <div class="volume-channel">
      <div class="channel-header">
        <button 
          class="volume-icon-button"
          on:click={() => {
            const allMuted = Object.values(volumes).every(v => v === 0);
            volumeChannels.forEach(channel => {
              updateVolume(channel.key, allMuted ? 0.5 : 0);
            });
          }}
          aria-label="Toggle all mute"
        >
          <svelte:component 
            this={getVolumeIcon(Math.max(...Object.values(volumes)))} 
            size={20} 
            class="volume-icon"
          />
        </button>
        <div class="channel-info">
          <span class="channel-label">All Audio</span>
          <span class="channel-description">Global volume control</span>
        </div>
        <span class="volume-value">
          {Math.round(Math.max(...Object.values(volumes)) * 100)}%
        </span>
      </div>
      
      <div class="slider-container">
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={Math.max(...Object.values(volumes))}
          on:input={handleMasterVolumeChange}
          class="volume-slider master-slider"
          aria-label="Master volume"
        />
        <div 
          class="slider-fill master-fill" 
          style="width: {Math.max(...Object.values(volumes)) * 100}%"
        ></div>
      </div>
    </div>
  </div>

  <!-- Quick Presets -->
  <div class="volume-presets">
    <h4 class="presets-title">Quick Presets</h4>
    <div class="preset-buttons">
      <button 
        class="preset-button"
        on:click={() => {
          volumeChannels.forEach(channel => {
            updateVolume(channel.key, channel.key === 'main_track' ? 0.8 : 0.2);
          });
        }}
      >
        Focus
      </button>
      <button 
        class="preset-button"
        on:click={() => {
          volumeChannels.forEach(channel => {
            updateVolume(channel.key, 0.5);
          });
        }}
      >
        Balanced
      </button>
      <button 
        class="preset-button"
        on:click={() => {
          volumeChannels.forEach(channel => {
            updateVolume(channel.key, 
              ['rain', 'thunder', 'campfire', 'jungle'].includes(channel.key) ? 0.7 : 0.3);
          });
        }}
      >
        Ambient
      </button>
    </div>
  </div>

  <!-- VinylFX Controls -->
  <div class="vinyl-fx">
    <div class="vinyl-header">
      <h4 class="vinyl-title">VinylFX</h4>
      <button 
        class="vinyl-toggle"
        class:active={vinylSettings.enabled}
        on:click={() => updateVinylSetting('enabled', !vinylSettings.enabled)}
        aria-label="Toggle vinyl effects"
      >
        <IconVolume size={16} />
        {vinylSettings.enabled ? 'On' : 'Off'}
      </button>
      <button 
        class="vinyl-expand"
        class:expanded={showVinylControls}
        on:click={() => showVinylControls = !showVinylControls}
        aria-label="Toggle vinyl controls"
      >
        ▼
      </button>
    </div>

    {#if showVinylControls}
      <div class="vinyl-controls">
        <div class="vinyl-control">
          <div class="control-header">
            <span class="control-label">Warmth</span>
            <span class="control-value">{Math.round(vinylSettings.warmth * 100)}%</span>
          </div>
          <div class="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={vinylSettings.warmth}
              on:change={() => updateVinylSetting('warmth', vinylSettings.warmth)}
              class="vinyl-slider"
              disabled={!vinylSettings.enabled}
              aria-label="Vinyl warmth"
            />
            <div 
              class="slider-fill vinyl-fill" 
              style="width: {vinylSettings.warmth * 100}%"
            ></div>
          </div>
        </div>

        <div class="vinyl-control">
          <div class="control-header">
            <span class="control-label">Crackle</span>
            <span class="control-value">{Math.round(vinylSettings.crackle * 100)}%</span>
          </div>
          <div class="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={vinylSettings.crackle}
              on:change={() => updateVinylSetting('crackle', vinylSettings.crackle)}
              class="vinyl-slider"
              disabled={!vinylSettings.enabled}
              aria-label="Vinyl crackle"
            />
            <div 
              class="slider-fill vinyl-fill" 
              style="width: {vinylSettings.crackle * 100}%"
            ></div>
          </div>
        </div>

        <div class="vinyl-control">
          <div class="control-header">
            <span class="control-label">Flutter</span>
            <span class="control-value">{Math.round(vinylSettings.flutter * 100)}%</span>
          </div>
          <div class="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={vinylSettings.flutter}
              on:change={() => updateVinylSetting('flutter', vinylSettings.flutter)}
              class="vinyl-slider"
              disabled={!vinylSettings.enabled}
              aria-label="Vinyl flutter"
            />
            <div 
              class="slider-fill vinyl-fill" 
              style="width: {vinylSettings.flutter * 100}%"
            ></div>
          </div>
        </div>

        <div class="vinyl-control">
          <div class="control-header">
            <span class="control-label">High Cut</span>
            <span class="control-value">{Math.round(vinylSettings.highCut * 100)}%</span>
          </div>
          <div class="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={vinylSettings.highCut}
              on:change={() => updateVinylSetting('highCut', vinylSettings.highCut)}
              class="vinyl-slider"
              disabled={!vinylSettings.enabled}
              aria-label="Vinyl high cut filter"
            />
            <div 
              class="slider-fill vinyl-fill" 
              style="width: {vinylSettings.highCut * 100}%"
            ></div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  .volume-control {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .volume-channel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .channel-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .volume-icon-button {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }

  .volume-icon-button:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .channel-info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .channel-label {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-secondary);
  }

  .channel-description {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .volume-value {
    font-size: 0.75rem;
    color: var(--color-primary);
    font-weight: 600;
    min-width: 2.5rem;
    text-align: right;
  }

  .slider-container {
    position: relative;
    height: 0.5rem;
    background: var(--color-accent);
    border-radius: 0.25rem;
    overflow: hidden;
  }

  .volume-slider {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    cursor: pointer;
    position: relative;
    z-index: 2;
    -webkit-appearance: none;
    appearance: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 1rem;
    height: 1rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--color-bg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .volume-slider::-moz-range-thumb {
    width: 1rem;
    height: 1rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--color-bg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .slider-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: var(--color-primary);
    border-radius: 0.25rem;
    transition: width 0.1s ease;
    z-index: 1;
  }

  .master-volume {
    border-top: 1px solid var(--color-accent);
    padding-top: 1rem;
  }

  .master-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 0.75rem 0;
  }

  .master-slider {
    height: 0.75rem;
  }

  .master-fill {
    background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
  }

  .volume-presets {
    border-top: 1px solid var(--color-accent);
    padding-top: 1rem;
  }

  .presets-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 0.75rem 0;
  }

  .preset-buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .preset-button {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-secondary);
    padding: 0.5rem 1rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .preset-button:hover {
    background: var(--color-accent);
    border-color: var(--color-primary);
  }

  /* VinylFX Styles */
  .vinyl-fx {
    border-top: 1px solid var(--color-accent);
    padding-top: 1rem;
  }

  .vinyl-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .vinyl-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0;
    flex: 1;
  }

  .vinyl-toggle {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-muted);
    padding: 0.375rem 0.75rem;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .vinyl-toggle.active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #000;
  }

  .vinyl-toggle:hover:not(.active) {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .vinyl-expand {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    font-size: 0.75rem;
  }

  .vinyl-expand:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .vinyl-expand.expanded {
    transform: rotate(180deg);
  }

  .vinyl-controls {
    display: grid;
    gap: 0.75rem;
    margin-top: 0.75rem;
  }

  .vinyl-control {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .control-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .control-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--color-secondary);
  }

  .control-value {
    font-size: 0.75rem;
    color: var(--color-primary);
    font-weight: 600;
  }

  .vinyl-slider {
    width: 100%;
    height: 100%;
    background: transparent;
    border: none;
    outline: none;
    cursor: pointer;
    position: relative;
    z-index: 2;
    -webkit-appearance: none;
    appearance: none;
  }

  .vinyl-slider:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .vinyl-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.875rem;
    height: 0.875rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid var(--color-bg);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .vinyl-slider:disabled::-webkit-slider-thumb {
    background: var(--color-muted);
    cursor: not-allowed;
  }

  .vinyl-fill {
    background: linear-gradient(90deg, #ff6b6b, #ff8e8e);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .volume-control {
      gap: 0.75rem;
    }

    .channel-header {
      gap: 0.5rem;
    }

    .channel-label {
      font-size: 0.8125rem;
    }

    .channel-description {
      font-size: 0.6875rem;
    }

    .preset-buttons {
      gap: 0.375rem;
    }

    .preset-button {
      padding: 0.375rem 0.75rem;
      font-size: 0.6875rem;
    }

    .vinyl-header {
      gap: 0.5rem;
    }

    .vinyl-toggle {
      padding: 0.25rem 0.5rem;
      font-size: 0.6875rem;
    }

    .control-label, .control-value {
      font-size: 0.6875rem;
    }
  }
</style> 