<script lang="ts">
  import Icon from './Icon.svelte';
  import { 
    AVAILABLE_TOPICS,
    preferences,
    user,
    toggleTopic,
    availableTopicsForUser
  } from '$lib/stores';
  
  // Group topics by category
  const topicCategories = {
    'News & Information': ['world-news', 'local-news', 'weather'],
    'Financial': ['markets', 'crypto'],
    'Social & Entertainment': ['sports', 'twitter', 'reddit'],
    'Learning & Wellness': ['education', 'health']
  };
  
  function isTopicEnabled(topicId: string): boolean {
    return $preferences.enabledTopics.includes(topicId);
  }
  
  function handleToggle(topicId: string) {
    const topic = AVAILABLE_TOPICS.find(t => t.id === topicId);
    if (topic?.isPro && $user.plan !== 'pro') {
      // Show upgrade prompt
      showUpgradePrompt = true;
      return;
    }
    toggleTopic(topicId);
  }
  
  let showUpgradePrompt = false;
</script>

<div class="topic-toggles">
  <div class="toggles-header">
    <h3 class="toggles-title">Voice Content</h3>
    <p class="toggles-subtitle">Choose what you want to hear between songs</p>
  </div>
  
  <div class="topic-categories">
    {#each Object.entries(topicCategories) as [category, topicIds]}
      <div class="category-section">
        <h4 class="category-title">{category}</h4>
        
        <div class="topic-grid">
          {#each topicIds as topicId}
            {@const topic = AVAILABLE_TOPICS.find(t => t.id === topicId)}
            {#if topic}
              <button
                class="topic-toggle"
                class:enabled={isTopicEnabled(topicId)}
                class:pro-locked={topic.isPro && $user.plan !== 'pro'}
                on:click={() => handleToggle(topicId)}
                aria-pressed={isTopicEnabled(topicId)}
              >
                <div class="toggle-header">
                  <span class="topic-icon">{topic.icon}</span>
                  <span class="topic-name">{topic.name}</span>
                  {#if topic.isPro}
                    <span class="pro-badge">
                      <Icon name="crown" size={12} />
                      PRO
                    </span>
                  {/if}
                </div>
                
                <p class="topic-description">{topic.description}</p>
                
                <div class="topic-meta">
                  <span class="meta-item">
                    <Icon name="clock" size={12} />
                    {topic.updateFrequency}
                  </span>
                  <span class="meta-item">
                    <Icon name="timer" size={12} />
                    {Math.floor(topic.clipLengthRange[0] / 60)}-{Math.ceil(topic.clipLengthRange[1] / 60)} min
                  </span>
                </div>
                
                {#if topic.isPro && $user.plan !== 'pro'}
                  <div class="lock-overlay">
                    <Icon name="lock" size={24} />
                  </div>
                {/if}
              </button>
            {/if}
          {/each}
        </div>
      </div>
    {/each}
  </div>
  
  <!-- Upgrade Prompt Modal -->
  {#if showUpgradePrompt}
    <div 
      class="modal-overlay" 
      on:click={() => showUpgradePrompt = false}
      on:keydown={(e) => e.key === 'Escape' && (showUpgradePrompt = false)}
      role="button"
      tabindex="-1"
    >
      <div 
        class="upgrade-modal" 
        role="dialog"
        aria-modal="true"
      >
        <button 
          class="close-btn"
          on:click={() => showUpgradePrompt = false}
          aria-label="Close"
        >
          <Icon name="x" size={20} />
        </button>
        
        <div class="modal-content">
          <Icon name="crown" size={48} color="var(--color-primary)" />
          <h3>Unlock Pro Content</h3>
          <p>Get access to exclusive content including:</p>
          
          <ul class="pro-features">
            <li>📈 Real-time market updates</li>
            <li>₿ Cryptocurrency news and prices</li>
            <li>𝕏 Twitter/X trending topics</li>
            <li>🔥 Reddit hot posts</li>
            <li>✨ Generate clips on-demand</li>
            <li>🚫 No advertisements</li>
          </ul>
          
          <div class="modal-actions">
            <button class="btn-primary">
              Upgrade to Pro - $4.99/mo
            </button>
            <button 
              class="btn-secondary"
              on:click={() => showUpgradePrompt = false}
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .topic-toggles {
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 0.75rem;
    padding: 1.5rem;
  }
  
  .toggles-header {
    margin-bottom: 1.5rem;
  }
  
  .toggles-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--color-primary);
    margin: 0 0 0.25rem 0;
  }
  
  .toggles-subtitle {
    font-size: 0.875rem;
    color: var(--color-muted);
    margin: 0;
  }
  
  .topic-categories {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
  
  .category-section {
    border-top: 1px solid var(--color-accent);
    padding-top: 1rem;
  }
  
  .category-section:first-child {
    border-top: none;
    padding-top: 0;
  }
  
  .category-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 1rem 0;
  }
  
  .topic-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.75rem;
  }
  
  .topic-toggle {
    position: relative;
    background: var(--color-bg);
    border: 2px solid var(--color-accent);
    border-radius: 0.5rem;
    padding: 1rem;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s ease;
    overflow: hidden;
  }
  
  .topic-toggle:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }
  
  .topic-toggle.enabled {
    background: rgba(29, 185, 84, 0.1);
    border-color: var(--color-primary);
  }
  
  .topic-toggle.pro-locked {
    opacity: 0.7;
  }
  
  .toggle-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  
  .topic-icon {
    font-size: 1.25rem;
  }
  
  .topic-name {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-secondary);
    flex: 1;
  }
  
  .pro-badge {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: var(--color-primary);
    color: #000;
    padding: 0.125rem 0.375rem;
    border-radius: 0.25rem;
    font-size: 0.625rem;
    font-weight: 700;
  }
  
  .topic-description {
    font-size: 0.75rem;
    color: var(--color-muted);
    margin: 0 0 0.75rem 0;
    line-height: 1.4;
  }
  
  .topic-meta {
    display: flex;
    gap: 0.75rem;
    font-size: 0.625rem;
    color: var(--color-muted);
  }
  
  .meta-item {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .lock-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(2px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-muted);
  }
  
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .upgrade-modal {
    position: relative;
    background: var(--color-surface);
    border: 1px solid var(--color-accent);
    border-radius: 1rem;
    padding: 2rem;
    max-width: 420px;
    width: 100%;
  }
  
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: var(--color-muted);
    cursor: pointer;
    padding: 0.25rem;
  }
  
  .close-btn:hover {
    color: var(--color-secondary);
  }
  
  .modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 1rem;
  }
  
  .modal-content h3 {
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--color-primary);
    margin: 0;
  }
  
  .modal-content p {
    color: var(--color-muted);
    margin: 0;
  }
  
  .pro-features {
    list-style: none;
    padding: 0;
    margin: 0;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .pro-features li {
    font-size: 0.875rem;
    color: var(--color-secondary);
  }
  
  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    width: 100%;
    margin-top: 1rem;
  }
  
  /* Buttons */
  .btn-primary {
    background: var(--color-primary);
    color: #000;
    border: none;
    border-radius: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .btn-primary:hover {
    background: var(--color-primary-hover);
  }
  
  .btn-secondary {
    background: transparent;
    color: var(--color-muted);
    border: 1px solid var(--color-accent);
    border-radius: 0.5rem;
    padding: 0.75rem 1.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .btn-secondary:hover {
    background: var(--color-accent);
    color: var(--color-secondary);
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .topic-grid {
      grid-template-columns: 1fr;
    }
  }
</style> 