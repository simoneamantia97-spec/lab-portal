const CACHE_NAME = 'lab-portal-v2';

// Risorse da precachare
const PRECACHE_URLS = [
  './manifest.json',
];

// ─── INSTALL ──────────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
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

// ─── FETCH: Network-first per HTML, Cache-first per altri assets ──────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase, CDN, Google Fonts: sempre online
  if (
    url.hostname.includes('firebasedatabase.app') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('cloudflare') ||
    url.hostname.includes('cdnjs') ||
    url.hostname.includes('gstatic')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Per HTML (index.html e navigazione): NETWORK-FIRST
  // Così gli aggiornamenti sono presi al volo
  if (event.request.mode === 'navigate' ||
      event.request.destination === 'document' ||
      url.pathname.endsWith('.html') ||
      url.pathname === '/' ||
      url.pathname.endsWith('/lab-portal/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Aggiorna la cache con l'ultima versione
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Per altri asset (manifest, immagini, ecc): CACHE-FIRST
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});
