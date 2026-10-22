import 'fake-indexeddb/auto';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import { GUIDE_TOPICS } from '../src/lib/guideTopics';
import { db } from '../src/lib/dexie';
import { createMenu, updateMenu, createOrder, updateOrder, getOrders, recordPayment, openShift, closeShift, getShiftLiveStats, exportAllData, importAllData, voidOrder, processVoidRefund, refundPartialPayment, bulkImportMenus } from '../src/lib/api';
import { configureStock, adjustStock } from '../src/lib/inventory';
import { parseWeight, lineTotal, lineCost, quantityLabel, priceSuffix, ratioMoney, weightEnabled, weightSalesSummary } from '../src/lib/weight';
import { refundWeight, weightRefundAmount, measuredSplitAmount } from '../src/lib/weightRefund';
import { makeProductExport, parseProductImport } from '../src/lib/productTransfer';
import { generateEscPosReceipt, generateReceiptHtml } from '../src/lib/receipt';

after(() => db.close());
async function setup(price = 18000, cost: number | null = 12000, basis: 100 | 1000 = 1000) {
  await db.delete(); await db.open();
  const shift = await openShift({ startingCash: 100000, operatorName: 'Kasir' });
  const id = Number(await createMenu({ nama: 'Beras Premium', harga: price, costPrice: cost, saleUnit: 'weight', priceBasis: basis, kategori: 'Sembako', sku: 'BERAS' }));
  await configureStock(id, 10000, 1000);
  return { id, shift };
}
function payload(id: number, qty: number, price = 18000, status = 'paid') {
  const subtotal = lineTotal({ saleUnit: 'weight', priceBasis: 1000, harga: price, qty });
  return { subtotal, total: subtotal, status, paymentMethod: 'Cash', items: [{ id, nama: 'Beras Premium', kategori: 'Sembako', harga: price, qty, saleUnit: 'weight', priceBasis: 1000 }] };
}
async function read(orderId: number) { return (await getOrders()).find(o => o.id === orderId)!; }
function returning(order: any, grams: number, restock = true, method: 'Cash' | 'Transfer' = 'Cash') {
  return refundWeight({ orderId: order.id, orderItemId: order.items[0].id, grams, reason: 'Barang dikembalikan', restock, method });
}

test('gram and decimal-comma kilogram inputs normalize to identical whole grams', () => {
  assert.equal(parseWeight('250', 'g'), 250); assert.equal(parseWeight('0,5', 'kg'), 500); assert.equal(parseWeight('1,25', 'kg'), 1250);
  assert.equal(parseWeight('0.001', 'kg'), 1); assert.equal(parseWeight('1.0000', 'kg'), 1000);
  assert.equal(parseWeight('0', 'g', true), 0);
  for (const text of ['', '-1', 'NaN', 'Infinity', '1e3', '1,2,3', '1.000.000', '9007199254740992']) assert.throws(() => parseWeight(text, 'g'));
  assert.throws(() => parseWeight('0', 'g'), /lebih dari 0/); assert.throws(() => parseWeight('0.0001', 'kg'), /1 g/); assert.throws(() => parseWeight('250,5', 'g'), /1 g/);
});
test('per kg and per 100 g prices round half up without multiplication overflow', () => {
  assert.equal(lineTotal({ saleUnit: 'weight', harga: 18000, priceBasis: 1000, qty: 250 }), 4500);
  assert.equal(lineTotal({ saleUnit: 'weight', harga: 2400, priceBasis: 100, qty: 1250 }), 30000);
  assert.equal(ratioMoney(1005, 100, 1000), 101);
  assert.equal(ratioMoney(9007199254740991, 999, 1000), 8998192055486250);
  assert.throws(() => ratioMoney(9007199254740991, 1001, 1000));
  assert.equal(lineTotal({ harga: 4000, qty: 3 }), 12000);
  assert.equal(quantityLabel({ saleUnit: 'weight', qty: 1250 }), '1,25 kg'); assert.equal(priceSuffix({ saleUnit: 'weight', priceBasis: 100 }), '/100 g');
  assert.equal(weightEnabled('kafe'), false); assert.equal(weightEnabled('warung'), true); assert.equal(weightEnabled('retail'), true);
});
test('sale snapshots grams, basis and cost and deducts stock once on idempotent checkout', async () => {
  const { id } = await setup();
  const data = { ...payload(id, 250), idempotencyKey: 'weight-once' };
  const saved = await createOrder(data); await createOrder(data);
  const order = await read(Number(saved.id));
  assert.equal(order.items[0].qty, 250); assert.equal(order.items[0].costPrice, 12000); assert.equal(lineCost(order.items[0]), 3000);
  assert.equal((await db.table('menuItems').get(id)).stockQty, 9750); assert.equal(await db.table('orders').count(), 1);
  await updateMenu(id, { harga: 25000, costPrice: 19000, priceBasis: 100 });
  const old = await read(Number(saved.id)); assert.equal(lineTotal(old.items[0]), 4500); assert.equal(lineCost(old.items[0]), 3000); assert.equal(old.items[0].priceBasis, 1000);
});
test('per 100 g products use the same grams for inventory and financial amounts', async () => {
  const { id } = await setup(1800, 1200, 100);
  const data = payload(id, 1250); data.items[0].priceBasis = 100;
  const saved = await createOrder(data); const order = await read(Number(saved.id));
  assert.equal(order.total, 22500); assert.equal(lineCost(order.items[0]), 15000); assert.equal((await db.table('menuItems').get(id)).stockQty, 8750);
});
test('insufficient stock rolls back the order, payment and inventory movement together', async () => {
  const { id } = await setup(); const before = await db.table('inventoryMovements').count();
  await assert.rejects(createOrder(payload(id, 10001)), /Stok/);
  assert.equal(await db.table('orders').count(), 0); assert.equal(await db.table('payments').count(), 0); assert.equal(await db.table('inventoryMovements').count(), before);
  await createOrder(payload(id, 10000)); assert.equal((await db.table('menuItems').get(id)).isSoldOut, true);
});
test('open bill edit preserves original selling price/cost and reserves only the difference', async () => {
  const { id } = await setup(); const saved = await createOrder(payload(id, 250, 18000, 'unpaid'));
  await updateMenu(id, { harga: 20000, costPrice: 17000 });
  await updateOrder(Number(saved.id), payload(id, 500, 18000, 'unpaid'));
  const order = await read(Number(saved.id)); assert.equal(lineCost(order.items[0]), 6000); assert.equal((await db.table('menuItems').get(id)).stockQty, 9500);
  await voidOrder(Number(saved.id), 'Batal'); assert.equal((await db.table('menuItems').get(id)).stockQty, 10000);
});
test('fractional or forged quantities, rates, totals and modifier additions are rejected atomically', async () => {
  const { id } = await setup();
  for (const qty of [0, -1, 0.5, NaN, Infinity]) { const invalid = payload(id, 250); invalid.items[0].qty = qty; await assert.rejects(createOrder(invalid), /tidak valid/); }
  const wrong = payload(id, 250); wrong.items[0].harga = 1; wrong.total = 1; await assert.rejects(createOrder(wrong), /Total berubah/);
  await assert.rejects(createOrder({ ...payload(id, 250), items: [{ ...payload(id, 250).items[0], selectedModifiers: [{ harga: 5 }] }] }), /Pilihan/);
  assert.equal(await db.table('orders').count(), 0);
});
test('mixed pcs and grams support partial payments without another stock deduction', async () => {
  const { id } = await setup(); const pcs = Number(await createMenu({ nama: 'Kantong', harga: 2000, kategori: 'Lainnya' })); await configureStock(pcs, 10);
  const data = payload(id, 500, 18000, 'unpaid'); data.items.push({ id: pcs, nama: 'Kantong', harga: 2000, qty: 2, kategori: 'Lainnya' } as any); data.subtotal = data.total = 13000;
  const saved = await createOrder(data);
  for (const [amount, method] of [[4000, 'Cash'], [9000, 'QRIS']] as const) await recordPayment({ orderId: Number(saved.id), amount, paymentMethod: method, splitType: 'partial', operatorName: 'Kasir' });
  const order = await read(Number(saved.id)); assert.equal(order.status, 'paid'); assert.equal(order.remainingBalance, 0); assert.equal(order.items[0].paidQty, 500); assert.equal((await db.table('menuItems').get(pcs)).stockQty, 8); assert.equal((await db.table('menuItems').get(id)).stockQty, 9500);
});
test('split by weight validates original order-item identity, amount and unpaid grams', async () => {
  const { id } = await setup(); const saved = await createOrder(payload(id, 500, 18000, 'unpaid')); let order = await read(Number(saved.id)); const item = order.items[0];
  const itemsPaid = [{ orderItemId: item.id, menuItemId: id, nama: 'Beras', qty: 250, harga: 18000 }];
  await assert.rejects(recordPayment({ orderId: order.id!, amount: 1, paymentMethod: 'Cash', splitType: 'item', itemsPaid, operatorName: 'Kasir' }), /tidak sesuai/);
  await recordPayment({ orderId: order.id!, amount: 4500, paymentMethod: 'Cash', splitType: 'item', itemsPaid, operatorName: 'Kasir' });
  order = await read(order.id!); assert.equal(order.items[0].paidQty, 250);
  await assert.rejects(recordPayment({ orderId: order.id!, amount: 4500, paymentMethod: 'Cash', splitType: 'item', itemsPaid: [{ ...itemsPaid[0], qty: 251 }], operatorName: 'Kasir' }), /tidak valid/);
  await recordPayment({ orderId: order.id!, amount: 4500, paymentMethod: 'Transfer', splitType: 'item', itemsPaid, operatorName: 'Kasir' }); assert.equal((await read(order.id!)).status, 'paid');
});
test('partial weight returns preserve original lines and update net payment, stock, margin and cash', async () => {
  const { id, shift } = await setup(); const saved = await createOrder(payload(id, 500)); let order = await read(Number(saved.id));
  assert.equal(await returning(order, 250), 4500); order = await read(order.id!);
  assert.equal(order.items[0].qty, 500); assert.equal(order.items[0].refundedQty, 250); assert.equal(order.total, 9000); assert.equal(order.weightRefundAmount, 4500); assert.equal(order.paidAmount, 4500); assert.equal(order.remainingBalance, 0);
  assert.equal((await db.table('menuItems').get(id)).stockQty, 9750); assert.equal((await getShiftLiveStats(shift.id)).expectedCash, 104500);
  assert.deepEqual(weightSalesSummary([order]), { grams: 250, cost: 3000, profit: 1500 });
  await assert.rejects(returning(order, 251), /Berat/);
});
test('repeated small returns conserve every rupiah including order discount, service and tax', async () => {
  const { id } = await setup(1005, 555); const data = payload(id, 3, 1005); data.total = 4; (data as any).tax = 1;
  const saved = await createOrder(data); let order = await read(Number(saved.id)); let total = 0;
  for (let i = 0; i < 3; i++) { total += await returning(order, 1, false); order = await read(order.id!); }
  assert.equal(total, 4); assert.equal(order.paidAmount, 0); assert.equal(order.remainingBalance, 0); assert.equal(order.items[0].refundedQty, 3); assert.equal((await db.table('menuItems').get(id)).stockQty, 9997);
  await assert.rejects(returning(order, 1), /Berat/); assert.equal((await db.table('weightRefunds').toArray()).reduce((n, r) => n + r.amount, 0), 4);
});
test('line allocation and split cumulative rounding conserve original payable total in mixed bills', () => {
  const items = [{ id: 1, saleUnit: 'weight', priceBasis: 1000, hargaSatuan: 1005, qty: 3 }, { id: 2, hargaSatuan: 2000, qty: 1 }]; const order = { total: 1800 };
  let sum = 0; for (let i = 0; i < 3; i++) { sum += weightRefundAmount(order, items, 1, 1); (items[0] as any).refundedQty = i + 1; }
  assert.equal(sum + measuredSplitAmount(order, items, [{ orderItemId: 2, qty: 1 }]), 1800);
});
test('returns in a new shift leave the closed shift record unchanged and debit the current drawer', async () => {
  const { id, shift } = await setup(); const saved = await createOrder(payload(id, 500));
  await closeShift(shift.id, { actualCash: 109000 }); const closed = await db.table('shifts').get(shift.id);
  const next = await openShift({ startingCash: 20000, operatorName: 'Sore' }); await returning(await read(Number(saved.id)), 250);
  assert.deepEqual(await db.table('shifts').get(shift.id), closed); assert.equal((await getShiftLiveStats(next.id)).expectedCash, 15500);
});
test('refund requires an open shift, paid bill and valid weight and never silently restocks', async () => {
  const { id, shift } = await setup(); const saved = await createOrder(payload(id, 500, 18000, 'unpaid')); let order = await read(Number(saved.id)); await assert.rejects(returning(order, 1), /lunas/);
  await recordPayment({ orderId: order.id!, amount: 9000, paymentMethod: 'Cash', splitType: 'full', operatorName: 'Kasir' }); order = await read(order.id!);
  await returning(order, 250, false, 'Transfer'); assert.equal((await db.table('menuItems').get(id)).stockQty, 9500);
  await closeShift(shift.id, { actualCash: 109000 }); await assert.rejects(returning(await read(order.id!), 1), /Buka shift/);
});
test('whole payment refund after weight return cannot return the same money twice', async () => {
  const { id, shift } = await setup(); const saved = await createOrder(payload(id, 500)); let order = await read(Number(saved.id)); await returning(order, 250);
  await refundPartialPayment(order.payments[0].id!, { reason: 'Sisa uang', operator: 'Admin' });
  assert.equal((await getShiftLiveStats(shift.id)).expectedCash, 100000);
  await assert.rejects(returning(await read(order.id!), 1), /lunas/);
});
test('full void after partial return only refunds the remaining payment', async () => {
  const { id, shift } = await setup(); const saved = await createOrder(payload(id, 500)); let order = await read(Number(saved.id)); await returning(order, 250);
  await assert.rejects(processVoidRefund(order.id!, { reason: 'Batal', isRefunded: true, refundAmount: 9000, refundMethod: 'Tunai', operator: 'Admin' }), /melebihi/);
  await processVoidRefund(order.id!, { reason: 'Batal', isRefunded: true, refundAmount: 4500, refundMethod: 'Tunai', operator: 'Admin' }); assert.equal((await getShiftLiveStats(shift.id)).expectedCash, 100000);
});
test('product transfer and full backup restore keep weight units, modal and partial-return ledger', async () => {
  const { id } = await setup(); const saved = await createOrder(payload(id, 500)); await returning(await read(Number(saved.id)), 250);
  const product = await db.table('menuItems').get(id); const exported = makeProductExport([product]); const parsed = parseProductImport(exported); assert.equal(parsed[0].saleUnit, 'weight'); assert.equal(parsed[0].costPrice, 12000);
  const backup = await exportAllData(); await importAllData(backup, { skipPreBackup: true });
  assert.equal((await db.table('menuItems').get(id)).saleUnit, 'weight'); assert.equal((await db.table('menuItems').get(id)).costPrice, 12000); assert.equal(await db.table('weightRefunds').count(), 1); assert.equal((await read(Number(saved.id))).items[0].refundedQty, 250);
  await db.table('menuItems').clear(); await bulkImportMenus(parsed, { mode: 'create_only' }); assert.equal((await db.table('menuItems').toArray())[0].saleUnit, 'weight');
});
test('stock purchase values use the product price basis and stock units cannot be reinterpreted', async () => {
  const { id } = await setup(); await adjustStock({ menuItemId: id, type: 'in', amount: 1250, purchasePrice: 12000, reason: 'Pembelian' });
  const movement = await db.table('inventoryMovements').orderBy('id').last(); assert.equal(movement.totalCost, 15000); assert.equal(movement.balance, 11250);
  await assert.rejects(updateMenu(id, { saleUnit: 'pcs' }), /tidak dapat diubah/); await assert.rejects(updateMenu(id, { costPrice: -1 }), /Modal/);
});
test('missing cost stays unknown, and printed receipts show g/kg rather than pcs', async () => {
  const { id } = await setup(18000, null); const saved = await createOrder(payload(id, 1250)); const order = await read(Number(saved.id));
  assert.deepEqual(weightSalesSummary([order]), { grams: 1250, cost: null, profit: null });
  const receipt = { ...order, items: order.items.map((i: any) => ({ ...i, nama: i.namaMenu, harga: i.hargaSatuan })) };
  assert.match(generateEscPosReceipt(receipt), /1,25 kg Beras Premium/); assert.match(generateReceiptHtml(receipt), /1,25 kg Beras Premium/); assert.match(generateReceiptHtml(receipt), /22.500/);
});
test('additive upgrade from v9 preserves pcs data; v10 refund ledger remains available', async () => {
  await db.delete();
  const legacy = new Dexie(db.name); legacy.version(9).stores(Object.fromEntries(db.tables.filter(t => !['weightRefunds', 'refundEvents'].includes(t.name)).map(t => [t.name, t.schema.primKey.src + (t.schema.indexes.length ? ',' + t.schema.indexes.map(i => i.src).join(',') : '')])));
  await legacy.open(); await legacy.table('menuItems').add({ id: 44, nama: 'Lama', harga: 5000, stockQty: 7, trackStock: true }); legacy.close();
  await db.open(); const product = await db.table('menuItems').get(44); assert.equal(product.stockQty, 7); assert.equal(product.saleUnit, undefined); assert.equal(lineTotal({ ...product, qty: 2 }), 10000); assert.equal(await db.table('weightRefunds').count(), 0);
});

test('upgrade from deployed v10 preserves refund-event content and historical cost', async () => {
  await db.delete(); const legacy = new Dexie(db.name);
  legacy.version(10).stores(Object.fromEntries(db.tables.filter(t => t.name !== 'weightRefunds').map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(i => i.src)].join(',')])));
  await legacy.open(); await legacy.table('refundEvents').add({ id: 1, orderId: 3, amount: 700, idempotencyKey: 'old-return' });
  await legacy.table('orderItems').add({ id: 9, orderId: 3, qty: 2, hargaSatuan: 5000, costPrice: 1000 }); legacy.close(); await db.open();
  assert.equal((await db.table('refundEvents').get(1)).amount, 700); assert.equal((await db.table('orderItems').get(9)).costPrice, 1000); assert.equal(await db.table('weightRefunds').count(), 0);
});

test('concurrent returns reject excess grams and duplicate attempts do not refund twice', async () => {
  const { id } = await setup(); const saved = await createOrder(payload(id, 500)); const order = await read(Number(saved.id));
  const args = { requestId: 'same-return', orderId: order.id!, orderItemId: order.items[0].id!, grams: 300, reason: 'Retur', restock: true, method: 'Cash' as const };
  assert.deepEqual(await Promise.all([refundWeight(args), refundWeight(args)]), [5400, 5400]);
  assert.equal(await db.table('weightRefunds').count(), 1); assert.equal((await db.table('menuItems').get(id)).stockQty, 9800);
  const outcomes = await Promise.allSettled([returning(await read(order.id!), 150), returning(await read(order.id!), 150)]);
  assert.equal(outcomes.filter(o => o.status === 'fulfilled').length, 1); assert.equal((await read(order.id!)).items[0].refundedQty, 450);
});

test('weight guide includes price setup, cashier examples, stock, refund and offline instructions', () => {
  const topic = GUIDE_TOPICS.find(t => t.id === 'weight-sales')!; assert.ok(topic);
  const text = JSON.stringify(topic); for (const term of ['250', '0,5', '1,25', '100 g', 'Modal', 'Stok', 'Pengembalian', 'offline']) assert.ok(text.includes(term), term);
  assert.doesNotMatch(text, /IndexedDB|Dexie|schema|migration|API|backend|frontend|snapshot|precision|v1\.0|P1/);
});
