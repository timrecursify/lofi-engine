<script lang="ts">
  import Icon from "./Icon.svelte";
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import Visualizer from "$lib/components/Visualizer/index.svelte";
  import { loadEngineModules } from "$lib/engine/clientWrapper";
  import { playerState, preferences } from "$lib/stores";
  import { trackEvent, AnalyticsEvent, UserJourneyStage, trackFunnel } from '$lib/services/analytics'

  // Tone.js and engine modules will be dynamically imported on client side
  let Tone: any = null;
  let engineModules: any = null;

  const STORAGE_KEY = "Volumes";
  const DEFAULT_VOLUMES = {
    rain: 1,
    thunder: 1,
    campfire: 1,
    jungle: 1,
    main_track: 1,
  };
  
  // Load previous volumes or default
  let volumes = browser ? 
    JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_VOLUMES)) : 
    DEFAULT_VOLUMES;
  
  // Convert linear volume (0 to 1) to dB
  const linearToDb = (value) =>
    value === 0 ? -Infinity : 20 * Math.log10(value);
  
  // Ducking parameters
  const DUCK_LEVEL = -12; // dB reduction for music during voice
  const DUCK_ATTACK = 0.3; // seconds to duck down
  const DUCK_RELEASE = 0.5; // seconds to return to normal

  // Audio chain - will be initialized on client side
  let cmp: any = null;
  let lpf: any = null;
  let vol: any = null;

  // State variables
  let key = "C";
  let progression = [];
  let scale = [];
  let progress = 0;
  let scalePos = 0;

  let pianoLoaded = false;
  let kickLoaded = false;
  let snareLoaded = false;
  let hatLoaded = false;

  let contextStarted = false;
  let genChordsOnce = false;

  let kickOff = false;
  let snareOff = false;
  let hatOff = false;
  let melodyDensity = 0.33;
  let melodyOff = false;
  
  // Style preset parameters
  let currentBpm = 70;
  let currentProgressionLength = 8;
  let currentSwing = 1.0;
  let currentFilterCutoff = 2000;
  let drumProbabilities = {
    kick: 0.9,
    snare: 0.8,
    hat: 0.8
  };

  let isPlaying = false;

  // Initialize instruments - will be set on client side
  let pn: any = null;
  let kick: any = null;
  let snare: any = null;
  let hat: any = null;
  let noise: any = null;

  // Sequences
  let chords, melody, kickLoop, snareLoop, hatLoop;

  onMount(async () => {
    if (!browser) return;

    try {
      // Dynamically import Tone.js and engine modules on client side
      const [ToneModule, modules] = await Promise.all([
        import("tone"),
        loadEngineModules()
      ]);
      Tone = ToneModule;
      engineModules = modules;

      // Initialize audio chain
      cmp = new Tone.Compressor({
        threshold: -6,
        ratio: 3,
        attack: 0.5,
        release: 0.1,
      });
      lpf = new Tone.Filter(2000, "lowpass");
      vol = new Tone.Volume(linearToDb(volumes.main_track));
      Tone.getDestination().chain(cmp, lpf, vol);
      Tone.getTransport().bpm.value = currentBpm;
      Tone.getTransport().swing = currentSwing;
      
      // Set initial filter cutoff
      lpf.frequency.value = currentFilterCutoff;

      // Initialize instruments
      pn = new engineModules.Piano(() => (pianoLoaded = true)).getSampler();
      kick = new engineModules.Kick(() => (kickLoaded = true)).getSampler();
      snare = new engineModules.Snare(() => (snareLoaded = true)).getSampler();
      hat = new engineModules.Hat(() => (hatLoaded = true)).getSampler();
      noise = engineModules.Noise;

      // Setup sequences
      setupSequences();

      // Listen for spacebar press
      const handleKeydown = (e) => {
        if (e.code === "Space" && e.target === document.body) {
          e.preventDefault();
          toggle();
        }
      };

      window.addEventListener("keydown", handleKeydown);

      return () => {
        window.removeEventListener("keydown", handleKeydown);
      };
    } catch (error) {
      console.error("Failed to initialize music player:", error);
    }
  });

  onDestroy(() => {
    if (Tone && Tone.getTransport && Tone.getTransport().state === "started") {
      noise && noise.stop();
      Tone.getTransport().stop();
    }
  });

  function setupSequences() {
    if (!Tone) return;

    chords = new Tone.Sequence(
      (time, note) => {
        playChord();
      },
      [""],
      "1n",
    );

    melody = new Tone.Sequence(
      (time, note) => {
        playMelody();
      },
      [""],
      "8n",
    );

    kickLoop = new Tone.Sequence(
      (time, note) => {
        if (!kickOff) {
          if (note === "C4" && Math.random() < drumProbabilities.kick) {
            kick.triggerAttack(note);
          } else if (note === "." && Math.random() < 0.1) {
            kick.triggerAttack("C4");
          }
        }
      },
      ["C4", "", "", "", "", "", "", "C4", "C4", "", ".", "", "", "", "", ""],
      "8n",
    );

    snareLoop = new Tone.Sequence(
      (time, note) => {
        if (!snareOff) {
          if (note !== "" && Math.random() < drumProbabilities.snare) {
            snare.triggerAttack(note);
          }
        }
      },
      ["", "C4"],
      "2n",
    );

    hatLoop = new Tone.Sequence(
      (time, note) => {
        if (!hatOff) {
          if (note !== "" && Math.random() < drumProbabilities.hat) {
            hat.triggerAttack(note);
          }
        }
      },
      ["C4", "C4", "C4", "C4", "C4", "C4", "C4", "C4"],
      "4n",
    );

    chords.humanize = true;
    melody.humanize = true;
    kickLoop.humanize = true;
    snareLoop.humanize = true;
    hatLoop.humanize = true;
  }

  function nextChord() {
    const nextProgress = progress === progression.length - 1 ? 0 : progress + 1;
    const nextKickOff = Math.random() < 0.15;
    const nextSnareOff = Math.random() < 0.2;
    const nextHatOff = Math.random() < 0.25;
    const nextMelodyDensity = Math.random() * 0.3 + 0.2;
    const nextMelodyOff = Math.random() < 0.25;

    if (progress === 4) {
      progress = nextProgress;
      kickOff = nextKickOff;
      snareOff = nextSnareOff;
      hatOff = nextHatOff;
    } else if (progress === 0) {
      progress = nextProgress;
      kickOff = nextKickOff;
      snareOff = nextSnareOff;
      hatOff = nextHatOff;
      melodyDensity = nextMelodyDensity;
      melodyOff = nextMelodyOff;
    } else {
      progress = nextProgress;
    }
  }

  function playChord() {
    if (!Tone || !pn) return;
    
    const chord = progression[progress];
    const root = Tone.Frequency(key + "3").transpose(chord.semitoneDist);
    const size = 4;
    const voicing = chord.generateVoicing(size);
    const notes = Tone.Frequency(root)
      .harmonize(voicing)
      .map((f) => Tone.Frequency(f).toNote());
    pn.triggerAttackRelease(notes, "1n");
    nextChord();
  }

  function playMelody() {
    if (!Tone || !pn || melodyOff || !(Math.random() < melodyDensity)) {
      return;
    }

    const descendRange = Math.min(scalePos, 7) + 1;
    const ascendRange = Math.min(scale.length - scalePos, 7);

    let descend = descendRange > 1;
    let ascend = ascendRange > 1;

    if (descend && ascend) {
      if (Math.random() > 0.5) {
        ascend = !descend;
      } else {
        descend = !ascend;
      }
    }

    let weights = descend
      ? engineModules?.intervalWeights.slice(0, descendRange) || []
      : engineModules?.intervalWeights.slice(0, ascendRange) || [];

    const sum = weights.reduce((prev, curr) => prev + curr, 0);
    weights = weights.map((w) => w / sum);
    for (let i = 1; i < weights.length; i++) {
      weights[i] += weights[i - 1];
    }

    const randomWeight = Math.random();
    let scaleDist = 0;
    let found = false;
    while (!found) {
      if (randomWeight <= weights[scaleDist]) {
        found = true;
      } else {
        scaleDist++;
      }
    }

    const scalePosChange = descend ? -scaleDist : scaleDist;
    const newScalePos = scalePos + scalePosChange;

    scalePos = newScalePos;
    pn.triggerAttackRelease(scale[newScalePos], "2n");
  }

  function generateProgression() {
    if (!engineModules || !Tone) return;
    
    const _scale = engineModules.fiveToFive;
    const newKey = engineModules.Keys[Math.floor(Math.random() * engineModules.Keys.length)];
    const newScale = Tone.Frequency(newKey + "5")
      .harmonize(_scale)
      .map((f) => Tone.Frequency(f).toNote());
    const newProgression = engineModules.ChordProgression.generate(currentProgressionLength);
    const newScalePos = Math.floor(Math.random() * _scale.length);

    key = newKey;
    progress = 0;
    progression = newProgression;
    scale = newScale;
    genChordsOnce = true;
    scalePos = newScalePos;
  }

  let sessionStartTime = Date.now()
  let hasPlayedBefore = false

  function toggle() {
    if (!Tone || !Tone.getTransport) return;
    
    progress = 0;
    if (Tone.getTransport().state === "started") {
      noise && noise.stop();
      Tone.getTransport().stop();
      isPlaying = false;
      
      // Track pause event
      trackEvent(AnalyticsEvent.MUSIC_PLAY_PAUSED, {
        session_duration: Date.now() - sessionStartTime,
        pause_reason: 'user_action'
      })
    } else {
      Tone.start();
      Tone.getTransport().start();
      noise && noise.start(0);
      chords && chords.start(0);
      melody && melody.start(0);
      kickLoop && kickLoop.start(0);
      snareLoop && snareLoop.start(0);
      hatLoop && hatLoop.start(0);
      isPlaying = true;
      
      // Track play event and first play funnel step
      if (!hasPlayedBefore) {
        trackFunnel('SIGN_UP_FUNNEL', UserJourneyStage.FIRST_PLAY, {
          time_to_first_play: Date.now() - sessionStartTime
        })
        hasPlayedBefore = true
      }
      
      trackEvent(AnalyticsEvent.MUSIC_PLAY_STARTED, {
        session_duration: Date.now() - sessionStartTime,
        preset: 'default'
      })
    }
  }

  function startAudioContext() {
    if (Tone) {
      Tone.start();
      contextStarted = true;
    }
  }

  function handleButtonAction() {
    if (!allSamplesLoaded) {
      return;
    } else if (!contextStarted) {
      startAudioContext();
    } else if (!genChordsOnce) {
      return;
    } else {
      toggle();
    }
  }

  $: allSamplesLoaded = pianoLoaded && kickLoaded && snareLoaded && hatLoaded;
  $: activeProgressionIndex = (progress + 7) % 8;
  
  // Update volume and handle ducking + progression changes
  onMount(() => {
    if (!browser) return;
    
    // Volume monitoring interval
    const volumeInterval = setInterval(() => {
      let updatedVol = JSON.parse(localStorage.getItem(STORAGE_KEY) || JSON.stringify(DEFAULT_VOLUMES));
      if (vol) {
        const baseVolume = linearToDb(updatedVol.main_track * $preferences.volumes.music);
        const targetVolume = $playerState.isDucking ? baseVolume + DUCK_LEVEL : baseVolume;
        
        // Smooth volume transition
        if ($playerState.isDucking) {
          vol.volume.rampTo(targetVolume, DUCK_ATTACK);
        } else {
          vol.volume.rampTo(targetVolume, DUCK_RELEASE);
        }
      }
    }, 100);

    // Auto-progression change interval (every 60 seconds)
    const progressionInterval = setInterval(() => {
      // Only generate new progression if music is playing
      if (isPlaying && Tone && Tone.getTransport && Tone.getTransport().state === "started") {
        console.log("Auto-generating new chord progression...");
        generateProgression();
      }
    }, 60000); // 60 seconds

    return () => {
      clearInterval(volumeInterval);
      clearInterval(progressionInterval);
    };
  });
  
  // Update player state when playing status changes
  $: if (browser) {
    playerState.update(state => ({
      ...state,
      isPlaying,
      currentTrack: isPlaying ? 'generative' : null
    }));
  }
  
  // Handle style preset changes
  export function applyStylePreset(parameters) {
    currentBpm = parameters.bpm;
    currentProgressionLength = parameters.progressionLength;
    currentSwing = parameters.swing;
    currentFilterCutoff = parameters.filterCutoff;
    melodyDensity = parameters.melodyDensity;
    drumProbabilities = {
      kick: parameters.drumIntensity.kickProbability,
      snare: parameters.drumIntensity.snareProbability,
      hat: parameters.drumIntensity.hatProbability
    };
    
    // Apply changes immediately if Tone is available
    if (Tone && Tone.getTransport) {
      Tone.getTransport().bpm.rampTo(currentBpm, 2);
      Tone.getTransport().swing = currentSwing;
      
      if (lpf) {
        lpf.frequency.rampTo(currentFilterCutoff, 1);
      }
      
      // Generate new progression with updated length
      if (isPlaying && genChordsOnce) {
        generateProgression();
      }
    }
  }

  // Automatically start audio context after samples are loaded
  $: if (allSamplesLoaded && !contextStarted) {
    startAudioContext();
    generateProgression();
  }
</script>

<!-- Music Player Component -->
<div class="music-player">
  <!-- Main Play Button -->
  <div class="play-controls">
    <button
      class="play-button"
      on:click={handleButtonAction}
      disabled={!allSamplesLoaded}
      aria-label={isPlaying ? "Pause music" : "Play music"}
    >
      {#if !allSamplesLoaded}
        <span class="loading-icon">
          <Icon name="loading" size={36} />
        </span>
      {:else if !contextStarted}
        <span class="init-text">Initialize</span>
      {:else if !genChordsOnce}
        <span class="disabled-icon">
          <Icon name="play" size={36} />
        </span>
      {:else if isPlaying}
        <Icon name="pause" size={36} />
      {:else}
        <Icon name="play" size={36} />
      {/if}
    </button>

    <button 
      class="generate-button"
      on:click={generateProgression}
      disabled={!allSamplesLoaded}
      aria-label="Generate new chord progression"
    >
      <Icon name="refresh" size={20} />
    </button>
  </div>

  <!-- Loading Status -->
  {#if !allSamplesLoaded}
    <div class="loading-status">
      <p class="loading-text">Loading instruments...</p>
      <div class="loading-progress">
        <div class="progress-item" class:loaded={pianoLoaded}>Piano</div>
        <div class="progress-item" class:loaded={kickLoaded}>Kick</div>
        <div class="progress-item" class:loaded={snareLoaded}>Snare</div>
        <div class="progress-item" class:loaded={hatLoaded}>Hi-Hat</div>
      </div>
    </div>
  {/if}

  <!-- Chord Progression Display -->
  {#if allSamplesLoaded && contextStarted && genChordsOnce}
    <div class="chord-progression">
      <div class="key-display">{key}</div>
      <div class="chord-sequence">
        {#each progression as chord, idx}
          <div 
            class="chord-item"
            class:active={idx === activeProgressionIndex}
          >
            {chord.degree}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Visualizer -->
  {#if Tone && Tone.getTransport && Tone.getTransport().state === "started"}
    <div class="visualizer-container">
      <Visualizer audio={Tone.getDestination()} />
    </div>
  {/if}
</div>

<style>
  .music-player {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
  }

  /* Play Controls */
  .play-controls {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .play-button {
    width: 5rem;
    height: 5rem;
    border-radius: 50%;
    background: var(--color-primary);
    color: #000000;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
  }

  .play-button:hover:not(:disabled) {
    background: var(--color-primary-hover);
    transform: scale(1.05);
    box-shadow: 0 6px 16px rgba(29, 185, 84, 0.4);
  }

  .play-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .loading-icon :global(svg) {
    animation: spin 1s linear infinite;
  }

  .init-text {
    font-size: 0.75rem;
    font-weight: 600;
    text-align: center;
  }

  .disabled-icon {
    opacity: 0.5;
  }

  .generate-button {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    color: var(--color-secondary);
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .generate-button:hover:not(:disabled) {
    background: var(--color-accent);
    transform: rotate(90deg);
  }

  .generate-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* Loading Status */
  .loading-status {
    text-align: center;
  }

  .loading-text {
    color: var(--color-muted);
    margin: 0 0 0.75rem 0;
    font-size: 0.875rem;
  }

  .loading-progress {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
    flex-wrap: wrap;
  }

  .progress-item {
    padding: 0.25rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 1rem;
    font-size: 0.75rem;
    color: var(--color-muted);
    transition: all 0.2s ease;
  }

  .progress-item.loaded {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
  }

  /* Chord Progression */
  .chord-progression {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
  }

  .key-display {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-primary);
    background: var(--color-surface);
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-accent);
  }

  .chord-sequence {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
  }

  .chord-item {
    padding: 0.375rem 0.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.25rem;
    font-size: 0.875rem;
    color: var(--color-muted);
    transition: all 0.2s ease;
  }

  .chord-item.active {
    background: var(--color-primary);
    color: #000000;
    border-color: var(--color-primary);
    transform: scale(1.1);
  }

  /* Visualizer */
  .visualizer-container {
    width: 100%;
    max-width: 300px;
    height: 120px;
    overflow: hidden;
    border-radius: 0.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
  }

  /* Animations */
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Responsive Design */
  @media (max-width: 768px) {
    .music-player {
      gap: 1rem;
    }

    .play-button {
      width: 4rem;
      height: 4rem;
    }

    .chord-sequence {
      gap: 0.375rem;
    }

    .chord-item {
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
    }

    .visualizer-container {
      height: 80px;
    }
  }
</style> 