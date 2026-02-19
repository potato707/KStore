// Service Worker for KStore PWA - Full Offline Support
var CACHE_NAME = 'kstore-v7';

// Install - just skip waiting
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

// Activate - clean old caches and claim clients
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch handler
self.addEventListener('fetch', function(event) {
  var request = event.request;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // NEVER cache API calls - the app handles its own offline cache via localStorage
  if (request.url.indexOf('/api/') !== -1) {
    event.respondWith(
      fetch(request).catch(function() {
        // API offline - return error so the app uses localStorage fallback
        return new Response(JSON.stringify({ error: 'offline' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For static assets (JS, CSS, images, fonts) - cache them
  event.respondWith(
    fetch(request).then(function(response) {
      if (response && response.status === 200) {
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, responseToCache);
        });
      }
      return response;
    }).catch(function() {
      return caches.match(request).then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        return new Response('', { status: 404 });
      });
    })
  );
});
