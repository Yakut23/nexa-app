// NexaTrade Service Worker v2.0
const CACHE_NAME = 'nexatrade-v2';
const ASSETS = [
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap',
  'https://cdn.jsdelivr.net/npm/chart.js'
];

// ===== INSTALL =====
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(() => console.warn('Could not cache:', url)))
      );
    }).then(() => self.skipWaiting())
  );
});

// ===== ACTIVATE =====
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ===== FETCH — Network first, fallback to cache =====
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  e.respondWith(
    fetch(e.request)
      .then(response => {
        if (response && response.status === 200 && response.type !== 'opaque') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(e.request).then(cached => {
        if (cached) return cached;
        // Offline fallback page
        if (e.request.destination === 'document') {
          return caches.match('./index.html');
        }
      }))
  );
});

// ===== BACKGROUND SYNC (future trades) =====
self.addEventListener('sync', e => {
  if (e.tag === 'sync-trades') {
    e.waitUntil(syncTrades());
  }
});

async function syncTrades() {
  console.log('[SW] Syncing trades in background...');
}

// ===== PUSH NOTIFICATIONS =====
self.addEventListener('push', e => {
  const data = e.data?.json() || { title: 'NexaTrade', body: 'Angalia masoko sasa!' };
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect width="192" height="192" rx="40" fill="%230a0a0f"/><text y="130" x="30" font-size="120">📈</text></svg>',
      badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="20" fill="%2300e5a0"/><text y="72" x="8" font-size="72">N</text></svg>',
      vibrate: [200, 100, 200],
      tag: 'nexatrade-alert',
      renotify: true,
      data: { url: './' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.url || './'));
});
