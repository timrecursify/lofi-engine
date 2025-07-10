<script lang="ts">
  import { page } from "$app/stores";
  import { signOut } from "$lib/auth";
  import Icon from "$lib/components/Icon.svelte";
  import MusicPlayer from "$lib/components/MusicPlayer.svelte";
  import VoicePlayer from "$lib/components/VoicePlayer.svelte";
  import VoiceControlPanel from "$lib/components/VoiceControlPanel.svelte";
  import ContentQueue from "$lib/components/ContentQueue.svelte";
  import TopicToggles from "$lib/components/TopicToggles.svelte";
  import AmbientEffects from "$lib/components/AmbientEffects.svelte";
  import VisualScene from "$lib/components/VisualScene.svelte";
  import StylePresets from "$lib/components/StylePresets/index.svelte";
  import { 
    playerState, 
    preferences, 
    user,
    queue,
    addClipToQueue,
    setVolume,
    toggleEffect
  } from "$lib/stores";
  import { onMount } from "svelte";
  import { fade } from 'svelte/transition'
  import { authState } from '$lib/auth'
  import { handleMagicLinkCallback } from '$lib/auth'
  import { trackEvent, AnalyticsEvent, UserJourneyStage, trackFunnel } from '$lib/services/analytics'
  import { browser } from '$app/environment'

  // Get session from page data
  $: session = $page.data.session;
  
  // Update user store when session changes
  $: if (session?.user) {
    $user = {
      ...$user,
      id: session.user.id,
      email: session.user.email,
      name: session.user.name
    };
  }

  let voicePlayerRef;
  let musicPlayerRef;
  let showQueue = false;
  let showSettings = false;
  let currentTimeOfDay: 'dawn' | 'day' | 'dusk' | 'night' = 'day';

  // Update time of day based on real time
  function updateTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) {
      currentTimeOfDay = 'dawn';
    } else if (hour >= 8 && hour < 17) {
      currentTimeOfDay = 'day';
    } else if (hour >= 17 && hour < 20) {
      currentTimeOfDay = 'dusk';
    } else {
      currentTimeOfDay = 'night';
    }
  }
  
  // Ambient sound effects
  const ambientEffects = [
    { id: 'rain', name: 'Rain', icon: '🌧️' },
    { id: 'campfire', name: 'Campfire', icon: '🔥' },
    { id: 'jungle', name: 'Jungle', icon: '🌴' },
    { id: 'thunder', name: 'Thunder', icon: '⛈️' }
  ];
  
  // Volume control handlers
  function handleVolumeChange(channel: string, event: Event) {
    const target = event.target as HTMLInputElement;
    const value = parseFloat(target.value) / 100;
    setVolume(channel as any, value);
  }
  
  async function handleSignOut() {
    await signOut();
  }
  
  // Handle style preset changes
  function handlePresetChange(event) {
    const { parameters } = event.detail;
    if (musicPlayerRef && musicPlayerRef.applyStylePreset) {
      musicPlayerRef.applyStylePreset(parameters);
    }
  }
  
  // Load test clips on mount (for demo purposes)
  onMount(() => {
    // Set initial time of day and update every 5 minutes
    updateTimeOfDay();
    const timeInterval = setInterval(updateTimeOfDay, 5 * 60 * 1000);
    
    // Add some test clips to the queue
    const testClips = [
      {
        id: 'clip-1',
        topic: 'world-news',
        title: 'Breaking: Major climate summit reaches historic agreement',
        duration: 90,
        storageType: 'kv' as const,
        storageKey: 'test-1',
        createdAt: new Date()
      },
      {
        id: 'clip-2',
        topic: 'weather',
        title: 'Sunny skies expected throughout the week',
        duration: 45,
        storageType: 'kv' as const,
        storageKey: 'test-2',
        createdAt: new Date()
      },
      {
        id: 'clip-3',
        topic: 'education',
        title: 'Did you know? The history of lo-fi music',
        duration: 120,
        storageType: 'kv' as const,
        storageKey: 'test-3',
        createdAt: new Date()
      }
    ];
    
    testClips.forEach(clip => addClipToQueue(clip));
    
    // Cleanup function
    return () => {
      clearInterval(timeInterval);
    };
  });
</script>

<svelte:head>
  <title>Lo-Fi Radio - Immersive Generative Music</title>
  <meta name="description" content="Relax with endless lo-fi beats and AI-powered voice content" />
</svelte:head>

<!-- Main App Container -->
<div class="app-container">
  <!-- Visual Background Scene -->
  <div class="visual-scene">
    <VisualScene timeOfDay={currentTimeOfDay} />
  </div>

  <!-- Top Bar -->
  <header class="top-bar">
    <div class="bar-left">
      <h1 class="app-logo">
        <Icon name="radio" size={24} color="var(--color-primary)" />
        <span>Lo-Fi Radio</span>
      </h1>
    </div>
    
    <div class="bar-center">
      {#if $playerState.currentVoice}
        <div class="now-playing-voice">
          <Icon name="microphone" size={16} />
          <span>{$playerState.currentVoice.topic.replace('-', ' ')}</span>
        </div>
      {/if}
    </div>
    
    <div class="bar-right">
      {#if session?.user}
        <button class="icon-btn" on:click={() => showSettings = !showSettings}>
          <Icon name="settings" size={20} />
        </button>
        <button class="user-btn" on:click={handleSignOut}>
          {#if session.user.image}
            <img src={session.user.image} alt="Profile" class="user-avatar" />
          {:else}
            <Icon name="user" size={20} />
          {/if}
        </button>
      {:else}
        <a href="/auth/signin" class="signin-btn">
          <Icon name="login" size={16} />
          Sign In
        </a>
      {/if}
    </div>
  </header>

  <!-- Main Content -->
  <main class="main-content">
    <!-- Center: Music Player -->
    <div class="player-container">
      <MusicPlayer bind:this={musicPlayerRef} />
      <VoicePlayer bind:this={voicePlayerRef} />
      <AmbientEffects />
    </div>

    <!-- Bottom Controls -->
    <div class="bottom-controls">
      <!-- Volume Controls -->
      <div class="volume-panel">
        <h3 class="panel-title">
          <Icon name="volume" size={16} />
          Volume
        </h3>
        
        <div class="volume-sliders">
          <div class="volume-channel">
            <Icon name="music" size={14} />
            <span class="channel-label">Music</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={$preferences.volumes.music * 100}
              on:input={(e) => handleVolumeChange('music', e)}
              class="volume-slider"
            />
            <span class="volume-value">{Math.round($preferences.volumes.music * 100)}</span>
          </div>
          
          <div class="volume-channel">
            <Icon name="microphone" size={14} />
            <span class="channel-label">Voice</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={$preferences.volumes.voice * 100}
              on:input={(e) => handleVolumeChange('voice', e)}
              class="volume-slider"
            />
            <span class="volume-value">{Math.round($preferences.volumes.voice * 100)}</span>
          </div>
          
          <div class="volume-channel">
            <Icon name="volume-2" size={14} />
            <span class="channel-label">Effects</span>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={$preferences.volumes.effects * 100}
              on:input={(e) => handleVolumeChange('effects', e)}
              class="volume-slider"
            />
            <span class="volume-value">{Math.round($preferences.volumes.effects * 100)}</span>
          </div>
          
          {#if $user.plan === 'free'}
            <div class="volume-channel">
              <Icon name="speaker" size={14} />
              <span class="channel-label">Ads</span>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={$preferences.volumes.ads * 100}
                on:input={(e) => handleVolumeChange('ads', e)}
                class="volume-slider"
              />
              <span class="volume-value">{Math.round($preferences.volumes.ads * 100)}</span>
            </div>
          {/if}
        </div>
      </div>

      <!-- Ambient Effects -->
      <div class="effects-panel">
        <h3 class="panel-title">
          <Icon name="trees" size={16} />
          Ambience
        </h3>
        
        <div class="effect-toggles">
          {#each ambientEffects as effect}
            <button
              class="effect-toggle"
              class:active={$playerState.activeEffects.includes(effect.id)}
              on:click={() => toggleEffect(effect.id)}
              aria-pressed={$playerState.activeEffects.includes(effect.id)}
            >
              <span class="effect-icon">{effect.icon}</span>
              <span class="effect-name">{effect.name}</span>
            </button>
          {/each}
        </div>
      </div>

      <!-- Queue Button -->
      <button 
        class="queue-toggle"
        class:active={showQueue}
        on:click={() => showQueue = !showQueue}
      >
        <Icon name="list" size={20} />
        <span>Queue ({$queue.length})</span>
      </button>
      
      <!-- Topics Button -->
      <button 
        class="topics-toggle"
        class:active={showSettings}
        on:click={() => showSettings = !showSettings}
      >
        <Icon name="settings" size={20} />
        <span>Topics ({$preferences.enabledTopics.length})</span>
      </button>
    </div>
  </main>

  <!-- Side Panels -->
  <!-- Queue Drawer -->
  <aside class="side-drawer queue-drawer" class:open={showQueue}>
    <div class="drawer-header">
      <h2 class="drawer-title">Voice Queue</h2>
      <button class="close-btn" on:click={() => showQueue = false}>
        <Icon name="x" size={20} />
      </button>
    </div>
    
    <div class="drawer-content">
      <ContentQueue />
      
      <div class="drawer-section">
        <TopicToggles />
      </div>
    </div>
  </aside>

  <!-- Settings Drawer -->
  <aside class="side-drawer settings-drawer" class:open={showSettings}>
    <div class="drawer-header">
      <h2 class="drawer-title">Voice Topics</h2>
      <button class="close-btn" on:click={() => showSettings = false}>
        <Icon name="x" size={20} />
      </button>
    </div>
    
    <div class="drawer-content">
      <div class="drawer-section">
        <div class="section-header">
          <h3>Choose Your Content</h3>
          <p class="section-subtitle">Select topics to hear between songs</p>
        </div>
        <TopicToggles />
      </div>
      
      <div class="drawer-section">
        <div class="section-header">
          <h3>Voice Settings</h3>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            Narration Speed
            <select 
              bind:value={$preferences.narrationSpeed}
              class="setting-select"
            >
              <option value={0.8}>Slow (0.8x)</option>
              <option value={1.0}>Normal (1.0x)</option>
              <option value={1.2}>Fast (1.2x)</option>
              <option value={1.5}>Very Fast (1.5x)</option>
            </select>
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-checkbox">
            <input 
              type="checkbox" 
              bind:checked={$preferences.vinylFx}
            />
            <span>Vinyl Effect on Voice</span>
          </label>
        </div>
      </div>
    </div>
  </aside>

  <!-- Voice Control Panel -->
  <VoiceControlPanel />
</div>

<style>
  /* App Container */
  .app-container {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--color-bg);
    color: var(--color-secondary);
  }

  /* Visual Scene */
  .visual-scene {
    position: absolute;
    inset: 0;
    z-index: 0;
  }



  /* Top Bar */
  .top-bar {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 2rem;
    background: rgba(25, 20, 20, 0.8);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid var(--color-accent);
  }

  .bar-left, .bar-right {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .app-logo {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0;
  }

  .now-playing-voice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: rgba(29, 185, 84, 0.1);
    border: 1px solid var(--color-primary);
    border-radius: 2rem;
    font-size: 0.875rem;
    color: var(--color-primary);
    text-transform: capitalize;
  }

  .icon-btn, .user-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .icon-btn:hover, .user-btn:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .user-avatar {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
  }

  .signin-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--color-primary);
    color: #000;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.875rem;
    transition: background-color 0.2s ease;
  }

  .signin-btn:hover {
    background: var(--color-primary-hover);
  }

  /* Main Content */
  .main-content {
    position: relative;
    z-index: 5;
    height: calc(100vh - 4rem);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 2rem;
  }

  .player-container {
    margin-bottom: 3rem;
  }

  /* Bottom Controls */
  .bottom-controls {
    display: flex;
    gap: 2rem;
    align-items: start;
    background: rgba(40, 40, 40, 0.8);
    backdrop-filter: blur(10px);
    border: 1px solid var(--color-accent);
    border-radius: 1rem;
    padding: 1.5rem;
  }

  .panel-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Volume Panel */
  .volume-sliders {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .volume-channel {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .channel-label {
    font-size: 0.75rem;
    color: var(--color-muted);
    min-width: 3rem;
  }

  .volume-slider {
    flex: 1;
    height: 0.375rem;
    background: var(--color-accent);
    border-radius: 0.25rem;
    outline: none;
    cursor: pointer;
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
  }

  .volume-value {
    font-size: 0.75rem;
    color: var(--color-primary);
    font-weight: 600;
    min-width: 2rem;
    text-align: right;
  }

  /* Effects Panel */
  .effect-toggles {
    display: flex;
    gap: 0.5rem;
  }

  .effect-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.75rem;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .effect-toggle:hover {
    transform: translateY(-2px);
  }

  .effect-toggle.active {
    background: rgba(29, 185, 84, 0.1);
    border-color: var(--color-primary);
  }

  .effect-icon {
    font-size: 1.5rem;
  }

  .effect-name {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  /* Queue Toggle */
  .queue-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.5rem;
    color: var(--color-secondary);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .queue-toggle:hover, .queue-toggle.active {
    border-color: var(--color-primary);
    background: rgba(29, 185, 84, 0.1);
  }

  /* Topics Toggle */
  .topics-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1.5rem;
    background: var(--color-surface);
    border: 2px solid var(--color-accent);
    border-radius: 0.5rem;
    color: var(--color-secondary);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .topics-toggle:hover, .topics-toggle.active {
    border-color: var(--color-primary);
    background: rgba(29, 185, 84, 0.1);
  }

  /* Side Drawers */
  .side-drawer {
    position: fixed;
    top: 0;
    right: 0;
    width: 420px;
    height: 100vh;
    background: var(--color-surface);
    border-left: 1px solid var(--color-accent);
    transform: translateX(100%);
    transition: transform 0.3s ease;
    z-index: 100;
    display: flex;
    flex-direction: column;
  }

  .side-drawer.open {
    transform: translateX(0);
  }

  .drawer-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--color-accent);
  }

  .drawer-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 50%;
    transition: all 0.2s ease;
  }

  .close-btn:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .drawer-content {
    flex: 1;
    overflow-y: auto;
    padding: 0 1.5rem 1.5rem;
  }
  
  .drawer-section {
    margin-bottom: 2rem;
  }
  
  .section-header {
    margin-bottom: 1rem;
  }
  
  .section-header h3 {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 0.25rem 0;
  }
  
  .section-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }
  
  .setting-group {
    margin-bottom: 1rem;
  }
  
  .setting-label {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
  }
  
  .setting-select {
    padding: 0.5rem;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: 0.375rem;
    color: var(--color-secondary);
    font-size: 0.875rem;
  }
  
  .setting-select:focus {
    outline: none;
    border-color: var(--color-primary);
  }
  
  .setting-checkbox {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: var(--color-secondary);
    cursor: pointer;
  }
  
  .setting-checkbox input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    accent-color: var(--color-primary);
  }

  /* Settings Styles */
  .settings-section {
    margin-bottom: 2rem;
  }

  .settings-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 1rem 0;
  }

  .speed-control {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .speed-control input {
    flex: 1;
  }

  .theme-options {
    display: flex;
    gap: 0.5rem;
  }

  .theme-option {
    padding: 0.5rem 1rem;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
    color: var(--color-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .theme-option.active {
    background: var(--color-primary);
    color: #000;
  }

  .toggle-setting {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
  }

  .toggle-setting input[type="checkbox"] {
    width: 1.25rem;
    height: 1.25rem;
    cursor: pointer;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .bottom-controls {
      flex-direction: column;
      width: 100%;
      max-width: 400px;
    }

    .side-drawer {
      width: 100%;
    }
  }
</style> 