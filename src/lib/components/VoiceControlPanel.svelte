<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { preferences, playerState } from '$lib/stores';
  import { IconMicrophone, IconNews, IconSchool, IconCloud, IconPlayerPlay, IconPlayerPause, IconVolume, IconWifi, IconWifiOff } from '@tabler/icons-svelte';

  // Tone.js will be dynamically imported on client side only
  let Tone: any = null;
  let voicePlayer: any = null;
  let voiceGain: any = null;
  let masterGain: any = null;
  let originalMasterVolume = 0;
  
  // State variables
  let isMinimized = false;
  let currentlyPlaying: string | null = null;
  let isLoading = false;
  let voiceLoaded = false;
  let connectionError = false;
  let retryCount = 0;

  // Voice clips configuration
  const voiceClips = [
    {
      id: 'news',
      title: 'Breaking News',
      description: 'Latest updates and headlines',
      icon: IconNews,
      color: '#3B82F6',
      url: '/voice/news.mp3'
    },
    {
      id: 'educate', 
      title: 'Educational',
      description: 'Learning and insights',
      icon: IconSchool,
      color: '#10B981',
      url: '/voice/educate.mp3'
    },
    {
      id: 'weather',
      title: 'Weather Report', 
      description: 'Current conditions',
      icon: IconCloud,
      color: '#F59E0B',
      url: '/voice/weather.mp3'
    }
  ];

  // Get current voice volume
  $: voiceVolume = $preferences.volumes.voice;

  // Initialize voice player
  onMount(async () => {
    if (!browser) return;
    
    try {
      // Dynamically import Tone.js on client side only
      const ToneModule = await import('tone');
      Tone = ToneModule;
      
      // Create voice player with gain control
      voicePlayer = new Tone.Player({
        onload: () => {
          isLoading = false;
        },
        onerror: (error) => {
          console.error('Voice playback error:', error);
          isLoading = false;
          stopCurrentVoice();
        }
      });
      
      // Set up audio chain with ducking
      voiceGain = new Tone.Gain(voiceVolume);
      masterGain = Tone.getDestination().volume;
      originalMasterVolume = masterGain.value;
      
      voicePlayer.connect(voiceGain);
      voiceGain.toDestination();
      
      voiceLoaded = true;
      console.log("Voice control panel initialized successfully");
      
      // Test initial connection to voice files
      setTimeout(async () => {
        await retryConnection();
      }, 1000);
    } catch (error) {
      console.error('Failed to initialize voice player:', error);
      voiceLoaded = false;
      connectionError = true;
    }
  });

  onDestroy(() => {
    if (voicePlayer) {
      voicePlayer.dispose();
    }
  });

  // Update voice volume when preference changes
  $: if (voiceGain && voiceVolume !== undefined) {
    voiceGain.gain.rampTo(voiceVolume, 0.1);
  }

    async function playVoice(clip: typeof voiceClips[0]) {
    if (!voicePlayer || !voiceLoaded || !Tone) {
      console.error("Voice player not initialized");
      return;
    }

    // If this clip is already playing, stop it
    if (currentlyPlaying === clip.id) {
      stopCurrentVoice();
      return;
    }

    try {
      // Stop any currently playing voice
      if (currentlyPlaying) {
        stopCurrentVoice();
      }

      // Ensure audio context is started
      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      isLoading = true;
      currentlyPlaying = clip.id;
      connectionError = false;

      // Test if file is accessible first
      const testResponse = await fetch(clip.url, { method: 'HEAD' });
      if (!testResponse.ok) {
        throw new Error(`Voice file not accessible: ${testResponse.status}`);
      }

      // Load the voice clip
      await voicePlayer.load(clip.url);

      // Duck the master volume for music
      if (masterGain) {
        originalMasterVolume = masterGain.value;
        masterGain.rampTo(originalMasterVolume - 6, 0.3);
      }

      // Update player state to indicate ducking
      playerState.update(state => ({
        ...state,
        isDucking: true,
        currentVoice: {
          id: `voice-${clip.id}-${Date.now()}`,
          topic: clip.id,
          title: clip.title,
          duration: 30,
          storageType: 'kv' as const,
          storageKey: `voice-${clip.id}`,
          createdAt: new Date()
        }
      }));

      // Play the voice
      voicePlayer.start();
      isLoading = false;
      retryCount = 0; // Reset retry count on success
      
      // Set up stop handler
      voicePlayer.onstop = () => {
        stopCurrentVoice();
      };

      console.log(`Voice ${clip.title} playing successfully`);
      
    } catch (error) {
      console.error(`Failed to play ${clip.title}:`, error);
      
      // Handle specific error types - fall back to demo mode
      if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_REFUSED')) {
        connectionError = true;
        retryCount++;
        
        // Try demo mode instead
        console.log(`Falling back to demo mode for ${clip.title}`);
        isLoading = false;
        await playDemoSound(clip);
        return;
      }
      
      stopCurrentVoice();
    }
  }

  // Retry connection function
  async function retryConnection() {
    connectionError = false;
    retryCount = 0;
    
    // Test basic connectivity
    try {
      const response = await fetch('/voice/news.mp3', { method: 'HEAD' });
      if (response.ok) {
        connectionError = false;
      } else {
        connectionError = true;
      }
    } catch (error) {
      connectionError = true;
    }
  }

  // Demo mode - create a simple tone instead of loading files
  async function playDemoSound(clip: typeof voiceClips[0]) {
    if (!Tone || !voiceLoaded) return;

    try {
      currentlyPlaying = clip.id;
      
      // Create a simple oscillator for demo
      const oscillator = new Tone.Oscillator({
        frequency: clip.id === 'news' ? 440 : clip.id === 'educate' ? 523 : 659,
        type: 'sine'
      });
      
      oscillator.toDestination();
      oscillator.start();
      
      // Stop after 2 seconds
      setTimeout(() => {
        oscillator.stop();
        oscillator.dispose();
        stopCurrentVoice();
      }, 2000);
      
      console.log(`Demo sound for ${clip.title} played`);
    } catch (error) {
      console.error('Demo sound failed:', error);
      stopCurrentVoice();
    }
  }

  function stopCurrentVoice() {
    if (voicePlayer && currentlyPlaying) {
      voicePlayer.stop();
    }
    
    // Restore master volume
    if (masterGain) {
      masterGain.rampTo(originalMasterVolume, 0.3);
    }
    
    // Update player state
    playerState.update(state => ({
      ...state,
      isDucking: false,
      currentVoice: null
    }));
    
    currentlyPlaying = null;
    isLoading = false;
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
  }
</script>

<!-- Voice Control Panel -->
<div class="voice-panel" class:minimized={isMinimized}>
  <!-- Panel Header -->
  <div class="panel-header">
    <div class="header-content">
      <IconMicrophone size={20} color="var(--color-primary)" />
      <h3 class="panel-title">Voice Content</h3>
      {#if voiceLoaded}
        <div class="connection-indicator" class:error={connectionError} title={connectionError ? 'Voice files unavailable' : 'Voice files ready'}>
          {#if connectionError}
            <IconWifiOff size={16} />
          {:else}
            <IconWifi size={16} />
          {/if}
        </div>
      {/if}
    </div>
    <button class="minimize-btn" on:click={toggleMinimize}>
      <span class="minimize-icon" class:rotated={isMinimized}>−</span>
    </button>
  </div>

  <!-- Panel Content -->
  {#if !isMinimized}
    <div class="panel-content">
      <!-- Voice Volume Control -->
      <div class="volume-section">
        <div class="volume-header">
          <IconVolume size={16} />
          <span class="volume-label">Voice Volume</span>
          <span class="volume-value">{Math.round(voiceVolume * 100)}%</span>
        </div>
        <input 
          type="range" 
          min="0" 
          max="1" 
          step="0.01"
          bind:value={$preferences.volumes.voice}
          class="volume-slider"
        />
      </div>

            <!-- Connection Status -->
      {#if connectionError}
        <div class="connection-error">
          <div class="error-content">
            <h4>⚠️ Connection Issue</h4>
            <p>Voice files cannot be loaded. Make sure the development server is running.</p>
            <button class="retry-btn" on:click={retryConnection}>
              Retry Connection
            </button>
          </div>
        </div>
      {/if}

      <!-- Voice Clips -->
      <div class="clips-section">
        <h4 class="section-title">Available Clips</h4>
        
        {#if !voiceLoaded}
          <div class="loading-message">
            <span>Loading voice system...</span>
          </div>
        {:else if connectionError}
          <div class="connection-status">
            <span class="status-text">Voice files unavailable</span>
            <p class="status-detail">Start the development server with <code>npm run dev</code></p>
            <button class="demo-mode-btn" on:click={() => connectionError = false}>
              Use Demo Mode
            </button>
          </div>
        {:else}
          <div class="clips-list">
            {#each voiceClips as clip}
              <div class="clip-item" class:playing={currentlyPlaying === clip.id}>
                <div class="clip-info">
                  <div class="clip-icon" style="color: {clip.color}">
                    <svelte:component this={clip.icon} size={24} />
                  </div>
                  <div class="clip-details">
                    <h5 class="clip-title">{clip.title}</h5>
                    <p class="clip-description">{clip.description}</p>
                  </div>
                </div>
                
                <button 
                  class="play-btn"
                  class:playing={currentlyPlaying === clip.id}
                  class:loading={isLoading && currentlyPlaying === clip.id}
                  disabled={!voiceLoaded || isLoading}
                  on:click={() => playVoice(clip)}
                >
                  {#if isLoading && currentlyPlaying === clip.id}
                    <div class="loading-spinner"></div>
                  {:else if currentlyPlaying === clip.id}
                    <IconPlayerPause size={16} />
                  {:else}
                    <IconPlayerPlay size={16} />
                  {/if}
                </button>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Currently Playing -->
      {#if currentlyPlaying}
        <div class="now-playing">
          <div class="playing-indicator">
            <div class="pulse-dot"></div>
            <span>Playing: {voiceClips.find(c => c.id === currentlyPlaying)?.title}</span>
          </div>
          <button class="stop-btn" on:click={stopCurrentVoice}>
            Stop
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .voice-panel {
    position: fixed;
    top: 50%;
    right: 1rem;
    transform: translateY(-50%);
    width: 320px;
    background: rgba(40, 40, 40, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid var(--color-accent);
    border-radius: 1rem;
    z-index: 50;
    transition: all 0.3s ease;
  }

  .voice-panel.minimized {
    width: 200px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-accent);
    background: rgba(29, 185, 84, 0.1);
    border-radius: 1rem 1rem 0 0;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .connection-indicator {
    color: var(--color-primary);
    margin-left: auto;
    transition: color 0.2s ease;
  }

  .connection-indicator.error {
    color: #dc2626;
  }

  .panel-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0;
  }

  .minimize-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
    font-size: 1.5rem;
    line-height: 1;
  }

  .minimize-btn:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .minimize-icon {
    display: inline-block;
    transition: transform 0.2s ease;
  }

  .minimize-icon.rotated {
    transform: rotate(90deg);
  }

  .panel-content {
    padding: 1.25rem;
  }

  /* Volume Section */
  .volume-section {
    margin-bottom: 1.5rem;
  }

  .volume-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .volume-label {
    flex: 1;
    font-size: 0.875rem;
    color: var(--color-secondary);
  }

  .volume-value {
    font-size: 0.75rem;
    color: var(--color-primary);
    font-weight: 600;
  }

  .volume-slider {
    width: 100%;
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

  /* Clips Section */
  .section-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 1rem 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .loading-message {
    text-align: center;
    color: var(--color-muted);
    font-size: 0.875rem;
    padding: 2rem 0;
  }

  /* Connection Error Styles */
  .connection-error {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: rgba(220, 38, 38, 0.1);
    border: 1px solid #dc2626;
    border-radius: 0.75rem;
  }

  .error-content h4 {
    color: #dc2626;
    margin: 0 0 0.5rem 0;
    font-size: 0.875rem;
    font-weight: 600;
  }

  .error-content p {
    color: var(--color-muted);
    margin: 0 0 1rem 0;
    font-size: 0.75rem;
    line-height: 1.4;
  }

  .retry-btn {
    background: #dc2626;
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }

  .retry-btn:hover {
    background: #b91c1c;
  }

  .connection-status {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--color-muted);
  }

  .status-text {
    display: block;
    font-size: 0.875rem;
    color: #f59e0b;
    margin-bottom: 0.5rem;
  }

  .status-detail {
    font-size: 0.75rem;
    line-height: 1.4;
    margin: 0;
  }

  .status-detail code {
    background: var(--color-accent);
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 0.7rem;
  }

  .demo-mode-btn {
    background: var(--color-primary);
    border: none;
    color: #000;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    margin-top: 1rem;
    transition: background-color 0.2s ease;
  }

  .demo-mode-btn:hover {
    background: var(--color-primary-hover);
  }

  .clips-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .clip-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.75rem;
    transition: all 0.2s ease;
  }

  .clip-item:hover {
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }

  .clip-item.playing {
    background: rgba(29, 185, 84, 0.1);
    border-color: var(--color-primary);
  }

  .clip-info {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex: 1;
  }

  .clip-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .clip-details {
    flex: 1;
  }

  .clip-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
    margin: 0 0 0.25rem 0;
  }

  .clip-description {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0;
  }

  .play-btn {
    background: var(--color-primary);
    border: none;
    color: #000;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .play-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: scale(1.1);
  }

  .play-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .play-btn.playing {
    background: #dc2626;
  }

  .play-btn.playing:hover {
    background: #b91c1c;
  }



  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid #000;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  /* Now Playing */
  .now-playing {
    margin-top: 1.5rem;
    padding: 1rem;
    background: rgba(29, 185, 84, 0.1);
    border: 1px solid var(--color-primary);
    border-radius: 0.75rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .playing-indicator {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    color: var(--color-primary);
  }

  .pulse-dot {
    width: 0.5rem;
    height: 0.5rem;
    background: var(--color-primary);
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  .stop-btn {
    background: #dc2626;
    border: none;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .stop-btn:hover {
    background: #b91c1c;
  }

  /* Animations */
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  /* Responsive */
  @media (max-width: 768px) {
    .voice-panel {
      right: 0.5rem;
      width: 280px;
    }

    .voice-panel.minimized {
      width: 160px;
    }
  }
</style> 