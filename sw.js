// ══════════════════════════════════════════════
//  Team M.S — Service Worker
//  Estratégia: Cache-First para assets estáticos
//              Network-First para Firebase (sempre online quando possível)
// ══════════════════════════════════════════════
const CACHE = 'teamms-v1';

// Assets que ficam em cache (o app inteiro funciona offline)
const PRECACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // Fontes Google (cached na primeira visita)
  'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800;900&family=DM+Mono:wght@400;500&family=Barlow:wght@400;500;600&display=swap',
];

// ── INSTALL: pré-cacheia os assets críticos ─────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      // Adiciona um a um para não falhar tudo se uma URL der erro
      return Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(e => console.warn('Cache miss:', url, e)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpa caches antigos ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── FETCH: estratégia por tipo de request ──────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Firebase e googleapis.com/identitytoolkit → sempre rede (nunca cacheia)
  if (
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebase.googleapis.com')
  ) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Firebase SDK (gstatic) → Cache-First (não muda frequentemente)
  if (url.hostname.includes('gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return resp;
        });
      })
    );
    return;
  }

  // Fontes Google → Cache-First
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(resp => {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return resp;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // App shell (index.html e demais assets locais) → Network-First com fallback no cache
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // Atualiza o cache com a versão mais nova
        if (resp.ok) {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});
