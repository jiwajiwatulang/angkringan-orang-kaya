import Dexie, { type Table as DexieTable } from 'dexie';

export interface MenuItem {
  id?: number;
  nama: string;
  harga: number;
  kategori: string;
  isSoldOut: boolean;
  urutan: number;
}

export interface Table {
  id?: number;
  nomor: string;
  status: string; // 'kosong' | 'terisi'
}

export interface OrderItem {
  id?: number;
  orderId: number;
  menuItemId: number;
  qty: number;
  hargaSatuan: number;
  menuItem?: MenuItem; // Joined property
}

export interface Order {
  id?: number;
  tableId: number | null;
  total: number;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: string;
  orderType: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[]; // Joined property
}

const db = new Dexie('AngkringanDB');
db.version(2).stores({
  menuItems: '++id, nama, kategori, isSoldOut, urutan',
  tables: '++id, nomor, status',
  orders: '++id, tableId, status, createdAt',
  orderItems: '++id, orderId, menuItemId'
});

export { db };
