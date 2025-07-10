<script lang="ts">
  import { page } from "$app/stores";
  import { onMount } from "svelte";

  let error = "";
  let errorDescription = "";

  onMount(() => {
    const urlParams = new URLSearchParams(window.location.search);
    error = urlParams.get("error") || "Unknown error";
    
    // Map Clerk error codes to user-friendly messages
    const errorMessages: Record<string, string> = {
      // Magic link errors
      magic_link_expired: "Your magic link has expired. Please request a new one.",
      magic_link_invalid: "This magic link is invalid or has already been used.",
      magic_link_failed: "Failed to process magic link. Please try again.",
      
      // General authentication errors
      session_expired: "Your session has expired. Please sign in again.",
      unauthorized: "You are not authorized to access this resource.",
      invalid_token: "Invalid authentication token. Please sign in again.",
      
      // Network and service errors
      network_error: "Network connection failed. Please check your internet connection.",
      service_unavailable: "Authentication service is temporarily unavailable.",
      rate_limit_exceeded: "Too many attempts. Please wait a moment before trying again.",
      
      // Account errors
      account_not_found: "No account found with this email address.",
      account_disabled: "This account has been disabled. Please contact support.",
      email_verification_required: "Please verify your email address to continue.",
      
      // Generic fallback
      default: "An authentication error occurred. Please try again."
    };

    errorDescription = errorMessages[error] || errorMessages.default;
  });
</script>

<svelte:head>
  <title>Authentication Error - Lo-Fi Radio</title>
</svelte:head>

<div class="min-h-screen bg-bg flex items-center justify-center">
  <div class="max-w-md w-full space-y-8">
    <div class="text-center">
      <div class="text-6xl mb-4">⚠️</div>
      <h1 class="text-3xl font-bold text-primary mb-2">Authentication Error</h1>
      <p class="text-secondary text-lg mb-6">{errorDescription}</p>
    </div>

    <div class="bg-surface border border-border rounded-lg p-6">
      <h2 class="text-lg font-semibold text-primary mb-3">What happened?</h2>
      <p class="text-muted text-sm mb-4">
        There was an issue with the authentication process. This could be due to:
      </p>
      <ul class="text-muted text-sm space-y-2 mb-4">
        <li>• Expired or invalid magic link</li>
        <li>• Network connectivity issues</li>
        <li>• Service temporarily unavailable</li>
        <li>• Session timeout or security restrictions</li>
      </ul>
      
      {#if error}
        <details class="mb-4">
          <summary class="text-sm text-muted cursor-pointer">Technical details</summary>
          <code class="text-xs bg-bg p-2 rounded mt-2 block">Error: {error}</code>
        </details>
      {/if}
    </div>

    <div class="space-y-4">
      <a
        href="/auth/signin"
        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors"
      >
        <span>✨ Get New Magic Link</span>
      </a>
      
      <a
        href="/"
        class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-surface hover:bg-surface-hover border border-border rounded-lg transition-colors"
      >
        <span>Continue Without Account</span>
      </a>
    </div>

    <!-- Help section for common issues -->
    {#if error === "magic_link_expired" || error === "magic_link_invalid"}
      <div class="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-blue-300 mb-2">💡 Quick Fix</h3>
        <p class="text-blue-200 text-xs">
          Magic links expire after 15 minutes for security. Request a new magic link and check your email immediately.
        </p>
      </div>
    {/if}
  </div>
</div> 