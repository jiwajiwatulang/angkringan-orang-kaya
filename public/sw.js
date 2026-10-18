// Activate a new build only after every required offline asset is available.
const CACHE_NAME = 'sakunota-pos-v2.6.0-1792309309615';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('/offline-manifest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Offline manifest unavailable');
    const manifest = await response.json();
    if (!Array.isArray(manifest.allUrls) || !manifest.allUrls.length) throw new Error('Offline manifest empty');
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(manifest.allUrls);
    await cache.put('/offline-manifest.json', new Response(JSON.stringify(manifest), { headers: { 'Content-Type': 'application/json' } }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    const old = keys.filter(key => key.startsWith('sakunota-pos-') && key !== CACHE_NAME);
    // One previous build supports open tabs still using its hashed chunks.
    await Promise.all(old.slice(0, -1).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (url.searchParams.has('_rsc')) {
    event.respondWith(fetch(req).catch(() => new Response(null, { status: 204 })));
    return;
  }
  const navigation = req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html');
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    if (!navigation) {
      const cached = await cache.match(req, { ignoreSearch: true });
      if (cached) return cached;
      if (url.pathname.startsWith('/_next/static/')) {
        const previous = await caches.match(req, { ignoreSearch: true });
        if (previous) return previous;
      }
    }
    try {
      const response = await fetch(req);
      if (response.ok && response.type !== 'opaque') await cache.put(req, response.clone());
      return response;
    } catch {
      const cleanPath = url.pathname.replace(/\/$/, '') || '/';
      const cached = await cache.match(req, { ignoreSearch: true }) || await cache.match(cleanPath) || await cache.match(`${cleanPath}.html`);
      if (cached) return cached;
      // Each admin route must keep its own identity during offline navigation.
      const notFound = await cache.match('/404.html');
      return notFound || new Response(navigation ? 'Halaman belum tersedia offline. Sambungkan internet dan siapkan mode offline.' : 'Aset belum tersedia offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
