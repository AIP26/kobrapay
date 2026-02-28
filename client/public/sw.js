// KobraPay Service Worker — PWA Support
const CACHE_NAME = 'kobrapay-v1';
const OFFLINE_URL = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and API calls
  if (event.request.method !== 'GET') return;
  if (event.request.url.includes('/api/')) return;
  if (event.request.url.includes('/api/trpc')) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses for HTML and static assets
        if (response.ok && (
          event.request.destination === 'document' ||
          event.request.destination === 'script' ||
          event.request.destination === 'style' ||
          event.request.destination === 'image'
        )) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Return cached version if available
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          // For navigation requests, return the root page
          if (event.request.destination === 'document') {
            return caches.match('/');
          }
        });
      })
  );
});
