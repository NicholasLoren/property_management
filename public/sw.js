const CACHE_NAME = 'steward-assets-v1';
const CACHEABLE_DESTINATIONS = new Set(['script', 'style', 'image', 'font']);

self.addEventListener('install', () => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    );
});

// Only static, hashed build assets are cached (network-first, falling back to
// cache when offline). Page navigations and data requests (Inertia visits,
// API calls) always go to the network so authenticated/tenant data is never
// served stale or cached on shared devices.
self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET' || !CACHEABLE_DESTINATIONS.has(request.destination)) {
        return;
    }

    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then((response) => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
                }
                return response;
            })
            .catch(() => caches.match(request)),
    );
});
