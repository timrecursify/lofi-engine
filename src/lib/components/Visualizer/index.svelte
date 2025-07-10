<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { browser } from '$app/environment';
  
    export let audio; // This will receive the Tone.Master or other audio source
  
    let Tone: any = null;
    let fft: any = null;
    let freqs = Array(16).fill(-100); // Initialize with default values
    let animationFrame: number | undefined;
  
    function animate() {
      if (fft) {
        freqs = [...fft.getValue()];
      }
      animationFrame = requestAnimationFrame(animate);
    }
  
    onMount(async () => {
      if (!browser) return;
      
      // Dynamically import Tone.js on client side
      const ToneModule = await import('tone');
      Tone = ToneModule.default || ToneModule;
      
      fft = new Tone.FFT(16);
      audio.connect(fft);
      animationFrame = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrame !== undefined) {
          cancelAnimationFrame(animationFrame);
        }
        if (audio && fft) {
          audio.disconnect(fft);
        }
      };
    });
  
    onDestroy(() => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    });
  </script>
  
  <div class="freqList">
    {#each freqs as freq, i (i)}
      <div 
        class="freqBar"
        style="height: {Math.max(3 * (69 + 0.5 * freq), 10)}px;"
      ></div>
    {/each}
  </div>
  
  <style>
    .freqList {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      height: 100%;
      width: 100%;
    }
    
    .freqBar {
      flex: 1;
      background-color: rgba(255, 255, 255, 0.7);
      margin: 0 2px;
      min-width: 5px;
      border-radius: 2px 2px 0 0;
      transition: height 0.05s ease;
    }
  </style>