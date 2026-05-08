const CACHE_NAME = 'lab-portal-v1';

// Risorse da precachare (solo quelle locali — Firebase viene gestito online)
const PRECACHE_URLS = [
  './index.html',
  './manifest.json',
];

// ─── INSTALL: precache risorse locali ─────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    }).then(() => self.skipWaiting())
  );
});

// ─── ACTIVATE: pulisce cache vecchie ──────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── FETCH: Network-first per Firebase, Cache-first per assets locali ─────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase e Google APIs: sempre online (no cache)
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('cdnjs')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Assets locali: Cache-first con fallback network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Aggiorna cache con nuova versione
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Offline fallback: ritorna index16.html per navigazione
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
