/**
 * Arcade Vault V2 Service Worker
 * Offline-First Strategy:
 * - HTML: Network-first with cache fallback
 * - JS/CSS: Cache-first
 * - Assets/Icons: Stale-while-revalidate
 * - Read APIs: Network-first with cache fallback
 */

const CACHE_VERSION = 'arcade-vault-v2.0.0';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const API_CACHE = `api-${CACHE_VERSION}`;
const ASSET_CACHE = `assets-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles/tokens.css',
  './styles/layout.css',
  './styles/components.css',
  './styles/effects.css',
  './styles/animations.css',
  './js/state.js',
  './js/hub.js',
  './js/bus.js',
  './js/store.js',
  './js/router.js',
  './js/animator.js',
  './js/audio.js',
  './js/base-game.js',
  './js/touch-controls.js',
  './js/asset-loader.js',
  './js/multiplayer.js',
  './js/game-registry.js',
  './js/progression.js',
  './js/sync.js',
  './js/cosmetics.js',
  './js/games/snake.js',
  './js/games/shooter.js',
  './js/games/breaker.js',
  './js/games/tiles2048.js',
  './js/games/memory.js',
  './js/games/reaction.js',
  './js/games/pong-vs.js',
  './assets/icons/icon-192x192.png',
  './assets/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(CORE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => !k.includes(CACHE_VERSION)).map(k => caches.delete(k))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Ignore non-GET requests (mutations handled by SyncManager)
  if (request.method !== 'GET') {
    return;
  }

  // 1. Read APIs: Network-first with cache fallback
  if (url.pathname.includes('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(API_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request);
        })
    );
    return;
  }

  // 2. HTML: Network-first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('./index.html') || caches.match(request))
    );
    return;
  }

  // 3. Static Assets (Images, Icons, Fonts): Stale-while-revalidate
  if (url.pathname.includes('/assets/') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(ASSET_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          const fetchPromise = fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => null);

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 4. JS & CSS: Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
        }
        return networkRes;
      });
    })
  );
});