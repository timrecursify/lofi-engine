<script lang="ts">
  import { IconNews, IconSchool, IconCloud, IconClock } from "@tabler/icons-svelte";
  import { onMount } from "svelte";

  export const volume: number = 0.8; // Default volume, external reference only
  export let isQueueActive: boolean = false;

  // Voice queue state
  let voiceQueue = [];
  let currentlyPlaying = null;
  let nextPlayTime = null;
  let queueInterval = null;
  let timeUntilNext = 0;

  // Voice types with their metadata
  const voiceTypes = {
    news: {
      icon: IconNews,
      label: "News Update",
      color: "#3B82F6",
      duration: 30000 // 30 seconds
    },
    educate: {
      icon: IconSchool,
      label: "Educational",
      color: "#10B981",
      duration: 25000 // 25 seconds
    },
    weather: {
      icon: IconCloud,
      label: "Weather",
      color: "#F59E0B",
      duration: 20000 // 20 seconds
    }
  };

  // Initialize queue with sample content
  onMount(() => {
    generateQueue();
    startQueueTimer();
    
    return () => {
      if (queueInterval) {
        clearInterval(queueInterval);
      }
    };
  });

  function generateQueue() {
    const types = Object.keys(voiceTypes);
    const newQueue = [];
    
    // Generate 5 upcoming voice clips
    for (let i = 0; i < 5; i++) {
      const randomType = types[Math.floor(Math.random() * types.length)];
      const playTime = Date.now() + (i + 1) * 180000; // Every 3 minutes
      
      newQueue.push({
        id: `voice-${Date.now()}-${i}`,
        type: randomType,
        playTime: playTime,
        title: generateTitle(randomType),
        isPlaying: false
      });
    }
    
    voiceQueue = newQueue;
    updateNextPlayTime();
  }

  function generateTitle(type) {
    const titles = {
      news: [
        "Breaking: Tech Innovation Update",
        "Market Analysis Brief",
        "Science Discovery Report",
        "Cultural Spotlight",
        "Innovation Roundup"
      ],
      educate: [
        "Learning: JavaScript Fundamentals",
        "Study: Creative Problem Solving",
        "Explore: Design Principles",
        "Discover: Programming Patterns",
        "Master: Productivity Techniques"
      ],
      weather: [
        "Weather: Sunny and Productive",
        "Climate: Perfect Focus Conditions",
        "Forecast: Clear Coding Weather",
        "Conditions: Ideal for Learning",
        "Outlook: Bright and Energizing"
      ]
    };
    
    const typeOptions = titles[type] || [`${type} content`];
    return typeOptions[Math.floor(Math.random() * typeOptions.length)];
  }

  function startQueueTimer() {
    if (queueInterval) {
      clearInterval(queueInterval);
    }
    
    queueInterval = setInterval(() => {
      updateNextPlayTime();
      processQueue();
    }, 1000);
  }

  function updateNextPlayTime() {
    if (voiceQueue.length > 0) {
      const nextItem = voiceQueue.find(item => !item.isPlaying);
      if (nextItem) {
        nextPlayTime = nextItem.playTime;
        timeUntilNext = Math.max(0, nextPlayTime - Date.now());
      }
    }
  }

  function processQueue() {
    const now = Date.now();
    
    // Check if any item should start playing
    voiceQueue.forEach(item => {
      if (!item.isPlaying && now >= item.playTime) {
        playVoiceItem(item);
      }
    });
    
    // Remove completed items and add new ones
    voiceQueue = voiceQueue.filter(item => {
      if (item.isPlaying && now >= item.playTime + voiceTypes[item.type].duration) {
        return false; // Remove completed item
      }
      return true;
    });
    
    // Add new items to maintain queue length
    while (voiceQueue.length < 5) {
      const types = Object.keys(voiceTypes);
      const randomType = types[Math.floor(Math.random() * types.length)];
      const lastItem = voiceQueue[voiceQueue.length - 1];
      const playTime = (lastItem?.playTime || now) + 180000; // 3 minutes after last item
      
      voiceQueue.push({
        id: `voice-${Date.now()}-${Math.random()}`,
        type: randomType,
        playTime: playTime,
        title: generateTitle(randomType),
        isPlaying: false
      });
    }
    
    voiceQueue = voiceQueue; // Trigger reactivity
  }

  function playVoiceItem(item) {
    // Mark as playing
    item.isPlaying = true;
    currentlyPlaying = item;
    
    // Emit event to parent component to actually play audio
    const event = new CustomEvent('playVoice', {
      detail: { type: item.type, title: item.title }
    });
    document.dispatchEvent(event);
    
    // Stop playing after duration
    setTimeout(() => {
      item.isPlaying = false;
      if (currentlyPlaying === item) {
        currentlyPlaying = null;
      }
    }, voiceTypes[item.type].duration);
  }

  function formatTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  function skipToNext() {
    if (voiceQueue.length > 0) {
      const nextItem = voiceQueue.find(item => !item.isPlaying);
      if (nextItem) {
        playVoiceItem(nextItem);
      }
    }
  }

  function regenerateQueue() {
    generateQueue();
  }
</script>

<div class="voice-queue" class:active={isQueueActive}>
  <div class="queue-header">
    <h3>Voice Queue</h3>
    <div class="queue-controls">
      <button on:click={regenerateQueue} class="control-btn">
        <IconClock size={16} />
        Refresh
      </button>
    </div>
  </div>

  {#if currentlyPlaying}
    <div class="now-playing">
      <div class="playing-indicator">
        <div class="pulse-dot"></div>
        <span>Now Playing</span>
      </div>
      <div class="playing-content">
        <svelte:component this={voiceTypes[currentlyPlaying.type].icon} size={20} />
        <div class="playing-info">
          <div class="playing-title">{currentlyPlaying.title}</div>
          <div class="playing-type">{voiceTypes[currentlyPlaying.type].label}</div>
        </div>
      </div>
    </div>
  {/if}

  <div class="queue-list">
    <div class="queue-section">
      <h4>Upcoming</h4>
      {#if timeUntilNext > 0}
        <div class="next-timer">
          Next in {formatTime(timeUntilNext)}
        </div>
      {/if}
    </div>

    {#each voiceQueue.filter(item => !item.isPlaying) as item (item.id)}
      <div class="queue-item" class:next={item === voiceQueue.find(i => !i.isPlaying)}>
        <div class="item-icon" style="background-color: {voiceTypes[item.type].color}20;">
          <svelte:component this={voiceTypes[item.type].icon} size={18} color={voiceTypes[item.type].color} />
        </div>
        <div class="item-content">
          <div class="item-title">{item.title}</div>
          <div class="item-meta">
            <span class="item-type">{voiceTypes[item.type].label}</span>
            <span class="item-time">
              {new Date(item.playTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <div class="queue-footer">
    <button on:click={skipToNext} class="skip-btn">
      Skip to Next
    </button>
  </div>
</div>

<style>
  .voice-queue {
    position: absolute;
    right: 60px;
    top: 0;
    width: 300px;
    max-height: 400px;
    padding: 20px;
    background: rgba(25, 20, 20, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: white;
    font-family: 'Inter', sans-serif;
    overflow-y: auto;
    transform: translateX(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .voice-queue.active {
    transform: translateX(0);
    opacity: 1;
  }

  .queue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .queue-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .queue-controls {
    display: flex;
    gap: 8px;
  }

  .control-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .control-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .now-playing {
    margin-bottom: 16px;
    padding: 12px;
    background: rgba(59, 130, 246, 0.1);
    border: 1px solid rgba(59, 130, 246, 0.3);
    border-radius: 12px;
  }

  .playing-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }

  .pulse-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3B82F6;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .playing-indicator span {
    font-size: 0.75rem;
    color: #3B82F6;
    font-weight: 500;
  }

  .playing-content {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .playing-info {
    flex: 1;
  }

  .playing-title {
    font-size: 0.9rem;
    font-weight: 500;
    margin-bottom: 2px;
  }

  .playing-type {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.7);
  }

  .queue-section {
    margin-bottom: 12px;
  }

  .queue-section h4 {
    margin: 0 0 8px 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
  }

  .next-timer {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.6);
    margin-bottom: 8px;
  }

  .queue-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px;
    border-radius: 8px;
    margin-bottom: 6px;
    transition: background 0.2s;
  }

  .queue-item:hover {
    background: rgba(255, 255, 255, 0.05);
  }

  .queue-item.next {
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .item-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .item-content {
    flex: 1;
    min-width: 0;
  }

  .item-title {
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .item-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .queue-footer {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .skip-btn {
    width: 100%;
    padding: 8px 16px;
    background: rgba(255, 255, 255, 0.1);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.8rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .skip-btn:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  @media only screen and (max-width: 600px) {
    .voice-queue {
      right: 10px;
      width: 280px;
    }
  }
</style> 