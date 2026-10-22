/**
 * Cloudflare Pages Function for /sw.js
 * Dynamically handles all /sw.js requests at the edge with absolute zero cache.
 * Forces immediate unregistration and destruction of any legacy Service Worker.
 */

const SELF_DESTRUCT_SW = `// Service Worker self-destruct and cache purge
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Do not intercept any requests; let all requests pass straight to the network
self.addEventListener('fetch', () => {});
`;

export const onRequest: PagesFunction = async () => {
  return new Response(SELF_DESTRUCT_SW, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
