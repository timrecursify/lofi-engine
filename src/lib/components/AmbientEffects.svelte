<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import { playerState, preferences } from '$lib/stores';
  
  // Tone.js will be dynamically imported on client side only
  let Tone: any = null;
  let effects: Record<string, any> = {};
  let effectsGain: any = null;
  let initialized = false;
  
  const effectFiles = {
    rain: '/assets/engine/effects/rain.mp3',
    campfire: '/assets/engine/effects/fire.mp3',
    jungle: '/assets/engine/effects/jungle.mp3',
    thunder: '/assets/engine/effects/thunder.mp3'
  };
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      // Dynamically import Tone.js on client side only
      const ToneModule = await import('tone');
      Tone = ToneModule.default || ToneModule;
      
      await Tone.start();
      
      // Create gain node for all effects
      effectsGain = new Tone.Gain($preferences.volumes.effects);
      effectsGain.toDestination();
      
      // Load all effect sounds
      for (const [id, file] of Object.entries(effectFiles)) {
        effects[id] = new Tone.Player({
          url: file,
          loop: true,
          volume: -6 // Reduce individual volumes
        }).connect(effectsGain);
      }
      
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize ambient effects:', error);
    }
  });
  
  onDestroy(() => {
    if (effects) {
      Object.values(effects).forEach((player: any) => {
        player.stop();
        player.dispose();
      });
    }
    effectsGain?.dispose();
  });
  
  // Update effects volume
  $: if (effectsGain) {
    effectsGain.gain.rampTo($preferences.volumes.effects, 0.1);
  }
  
  // Start/stop effects based on active state
  $: if (initialized && browser) {
    for (const [id, player] of Object.entries(effects)) {
      if ($playerState.activeEffects.includes(id)) {
        if (player.state === 'stopped') {
          player.start();
        }
      } else {
        if (player.state === 'started') {
          player.stop();
        }
      }
    }
  }
</script>

<!-- This component doesn't render anything visible -->
<div class="ambient-effects-controller" aria-hidden="true"></div>

<style>
  .ambient-effects-controller {
    display: none;
  }
</style> 