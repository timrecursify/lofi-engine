<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { 
    queue, 
    queuePosition, 
    playerState, 
    preferences,
    type ClipMeta,
    skipToNextClip 
  } from '$lib/stores';
  
  // Tone.js will be dynamically imported on client side only
  let Tone: any = null;
  let voicePlayer: any = null;
  let voiceGain: any = null;
  let currentClip: ClipMeta | null = null;
  let isLoading = false;
  let progress = 0;
  let progressInterval: ReturnType<typeof setInterval> | null = null;
  
  // Ducking parameters
  const DUCK_LEVEL = -12; // dB reduction for music during voice
  const DUCK_ATTACK = 0.3; // seconds to duck down
  const DUCK_RELEASE = 0.5; // seconds to return to normal
  
  // Get current preferences
  $: voiceVolume = $preferences.volumes.voice;
  $: narrationSpeed = $preferences.narrationSpeed;
  
  // Watch for queue changes
  $: upcomingClips = $queue.slice($queuePosition);
  $: nextClip = upcomingClips[0] || null;
  
  // Initialize voice player
  onMount(async () => {
    if (!browser) return;
    
    try {
      // Dynamically import Tone.js on client side only
      const ToneModule = await import('tone');
      Tone = ToneModule.default || ToneModule;
      
      await Tone.start();
      
      // Create voice player with gain control
      voicePlayer = new Tone.Player({
        onload: () => {
          isLoading = false;
          startPlayback();
        },
        onerror: (error) => {
          console.error('Voice playback error:', error);
          isLoading = false;
          handleClipEnd();
        }
      });
      
      // Connect to output with volume control
      voiceGain = new Tone.Gain(voiceVolume);
      voicePlayer.connect(voiceGain);
      voiceGain.toDestination();
      
      // Update volume when preference changes
      preferences.subscribe(prefs => {
        if (voiceGain) {
          voiceGain.gain.rampTo(prefs.volumes.voice, 0.1);
        }
      });
    } catch (error) {
      console.error('Failed to initialize voice player:', error);
    }
  });
  
  onDestroy(() => {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    if (voicePlayer) {
      voicePlayer.dispose();
    }
  });
  
  // Load and play next clip
  async function loadNextClip() {
    if (!nextClip || !voicePlayer || !Tone) return;
    
    currentClip = nextClip;
    isLoading = true;
    progress = 0;
    
    // Update player state
    playerState.update(state => ({
      ...state,
      currentVoice: currentClip
    }));
    
    try {
      // In production, this would fetch from API
      // For now, use test clips if available
      const clipUrl = await fetchClipUrl(currentClip);
      await voicePlayer.load(clipUrl);
      
      // Set playback rate for narration speed
      voicePlayer.playbackRate = narrationSpeed;
    } catch (error) {
      console.error('Failed to load clip:', error);
      handleClipEnd();
    }
  }
  
  // Start playback with ducking
  function startPlayback() {
    if (!voicePlayer || !currentClip || !Tone) return;
    
    // Start ducking music
    duckMusic(true);
    
    // Start voice playback
    voicePlayer.start();
    
    // Update progress
    const duration = voicePlayer.buffer.duration;
    progressInterval = setInterval(() => {
      if (voicePlayer && voicePlayer.state === 'started') {
        progress = (Tone.now() - voicePlayer.toSeconds(voicePlayer.state)) / duration;
        
        if (progress >= 1) {
          handleClipEnd();
        }
      }
    }, 100);
  }
  
  // Handle clip completion
  function handleClipEnd() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // Stop ducking
    duckMusic(false);
    
    // Clear current voice
    playerState.update(state => ({
      ...state,
      currentVoice: null
    }));
    
    // Move to next clip
    skipToNextClip();
    
    // Load next clip after a brief pause
    setTimeout(() => {
      if (upcomingClips.length > 0) {
        loadNextClip();
      }
    }, 2000); // 2 second gap between clips
  }
  
  // Duck/unduck music
  function duckMusic(duck: boolean) {
    playerState.update(state => ({
      ...state,
      isDucking: duck
    }));
    
    // This will be handled by the MusicPlayer component
    // which watches the isDucking state
  }
  
  // Fetch clip URL (mock for now)
  async function fetchClipUrl(clip: ClipMeta): Promise<string> {
    // In production: return `/api/v1/clip/${clip.id}`;
    // For testing, use sample voice clips
    const testClips = [
      '/voice/news.mp3',
      '/voice/weather.mp3',
      '/voice/educate.mp3'
    ];
    return testClips[Math.floor(Math.random() * testClips.length)];
  }
  
  // Public methods
  export function play() {
    if (!browser || !Tone) return;
    
    if (!currentClip && upcomingClips.length > 0) {
      loadNextClip();
    } else if (voicePlayer && voicePlayer.state === 'stopped') {
      startPlayback();
    }
  }
  
  export function pause() {
    if (!browser || !Tone) return;
    
    if (voicePlayer && voicePlayer.state === 'started') {
      voicePlayer.stop();
      duckMusic(false);
    }
  }
  
  export function skip() {
    if (!browser || !Tone) return;
    
    if (voicePlayer && voicePlayer.state === 'started') {
      voicePlayer.stop();
    }
    handleClipEnd();
  }
  
  // Voice clips are manually controlled - no auto-play
  // Auto-play has been removed to give users full control over voice narration
</script>

<!-- Voice Player Component (invisible - handles audio only) -->
<div class="voice-player" style="display: none;">
  <!-- This component handles voice playback invisibly -->
  <!-- Visual feedback is handled by ContentQueue and other UI components -->
</div>

<style>
  .voice-player {
    display: none;
  }
</style> 