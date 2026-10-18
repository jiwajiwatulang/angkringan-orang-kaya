import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/dexie';
import { DEFAULT_SETTINGS, saveStoreSettingsAsync } from '../src/lib/settings';
import { openShift } from '../src/lib/api';
import { endWaiterSession, startWaiterSession, submitWaiterOrder } from '../src/lib/waiter';
import { getWaiterSession, WAITER_SESSION_KEY } from '../src/lib/waiterSession';
import { canOpenStoreOnboarding } from '../src/lib/onboarding';

test('onboarding is restricted to active licensed, trial and tester access; demo never opens it', () => {
  for (const status of ['paid_active', 'trial_active', 'tester_active'] as const) {
    assert.equal(canOpenStoreOnboarding({ isValid: true, isDemo: false, status }), true);
    assert.equal(canOpenStoreOnboarding({ isValid: true, isDemo: true, status }), false);
    assert.equal(canOpenStoreOnboarding({ isValid: false, isDemo: false, status }), false);
  }
  assert.equal(canOpenStoreOnboarding({ isValid: true, isDemo: false, status: 'unregistered' }), false);
});

test('waiter: assigned tables, variants, inventory, retry safety, no payment and PIN exit', async () => {
  await db.delete(); await db.open();
  await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, serviceMode: 'resto', adminPin: '9876', enableTax: true, taxPercent: 10, enableService: true, servicePercent: 5, taxAppliesToService: true });
  const tableId = Number(await db.table('tables').add({ nomor: 'A1', status: 'kosong' }));
  const otherId = Number(await db.table('tables').add({ nomor: 'A2', status: 'kosong' }));
  const menuItemId = Number(await db.table('menuItems').add({ nama: 'Kopi', kategori: 'Minuman', harga: 10000, isSoldOut: false, urutan: 0, trackStock: true, stockQty: 5, modifiers: [{ id: 'size', nama: 'Ukuran', required: true, minSelect: 1, maxSelect: 1, options: [{ id: 'large', nama: 'Besar', harga: 2000 }] }] }));
  await assert.rejects(startWaiterSession('Ari', [tableId]), /Admin/);
  await db.table('settings').put({ key: WAITER_SESSION_KEY, value: { name: 'Ari', tableIds: [tableId], startedAt: '2026-10-18T00:00:00Z' } });
  const lines = [{ menuItemId, qty: 2, choices: { size: ['large'] } }];
  await assert.rejects(submitWaiterOrder(otherId, lines, '', 'outside'), /di luar/);
  await assert.rejects(submitWaiterOrder(tableId, lines, '', 'no-shift'), /shift/);
  await openShift({ operatorName: 'Kasir', startingCash: 100000 });
  await assert.rejects(submitWaiterOrder(tableId, [{ menuItemId, qty: 1, choices: {} }], '', 'no-variant'), /Ukuran/);
  await assert.rejects(submitWaiterOrder(tableId, [{ menuItemId, qty: -1, choices: { size: ['large'] } }], '', 'negative'), /Jumlah/);
  const results = await Promise.all([submitWaiterOrder(tableId, lines, 'Tanpa sedotan', 'same-request'), submitWaiterOrder(tableId, lines, 'Tanpa sedotan', 'same-request')]);
  assert.equal(results[0].id, results[1].id);
  assert.equal(await db.table('orders').count(), 1);
  const order = await db.table('orders').get(results[0].id);
  assert.equal(order.status, 'unpaid');
  assert.equal(order.total, 27720);
  assert.equal(order.paidAmount, 0);
  assert.equal(order.customerName, 'Pelayan: Ari');
  assert.equal(order.notes, 'Tanpa sedotan');
  assert.equal(await db.table('payments').count(), 0);
  assert.equal((await db.table('menuItems').get(menuItemId)).stockQty, 3);
  assert.equal((await db.table('tables').get(tableId)).status, 'open');
  assert.equal(await endWaiterSession('bad'), false);
  assert.ok(await getWaiterSession());
  assert.equal(await endWaiterSession('9876'), true);
  assert.equal(await getWaiterSession(), null);
  await assert.rejects(submitWaiterOrder(tableId, lines, '', 'after-exit'), /di luar/);
});

test('waiter exit rate-limits wrong PIN attempts and preserves the locked session', async () => {
  await db.table('settings').put({ key: WAITER_SESSION_KEY, value: { name: 'Ari', tableIds: [1], startedAt: 'now' } });
  for (let i = 0; i < 5; i++) assert.equal(await endWaiterSession('bad'), false);
  await assert.rejects(endWaiterSession('9876'), /5 menit/);
  assert.ok(await getWaiterSession());
  await db.table('settings').delete(WAITER_SESSION_KEY);
});
