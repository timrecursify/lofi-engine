import{c as o,a as r,f as l}from"../../../../chunks/index3.js";import{a as d}from"../../../../chunks/auth.js";import{p as n}from"../../../../chunks/stores.js";const b=o((t,c,p,m)=>{let s,a;s=r(n,e=>e),a=r(d,e=>e);let i="";return s(),a(),`${t.head+=`<!-- HEAD_svelte-n74t5y_START -->${t.title="<title>Sign In - Lo-Fi Radio</title>",""}<meta name="description" content="Sign in to Lo-Fi Radio with a magic link - no password required!"><!-- HEAD_svelte-n74t5y_END -->`,""}

<div class="min-h-screen bg-bg flex items-center justify-center px-4"><div class="max-w-md w-full space-y-8">
    <div class="text-center"><div class="text-6xl mb-4">🎵</div>
      <h1 class="text-4xl font-bold text-primary mb-2">Lo-Fi Radio</h1>
      <p class="text-secondary text-lg">Sign in to save your preferences and access pro features</p></div>

    ${`
      <div class="space-y-6"><div class="space-y-4"><div><label for="email" class="block text-sm font-medium text-secondary mb-2">Email address
            </label>
            <input id="email" type="email" placeholder="your.email@chillcast.fm"  class="w-full px-4 py-3 bg-surface border border-border rounded-lg text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"${l("value",i,0)}></div>

          

          <button ${i.trim()?"":"disabled"} class="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary hover:bg-primary-hover text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium">✨ Send magic link</button></div>

        <div class="text-center text-sm space-y-2"><p class="text-muted">No password required! We&#39;ll send you a secure link to sign in.
          </p>
          
          <div class="pt-4"><a href="/" class="text-primary hover:underline text-sm">← Back to Lo-Fi Radio
            </a></div></div></div>`}

    
    <div class="text-center text-xs text-muted space-y-1"><p>By signing in, you agree to our</p>
      <div class="space-x-2"><a href="/terms" class="text-primary hover:underline">Terms of Service</a>
        <span>•</span>
        <a href="/privacy" class="text-primary hover:underline">Privacy Policy</a></div></div></div></div>`});export{b as default};
