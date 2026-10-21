import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/dexie';
import { createOrder, updateOrder, recordPayment, voidOrder, exportAllData, importAllData } from '../src/lib/api';
import { productNameFromText, validateRetailDraft } from '../src/lib/retailDraft';
import { closeOwnDialog } from '../src/lib/dialogCancel';
import { photoRecognitionReady, supportsPhotoRecognition, preparePhotoRecognition } from '../src/lib/retailPhotoRecognition';
import fs from 'node:fs';
import { validGtin, referenceByBarcode, referenceSuggestions, referenceDisplayName, type ReferencePack } from '../src/lib/productReference';
const referencePack: ReferencePack = JSON.parse(fs.readFileSync('public/product-reference/indonesia-v1.json', 'utf8'));

test('Offline reference snapshot has provenance, distinct valid GTINs, and no merchant prices or images', () => {
  assert.equal(referencePack.license, 'ODbL-1.0');
  assert.match(referencePack.source, /Open Food Facts/);
  assert.ok(referencePack.products.length >= 100);
  assert.equal(new Set(referencePack.products.map(p => p.code.padStart(14, '0'))).size, referencePack.products.length);
  for (const product of referencePack.products) {
    assert.ok(validGtin(product.code)); assert.ok(product.name && product.brand);
    assert.ok(!('harga' in product)); assert.ok(!('imageData' in product));
  }
  assert.equal(validGtin('0000000000000'), false);
  assert.equal(validGtin('8996001600268'), false);
  assert.equal(referenceByBarcode(referencePack.products, '089686010947')?.code, '0089686010947');
});

test('Packaging reference suggestions require brand and variant evidence and reject conflicting sizes', () => {
  const products = referencePack.products;
  const matches = referenceSuggestions(products, 'INDOMIE\nMI GORENG ORIGINAL\nNETTO 85 g');
  assert.ok(matches.some(p => p.code === '0089686010947'));
  assert.ok(!matches.some(p => /jumbo/i.test(p.name)));
  assert.ok(referenceSuggestions(products, 'INDOMLE GORENG ORIGINAL 85g').some(p => p.code === '0089686010947'), 'one OCR letter error can suggest, never auto-confirm');
  assert.deepEqual(referenceSuggestions(products, 'komposisi gula tepung garam'), []);
  assert.deepEqual(referenceSuggestions(products, 'INDOMIE'), []);
  assert.ok(referenceSuggestions(products, 'INDOMIE GORENG').length > 1, 'ambiguous variants remain choices');
  assert.equal(referenceDisplayName({ code: '', name: 'Indomie Mi Goreng', brand: 'Indofood, indomie', quantity: '85 g' }), 'Indomie Mi Goreng 85 g');
  assert.equal(referenceDisplayName({ code: '', name: 'Air Mineral 1 L', brand: 'Aqua', quantity: '1000 ml' }), 'Aqua Air Mineral 1 L');
});

test('Reference barcode remains a draft until full payment, then persists as a scannable catalog SKU', async () => {
  await db.delete(); await db.open();
  const sku = '0089686010947';
  const item = { ...draft('Indomie Mi Goreng Original 85 g'), pendingRetailProduct: { nama: 'Indomie Mi Goreng Original 85 g', harga: 2000, sku } };
  const order = await createOrder({ total: 2000, status: 'unpaid', items: [item] });
  await pay(Number(order.id), 1000); assert.equal(await db.table('menuItems').count(), 0);
  await pay(Number(order.id), 1000);
  const product = await db.table('menuItems').where('sku').equals(sku).first();
  assert.equal(product?.nama, 'Indomie Mi Goreng Original 85 g');
  assert.equal(product?.trackStock, false);
  await createOrder({ total: 2000, status: 'paid', items: [{ ...item, pendingRetailProduct: { ...item.pendingRetailProduct, sku: '089686010947' } }] });
  assert.equal(await db.table('menuItems').count(), 1, 'equivalent UPC/EAN does not make another product');
  assert.throws(() => validateRetailDraft({ nama: 'Palsu', harga: 2000, sku: '0089686010948' }), /Barcode/);
});

const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';
const draft = (nama = 'Kopi Instan Original 20 g', id = -1) => ({ id, nama, harga: 2000, qty: 1, kategori: 'Retail', pendingRetailProduct: { nama, harga: 2000, imageData: photo } });
const pay = (orderId: number, amount: number) => recordPayment({ orderId, amount, paymentMethod: 'Cash', splitType: 'partial', operatorName: 'Kasir' });

test('Retail gallery cancel and nested camera cancel preserve the parent dialog; its own cancel closes it', () => {
  const dialog = new EventTarget(), fileInput = new EventTarget(), cameraDialog = new EventTarget();
  let closed = 0, prevented = 0, stopped = 0;
  for (const target of [fileInput, cameraDialog, dialog]) {
    closeOwnDialog({ target, currentTarget: dialog, preventDefault: () => prevented++, stopPropagation: () => stopped++ }, () => closed++);
    assert.equal(closed, target === dialog ? 1 : 0);
  }
  assert.equal(prevented, 3); assert.equal(stopped, 3);
});

test('Retail recognition distinguishes supported but unprepared devices; interrupted preparation never becomes ready', async () => {
  const originals = new Map(['window', 'navigator', 'caches', 'fetch'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const records = new Map<string, Response>();
  const cachesMock = { open: async () => ({ match: async (url: string) => records.get(url), put: async (url: string, value: Response) => { records.set(url, value); } }) };
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { isSecureContext: true, caches: cachesMock, Worker: class {}, WebAssembly } });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { serviceWorker: {} } });
    Object.defineProperty(globalThis, 'caches', { configurable: true, value: cachesMock });
    assert.equal(supportsPhotoRecognition(), true);
    assert.equal(await photoRecognitionReady(), false, 'not prepared does not mean unsupported');
    const names = ['worker.min.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'eng.traineddata.gz'];
    const bytes = new TextEncoder().encode('test asset');
    const hash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex');
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: async (url: string) => {
      if (url.endsWith('manifest.json')) return Response.json({ assets: names.map(name => ({ url: '/retail-photo/v1/'+name, bytes: bytes.length, sha256: hash })) });
      if (url.endsWith(names[1])) throw new Error('Network interrupted');
      return new Response(bytes);
    } });
    await assert.rejects(() => preparePhotoRecognition(() => {}), /Network interrupted/);
    assert.equal(records.size, 0); assert.equal(await photoRecognitionReady(), false);
    names.forEach(name => records.set('/retail-photo/v1/'+name, new Response('cached')));
    assert.equal(await photoRecognitionReady(), false, 'downloaded assets need a successful device check');
    records.set('/retail-photo/v1/ready.json', new Response('1'));
    assert.equal(await photoRecognitionReady(), true);
  } finally {
    for (const [key, descriptor] of originals) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});

test('Retail: catalog and payment commit together, duplicate retries reuse the catalog', async () => {
  await db.delete(); await db.open();
  const item = draft();
  const result = await createOrder({ total: 2000, status: 'paid', items: [item], idempotencyKey: 'retail-paid' });
  assert.equal(await db.table('menuItems').count(), 1);
  const product = await db.table('menuItems').toCollection().first();
  assert.equal(product.imageData, photo); assert.equal(product.trackStock, false);
  const sold = await db.table('orderItems').where('orderId').equals(Number(result.id)).first();
  assert.equal(sold.menuItemId, product.id); assert.equal(sold.pendingRetailProduct, undefined);
  await createOrder({ total: 2000, status: 'paid', items: [item], idempotencyKey: 'retail-paid' });
  await Promise.all([1, 2].map(n => createOrder({ total: 2000, status: 'paid', items: [draft('  kopi instan original 20 g  ', -n - 2)] })));
  assert.equal(await db.table('menuItems').count(), 1);
  assert.equal(await db.table('orders').count(), 3);
});

test('Retail: unpaid drafts survive backup/edit; only full repayment adds catalog, void does not', async () => {
  await db.delete(); await db.open();
  const saved = await createOrder({ total: 2000, status: 'unpaid', items: [draft()] });
  const id = Number(saved.id);
  assert.equal(await db.table('menuItems').count(), 0);
  await updateOrder(id, { total: 4000, status: 'unpaid', items: [{ ...draft(), qty: 2 }] });
  const backup = await exportAllData(); await importAllData(backup, { skipPreBackup: true });
  assert.equal((await db.table('orderItems').where('orderId').equals(id).first()).pendingRetailProduct.imageData, photo);
  await pay(id, 2000); assert.equal(await db.table('menuItems').count(), 0);
  await pay(id, 2000); assert.equal(await db.table('menuItems').count(), 1);
  await assert.rejects(() => pay(id, 2000), /lunas/);
  const cancelled = await createOrder({ total: 2000, status: 'unpaid', items: [draft('Barang Dibatalkan', -4)] });
  await voidOrder(Number(cancelled.id), 'Batal');
  assert.equal(await db.table('menuItems').count(), 1);
});

test('Retail: failing stock or invalid draft rolls back both order and new catalog', async () => {
  await db.delete(); await db.open();
  const existing = Number(await db.table('menuItems').add({ nama: 'Beras', harga: 5000, kategori: 'Retail', isSoldOut: false, urutan: 1, trackStock: true, stockQty: 0 }));
  await assert.rejects(() => createOrder({ total: 7000, status: 'paid', items: [draft(), { id: existing, nama: 'Beras', harga: 5000, qty: 1 }] }), /tidak mencukupi/);
  assert.equal(await db.table('menuItems').count(), 1); assert.equal(await db.table('orders').count(), 0);
  await assert.rejects(() => createOrder({ total: 2000, items: [{ ...draft(), qty: 0 }] }), /belum lengkap/);
  await assert.rejects(() => createOrder({ total: 2000, items: [draft('Beras')] }), /sudah ada/);
  assert.equal(await db.table('orders').count(), 0);
  for (const harga of [0, -1, 1.5, Infinity]) assert.throws(() => validateRetailDraft({ nama: 'Kopi', harga }));
  assert.throws(() => validateRetailDraft({ nama: 'Kopi', harga: 2000, imageData: 'https://external.test/a.jpg' }));
});

test('Retail: packaging suggestion excludes technical scores and common ingredient footer', () => {
  assert.equal(productNameFromText('KOPI INSTAN\nORIGINAL 20 g\nKomposisi gula kopi'), 'KOPI INSTAN ORIGINAL 20 g');
  assert.equal(productNameFromText('123\n%\n'), '');
});
