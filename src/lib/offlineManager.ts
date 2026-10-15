/**
 * SakuNota POS — Offline Readiness & Storage Persistence Manager
 * 
 * Verifikasi atomis dan ketat terhadap integritas seluruh aset offline (manifest-based),
 * memastikan tidak ada klaim "Offline Ready" palsu sebelum setiap aset diverifikasi,
 * dan mengelola perlindungan penyimpanan persisten (Persistent Storage API).
 */

export interface OfflineDiagnostics {
  isServiceWorkerSupported: boolean;
  isControllerActive: boolean;
  isPersistentStorage: boolean;
  cachedAssetsCount: number;
  totalExpectedAssets: number;
  isFullyPrecached: boolean;
  missingAssets: string[];
  storageUsageMb: number;
  storageQuotaMb: number;
  lastChecked: string;
}

export interface DownloadOfflineResult {
  success: boolean;
  total: number;
  completed: number;
  failed: string[];
  missingAfterDownload: string[];
}

/**
 * Meminta izin penyimpanan persisten ke browser (Chrome Android / Chromium)
 * Mengembalikan TRUE hanya jika browser benar-benar menyetujui status persisten.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (!navigator.storage || !navigator.storage.persist) return false;

  try {
    const isAlreadyPersisted = await navigator.storage.persisted();
    if (isAlreadyPersisted) return true;
    
    // Ajukan permintaan ke browser
    await navigator.storage.persist();
    
    // Verifikasi ulang hasil sebenarnya dari browser
    return await navigator.storage.persisted();
  } catch (err) {
    console.warn('[OfflineManager] Gagal meminta persistent storage:', err);
    return false;
  }
}

/**
 * Mengambil estimasi kapasitas penyimpanan lokal yang digunakan
 */
export async function getStorageEstimate(): Promise<{ usageMb: number; quotaMb: number }> {
  if (typeof window === 'undefined') return { usageMb: 0, quotaMb: 0 };
  if (!navigator.storage || !navigator.storage.estimate) return { usageMb: 0, quotaMb: 0 };

  try {
    const estimate = await navigator.storage.estimate();
    const usageMb = estimate.usage ? Math.round(estimate.usage / (1024 * 1024) * 100) / 100 : 0;
    const quotaMb = estimate.quota ? Math.round(estimate.quota / (1024 * 1024) * 100) / 100 : 0;
    return { usageMb, quotaMb };
  } catch (err) {
    return { usageMb: 0, quotaMb: 0 };
  }
}

/**
 * Melakukan audit kesiapan offline secara ketat:
 * Memverifikasi SETIAP URL dalam offline-manifest.json satu per satu terhadap CacheStorage aktif.
 * Tidak menggunakan angka perkiraan atau batas ambang minimum (zero false-readiness).
 */
export async function auditOfflineReadiness(): Promise<OfflineDiagnostics> {
  const result: OfflineDiagnostics = {
    isServiceWorkerSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator,
    isControllerActive: typeof window !== 'undefined' && !!navigator.serviceWorker?.controller,
    isPersistentStorage: false,
    cachedAssetsCount: 0,
    totalExpectedAssets: 0,
    isFullyPrecached: false,
    missingAssets: [],
    storageUsageMb: 0,
    storageQuotaMb: 0,
    lastChecked: new Date().toLocaleTimeString('id-ID')
  };

  if (typeof window === 'undefined') return result;

  // 1. Periksa Persistent Storage yang sebenarnya
  if (navigator.storage && navigator.storage.persisted) {
    try {
      result.isPersistentStorage = await navigator.storage.persisted();
    } catch {}
  }

  // 2. Periksa Storage Estimate
  const est = await getStorageEstimate();
  result.storageUsageMb = est.usageMb;
  result.storageQuotaMb = est.quotaMb;

  // 3. Periksa CacheStorage dengan validasi URL eksak
  if ('caches' in window) {
    try {
      const keys = await caches.keys();
      const currentCacheKey = keys.find(k => k.startsWith('sakunota-pos-')) || keys[0];
      
      if (currentCacheKey) {
        const cache = await caches.open(currentCacheKey);

        // Ambil offline-manifest.json dari cache atau network
        let manifest: { allUrls?: string[]; totalFiles?: number } | null = null;
        try {
          const manifestRes = await cache.match('/offline-manifest.json', { ignoreSearch: true }) || 
                              await fetch('/offline-manifest.json', { cache: 'no-cache' });
          if (manifestRes && manifestRes.ok) {
            manifest = await manifestRes.json();
          }
        } catch {}

        if (manifest && Array.isArray(manifest.allUrls) && manifest.allUrls.length > 0) {
          result.totalExpectedAssets = manifest.allUrls.length;
          const missing: string[] = [];

          // Verifikasi setiap URL wajib satu per satu
          for (const url of manifest.allUrls) {
            const matched = await cache.match(url, { ignoreSearch: true });
            if (!matched) {
              missing.push(url);
            }
          }

          result.missingAssets = missing;
          result.cachedAssetsCount = manifest.allUrls.length - missing.length;
          // Kesiapan penuh hanya jika 0 file yang hilang dan daftar aset valid
          result.isFullyPrecached = missing.length === 0 && manifest.allUrls.length > 0;
        } else {
          // Jika manifest tidak ditemukan, hitung jumlah request tersimpan mentah
          const cachedRequests = await cache.keys();
          result.cachedAssetsCount = cachedRequests.length;
          result.isFullyPrecached = false; // Tanpa manifest, tidak bisa menyatakan siap 100%
        }
      }
    } catch (err) {
      console.warn('[OfflineManager] Gagal memeriksa cache:', err);
    }
  }

  return result;
}

/**
 * Memaksa pengunduhan dan verifikasi seluruh aset dari offline-manifest.json
 * Mengembalikan sukses HANYA jika seluruh aset berhasil diunduh tanpa ada yang gagal.
 */
export async function downloadAllOfflineAssets(
  onProgress?: (current: number, total: number) => void
): Promise<DownloadOfflineResult> {
  const result: DownloadOfflineResult = {
    success: false,
    total: 0,
    completed: 0,
    failed: [],
    missingAfterDownload: []
  };

  if (typeof window === 'undefined' || !('caches' in window)) {
    result.failed.push('Cache API tidak didukung oleh browser');
    return result;
  }

  try {
    const res = await fetch('/offline-manifest.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('Berkas offline-manifest.json tidak ditemukan di server.');
    const manifest = await res.json();
    const urls: string[] = manifest.allUrls || [];

    if (urls.length === 0) {
      result.failed.push('Daftar URL dalam manifest kosong');
      return result;
    }

    result.total = urls.length;

    const keys = await caches.keys();
    const currentKey = keys.find(k => k.startsWith('sakunota-pos-')) || 'sakunota-pos-v2.5.0';
    const cache = await caches.open(currentKey);

    // Simpan salinan manifest ke cache
    await cache.put('/offline-manifest.json', new Response(JSON.stringify(manifest), {
      headers: { 'Content-Type': 'application/json' }
    }));

    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: 'reload' });
        if (response.ok) {
          await cache.put(url, response);
          result.completed++;
        } else {
          result.failed.push(`${url} (HTTP ${response.status})`);
        }
      } catch (e: any) {
        result.failed.push(`${url} (${e?.message || 'Network error'})`);
      }
      if (onProgress) onProgress(result.completed + result.failed.length, urls.length);
    }

    // Verifikasi ulang setiap aset di cache pasca-unduh
    for (const url of urls) {
      const match = await cache.match(url, { ignoreSearch: true });
      if (!match) {
        result.missingAfterDownload.push(url);
      }
    }

    // Hanya sukses jika nol kegagalan dan nol kehilangan
    result.success = result.failed.length === 0 && result.missingAfterDownload.length === 0;

    // Ajukan permohonan persistent storage setelah proses
    await requestPersistentStorage();

    return result;
  } catch (err: any) {
    console.error('[OfflineManager] Gagal proses unduh aset offline:', err);
    result.failed.push(err?.message || 'Proses unduh gagal dijalankan');
    return result;
  }
}
