import 'fake-indexeddb/auto';
import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/dexie';
import { DEFAULT_SETTINGS } from '../src/lib/settings';
import { DEFAULT_LABEL_SETTINGS, buildOrderLabels, generateOrderLabelHtml, generateOrderLabelTspl, labelSettings, type LabelOrder } from '../src/lib/orderLabels';
import { printOrderLabels, recentLabelJobs, printSavedOrderLabels, labelOrderSnapshot } from '../src/lib/orderLabelPrinting';
import { createOrder, getOrders, recordPayment } from '../src/lib/api';

beforeEach(async () => { await db.delete(); await db.open(); });
after(() => db.close());
const cfg = { ...DEFAULT_LABEL_SETTINGS, enabled: true };
const settings = { ...DEFAULT_SETTINGS, orderLabel: cfg };
const order = (): LabelOrder => ({ id: 24, customerName: 'Reza', orderType: 'Take Away', createdAt: '2026-10-21T02:00:00Z', items: [
  { menuItemId: 1, namaMenu: 'Matcha Latte', kategoriMenu: 'Minuman', qty: 2, selectedModifiers: [{ optionName: 'Less sugar' }, { optionName: 'Less ice' }] },
  { menuItemId: 2, namaMenu: 'Roti', kategoriMenu: 'Makanan', qty: 1 }
] });

test('one label per cup includes modifiers, identity, and sequence; category filter is exact', () => {
  const labels = buildOrderLabels(order(), { ...cfg, categories: ['Minuman'] });
  assert.equal(labels.length, 2); assert.equal(labels[1].sequence, 2); assert.equal(labels[1].total, 2);
  assert.match(labels[0].lines.join('\n'), /Matcha Latte/); assert.match(labels[0].lines.join('\n'), /Less sugar/);
  assert.match(labels[1].lines.join('\n'), /2\/2/); assert.doesNotMatch(labels[0].lines.join('\n'), /Roti/);
});
test('dimensions and quantities are validated before printing', () => {
  for (const widthMm of [0, -1, NaN, 101]) assert.throws(() => labelSettings({ ...settings, orderLabel: { ...cfg, widthMm } }));
  for (const qty of [0, -1, 0.5, NaN, 201]) assert.throws(() => buildOrderLabels({ ...order(), items: [{ namaMenu: 'Test', qty }] }, cfg));
});
test('HTML uses label-size pages and escapes imported HTML', () => {
  const o = { ...order(), customerName: '<script>bad()</script>', items: [{ namaMenu: '<img src=x>', qty: 1 }] };
  const html = generateOrderLabelHtml(buildOrderLabels(o, { ...cfg, heightMm: 60 }), { ...cfg, heightMm: 60 });
  assert.match(html, /size:50mm 60mm/); assert.doesNotMatch(html, /<script>|<img src/); assert.match(html, /&lt;img/);
});
test('long notes fail clearly rather than silently cutting preparation instructions', () => {
  const o = { ...order(), notes: 'Alergi susu. '.repeat(100) };
  const labels = buildOrderLabels(o, cfg);
  assert.throws(() => generateOrderLabelHtml(labels, cfg), /terlalu panjang/);
  assert.throws(() => generateOrderLabelTspl(labels, cfg), /terlalu panjang/);
});
test('TSPL keeps data in TEXT arguments and emits exactly one PRINT per label', () => {
  const o = { ...order(), customerName: 'A"\r\nPRINT 999,999\x1b', items: [{ namaMenu: 'Kopi', qty: 1 }] };
  const raw = generateOrderLabelTspl(buildOrderLabels(o, cfg), cfg);
  assert.equal(raw.split('\r\n').filter(l => l.startsWith('PRINT ')).length, 1);
  assert.match(raw, /SIZE 50 mm,30 mm/); assert.match(raw, /GAP 2 mm,0 mm/); assert.equal(raw.includes('\x1b'), false);
});
test('reprint, revision, and cancellation labels carry an explicit marker', () => {
  assert.match(buildOrderLabels(order(), cfg, 'reprint')[0].lines[0], /CETAK ULANG/);
  assert.match(buildOrderLabels(order(), cfg, 'changed')[0].lines[0], /PERUBAHAN/);
  assert.match(buildOrderLabels({ ...order(), status: 'void' }, cfg)[0].lines[0], /PEMBATALAN/);
});
test('TSPL rejects unsupported characters instead of dropping preparation instructions', () => {
  const o = { ...order(), customerName: 'お客様' };
  assert.throws(() => generateOrderLabelTspl(buildOrderLabels(o, cfg), cfg), /Gunakan Dialog Sistem/);
  assert.match(generateOrderLabelHtml(buildOrderLabels(o, cfg), cfg), /お客様/);
});
test('disabled feature does not create jobs or invoke printer', async () => {
  let calls = 0;
  await printOrderLabels(order(), DEFAULT_SETTINGS, { transport: async () => { calls++; return 'sent'; } });
  assert.equal(calls, 0); assert.equal((await recentLabelJobs()).length, 0);
});
test('automatic printing is limited to the dedicated Bluetooth route', async () => {
  let calls = 0;
  await printOrderLabels(order(), { ...settings, orderLabel: { ...cfg, automatic: true } }, { automatic: true, transport: async () => { calls++; return 'dialog_opened'; } });
  assert.equal(calls, 0);
});
test('concurrent automatic requests and later payment of the same bill do not duplicate cups', async () => {
  const automatic = { ...settings, orderLabel: { ...cfg, automatic: true, connection: 'bluetooth' as const } };
  let calls = 0;
  const transport = async () => { calls++; return 'sent' as const; };
  await Promise.all([printOrderLabels(order(), automatic, { automatic: true, transport }), printOrderLabels(order(), automatic, { automatic: true, transport })]);
  await printOrderLabels({ ...order(), status: 'paid' }, automatic, { automatic: true, transport });
  assert.equal(calls, 1); assert.equal((await recentLabelJobs())[0].status, 'sent');
});
test('changing an excluded food item does not reprint drink labels automatically', async () => {
  const automatic = { ...settings, orderLabel: { ...cfg, automatic: true, connection: 'bluetooth' as const, categories: ['Minuman'] } };
  let calls = 0; const transport = async () => { calls++; return 'sent' as const; };
  const o = order(); await printOrderLabels(o, automatic, { automatic: true, transport });
  o.items[1].qty++;
  await printOrderLabels(o, automatic, { automatic: true, transport });
  assert.equal(calls, 1);
});
test('manual duplicate is marked reprint; changed order is marked revision', async () => {
  const bodies: string[] = []; const transport = async (html: string) => { bodies.push(html); return 'dialog_opened' as const; };
  await printOrderLabels(order(), settings, { transport });
  await printOrderLabels(order(), settings, { transport });
  await printOrderLabels({ ...order(), notes: 'Tanpa susu' }, settings, { transport });
  assert.match(bodies[1], /CETAK ULANG/); assert.match(bodies[2], /PERUBAHAN/);
  assert.equal((await recentLabelJobs())[0].status, 'dialog_opened');
});
test('printer failure is recorded, never retried automatically, and does not mutate receipts', async () => {
  const saved = await createOrder({ total: 10000, status: 'unpaid', items: [{ menuItemId: 1, namaMenu: 'Kopi', hargaSatuan: 10000, qty: 1 }] });
  await recordPayment({ orderId: saved.id, amount: 10000, paymentMethod: 'Cash', splitType: 'full', operatorName: 'Test' });
  const before = await getOrders();
  const automatic = { ...settings, orderLabel: { ...cfg, automatic: true, connection: 'bluetooth' as const } };
  const o = { ...order(), id: saved.id };
  let calls = 0; const transport = async (): Promise<'sent'> => { calls++; throw new Error('Printer offline'); };
  await assert.rejects(() => printOrderLabels(o, automatic, { automatic: true, transport }), /Pesanan tetap tersimpan/);
  await printOrderLabels(o, automatic, { automatic: true, transport });
  assert.equal(calls, 1); assert.equal((await recentLabelJobs())[0].status, 'failed');
  assert.deepEqual(await getOrders(), before);
});
test('a draft cannot be printed and an empty category match creates no printer job', async () => {
  await assert.rejects(() => printOrderLabels({ ...order(), id: undefined }, settings), /Simpan pesanan/);
  const result = await printOrderLabels(order(), { ...settings, orderLabel: { ...cfg, categories: ['Tidak ada'] } });
  assert.match(result, /Tidak ada item/); assert.equal((await recentLabelJobs()).length, 0);
});
test('saved-label entry point safely ignores automatic printing when disabled', async () => {
  assert.equal(await printSavedOrderLabels(999, DEFAULT_SETTINGS, true), '');
});
test('saved label uses immutable item names and supports legacy items without names', async () => {
  await db.table('menuItems').put({ id: 1, nama: 'Nama katalog baru', kategori: 'Minuman', harga: 10000, isSoldOut: false, urutan: 0 });
  const saved = await createOrder({ total: 10000, status: 'unpaid', items: [{ menuItemId: 1, namaMenu: 'Nama saat pesan', hargaSatuan: 10000, qty: 1 }] });
  assert.equal((await labelOrderSnapshot(saved.id)).items[0].namaMenu, 'Nama saat pesan');
  await db.table('orderItems').where('orderId').equals(saved.id).modify({ namaMenu: undefined, kategoriMenu: undefined });
  const legacy = await labelOrderSnapshot(saved.id);
  assert.equal(legacy.items[0].namaMenu, 'Nama katalog baru'); assert.equal(legacy.items[0].kategoriMenu, 'Minuman');
});
