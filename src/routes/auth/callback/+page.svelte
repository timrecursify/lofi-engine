<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { handleMagicLinkCallback, initializeClerk, authState } from "$lib/auth";

  let loading = true;
  let error = "";

  onMount(async () => {
    try {
      // Initialize Clerk first
      await initializeClerk();
      
      // Handle the magic link callback
      await handleMagicLinkCallback();
      
      // Wait a moment for auth state to update
      setTimeout(() => {
        if ($authState.isSignedIn) {
          // Check for return URL and redirect appropriately
          const returnUrl = $page.url.searchParams.get('returnUrl') || '/';
          goto(returnUrl);
        } else {
          error = "Authentication failed. Please try signing in again.";
          loading = false;
        }
      }, 1000);
      
    } catch (err: any) {
      console.error("Callback error:", err);
      error = err.message || "Authentication failed. Please try again.";
      loading = false;
    }
  });

  function goToSignIn() {
    goto("/auth/signin");
  }
</script>

<svelte:head>
  <title>Signing you in... - Lo-Fi Radio</title>
</svelte:head>

<div class="min-h-screen bg-bg flex items-center justify-center px-4">
  <div class="max-w-md w-full text-center space-y-8">
    
    {#if loading}
      <!-- Loading state -->
      <div class="space-y-6">
        <div class="text-6xl">🎵</div>
        <div class="space-y-3">
          <h1 class="text-2xl font-bold text-primary">Signing you in...</h1>
          <p class="text-secondary">Please wait while we verify your magic link</p>
        </div>
        
        <!-- Loading spinner -->
        <div class="flex justify-center">
          <svg class="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      </div>
    {:else if error}
      <!-- Error state -->
      <div class="space-y-6">
        <div class="text-6xl">❌</div>
        <div class="space-y-3">
          <h1 class="text-2xl font-bold text-red-400">Authentication Failed</h1>
          <p class="text-secondary">{error}</p>
        </div>
        
        <div class="space-y-3">
          <button
            on:click={goToSignIn}
            class="w-full px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors font-medium"
          >
            Try Again
          </button>
          
          <a href="/" class="block text-primary hover:underline text-sm">
            ← Back to Lo-Fi Radio
          </a>
        </div>
      </div>
    {/if}
  </div>
</div> 