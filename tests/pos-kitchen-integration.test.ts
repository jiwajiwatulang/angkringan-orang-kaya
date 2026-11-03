import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/dexie';
import { saveOperation } from '../src/lib/operationsApi';
import {
  supportsKitchen,
  kitchenItemStage,
  kitchenSignature,
  type OperationRecord,
} from '../src/lib/operations';

test('pos kitchen visibility: orders calculate ready status for meja and takeaway', async () => {
  await db.table('orders').clear();
  await db.table('orderItems').clear();
  await db.table('operations').clear();
  await db.table('tables').clear();

  // Create tables
  await db.table('tables').bulkAdd([
    { id: 1, nomor: 'Meja 01', capacity: 4, zone: 'Ruang Utama' },
    { id: 2, nomor: 'Meja 02', capacity: 4, zone: 'Ruang Utama' },
  ]);

  // 1. Takeaway order
  const takeawayOrderId = await db.table('orders').add({
    total: 25000,
    status: 'paid',
    orderType: 'Takeaway',
    tableId: null,
    customerName: 'Pak Dimas',
    createdAt: new Date().toISOString(),
  }) as number;

  const takeawayItemId = await db.table('orderItems').add({
    orderId: takeawayOrderId,
    namaMenu: 'Kopi Susu Aren',
    hargaSatuan: 15000,
    qty: 2,
    subtotal: 30000,
    kategoriMenu: 'Minuman',
  }) as number;

  // 2. Dine-in order at Meja 02
  const dineInOrderId = await db.table('orders').add({
    total: 40000,
    status: 'unpaid',
    orderType: 'Dine-in',
    tableId: 2,
    customerName: 'Rezamini',
    createdAt: new Date().toISOString(),
  }) as number;

  const dineInItemId = await db.table('orderItems').add({
    orderId: dineInOrderId,
    namaMenu: 'Nasi Goreng Spesial',
    hargaSatuan: 20000,
    qty: 2,
    subtotal: 40000,
    kategoriMenu: 'Makanan',
  }) as number;

  // Initial stage: both are waiting
  let ops = (await db.table('operations').toArray()) as OperationRecord[];
  const takeawayItem = await db.table('orderItems').get(takeawayItemId);
  const dineInItem = await db.table('orderItems').get(dineInItemId);

  assert.equal(kitchenItemStage(takeawayItem, ops), 'waiting');
  assert.equal(kitchenItemStage(dineInItem, ops), 'waiting');

  // Advance takeaway to preparing then ready
  await saveOperation({
    kind: 'kitchen',
    employeeId: 'local:test',
    employeeName: 'Kasir',
    orderId: takeawayOrderId,
    orderItemId: takeawayItemId,
    stage: 'preparing',
    lineSignature: kitchenSignature(takeawayItem),
  });

  ops = (await db.table('operations').toArray()) as OperationRecord[];
  const prevTakeaway = ops.find(o => o.kind === 'kitchen' && o.orderItemId === takeawayItemId)!;

  await saveOperation({
    kind: 'kitchen',
    employeeId: 'local:test',
    employeeName: 'Kasir',
    orderId: takeawayOrderId,
    orderItemId: takeawayItemId,
    stage: 'ready',
    previousId: prevTakeaway.sessionId,
    lineSignature: kitchenSignature(takeawayItem),
  });

  ops = (await db.table('operations').toArray()) as OperationRecord[];
  assert.equal(kitchenItemStage(takeawayItem, ops), 'ready');
  assert.equal(kitchenItemStage(dineInItem, ops), 'waiting');

  // Advance dine-in to preparing and ready
  await saveOperation({
    kind: 'kitchen',
    employeeId: 'local:test',
    employeeName: 'Kasir',
    orderId: dineInOrderId,
    orderItemId: dineInItemId,
    stage: 'preparing',
    lineSignature: kitchenSignature(dineInItem),
  });

  ops = (await db.table('operations').toArray()) as OperationRecord[];
  const prevDineIn = ops.filter(o => o.kind === 'kitchen' && o.orderItemId === dineInItemId).at(-1)!;

  await saveOperation({
    kind: 'kitchen',
    employeeId: 'local:test',
    employeeName: 'Kasir',
    orderId: dineInOrderId,
    orderItemId: dineInItemId,
    stage: 'ready',
    previousId: prevDineIn.sessionId,
    lineSignature: kitchenSignature(dineInItem),
  });

  ops = (await db.table('operations').toArray()) as OperationRecord[];
  assert.equal(kitchenItemStage(dineInItem, ops), 'ready');

  // Serve takeaway order
  const readyTakeaway = ops.filter(o => o.kind === 'kitchen' && o.orderItemId === takeawayItemId).at(-1)!;
  await saveOperation({
    kind: 'kitchen',
    employeeId: 'local:test',
    employeeName: 'Kasir',
    orderId: takeawayOrderId,
    orderItemId: takeawayItemId,
    stage: 'served',
    previousId: readyTakeaway.sessionId,
    lineSignature: kitchenSignature(takeawayItem),
  });

  ops = (await db.table('operations').toArray()) as OperationRecord[];
  assert.equal(kitchenItemStage(takeawayItem, ops), 'served');
  assert.equal(kitchenItemStage(dineInItem, ops), 'ready');

  // Serve dine-in order
  const readyDineIn = ops.filter(o => o.kind === 'kitchen' && o.orderItemId === dineInItemId).at(-1)!;
  await saveOperation({
    kind: 'kitchen',
    employeeId: 'local:test',
    employeeName: 'Kasir',
    orderId: dineInOrderId,
    orderItemId: dineInItemId,
    stage: 'served',
    previousId: readyDineIn.sessionId,
    lineSignature: kitchenSignature(dineInItem),
  });

  ops = (await db.table('operations').toArray()) as OperationRecord[];
  assert.equal(kitchenItemStage(dineInItem, ops), 'served');

  await db.delete();
});
