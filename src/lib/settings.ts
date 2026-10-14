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
  taxPercent: number; // Persentase Pajak / PB1 / PPN
  enableTax: boolean;
  servicePercent: number; // Persentase Biaya Layanan
  enableService: boolean;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "SakuNota POS",
  storeAddress: "Aplikasi Kasir Pintar UMKM",
  storePhone: "",
  receiptFooter: "Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali",
  paperWidth: "58mm",
  enableWatermark: true,
  serviceMode: "resto",
  adminPin: "1234",
  enablePin: false,
  taxPercent: 10,
  enableTax: false,
  servicePercent: 5,
  enableService: false,
};

const STORAGE_KEY = "pos_store_settings";

export function getStoreSettings(): StoreSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoreSettings(settings: StoreSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error("Gagal menyimpan pengaturan toko", e);
  }
}
