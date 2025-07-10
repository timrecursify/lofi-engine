<script lang="ts">
  import { IconMicrophone, IconNews, IconSchool, IconCloud, IconList } from "@tabler/icons-svelte";
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
  import VoiceQueue from "./VoiceQueue.svelte";

  export let volume: number;

  let Tone: any = null;
  let voicePlayer = null;
  let voiceLoaded = false;
  let isActive = false;
  let isQueueActive = false;
  let currentVoice = null;
  let originalMasterVolume = 0;
  let masterGain = null;

  // Initialize Tone.js voice player
  onMount(async () => {
    if (!browser) return;
    
    try {
      // Dynamically import Tone.js on client side
      const ToneModule = await import("tone");
      Tone = ToneModule.default || ToneModule;
      
      // Create a dedicated voice player
      voicePlayer = new Tone.Player().toDestination();
      
      // Get reference to the master volume control
      // We'll use Tone.getDestination().volume to duck the main output
      masterGain = Tone.getDestination().volume;
      originalMasterVolume = masterGain.value;
      
      voiceLoaded = true;
      console.log("Voice system initialized successfully");
    } catch (error) {
      console.error("Failed to initialize voice system:", error);
      voiceLoaded = false;
    }
  });

  function toggle() {
    isActive = !isActive;
  }

  function toggleQueue() {
    isQueueActive = !isQueueActive;
  }

  async function playVoice(type) {
    if (!voicePlayer || !voiceLoaded) {
      console.error("Voice player not initialized");
      return;
    }

    try {
      // Ensure audio context is started
      if (Tone.context.state !== "running") {
        await Tone.start();
      }

      // Stop any currently playing voice
      if (currentVoice) {
        voicePlayer.stop();
        // Restore master volume when stopping previous voice
        if (masterGain) {
          masterGain.rampTo(originalMasterVolume, 0.3);
        }
      }

      // Load the voice clip
      const voiceUrl = `voice/${type}.mp3`;
      await voicePlayer.load(voiceUrl);

      // Duck the master volume (-6dB)
      if (masterGain) {
        originalMasterVolume = masterGain.value;
        masterGain.rampTo(originalMasterVolume - 6, 0.3);
      }

      // Set voice volume and play
      voicePlayer.volume.value = Tone.gainToDb(volume);
      currentVoice = type;
      
      // Play the voice
      voicePlayer.start();
      
      // When voice ends, restore master volume
      voicePlayer.onstop = () => {
        if (masterGain) {
          masterGain.rampTo(originalMasterVolume, 0.3);
        }
        currentVoice = null;
      };

      console.log(`Voice ${type} playing successfully`);
      
    } catch (error) {
      console.error(`Failed to play ${type}:`, error);
      currentVoice = null;
      
      // Restore master volume on error
      if (masterGain) {
        masterGain.rampTo(originalMasterVolume, 0.3);
      }
    }
    
    // Close menu
    isActive = false;
  }

  function stopVoice() {
    if (voicePlayer && currentVoice) {
      voicePlayer.stop();
      // Restore master volume
      if (masterGain) {
        masterGain.rampTo(originalMasterVolume, 0.3);
      }
      currentVoice = null;
    }
  }

  // Shortcut to toggle voice menu with "V" key
  function handleKeydown(e) {
    if (e.key === "v" || e.key === "V") {
      toggle();
    }
  }
  
  onMount(() => {
    window.addEventListener("keydown", handleKeydown);
    
    // Listen for queue events
    const handleQueuePlay = (event) => {
      if (event.detail) {
        playVoice(event.detail.type);
      }
    };
    
    document.addEventListener("playVoice", handleQueuePlay);
    
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      document.removeEventListener("playVoice", handleQueuePlay);
    };
  });

  // Update voice volume when volume prop changes
  $: if (voicePlayer && volume !== undefined) {
    voicePlayer.volume.value = Tone.gainToDb(volume);
  }

  const handleClickOutside = (event) => {
    if (
      isActive &&
      event.target instanceof HTMLElement &&
      !event.target.closest("#voice-box")
    ) {
      isActive = false;
    }
  };
  
  onMount(() => {
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  });
</script>

<div id="voice-box">
  <button
    style={`background-color: ${isActive || currentVoice ? "white" : "transparent"};`}
    on:click={toggle}
    disabled={!voiceLoaded}
  >
    <IconMicrophone size={25} color={isActive || currentVoice ? "black" : "white"} />
  </button>
  {#if isActive}
    <div class="voice-container">
      <div class="voice-header">
        <h4>Voice Content</h4>
        <button 
          class="queue-toggle"
          on:click={toggleQueue}
          class:active={isQueueActive}
        >
          <IconList size={16} />
          Queue
        </button>
      </div>
      
      <div class="voice-buttons">
        <button 
          class="voice-btn"
          on:click={() => playVoice('news')}
          disabled={!voiceLoaded}
        >
          <IconNews size={20} />
          <span>News</span>
        </button>
        
        <button 
          class="voice-btn"
          on:click={() => playVoice('educate')}
          disabled={!voiceLoaded}
        >
          <IconSchool size={20} />
          <span>Educate</span>
        </button>
        
        <button 
          class="voice-btn"
          on:click={() => playVoice('weather')}
          disabled={!voiceLoaded}
        >
          <IconCloud size={20} />
          <span>Weather</span>
        </button>
      </div>
      
      {#if currentVoice}
        <div class="now-playing">
          <p>Playing: {currentVoice}</p>
          <button on:click={stopVoice}>Stop</button>
        </div>
      {/if}
      
      {#if !voiceLoaded}
        <div class="loading">
          <p>Loading voice system...</p>
        </div>
      {/if}
    </div>
  {/if}

  <VoiceQueue {volume} {isQueueActive} />
</div>

<style>
  button {
    color: white;
    border-radius: 50%;
    aspect-ratio: 4/4;
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  #voice-box {
    position: relative;
  }
  
  .voice-container {
    position: absolute;
    right: -50px;
    top: 70px;
    width: 250px;
    padding: 20px;
    color: white;
    border-radius: 20px;
    backdrop-filter: blur(10px);
    background-color: rgba(0, 0, 0, 40%);
    animation: show 0.4s ease-in-out;
  }
  
  @keyframes show {
    from {
      transform: translateY(10%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
  
  .voice-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  h4 {
    margin: 0;
    font-size: 1.1rem;
  }

  .queue-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .queue-toggle:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .queue-toggle.active {
    background: rgba(59, 130, 246, 0.3);
    color: #60A5FA;
  }
  
  .voice-buttons {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .voice-btn {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 15px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
  }
  
  .voice-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2);
  }
  
  .voice-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  .voice-btn span {
    font-size: 0.9rem;
  }
  
  .now-playing {
    margin-top: 15px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .now-playing p {
    margin: 0;
    font-size: 0.85rem;
  }
  
  .now-playing button {
    padding: 5px 10px;
    border-radius: 5px;
    background: rgba(255, 0, 0, 0.5);
    color: white;
    font-size: 0.8rem;
  }
  
  .loading {
    margin-top: 15px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    text-align: center;
  }
  
  .loading p {
    margin: 0;
    font-size: 0.8rem;
    opacity: 0.7;
  }
  
  @media only screen and (max-width: 600px) {
    .voice-container {
      right: -20px;
      top: 60px;
      width: 220px;
    }
  }
</style> 