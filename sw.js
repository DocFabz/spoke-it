const CACHE = 'spoke-it-1652a584';

const ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/site.webmanifest',
  'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@300;400;500&family=Cormorant+Garamond:wght@300;400;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(Promise.all([
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ),
    self.registration.navigationPreload && self.registration.navigationPreload.enable()
  ]));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const cached = await caches.match(e.request);
        const preload = e.preloadResponse;
        const network = preload || fetch(e.request);
        // Retourner le cache immédiatement, mettre à jour en fond
        if (cached) {
          network.then(r => {
            if (r && r.status === 200) caches.open(CACHE).then(c => c.put(e.request, r.clone()));
          }).catch(() => {});
          return cached;
        }
        const response = await network;
        if (response && response.status === 200) {
          caches.open(CACHE).then(c => c.put(e.request, response.clone()));
        }
        return response;
      } catch(e) {
        return caches.match('/index.html');
      }
    })());
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          caches.open(CACHE).then(cache => cache.put(e.request, response.clone()));
        }
        return response;
      }).catch(() => null);
      return cached || networkFetch;
    })
  );
});
