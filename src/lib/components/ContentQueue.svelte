<script lang="ts">
  import { flip } from 'svelte/animate';
  import { dndzone } from 'svelte-dnd-action';
  import Icon from './Icon.svelte';
  import { 
    queue, 
    upcomingClips,
    removeClipFromQueue,
    reorderQueue,
    isGeneratingMore,
    user,
    type ClipMeta 
  } from '$lib/stores';
  
  let dragDisabled = true;
  let items = [];
  
  // Convert clips to draggable items
  $: items = $upcomingClips.map((clip, index) => ({
    id: clip.id,
    clip,
    index: index + $queue.indexOf(clip)
  }));
  
  function handleConsider(e) {
    items = e.detail.items;
    dragDisabled = false;
  }
  
  function handleFinalize(e) {
    items = e.detail.items;
    dragDisabled = true;
    
    // Reorder the actual queue based on new positions
    const newOrder = items.map(item => item.clip);
    const startIndex = $queue.indexOf(items[0]?.clip);
    if (startIndex >= 0) {
      $queue = [
        ...$queue.slice(0, startIndex),
        ...newOrder,
        ...$queue.slice(startIndex + items.length)
      ];
    }
  }
  
  function formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  function getTopicIcon(topicId: string): string {
    const icons = {
      'world-news': '🌍',
      'local-news': '📍',
      'weather': '🌤️',
      'markets': '📈',
      'crypto': '₿',
      'sports': '⚽',
      'twitter': '𝕏',
      'reddit': '🔥',
      'education': '🎓',
      'health': '💪'
    };
    return icons[topicId] || '📰';
  }
  
  async function generateMore() {
    if ($user.plan !== 'pro') return;
    
    // In production, this would call the API
    console.log('Generating more clips...');
    $isGeneratingMore = true;
    
    // Simulate API call
    setTimeout(() => {
      $isGeneratingMore = false;
    }, 2000);
  }
</script>

<div class="content-queue">
  <div class="queue-header">
    <h3 class="queue-title">Voice Queue</h3>
    <span class="queue-count">{items.length} clips</span>
  </div>
  
  {#if items.length === 0}
    <div class="empty-queue">
      <Icon name="microphone-off" size={48} color="var(--color-muted)" />
      <p>No voice clips in queue</p>
      <p class="hint">Enable topics below to start receiving content</p>
    </div>
  {:else}
    <div 
      class="queue-items"
      use:dndzone={{
        items,
        dragDisabled,
        dropTargetStyle: {},
        morphDisabled: true
      }}
      on:consider={handleConsider}
      on:finalize={handleFinalize}
    >
      {#each items as item (item.id)}
        <div 
          class="queue-item"
          animate:flip={{ duration: 200 }}
        >
          <button 
            class="drag-handle"
            aria-label="Drag to reorder"
            on:mousedown={() => dragDisabled = false}
            on:touchstart={() => dragDisabled = false}
          >
            <Icon name="grip-vertical" size={16} />
          </button>
          
          <div class="item-content">
            <div class="item-header">
              <span class="item-icon">{getTopicIcon(item.clip.topic)}</span>
              <span class="item-topic">{item.clip.topic.replace('-', ' ')}</span>
              <span class="item-duration">{formatDuration(item.clip.duration)}</span>
            </div>
            <h4 class="item-title">{item.clip.title}</h4>
          </div>
          
          <button 
            class="remove-btn"
            on:click={() => removeClipFromQueue(item.clip.id)}
            aria-label="Remove from queue"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      {/each}
    </div>
  {/if}
  
  {#if $user.plan === 'pro'}
    <button 
      class="generate-more-btn"
      on:click={generateMore}
      disabled={$isGeneratingMore}
    >
      {#if $isGeneratingMore}
        <Icon name="loader" size={16} />
        Generating...
      {:else}
        <Icon name="sparkles" size={16} />
        Generate More Now
      {/if}
    </button>
  {/if}
</div>

<style>
  .content-queue {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.75rem;
    padding: 1.5rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .queue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
  }
  
  .queue-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0;
  }
  
  .queue-count {
    font-size: 0.875rem;
    color: var(--color-muted);
  }
  
  .empty-queue {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    color: var(--color-muted);
  }
  
  .empty-queue p {
    margin: 0.5rem 0 0 0;
    font-size: 0.875rem;
  }
  
  .empty-queue .hint {
    font-size: 0.75rem;
    opacity: 0.7;
  }
  
  .queue-items {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-right: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .queue-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-accent);
    border-radius: 0.5rem;
    padding: 0.75rem;
    cursor: move;
    transition: all 0.2s ease;
  }
  
  .queue-item:hover {
    border-color: var(--color-primary);
    transform: translateY(-1px);
  }
  
  .drag-handle {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: grab;
    padding: 0.25rem;
    display: flex;
    align-items: center;
  }
  
  .drag-handle:active {
    cursor: grabbing;
  }
  
  .item-content {
    flex: 1;
    min-width: 0;
  }
  
  .item-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.25rem;
  }
  
  .item-icon {
    font-size: 1rem;
  }
  
  .item-topic {
    font-size: 0.75rem;
    color: var(--color-primary);
    text-transform: capitalize;
  }
  
  .item-duration {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin-left: auto;
  }
  
  .item-title {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-secondary);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .remove-btn {
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
    opacity: 0.7;
    transition: opacity 0.2s ease;
  }
  
  .remove-btn:hover {
    opacity: 1;
    color: var(--color-primary);
  }
  
  .generate-more-btn {
    width: 100%;
    background: var(--color-primary);
    color: #000;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem;
    font-weight: 600;
    font-size: 0.875rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    transition: background-color 0.2s ease;
  }
  
  .generate-more-btn:hover:not(:disabled) {
    background: var(--color-primary-hover);
  }
  
  .generate-more-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  .generate-more-btn :global(svg) {
    animation: spin 1s linear infinite;
  }
  
  .generate-more-btn:not(:disabled) :global(svg) {
    animation: none;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  /* Scrollbar styling */
  .queue-items::-webkit-scrollbar {
    width: 0.5rem;
  }
  
  .queue-items::-webkit-scrollbar-track {
    background: var(--color-accent);
    border-radius: 0.25rem;
  }
  
  .queue-items::-webkit-scrollbar-thumb {
    background: var(--color-primary);
    border-radius: 0.25rem;
  }
</style> 