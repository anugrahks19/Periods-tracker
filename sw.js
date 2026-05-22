/* ============================================
   BLOOM — Service Worker (Offline PWA)
   ============================================ */

const CACHE_NAME = 'bloom-v9';

// Install — skip waiting to activate immediately
self.addEventListener('install', () => self.skipWaiting());

// Activate — claim clients and clear ALL old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch — network-first for EVERYTHING (ensures updates always load)
// Only fall back to cache if offline
self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        // Cache a copy for offline use
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/index.html')))
  );
});
