const CACHE_NAME = 'myday-v4.0-offline-fix';
// Use relative paths for better compatibility across different hosting environments
const BASE_PATH = './'; 

const STATIC_ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/theme.css',
    './css/modals.css',
    './js/app.js',
    './js/habits.js',
    './js/reports.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// 1. Install Event
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. Activate Event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch Event
self.addEventListener('fetch', (event) => {
    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return cached response if found
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise network request
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Clone and cache valid responses
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Offline fallback for navigation requests (HTML)
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// 4. Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.text() : "Time to check in!";
    self.registration.showNotification('MyDay Reminder 🌸', {
        body: data,
        icon: './icons/icon-192.png',
        vibrate: [100, 50, 100]
    });
});