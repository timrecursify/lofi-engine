<script lang="ts">
  import { user } from '$lib/stores';
  import { isProUser } from '$lib/auth';
  import Icon from './Icon.svelte';
  
  // Props
  export let showUpgrade = true;           // Show upgrade prompt when blocked
  export let showLock = true;              // Show lock icon overlay
  export let showBadge = true;             // Show PRO badge
  export let disabled = false;             // Disable interaction completely
  export let customPrompt = '';            // Custom upgrade prompt text
  export let feature = '';                 // Feature name for analytics
  export let variant: 'inline' | 'modal' | 'tooltip' = 'modal'; // Upgrade prompt style
  
  // State
  let showUpgradePrompt = false;
  
  // Reactive values
  $: userIsPro = isProUser();
  $: isRestricted = !userIsPro;
  
  // Handle clicks on restricted content
  function handleRestrictedClick(event: Event) {
    if (isRestricted) {
      event.preventDefault();
      event.stopPropagation();
      
      if (showUpgrade) {
        showUpgradePrompt = true;
        
        // Track feature gate interaction for analytics
        if (feature) {
          console.log(`Pro gate triggered for feature: ${feature}`);
          // In production, send to analytics service
        }
      }
    }
  }
  
  function closeUpgradePrompt() {
    showUpgradePrompt = false;
  }
  
  function handleUpgrade() {
    // Track upgrade intent
    console.log(`Upgrade intent from feature: ${feature}`);
    // In production, redirect to upgrade page or open Stripe checkout
    window.location.href = '/upgrade';
  }
</script>

<div 
  class="pro-gate"
  class:restricted={isRestricted}
  class:disabled={disabled && isRestricted}
>
  <!-- Content wrapper with conditional interaction blocking -->
  <div 
    class="content-wrapper"
    on:click={handleRestrictedClick}
    on:keydown={(e) => e.key === 'Enter' && handleRestrictedClick(e)}
    role={isRestricted ? 'button' : undefined}
    tabindex={isRestricted ? 0 : undefined}
  >
    <slot {userIsPro} {isRestricted} />
    
    <!-- Pro badge overlay -->
    {#if showBadge && isRestricted}
      <div class="pro-badge">
        <Icon name="crown" size={12} />
        <span>PRO</span>
      </div>
    {/if}
    
    <!-- Lock overlay -->
    {#if showLock && isRestricted}
      <div class="lock-overlay">
        <Icon name="lock" size={24} color="rgba(255, 255, 255, 0.8)" />
      </div>
    {/if}
  </div>
  
  <!-- Upgrade Prompts -->
  {#if showUpgradePrompt}
    {#if variant === 'modal'}
      <!-- Modal Upgrade Prompt -->
      <div 
        class="modal-overlay"
        on:click={closeUpgradePrompt}
        on:keydown={(e) => e.key === 'Escape' && closeUpgradePrompt()}
        role="button"
        tabindex="-1"
      >
        <div class="upgrade-modal" role="dialog" aria-modal="true">
          <button class="close-btn" on:click={closeUpgradePrompt} aria-label="Close">
            <Icon name="x" size={20} />
          </button>
          
          <div class="modal-content">
            <div class="modal-header">
              <Icon name="crown" size={48} color="var(--color-primary)" />
              <h3>Unlock Pro Features</h3>
            </div>
            
            <div class="modal-body">
              {#if customPrompt}
                <p class="custom-prompt">{customPrompt}</p>
              {:else}
                <p>Upgrade to Pro and unlock exclusive features:</p>
              {/if}
              
              <ul class="pro-features-list">
                <li><Icon name="check" size={16} color="var(--color-primary)" /> All premium content topics</li>
                <li><Icon name="check" size={16} color="var(--color-primary)" /> Real-time market & crypto updates</li>
                <li><Icon name="check" size={16} color="var(--color-primary)" /> Social media trending topics</li>
                <li><Icon name="check" size={16} color="var(--color-primary)" /> Advanced visual scenes</li>
                <li><Icon name="check" size={16} color="var(--color-primary)" /> No advertisements</li>
                <li><Icon name="check" size={16} color="var(--color-primary)" /> Priority support</li>
              </ul>
            </div>
            
            <div class="modal-actions">
              <button class="upgrade-btn" on:click={handleUpgrade}>
                <Icon name="crown" size={16} />
                Upgrade to Pro - $4.99/mo
              </button>
              <button class="later-btn" on:click={closeUpgradePrompt}>
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      </div>
    {:else if variant === 'inline'}
      <!-- Inline Upgrade Prompt -->
      <div class="inline-upgrade">
        <div class="inline-content">
          <Icon name="crown" size={20} color="var(--color-primary)" />
          <span class="inline-text">
            {customPrompt || 'This is a Pro feature'}
          </span>
          <button class="inline-upgrade-btn" on:click={handleUpgrade}>
            Upgrade
          </button>
        </div>
      </div>
    {:else if variant === 'tooltip'}
      <!-- Tooltip Upgrade Prompt -->
      <div class="tooltip-upgrade">
        <div class="tooltip-content">
          <Icon name="crown" size={16} color="var(--color-primary)" />
          <span>{customPrompt || 'Pro feature - Upgrade to unlock'}</span>
          <button class="tooltip-btn" on:click={handleUpgrade}>
            <Icon name="external-link" size={14} />
          </button>
        </div>
      </div>
    {/if}
  {/if}
</div>

<style>
  .pro-gate {
    position: relative;
    display: contents;
  }
  
  .content-wrapper {
    position: relative;
  }
  
  .pro-gate.restricted .content-wrapper {
    cursor: pointer;
    filter: grayscale(0.3);
    opacity: 0.8;
    transition: all 0.2s ease;
  }
  
  .pro-gate.restricted .content-wrapper:hover {
    filter: grayscale(0.1);
    opacity: 0.9;
  }
  
  .pro-gate.disabled .content-wrapper {
    pointer-events: none;
    filter: grayscale(0.7);
    opacity: 0.5;
  }
  
  /* Pro Badge */
  .pro-badge {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: linear-gradient(135deg, var(--color-primary), #1ed760);
    color: #000;
    padding: 0.25rem 0.5rem;
    border-radius: 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
    z-index: 10;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
  
  /* Lock Overlay */
  .lock-overlay {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(2px);
    border-radius: 50%;
    width: 4rem;
    height: 4rem;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    transition: all 0.2s ease;
  }
  
  .pro-gate.restricted:hover .lock-overlay {
    background: rgba(0, 0, 0, 0.7);
    transform: translate(-50%, -50%) scale(1.1);
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
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-border, #404040);
    border-radius: 1rem;
    max-width: 24rem;
    width: 100%;
    position: relative;
    animation: modalSlideIn 0.3s ease-out;
  }
  
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: scale(0.9) translateY(1rem);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
  
  .close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    background: none;
    border: none;
    color: var(--color-muted, #888);
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.5rem;
    transition: all 0.2s ease;
  }
  
  .close-btn:hover {
    background: var(--color-accent, #333);
    color: var(--color-secondary, #ccc);
  }
  
  .modal-content {
    padding: 2rem;
  }
  
  .modal-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }
  
  .modal-header h3 {
    margin: 0.5rem 0 0 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-primary, #1db954);
  }
  
  .modal-body p {
    color: var(--color-secondary, #ccc);
    margin-bottom: 1rem;
    text-align: center;
  }
  
  .custom-prompt {
    font-weight: 500;
  }
  
  .pro-features-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
    display: grid;
    gap: 0.5rem;
  }
  
  .pro-features-list li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--color-secondary, #ccc);
    font-size: 0.875rem;
  }
  
  .modal-actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
  
  .upgrade-btn {
    background: linear-gradient(135deg, var(--color-primary), #1ed760);
    color: #000;
    border: none;
    padding: 0.875rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .upgrade-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
  }
  
  .later-btn {
    background: none;
    border: 1px solid var(--color-border, #404040);
    color: var(--color-muted, #888);
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .later-btn:hover {
    border-color: var(--color-accent, #555);
    color: var(--color-secondary, #ccc);
  }
  
  /* Inline Upgrade */
  .inline-upgrade {
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-primary, #1db954);
    border-radius: 0.5rem;
    padding: 1rem;
    margin-top: 0.5rem;
  }
  
  .inline-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .inline-text {
    flex: 1;
    color: var(--color-secondary, #ccc);
    font-size: 0.875rem;
  }
  
  .inline-upgrade-btn {
    background: var(--color-primary, #1db954);
    color: #000;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .inline-upgrade-btn:hover {
    background: #1ed760;
  }
  
  /* Tooltip Upgrade */
  .tooltip-upgrade {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-border, #404040);
    border-radius: 0.5rem;
    padding: 0.75rem;
    margin-bottom: 0.5rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 100;
    white-space: nowrap;
  }
  
  .tooltip-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: var(--color-secondary, #ccc);
  }
  
  .tooltip-btn {
    background: none;
    border: none;
    color: var(--color-primary, #1db954);
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 0.25rem;
    transition: all 0.2s ease;
  }
  
  .tooltip-btn:hover {
    background: var(--color-accent, #333);
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .upgrade-modal {
      margin: 1rem;
      max-width: none;
    }
    
    .modal-content {
      padding: 1.5rem;
    }
    
    .modal-actions {
      gap: 0.5rem;
    }
  }
</style> 