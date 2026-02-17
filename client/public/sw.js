// Service Worker for FitTrack AI
const CACHE_NAME = 'fittrack-ai-v2-no-api-cache';
const urlsToCache = [
  '/',
  '/dashboard',
  '/foods',
  '/weight',
  '/profile',
  '/favicon.svg'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  const isAPI = url.includes('/api/');
  const isDebugLog = url.includes('127.0.0.1:7243') || url.includes('debug');
  
  // Skip service worker for debug logging endpoint
  if (isDebugLog) {
    return; // Let debug requests go through normally
  }
  
  // CRITICAL FIX: Never cache API responses - always fetch fresh from network
  // This prevents stale data issues
  if (isAPI) {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        console.log('[SW] API request - fetched from network:', url);
        // Don't cache API responses - always get fresh data
        return networkResponse;
      }).catch((error) => {
        console.error('[SW] API request failed:', url, error);
        throw error;
      })
    );
    return; // Don't proceed with cache logic for API
  }
  
  // For HTML pages: use network-first to prevent blank pages
  // For other static assets: use cache-first
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          // Don't cache HTML pages - always get fresh content
          return networkResponse;
        })
        .catch(() => {
          // Fallback to cache only if network fails
          return caches.match(event.request);
        })
    );
  } else {
    // Static assets: use cache-first strategy
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          return response || fetch(event.request);
        })
    );
  }
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      ).then(() => {
        // Force claim all clients to use new service worker immediately
        return self.clients.claim();
      });
    })
  );
});

