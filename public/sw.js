// SakuNota POS — Service Worker v2.4.0
// 100% Genuine Offline Support for PWA and Mobile Web

const CACHE_NAME = 'sakunota-pos-v2.4.1';

const PRECACHE_ASSETS = [
  '/',
  '/pos',
  '/manifest.json',
  '/icon.png',
  '/logo.jpg',
  '/admin',
  '/admin/menu',
  '/admin/transaksi',
  '/admin/shift',
  '/admin/meja',
  '/admin/pengaturan',
  '/admin/pengaturan/profil',
  '/admin/pengaturan/printer',
  '/admin/pengaturan/keamanan',
  '/admin/pengaturan/pajak',
  '/admin/pengaturan/data',
  '/admin/pengaturan/tentang'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching partial warning:', err);
      });
    }).then(() => self.skipWaiting())
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

  // Abaikan scheme chrome-extension:// atau selain http/https
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

  // 2. Navigation / Halaman HTML Kasir: NetworkFirst with Cache Fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req).then((networkRes) => {
        if (networkRes && networkRes.status === 200) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
        }
        return networkRes;
      }).catch(() => {
        return caches.match(req, { ignoreSearch: true }).then((cached) => {
          if (cached) return cached;
          const cleanPath = url.pathname.replace(/\/$/, '') || '/';
          return caches.match(cleanPath, { ignoreSearch: true }).then((pathMatch) => {
            if (pathMatch) return pathMatch;
            if (cleanPath.startsWith('/pos')) return caches.match('/pos', { ignoreSearch: true });
            if (cleanPath.startsWith('/admin')) return caches.match('/admin', { ignoreSearch: true });
            return caches.match('/');
          });
        });
      })
    );
    return;
  }

  // 3. Request Lainnya: StaleWhileRevalidate
  event.respondWith(
    caches.match(req).then((cached) => {
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
