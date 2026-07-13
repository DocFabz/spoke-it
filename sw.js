/* ═════════════════════════════════════════════════════════════════════════════
   SPOKEIT — SERVICE WORKER  (network-first, version minimale)
   ═════════════════════════════════════════════════════════════════════════════
   Rôle unique : garantir le lancement hors-ligne. En ligne, comportement
   strictement identique à l'absence de SW : chaque navigation part au réseau,
   les mises à jour arrivent comme aujourd'hui. Le cache n'est consulté QUE si
   le réseau échoue (mode avion, cave, atelier sans wifi).

   Aucune version, aucun bump, aucune maintenance : le cache est réécrit en
   silence à chaque chargement en ligne réussi. Ce fichier ne change jamais.
   ─────────────────────────────────────────────────────────────────────────── */
var CACHE = 'spokeit-offline';

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.add('./'); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(self.clients.claim());
});

/* Réseau d'abord ; copie fraîche mise en cache au passage ; cache en secours. */
function networkFirst(req, cacheKey) {
  return fetch(req).then(function(resp) {
    if (resp && resp.ok) {
      var copie = resp.clone();
      caches.open(CACHE).then(function(c) { c.put(cacheKey || req, copie); });
    }
    return resp;
  }).catch(function() {
    return caches.match(cacheKey || req);
  });
}

self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  /* Navigation → clé unique './' (insensible au hash #r= des recettes) */
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, './')); return; }

  /* Google Fonts → même logique, pour que les polices survivent hors-ligne */
  var h = new URL(req.url).hostname;
  if (h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com') {
    e.respondWith(networkFirst(req));
  }
  /* Tout le reste (GA inclus) : comportement navigateur inchangé */
});
