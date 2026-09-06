// Suvio service worker — offline shell + basic runtime cache.
// Bump CACHE version whenever you change static assets so old clients
// don't keep serving stale HTML.
const CACHE = 'suvio-shell-v4';
const OFFLINE_URLS = ['/', '/offline', '/manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    try { await cache.addAll(OFFLINE_URLS); } catch {}
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  // Never cache API calls — they need fresh data.
  if (url.pathname.startsWith('/api/')) return;
  if (req.method !== 'GET') return;
  // Network-first for navigations, fall back to cached offline shell.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match('/offline')) || Response.error();
      }
    })());
    return;
  }
  // Stale-while-revalidate for same-origin static assets.
  if (url.origin === self.location.origin) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(req);
      const fetching = fetch(req).then((res) => { cache.put(req, res.clone()); return res; }).catch(() => cached);
      return cached || fetching;
    })());
  }
});

// Web Push (used later once VAPID keys are set).
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch {}
  const title = data.title || 'Suvio';
  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: data.url || '/',
  };
  e.waitUntil(self.registration.showNotification(title, options));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.openWindow(e.notification.data || '/'));
});
