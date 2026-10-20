import { Order, Payment, RefundEvent, CashMovement, OrderItem } from './dexie';

export type DashboardRange = 'today' | 'yesterday' | '7days' | '30days' | 'thisMonth';

export interface DateRangePeriod {
  start: Date;
  end: Date;
  previousStart?: Date;
  previousEnd?: Date;
}

export interface SalesMetrics {
  grossSales: number;           // Total harga sebelum diskon & retur
  totalDiscounts: number;       // Total diskon nota & promo
  salesRefunds: number;         // Pengurang penjualan atas retur/pembatalan menu riil
  netSales: number;             // grossSales - totalDiscounts - salesRefunds (di luar PB1)
  taxCollected: number;         // Titipan pajak PB1 (bukan omzet usaha)
  serviceCharge: number;        // Biaya layanan jika ada
  totalCOGS: number;            // Total HPP modal pokok barang
  grossProfit: number;          // netSales - totalCOGS
  profitMarginPercent: number;  // (grossProfit / netSales) * 100
  hasIncompleteCOGS: boolean;   // True jika ada produk yang belum memiliki data HPP
  cogsCoveragePercent: number;  // Persentase porsi/nilai penjualan yang memiliki data HPP
  orderCount: number;           // Jumlah transaksi sah pada periode
}

export interface PaymentMethodBreakdown {
  method: 'Cash' | 'QRIS' | 'Transfer' | 'Lainnya';
  grossAmount: number;
  refundAmount: number;
  netAmount: number;
  percentageOfTotal: number;
}

export interface CashDrawerSummary {
  startingCash: number;
  cashSalesGross: number;
  cashRefundsOut: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
}

export interface PaymentMetrics {
  grossPayments: number;        // Total seluruh dana masuk (semua metode)
  refundPayments: number;       // Total dana riil yang dikembalikan ke pelanggan
  netPayments: number;          // grossPayments - refundPayments
  methods: PaymentMethodBreakdown[];
  cashDrawer: CashDrawerSummary;
  paymentCount: number;
}

export interface ReconciliationStatus {
  status: 'VERIFIED' | 'UNRECONCILED';
  badgeLabel: 'Terverifikasi dari Ledger Transaksi' | 'Belum Dapat Direkonsiliasi';
  timingDifference: number;      // Selisih karena pembayaran/refund lintas tanggal
  openBillOutstanding: number;   // Saldo tagihan terbuka (nota aktif belum lunas)
  unexplainedDifference: number; // Selisih anomali yang tidak dapat dijelaskan ledger
  notes: string[];
}

export interface UnifiedFinancialReport {
  period: { start: string; end: string };
  sales: SalesMetrics;
  payments: PaymentMetrics;
  reconciliation: ReconciliationStatus;
}

/**
 * Filter data berdasarkan rentang waktu ISO string atau Date
 */
export function isWithinPeriod(dateVal: string | Date | undefined, start: Date, end: Date): boolean {
  if (!dateVal) return false;
  const t = typeof dateVal === 'string' ? new Date(dateVal).getTime() : dateVal.getTime();
  return Number.isFinite(t) && t >= start.getTime() && t < end.getTime();
}

/**
 * 1. Menghitung Sales & Accrual Ledger (Pengakuan Penjualan)
 */
export function computeSalesMetrics(
  orders: Order[],
  refundEvents: RefundEvent[] = [],
  period?: { start: Date; end: Date }
): SalesMetrics {
  const filteredOrders = period
    ? orders.filter(o => isWithinPeriod(o.createdAt, period.start, period.end))
    : orders;

  let grossSales = 0;
  let totalDiscounts = 0;
  let taxCollected = 0;
  let serviceCharge = 0;
  let totalCOGS = 0;
  let hasIncompleteCOGS = false;
  let totalItemsWithCOGS = 0;
  let totalItemsCount = 0;
  let validOrderCount = 0;

  for (const order of filteredOrders) {
    if (order.status === 'void') continue;
    validOrderCount++;

    const subtotal = Number(order.subtotal);
    const total = Number(order.total) || 0;
    const discount = Number(order.discount) || 0;
    const tax = Number(order.tax) || 0;
    const sc = Number(order.serviceCharge) || 0;

    // Gross Sales sebelum diskon dan pajak
    let orderGross = 0;
    if (Number.isFinite(subtotal) && subtotal > 0) {
      orderGross = subtotal;
    } else {
      orderGross = Math.max(0, total + discount - tax - sc);
    }

    grossSales += orderGross;
    totalDiscounts += discount;
    taxCollected += tax;
    serviceCharge += sc;

    // Hitung HPP dari orderItems jika tersedia
    if (order.items && order.items.length > 0) {
      for (const item of order.items) {
        totalItemsCount += item.qty;
        const itemCost = (item as any).costPrice ?? (item.menuItem as any)?.costPrice;
        if (typeof itemCost === 'number' && Number.isFinite(itemCost) && itemCost >= 0) {
          totalCOGS += itemCost * item.qty;
          totalItemsWithCOGS += item.qty;
        } else {
          hasIncompleteCOGS = true;
        }
      }
    } else {
      // Jika order tidak memiliki rincian items, tandai data modal belum lengkap
      hasIncompleteCOGS = true;
    }
  }

  // Hitung retur penjualan (hanya event bertipe pengembalian barang atau pembatalan order)
  const salesRefundEvents = refundEvents.filter(r => {
    const isSalesRefundType = r.type === 'ITEM_RETURN' || r.type === 'ORDER_CANCELED';
    if (!isSalesRefundType) return false;
    if (period) return isWithinPeriod(r.createdAt, period.start, period.end);
    return true;
  });

  const salesRefunds = salesRefundEvents.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Penjualan Bersih = Gross Sales - Diskon - Retur Penjualan (di luar titipan PB1)
  const netSales = Math.max(0, grossSales - totalDiscounts - salesRefunds);

  // Laba Kotor = Penjualan Bersih - Total HPP
  const grossProfit = netSales - totalCOGS;
  const profitMarginPercent = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(2)) : 0;
  const cogsCoveragePercent = totalItemsCount > 0 ? Number(((totalItemsWithCOGS / totalItemsCount) * 100).toFixed(1)) : (validOrderCount > 0 && !hasIncompleteCOGS ? 100 : 0);

  return {
    grossSales,
    totalDiscounts,
    salesRefunds,
    netSales,
    taxCollected,
    serviceCharge,
    totalCOGS,
    grossProfit,
    profitMarginPercent,
    hasIncompleteCOGS,
    cogsCoveragePercent,
    orderCount: validOrderCount
  };
}

/**
 * 2. Menghitung Payment & Cash Ledger (Arus Penerimaan Dana)
 */
export function computePaymentMetrics(
  payments: Payment[],
  refundEvents: RefundEvent[] = [],
  cashMovements: CashMovement[] = [],
  startingCash = 0,
  period?: { start: Date; end: Date }
): PaymentMetrics {
  const filteredPayments = period
    ? payments.filter(p => isWithinPeriod(p.paidAt, period.start, period.end))
    : payments;

  const filteredRefunds = period
    ? refundEvents.filter(r => isWithinPeriod(r.createdAt, period.start, period.end))
    : refundEvents;

  const filteredMovements = period
    ? cashMovements.filter(m => isWithinPeriod(m.timestamp, period.start, period.end))
    : cashMovements;

  // Hitung Penerimaan Pembayaran Bruto dari seluruh pembayaran yang sah
  const grossPayments = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  // Hitung Pengeluaran Refund Kas/Digital
  const refundPayments = filteredRefunds.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

  // Penerimaan Pembayaran Netto
  const netPayments = grossPayments - refundPayments;

  // Rincian per Metode Pembayaran (Tanpa Kompensasi Silang)
  const standardMethods: ('Cash' | 'QRIS' | 'Transfer')[] = ['Cash', 'QRIS', 'Transfer'];
  const methods: PaymentMethodBreakdown[] = standardMethods.map(method => {
    const gross = filteredPayments
      .filter(p => p.paymentMethod === method)
      .reduce((s, p) => s + (Number(p.amount) || 0), 0);

    const refund = filteredRefunds
      .filter(r => r.method === method)
      .reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const net = gross - refund;
    const percentageOfTotal = netPayments > 0 ? Number(((net / netPayments) * 100).toFixed(1)) : 0;

    return {
      method,
      grossAmount: gross,
      refundAmount: refund,
      netAmount: net,
      percentageOfTotal
    };
  });

  // Tambahkan metode Lainnya jika ada transaksi non-standar
  const otherGross = filteredPayments
    .filter(p => !standardMethods.includes(p.paymentMethod as any))
    .reduce((s, p) => s + (Number(p.amount) || 0), 0);

  const otherRefund = filteredRefunds
    .filter(r => !standardMethods.includes(r.method as any))
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);

  if (otherGross > 0 || otherRefund > 0) {
    const net = otherGross - otherRefund;
    methods.push({
      method: 'Lainnya',
      grossAmount: otherGross,
      refundAmount: otherRefund,
      netAmount: net,
      percentageOfTotal: netPayments > 0 ? Number(((net / netPayments) * 100).toFixed(1)) : 0
    });
  }

  // Kas Laci Fisik (Cash Drawer)
  const cashMethod = methods.find(m => m.method === 'Cash');
  const cashSalesGross = cashMethod?.grossAmount || 0;
  const cashRefundsOut = cashMethod?.refundAmount || 0;

  const cashIn = filteredMovements
    .filter(m => m.type === 'in')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const cashOut = filteredMovements
    .filter(m => m.type === 'out')
    .reduce((sum, m) => sum + (Number(m.amount) || 0), 0);

  const expectedCash = startingCash + cashSalesGross - cashRefundsOut + cashIn - cashOut;

  return {
    grossPayments,
    refundPayments,
    netPayments,
    methods,
    cashDrawer: {
      startingCash,
      cashSalesGross,
      cashRefundsOut,
      cashIn,
      cashOut,
      expectedCash
    },
    paymentCount: filteredPayments.length
  };
}

/**
 * 3. Menghitung Rekonsiliasi & Jembatan Perbedaan (Sales vs Payments Bridge)
 */
export function computeReconciliation(
  sales: SalesMetrics,
  payments: PaymentMetrics,
  orders: Order[] = [],
  refundEvents: RefundEvent[] = [],
  period?: { start: Date; end: Date }
): ReconciliationStatus {
  const notes: string[] = [];
  let isIntegrityVerified = true;

  // 1. Validasi Integritas Granular Event Ledger
  const seenIdempotencyKeys = new Set<string>();
  for (const r of refundEvents) {
    if (!r.idempotencyKey || seenIdempotencyKeys.has(r.idempotencyKey)) {
      isIntegrityVerified = false;
      notes.push('Ditemukan event refund tanpa kunci unik atau duplikat.');
      break;
    }
    seenIdempotencyKeys.add(r.idempotencyKey);

    if (typeof r.amount !== 'number' || !Number.isFinite(r.amount) || r.amount <= 0) {
      isIntegrityVerified = false;
      notes.push(`Ditemukan event refund #${r.id} dengan nominal tidak valid.`);
      break;
    }
    if (!r.createdAt || isNaN(new Date(r.createdAt).getTime())) {
      isIntegrityVerified = false;
      notes.push(`Ditemukan event refund #${r.id} dengan timestamp tidak valid.`);
      break;
    }
  }

  // 2. Saldo Tagihan Terbuka (Open Bill Outstanding)
  // Menghitung seluruh nota aktif yang memiliki sisa tagihan belum lunas
  const openBills = orders.filter(o => o.status === 'unpaid' && (o.remainingBalance || 0) > 0);
  const openBillOutstanding = openBills.reduce((sum, o) => sum + (Number(o.remainingBalance) || 0), 0);

  if (openBillOutstanding > 0) {
    notes.push(`Saldo tagihan terbuka aktif (Open Bill): Rp ${openBillOutstanding.toLocaleString('id-ID')}.`);
  }

  // 3. Timing Difference (Perbedaan Waktu Transaksi vs Arus Kas)
  // Contoh: Refund yang terjadi pada periode ini untuk transaksi yang dibuat sebelum periode ini
  let timingDifference = 0;
  if (period) {
    const crossPeriodRefunds = refundEvents.filter(r => {
      const isRefundInPeriod = isWithinPeriod(r.createdAt, period.start, period.end);
      if (!isRefundInPeriod) return false;
      const parentOrder = orders.find(o => o.id === r.orderId);
      if (!parentOrder || !parentOrder.createdAt) return false;
      const isOrderBeforePeriod = new Date(parentOrder.createdAt).getTime() < period.start.getTime();
      return isOrderBeforePeriod;
    });

    timingDifference = crossPeriodRefunds.reduce((sum, r) => sum + r.amount, 0);
    if (timingDifference > 0) {
      notes.push(`Refund atas transaksi periode sebelumnya: Rp ${timingDifference.toLocaleString('id-ID')}.`);
    }
  }

  // 4. Jembatan Rekonsiliasi Matematis:
  // Penjualan Bersih (netSales) + Pajak (taxCollected) vs Penerimaan Pembayaran Netto (netPayments)
  // Perbedaan sah berasal dari: (Open Bill baru periode ini) dan (Timing Difference refund masa lalu)
  const effectiveExpectedSalesCash = sales.netSales + sales.taxCollected;
  
  // Selisih mentah antara omzet bertagihan dengan uang bersih yang masuk
  const delta = effectiveExpectedSalesCash - payments.netPayments;

  // Selisih anomali yang belum teridentifikasi ledger
  const unexplainedDifference = Math.abs(delta - (openBillOutstanding - timingDifference));

  if (unexplainedDifference > 1) {
    // Toleransi pembulatan pecahan Rp 1
    notes.push(`Terdapat selisih kas belum terpetakan senilai Rp ${unexplainedDifference.toLocaleString('id-ID')}.`);
    isIntegrityVerified = false;
  }

  const isVerified = isIntegrityVerified && unexplainedDifference <= 1;

  return {
    status: isVerified ? 'VERIFIED' : 'UNRECONCILED',
    badgeLabel: isVerified ? 'Terverifikasi dari Ledger Transaksi' : 'Belum Dapat Direkonsiliasi',
    timingDifference,
    openBillOutstanding,
    unexplainedDifference,
    notes
  };
}

/**
 * 4. Fungsi Utama Komprehensif: Menghasilkan Laporan Finansial Lengkap
 */
export function computeFinancialDashboard(params: {
  orders: Order[];
  payments: Payment[];
  refundEvents?: RefundEvent[];
  cashMovements?: CashMovement[];
  startingCash?: number;
  period?: { start: Date; end: Date };
}): UnifiedFinancialReport {
  const refunds = params.refundEvents || [];
  const movements = params.cashMovements || [];
  const startCash = params.startingCash || 0;

  const sales = computeSalesMetrics(params.orders, refunds, params.period);
  const payments = computePaymentMetrics(params.payments, refunds, movements, startCash, params.period);
  const reconciliation = computeReconciliation(sales, payments, params.orders, refunds, params.period);

  return {
    period: {
      start: params.period ? params.period.start.toISOString() : new Date(0).toISOString(),
      end: params.period ? params.period.end.toISOString() : new Date().toISOString()
    },
    sales,
    payments,
    reconciliation
  };
}
