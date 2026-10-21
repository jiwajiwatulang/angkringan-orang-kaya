import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeSalesMetrics,
  computePaymentMetrics,
  computeReconciliation,
  computeFinancialDashboard
} from '../src/lib/financialEngine';
import { Order, Payment, RefundEvent, CashMovement } from '../src/lib/dexie';

test('Tahap 2: Centralized Financial Metrics Engine & Golden Test Suite (GT-01 to GT-10)', async (t) => {

  await t.test('GT-01: Transaksi Tunai Normal', () => {
    // Tagihan Rp 46.000, dibayar Tunai Rp 46.000
    const orders: Order[] = [{
      id: 1,
      total: 46000,
      subtotal: 46000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan 1',
      paymentMethod: 'Cash',
      orderType: 'dine_in',
      createdAt: '2026-10-21T10:00:00.000Z',
      updatedAt: '2026-10-21T10:00:00.000Z',
      tableId: 1
    }];

    const payments: Payment[] = [{
      id: 1,
      orderId: 1,
      paymentMethod: 'Cash',
      amount: 46000,
      splitType: 'full',
      paidAt: '2026-10-21T10:00:00.000Z',
      operatorName: 'Kasir 1',
      status: 'completed'
    }];

    const sales = computeSalesMetrics(orders, []);
    const paymentsMetric = computePaymentMetrics(payments, [], [], 100000);
    const reco = computeReconciliation(sales, paymentsMetric, orders, []);

    assert.strictEqual(sales.netSales, 46000, 'Penjualan Bersih harus Rp 46.000');
    assert.strictEqual(paymentsMetric.grossPayments, 46000, 'Penerimaan Bruto harus Rp 46.000');
    assert.strictEqual(paymentsMetric.refundPayments, 0, 'Refund Pembayaran harus Rp 0');
    assert.strictEqual(paymentsMetric.netPayments, 46000, 'Penerimaan Netto harus Rp 46.000');
    assert.strictEqual(paymentsMetric.cashDrawer.cashSalesGross, 46000, 'Kas Tunai masuk harus Rp 46.000');
    assert.strictEqual(paymentsMetric.cashDrawer.expectedCash, 146000, 'Expected cash: Modal awal 100k + 46k = 146k');
    assert.strictEqual(reco.status, 'VERIFIED', 'Rekonsiliasi harus terverifikasi');
    assert.strictEqual(reco.badgeLabel, 'Terverifikasi dari Ledger Transaksi');
  });

  await t.test('GT-02: Tunai Lebih (Kembalian Kas)', () => {
    // Tagihan Rp 46.000, diserahkan Rp 100.000, kembalian Rp 54.000
    const orders: Order[] = [{
      id: 2,
      total: 46000,
      subtotal: 46000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan 2',
      paymentMethod: 'Cash',
      orderType: 'takeaway',
      createdAt: '2026-10-21T10:15:00.000Z',
      updatedAt: '2026-10-21T10:15:00.000Z',
      tableId: null
    }];

    const payments: Payment[] = [{
      id: 2,
      orderId: 2,
      paymentMethod: 'Cash',
      amount: 46000,
      cashTendered: 100000,
      change: 54000,
      splitType: 'full',
      paidAt: '2026-10-21T10:15:00.000Z',
      operatorName: 'Kasir 1',
      status: 'completed'
    }];

    const sales = computeSalesMetrics(orders, []);
    const paymentsMetric = computePaymentMetrics(payments, [], []);
    const reco = computeReconciliation(sales, paymentsMetric, orders, []);

    assert.strictEqual(sales.netSales, 46000, 'Penjualan Bersih adalah nilai tagihan asli (Rp 46.000)');
    assert.strictEqual(paymentsMetric.grossPayments, 46000, 'Penerimaan Pembayaran adalah Rp 46.000 (bukan Rp 100.000)');
    assert.strictEqual(paymentsMetric.netPayments, 46000);
    assert.strictEqual(reco.status, 'VERIFIED');
  });

  await t.test('GT-03: Split Payment (Tunai + QRIS)', () => {
    // Tagihan Rp 100.000 dibayar Tunai Rp 40.000 + QRIS Rp 60.000
    const orders: Order[] = [{
      id: 3,
      total: 100000,
      subtotal: 100000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan Split',
      paymentMethod: 'Cash',
      orderType: 'dine_in',
      createdAt: '2026-10-21T11:00:00.000Z',
      updatedAt: '2026-10-21T11:00:00.000Z',
      tableId: 2
    }];

    const payments: Payment[] = [
      {
        id: 31,
        orderId: 3,
        paymentMethod: 'Cash',
        amount: 40000,
        splitType: 'partial',
        paidAt: '2026-10-21T11:00:00.000Z',
        operatorName: 'Kasir 1',
        status: 'completed'
      },
      {
        id: 32,
        orderId: 3,
        paymentMethod: 'QRIS',
        amount: 60000,
        splitType: 'partial',
        paidAt: '2026-10-21T11:01:00.000Z',
        operatorName: 'Kasir 1',
        status: 'completed'
      }
    ];

    const sales = computeSalesMetrics(orders, []);
    const paymentsMetric = computePaymentMetrics(payments, [], []);
    const reco = computeReconciliation(sales, paymentsMetric, orders, []);

    assert.strictEqual(sales.netSales, 100000, 'Omzet penjualan bersih tetap Rp 100.000 (tidak mengganda)');
    assert.strictEqual(sales.orderCount, 1, 'Hanya dihitung 1 nota');
    assert.strictEqual(paymentsMetric.netPayments, 100000, 'Total penerimaan bersih Rp 100.000');

    const cashMethod = paymentsMetric.methods.find(m => m.method === 'Cash');
    const qrisMethod = paymentsMetric.methods.find(m => m.method === 'QRIS');

    assert.strictEqual(cashMethod?.netAmount, 40000, 'Penerimaan Tunai Bersih Rp 40.000');
    assert.strictEqual(qrisMethod?.netAmount, 60000, 'Penerimaan QRIS Bersih Rp 60.000');
    assert.strictEqual(reco.status, 'VERIFIED');
  });

  await t.test('GT-04: DP / Partial Payment & Open Bill', () => {
    // Order Rp 100.000 dibayar DP Tunai Rp 50.000. Sisa tagihan Rp 50.000.
    const orders: Order[] = [{
      id: 4,
      total: 100000,
      subtotal: 100000,
      paidAmount: 50000,
      remainingBalance: 50000,
      status: 'unpaid',
      customerPhone: null, customerName: 'Pelanggan DP',
      paymentMethod: 'Cash',
      orderType: 'dine_in',
      createdAt: '2026-10-21T12:00:00.000Z',
      updatedAt: '2026-10-21T12:00:00.000Z',
      tableId: 3
    }];

    const payments: Payment[] = [{
      id: 41,
      orderId: 4,
      paymentMethod: 'Cash',
      amount: 50000,
      splitType: 'partial',
      paidAt: '2026-10-21T12:00:00.000Z',
      operatorName: 'Kasir 1',
      status: 'completed'
    }];

    const sales = computeSalesMetrics(orders, []);
    const paymentsMetric = computePaymentMetrics(payments, [], []);
    const reco = computeReconciliation(sales, paymentsMetric, orders, []);

    assert.strictEqual(paymentsMetric.netPayments, 50000, 'Penerimaan kas hanya sebesar DP Rp 50.000');
    assert.strictEqual(reco.openBillOutstanding, 50000, 'Sisa tagihan Rp 50.000 tercatat di Open Bill');
    assert.strictEqual(reco.unexplainedDifference, 0, 'Selisih Rp 50.000 terjelaskan oleh saldo Open Bill');
    assert.strictEqual(reco.status, 'VERIFIED');
  });

  await t.test('GT-05: Partial Refund Tunai atas Retur Menu', () => {
    // Tagihan Rp 100.000 dibayar Rp 100.000. Lalu direfund Rp 30.000 karena retur 1 item.
    // Setelah retur disetujui, omzet bersih menjadi Rp 70.000 dan kas bersih Rp 70.000 (lunas).
    const orders: Order[] = [{
      id: 5,
      total: 70000,
      subtotal: 100000,
      paidAmount: 70000,
      remainingBalance: 0,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan Retur',
      paymentMethod: 'Cash',
      orderType: 'dine_in',
      createdAt: '2026-10-21T13:00:00.000Z',
      updatedAt: '2026-10-21T13:30:00.000Z',
      tableId: 4
    }];

    const payments: Payment[] = [{
      id: 51,
      orderId: 5,
      paymentMethod: 'Cash',
      amount: 100000,
      refundedAmount: 30000,
      status: 'partially_refunded',
      paidAt: '2026-10-21T13:00:00.000Z',
      operatorName: 'Kasir 1',
      splitType: 'full'
    }];

    const refundEvents: RefundEvent[] = [{
      id: 1,
      idempotencyKey: 'IDEM-REF-GT05',
      orderId: 5,
      paymentId: 51,
      shiftId: 1,
      type: 'ITEM_RETURN',
      amount: 30000,
      method: 'Cash',
      reason: 'Retur 1 porsi rusak',
      operatorName: 'Admin',
      createdAt: '2026-10-21T13:30:00.000Z'
    }];

    const sales = computeSalesMetrics(orders, refundEvents);
    const paymentsMetric = computePaymentMetrics(payments, refundEvents);
    const reco = computeReconciliation(sales, paymentsMetric, orders, refundEvents);

    assert.strictEqual(sales.salesRefunds, 30000, 'Retur penjualan Rp 30.000 tercatat');
    assert.strictEqual(sales.netSales, 70000, 'Penjualan Bersih berkurang menjadi Rp 70.000');
    assert.strictEqual(paymentsMetric.grossPayments, 100000, 'Penerimaan bruto Rp 100.000');
    assert.strictEqual(paymentsMetric.refundPayments, 30000, 'Refund kas keluar Rp 30.000');
    assert.strictEqual(paymentsMetric.netPayments, 70000, 'Penerimaan netto kasir Rp 70.000');
    assert.strictEqual(reco.status, 'VERIFIED');
  });

  await t.test('GT-06: Refund Lintas Shift / Tanggal (Shift Immutability)', () => {
    // Transaksi kemarin (Day 1) Rp 100.000. Hari ini (Day 2) direfund Rp 30.000.
    const day1Period = {
      start: new Date('2026-10-19T00:00:00.000Z'),
      end: new Date('2026-10-20T00:00:00.000Z')
    };

    const day2Period = {
      start: new Date('2026-10-20T00:00:00.000Z'),
      end: new Date('2026-10-21T00:00:00.000Z')
    };

    const orderDay1: Order = {
      id: 6,
      total: 100000,
      subtotal: 100000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan Day 1',
      paymentMethod: 'Cash',
      orderType: 'dine_in',
      createdAt: '2026-10-19T14:00:00.000Z',
      updatedAt: '2026-10-19T14:00:00.000Z',
      tableId: 5
    };

    const paymentDay1: Payment = {
      id: 61,
      orderId: 6,
      paymentMethod: 'Cash',
      amount: 100000,
      status: 'partially_refunded',
      refundedAmount: 30000,
      paidAt: '2026-10-19T14:00:00.000Z',
      operatorName: 'Kasir Day 1',
      splitType: 'full'
    };

    const refundDay2: RefundEvent = {
      id: 2,
      idempotencyKey: 'IDEM-REF-GT06',
      orderId: 6,
      paymentId: 61,
      shiftId: 2,
      type: 'ITEM_RETURN',
      amount: 30000,
      method: 'Cash',
      reason: 'Retur kemarin direfund hari ini',
      operatorName: 'Admin',
      createdAt: '2026-10-20T09:00:00.000Z' // Day 2
    };

    // 1. Evaluasi Laporan Day 1: Laporan Day 1 TETAP UTUH Rp 100.000
    const salesDay1 = computeSalesMetrics([orderDay1], [refundDay2], day1Period);
    const paymentsDay1 = computePaymentMetrics([paymentDay1], [refundDay2], [], 0, day1Period);

    assert.strictEqual(salesDay1.netSales, 100000, 'Laporan Day 1 tetap membukukan Penjualan Bersih Rp 100.000');
    assert.strictEqual(paymentsDay1.netPayments, 100000, 'Laporan Day 1 tetap membukukan Kas Diterima Rp 100.000');
    assert.strictEqual(paymentsDay1.refundPayments, 0, 'Day 1 tidak ada refund keluar');

    // 2. Evaluasi Laporan Day 2: Mencatat arus kas keluar Rp 30.000
    const salesDay2 = computeSalesMetrics([orderDay1], [refundDay2], day2Period);
    const paymentsDay2 = computePaymentMetrics([paymentDay1], [refundDay2], [], 150000, day2Period);
    const recoDay2 = computeReconciliation(salesDay2, paymentsDay2, [orderDay1], [refundDay2], day2Period);

    assert.strictEqual(salesDay2.salesRefunds, 30000, 'Retur diakui di Day 2');
    assert.strictEqual(paymentsDay2.refundPayments, 30000, 'Refund kas keluar Rp 30.000 di Day 2');
    assert.strictEqual(paymentsDay2.cashDrawer.expectedCash, 120000, 'Kas Day 2: Modal 150k - Refund 30k = 120k');
    assert.strictEqual(recoDay2.timingDifference, 30000, 'Timing difference refund masa lalu terdeteksi');
  });

  await t.test('GT-07: Diskon & Pajak Restoran (PB1)', () => {
    // Subtotal Rp 100.000, Diskon Rp 10.000, PB1 (10%) Rp 9.000. Total bayar: Rp 99.000.
    const orders: Order[] = [{
      id: 7,
      subtotal: 100000,
      discount: 10000,
      tax: 9000,
      total: 99000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan PB1',
      paymentMethod: 'QRIS',
      orderType: 'dine_in',
      createdAt: '2026-10-21T15:00:00.000Z',
      updatedAt: '2026-10-21T15:00:00.000Z',
      tableId: 6
    }];

    const payments: Payment[] = [{
      id: 71,
      orderId: 7,
      paymentMethod: 'QRIS',
      amount: 99000,
      splitType: 'full',
      paidAt: '2026-10-21T15:00:00.000Z',
      operatorName: 'Kasir 1',
      status: 'completed'
    }];

    const sales = computeSalesMetrics(orders, []);
    const paymentsMetric = computePaymentMetrics(payments, [], []);
    const reco = computeReconciliation(sales, paymentsMetric, orders, []);

    assert.strictEqual(sales.grossSales, 100000, 'Gross sales Rp 100.000');
    assert.strictEqual(sales.totalDiscounts, 10000, 'Diskon Rp 10.000');
    assert.strictEqual(sales.taxCollected, 9000, 'PB1 Rp 9.000 dicatat sebagai titipan pajak');
    assert.strictEqual(sales.netSales, 90000, 'Penjualan Bersih adalah Rp 90.000 (tidak memasukkan pajak)');
    assert.strictEqual(paymentsMetric.netPayments, 99000, 'Penerimaan dana kasir Rp 99.000');
    assert.strictEqual(reco.status, 'VERIFIED', 'Rekonsiliasi harus verifikasi omzet + PB1 == penerimaan');
  });

  await t.test('GT-08: Transaksi Historis Tanpa HPP', () => {
    // Order lama tanpa field costPrice
    const orders: Order[] = [{
      id: 8,
      total: 50000,
      subtotal: 50000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan Lama',
      paymentMethod: 'Cash',
      orderType: 'takeaway',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-01T10:00:00.000Z',
      tableId: null,
      items: [
        {
          orderId: 8,
          menuItemId: 999,
          namaMenu: 'Menu Warisan Lama',
          qty: 2,
          hargaSatuan: 25000
          // costPrice tidak tersedia
        }
      ]
    }];

    const sales = computeSalesMetrics(orders, []);
    assert.strictEqual(sales.netSales, 50000, 'Penjualan Bersih tetap Rp 50.000');
    assert.strictEqual(sales.hasIncompleteCOGS, true, 'Sistem menandai data modal belum lengkap');
    assert.strictEqual(sales.cogsCoveragePercent, 0, 'Cakupan data HPP adalah 0%');
  });

  await t.test('GT-09: Net per Metode Pembayaran & Larangan Potong Silang', () => {
    // QRIS Bruto Rp 410.000, Refund Rp 0. Tunai Bruto Rp 830.000, Refund Tunai Rp 50.000.
    const payments: Payment[] = [
      {
        id: 91,
        orderId: 910,
        paymentMethod: 'Cash',
        amount: 830000,
        paidAt: '2026-10-21T16:00:00.000Z',
        operatorName: 'Kasir',
        status: 'partially_refunded',
        splitType: 'full'
      },
      {
        id: 92,
        orderId: 920,
        paymentMethod: 'QRIS',
        amount: 410000,
        paidAt: '2026-10-21T16:30:00.000Z',
        operatorName: 'Kasir',
        status: 'completed',
        splitType: 'full'
      }
    ];

    const refundEvents: RefundEvent[] = [{
      id: 9,
      idempotencyKey: 'IDEM-REF-GT09',
      orderId: 910,
      paymentId: 91,
      shiftId: 1,
      type: 'ITEM_RETURN',
      amount: 50000,
      method: 'Cash',
      reason: 'Refund tunai',
      operatorName: 'Admin',
      createdAt: '2026-10-21T17:00:00.000Z'
    }];

    const paymentsMetric = computePaymentMetrics(payments, refundEvents);

    const cashMethod = paymentsMetric.methods.find(m => m.method === 'Cash');
    const qrisMethod = paymentsMetric.methods.find(m => m.method === 'QRIS');

    assert.strictEqual(qrisMethod?.grossAmount, 410000);
    assert.strictEqual(qrisMethod?.refundAmount, 0);
    assert.strictEqual(qrisMethod?.netAmount, 410000, 'Settlement QRIS 100% utuh Rp 410.000');

    assert.strictEqual(cashMethod?.grossAmount, 830000);
    assert.strictEqual(cashMethod?.refundAmount, 50000);
    assert.strictEqual(cashMethod?.netAmount, 780000, 'Penerimaan Tunai Bersih Rp 780.000');

    assert.strictEqual(paymentsMetric.netPayments, 1190000, 'Total Penerimaan Bersih adalah Rp 1.190.000');
  });

  await t.test('GT-10: Deteksi Data Belum Direkonsiliasi (Unreconciled Guard)', () => {
    // Skenario data tidak seimbang di mana ada pembayaran yang tidak memiliki nota/event valid
    const orders: Order[] = [{
      id: 10,
      total: 100000,
      subtotal: 100000,
      status: 'paid',
      customerPhone: null, customerName: 'Pelanggan Normal',
      paymentMethod: 'Cash',
      orderType: 'dine_in',
      createdAt: '2026-10-21T18:00:00.000Z',
      updatedAt: '2026-10-21T18:00:00.000Z',
      tableId: 1
    }];

    // Pembayaran tercatat Rp 150.000 padahal nota hanya Rp 100.000 dan tidak ada open bill/DP
    const payments: Payment[] = [{
      id: 101,
      orderId: 10,
      paymentMethod: 'Cash',
      amount: 150000,
      paidAt: '2026-10-21T18:00:00.000Z',
      operatorName: 'Kasir',
      status: 'completed',
      splitType: 'full'
    }];

    const sales = computeSalesMetrics(orders, []);
    const paymentsMetric = computePaymentMetrics(payments, [], []);
    const reco = computeReconciliation(sales, paymentsMetric, orders, []);

    assert.strictEqual(reco.status, 'UNRECONCILED', 'Selisih Rp 50.000 anomali harus ditandai UNRECONCILED');
    assert.strictEqual(reco.badgeLabel, 'Belum Dapat Direkonsiliasi');
    assert.strictEqual(reco.unexplainedDifference, 50000);
  });
});
