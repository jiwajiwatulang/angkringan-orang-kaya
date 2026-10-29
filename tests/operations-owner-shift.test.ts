import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/dexie';
import { openShift, closeShiftByOwner, closeShift, getShiftLiveStats, createOrder, recordPayment, getOrders } from '../src/lib/api';
import { generateZReportReceipt, generateZReportHtml } from '../src/lib/receipt';

test('owner can safely close shift with audit trail and preserve in-progress transactions', async () => {
  // Reset tables
  await db.table('shifts').clear();
  await db.table('orders').clear();
  await db.table('orderItems').clear();
  await db.table('payments').clear();
  await db.table('cashMovements').clear();
  await db.table('auditLogs').clear();

  // 1. Kasir membuka shift #1
  const opened = await openShift({
    startingCash: 200000,
    operatorName: 'Kasir Budi',
    notes: 'Shift Pagi'
  });
  const shiftId = opened.id!;
  assert.equal(opened.status, 'open');
  assert.equal(opened.operatorName, 'Kasir Budi');
  assert.equal(opened.startingCash, 200000);

  // 2. Buat transaksi yang akan dibayar dalam shift ini
  const paidOrder = await createOrder({
    tableId: 1,
    orderType: 'dine_in',
    status: 'unpaid',
    total: 10000,
    items: [{ menuItemId: 1, nama: 'Nasi Kucing', harga: 5000, qty: 2 }]
  });
  await recordPayment({
    orderId: paidOrder.id,
    shiftId,
    paymentMethod: 'Cash',
    amount: 10000,
    splitType: 'full',
    operatorName: 'Kasir Budi'
  });

  // 3. Buat transaksi yang BELUM lunas (transaksi berjalan / tertunda di meja)
  const pendingOrder = await createOrder({
    tableId: 2,
    orderType: 'dine_in',
    status: 'unpaid',
    total: 9000,
    items: [{ menuItemId: 2, nama: 'Sate Usus', harga: 3000, qty: 3 }]
  });
  const pendingInDb = await db.table('orders').get(pendingOrder.id);
  assert.equal(pendingInDb.status, 'unpaid');

  // 4. Periksa live stats sebelum ditutup
  const statsBefore = await getShiftLiveStats(shiftId);
  assert.equal(statsBefore.cashSales, 10000);
  assert.equal(statsBefore.expectedCash, 210000); // 200k + 10k

  // 5. Validasi input gagal jika alasan kosong atau uang negatif
  await assert.rejects(
    () => closeShiftByOwner(shiftId, { actualCash: -1000, closureReason: 'Tutup' }),
    /Jumlah uang fisik tidak valid/
  );
  await assert.rejects(
    () => closeShiftByOwner(shiftId, { actualCash: 210000, closureReason: '   ' }),
    /Alasan penutupan shift oleh pemilik wajib diisi/
  );

  // 6. Pemilik mengakhiri shift secara resmi dengan uang fisik Rp 215.000 (lebih Rp 5.000)
  const closed = await closeShiftByOwner(shiftId, {
    actualCash: 215000,
    closureReason: 'Pergantian shift sore oleh pemilik',
    closedByOperator: 'Pak Budi (Owner)',
    notes: 'Laci rapi, uang receh cukup'
  });

  assert.equal(closed.status, 'closed');
  assert.equal(closed.operatorName, 'Kasir Budi'); // Kasir asli dipertahankan
  assert.equal(closed.closedBy, 'owner');
  assert.equal(closed.closedByOperator, 'Pak Budi (Owner)');
  assert.equal(closed.closureReason, 'Pergantian shift sore oleh pemilik');
  assert.equal(closed.actualCash, 215000);
  assert.equal(closed.cashDifference, 5000);
  assert.ok(closed.endTime);

  // 7. Periksa transaksi tertunda: order belum lunas TIDAK boleh hilang atau di-void
  const allOrders = await getOrders();
  const retainedPending = allOrders.find(o => o.id === pendingOrder.id);
  assert.ok(retainedPending, 'Transaksi belum lunas harus tetap ada');
  assert.equal(retainedPending?.status, 'unpaid', 'Status order belum lunas harus tetap unpaid');

  // 8. Immutability: shift yang sudah ditutup tidak boleh dapat ditutup ulang
  await assert.rejects(
    () => closeShiftByOwner(shiftId, { actualCash: 200000, closureReason: 'Tutup ulang' }),
    /Shift sudah ditutup/
  );
  await assert.rejects(
    () => closeShift(shiftId, { actualCash: 200000 }),
    /Shift sudah ditutup/
  );

  // 9. Audit trail mencatat penutupan oleh pemilik
  const logs = await db.table('auditLogs').where('action').equals('CLOSE_SHIFT_OWNER').toArray();
  assert.equal(logs.length, 1);
  assert.equal(logs[0].operator, 'Pak Budi (Owner)');
  assert.ok(logs[0].reason.includes('Pergantian shift sore oleh pemilik'));

  // 10. Z-Report memuat identitas penutup dan alasan
  const zText = generateZReportReceipt(closed);
  assert.ok(zText.includes('Pak Budi (Owner) (Pemilik)'));
  assert.ok(zText.includes('Pergantian shift sore oleh pemilik'));

  const zHtml = generateZReportHtml(closed);
  assert.ok(zHtml.includes('Pak Budi (Owner) (Pemilik)'));
  assert.ok(zHtml.includes('Pergantian shift sore oleh pemilik'));
});
