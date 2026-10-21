import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { db } from '../src/lib/dexie';
import {
  createOrder,
  recordPayment,
  refundPartialPayment,
  getRefundEvents,
  openShift,
  closeShift,
  getShiftLiveStats,
  resetAllTransactions,
  exportAllData,
  importAllData
} from '../src/lib/api';

test('Tahap 1: Refund Ledger, Dexie v10 non-destructive migration & Shift Immutability', async (t) => {
  await resetAllTransactions();

  let payment1Id: number;
  let order1Id: number;

  await t.test('1. Dexie v10 table refundEvents exists and is accessible', async () => {
    const tableNames = db.tables.map(t => t.name);
    assert(tableNames.includes('refundEvents'), 'refundEvents table must exist in Dexie schema v10');
    const count = await db.table('refundEvents').count();
    assert.strictEqual(count, 0, 'refundEvents should start empty after reset');
  });

  await t.test('2. Partial refund on single payment (Rp 30.000 of Rp 100.000)', async () => {
    const order = await createOrder({
      total: 100000,
      status: 'unpaid',
      customerName: 'Budi Santoso',
      paymentMethod: 'Cash',
      items: [{ namaMenu: 'Nasi Liwet Spesial', qty: 2, hargaSatuan: 50000, menuItemId: 1 }]
    });
    order1Id = order.id;

    const pay = await recordPayment({
      orderId: order.id,
      paymentMethod: 'Cash',
      amount: 100000,
      splitType: 'full',
      operatorName: 'Kasir 1'
    });
    payment1Id = pay.paymentId;

    const refund1 = await refundPartialPayment(payment1Id, {
      amount: 30000,
      reason: 'Porsi dikurangi 1 atas permintaan pelanggan',
      operator: 'Admin',
      type: 'ITEM_RETURN'
    });

    assert.strictEqual(refund1.refundedAmount, 30000, 'refundedAmount must be 30.000');
    assert.strictEqual(refund1.totalRefundedOnPayment, 30000, 'totalRefundedOnPayment must be 30.000');
    assert.strictEqual(refund1.newTotalPaid, 70000, 'newTotalPaid on order must be 70.000');
    assert.strictEqual(refund1.remainingBalance, 30000, 'Order remainingBalance must be reopened to 30.000');

    const paymentInDb = await db.table('payments').get(payment1Id);
    assert.strictEqual(paymentInDb.status, 'partially_refunded', 'Payment status must be partially_refunded');
    assert.strictEqual(paymentInDb.refundedAmount, 30000, 'Payment refundedAmount must be 30.000');

    const events = await getRefundEvents(order1Id);
    assert.strictEqual(events.length, 1, 'Exactly 1 refund event must be logged');
    assert.strictEqual(events[0].amount, 30000, 'Event amount must be 30.000');
    assert.strictEqual(events[0].type, 'ITEM_RETURN', 'Event type must be ITEM_RETURN');
    assert.strictEqual(events[0].method, 'Cash', 'Event method must be Cash');
  });

  await t.test('3. Multi-refund: Second refund of Rp 20.000 on the same payment', async () => {
    const refund2 = await refundPartialPayment(payment1Id, {
      amount: 20000,
      reason: 'Kompensasi sambal kurang',
      operator: 'Admin'
    });

    assert.strictEqual(refund2.refundedAmount, 20000, 'Second refund amount must be 20.000');
    assert.strictEqual(refund2.totalRefundedOnPayment, 50000, 'Total refunded on payment must accumulate to 50.000');
    assert.strictEqual(refund2.newTotalPaid, 50000, 'Remaining active payment must be 50.000');
    assert.strictEqual(refund2.remainingBalance, 50000, 'Order remaining balance must be 50.000');

    const paymentInDb = await db.table('payments').get(payment1Id);
    assert.strictEqual(paymentInDb.status, 'partially_refunded', 'Payment remains partially_refunded');
    assert.strictEqual(paymentInDb.refundedAmount, 50000, 'Payment refundedAmount must accumulate to 50.000');

    const events = await getRefundEvents(order1Id);
    assert.strictEqual(events.length, 2, 'Total 2 refund events logged');
  });

  await t.test('4. Full settlement refund of the remaining Rp 50.000', async () => {
    const refund3 = await refundPartialPayment(payment1Id, {
      amount: 50000,
      reason: 'Pelanggan membatalkan seluruh sisa pesanan',
      operator: 'Admin'
    });

    assert.strictEqual(refund3.totalRefundedOnPayment, 100000, 'Total refunded must reach 100.000');
    assert.strictEqual(refund3.newTotalPaid, 0, 'New total paid must be 0');
    assert.strictEqual(refund3.remainingBalance, 100000, 'Order remaining balance must be 100.000');

    const paymentInDb = await db.table('payments').get(payment1Id);
    assert.strictEqual(paymentInDb.status, 'refunded', 'Payment status must transition to refunded');
    assert.strictEqual(paymentInDb.refundedAmount, 100000, 'Payment refundedAmount must be 100.000');
  });

  await t.test('5. Over-refund attempt is strictly rejected', async () => {
    await assert.rejects(
      async () => {
        await refundPartialPayment(payment1Id, {
          amount: 10000,
          reason: 'Refund melebihi batas',
          operator: 'Admin'
        });
      },
      /sudah pernah di-refund penuh/,
      'Attempting to refund an already fully refunded payment must reject'
    );
  });

  await t.test('6. Idempotency guard prevents duplicate refund charges', async () => {
    const order = await createOrder({
      total: 50000,
      status: 'unpaid',
      customerName: 'Idem User',
      paymentMethod: 'QRIS',
      items: [{ namaMenu: 'Bebek Bakar', qty: 1, hargaSatuan: 50000, menuItemId: 2 }]
    });

    const pay = await recordPayment({
      orderId: order.id,
      paymentMethod: 'QRIS',
      amount: 50000,
      splitType: 'full',
      operatorName: 'Kasir 2'
    });

    const idemKey = 'IDEM-REFUND-UNIQUE-999';

    const firstCall = await refundPartialPayment(pay.paymentId, {
      amount: 25000,
      reason: 'Refund parsial QRIS',
      operator: 'Admin',
      idempotencyKey: idemKey
    });

    assert.strictEqual(firstCall.refundedAmount, 25000);

    const secondCall = await refundPartialPayment(pay.paymentId, {
      amount: 25000,
      reason: 'Refund duplikat yang tidak sengaja tertekan kasir',
      operator: 'Admin',
      idempotencyKey: idemKey
    });

    assert.strictEqual(secondCall.refundedAmount, 25000, 'Second call must return cached refund amount');

    const events = await db.table('refundEvents').where('idempotencyKey').equals(idemKey).toArray();
    assert.strictEqual(events.length, 1, 'Exactly 1 refund event must exist for given idempotencyKey');
  });

  await t.test('7. Shift Immutability: Cross-date refund does not alter closed shift Z-Report', async () => {
    // 1. Shift 1 opened yesterday
    const shift1 = await openShift({
      operatorName: 'Operator Kemarin',
      startingCash: 200000,
      notes: 'Shift Pagi Hari 1'
    });

    const orderShift1 = await createOrder({
      shiftId: shift1.id,
      total: 80000,
      status: 'unpaid',
      customerName: 'Pelanggan Kemarin',
      paymentMethod: 'Cash',
      items: [{ namaMenu: 'Sop Iga Sapi', qty: 2, hargaSatuan: 40000, menuItemId: 3 }]
    });

    const payShift1 = await recordPayment({
      orderId: orderShift1.id,
      paymentMethod: 'Cash',
      amount: 80000,
      splitType: 'full',
      operatorName: 'Operator Kemarin'
    });

    // Close Shift 1: Starting cash 200k + cash sales 80k = 280k expected
    await closeShift(shift1.id, {
      actualCash: 280000,
      operatorName: 'Operator Kemarin',
      notes: 'Tutup Shift Kemarin Pas'
    });

    const shift1DetailsBefore = await getShiftLiveStats(shift1.id);
    assert.strictEqual(shift1DetailsBefore.cashSales, 80000, 'Shift 1 Cash Sales was Rp 80.000');
    assert.strictEqual(shift1DetailsBefore.cashRefunds, 0, 'Shift 1 Cash Refunds was Rp 0');
    assert.strictEqual(shift1DetailsBefore.expectedCash, 280000, 'Shift 1 Expected Cash was Rp 280.000');

    // 2. Shift 2 opened today
    const shift2 = await openShift({
      operatorName: 'Operator Hari Ini',
      startingCash: 150000,
      notes: 'Shift Hari 2'
    });

    // Customer from Shift 1 returns 1 portion today (refund Rp 40.000 cash)
    const crossRefund = await refundPartialPayment(payShift1.paymentId, {
      amount: 40000,
      reason: 'Retur 1 porsi dari pembelian kemarin',
      operator: 'Admin',
      type: 'ITEM_RETURN'
    });

    assert.strictEqual(crossRefund.refundedAmount, 40000);

    // 3. Shift 1 Z-Report MUST REMAIN 100% UNCHANGED (IMMUTABLE)
    const shift1DetailsAfter = await getShiftLiveStats(shift1.id);
    assert.strictEqual(shift1DetailsAfter.cashSales, 80000, 'Shift 1 Cash Sales MUST NOT CHANGE');
    assert.strictEqual(shift1DetailsAfter.cashRefunds, 0, 'Shift 1 Cash Refunds MUST REMAIN 0');
    assert.strictEqual(shift1DetailsAfter.expectedCash, 280000, 'Shift 1 Expected Cash MUST REMAIN 280.000');

    // 4. Shift 2 MUST record the cash refund
    const shift2Details = await getShiftLiveStats(shift2.id);
    assert.strictEqual(shift2Details.cashRefunds, 40000, 'Shift 2 MUST record the cash refund of Rp 40.000');
    assert.strictEqual(shift2Details.expectedCash, 110000, 'Shift 2 Expected Cash: 150.000 - 40.000 = 110.000');

    await closeShift(shift2.id, {
      actualCash: 110000,
      operatorName: 'Operator Hari Ini'
    });
  });

  await t.test('8. Backup and Restore preserves refundEvents table', async () => {
    const backup = await exportAllData();
    assert(Array.isArray(backup.refundEvents), 'Backup must include refundEvents array');
    assert(backup.refundEvents.length > 0, 'Backup contains refund events');

    const originalEventCount = backup.refundEvents.length;

    // Reset database
    await resetAllTransactions();
    const countAfterReset = await db.table('refundEvents').count();
    assert.strictEqual(countAfterReset, 0, 'refundEvents cleared on reset');

    // Restore from backup
    await importAllData(backup, { skipPreBackup: true });
    const countAfterRestore = await db.table('refundEvents').count();
    assert.strictEqual(countAfterRestore, originalEventCount, 'All refund events restored successfully');
  });
});
