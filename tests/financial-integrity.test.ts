import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test, { beforeEach, after } from 'node:test';
import { db, type Order, type Payment, type RefundEvent } from '../src/lib/dexie';
import { createOrder, recordPayment, refundPartialPayment, processVoidRefund, getOrders, getRefundEvents, openShift, closeShift, getShiftLiveStats, createMenu, updateMenu, exportAllData, importAllData } from '../src/lib/api';
import { computeFinancialDashboard, computeSalesMetrics } from '../src/lib/financialEngine';

beforeEach(async () => { await db.delete(); await db.open(); });
after(() => db.close());
const date = '2026-10-21T01:00:00Z';
const period = { start: new Date('2026-10-21T00:00:00Z'), end: new Date('2026-10-22T00:00:00Z') };
const bill = (data: Partial<Order> = {}): Order => ({ id: 1, total: 100000, subtotal: 100000, status: 'paid', createdAt: date, updatedAt: date, tableId: null, customerName: null, customerPhone: null, paymentMethod: 'Cash', orderType: 'Dine-in', ...data });
const receipt = (data: Partial<Payment> = {}): Payment => ({ id: 1, orderId: 1, amount: 100000, paymentMethod: 'Cash', status: 'completed', splitType: 'full', operatorName: 'Audit', paidAt: date, ...data });
async function paid() {
  const order = await createOrder({ total: 100000, status: 'unpaid', items: [{ menuItemId: 999, namaMenu: 'Synthetic', hargaSatuan: 100000, qty: 1 }] });
  const payment = await recordPayment({ orderId: order.id, paymentMethod: 'Cash', amount: 100000, splitType: 'full', operatorName: 'Audit' });
  return { orderId: order.id, paymentId: payment.paymentId };
}

test('partial refund: reread keeps retained amount and repayment is capped to the real balance', async () => {
  const { orderId, paymentId } = await paid();
  await refundPartialPayment(paymentId, { amount: 30000, reason: 'Correction', operator: 'Audit' });
  let order = (await getOrders()).find(o => o.id === orderId)!;
  assert.equal(order.paidAmount, 70000); assert.equal(order.remainingBalance, 30000);
  const second = await recordPayment({ orderId, amount: 100000, paymentMethod: 'Cash', splitType: 'full', operatorName: 'Audit' });
  assert.equal((await db.table('payments').get(second.paymentId)).amount, 30000);
  order = (await getOrders()).find(o => o.id === orderId)!;
  assert.equal(order.status, 'paid'); assert.equal(order.paidAmount, 100000);
  await assert.rejects(() => recordPayment({ orderId, amount: 1, paymentMethod: 'Cash', splitType: 'full', operatorName: 'Audit' }), /lunas/);
});

test('partial cash refunds belong to outgoing shifts; closing snapshots stay unchanged', async () => {
  const first = await openShift({ operatorName: 'First', startingCash: 0 });
  const { paymentId } = await paid();
  await refundPartialPayment(paymentId, { amount: 30000, reason: 'First', operator: 'Audit' });
  assert.equal((await getShiftLiveStats(first.id)).expectedCash, 70000);
  await closeShift(first.id, { actualCash: 70000 });
  const second = await openShift({ operatorName: 'Second', startingCash: 50000 });
  await refundPartialPayment(paymentId, { amount: 20000, reason: 'Second', operator: 'Audit' });
  assert.equal((await getShiftLiveStats(second.id)).expectedCash, 30000);
  assert.equal((await getShiftLiveStats(first.id)).expectedCash, 70000);
  await closeShift(second.id, { actualCash: 30000 });
  assert.equal((await getShiftLiveStats(second.id)).cashRefunds, 20000);
});

test('void after partial refund records the remaining cash once and survives backup restore', async () => {
  const { orderId, paymentId } = await paid();
  await refundPartialPayment(paymentId, { amount: 30000, reason: 'Partial', operator: 'Audit' });
  const opts = { reason: 'Cancel', isRefunded: true, refundAmount: 70000, refundMethod: 'Tunai', operator: 'Audit' };
  await processVoidRefund(orderId, opts);
  await assert.rejects(() => processVoidRefund(orderId, opts), /dibatalkan/);
  const events = await getRefundEvents(orderId);
  assert.deepEqual(events.map(e => e.amount).sort((a,b) => a-b), [30000, 70000]);
  const report = computeFinancialDashboard({ orders: await getOrders(), payments: await db.table('payments').toArray(), refundEvents: events });
  assert.equal(report.payments.netPayments, 0); assert.equal(report.sales.netSales, 0);
  assert.equal((await getOrders())[0].remainingBalance, 0);
  const backup = await exportAllData();
  await importAllData(backup, { skipPreBackup: true });
  assert.equal((await getRefundEvents(orderId)).length, 2);
});

test('full void refund is in the dashboard ledger; a void without money creates no cash outflow', async () => {
  const a = await paid();
  await processVoidRefund(a.orderId, { reason: 'Cancel', isRefunded: true, refundAmount: 100000, refundMethod: 'Tunai', operator: 'Audit' });
  assert.equal((await getRefundEvents(a.orderId))[0].amount, 100000);
  const b = await paid();
  await processVoidRefund(b.orderId, { reason: 'No refund', isRefunded: false, refundAmount: 0, refundMethod: 'None', operator: 'Audit' });
  const report = computeFinancialDashboard({ orders: await getOrders(), payments: await db.table('payments').toArray(), refundEvents: await getRefundEvents() });
  assert.equal(report.payments.netPayments, 100000);
  assert.equal((await getRefundEvents(b.orderId)).length, 0);
});

test('refund idempotency cannot be reused for another payment', async () => {
  const a = await paid(); const b = await paid();
  const opts = { amount: 10000, idempotencyKey: 'unique', reason: 'Correction', operator: 'Audit' };
  await refundPartialPayment(a.paymentId, opts);
  await refundPartialPayment(a.paymentId, opts);
  await assert.rejects(() => refundPartialPayment(b.paymentId, opts), /idempotensi/);
  assert.equal((await getRefundEvents()).length, 1);
});

test('historical item without snapshot stays incomplete when catalog costs change', async () => {
  const id = Number(await createMenu({ nama: 'Synthetic', harga: 100000, costPrice: 40000, kategori: 'Audit' }));
  const order = await createOrder({ total: 100000, status: 'paid', items: [{ menuItemId: id, hargaSatuan: 100000, qty: 1 }] });
  await db.table('orderItems').where('orderId').equals(order.id).modify({ costPrice: undefined });
  for (const costPrice of [40000, 80000]) {
    await updateMenu(id, { costPrice });
    const sales = computeSalesMetrics(await getOrders());
    assert.equal(sales.totalCOGS, 0); assert.equal(sales.hasIncompleteCOGS, true);
  }
});

test('service charge reconciles with receipt of the complete invoice amount', () => {
  const report = computeFinancialDashboard({ orders: [bill({ serviceCharge: 5000, total: 105000 })], payments: [receipt({ amount: 105000 })], period });
  assert.equal(report.reconciliation.status, 'VERIFIED'); assert.equal(report.reconciliation.unexplainedDifference, 0);
});

test('old unchanged open bills do not create a current-period difference', () => {
  const old = bill({ id: 2, createdAt: '2026-10-01T01:00:00Z', total: 50000, subtotal: 50000, status: 'unpaid', remainingBalance: 50000 });
  const report = computeFinancialDashboard({ orders: [bill(), old], payments: [receipt()], period });
  assert.equal(report.reconciliation.openBillOutstanding, 50000);
  assert.equal(report.reconciliation.status, 'VERIFIED');
});

test('collection of an earlier invoice reconciles with the receivable decrease', () => {
  const report = computeFinancialDashboard({ orders: [bill({ createdAt: '2026-10-01T01:00:00Z' })], payments: [receipt()], period });
  assert.equal(report.sales.netSales, 0); assert.equal(report.payments.netPayments, 100000);
  assert.equal(report.reconciliation.status, 'VERIFIED');
});

test('refund-only period keeps negative returns and reconciles without hiding the outflow', () => {
  const event: RefundEvent = { idempotencyKey: 'return', orderId: 1, paymentId: 1, shiftId: null, type: 'ITEM_RETURN', amount: 30000, method: 'Cash', reason: 'Return', operatorName: 'Audit', createdAt: date };
  const report = computeFinancialDashboard({ orders: [bill({ createdAt: '2026-10-01T01:00:00Z', status: 'unpaid', paidAmount: 70000, remainingBalance: 30000 })], payments: [receipt({ paidAt: '2026-10-01T01:00:00Z', status: 'partially_refunded', refundedAmount: 30000 })], refundEvents: [event], period });
  assert.equal(report.sales.netSales, -30000); assert.equal(report.payments.netPayments, -30000);
  assert.equal(report.reconciliation.status, 'VERIFIED');
});

test('overpayment and orphan payments remain unreconciled', () => {
  for (const p of [receipt({ amount: 150000 }), receipt({ orderId: 999 })]) {
    const report = computeFinancialDashboard({ orders: [bill()], payments: [p], period });
    assert.equal(report.reconciliation.status, 'UNRECONCILED');
  }
});

test('legacy refund metadata is projected once when no event exists', () => {
  const p = receipt({ status: 'refunded', refundedAt: date, cashRefundAmount: 100000 });
  const report = computeFinancialDashboard({ orders: [bill({ status: 'void' })], payments: [p], period });
  assert.equal(report.payments.netPayments, 0);
  assert.equal(report.payments.refundPayments, 100000);
});

test('legacy projection never duplicates an explicit refund and preserves non-cash method', () => {
  const p = receipt({ paymentMethod: 'QRIS', status: 'refunded', refundedAt: date, cashRefundAmount: 0 });
  const event: RefundEvent = { idempotencyKey: 'explicit', paymentId: 1, orderId: 1, shiftId: null, type: 'PARTIAL_REFUND', amount: 100000, method: 'QRIS', reason: 'Correction', operatorName: 'Audit', createdAt: date };
  for (const refundEvents of [[], [event]]) {
    const report = computeFinancialDashboard({ orders: [bill({ status: 'unpaid', remainingBalance: 100000 })], payments: [p], refundEvents, period });
    assert.equal(report.payments.refundPayments, 100000);
    assert.equal(report.payments.methods.find(m => m.method === 'QRIS')!.netAmount, 0);
    assert.equal(report.payments.cashDrawer.cashRefundsOut, 0);
  }
});

test('non-cash partial refund retains verification and leaves physical cash unchanged', async () => {
  const shift = await openShift({ operatorName: 'QRIS shift', startingCash: 50000 });
  const order = await createOrder({ total: 100000, status: 'paid', paymentMethod: 'QRIS', items: [{ menuItemId: 999, hargaSatuan: 100000, qty: 1 }] });
  const payment = await db.table('payments').where('orderId').equals(order.id).first();
  await db.table('payments').update(payment.id, { proofStatus: 'terverifikasi' });
  await refundPartialPayment(payment.id, { amount: 30000, reason: 'Correction', operator: 'Audit' });
  const stats = await getShiftLiveStats(shift.id);
  assert.equal(stats.nonCashSales, 70000); assert.equal(stats.verifiedNonCashSales, 70000);
  assert.equal(stats.expectedCash, 50000); assert.equal(stats.totalTransactions, 1);
});

test('new unpaid invoices reconcile with the actual deposit instead of all-time open bills', () => {
  const report = computeFinancialDashboard({ orders: [bill({ status: 'unpaid', paidAmount: 30000, remainingBalance: 70000 }), bill({ id: 2, status: 'unpaid', total: 50000, remainingBalance: 50000, createdAt: '2026-10-01T01:00:00Z' })], payments: [receipt({ amount: 30000 })], period });
  assert.equal(report.reconciliation.openBillOutstanding, 120000);
  assert.equal(report.reconciliation.status, 'VERIFIED');
});
