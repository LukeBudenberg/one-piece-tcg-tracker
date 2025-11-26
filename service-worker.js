const CACHE_NAME = 'optcg-tracker-v5';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './icons/Straw-Hat-Logo.png'
];

// Install event - cache files
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip caching for chrome-extension and other non-http(s) URLs
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }
        
        // Clone the request
        const fetchRequest = event.request.clone();
        
        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clone the response
          const responseToCache = response.clone();
          
          // Only cache http(s) requests
          if (event.request.url.startsWith('http')) {
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache).catch(err => {
                  console.log('Cache put failed:', err);
                });
              });
          }
          
          return response;
        }).catch(error => {
          // Return error response instead of throwing
          return new Response('Network error', { status: 408 });
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
