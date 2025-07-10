<script lang="ts">
  export let variant: 'text' | 'circle' | 'rectangle' | 'button' | 'card' | 'audio-item' | 'instrument' = 'text';
  export let width: string = '100%';
  export let height: string = '1rem';
  export let count: number = 1;
  export let spacing: string = '0.5rem';
  export let animate: boolean = true;
  export let borderRadius: string = '0.25rem';
  
  // Predefined variants for common use cases
  const variants = {
    text: { height: '1rem', borderRadius: '0.25rem', aspectRatio: 'auto' },
    circle: { height: '3rem', borderRadius: '50%', aspectRatio: '1' },
    rectangle: { height: '8rem', borderRadius: '0.5rem', aspectRatio: 'auto' },
    button: { height: '2.5rem', borderRadius: '0.375rem', aspectRatio: 'auto' },
    card: { height: '12rem', borderRadius: '0.75rem', aspectRatio: 'auto' },
    'audio-item': { height: '4rem', borderRadius: '0.5rem', aspectRatio: 'auto' },
    'instrument': { height: '3rem', borderRadius: '0.375rem', aspectRatio: 'auto' }
  };
  
  $: variantStyles = variants[variant] || variants.text;
  $: itemHeight = height !== '1rem' ? height : variantStyles.height;
  $: itemBorderRadius = borderRadius !== '0.25rem' ? borderRadius : variantStyles.borderRadius;
</script>

<div class="skeleton-container" style="gap: {spacing}">
  {#each Array(count) as _, index}
    <div 
      class="skeleton-item"
      class:animate
      style="
        width: {width};
        height: {itemHeight};
        border-radius: {itemBorderRadius};
        aspect-ratio: {variantStyles.aspectRatio};
      "
      style:animation-delay="{index * 0.1}s"
    ></div>
  {/each}
</div>

<style>
  .skeleton-container {
    display: flex;
    flex-direction: column;
    width: 100%;
  }
  
  .skeleton-item {
    background: linear-gradient(
      90deg,
      var(--color-accent) 0%,
      color-mix(in srgb, var(--color-accent) 50%, var(--color-surface)) 50%,
      var(--color-accent) 100%
    );
    background-size: 200% 100%;
    position: relative;
    overflow: hidden;
  }
  
  .skeleton-item.animate {
    animation: skeleton-shimmer 1.5s ease-in-out infinite;
  }
  
  .skeleton-item::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255, 255, 255, 0.1) 50%,
      transparent 100%
    );
    animation: skeleton-sweep 2s ease-in-out infinite;
    animation-delay: inherit;
  }
  
  @keyframes skeleton-shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
  
  @keyframes skeleton-sweep {
    0% {
      left: -100%;
    }
    50% {
      left: 100%;
    }
    100% {
      left: 100%;
    }
  }
  
  /* Responsive design */
  @media (max-width: 768px) {
    .skeleton-item {
      border-radius: calc(var(--radius-sm) * 0.75);
    }
  }
  
  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .skeleton-item {
      background: var(--color-accent);
      opacity: 0.8;
    }
    
    .skeleton-item::after {
      display: none;
    }
  }
  
  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .skeleton-item.animate {
      animation: none;
    }
    
    .skeleton-item::after {
      animation: none;
    }
  }
</style> 