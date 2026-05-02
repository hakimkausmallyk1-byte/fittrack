const CACHE_NAME = 'fittrack-20260502193500';
const ASSETS = [
  '/fittrack/',
  '/fittrack/index.html',
  '/fittrack/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match('/fittrack/index.html'));
    })
  );
});

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : { title: 'FitTrack', body: 'Séance du jour !' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/fittrack/icon-192.png',
      badge: '/fittrack/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: '/fittrack/' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url || '/fittrack/'));
});
