const CACHE = 'falangue-v10';
const FILES = ['/falangue/', '/falangue/index.html', '/falangue/manifest.json', '/falangue/icon-192.png', '/falangue/icon-512.png'];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(FILES).catch(function(){}); }));
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.map(function(k) { if(k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  e.respondWith(fetch(e.request).catch(function() {
    return caches.match(e.request).then(function(r) { return r || caches.match('/falangue/index.html'); });
  }));
});
