// Version injected by GitHub Actions — do not edit manually
const CACHE_VERSION = '%%CACHE_VERSION%%';
const CACHE_NAME = 'fittrack-' + CACHE_VERSION;
const ASSETS = [
  '/fittrack/',
  '/fittrack/index.html',
  '/fittrack/manifest.json',
  '/fittrack/sw.js'
];

self.addEventListener('install', e => {
  console.log('[SW] Installing version:', CACHE_VERSION);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  console.log('[SW] Activating, clearing old caches...');
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('fittrack-') && k !== CACHE_NAME)
            .map(k => { console.log('[SW] Deleting cache:', k); return caches.delete(k); })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Network first for HTML (always get latest), cache first for assets
  if (e.request.url.endsWith('.html') || e.request.url.endsWith('/')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          if (!res || res.status !== 200) return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
          return res;
        }).catch(() => caches.match('/fittrack/index.html'));
      })
    );
  }
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'FitTrack', body: 'Séance du jour !' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/fittrack/icon-192.png',
      badge: '/fittrack/icon-192.png',
      vibrate: [200, 100, 200],
      data: { url: '/fittrack/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/fittrack/'));
});
