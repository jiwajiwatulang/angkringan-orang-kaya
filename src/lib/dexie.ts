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
  action: 'VOID' | 'REFUND' | 'DELETE' | 'RESET' | 'OPEN_SHIFT' | 'CLOSE_SHIFT' | 'CASH_IN' | 'CASH_OUT';
  orderId?: number;
  amount: number;
  reason: string;
  operator: string;
  refundMethod?: string;
  timestamp: string;
}

export interface Shift {
  id?: number;
  operatorName: string;
  startTime: string;
  endTime?: string;
  startingCash: number;       // Modal uang laci awal (misal Rp 200.000)
  cashSales: number;          // Total penjualan tunai selama shift
  nonCashSales: number;       // Total penjualan QRIS/Transfer selama shift
  cashRefunds: number;        // Total refund tunai selama shift
  cashIn: number;             // Total kas masuk manual
  cashOut: number;            // Total kas keluar manual
  expectedCash: number;       // startingCash + cashSales - cashRefunds + cashIn - cashOut
  actualCash?: number;        // Uang fisik yang dihitung kasir saat tutup shift
  cashDifference?: number;    // actualCash - expectedCash (0 = pas, minus = tekor, plus = lebih)
  status: 'open' | 'closed';
  notes?: string;
}

export interface CashMovement {
  id?: number;
  shiftId: number;
  type: 'in' | 'out';         // 'in' = kas masuk, 'out' = kas keluar
  amount: number;
  reason: string;
  operatorName: string;
  timestamp: string;
}

const db = new Dexie('AngkringanDB');
db.version(4).stores({
  menuItems: '++id, nama, kategori, isSoldOut, urutan',
  tables: '++id, nomor, status',
  orders: '++id, tableId, status, createdAt',
  orderItems: '++id, orderId, menuItemId',
  auditLogs: '++id, orderId, action, timestamp',
  shifts: '++id, status, startTime, operatorName',
  cashMovements: '++id, shiftId, type, timestamp'
});

export { db };
