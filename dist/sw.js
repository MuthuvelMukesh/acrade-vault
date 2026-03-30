const CACHE_NAME = 'arcade-vault-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/tokens.css',
  '/styles/layout.css',
  '/styles/components.css',
  '/styles/effects.css',
  '/styles/animations.css',
  '/js/state.js',
  '/js/hub.js',
  '/js/bus.js',
  '/js/store.js',
  '/js/router.js',
  '/js/animator.js',
  '/js/audio.js',
  '/js/base-game.js',
  '/js/touch-controls.js',
  '/js/snake.js',
  '/js/shooter.js',
  '/js/breaker.js',
  '/js/tiles2048.js',
  '/js/memory.js',
  '/js/reaction.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).catch(err => console.warn('Cache failed during install', err))
  );
});

self.addEventListener('fetch', (event) => {
  // Only cache GET requests
  if (event.request.method !== 'GET') return;

  // Let the API calls pass through so leaderboards can update
  if (event.request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchRes) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchRes.clone());
          return fetchRes;
        });
      });
    }).catch(() => {
      // Fallback
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    })
  );
});