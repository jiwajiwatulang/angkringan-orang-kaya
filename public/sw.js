// SakuNota POS — Service Worker v2.5.0
// Genuine Offline-First Support for PWA and Mobile Web

const CACHE_NAME = 'sakunota-pos-v2.5.0';

const FALLBACK_CORE_ASSETS = [
  '/',
  '/pos',
  '/pos.html',
  '/manifest.json',
  '/icon.png',
  '/logo.jpg',
  '/favicon.ico',
  '/offline-manifest.json',
  '/admin',
  '/admin.html',
  '/admin/menu',
  '/admin/menu.html',
  '/admin/transaksi',
  '/admin/transaksi.html',
  '/admin/shift',
  '/admin/shift.html',
  '/admin/meja',
  '/admin/meja.html',
  '/admin/pengaturan',
  '/admin/pengaturan.html',
  '/admin/pengaturan/profil',
  '/admin/pengaturan/profil.html',
  '/admin/pengaturan/printer',
  '/admin/pengaturan/printer.html',
  '/admin/pengaturan/keamanan',
  '/admin/pengaturan/keamanan.html',
  '/admin/pengaturan/pajak',
  '/admin/pengaturan/pajak.html',
  '/admin/pengaturan/data',
  '/admin/pengaturan/data.html',
  '/admin/pengaturan/tentang',
  '/admin/pengaturan/tentang.html',
  '/404.html'
];

const PRECACHE_ASSETS = FALLBACK_CORE_ASSETS;

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const manifestRes = await fetch('/offline-manifest.json', { cache: 'no-cache' });
        if (manifestRes && manifestRes.ok) {
          const manifest = await manifestRes.json();
          if (Array.isArray(manifest.allUrls) && manifest.allUrls.length > 0) {
            // Precache SEMUA rute HTML, JS chunks, CSS, dan font WOFF2 secara atomik
            await cache.addAll(manifest.allUrls);
            await cache.put('/offline-manifest.json', new Response(JSON.stringify(manifest), {
              headers: { 'Content-Type': 'application/json' }
            }));
            await self.skipWaiting();
            return;
          }
        }
      } catch (err) {
        console.warn('[SW] Manifest fetch gagal, mencoba fallback core assets:', err);
      }

      // Fallback jika offline-manifest.json tidak dapat diakses
      await cache.addAll(FALLBACK_CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Abaikan request non-GET
  if (req.method !== 'GET') return;

  // Abaikan scheme selain http/https
  if (!url.protocol.startsWith('http')) return;

  // 1. Static Assets Next.js & Media: CacheFirst
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|woff|ttf)$/i)
  ) {
    event.respondWith(
      caches.match(req, { ignoreSearch: true }).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (!res || res.status !== 200 || res.type !== 'basic') return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return res;
        }).catch(() => caches.match('/icon.png'));
      })
    );
    return;
  }

  // 2. Navigation / Halaman HTML Kasir: NetworkFirst with Precise Offline Fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        
        // Coba exact URL (dengan ignoreSearch untuk menangani ?tab=menu, ?table=3, dll)
        let cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;

        const cleanPath = url.pathname.replace(/\/$/, '') || '/';
        
        // Coba pathname tanpa slash
        cached = await cache.match(cleanPath, { ignoreSearch: true });
        if (cached) return cached;

        // Coba pathname dengan akhiran .html
        cached = await cache.match(`${cleanPath}.html`, { ignoreSearch: true });
        if (cached) return cached;

        // Fallback khusus untuk kasir POS
        if (cleanPath.startsWith('/pos')) {
          const posFallback = await cache.match('/pos', { ignoreSearch: true }) || 
                              await cache.match('/pos.html', { ignoreSearch: true });
          if (posFallback) return posFallback;
        }

        // PENTING: JANGAN sembarang redirect subhalaman admin yang hilang ke /admin dashboard!
        // Berikan 404 cache agar pengguna tahu halaman belum ter-cache
        const notFound = await cache.match('/404.html') || await cache.match('/_not-found.html');
        if (notFound) return notFound;

        return cache.match('/');
      })
    );
    return;
  }

  // 3. Request Lainnya (misal JSON manifest / API data): StaleWhileRevalidate
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      const fetchPromise = fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
