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
  status: string; // 'kosong' | 'open' | 'lunas'
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
  subtotal?: number;
  discount?: number;
  discountType?: 'percent' | 'nominal';
  discountValue?: number;
  tax?: number;
  serviceCharge?: number;
  total: number;
  cashTendered?: number;
  change?: number;
  status: string; // 'paid' | 'unpaid' | 'void'
  voidReason?: string;
  voidedAt?: string;
  isRefunded?: boolean;
  refundAmount?: number;
  refundMethod?: string;
  customerName: string | null;
  customerPhone: string | null;
  paymentMethod: string;
  orderType: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[]; // Joined property
}

export interface AuditLog {
  id?: number;
  action: 'VOID' | 'REFUND' | 'DELETE' | 'RESET';
  orderId?: number;
  amount: number;
  reason: string;
  operator: string;
  refundMethod?: string;
  timestamp: string;
}

const db = new Dexie('AngkringanDB');
db.version(3).stores({
  menuItems: '++id, nama, kategori, isSoldOut, urutan',
  tables: '++id, nomor, status',
  orders: '++id, tableId, status, createdAt',
  orderItems: '++id, orderId, menuItemId',
  auditLogs: '++id, orderId, action, timestamp'
});

export { db };
