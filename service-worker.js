self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('progress-cache-v1').then(cache => cache.addAll([
      './',
      './index.html',
      './styles.css',
      './app.js',
      './manifest.webmanifest',
      './vendor/idb.min.js',
      './icons/icon-192.png',
      './icons/icon-512.png'
    ]))
  );
  self.skipWaiting();
});
self.addEventListener('activate', event => { event.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(r => r || fetch(event.request)));
});
