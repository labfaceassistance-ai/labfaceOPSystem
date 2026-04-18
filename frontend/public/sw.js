// Service Worker for Offline Support
const CACHE_NAME = 'labface-v3';
const urlsToCache = [
    '/',
    '/login',
    '/register',
    '/offline.html'
];

// Install event - cache essential files one by one to avoid total failure
self.addEventListener('install', (event) => {
    self.skipWaiting(); // Force the waiting service worker to become the active service worker
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Pre-caching essential assets...');
                return Promise.allSettled(
                    urlsToCache.map(url => {
                        return cache.add(url).catch(err => {
                            console.warn(`[SW] Failed to cache: ${url}`, err);
                        });
                    })
                );
            })
    );
});

// Fetch event - Network-First Strategy
// This ensures the latest content is always fetched if online, 
// falling back to cache only when offline.
self.addEventListener('fetch', (event) => {
    // Only attempt to cache GET requests that are not API calls
    const url = new URL(event.request.url);
    if (event.request.method !== 'GET' || url.pathname.startsWith('/api') || url.pathname.startsWith('/socket.io')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Check if we received a valid response
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                // IMPORTANT: Clone the response to store it in the cache
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return response;
            })
            .catch(() => {
                // Network failed (we are offline), try the cache
                return caches.match(event.request).then((response) => {
                    if (response) {
                        return response;
                    }
                    // If both fail, show the offline page
                    if (event.request.mode === 'navigate') {
                        return caches.match('/offline.html');
                    }
                });
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    
    // Immediately take control of all open tabs
    event.waitUntil(self.clients.claim());

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[SW] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Listener for manual update triggers from the UI
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
