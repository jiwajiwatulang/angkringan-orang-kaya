import Dexie, { type Table as DexieTable } from 'dexie';

export interface ModifierOption {
  id: string;
  nama: string;
  harga: number; // 0 jika gratis / normal, >0 jika berbayar (+Extra)
}

export interface ModifierGroup {
  id: string;
  nama: string; // contoh: "Level Pedas", "Topping Tambahan", "Pilihan Es", "Ukuran"
  required: boolean;
  minSelect: number;
  maxSelect: number; // 1 untuk single choice (radio), >1 untuk multi choice (checkbox)
  options: ModifierOption[];
}

export interface MenuItem {
  id?: number;
  nama: string;
  harga: number;
  kategori: string;
  isSoldOut: boolean;
  urutan: number;
  modifiers?: ModifierGroup[]; // Add-on & modifier menu
}

export interface Table {
  id?: number;
  nomor: string;
  status: string; // 'kosong' | 'open' | 'lunas'
}

export interface SelectedModifier {
  groupName: string;
  optionName: string;
  harga: number;
}

export interface OrderItem {
  id?: number;
  orderId: number;
  menuItemId: number;
  namaMenu?: string;     // Snapshot nama menu saat transaksi (immutable)
  kategoriMenu?: string; // Snapshot kategori menu saat transaksi
  qty: number;
  paidQty?: number;      // Jumlah porsi yang sudah terbayar via Split by Item
  hargaSatuan: number;   // Snapshot harga dasar satuan
  selectedModifiers?: SelectedModifier[]; // Snapshot catatan add-on terpilih
  menuItem?: MenuItem;   // Joined property (backward compatibility)
}

export interface Payment {
  id?: number;
  orderId: number;
  shiftId?: number | null;
  paymentMethod: 'Cash' | 'QRIS' | 'Transfer';
  amount: number;
  cashTendered?: number;
  change?: number;
  splitType: 'full' | 'item' | 'equal' | 'partial';
  itemsPaid?: { menuItemId: number; itemKey?: string; nama: string; qty: number; harga: number }[];
  paidAt: string;
  operatorName: string;
  notes?: string;
  status: 'completed' | 'refunded';
  refundReason?: string;
  refundedAt?: string;
  refundOperator?: string;
}

export interface Order {
  id?: number;
  shiftId?: number | null; // Terikat langsung ke sesi Shift kasir
  idempotencyKey?: string; // Mencegah double-order / duplicate charge
  tableId: number | null;
  subtotal?: number;
  discount?: number;
  discountType?: 'percent' | 'nominal';
  discountValue?: number;
  tax?: number;
  serviceCharge?: number;
  total: number;
  paidAmount?: number;       // Akumulasi total yang sudah terbayar
  remainingBalance?: number; // Sisa tagihan yang belum terbayar (total - paidAmount)
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
  payments?: Payment[]; // Joined property
}

export interface AuditLog {
  id?: number;
  action: 'VOID' | 'REFUND' | 'DELETE' | 'RESET' | 'OPEN_SHIFT' | 'CLOSE_SHIFT' | 'CASH_IN' | 'CASH_OUT' | 'PARTIAL_PAYMENT' | 'PARTIAL_REFUND';
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
  cashSales: number;          // Total penjualan tunai murni selama shift
  nonCashSales: number;       // Total penjualan QRIS/Transfer (tercatat terpisah, tidak masuk laci)
  cashRefunds: number;        // Total refund tunai selama shift
  cashIn: number;             // Total kas masuk manual
  cashOut: number;            // Total kas keluar manual (biaya es batu, gas, dll)
  expectedCash: number;       // startingCash + cashSales - cashRefunds + cashIn - cashOut
  actualCash?: number;        // Uang fisik yang dihitung kasir saat tutup shift (Blind Close)
  cashDifference?: number;    // actualCash - expectedCash (0 = pas, minus = tekor, plus = lebih)
  status: 'open' | 'closed';
  notes?: string;
}

export interface CashMovement {
  id?: number;
  shiftId: number;
  type: 'in' | 'out';         // 'in' = kas masuk, 'out' = kas keluar (biaya operasional)
  amount: number;
  reason: string;
  operatorName: string;
  timestamp: string;
}

const db = new Dexie('AngkringanDB');
db.version(5).stores({
  menuItems: '++id, nama, kategori, isSoldOut, urutan',
  tables: '++id, nomor, status',
  orders: '++id, shiftId, idempotencyKey, tableId, status, createdAt',
  orderItems: '++id, orderId, menuItemId',
  auditLogs: '++id, orderId, action, timestamp',
  shifts: '++id, status, startTime, operatorName',
  cashMovements: '++id, shiftId, type, timestamp'
});

db.version(6).stores({
  menuItems: '++id, nama, kategori, isSoldOut, urutan',
  tables: '++id, nomor, status',
  orders: '++id, shiftId, idempotencyKey, tableId, status, createdAt',
  orderItems: '++id, orderId, menuItemId',
  payments: '++id, orderId, shiftId, paymentMethod, status, paidAt',
  auditLogs: '++id, orderId, action, timestamp',
  shifts: '++id, status, startTime, operatorName',
  cashMovements: '++id, shiftId, type, timestamp'
}).upgrade(async tx => {
  const orders = await tx.table('orders').toArray();
  const existingPayments: any[] = [];
  for (const o of orders) {
    if (o.status === 'paid' && o.total > 0) {
      existingPayments.push({
        orderId: o.id,
        shiftId: o.shiftId || null,
        paymentMethod: o.paymentMethod || 'Cash',
        amount: o.total,
        cashTendered: o.cashTendered || o.total,
        change: o.change || 0,
        splitType: 'full',
        paidAt: o.createdAt || new Date().toISOString(),
        operatorName: 'Kasir',
        status: o.isRefunded ? 'refunded' : 'completed',
        notes: o.notes || 'Pembayaran Penuh'
      });
    }
  }
  if (existingPayments.length > 0) {
    await tx.table('payments').bulkAdd(existingPayments);
  }
});

export { db };
