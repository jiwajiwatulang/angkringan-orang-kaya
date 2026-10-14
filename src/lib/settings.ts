export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  receiptFooter: string;
  paperWidth: '58mm' | '80mm';
  enableWatermark: boolean;
  serviceMode: 'resto' | 'quick'; // resto = with tables, quick = fast cashier without tables
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: "Angkringan Orang Kaya",
  storeAddress: "Jl. Raya Kerobokan No.5, Bali",
  storePhone: "",
  receiptFooter: "Terima Kasih\nSilakan datang kembali",
  paperWidth: "58mm",
  enableWatermark: true,
  serviceMode: "resto",
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
