import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/dexie';
import { createMenu, updateMenu, bulkImportMenus, getMenus, exportAllData, importAllData, getCashierOrders, getOrders, openShift } from '../src/lib/api';
import { makeProductExport, parseProductImport } from '../src/lib/productTransfer';
import { validateProductPhoto } from '../src/lib/productPhoto';
import { requireMerchantAdmin, verifyMerchantPin } from '../src/lib/merchantAccess';
import { createAdminSession, destroyAdminSession, verifyAdminSession } from '../src/lib/session';

const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=';

test('product images: portable JSON, full restore, photo preservation, variants and stock ledger', async () => {
  await db.delete(); await db.open();
  const id = Number(await createMenu({ nama: 'Kopi', sku: 'KOPI-A', harga: 12000, kategori: 'Minuman', imageData: photo }));
  await updateMenu(id, { harga: 15000 });
  assert.equal((await db.table('menuItems').get(id)).imageData, photo);
  await bulkImportMenus([{ nama: 'Kopi', sku: 'KOPI-A', harga: 16000 }], { mode: 'upsert' });
  assert.equal((await db.table('menuItems').get(id)).imageData, photo, 'Excel/CSV metadata updates do not erase photos');
  const products = makeProductExport(await getMenus());
  assert.equal(products.products[0].imageData, photo);
  const backup = await exportAllData();
  await db.table('menuItems').clear();
  await importAllData(JSON.parse(JSON.stringify(backup)));
  assert.equal((await getMenus())[0].imageData, photo, 'full backup restores embedded image bytes');
  await db.table('menuItems').clear();
  const rows = parseProductImport(JSON.parse(JSON.stringify(products)));
  rows.push({ ...rows[0], sku: 'KOPI-B', harga: 20000, trackStock: true, stockQty: 4, minimumStock: 1 });
  await bulkImportMenus(rows, { mode: 'upsert' });
  const imported = await getMenus();
  assert.equal(imported.length, 2, 'two SKUs with the same name remain separate products');
  assert.ok(imported.every(p => p.imageData === photo));
  const tracked = imported.find(p => p.sku === 'KOPI-B');
  assert.equal(tracked.stockQty, 4);
  assert.equal(await db.table('inventoryMovements').where('menuItemId').equals(tracked.id).count(), 1);
  await bulkImportMenus([{ ...tracked, stockQty: 999, harga: 21000 }], { mode: 'upsert' });
  assert.equal((await db.table('menuItems').get(tracked.id)).stockQty, 4, 'metadata import never overwrites live tracked stock');
  await updateMenu(tracked.id, { imageData: null });
  assert.equal((await db.table('menuItems').get(tracked.id)).imageData, null);
});

test('product images: reject external/blob/SVG/oversize/invalid data before changing products', async () => {
  for (const invalid of ['https://example.com/a.png', 'blob:local-only', 'data:image/svg+xml;base64,PHN2Zy8+', 'data:image/png;base64,bm90LWEtcG5n', 'data:image/png;base64,' + 'A'.repeat(400000)]) assert.throws(() => validateProductPhoto(invalid));
  const before = await db.table('menuItems').count();
  await assert.rejects(bulkImportMenus([{ nama: 'Invalid', harga: 1, imageData: 'blob:bad' }], { mode: 'upsert' }));
  assert.equal(await db.table('menuItems').count(), before);
  assert.throws(() => parseProductImport({ appName: 'SakuNota', format: 'sakunota-products', version: 1, products: [{ nama: 'Bad', harga: -1, kategori: 'A' }] }));
  const backup = await exportAllData();
  backup.menus[0].imageData = 'https://example.com/a.png';
  await assert.rejects(importAllData(backup));
  assert.equal(await db.table('menuItems').count(), before);
});

test('cashier scope: unpaid carry-over and current shift only, no closed/historical/void orders', async () => {
  await db.delete(); await db.open();
  const shift = await openShift({ operatorName: 'Rina', startingCash: 10000 });
  for (const row of [
    { status: 'paid', shiftId: shift.id }, { status: 'paid', shiftId: 999 },
    { status: 'unpaid', shiftId: 999 }, { status: 'paid', shiftId: shift.id, isHistorical: true }, { status: 'void', shiftId: shift.id },
  ]) await db.table('orders').add({ ...row, total: 1000 });
  const visible = await getCashierOrders();
  assert.equal(visible.length, 2);
  assert.ok(visible.some(o => o.status === 'unpaid'));
  assert.ok(visible.filter(o => o.status === 'paid').every(o => o.shiftId === shift.id));
});

test('Admin actions: PIN required, one-action approval, stale tab cannot revoke new session, and PIN cooldown', async () => {
  await db.delete(); await db.open();
  await db.table('settings').put({ key: 'pos_store_settings', value: { adminPin: '9876' } });
  const storage = new Map<string, string>();
  const mockStorage = { getItem: (k: string) => storage.get(k) ?? null, setItem: (k: string, v: string) => storage.set(k, v), removeItem: (k: string) => storage.delete(k) };
  const globals = globalThis as any;
  globals.window = {}; globals.sessionStorage = mockStorage; globals.localStorage = mockStorage;
  try {
    await assert.rejects(createMenu({ nama: 'Forbidden', harga: 1, kategori: 'A' }), /Admin/);
    await assert.rejects(getOrders(), /Admin/);
    await requireMerchantAdmin('9876');
    assert.equal(await verifyAdminSession(), false, 'one-action approval does not grant a backoffice session');
    const oldToken = await createAdminSession();
    await createAdminSession();
    const newToken = storage.get('sakunota_admin_session_token')!;
    storage.set('sakunota_admin_session_token', oldToken);
    assert.equal(await verifyAdminSession(), false);
    storage.set('sakunota_admin_session_token', newToken);
    assert.equal(await verifyAdminSession(), true);
    await createMenu({ nama: 'Allowed', harga: 1, kategori: 'A' });
    await destroyAdminSession();
    await assert.rejects(exportAllData(), /Admin/);
    for (let i = 0; i < 5; i++) assert.equal(await verifyMerchantPin('wrong'), false);
    await assert.rejects(verifyMerchantPin('9876'), /dikunci/);
  } finally { delete globals.window; delete globals.sessionStorage; delete globals.localStorage; }
});
