const CACHE_NAME = 'cf3901646-v2.1';
const PRECACHE_URLS = [
  '/',
  '/favicon.svg',
  '/sunlit-letterpress.html'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch(() => {});
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 跨源请求直接放行
  if (url.origin !== self.location.origin) return;

  // 静态构建产物与无损资源：Cache-First 极速秒开
  if (
    url.pathname.startsWith('/_astro/') ||
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // HTML 导航请求：Stale-While-Revalidate（本地 0ms 秒开，后台拉取最新版本）
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const networkFetch = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
          }
          return networkResponse;
        }).catch(() => cachedResponse);

        return cachedResponse || networkFetch;
      })
    );
    return;
  }

  // 默认策略：网络优先，离线回退
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});
