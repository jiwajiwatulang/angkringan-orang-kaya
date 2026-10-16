import { db } from './dexie';

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  paperWidth: '58mm' | '80mm';
  enableWatermark: boolean;
  serviceMode: 'resto' | 'quick'; // resto = with tables, quick = fast cashier without tables
  adminPin: string; // PIN pengaman akses Admin & Void
  enablePin: boolean;
  recoveryCodeHash?: string; // SHA-256 hash Recovery Code pemilik toko (offline-first)
  failedRecoveryAttempts?: number; // Jumlah percobaan salah berturut-turut
  recoveryLockedUntil?: string; // Batas waktu ISO cooldown jika percobaan salah berkali-kali
  taxName: string; // Nama pajak: PBJT / PB1 / Pajak Resto
  taxPercent: number; // Persentase Pajak Daerah / PBJT (maks 10%)
  enableTax: boolean;
  taxAppliesToService: boolean; // Apakah PBJT dikenakan juga pada Service Charge (UU HKPD)
  servicePercent: number; // Persentase Biaya Layanan
  enableService: boolean;
  onboardingCompleted?: boolean; // Status penyelesaian onboarding toko baru
  businessType?: string; // Jenis usaha: 'warung' | 'restoran' | 'kafe' | 'retail' | 'angkringan'
  storeLogo?: string; // Base64 data URL untuk logo usaha / struk
}

export const BUSINESS_TYPES = [
  {
    id: "warung",
    title: "Warung & UMKM",
    description: "Jualan langsung cepat tanpa harus mengatur meja.",
    defaultServiceMode: "quick" as const,
  },
  {
    id: "restoran",
    title: "Rumah Makan & Restoran",
    description: "Pesanan makan di tempat dan pengaturan meja.",
    defaultServiceMode: "resto" as const,
  },
  {
    id: "kafe",
    title: "Kafe & Kedai Minuman",
    description: "Ukuran minuman, pilihan tambahan, dan take-away.",
    defaultServiceMode: "resto" as const,
  },
  {
    id: "retail",
    title: "Toko & Retail",
    description: "Barang, harga, dan stok penjualan tanpa meja.",
    defaultServiceMode: "quick" as const,
  },
] as const;

export function isTableManagementEnabled(settings: StoreSettings): boolean {
  if (settings.serviceMode === "quick") return false;
  if (settings.businessType === "warung" || settings.businessType === "retail") return false;
  return true;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SakuNota POS",
  storeAddress: "Kasir Jalan Tanpa Internet",
  storePhone: "",
  receiptFooter: "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali",
  paperWidth: "58mm",
  enableWatermark: true,
  serviceMode: "resto",
  adminPin: "1234",
  enablePin: false,
  recoveryCodeHash: "",
  failedRecoveryAttempts: 0,
  recoveryLockedUntil: "",
  taxName: "PBJT Restoran (10%)",
  taxPercent: 10,
  enableTax: false,
  taxAppliesToService: true,
  servicePercent: 5,
  enableService: false,
  onboardingCompleted: true, // Default true agar existing instalasi tidak terganggu
  businessType: "restoran",
  storeLogo: "",
};

const STORAGE_KEY = "pos_store_settings";
const SETTINGS_EVENT = "sakunota:settings_updated";
const BROADCAST_NAME = "sakunota_sync_channel";

// In-memory cache for ultra-fast synchronous access during render
let memoryCache: StoreSettings | null = null;

export function getStoreSettings(): StoreSettings {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const def = { ...DEFAULT_SETTINGS };
      memoryCache = def;
      return def;
    }
    const parsed = JSON.parse(raw);
    const merged: StoreSettings = { ...DEFAULT_SETTINGS, ...parsed };
    memoryCache = merged;
    return merged;
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Asynchronously loads settings with dual-layer fallback:
 * 1. Checks Dexie IndexedDB (persistent on device file system).
 * 2. If present in Dexie, synchronizes to localStorage & memory cache.
 * 3. If missing in Dexie but present in localStorage, migrates to Dexie.
 * 4. Falls back to DEFAULT_SETTINGS.
 */
export async function loadStoreSettingsAsync(): Promise<StoreSettings> {
  try {
    if (typeof window !== "undefined") {
      const entry = await db.table('settings').get('pos_store_settings');
      if (entry && entry.value) {
        const merged = { ...DEFAULT_SETTINGS, ...entry.value };
        memoryCache = merged;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        } catch (_) {}
        return merged;
      }
    }
  } catch (err) {
    console.warn("Dexie settings read warning, falling back to localStorage", err);
  }

  // Fallback to localStorage
  const local = getStoreSettings();
  // Self-heal: persist local cache into Dexie if Dexie table exists
  try {
    if (typeof window !== "undefined") {
      await db.table('settings').put({
        key: 'pos_store_settings',
        value: local,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (_) {}

  return local;
}

/**
 * Asynchronous, guaranteed-persistence save.
 * Guarantees that Dexie IndexedDB write has completed before resolving.
 */
export async function saveStoreSettingsAsync(settings: StoreSettings): Promise<void> {
  const merged: StoreSettings = { ...DEFAULT_SETTINGS, ...settings };
  memoryCache = merged;

  // 1. Synchronous localStorage write
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (e) {
      console.warn("localStorage setItem failed", e);
    }
  }

  // 2. Asynchronous IndexedDB write (await guaranteed)
  try {
    await db.table('settings').put({
      key: 'pos_store_settings',
      value: merged,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Dexie settings write error:", err);
    throw new Error("Gagal menyimpan ke basis data lokal (IndexedDB): " + (err as any)?.message);
  }

  // 3. Real-time broadcast to all active components & tabs
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: merged }));
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel(BROADCAST_NAME);
        channel.postMessage({ type: 'SETTINGS_UPDATED', settings: merged });
        channel.close();
      }
    } catch (_) {}
  }
}

/**
 * Synchronous backward-compatible wrapper
 */
export function saveStoreSettings(settings: StoreSettings): void {
  saveStoreSettingsAsync(settings).catch(err => {
    console.error("saveStoreSettings background error:", err);
  });
}

export async function updateStoreSettings(partial: Partial<StoreSettings>): Promise<void> {
  const current = await loadStoreSettingsAsync();
  const merged = { ...current, ...partial };
  await saveStoreSettingsAsync(merged);
}

/**
 * Subscribes to settings updates across the entire application in real-time.
 * Automatically synchronizes via:
 * 1. CustomEvent (same-window reactivity)
 * 2. BroadcastChannel (multi-tab / multi-webview reactivity)
 * 3. window.storage event (fallback cross-window reactivity)
 * 4. focus & visibilitychange (guarantees freshness when app is brought to foreground)
 */
export function subscribeStoreSettings(callback: (settings: StoreSettings) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleCustomEvent = (e: any) => {
    if (e.detail) {
      callback(e.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      try {
        const parsed = JSON.parse(e.newValue);
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        memoryCache = merged;
        callback(merged);
      } catch (_) {}
    }
  };

  const handleFocusOrVisible = async () => {
    try {
      const fresh = await loadStoreSettingsAsync();
      callback(fresh);
    } catch (_) {}
  };

  const handleVisibility = () => {
    if (document.visibilityState === 'visible') {
      handleFocusOrVisible();
    }
  };

  window.addEventListener(SETTINGS_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);
  window.addEventListener('focus', handleFocusOrVisible);
  document.addEventListener('visibilitychange', handleVisibility);

  let channel: BroadcastChannel | null = null;
  if ('BroadcastChannel' in window) {
    channel = new BroadcastChannel(BROADCAST_NAME);
    channel.onmessage = (event) => {
      if (event.data?.type === 'SETTINGS_UPDATED' && event.data.settings) {
        memoryCache = event.data.settings;
        callback(event.data.settings);
      }
    };
  }

  return () => {
    window.removeEventListener(SETTINGS_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
    window.removeEventListener('focus', handleFocusOrVisible);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (channel) {
      channel.close();
    }
  };
}
