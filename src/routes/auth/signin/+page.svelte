<script lang="ts">
  import { signInWithMagicLink, initializeClerk, authState } from "$lib/auth";
  import { page } from "$app/stores";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";

  let email = "";
  let loading = false;
  let error = "";
  let success = false;

  // Initialize Clerk when component mounts
  onMount(async () => {
    try {
      await initializeClerk();
      
      // Redirect if already signed in
      if ($authState.isSignedIn) {
        // Check for return URL
        const returnUrl = $page.url.searchParams.get('returnUrl') || '/';
        goto(returnUrl);
      }
      
      // Check for error parameter
      const errorParam = $page.url.searchParams.get('error');
      if (errorParam) {
        if (errorParam === 'session_expired') {
          error = 'Your session has expired. Please sign in again.';
        } else if (errorParam === 'session_invalid') {
          error = 'Your session is invalid. Please sign in again.';
        }
      }
    } catch (err) {
      console.error("Failed to initialize Clerk:", err);
      error = 'Failed to initialize authentication. Please try again.';
    }
  });

  async function handleMagicLinkSignIn() {
    if (!email.trim()) {
      error = "Please enter your email address";
      return;
    }

    if (!isValidEmail(email)) {
      error = "Please enter a valid email address";
      return;
    }

    loading = true;
    error = "";

    try {
      await signInWithMagicLink(email);
      success = true;
    } catch (err: any) {
      console.error("Magic link sign-in error:", err);
      error = err.message || "Failed to send magic link. Please try again.";
    } finally {
      loading = false;
    }
  }

  function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      handleMagicLinkSignIn();
    }
  }
</script>

<svelte:head>
  <title>Sign In - Lo-Fi Radio</title>
  <meta name="description" content="Sign in to Lo-Fi Radio with a magic link - no password required!" />
</svelte:head>

<div class="min-h-screen bg-bg flex items-center justify-center px-4">
  <div class="max-w-md w-full space-y-8">
    <!-- Header -->
    <div class="text-center">
      <div class="text-6xl mb-4">🎵</div>
      <h1 class="text-4xl font-bold text-primary mb-2">Lo-Fi Radio</h1>
      <p class="text-secondary text-lg">Sign in to save your preferences and access pro features</p>
    </div>

    {#if success}
      <!-- Success state -->
      <div class="bg-green-900/20 border border-green-500/30 rounded-lg p-6 text-center">
        <div class="text-green-400 text-4xl mb-3">📧</div>
        <h2 class="text-xl font-semibold text-green-300 mb-2">Check your email</h2>
        <p class="text-green-200 text-sm mb-4">
          We sent a magic link to <strong>{email}</strong>
        </p>
        <p class="text-green-200/80 text-xs">
          Click the link in your email to sign in. The link will expire in 15 minutes.
        </p>
      </div>

      <div class="text-center">
        <button
          on:click={() => { success = false; email = ""; }}
          class="text-primary hover:underline text-sm"
        >
          Use a different email address
        </button>
      </div>
    {:else}
      <!-- Magic link form -->
      <div class="space-y-6">
        <div class="space-y-4">
          <div>
            <label for="email" class="block text-sm font-medium text-secondary mb-2">
              Email address
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              on:keydown={handleKeyDown}
              placeholder="your.email@chillcast.fm"
              disabled={loading}
              class="w-full px-4 py-3 bg-surface border border-border rounded-lg 
                     text-primary placeholder-muted
                     focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors"
            />
          </div>

          {#if error}
            <div class="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p class="text-red-300 text-sm">{error}</p>
            </div>
          {/if}

          <button
            on:click={handleMagicLinkSignIn}
            disabled={loading || !email.trim()}
            class="w-full flex items-center justify-center gap-2 px-4 py-3 
                   bg-primary hover:bg-primary-hover text-white rounded-lg 
                   transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                   font-medium"
          >
            {#if loading}
              <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending magic link...
            {:else}
              ✨ Send magic link
            {/if}
          </button>
        </div>

        <div class="text-center text-sm space-y-2">
          <p class="text-muted">
            No password required! We'll send you a secure link to sign in.
          </p>
          
          <div class="pt-4">
            <a href="/" class="text-primary hover:underline text-sm">
              ← Back to Lo-Fi Radio
            </a>
          </div>
        </div>
      </div>
    {/if}

    <!-- Legal notice -->
    <div class="text-center text-xs text-muted space-y-1">
      <p>By signing in, you agree to our</p>
      <div class="space-x-2">
        <a href="/terms" class="text-primary hover:underline">Terms of Service</a>
        <span>•</span>
        <a href="/privacy" class="text-primary hover:underline">Privacy Policy</a>
      </div>
    </div>
  </div>
</div> 