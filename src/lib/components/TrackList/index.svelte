<script lang="ts">
  import { IconChevronDown } from "@tabler/icons-svelte";
  import TrackListItem from "./TrackListItem.svelte";
  import { onMount, onDestroy } from "svelte";
  import { browser } from "$app/environment";

  let tracks = [
    {
      id: 1,
      track: "Wind-Mark_DiAngelo-1940285615.mp3",
      qoute: "We cannot direct the wind, but we can adjust the sails.",
      isPlaying: false,
    },
    {
      id: 2,
      track: "small-waves-onto-the-sand-143040.mp3",
      qoute: "Sea is emotion incarnate. It loves, hates, and weeps.",
      isPlaying: false,
    },
    {
      id: 3,
      track: "night-ambience-17064.mp3",
      qoute: "The night reveals the stars as the darkness reveals the self.",
      isPlaying: false,
    },
    {
      id: 4,
      track: "urban-seagulls-30068.mp3",
      qoute: "The sunset sky speaks of a thousand of colors.",
      isPlaying: false,
    },
    {
      id: 5,
      track: "office-ambience-6322.mp3",
      qoute: "Work hard in silence, let your success be your noise.",
      isPlaying: false,
    },
    {
      id: 6,
      track: "city-ambience-9272.mp3",
      qoute: "The city is not a concrete jungle, it is a human zoo.",
      isPlaying: false,
    },
    {
      id: 7,
      track: "old-server-turning-on-and-off-24540.mp3",
      qoute: "The past is a place of reference, not a place of residence.",
      isPlaying: false,
    },
    {
      id: 8,
      track: "train-to-munich-germany.mp3",
      qoute: "Trips don't last forever, but memories do.",
      isPlaying: false,
    },
    {
      id: 9,
      track: "underwater-white-noise-46423.mp3",
      qoute: "Please help me, I'm underwater.",
      isPlaying: false,
    },
  ];

  let activeAudios = [];
  let visibleTrackId = 1;

  function nextTrack() {
    visibleTrackId < 9 ? visibleTrackId++ : (visibleTrackId = 1);
  }
  
  function prevTrack() {
    visibleTrackId > 1 ? visibleTrackId-- : (visibleTrackId = 9);
  }

  function handleKeydown(e: KeyboardEvent) {
    // Shortcut for stopping all effects with "k" key
    if (e.key === "k") {
      activeAudios.forEach((item) => {
        item.audio.pause();
      });
      console.log("activeAudios", activeAudios);
      activeAudios = [];
      tracks.forEach((track) => {
        track.isPlaying = false;
      });
      tracks = tracks; // Trigger reactivity
      return;
    }

    // Handle number keys 1-9 for track toggles
    const keyNum = parseInt(e.key);
    if (keyNum >= 1 && keyNum <= 9) {
      const trackIndex = keyNum - 1;
      tracks[trackIndex].isPlaying = !tracks[trackIndex].isPlaying;
      
      if (tracks[trackIndex].isPlaying) {
        const audio = new Audio(
          `assets/engine/tracks/${tracks[trackIndex].track}`
        );
        audio.play();
        audio.loop = true;
        activeAudios.push({
          id: tracks[trackIndex].id,
          audio,
        });
        visibleTrackId = keyNum;
      } else {
        activeAudios.forEach((item) => {
          if (item.id === tracks[trackIndex].id) {
            item.audio.pause();
          }
        });
        // Remove from activeAudios
        activeAudios = activeAudios.filter(
          (item) => item.id !== tracks[trackIndex].id
        );
      }
      tracks = tracks; // Trigger reactivity
      return;
    }

    // Handle arrow keys for navigation
    if (e.target instanceof HTMLElement && !e.target.closest("input")) {
      if (e.key === "ArrowUp") {
        prevTrack();
      }
      if (e.key === "ArrowDown") {
        nextTrack();
      }
    }
  }

  onMount(() => {
    if (browser) {
      window.addEventListener("keydown", handleKeydown);
    }
  });

  onDestroy(() => {
    if (browser) {
      window.removeEventListener("keydown", handleKeydown);
      // Clean up any playing audio
      activeAudios.forEach((item) => {
        item.audio.pause();
      });
    }
  });
</script>

<div class="track-list">
  <div class="wrapper">
    <div class="carousel">
      {#each tracks as track}
        <TrackListItem
          {activeAudios}
          {track}
          {visibleTrackId}
          setMeVisible={(id) => (visibleTrackId = id)}
        />
      {/each}
    </div>
  </div>
  <div id="btn-view">
    <button id="navigate-btn" on:click={prevTrack}>
      <IconChevronDown />
    </button>
  </div>
</div>

<style>
  .track-list {
    width: 28vw;
    height: 65vh;
    padding: 20px 10px;
    border-radius: 20px;
    backdrop-filter: blur(0px);
    z-index: 20;
  }

  .wrapper {
    height: 100%;
    width: 100%;
    display: flex;
    justify-content: center;
  }

  .carousel {
    position: relative;
    width: 100%;
    max-width: 500px;
    display: flex;
    justify-content: center;
    flex-direction: column;
  }
  #btn-view {
    width: 120%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #navigate-btn {
    width: 30px;
    height: 30px;
    color: white;
    border-radius: 99px;
    display: flex;
    justify-content: center;
    align-items: center;
  }
  #navigate-btn:hover {
    background-color: rgba(0, 0, 0, 30%);
    backdrop-filter: blur(10px);
  }

  @media only screen and (max-width: 600px) {
    .track-list {
      display: none;
    }
    #btn-view {
      display: none;
    }
  }
</style>
