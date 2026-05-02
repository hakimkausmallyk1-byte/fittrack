const CACHE_VERSION = '%%CACHE_VERSION%%';
const CACHE_NAME = 'fittrack-' + CACHE_VERSION;

// On n'inclut PAS index.html dans les assets cachés
const STATIC_ASSETS = [
  '/fittrack/manifest.json'
];

self.addEventListener('install', e => {
  console.log('[SW] Install:', CACHE_NAME);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activate, purge old caches');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k.startsWith('fittrack-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // HTML → toujours réseau, jamais cache
  if (
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/')
  ) {
    e.respondWith(
      fetch(e.request)
        .catch(() => caches.match('/fittrack/index.html'))
    );
    return;
  }

  // Tout le reste → cache-first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'FitTrack', body: 'Séance du jour !' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/fittrack/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/fittrack/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/fittrack/'));
});
