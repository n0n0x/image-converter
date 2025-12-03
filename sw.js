const CACHE_NAME = 'heic-converter-v2';
const ASSETS = [
  '/image-converter/',
  '/image-converter/index.html',
  '/image-converter/app.js',
  '/image-converter/worker.js',
  '/image-converter/manifest.json',
  '/image-converter/icon-180.png',
  '/image-converter/icon-192.png',
  '/image-converter/icon-512.png',
  'https://unpkg.com/@picocss/pico@2/css/pico.min.css',
  'https://esm.sh/heic-to@1.1.0',
  'https://esm.sh/jszip@3.10.1'
];

// Install - cache assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

// Activate - clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch - cache first, then network
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request)
      .then(cached => cached || fetch(e.request))
  );
});
