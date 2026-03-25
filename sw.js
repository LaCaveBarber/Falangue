const CACHE_NAME = 'falangue-v1.2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,400&display=swap'
];

// Install — cache tout
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS.map(url => new Request(url, { mode: 'no-cors' })));
    })
  );
  self.skipWaiting();
});

// Activate — supprime anciens caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — stratégie Cache First avec fallback réseau
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return response;
      }).catch(() => caches.match('/index.html'));
    })
  );
});

// Background sync — synchro progrès quand réseau revient
self.addEventListener('sync', e => {
  if (e.tag === 'sync-progress') {
    e.waitUntil(syncProgress());
  }
});

async function syncProgress() {
  const db = await openDB();
  const pending = await db.getAll('pending-sync');
  for (const item of pending) {
    try {
      await fetch('/api/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      await db.delete('pending-sync', item.id);
    } catch (_) {}
  }
}

// Push notifications — rappels quotidiens
self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title || 'Falangue 🌍', {
      body: data.body || 'Ta session de 30 min t\'attend !',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: { url: data.url || '/' },
      actions: [
        { action: 'open', title: 'Commencer ▶' },
        { action: 'dismiss', title: 'Plus tard' }
      ]
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'open' || !e.action) {
    e.waitUntil(clients.openWindow(e.notification.data.url));
  }
});
