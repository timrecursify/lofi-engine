// Enhanced Service Worker with Production-Grade Caching
// Version 3.0 - Enhanced with WASM preloading and 60-minute audio cache

const CACHE_VERSION = '3.0';
const STATIC_CACHE = `lofi-static-v${CACHE_VERSION}`;
const AUDIO_CACHE = `lofi-audio-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `lofi-runtime-v${CACHE_VERSION}`;
const WASM_CACHE = `lofi-wasm-v${CACHE_VERSION}`;

// Cache duration: 60 minutes for audio files
const AUDIO_CACHE_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds
const MAX_AUDIO_CACHE_SIZE = 50; // Maximum number of audio files to cache

// Essential static assets for offline functionality
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.ico'
];

// Priority audio files to preload
const PRIORITY_AUDIO = [
  '/assets/engine/DrumSamples/kick.mp3',
  '/assets/engine/DrumSamples/snare.mp3',
  '/assets/engine/DrumSamples/hat.mp3',
  '/voice/news.mp3',
  '/voice/educate.mp3',
  '/voice/weather.mp3'
];

// WASM and critical JS files
const WASM_ASSETS = [
  // These would be populated based on build output
  // Examples of what might be here:
  '/assets/wasm/audio-processor.wasm',
  '/assets/js/tone.min.js'
];

class CacheManager {
  constructor() {
    this.audioMetadata = new Map(); // Track audio cache timestamps
  }

  // Install essential caches
  async installCaches() {
    const cachePromises = [
      this.populateStaticCache(),
      this.populatePriorityAudioCache(),
      this.populateWASMCache()
    ];

    return Promise.allSettled(cachePromises);
  }

  async populateStaticCache() {
    const cache = await caches.open(STATIC_CACHE);
    const cachePromises = STATIC_ASSETS.map(async (url) => {
      try {
        await cache.add(url);
        console.log(`SW: Cached static asset: ${url}`);
      } catch (error) {
        console.warn(`SW: Failed to cache static asset ${url}:`, error.message);
      }
    });
    
    return Promise.allSettled(cachePromises);
  }

  async populatePriorityAudioCache() {
    const cache = await caches.open(AUDIO_CACHE);
    const cachePromises = PRIORITY_AUDIO.map(async (url) => {
      try {
        await cache.add(url);
        this.audioMetadata.set(url, Date.now());
        console.log(`SW: Cached priority audio: ${url}`);
      } catch (error) {
        console.warn(`SW: Failed to cache priority audio ${url}:`, error.message);
      }
    });
    
    return Promise.allSettled(cachePromises);
  }

  async populateWASMCache() {
    const cache = await caches.open(WASM_CACHE);
    const cachePromises = WASM_ASSETS.map(async (url) => {
      try {
        await cache.add(url);
        console.log(`SW: Cached WASM asset: ${url}`);
      } catch (error) {
        console.warn(`SW: Failed to cache WASM asset ${url}:`, error.message);
      }
    });
    
    return Promise.allSettled(cachePromises);
  }

  // Clean up old caches
  async cleanupOldCaches() {
    const currentCaches = [STATIC_CACHE, AUDIO_CACHE, RUNTIME_CACHE, WASM_CACHE];
    const cacheNames = await caches.keys();
    
    const deletionPromises = cacheNames.map((cacheName) => {
      if (!currentCaches.includes(cacheName)) {
        console.log('SW: Deleting old cache:', cacheName);
        return caches.delete(cacheName);
      }
    });

    return Promise.all(deletionPromises);
  }

  // Audio cache management with 60-minute expiration
  async manageAudioCache(url, response) {
    const cache = await caches.open(AUDIO_CACHE);
    const now = Date.now();

    // Check if we need to clean expired entries
    await this.cleanExpiredAudio();

    // Check if cache is at capacity
    const cacheKeys = await cache.keys();
    if (cacheKeys.length >= MAX_AUDIO_CACHE_SIZE) {
      await this.evictOldestAudio(cache);
    }

    // Cache the new audio file
    await cache.put(url, response.clone());
    this.audioMetadata.set(url, now);
    
    console.log(`SW: Cached audio file: ${url}`);
    return response;
  }

  async cleanExpiredAudio() {
    const cache = await caches.open(AUDIO_CACHE);
    const now = Date.now();
    const expiredUrls = [];

    for (const [url, timestamp] of this.audioMetadata.entries()) {
      if (now - timestamp > AUDIO_CACHE_DURATION) {
        expiredUrls.push(url);
      }
    }

    for (const url of expiredUrls) {
      await cache.delete(url);
      this.audioMetadata.delete(url);
      console.log(`SW: Expired audio cache: ${url}`);
    }
  }

  async evictOldestAudio(cache) {
    // Find oldest cached audio file
    let oldestUrl = null;
    let oldestTime = Date.now();

    for (const [url, timestamp] of this.audioMetadata.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestUrl = url;
      }
    }

    if (oldestUrl) {
      await cache.delete(oldestUrl);
      this.audioMetadata.delete(oldestUrl);
      console.log(`SW: Evicted oldest audio: ${oldestUrl}`);
    }
  }

  // Determine caching strategy based on request type
  getCachingStrategy(request) {
    const url = new URL(request.url);
    
    // Skip certain requests
    if (this.shouldSkipCaching(request, url)) {
      return 'network-only';
    }

    // WASM files: Cache First (they don't change often)
    if (this.isWASMAsset(url)) {
      return 'cache-first';
    }

    // Audio files: Stale While Revalidate with TTL
    if (this.isAudioFile(url)) {
      return 'stale-while-revalidate';
    }

    // Static assets: Cache First
    if (this.isStaticAsset(url)) {
      return 'cache-first';
    }

    // API calls and dynamic content: Network First
    if (this.isAPICall(url)) {
      return 'network-first';
    }

    // Everything else: Network First
    return 'network-first';
  }

  shouldSkipCaching(request, url) {
    return (
      request.method !== 'GET' ||
      url.pathname.includes('/@') || // Vite HMR
      url.pathname.includes('/node_modules/') ||
      url.pathname.includes('/@vite/') ||
      url.pathname.includes('/@id/') ||
      url.protocol === 'chrome-extension:' ||
      url.protocol === 'ws:' ||
      url.protocol === 'wss:'
    );
  }

  isWASMAsset(url) {
    return url.pathname.endsWith('.wasm') || 
           (url.pathname.includes('/wasm/') && url.pathname.endsWith('.js'));
  }

  isAudioFile(url) {
    return url.pathname.endsWith('.mp3') ||
           url.pathname.endsWith('.wav') ||
           url.pathname.endsWith('.ogg') ||
           url.pathname.endsWith('.m4a');
  }

  isStaticAsset(url) {
    return url.pathname.endsWith('.css') ||
           url.pathname.endsWith('.js') ||
           url.pathname.endsWith('.png') ||
           url.pathname.endsWith('.jpg') ||
           url.pathname.endsWith('.jpeg') ||
           url.pathname.endsWith('.svg') ||
           url.pathname.endsWith('.ico') ||
           url.pathname.endsWith('.webp');
  }

  isAPICall(url) {
    return url.pathname.startsWith('/api/') ||
           url.pathname.startsWith('/v1/') ||
           url.pathname.includes('.json');
  }

  // Cache-first strategy
  async cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }

    try {
      const networkResponse = await fetch(request);
      if (networkResponse.status === 200) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      throw error;
    }
  }

  // Network-first strategy
  async networkFirst(request, cacheName) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.status === 200) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cache = await caches.open(cacheName);
      const cachedResponse = await cache.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }

  // Stale-while-revalidate strategy with special audio handling
  async staleWhileRevalidate(request) {
    const cache = await caches.open(AUDIO_CACHE);
    const cachedResponse = await cache.match(request);
    
    // Check if cached version is still valid (within 60 minutes)
    if (cachedResponse) {
      const url = request.url;
      const cacheTime = this.audioMetadata.get(url);
      
      if (cacheTime && (Date.now() - cacheTime) < AUDIO_CACHE_DURATION) {
        // Background revalidation
        fetch(request).then(async (networkResponse) => {
          if (networkResponse.status === 200) {
            await this.manageAudioCache(url, networkResponse);
          }
        }).catch(() => {
          // Ignore network errors during background revalidation
        });
        
        return cachedResponse;
      }
    }

    // Cache miss or expired - fetch from network
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.status === 200) {
        return await this.manageAudioCache(request.url, networkResponse);
      }
      return networkResponse;
    } catch (error) {
      // Return stale cache if network fails
      if (cachedResponse) {
        return cachedResponse;
      }
      throw error;
    }
  }
}

// Initialize cache manager
const cacheManager = new CacheManager();

// Install event
self.addEventListener('install', (event) => {
  console.log('SW: Installing enhanced service worker v3.0');
  
  // Skip waiting to activate immediately
  self.skipWaiting();
  
  event.waitUntil(
    cacheManager.installCaches()
      .then(() => {
        console.log('SW: Installation complete');
      })
      .catch((error) => {
        console.error('SW: Installation failed:', error);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('SW: Activating enhanced service worker v3.0');
  
  event.waitUntil(
    Promise.all([
      cacheManager.cleanupOldCaches(),
      clients.claim()
    ]).then(() => {
      console.log('SW: Activation complete');
    })
  );
});

// Fetch event with intelligent caching strategies
self.addEventListener('fetch', (event) => {
  const strategy = cacheManager.getCachingStrategy(event.request);
  
  if (strategy === 'network-only') {
    return; // Let browser handle normally
  }

  event.respondWith(
    (async () => {
      try {
        switch (strategy) {
          case 'cache-first':
            return await cacheManager.cacheFirst(
              event.request, 
              cacheManager.isWASMAsset(new URL(event.request.url)) ? WASM_CACHE : STATIC_CACHE
            );
          
          case 'network-first':
            return await cacheManager.networkFirst(event.request, RUNTIME_CACHE);
          
          case 'stale-while-revalidate':
            return await cacheManager.staleWhileRevalidate(event.request);
          
          default:
            return await fetch(event.request);
        }
      } catch (error) {
        console.warn('SW: Fetch failed:', event.request.url, error);
        
        // Try to serve from any available cache as last resort
        const cacheNames = [STATIC_CACHE, AUDIO_CACHE, RUNTIME_CACHE, WASM_CACHE];
        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const cachedResponse = await cache.match(event.request);
          if (cachedResponse) {
            console.log('SW: Serving from fallback cache:', cacheName);
            return cachedResponse;
          }
        }
        
        throw error;
      }
    })()
  );
});

// Background sync for cache maintenance
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_MAINTENANCE') {
    event.waitUntil(
      cacheManager.cleanExpiredAudio()
        .then(() => {
          console.log('SW: Cache maintenance completed');
        })
    );
  }
});

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'GET_CACHE_STATS') {
    Promise.all([
      caches.open(AUDIO_CACHE).then(cache => cache.keys()),
      caches.open(STATIC_CACHE).then(cache => cache.keys()),
      caches.open(WASM_CACHE).then(cache => cache.keys()),
      caches.open(RUNTIME_CACHE).then(cache => cache.keys())
    ]).then(([audioKeys, staticKeys, wasmKeys, runtimeKeys]) => {
      event.ports[0].postMessage({
        audioCache: audioKeys.length,
        staticCache: staticKeys.length,
        wasmCache: wasmKeys.length,
        runtimeCache: runtimeKeys.length,
        audioMetadata: Object.fromEntries(cacheManager.audioMetadata)
      });
    });
  }
});

console.log('SW: Enhanced service worker v3.0 loaded'); 