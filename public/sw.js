// Service Worker for KStore PWA - Full Offline Support
var CACHE_NAME = 'kstore-v5';

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

// Fetch - Cache everything, serve from cache when offline
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

  event.respondWith(
    // Try network first
    fetch(request).then(function(response) {
      // Got a good response - cache it
      if (response && response.status === 200) {
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, responseToCache);
        });
      }
      return response;
    }).catch(function() {
      // Network failed - try cache
      return caches.match(request).then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }

        // For API calls - return empty array
        if (request.url.indexOf('/api/') !== -1) {
          return new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // For everything else - return nothing
        return new Response('', { status: 404 });
      });
    })
  );
});
