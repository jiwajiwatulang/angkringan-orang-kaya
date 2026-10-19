import { db, type TableShape } from '@/lib/dexie';
import { getStoreSettings, saveStoreSettings, type StoreSettings } from '@/lib/settings';

export type BusinessDemoType = 'warung' | 'restoran' | 'kafe' | 'retail';

export interface BusinessDemoPreset {
  id: BusinessDemoType;
  title: string;
  subtitle: string;
  description: string;
  storeName: string;
  storeAddress: string;
  storePhone: string;
  serviceMode: 'quick' | 'resto';
  receiptFooter: string;
  menus: Array<{
    sku: string;
    nama: string;
    harga: number;
    kategori: string;
    barcode?: string;
    trackStock?: boolean;
    stockQty?: number;
    stockUnit?: string;
    modifiers?: any[];
  }>;
  tables: Array<{
    nomor: string;
    zone: string;
    shape: TableShape;
    capacity: number;
    posX?: number;
    posY?: number;
  }>;
}

export const BUSINESS_DEMO_PRESETS: Record<BusinessDemoType, BusinessDemoPreset> = {
  warung: {
    id: 'warung',
    title: 'Warung & UMKM',
    subtitle: 'Angkringan, Warung Makan, Bakso & Mie Ayam',
    description: 'Format kasir cepat counter langsung tanpa nomor meja fisik. Transaksi gesit dan cetak struk instan.',
    storeName: 'Warung Berkah SakuNota',
    storeAddress: 'Jl. Kaliurang KM 5, Yogyakarta',
    storePhone: '0812-3456-7890',
    serviceMode: 'quick',
    receiptFooter: "Matur Nuwun Sampun Mampir\nWarung Berkah SakuNota",
    menus: [
      { sku: 'WRG-001', nama: 'Nasi Kucing Bandeng', harga: 4000, kategori: 'Makanan' },
      { sku: 'WRG-002', nama: 'Nasi Kucing Sambel Teri', harga: 4000, kategori: 'Makanan' },
      { sku: 'WRG-003', nama: 'Nasi Goreng Kampung', harga: 15000, kategori: 'Makanan' },
      { sku: 'WRG-004', nama: 'Sate Usus Bakar', harga: 3000, kategori: 'Sate-satean' },
      { sku: 'WRG-005', nama: 'Sate Telur Puyuh', harga: 4000, kategori: 'Sate-satean' },
      { sku: 'WRG-006', nama: 'Sate Kulit Ayam', harga: 3500, kategori: 'Sate-satean' },
      { sku: 'WRG-007', nama: 'Tempe Mendoan Hangat', harga: 2500, kategori: 'Gorengan' },
      { sku: 'WRG-008', nama: 'Bakwan Sayur Krispi', harga: 2000, kategori: 'Gorengan' },
      { sku: 'WRG-009', nama: 'Tahu Isi Pedas', harga: 2500, kategori: 'Gorengan' },
      { sku: 'WRG-010', nama: 'Wedang Jahe Susu', harga: 7000, kategori: 'Minuman' },
      { sku: 'WRG-011', nama: 'Es Teh Manis Jumbo', harga: 4000, kategori: 'Minuman' },
      { sku: 'WRG-012', nama: 'Kopi Hitam Tubruk', harga: 5000, kategori: 'Minuman' },
    ],
    tables: [] // Tanpa meja
  },

  restoran: {
    id: 'restoran',
    title: 'Rumah Makan & Restoran',
    subtitle: 'Resto Keluarga, Seafood, Sunda & Tradisional',
    description: 'Pengaturan meja lengkap dengan denah ruang, saung lesehan, ruang VIP, split bill, dan cetak pesanan dapur.',
    storeName: 'Restoran Nusantara SakuNota',
    storeAddress: 'Jl. Malioboro No. 88, Yogyakarta',
    storePhone: '0813-9876-5432',
    serviceMode: 'resto',
    receiptFooter: "Terima Kasih atas Kunjungan Anda di Restoran Nusantara\nLayanan Pelanggan: 0813-9876-5432",
    menus: [
      {
        sku: 'RST-001',
        nama: 'Gurame Bakar Madu',
        harga: 48000,
        kategori: 'Ikan & Seafood',
        modifiers: [
          {
            id: 'mod-gurame-1',
            nama: 'Tingkat Kepedasan',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            options: [
              { id: 'opt-gp-1', nama: 'Manis Gurih (Tidak Pedas)', harga: 0 },
              { id: 'opt-gp-2', nama: 'Pedas Sedang', harga: 0 },
              { id: 'opt-gp-3', nama: 'Ekstra Pedas Rawit', harga: 2000 },
            ]
          }
        ]
      },
      {
        sku: 'RST-002',
        nama: 'Ayam Betutu Bali Komplit',
        harga: 38000,
        kategori: 'Ayam & Daging',
        modifiers: [
          {
            id: 'mod-ayam-1',
            nama: 'Porsi Sajian',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            options: [
              { id: 'opt-ap-1', nama: '1/4 Ekor Paha/Dada', harga: 0 },
              { id: 'opt-ap-2', nama: '1/2 Ekor Kenyang', harga: 22000 },
            ]
          }
        ]
      },
      {
        sku: 'RST-003',
        nama: 'Nasi Liwet Komplit Panci',
        harga: 35000,
        kategori: 'Nasi & Paket',
        modifiers: [
          {
            id: 'mod-nasi-1',
            nama: 'Pilihan Nasi',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            options: [
              { id: 'opt-np-1', nama: 'Nasi Liwet Wangi Teri', harga: 0 },
              { id: 'opt-np-2', nama: 'Nasi Putih Pulen', harga: 0 },
            ]
          }
        ]
      },
      { sku: 'RST-004', nama: 'Cumi Saus Padang Spesial', harga: 42000, kategori: 'Ikan & Seafood' },
      { sku: 'RST-005', nama: 'Sop Buntut Sapi Kuah Gurih', harga: 58000, kategori: 'Ayam & Daging' },
      { sku: 'RST-006', nama: 'Cah Kangkung Terasi Hotplate', harga: 16000, kategori: 'Sayuran' },
      { sku: 'RST-007', nama: 'Tahu Tempe Bacem Komplit', harga: 14000, kategori: 'Sayuran' },
      { sku: 'RST-008', nama: 'Sambal Matah Kecombrang', harga: 8000, kategori: 'Sayuran' },
      { sku: 'RST-009', nama: 'Es Kelapa Muda Batok', harga: 18000, kategori: 'Minuman Segar' },
      { sku: 'RST-010', nama: 'Es Jeruk Nipis Murni', harga: 10000, kategori: 'Minuman Segar' },
      { sku: 'RST-011', nama: 'Jus Alpukat Kental', harga: 18000, kategori: 'Minuman Segar' },
    ],
    tables: [
      { nomor: 'Meja 01', zone: 'Ruang Utama', shape: 'square', capacity: 4, posX: 20, posY: 25 },
      { nomor: 'Meja 02', zone: 'Ruang Utama', shape: 'square', capacity: 4, posX: 50, posY: 25 },
      { nomor: 'Meja Panjang 03', zone: 'Ruang Utama', shape: 'rect', capacity: 6, posX: 80, posY: 25 },
      { nomor: 'Meja Bundar Tengah', zone: 'Ruang Utama', shape: 'round', capacity: 8, posX: 35, posY: 65 },
      { nomor: 'Saung Bambu 1', zone: 'Saung & Lesehan', shape: 'lesehan', capacity: 6, posX: 70, posY: 65 },
      { nomor: 'Saung Bambu 2', zone: 'Saung & Lesehan', shape: 'lesehan', capacity: 6, posX: 88, posY: 65 },
      { nomor: 'Ruang VIP Merah', zone: 'Ruang VIP', shape: 'rect', capacity: 10, posX: 25, posY: 85 },
      { nomor: 'Teras Depan Kolam', zone: 'Outdoor Kolam', shape: 'round', capacity: 4, posX: 60, posY: 85 },
    ]
  },

  kafe: {
    id: 'kafe',
    title: 'Kafe & Coffee Shop',
    subtitle: 'Coffee Bar, Kedai Teh, Pastry & Eatery',
    description: 'Modul kustomisasi susu/oatmilk, level gula, area Bar Stool, Sofa Jendela, dan area Outdoor Smoking.',
    storeName: 'Kopi Senja SakuNota',
    storeAddress: 'Jl. Senopati No. 42, Jakarta Selatan',
    storePhone: '0811-2233-4455',
    serviceMode: 'resto',
    receiptFooter: "Enjoy your good coffee & sweet moments\nInstagram: @kopisenja.sakunota",
    menus: [
      { sku: 'KFE-001', nama: 'Espresso Single Origin', harga: 18000, kategori: 'Espresso Bar' },
      {
        sku: 'KFE-002',
        nama: 'Americano (Ice)',
        harga: 22000,
        kategori: 'Espresso Bar',
        modifiers: [
          {
            id: 'mod-size-1',
            nama: 'Ukuran Cup',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            options: [
              { id: 'opt-sz-1', nama: 'Regular (12oz)', harga: 0 },
              { id: 'opt-sz-2', nama: 'Large (16oz)', harga: 4000 },
            ]
          }
        ]
      },
      {
        sku: 'KFE-003',
        nama: 'Caffe Latte Creamy',
        harga: 26000,
        kategori: 'Espresso Bar',
        modifiers: [
          {
            id: 'mod-milk-1',
            nama: 'Pilihan Susu',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            options: [
              { id: 'opt-mlk-1', nama: 'Fresh Milk', harga: 0 },
              { id: 'opt-mlk-2', nama: 'Oatmilk Premium', harga: 6000 },
              { id: 'opt-mlk-3', nama: 'Almond Milk', harga: 8000 },
            ]
          }
        ]
      },
      {
        sku: 'KFE-004',
        nama: 'Caramel Macchiato',
        harga: 30000,
        kategori: 'Espresso Bar',
        modifiers: [
          {
            id: 'mod-sugar-1',
            nama: 'Tingkat Kemanisan',
            required: true,
            minSelect: 1,
            maxSelect: 1,
            options: [
              { id: 'opt-sgr-1', nama: 'Normal Sweet', harga: 0 },
              { id: 'opt-sgr-2', nama: 'Less Sweet (50%)', harga: 0 },
              { id: 'opt-sgr-3', nama: 'No Added Sugar', harga: 0 },
            ]
          }
        ]
      },
      { sku: 'KFE-005', nama: 'Cold Brew Signature 12-Hour', harga: 28000, kategori: 'Espresso Bar' },
      { sku: 'KFE-006', nama: 'Matcha Latte Uji Kyoto', harga: 28000, kategori: 'Non-Kopi' },
      { sku: 'KFE-007', nama: 'Belgian Signature Chocolate', harga: 26000, kategori: 'Non-Kopi' },
      { sku: 'KFE-008', nama: 'Butter Croissant French Bakery', harga: 24000, kategori: 'Pastry & Cake' },
      { sku: 'KFE-009', nama: 'Basque Burnt Cheesecake', harga: 32000, kategori: 'Pastry & Cake' },
      { sku: 'KFE-010', nama: 'Truffle French Fries Parmesan', harga: 26000, kategori: 'Bites & Snacks' },
    ],
    tables: [
      { nomor: 'Sofa Pojok Jendela', zone: 'Indoor AC', shape: 'rect', capacity: 4, posX: 20, posY: 30 },
      { nomor: 'Meja Bulat 1', zone: 'Indoor AC', shape: 'round', capacity: 2, posX: 45, posY: 30 },
      { nomor: 'Meja Bulat 2', zone: 'Indoor AC', shape: 'round', capacity: 2, posX: 65, posY: 30 },
      { nomor: 'Meja Komunal Colokan', zone: 'Indoor AC', shape: 'rect', capacity: 6, posX: 40, posY: 65 },
      { nomor: 'Bar Seat 1', zone: 'Bar Counter', shape: 'bar', capacity: 1, posX: 85, posY: 20 },
      { nomor: 'Bar Seat 2', zone: 'Bar Counter', shape: 'bar', capacity: 1, posX: 85, posY: 45 },
      { nomor: 'Teras Depan A', zone: 'Outdoor Smoking', shape: 'square', capacity: 4, posX: 20, posY: 80 },
      { nomor: 'Teras Depan B', zone: 'Outdoor Smoking', shape: 'square', capacity: 4, posX: 65, posY: 80 },
    ]
  },

  retail: {
    id: 'retail',
    title: 'Toko & Retail',
    subtitle: 'Minimarket, Sembako, Kelontong & Toko Plastik',
    description: 'Scanning barcode EAN/UPC langsung dengan kamera/scanner fisik, pelacakan stok satuan, dan inventaris barang.',
    storeName: 'Minimarket Barokah SakuNota',
    storeAddress: 'Jl. Raya Pasar Minggu No. 12, Jakarta',
    storePhone: '0815-6789-0123',
    serviceMode: 'quick',
    receiptFooter: "Terima Kasih Telah Berbelanja\nBarang yang sudah dibeli tidak dapat ditukar kecuali perjanjian",
    menus: [
      {
        sku: 'RTL-001',
        nama: 'Minyak Goreng Bimoli Pouch 2L',
        harga: 36000,
        kategori: 'Sembako',
        barcode: '8991002200025',
        trackStock: true,
        stockQty: 45,
        stockUnit: 'Pouch'
      },
      {
        sku: 'RTL-002',
        nama: 'Beras Premium Ramos Setra 5kg',
        harga: 75000,
        kategori: 'Sembako',
        barcode: '8991001100012',
        trackStock: true,
        stockQty: 25,
        stockUnit: 'Karung'
      },
      {
        sku: 'RTL-003',
        nama: 'Gula Pasir Putih Kristal 1kg',
        harga: 17500,
        kategori: 'Sembako',
        barcode: '8991003300038',
        trackStock: true,
        stockQty: 60,
        stockUnit: 'Bungkus'
      },
      {
        sku: 'RTL-004',
        nama: 'Telur Ayam Negeri Fresh 1kg',
        harga: 28000,
        kategori: 'Sembako',
        barcode: '8991004400049',
        trackStock: true,
        stockQty: 30,
        stockUnit: 'Kg'
      },
      {
        sku: 'RTL-005',
        nama: 'Indomie Mie Instan Goreng Spesial',
        harga: 3500,
        kategori: 'Makanan Instan',
        barcode: '8998866200221',
        trackStock: true,
        stockQty: 120,
        stockUnit: 'Bungkus'
      },
      {
        sku: 'RTL-006',
        nama: 'Kopi Kapal Api Special Mix 165g',
        harga: 14000,
        kategori: 'Minuman Kemasan',
        barcode: '8991004400041',
        trackStock: true,
        stockQty: 35,
        stockUnit: 'Bungkus'
      },
      {
        sku: 'RTL-007',
        nama: 'Air Mineral Le Minerale Botol 600ml',
        harga: 4000,
        kategori: 'Minuman Kemasan',
        barcode: '8991005500054',
        trackStock: true,
        stockQty: 96,
        stockUnit: 'Botol'
      },
      {
        sku: 'RTL-008',
        nama: 'Sunlight Sabun Cuci Piring Jeruk 750ml',
        harga: 15000,
        kategori: 'Kebutuhan Rumah',
        barcode: '8991006600067',
        trackStock: true,
        stockQty: 40,
        stockUnit: 'Pouch'
      },
      {
        sku: 'RTL-009',
        nama: 'Lifebuoy Sabun Mandi Cair Total 10 450ml',
        harga: 22000,
        kategori: 'Kebutuhan Rumah',
        barcode: '8991007700070',
        trackStock: true,
        stockQty: 28,
        stockUnit: 'Pouch'
      },
      {
        sku: 'RTL-010',
        nama: 'Biskuit Roma Kelapa Gurih 300g',
        harga: 10500,
        kategori: 'Snack & Biskuit',
        barcode: '8991008800083',
        trackStock: true,
        stockQty: 50,
        stockUnit: 'Bungkus'
      },
    ],
    tables: [] // Tanpa meja
  }
};

/**
 * Menerapkan satu preset jenis usaha secara instan
 */
export async function applyBusinessDemoPreset(type: BusinessDemoType): Promise<{
  preset: BusinessDemoPreset;
  menuCount: number;
  tableCount: number;
}> {
  const preset = BUSINESS_DEMO_PRESETS[type] || BUSINESS_DEMO_PRESETS.warung;

  // 1. Simpan pengaturan toko
  const currentSettings = getStoreSettings();
  const updatedSettings: StoreSettings = {
    ...currentSettings,
    businessType: preset.id,
    serviceMode: preset.serviceMode,
    storeName: preset.storeName,
    storeAddress: preset.storeAddress,
    storePhone: preset.storePhone,
    receiptFooter: preset.receiptFooter,
    paperWidth: '58mm',
    onboardingCompleted: true,
  };
  saveStoreSettings(updatedSettings);

  // 2. Bersihkan & isi MenuItems
  await db.table('menuItems').clear();
  const menusToInsert = preset.menus.map((m, idx) => ({
    sku: m.sku || `SKU-${(idx + 1).toString().padStart(3, '0')}`,
    nama: m.nama,
    harga: m.harga,
    kategori: m.kategori,
    barcode: m.barcode || undefined,
    trackStock: Boolean(m.trackStock),
    stockQty: m.stockQty ?? 0,
    stockUnit: m.stockUnit || 'Pcs',
    minimumStock: 5,
    isSoldOut: false,
    urutan: idx + 1,
    modifiers: m.modifiers || []
  }));
  await db.table('menuItems').bulkAdd(menusToInsert);

  // 3. Bersihkan & isi Tables (dengan zone, shape, capacity, posX, posY)
  await db.table('tables').clear();
  let createdTableCount = 0;
  if (preset.tables && preset.tables.length > 0) {
    const tablesToInsert = preset.tables.map(t => ({
      nomor: t.nomor,
      status: 'kosong',
      zone: t.zone,
      shape: t.shape,
      capacity: t.capacity,
      posX: t.posX,
      posY: t.posY
    }));
    await db.table('tables').bulkAdd(tablesToInsert);
    createdTableCount = tablesToInsert.length;
  }

  // 4. Catat Audit Log
  try {
    await db.table('auditLogs').add({
      action: 'RESET',
      amount: 0,
      reason: `Memuat Preset Demo Usaha: ${preset.title} (${preset.menus.length} produk, ${createdTableCount} meja)`,
      operator: 'SakuNota Demo',
      timestamp: new Date().toISOString()
    });
  } catch (_) {}

  return {
    preset,
    menuCount: menusToInsert.length,
    tableCount: createdTableCount
  };
}
