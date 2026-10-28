/*
 * LANStreamer listener-page service worker.
 *
 * Strategy: network-first for everything, cache as offline fallback. Nothing is
 * ever served stale while the server is up; when the server is down (or the
 * streaming PC's IP changed), listeners get the cached shell — which shows the
 * boot screen's "failed to load" state — instead of a raw browser error.
 *
 * API responses are never cached.
 */
const CACHE = 'lanstreamer-v1';
const SHELL = [
  '/streams',
  '/assets/css/tokens.css',
  '/assets/css/ui.css',
  '/assets/vendor/tailwind.css',
  '/assets/vendor/fonts/fonts.css',
  '/assets/logo.svg',
  '/assets/logo-mark.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((hit) => {
          if (hit) return hit;
          if (request.mode === 'navigate') return caches.match('/streams');
          return Response.error();
        })
      )
  );
});
