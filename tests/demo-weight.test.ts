import 'fake-indexeddb/auto';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import { DEMO_WEIGHT_PRODUCTS, ensureDemoWeightProducts } from '../src/lib/demoWeight';
import { lineTotal, lineCost, parseWeight, validateMeasure } from '../src/lib/weight';

const store = new Dexie('SakuNotaDemoDB');
store.version(1).stores({ menuItems: '++id, sku, urutan', inventoryMovements: '++id, menuItemId', orders: '++id' });
after(() => store.close());

test('Warung and Retail samples demonstrate kg and 100 g with valid stock and cost', () => {
  const expected = { warung: [[250, 12000, 8500], [150, 12000, 7500]], retail: [[500, 9000, 6000], [250, 30000, 20000]] };
  for (const type of ['warung', 'retail'] as const) {
    const products = DEMO_WEIGHT_PRODUCTS[type]; assert.equal(products.length, 2);
    assert.deepEqual(products.map(p => p.priceBasis), [1000, 100]);
    products.forEach((p, i) => {
      validateMeasure(p); const [qty, revenue, cost] = expected[type][i];
      assert.equal(lineTotal({ ...p, qty }), revenue); assert.equal(lineCost({ ...p, qty }), cost);
      assert.equal(p.stockUnit, 'g'); assert.equal(p.saleUnit, 'weight'); assert.equal(p.trackStock, true); assert.ok(p.stockQty! >= qty); assert.equal(p.kategori, 'Barang Timbang');
    });
  }
  assert.equal(parseWeight('0,5', 'kg'), expected.retail[0][0]);
});

test('existing demos gain examples without deleting transactions or other catalog products', async () => {
  await store.delete(); await store.open();
  await store.table('menuItems').add({ sku: 'OLD', nama: 'Barang Lama', urutan: 1 });
  await store.table('orders').add({ total: 7000 });
  assert.equal(await ensureDemoWeightProducts('warung', store), 2);
  assert.equal(await store.table('orders').count(), 1); assert.equal(await store.table('menuItems').count(), 3);
  const rows = await store.table('menuItems').orderBy('urutan').toArray(); assert.equal(rows[0].nama, 'Lauk Ayam Ungkep');
  const movements = await store.table('inventoryMovements').toArray(); assert.equal(movements.length, 2);
  for (const m of movements) { const product = await store.table('menuItems').get(m.menuItemId); assert.equal(m.balance, product.stockQty); assert.equal(m.delta, product.stockQty); }
});

test('reloads and concurrent reads never duplicate examples or reset sold stock and edited prices', async () => {
  const product = await store.table('menuItems').where('sku').equals(DEMO_WEIGHT_PRODUCTS.warung[0].sku!).first();
  await store.table('menuItems').update(product.id, { stockQty: 9750, harga: 50000 });
  assert.deepEqual(await Promise.all([ensureDemoWeightProducts('warung', store), ensureDemoWeightProducts('warung', store)]), [0, 0]);
  const kept = await store.table('menuItems').get(product.id); assert.equal(kept.stockQty, 9750); assert.equal(kept.harga, 50000);
  assert.equal(await store.table('inventoryMovements').count(), 2);
});

test('Retail examples are additive, and Cafe/resto or merchant stores never receive automatic samples', async () => {
  assert.equal(await ensureDemoWeightProducts('retail', store), 2); const count = await store.table('menuItems').count();
  for (const type of ['kafe', 'restoran', 'rental', undefined]) assert.equal(await ensureDemoWeightProducts(type, store), 0);
  assert.equal(await store.table('menuItems').count(), count);
  const merchant = new Dexie('AngkringanDB');
  assert.equal(await ensureDemoWeightProducts('retail', merchant), 0); assert.equal(merchant.isOpen(), false);
  assert.equal(await store.table('orders').count(), 1);
});
