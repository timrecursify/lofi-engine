<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import Icon from "./Icon.svelte";

  interface Track {
    id: string;
    name: string;
    filename: string;
    duration: string;
    playing: boolean;
    volume: number;
    enabled: boolean;
  }

  let tracks: Track[] = [
    {
      id: "city-ambience",
      name: "City Ambience",
      filename: "city-ambience-9272.mp3",
      duration: "9:32",
      playing: false,
      volume: 0.5,
      enabled: true
    },
    {
      id: "night-ambience",
      name: "Night Ambience", 
      filename: "night-ambience-17064.mp3",
      duration: "17:06",
      playing: false,
      volume: 0.4,
      enabled: false
    },
    {
      id: "office-ambience",
      name: "Office Ambience",
      filename: "office-ambience-6322.mp3", 
      duration: "6:32",
      playing: false,
      volume: 0.3,
      enabled: false
    },
    {
      id: "waves",
      name: "Ocean Waves",
      filename: "small-waves-onto-the-sand-143040.mp3",
      duration: "14:30",
      playing: false,
      volume: 0.4,
      enabled: false
    },
    {
      id: "train",
      name: "Train Journey",
      filename: "train-to-munich-germany.mp3",
      duration: "8:45",
      playing: false,
      volume: 0.3,
      enabled: false
    },
    {
      id: "underwater",
      name: "Underwater",
      filename: "underwater-white-noise-46423.mp3",
      duration: "12:20",
      playing: false,
      volume: 0.5,
      enabled: false
    },
    {
      id: "seagulls",
      name: "Urban Seagulls",
      filename: "urban-seagulls-30068.mp3",
      duration: "5:15",
      playing: false,
      volume: 0.3,
      enabled: false
    },
    {
      id: "wind",
      name: "Wind Ambience",
      filename: "Wind-Mark_DiAngelo-1940285615.mp3",
      duration: "11:45",
      playing: false,
      volume: 0.4,
      enabled: false
    },
    {
      id: "server",
      name: "Server Room",
      filename: "old-server-turning-on-and-off-24540.mp3",
      duration: "4:08",
      playing: false,
      volume: 0.2,
      enabled: false
    }
  ];

  let audioElements: { [key: string]: HTMLAudioElement } = {};
  let currentlyPlaying: string | null = null;

  const TRACK_SETTINGS_KEY = "TrackSettings";

  onMount(() => {
    if (!browser) return;

    // Load saved track settings
    const savedSettings = localStorage.getItem(TRACK_SETTINGS_KEY);
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      tracks.forEach(track => {
        if (settings[track.id]) {
          track.volume = settings[track.id].volume || track.volume;
          track.enabled = settings[track.id].enabled || track.enabled;
        }
      });
    }

    // Initialize audio elements
    tracks.forEach(track => {
      const audio = new Audio();
      audio.src = `/assets/engine/tracks/${track.filename}`;
      audio.loop = true;
      audio.volume = track.volume;
      audio.preload = 'metadata';
      audioElements[track.id] = audio;
    });

    // Cleanup function
    return () => {
      Object.values(audioElements).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  });

  function saveTrackSettings() {
    if (!browser) return;
    
    const settings = {};
    tracks.forEach(track => {
      settings[track.id] = {
        volume: track.volume,
        enabled: track.enabled
      };
    });
    
    localStorage.setItem(TRACK_SETTINGS_KEY, JSON.stringify(settings));
  }

  function toggleTrack(trackId: string) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    const audio = audioElements[trackId];
    if (!audio) return;

    if (track.playing) {
      audio.pause();
      track.playing = false;
      if (currentlyPlaying === trackId) {
        currentlyPlaying = null;
      }
    } else {
      audio.play().catch(console.error);
      track.playing = true;
      currentlyPlaying = trackId;
    }

    tracks = [...tracks];
  }

  function updateVolume(trackId: string, volume: number) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    track.volume = volume;
    const audio = audioElements[trackId];
    if (audio) {
      audio.volume = volume;
    }

    tracks = [...tracks];
    saveTrackSettings();
  }

  function toggleTrackEnabled(trackId: string) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    track.enabled = !track.enabled;
    
    // If disabled while playing, stop it
    if (!track.enabled && track.playing) {
      toggleTrack(trackId);
    }

    tracks = [...tracks];
    saveTrackSettings();
  }

  function stopAll() {
    tracks.forEach(track => {
      if (track.playing) {
        toggleTrack(track.id);
      }
    });
  }

  function playRandom() {
    const enabledTracks = tracks.filter(t => t.enabled && !t.playing);
    if (enabledTracks.length > 0) {
      const randomTrack = enabledTracks[Math.floor(Math.random() * enabledTracks.length)];
      toggleTrack(randomTrack.id);
    }
  }

  $: enabledTracks = tracks.filter(t => t.enabled);
  $: playingTracks = tracks.filter(t => t.playing);
</script>

<div class="track-queue">
  <!-- Queue Controls -->
  <div class="queue-controls">
    <button 
      class="control-button"
      on:click={stopAll}
      disabled={playingTracks.length === 0}
    >
      Stop All
    </button>
    <button 
      class="control-button primary"
      on:click={playRandom}
      disabled={enabledTracks.length === 0}
    >
      Play Random
    </button>
  </div>

  <!-- Playing Now -->
  {#if playingTracks.length > 0}
    <div class="now-playing">
      <h5 class="now-playing-title">Currently Playing</h5>
      <div class="playing-tracks">
        {#each playingTracks as track}
          <div class="playing-track">
            <span class="track-name">{track.name}</span>
            <span class="track-duration">{track.duration}</span>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Track List -->
  <div class="track-list">
    {#each tracks as track}
      <div 
        class="track-item"
        class:enabled={track.enabled}
        class:playing={track.playing}
        class:disabled={!track.enabled}
      >
        <!-- Track Header -->
        <div class="track-header">
          <button 
            class="track-toggle"
            on:click={() => toggleTrackEnabled(track.id)}
            aria-label={`Toggle ${track.name}`}
          >
            {#if track.enabled}
              <Icon name="volume-2" size={16} />
            {:else}
              <Icon name="volume-x" size={16} />
            {/if}
          </button>
          
          <div class="track-info">
            <span class="track-name">{track.name}</span>
            <span class="track-duration">{track.duration}</span>
          </div>
          
          <button 
            class="play-button"
            on:click={() => toggleTrack(track.id)}
            disabled={!track.enabled}
            aria-label={track.playing ? `Pause ${track.name}` : `Play ${track.name}`}
          >
            {#if track.playing}
              <Icon name="pause" size={16} />
            {:else}
              <Icon name="play" size={16} />
            {/if}
          </button>
        </div>

        <!-- Volume Control -->
        {#if track.enabled}
          <div class="volume-control">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              bind:value={track.volume}
              on:input={() => updateVolume(track.id, track.volume)}
              class="volume-slider"
              aria-label={`${track.name} volume`}
            />
            <div 
              class="volume-fill" 
              style="width: {track.volume * 100}%"
            ></div>
            <span class="volume-value">{Math.round(track.volume * 100)}%</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <!-- Queue Statistics -->
  <div class="queue-stats">
    <div class="stat-item">
      <span class="stat-label">Enabled:</span>
      <span class="stat-value">{enabledTracks.length}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Playing:</span>
      <span class="stat-value">{playingTracks.length}</span>
    </div>
    <div class="stat-item">
      <span class="stat-label">Total:</span>
      <span class="stat-value">{tracks.length}</span>
    </div>
  </div>
</div>

<style>
  .track-queue {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  /* Queue Controls */
  .queue-controls {
    display: flex;
    gap: 0.5rem;
  }

  .control-button {
    flex: 1;
    padding: 0.5rem 1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-secondary);
    border-radius: 0.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
    font-size: 0.875rem;
  }

  .control-button:hover:not(:disabled) {
    background: var(--color-accent);
  }

  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-button.primary {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
  }

  .control-button.primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }

  /* Now Playing */
  .now-playing {
    background: var(--color-surface);
    border: 1px solid var(--color-primary);
    border-radius: 0.25rem;
    padding: 1rem;
  }

  .now-playing-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 0.5rem 0;
  }

  .playing-tracks {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .playing-track {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.875rem;
  }

  .playing-track .track-name {
    color: var(--color-secondary);
  }

  .playing-track .track-duration {
    color: var(--color-muted);
    font-size: 0.75rem;
  }

  /* Track List */
  .track-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .track-item {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
    padding: 0.75rem;
    transition: all 0.2s ease;
  }

  .track-item.enabled {
    border-color: var(--color-primary);
  }

  .track-item.playing {
    background: linear-gradient(135deg, var(--color-surface) 0%, rgba(29, 185, 84, 0.1) 100%);
  }

  .track-item.disabled {
    opacity: 0.6;
  }

  .track-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .track-toggle {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }

  .track-toggle:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }

  .track-info {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .track-name {
    font-size: 0.875rem;
    color: var(--color-secondary);
    font-weight: 500;
  }

  .track-duration {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .play-button {
    background: var(--color-primary);
    color: #000000;
    border: none;
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .play-button:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: scale(1.1);
  }

  .play-button:disabled {
    background: var(--color-accent);
    color: var(--color-muted);
    cursor: not-allowed;
    transform: none;
  }

  /* Volume Control */
  .volume-control {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-top: 0.5rem;
    position: relative;
  }

  .volume-slider {
    flex: 1;
    height: 0.25rem;
    background: var(--color-accent);
    border-radius: 0.125rem;
    outline: none;
    cursor: pointer;
    -webkit-appearance: none;
    appearance: none;
  }

  .volume-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 0.75rem;
    height: 0.75rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
  }

  .volume-slider::-moz-range-thumb {
    width: 0.75rem;
    height: 0.75rem;
    background: var(--color-primary);
    border-radius: 50%;
    cursor: pointer;
    border: none;
  }

  .volume-fill {
    position: absolute;
    top: 50%;
    left: 0;
    height: 0.25rem;
    background: var(--color-primary);
    border-radius: 0.125rem;
    transform: translateY(-50%);
    transition: width 0.1s ease;
    pointer-events: none;
  }

  .volume-value {
    font-size: 0.75rem;
    color: var(--color-primary);
    font-weight: 600;
    min-width: 2rem;
    text-align: right;
  }

  /* Queue Statistics */
  .queue-stats {
    display: flex;
    justify-content: space-between;
    padding: 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .stat-label {
    font-size: 0.75rem;
    color: var(--color-muted);
  }

  .stat-value {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-primary);
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .track-queue {
      gap: 0.75rem;
    }

    .track-item {
      padding: 0.5rem;
    }

    .track-header {
      gap: 0.5rem;
    }

    .play-button {
      width: 1.75rem;
      height: 1.75rem;
    }

    .volume-control {
      gap: 0.5rem;
    }
  }
</style> 