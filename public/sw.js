// Production-grade Service Worker for Lo-Fi Radio
// Implements 60-minute TTL caching, WASM preloading, and intelligent cache strategies

const SW_VERSION = 'v2.0.0';
const CACHE_NAMES = {
  STATIC: `lofi-static-${SW_VERSION}`,
  AUDIO: `lofi-audio-${SW_VERSION}`,
  WASM: `lofi-wasm-${SW_VERSION}`,
  API: `lofi-api-${SW_VERSION}`
};

const CACHE_TTL = {
  AUDIO: 60 * 60 * 1000, // 60 minutes
  API: 5 * 60 * 1000,    // 5 minutes
  STATIC: 24 * 60 * 60 * 1000 // 24 hours
};

const MAX_CACHE_SIZE = {
  AUDIO: 50, // Maximum 50 audio files
  API: 20,   // Maximum 20 API responses
  STATIC: 100 // Maximum 100 static assets
};

// Static assets to precache
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/assets/engine/DrumSamples/kick.mp3',
  '/assets/engine/DrumSamples/snare.mp3',
  '/assets/engine/DrumSamples/hat.mp3',
  '/assets/engine/PianoSamples/A1v1.mp3',
  '/assets/engine/PianoSamples/A1v3.mp3',
  '/assets/engine/PianoSamples/A2v1.mp3',
  '/assets/engine/PianoSamples/A2v3.mp3',
  '/assets/engine/PianoSamples/A3v1.mp3',
  '/assets/engine/PianoSamples/A3v3.mp3',
  '/assets/engine/PianoSamples/A4v1.mp3',
  '/assets/engine/PianoSamples/A4v3.mp3',
  '/assets/engine/PianoSamples/A5v1.mp3',
  '/assets/engine/PianoSamples/A5v3.mp3',
  '/assets/engine/PianoSamples/A6v1.mp3',
  '/assets/engine/PianoSamples/A6v3.mp3',
  '/assets/engine/PianoSamples/C1v1.mp3',
  '/assets/engine/PianoSamples/C1v3.mp3',
  '/assets/engine/PianoSamples/C2v1.mp3',
  '/assets/engine/PianoSamples/C2v3.mp3',
  '/assets/engine/PianoSamples/C3v1.mp3',
  '/assets/engine/PianoSamples/C3v3.mp3',
  '/assets/engine/PianoSamples/C4v1.mp3',
  '/assets/engine/PianoSamples/C4v3.mp3',
  '/assets/engine/PianoSamples/C5v1.mp3',
  '/assets/engine/PianoSamples/C5v3.mp3',
  '/assets/engine/PianoSamples/C6v1.mp3',
  '/assets/engine/PianoSamples/C6v3.mp3',
  '/assets/engine/PianoSamples/Dsharp1v1.mp3',
  '/assets/engine/PianoSamples/Dsharp1v3.mp3',
  '/assets/engine/PianoSamples/Dsharp2v1.mp3',
  '/assets/engine/PianoSamples/Dsharp2v3.mp3',
  '/assets/engine/PianoSamples/Dsharp3v1.mp3',
  '/assets/engine/PianoSamples/Dsharp3v3.mp3',
  '/assets/engine/PianoSamples/Dsharp4v1.mp3',
  '/assets/engine/PianoSamples/Dsharp4v3.mp3',
  '/assets/engine/PianoSamples/Dsharp5v1.mp3',
  '/assets/engine/PianoSamples/Dsharp5v3.mp3',
  '/assets/engine/PianoSamples/Dsharp6v1.mp3',
  '/assets/engine/PianoSamples/Dsharp6v3.mp3',
  '/assets/engine/PianoSamples/Fsharp1v1.mp3',
  '/assets/engine/PianoSamples/Fsharp1v3.mp3',
  '/assets/engine/PianoSamples/Fsharp2v1.mp3',
  '/assets/engine/PianoSamples/Fsharp2v3.mp3',
  '/assets/engine/PianoSamples/Fsharp3v1.mp3',
  '/assets/engine/PianoSamples/Fsharp3v3.mp3',
  '/assets/engine/PianoSamples/Fsharp4v1.mp3',
  '/assets/engine/PianoSamples/Fsharp4v3.mp3',
  '/assets/engine/PianoSamples/Fsharp5v1.mp3',
  '/assets/engine/PianoSamples/Fsharp5v3.mp3',
  '/assets/engine/PianoSamples/Fsharp6v1.mp3',
  '/assets/engine/PianoSamples/Fsharp6v3.mp3',
  '/voice/news.mp3',
  '/voice/educate.mp3',
  '/voice/weather.mp3'
];

// WASM files to preload
const WASM_ASSETS = [
  // Add WASM files when available
];

// Utility Functions
function isAudioRequest(url) {
  return /\.(mp3|wav|ogg|m4a|aac)$/i.test(url);
}

function isWASMRequest(url) {
  return /\.(wasm)$/i.test(url);
}

function isAPIRequest(url) {
  return url.includes('/api/') || url.includes('/v1/');
}

function isStaticAsset(url) {
  return /\.(js|css|html|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i.test(url) || 
         url.endsWith('/') || 
         STATIC_ASSETS.some(asset => url.endsWith(asset));
}

// Cache Management
async function addToCache(cacheName, request, response, ttl = null) {
  try {
    const cache = await caches.open(cacheName);
    const clonedResponse = response.clone();
    
    if (ttl) {
      const expiryTime = Date.now() + ttl;
      const responseWithExpiry = new Response(clonedResponse.body, {
        status: clonedResponse.status,
        statusText: clonedResponse.statusText,
        headers: {
          ...Object.fromEntries(clonedResponse.headers.entries()),
          'sw-cache-expires': expiryTime.toString()
        }
      });
      await cache.put(request, responseWithExpiry);
    } else {
      await cache.put(request, clonedResponse);
    }
    
    // Manage cache size
    await manageCacheSize(cacheName);
  } catch (error) {
    console.warn('Cache add failed:', error);
  }
}

async function manageCacheSize(cacheName) {
  const cache = await caches.open(cacheName);
  const cacheType = Object.keys(CACHE_NAMES).find(key => CACHE_NAMES[key] === cacheName);
  const maxSize = MAX_CACHE_SIZE[cacheType];
  
  if (!maxSize) return;
  
  const keys = await cache.keys();
  if (keys.length <= maxSize) return;
  
  // Remove oldest entries (LRU eviction)
  const entriesToRemove = keys.slice(0, keys.length - maxSize);
  await Promise.all(entriesToRemove.map(key => cache.delete(key)));
}

async function isResponseExpired(response) {
  const expiryHeader = response.headers.get('sw-cache-expires');
  if (!expiryHeader) return false;
  
  const expiryTime = parseInt(expiryHeader, 10);
  return Date.now() > expiryTime;
}

// Cache Strategies
async function cacheFirst(request, cacheName, ttl = null) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse && !await isResponseExpired(cachedResponse)) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await addToCache(cacheName, request, networkResponse, ttl);
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;
    throw error;
  }
}

async function networkFirst(request, cacheName, ttl = null) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      await addToCache(cacheName, request, networkResponse, ttl);
    }
    return networkResponse;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse && !await isResponseExpired(cachedResponse)) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName, ttl = null) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Revalidate in background
  const fetchPromise = fetch(request).then(async networkResponse => {
    if (networkResponse.ok) {
      await addToCache(cacheName, request, networkResponse, ttl);
    }
    return networkResponse;
  }).catch(() => null);
  
  // Return cached version if available and not expired
  if (cachedResponse && !await isResponseExpired(cachedResponse)) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return await fetchPromise || cachedResponse;
}

// WASM Preloading
async function preloadWASM() {
  if (WASM_ASSETS.length === 0) return;
  
  try {
    const cache = await caches.open(CACHE_NAMES.WASM);
    const preloadPromises = WASM_ASSETS.map(async url => {
      const cachedResponse = await cache.match(url);
      if (!cachedResponse) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            await cache.put(url, response);
          }
        } catch (error) {
          console.warn(`Failed to preload WASM: ${url}`, error);
        }
      }
    });
    
    await Promise.allSettled(preloadPromises);
    console.log('WASM preloading completed');
  } catch (error) {
    console.warn('WASM preloading failed:', error);
  }
}

// Performance monitoring
function logCachePerformance(request, source, duration) {
  if (self.performance && self.performance.mark) {
    self.performance.mark(`cache-${source}-${request.url}`);
    console.log(`Cache ${source} for ${request.url}: ${duration}ms`);
  }
}

// Event Listeners
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Precache static assets
      caches.open(CACHE_NAMES.STATIC).then(cache => {
        return cache.addAll(STATIC_ASSETS);
      }),
      // Preload WASM
      preloadWASM()
    ]).then(() => {
      console.log('Service Worker installation completed');
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then(cacheNames => {
        const currentCaches = Object.values(CACHE_NAMES);
        return Promise.all(
          cacheNames.map(cacheName => {
            if (!currentCaches.includes(cacheName)) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all pages
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker activation completed');
    })
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip cross-origin requests (unless specific CDNs)
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('cdn.') && 
      !url.hostname.includes('jsdelivr.net')) {
    return;
  }
  
  const startTime = Date.now();
  
  if (isAudioRequest(url.pathname)) {
    // Audio files: stale-while-revalidate with 60-minute TTL
    event.respondWith(
      staleWhileRevalidate(request, CACHE_NAMES.AUDIO, CACHE_TTL.AUDIO)
        .then(response => {
          logCachePerformance(request, 'audio-swr', Date.now() - startTime);
          return response;
        })
    );
  } else if (isWASMRequest(url.pathname)) {
    // WASM files: cache-first (long-term caching)
    event.respondWith(
      cacheFirst(request, CACHE_NAMES.WASM)
        .then(response => {
          logCachePerformance(request, 'wasm-cf', Date.now() - startTime);
          return response;
        })
    );
  } else if (isAPIRequest(url.pathname)) {
    // API requests: network-first with 5-minute TTL
    event.respondWith(
      networkFirst(request, CACHE_NAMES.API, CACHE_TTL.API)
        .then(response => {
          logCachePerformance(request, 'api-nf', Date.now() - startTime);
          return response;
        })
    );
  } else if (isStaticAsset(url.pathname)) {
    // Static assets: cache-first with 24-hour TTL
    event.respondWith(
      cacheFirst(request, CACHE_NAMES.STATIC, CACHE_TTL.STATIC)
        .then(response => {
          logCachePerformance(request, 'static-cf', Date.now() - startTime);
          return response;
        })
    );
  }
});

// Background sync for cache cleanup
self.addEventListener('sync', event => {
  if (event.tag === 'cache-cleanup') {
    event.waitUntil(
      Promise.all([
        manageCacheSize(CACHE_NAMES.AUDIO),
        manageCacheSize(CACHE_NAMES.API),
        manageCacheSize(CACHE_NAMES.STATIC)
      ])
    );
  }
});

// Message handling
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_CACHE_STATUS':
      Promise.all([
        caches.open(CACHE_NAMES.AUDIO).then(cache => cache.keys()),
        caches.open(CACHE_NAMES.STATIC).then(cache => cache.keys()),
        caches.open(CACHE_NAMES.WASM).then(cache => cache.keys()),
        caches.open(CACHE_NAMES.API).then(cache => cache.keys())
      ]).then(([audio, static, wasm, api]) => {
        event.ports[0].postMessage({
          type: 'CACHE_STATUS',
          payload: {
            audio: audio.length,
            static: static.length,
            wasm: wasm.length,
            api: api.length,
            version: SW_VERSION
          }
        });
      });
      break;
    case 'CLEAR_CACHE':
      if (payload && payload.type) {
        caches.delete(CACHE_NAMES[payload.type.toUpperCase()])
          .then(() => {
            event.ports[0].postMessage({
              type: 'CACHE_CLEARED',
              payload: { type: payload.type }
            });
          });
      }
      break;
  }
});

console.log(`Lo-Fi Radio Service Worker ${SW_VERSION} loaded`); 