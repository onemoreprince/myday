const CACHE_NAME = 'myday-v3.5';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/main.css',
    '/css/theme.css',
    '/css/modals.css',
    '/js/app.js',
    '/js/habits.js',
    '/js/reports.js',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// 1. Install Event: Cache core assets immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// 2. Activate Event: Clean up old caches
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

// 3. Fetch Event: Smart Strategy
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Strategy A: HTML Navigation -> Network First, Fallback to Cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match(event.request)
                        .then((response) => {
                            return response || caches.match('/');
                        });
                })
        );
        return;
    }

    // Strategy B: Static Assets -> Cache First, Network Background
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });
                return networkResponse;
            });
        })
    );
});

// 4. Push Notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.text() : "Time to check in!";
    const options = {
        body: data,
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-96.png",
        vibrate: [100, 50, 100],
        data: { url: '/' },
        actions: [
            { action: 'check-in', title: '✅ Check In' },
            { action: 'snooze', title: '💤 Snooze' }
        ]
    };
    event.waitUntil(
        self.registration.showNotification('MyDay Reminder 🌸', options)
    );
});

// 5. Notification Click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'check-in') {
        clients.openWindow('/?action=checkin');
    } else {
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    for (const client of clientList) {
                        if (client.url === '/' && 'focus' in client) {
                            return client.focus();
                        }
                    }
                    if (clients.openWindow) {
                        return clients.openWindow('/');
                    }
                })
        );
    }
});
