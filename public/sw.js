// SakuNota POS — Service Worker v2.6.0
// Resilient Offline-First Precache, CSS Fallback, & Multi-Route Isolation

const CACHE_NAME = 'sakunota-pos-v2.6.0-1792120493357';

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

      // Unduh setiap file dan simpan ke CacheStorage
      await Promise.all(
        urls.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (res.ok) {
              await cache.put(url, res.clone());
              // Untuk rute tanpa ekstensi (misal /pos, /admin), simpan juga alias .html
              if (!url.includes('.') && url !== '/') {
                await cache.put(`${url}.html`, res.clone());
              }
              cachedCount++;
            } else {
              console.warn(`[SW] Precache non-200 dilewati: ${url} (HTTP ${res.status})`);
            }
          } catch (fetchErr) {
            console.warn(`[SW] Gagal mengunduh aset: ${url}`, fetchErr);
          }
        })
      );

      console.log(`[SW] Precache selesai: ${cachedCount}/${urls.length} tersimpan di ${CACHE_NAME}`);

      // Simpan manifest itu sendiri ke cache
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

          // 6. Terakhir: kembalikan homepage /
          return (await cache.match('/')) || new Response('Offline page not found', { status: 503 });
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
