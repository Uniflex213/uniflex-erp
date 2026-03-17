const CACHE = 'uniflex-v2';

self.addEventListener('install', e => {
  // Only cache the index page — Vite-built assets have content hashes and cache themselves
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Don't cache API calls
  if (e.request.url.includes('supabase.co')) return;
  if (e.request.url.includes('/functions/')) return;

  // For navigation requests, serve index.html from cache as fallback (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/'))
    );
    return;
  }

  // For assets, try network first, then cache
  e.respondWith(
    fetch(e.request).then(response => {
      // Cache successful responses for assets
      if (response.ok && e.request.url.includes('/assets/')) {
        const clone = response.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return response;
    }).catch(() => caches.match(e.request))
  );
});
