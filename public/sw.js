// SakuNota POS — Service Worker v2.6.0
// Resilient Offline-First Precache, CSS Fallback, & Multi-Route Isolation

const CACHE_NAME = 'sakunota-pos-v2.6.0-1792305102526';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // Ambil manifes lengkap dari build Next.js
      let manifest = null;
      try {
        const manifestRes = await fetch('/offline-manifest.json', { cache: 'no-cache' });
        if (manifestRes.ok) {
          manifest = await manifestRes.json();
        }
      } catch (err) {
        console.warn('[SW] Gagal fetch offline-manifest.json:', err);
      }

      if (!manifest || !Array.isArray(manifest.allUrls) || manifest.allUrls.length === 0) {
        throw new Error('[SW] offline-manifest.json kosong atau tidak valid.');
      }

      const urls = manifest.allUrls;
      let cachedCount = 0;

      // 1. Simpan manifest itu sendiri ke cache terlebih dahulu
      await cache.put('/offline-manifest.json', new Response(JSON.stringify(manifest), {
        headers: { 'Content-Type': 'application/json' }
      }));

      // 2. Prioritaskan unduh dan cache rute utama HTML & manifest
      const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
      await Promise.all(
        routes.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) {
              await cache.put(url, res.clone());
              if (!url.includes('.') && url !== '/') {
                await cache.put(`${url}.html`, res.clone());
              }
              if (url === '/' || url === '/index.html') {
                await cache.put('/', res.clone());
                await cache.put('/index.html', res.clone());
              }
              cachedCount++;
            }
          } catch (fetchErr) {
            console.warn(`[SW] Gagal mengunduh rute: ${url}`, fetchErr);
          }
        })
      );

      // Panggil skipWaiting agar SW langsung aktif dan siap offline dalam < 1 detik!
      await self.skipWaiting();

      // 3. Unduh sisa aset statis di background tanpa menahan aktivasi Service Worker
      const otherUrls = urls.filter((u) => !routes.includes(u));
      (async () => {
        const batchSize = 25;
        for (let i = 0; i < otherUrls.length; i += batchSize) {
          const batch = otherUrls.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (url) => {
              try {
                const res = await fetch(url, { cache: 'no-cache' });
                if (res.ok) {
                  await cache.put(url, res.clone());
                }
              } catch (_) {}
            })
          );
        }
      })();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          // Bersihkan cache lama milik SakuNota
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

  // Abaikan endpoint API (selalu ambil dari server/network, jangan dicache oleh Service Worker)
  if (url.pathname.startsWith('/api/')) return;

  // 1. Static Assets (CSS, JS Chunks, Fonts, Images)
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|woff2|woff|ttf|css|js)$/i)
  ) {
    event.respondWith(
      (async () => {
        // Coba match request penuh
        let cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;

        // Coba match pathname
        cached = await caches.match(url.pathname, { ignoreSearch: true });
        if (cached) return cached;

        // Jika online, fetch dari jaringan
        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, clone);
          }
          return networkRes;
        } catch (_) {
          // OFFLINE FALLBACK KHUSUS CSS:
          // Jika file CSS dengan hash spesifik tidak ditemukan di cache (misal beda build hash),
          // gunakan file CSS apa pun yang ada di cache agar halaman TIDAK PERNAH tampil polosan (unstyled)!
          if (url.pathname.endsWith('.css') || url.pathname.includes('/css/')) {
            const cache = await caches.open(CACHE_NAME);
            const keys = await cache.keys();
            const cssKey = keys.find((k) => k.url.includes('.css'));
            if (cssKey) {
              const fallbackCss = await cache.match(cssKey);
              if (fallbackCss) return fallbackCss;
            }
          }

          // Fallback untuk icon gambar
          if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico)$/i)) {
            const iconFallback = await caches.match('/icon.png');
            if (iconFallback) return iconFallback;
          }

          return new Response('Asset not found in offline cache', {
            status: 404,
            statusText: 'Not Found',
            headers: { 'Content-Type': 'text/plain' },
          });
        }
      })()
    );
    return;
  }

  // 2. Next.js Client-Side Router Data (?_rsc=...)
  if (url.searchParams.has('_rsc')) {
    event.respondWith(
      (async () => {
        let cached = await caches.match(req);
        if (cached) return cached;

        try {
          return await fetch(req);
        } catch (_) {
          // Saat offline, jika Next.js meminta RSC payload dan tidak ada di cache,
          // kembalikan 204 No Content agar Next.js Router fallback ke hard navigation
          return new Response(null, { status: 204 });
        }
      })()
    );
    return;
  }

  // 3. Navigation / Halaman HTML (req.mode === 'navigate' atau request text/html)
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      (async () => {
        // Jika online, utamakan network lalu cache hasilnya
        try {
          const networkRes = await fetch(req);
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, clone);
          }
          return networkRes;
        } catch (_) {
          // Saat OFFLINE, ambil dari cache
          const cache = await caches.open(CACHE_NAME);
          const cleanPath = url.pathname.replace(/\/$/, '') || '/';

          // 1. Cek exact match
          let cached = await cache.match(req, { ignoreSearch: true });
          if (cached) return cached;

          // 2. Cek cleanPath
          cached = await cache.match(cleanPath, { ignoreSearch: true });
          if (cached) return cached;

          // 3. Cek cleanPath.html
          cached = await cache.match(`${cleanPath}.html`, { ignoreSearch: true });
          if (cached) return cached;

          // 4. Fallback khusus untuk kasir POS (/pos)
          if (cleanPath.startsWith('/pos')) {
            const posFallback = (await cache.match('/pos', { ignoreSearch: true })) ||
                                (await cache.match('/pos.html', { ignoreSearch: true }));
            if (posFallback) return posFallback;
          }

          // 5. Fallback untuk Admin (/admin/...)
          if (cleanPath.startsWith('/admin')) {
            const adminFallback = (await cache.match('/admin', { ignoreSearch: true })) ||
                                  (await cache.match('/admin.html', { ignoreSearch: true }));
            if (adminFallback) return adminFallback;
          }

          // 6. Terakhir: kembalikan homepage / atau /index.html
          return (await cache.match('/')) ||
                 (await cache.match('/index.html')) ||
                 new Response('Offline page not found', { status: 503 });
        }
      })()
    );
    return;
  }

  // 4. Request lainnya: StaleWhileRevalidate
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
