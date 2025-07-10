<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { user } from '$lib/stores';
  import { isProUser, authState } from '$lib/auth';
  import Icon from '$lib/components/Icon.svelte';
  import RouteGuard from '$lib/components/RouteGuard.svelte';
  import { logger } from '$lib/utils/logger';
  
  // Pricing plans
  const plans = [
    {
      id: 'free',
      name: 'Free',
      price: 0,
      period: 'forever',
      features: [
        'Basic news & weather updates',
        'Lo-fi background music',
        'Standard audio quality',
        'Limited topic selection',
        '6 skips per hour',
        'Basic visual scenes',
        'Community support'
      ],
      limitations: [
        'Advertisement breaks',
        'Limited premium content',
        'No offline mode'
      ],
      buttonText: 'Current Plan',
      buttonDisabled: true,
      popular: false
    },
    {
      id: 'pro_monthly',
      name: 'Pro',
      price: 4.99,
      period: 'month',
      features: [
        'All premium content topics',
        'Real-time market & crypto updates',
        'Social media trending topics',
        'Advanced visual scenes & effects',
        'No advertisements',
        'Unlimited skips',
        'High-quality audio',
        'Offline mode (coming soon)',
        'Priority support',
        'Early access to new features'
      ],
      limitations: [],
      buttonText: 'Upgrade to Pro',
      buttonDisabled: false,
      popular: true
    }
  ];
  
  // Content features comparison
  const contentFeatures = [
    {
      name: 'World News',
      free: true,
      pro: true,
      description: 'Global news updates from Reuters and AP'
    },
    {
      name: 'Local News',
      free: true,
      pro: true,
      description: 'News from your area'
    },
    {
      name: 'Weather',
      free: true,
      pro: true,
      description: 'Current conditions and forecasts'
    },
    {
      name: 'Sports',
      free: true,
      pro: true,
      description: 'Sports scores and highlights'
    },
    {
      name: 'Education & Health',
      free: true,
      pro: true,
      description: 'Learning content and wellness tips'
    },
    {
      name: 'Stock Markets',
      free: false,
      pro: true,
      description: 'Real-time market updates and analysis'
    },
    {
      name: 'Cryptocurrency',
      free: false,
      pro: true,
      description: 'Crypto news and price updates'
    },
    {
      name: 'Twitter/X Trending',
      free: false,
      pro: true,
      description: "What's trending on social media"
    },
    {
      name: 'Reddit Hot Posts',
      free: false,
      pro: true,
      description: 'Popular posts from Reddit communities'
    }
  ];
  
  // State
  let isLoading = false;
  let selectedPlan = 'pro_monthly';
  
  // Reactive values
  $: currentUser = $user;
  $: userIsPro = isProUser();
  $: returnUrl = $page.url.searchParams.get('returnUrl') || '/';
  
  onMount(() => {
    // If user is already pro, show success message or redirect
    if (userIsPro) {
      logger.info('User already has pro plan', 'upgrade-page', {
        userId: currentUser?.id,
        userPlan: currentUser?.plan
      });
    }
  });
  
  async function handleUpgrade() {
    if (!$authState.isSignedIn) {
      window.location.href = `/auth/signin?returnUrl=${encodeURIComponent('/upgrade')}`;
      return;
    }
    
    isLoading = true;
    
    try {
      // In production, this would create a Stripe checkout session
      logger.info('Creating Stripe checkout session for plan', 'upgrade-page', {
        selectedPlan,
        userId: currentUser?.id,
        returnUrl
      });
      
      // Mock API call for Stripe checkout
      const response = await fetch('/api/checkout/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: selectedPlan === 'pro_monthly' ? 'price_pro_monthly' : 'price_pro_yearly',
          userId: currentUser.id,
          returnUrl: window.location.origin + returnUrl
        })
      });
      
      if (response.ok) {
        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl;
      } else {
        throw new Error('Failed to create checkout session');
      }
      
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert('Failed to start upgrade process. Please try again.');
    } finally {
      isLoading = false;
    }
  }
  
  function handlePlanSelect(planId: string) {
    selectedPlan = planId;
  }
</script>

<svelte:head>
  <title>Upgrade to Pro - LoFi Radio</title>
  <meta name="description" content="Unlock premium features with LoFi Radio Pro. Get exclusive content, no ads, and advanced features for just $4.99/month." />
</svelte:head>

<RouteGuard requireAuth={true}>
  <div class="upgrade-page">
    <!-- Hero Section -->
    <div class="hero-section">
      <div class="hero-content">
        <div class="hero-icon">
          <Icon name="crown" size={64} color="var(--color-primary)" />
        </div>
        <h1 class="hero-title">Unlock the Full Experience</h1>
        <p class="hero-subtitle">
          Get exclusive content, remove ads, and enjoy premium features with LoFi Radio Pro
        </p>
        
        {#if userIsPro}
          <div class="pro-status">
            <Icon name="check-circle" size={24} color="var(--color-primary)" />
            <span>You're already a Pro user!</span>
            <a href={returnUrl} class="return-link">Continue listening</a>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Pricing Plans -->
    <div class="pricing-section">
      <h2 class="section-title">Choose Your Plan</h2>
      
      <div class="plans-grid">
        {#each plans as plan}
          <div 
            class="plan-card"
            class:selected={selectedPlan === plan.id}
            class:popular={plan.popular}
            class:current={plan.id === 'free' && !userIsPro}
          >
            {#if plan.popular}
              <div class="popular-badge">
                <Icon name="star" size={12} />
                Most Popular
              </div>
            {/if}
            
            <div class="plan-header">
              <h3 class="plan-name">{plan.name}</h3>
              <div class="plan-price">
                <span class="price-amount">${plan.price}</span>
                <span class="price-period">/{plan.period}</span>
              </div>
            </div>
            
            <ul class="plan-features">
              {#each plan.features as feature}
                <li class="feature-item">
                  <Icon name="check" size={16} color="var(--color-primary)" />
                  {feature}
                </li>
              {/each}
              
              {#each plan.limitations as limitation}
                <li class="limitation-item">
                  <Icon name="x" size={16} color="var(--color-muted)" />
                  {limitation}
                </li>
              {/each}
            </ul>
            
            <button
              class="plan-button"
              class:primary={plan.id !== 'free'}
              class:selected={selectedPlan === plan.id}
              disabled={plan.buttonDisabled || (plan.id === 'free') || userIsPro}
              on:click={() => plan.id !== 'free' && handlePlanSelect(plan.id)}
            >
              {#if isLoading && selectedPlan === plan.id}
                <Icon name="loader" size={16} class="animate-spin" />
                Processing...
              {:else if userIsPro && plan.id === 'pro_monthly'}
                <Icon name="check" size={16} />
                Current Plan
              {:else}
                {plan.buttonText}
              {/if}
            </button>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Content Comparison -->
    <div class="comparison-section">
      <h2 class="section-title">What's Included</h2>
      
      <div class="comparison-table">
        <div class="table-header">
          <div class="feature-col">Content & Features</div>
          <div class="plan-col">Free</div>
          <div class="plan-col pro">Pro</div>
        </div>
        
        {#each contentFeatures as feature}
          <div class="table-row">
            <div class="feature-col">
              <span class="feature-name">{feature.name}</span>
              <span class="feature-description">{feature.description}</span>
            </div>
            <div class="plan-col">
              {#if feature.free}
                <Icon name="check" size={20} color="var(--color-primary)" />
              {:else}
                <Icon name="x" size={20} color="var(--color-muted)" />
              {/if}
            </div>
            <div class="plan-col pro">
              <Icon name="check" size={20} color="var(--color-primary)" />
            </div>
          </div>
        {/each}
      </div>
    </div>
    
    <!-- CTA Section -->
    {#if !userIsPro}
      <div class="cta-section">
        <div class="cta-content">
          <h2>Ready to upgrade?</h2>
          <p>Join thousands of users enjoying the premium LoFi Radio experience</p>
          <button class="cta-button" on:click={handleUpgrade} disabled={isLoading}>
            {#if isLoading}
              <Icon name="loader" size={20} class="animate-spin" />
              Setting up your upgrade...
            {:else}
              <Icon name="crown" size={20} />
              Upgrade to Pro - $4.99/month
            {/if}
          </button>
          <p class="cta-note">Cancel anytime • No long-term commitment</p>
        </div>
      </div>
    {/if}
    
    <!-- FAQ Section -->
    <div class="faq-section">
      <h2 class="section-title">Frequently Asked Questions</h2>
      
      <div class="faq-grid">
        <div class="faq-item">
          <h3>Can I cancel anytime?</h3>
          <p>Yes, you can cancel your Pro subscription at any time. You'll continue to have access to Pro features until the end of your billing period.</p>
        </div>
        
        <div class="faq-item">
          <h3>What payment methods do you accept?</h3>
          <p>We accept all major credit cards, debit cards, and digital wallets through Stripe's secure payment processing.</p>
        </div>
        
        <div class="faq-item">
          <h3>Is there a free trial?</h3>
          <p>Your free account gives you access to core features. Upgrade to Pro to unlock premium content and remove advertisements immediately.</p>
        </div>
        
        <div class="faq-item">
          <h3>How do I manage my subscription?</h3>
          <p>You can manage your subscription, update payment methods, and view billing history from your account settings page.</p>
        </div>
      </div>
    </div>
  </div>
</RouteGuard>

<style>
  .upgrade-page {
    min-height: 100vh;
    background: var(--color-bg, #191414);
    padding: 2rem 0;
  }
  
  /* Hero Section */
  .hero-section {
    text-align: center;
    padding: 3rem 1rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  
  .hero-icon {
    margin-bottom: 1.5rem;
  }
  
  .hero-title {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-primary, #1db954);
    margin-bottom: 1rem;
  }
  
  .hero-subtitle {
    font-size: 1.25rem;
    color: var(--color-secondary, #ccc);
    line-height: 1.6;
    margin-bottom: 2rem;
  }
  
  .pro-status {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background: var(--color-surface, #2a2a2a);
    border: 1px solid var(--color-primary, #1db954);
    border-radius: 0.75rem;
    padding: 1rem 1.5rem;
    color: var(--color-primary, #1db954);
    font-weight: 500;
  }
  
  .return-link {
    color: var(--color-primary, #1db954);
    text-decoration: underline;
    margin-left: 0.5rem;
  }
  
  /* Pricing Section */
  .pricing-section {
    padding: 3rem 1rem;
    max-width: 64rem;
    margin: 0 auto;
  }
  
  .section-title {
    text-align: center;
    font-size: 2rem;
    font-weight: 600;
    color: var(--color-text, #fff);
    margin-bottom: 3rem;
  }
  
  .plans-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
    gap: 2rem;
    margin-bottom: 2rem;
  }
  
  .plan-card {
    background: var(--color-surface, #2a2a2a);
    border: 2px solid var(--color-border, #404040);
    border-radius: 1rem;
    padding: 2rem;
    position: relative;
    transition: all 0.3s ease;
  }
  
  .plan-card:hover {
    border-color: var(--color-primary, #1db954);
    transform: translateY(-2px);
  }
  
  .plan-card.popular {
    border-color: var(--color-primary, #1db954);
    background: linear-gradient(135deg, var(--color-surface, #2a2a2a), #1a3a2a);
  }
  
  .plan-card.current {
    opacity: 0.7;
  }
  
  .popular-badge {
    position: absolute;
    top: -0.75rem;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, var(--color-primary), #1ed760);
    color: #000;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
    font-size: 0.75rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .plan-header {
    text-align: center;
    margin-bottom: 2rem;
  }
  
  .plan-name {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text, #fff);
    margin-bottom: 0.5rem;
  }
  
  .plan-price {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.25rem;
  }
  
  .price-amount {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-primary, #1db954);
  }
  
  .price-period {
    font-size: 1rem;
    color: var(--color-muted, #888);
  }
  
  .plan-features {
    list-style: none;
    padding: 0;
    margin: 0 0 2rem 0;
    display: grid;
    gap: 0.75rem;
  }
  
  .feature-item,
  .limitation-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
  }
  
  .feature-item {
    color: var(--color-secondary, #ccc);
  }
  
  .limitation-item {
    color: var(--color-muted, #888);
  }
  
  .plan-button {
    width: 100%;
    padding: 0.875rem 1.5rem;
    border: 2px solid var(--color-border, #404040);
    background: var(--color-surface, #2a2a2a);
    color: var(--color-secondary, #ccc);
    border-radius: 0.75rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .plan-button.primary {
    background: linear-gradient(135deg, var(--color-primary), #1ed760);
    border-color: var(--color-primary, #1db954);
    color: #000;
  }
  
  .plan-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(29, 185, 84, 0.3);
  }
  
  .plan-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }
  
  /* Comparison Table */
  .comparison-section {
    padding: 3rem 1rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  
  .comparison-table {
    background: var(--color-surface, #2a2a2a);
    border-radius: 1rem;
    overflow: hidden;
    border: 1px solid var(--color-border, #404040);
  }
  
  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: 2fr 1fr 1fr;
    align-items: center;
  }
  
  .table-header {
    background: var(--color-accent, #333);
    padding: 1rem 1.5rem;
    font-weight: 600;
    color: var(--color-text, #fff);
  }
  
  .table-row {
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border, #404040);
  }
  
  .table-row:last-child {
    border-bottom: none;
  }
  
  .feature-col {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  
  .feature-name {
    font-weight: 500;
    color: var(--color-text, #fff);
  }
  
  .feature-description {
    font-size: 0.875rem;
    color: var(--color-muted, #888);
  }
  
  .plan-col {
    text-align: center;
  }
  
  .plan-col.pro {
    background: linear-gradient(135deg, var(--color-primary), #1ed760);
    color: #000;
    font-weight: 600;
    margin: -1rem -1.5rem;
    padding: 1rem 1.5rem;
  }
  
  /* CTA Section */
  .cta-section {
    padding: 4rem 1rem;
    text-align: center;
    background: linear-gradient(135deg, #1a3a2a, var(--color-surface, #2a2a2a));
  }
  
  .cta-content h2 {
    font-size: 2rem;
    font-weight: 600;
    color: var(--color-primary, #1db954);
    margin-bottom: 1rem;
  }
  
  .cta-content p {
    color: var(--color-secondary, #ccc);
    margin-bottom: 2rem;
    font-size: 1.125rem;
  }
  
  .cta-button {
    background: linear-gradient(135deg, var(--color-primary), #1ed760);
    color: #000;
    border: none;
    padding: 1rem 2rem;
    border-radius: 0.75rem;
    font-size: 1.125rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
  }
  
  .cta-button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(29, 185, 84, 0.4);
  }
  
  .cta-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }
  
  .cta-note {
    color: var(--color-muted, #888);
    font-size: 0.875rem;
    margin-top: 1rem;
  }
  
  /* FAQ Section */
  .faq-section {
    padding: 3rem 1rem;
    max-width: 48rem;
    margin: 0 auto;
  }
  
  .faq-grid {
    display: grid;
    gap: 2rem;
  }
  
  .faq-item h3 {
    color: var(--color-text, #fff);
    font-weight: 600;
    margin-bottom: 0.5rem;
  }
  
  .faq-item p {
    color: var(--color-secondary, #ccc);
    line-height: 1.6;
  }
  
  /* Responsive */
  @media (max-width: 768px) {
    .hero-title {
      font-size: 2rem;
    }
    
    .plans-grid {
      grid-template-columns: 1fr;
    }
    
    .table-header,
    .table-row {
      grid-template-columns: 1fr;
      gap: 1rem;
    }
    
    .plan-col.pro {
      margin: 0;
    }
  }
</style> 