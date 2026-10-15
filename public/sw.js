// SakuNota POS — Service Worker v2.5.0
// Fail-Closed Atomic Precache & Route Isolation for Genuine Offline Operation

const CACHE_NAME = 'sakunota-pos-v2.5.0';

// PRECACHE_ASSETS dikelola secara atomik dan terverifikasi melalui offline-manifest.json
// Rute wajib ter-cache mencakup: /pos, /admin, /admin/menu, /admin/transaksi, /admin/shift, /admin/meja, /admin/pengaturan/tentang, /admin/pengaturan/printer, /admin/pengaturan/data
const PRECACHE_ASSETS = '/offline-manifest.json';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Ambil manifes lengkap dari build Next.js
      const manifestRes = await fetch('/offline-manifest.json', { cache: 'no-cache' });
      if (!manifestRes.ok) {
        throw new Error(`[SW] Gagal mengunduh offline-manifest.json (HTTP ${manifestRes.status}). Instalasi dibatalkan untuk mempertahankan versi aktif.`);
      }

      const manifest = await manifestRes.json();
      if (!Array.isArray(manifest.allUrls) || manifest.allUrls.length === 0) {
        throw new Error('[SW] offline-manifest.json kosong atau tidak valid. Instalasi dibatalkan.');
      }

      // Precache SEMUA rute HTML, JS chunks, CSS, dan font WOFF2 secara atomik.
      // Jika salah satu file gagal diunduh (404/network fail), cache.addAll() akan throw error
      // sehingga browser membatalkan aktivasi SW baru ini dan tetap mempertahankan SW lama yang berfungsi.
      await cache.addAll(manifest.allUrls);

      // Simpan manifes ke cache untuk verifikasi client-side saat offline
      await cache.put('/offline-manifest.json', new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/json' }
      }));

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          // Hanya hapus cache lama milik SakuNota, jangan hapus cache lain yang ada di origin
          if (key.startsWith('sakunota-pos-') && key !== CACHE_NAME) {
            console.log('[SW] Membersihkan cache lama SakuNota:', key);
            return caches.delete(key);
          }
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Abaikan request non-GET
  if (req.method !== 'GET') return;

  // Abaikan scheme selain http/https
  if (!url.protocol.startsWith('http')) return;

  // 1. Static Assets Next.js & Media: CacheFirst dengan ignoreSearch
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

  // 2. Navigation / Halaman HTML Kasir: NetworkFirst dengan Fallback Eksak
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
        
        // 1. Coba exact URL (dengan ignoreSearch untuk ?tab=menu, ?table=3, dll)
        let cached = await cache.match(req, { ignoreSearch: true });
        if (cached) return cached;

        const cleanPath = url.pathname.replace(/\/$/, '') || '/';
        
        // 2. Coba pathname tanpa trailing slash
        cached = await cache.match(cleanPath, { ignoreSearch: true });
        if (cached) return cached;

        // 3. Coba pathname dengan ekstensi .html
        cached = await cache.match(`${cleanPath}.html`, { ignoreSearch: true });
        if (cached) return cached;

        // 4. Fallback khusus untuk kasir POS (/pos)
        if (cleanPath.startsWith('/pos')) {
          const posFallback = await cache.match('/pos', { ignoreSearch: true }) || 
                              await cache.match('/pos.html', { ignoreSearch: true });
          if (posFallback) return posFallback;
        }

        // 5. JANGAN sembarang lempar subhalaman admin yang hilang ke /admin dashboard!
        // Berikan halaman 404 ter-cache agar pengguna mengetahui rute belum tersimpan
        const notFound = await cache.match('/404.html') || await cache.match('/_not-found.html');
        if (notFound) return notFound;

        return cache.match('/');
      })
    );
    return;
  }

  // 3. Request Lainnya (JSON manifest, dll): StaleWhileRevalidate
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
