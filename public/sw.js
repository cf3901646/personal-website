// Minimal offline service worker with zero-stale cache strategy
const CACHE_NAME = 'cf-portfolio-v2';
const CORE_SHELL = ['/'];

self.addEventListener('install', (event) => {
  // Take over immediately without waiting for existing tabs to close
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Only handle GET requests from the same origin
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // 2. Completely bypass Space DJ sub-app and WebSocket routes from Service Worker interception
  if (url.pathname.startsWith('/space') || url.pathname.startsWith('/ws') || url.pathname.startsWith('/api')) {
    return;
  }

  // 3. Immutable hashed assets: Cache-First
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // 4. Navigation and HTML requests: Network-First ALWAYS, zero stale HTML
  if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request).catch(() => caches.match(request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // 5. Default: Network with Cache fallback
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
