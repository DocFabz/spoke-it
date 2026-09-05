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

/* Le mode d'emploi, chargé par l'app dans une iframe. Deux entrées distinctes
   dans le cache : './' pour l'app, GUIDE pour le manuel. */
var GUIDE = 'guide.html';

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) {
    /* Le manuel est pré-chargé pour être consultable hors-ligne dès la
       première fois. Son échec ne doit pas faire échouer l'installation :
       l'app doit rester installable même si le manuel manque. */
    return c.add('./').then(function() {
      return c.add(GUIDE).catch(function() {});
    });
  }));
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

  var url = new URL(req.url);

  /* Manuel → clé propre, testée AVANT la branche navigation : le chargement
     d'une iframe est lui aussi une navigation, et il écraserait sinon
     l'entrée './' de l'app par le manuel. La clé fixe ignore ?lang=, les deux
     langues étant servies par le même fichier. */
  if (url.origin === self.location.origin &&
      url.pathname.replace(/^.*\//, '') === GUIDE) {
    e.respondWith(networkFirst(req, GUIDE));
    return;
  }

  /* Navigation de premier niveau → clé unique './'. Le test sur destination
     écarte les iframes : seul le document principal alimente cette entrée. */
  if (req.mode === 'navigate' && req.destination !== 'iframe') {
    e.respondWith(networkFirst(req, './'));
    return;
  }

  /* Google Fonts → même logique, pour que les polices survivent hors-ligne */
  var h = url.hostname;
  if (h === 'fonts.googleapis.com' || h === 'fonts.gstatic.com') {
    e.respondWith(networkFirst(req));
  }
  /* Tout le reste (GA inclus) : comportement navigateur inchangé */
});
