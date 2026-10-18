import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { db } from '../src/lib/dexie';
import { configureStock, adjustStock } from '../src/lib/inventory';
import { createOrder, updateOrder, voidOrder, exportAllData, importAllData, deleteOrders, getMenus, resetDemoSandbox, openShift, closeShift, getActiveShift, getShiftLiveStats, refundPartialPayment, recordPayment } from '../src/lib/api';
import { setupHardwareBarcodeScanner } from '../src/lib/barcodeScanner';
import Dexie from 'dexie';
import { buildSalesSeries, selectDashboardOrders } from '../src/lib/dashboardMetrics';
import { createD1NodeAdapter } from '../src/lib/server/d1';
import worker from '../src/worker';
import { activateLicenseServer } from '../src/lib/ordersClient';
import { checkCashierAccess } from '../src/lib/licenseGuard';

test('retail: quantities, atomic checkout, reservations, concurrent sales, cancellation and backup', async () => {
  await db.delete(); await db.open();
  const id = Number(await db.table('menuItems').add({ nama: 'Beras', harga: 10000, kategori: 'Retail', urutan: 0, isSoldOut: false }));
  await db.table('menuItems').add({ nama: 'Beras', sku: 'VARIANT-2', harga: 15000, kategori: 'Retail', urutan: 1 });
  assert.equal((await getMenus()).length, 2, 'reading catalog must not delete products with the same name');
  await assert.rejects(() => resetDemoSandbox(), /database demo/);
  await configureStock(id, 10, 2);
  const item = { id, nama: 'Beras', harga: 10000, qty: 2 };
  const order = await createOrder({ idempotencyKey: 'stock-1', total: 20000, status: 'unpaid', items: [item] });
  assert.equal((await db.table('menuItems').get(id)).stockQty, 8);
  await createOrder({ idempotencyKey: 'stock-1', total: 20000, status: 'unpaid', items: [item] });
  assert.equal((await db.table('menuItems').get(id)).stockQty, 8, 'double tap must not reduce stock twice');
  await updateOrder(Number(order.id), { total: 30000, status: 'unpaid', items: [{ ...item, qty: 3 }] });
  assert.equal((await db.table('menuItems').get(id)).stockQty, 7);
  await voidOrder(Number(order.id), 'Pesanan batal');
  assert.equal((await db.table('menuItems').get(id)).stockQty, 10);
  await assert.rejects(() => voidOrder(Number(order.id), 'double void'));
  const countBefore = await db.table('orders').count();
  await assert.rejects(() => createOrder({ total: 110000, items: [{ ...item, qty: 11 }] }), /tidak mencukupi/);
  assert.equal(await db.table('orders').count(), countBefore, 'insufficient stock rolls back the entire order');
  const sales = await Promise.allSettled([1, 2].map(n => createOrder({ idempotencyKey: `race-${n}`, total: 60000, items: [{ ...item, qty: 6 }] })));
  assert.equal(sales.filter(s => s.status === 'fulfilled').length, 1, 'concurrent sales cannot oversell');
  assert.equal((await db.table('menuItems').get(id)).stockQty, 4);
  await assert.rejects(() => adjustStock({ menuItemId: id, type: 'count', amount: 9, reason: 'opname', expectedBalance: 10 }), /berubah/);
  await adjustStock({ menuItemId: id, type: 'count', amount: 3, reason: 'Opname fisik', expectedBalance: 4 });
  await adjustStock({ menuItemId: id, type: 'in', amount: 2, reason: 'Pembelian pemasok' });
  await adjustStock({ menuItemId: id, type: 'out', amount: 1, reason: 'Rusak' });
  assert.equal((await db.table('menuItems').get(id)).stockQty, 4);
  const backup = await exportAllData();
  assert.ok(backup.inventoryMovements.length > 0);
  await importAllData(backup, { skipPreBackup: true });
  assert.equal((await db.table('menuItems').get(id)).stockQty, 4);
  assert.equal(await db.table('inventoryMovements').count(), backup.inventoryMovements.length);
  const paymentId = Number(await db.table('payments').add({ orderId: order.id }));
  await db.table('paymentProofs').add({ paymentId, orderId: order.id });
  await deleteOrders([Number(order.id)]);
  assert.equal(await db.table('paymentProofs').where('orderId').equals(Number(order.id)).count(), 0);
  await db.close();
});

test('dashboard: full 24 hours, full month, local dates, paid sales only', () => {
  const now = new Date(2026, 9, 18, 15);
  const orders = [
    { status: 'paid', total: 10000, createdAt: new Date(2026, 9, 18, 1).toISOString() },
    { status: 'paid', total: 20000, createdAt: new Date(2026, 9, 18, 23).toISOString() },
    { status: 'unpaid', total: 999999, createdAt: now.toISOString() },
    { status: 'void', total: 999999, createdAt: now.toISOString() },
    { status: 'paid', isRefunded: true, total: 999999, createdAt: now.toISOString() },
  ];
  const selected = selectDashboardOrders(orders, 'today', now).currentOrders;
  assert.equal(selected.length, 2);
  const points = buildSalesSeries(selected, 'today', now);
  assert.equal(points.length, 12);
  assert.equal(points[0].omzet, 10000);
  assert.equal(points[11].omzet, 20000);
  assert.equal(points.reduce((sum, p) => sum + p.omzet, 0), 30000);
  assert.equal(buildSalesSeries([], 'thisMonth', now).length, 18);
  assert.equal(buildSalesSeries([], '7days', now).length, 7);
});

test('IndexedDB schema 8 upgrades to 9 without losing existing merchant data', async () => {
  await db.delete();
  const legacy = new Dexie(db.name);
  const stores = Object.fromEntries(db.tables.filter(t => t.name !== 'inventoryMovements').map(t => [t.name, [t.schema.primKey.src, ...t.schema.indexes.map(index => index.src)].join(',')]));
  legacy.version(8).stores(stores); await legacy.open();
  await legacy.table('menuItems').add({ id: 99, nama: 'Produk sebelum update', harga: 5000, kategori: 'Retail', urutan: 0, isSoldOut: false });
  await legacy.table('orders').add({ id: 88, status: 'paid', total: 5000, createdAt: new Date().toISOString() });
  legacy.close(); await db.open();
  assert.equal(db.verno, 9);
  assert.equal((await db.table('menuItems').get(99)).nama, 'Produk sebelum update');
  assert.equal((await db.table('orders').get(88)).total, 5000);
  assert.equal(await db.table('inventoryMovements').count(), 0);
  assert.equal((await db.table('menuItems').get(99)).trackStock, undefined, 'existing products are not forced to zero stock');
  db.close();
});

test('cash drawer: refunds are subtracted once and belong to the refund shift', async () => {
  await db.delete(); await db.open();
  const openings = await Promise.allSettled([1, 2].map(() => openShift({ operatorName: 'Kasir Uji', startingCash: 100000 })));
  assert.equal(openings.filter(r => r.status === 'fulfilled').length, 1, 'only one active shift can open');
  const firstShift = (await getActiveShift())!;
  const order = await createOrder({ total: 50000, paymentMethod: 'Cash', items: [{ id: 777, nama: 'Produk Uji', harga: 50000, qty: 1 }] });
  const payment = await db.table('payments').where('orderId').equals(Number(order.id)).first();
  assert.equal((await getShiftLiveStats(firstShift.id!)).expectedCash, 150000);
  await refundPartialPayment(payment.id, { reason: 'Refund uji', operator: 'Admin' });
  assert.equal((await getShiftLiveStats(firstShift.id!)).expectedCash, 100000, 'cash received and returned cancel exactly once');
  const unpaid = await createOrder({ total: 50000, status: 'unpaid', items: [{ id: 777, nama: 'Produk Uji', harga: 50000, qty: 1 }] });
  await assert.rejects(() => recordPayment({ orderId: Number(unpaid.id), amount: NaN, paymentMethod: 'Cash', splitType: 'full', operatorName: 'Test' }), /tidak valid/);
  await updateOrder(Number(unpaid.id), { total: 50000, status: 'paid', paymentMethod: 'Cash', cashTendered: 60000, items: [{ id: 777, nama: 'Produk Uji', harga: 50000, qty: 1 }] });
  const payment2 = await db.table('payments').where('orderId').equals(Number(unpaid.id)).first();
  assert.equal(payment2.cashTendered, 60000, 'open bill payment retains actual cash tendered');
  assert.equal(payment2.change, 10000);
  const closes = await Promise.allSettled([1, 2].map(() => closeShift(firstShift.id!, { actualCash: 150000 })));
  assert.equal(closes.filter(r => r.status === 'fulfilled').length, 1, 'double closing is rejected');
  const secondShift = await openShift({ operatorName: 'Kasir Malam', startingCash: 150000 });
  await refundPartialPayment(payment2.id, { reason: 'Refund shift berikutnya', operator: 'Admin' });
  assert.equal((await getShiftLiveStats(secondShift.id)).expectedCash, 100000);
  assert.equal((await getShiftLiveStats(firstShift.id!)).expectedCash, 150000, 'previous shift must not change after later refund');
  await closeShift(secondShift.id, { actualCash: 100000 });
  await db.close();
});

test('barcode HID: scanner works without stealing normal form input', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  let handler: ((event: any) => void) | undefined;
  const scans: string[] = [];
  try {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { addEventListener: (_: string, fn: any) => { handler = fn; }, removeEventListener: () => { handler = undefined; } } });
    const dispose = setupHardwareBarcodeScanner(code => scans.push(code));
    function send(key: string, tagName: string) { handler!({ key, target: { tagName, dataset: {} }, preventDefault() {}, stopPropagation() {} }); }
    for (const key of ['R', 'e', 'z', 'a', 'Enter']) send(key, 'INPUT');
    assert.equal(scans.length, 0);
    for (const key of ['0', '0', '1', '2', '3', 'Enter']) send(key, 'BODY');
    assert.deepEqual(scans, ['00123']); dispose(); assert.equal(handler, undefined);
  } finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else delete (globalThis as any).window; }
});

test('activation client caches trial metadata and blocks incomplete/expired offline trials', async () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => values.delete(key) };
  const previous = ['window', 'navigator', 'localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const realFetch = globalThis.fetch;
  try {
    Object.defineProperty(globalThis, 'window', { value: { location: { search: '' }, localStorage: storage }, configurable: true });
    Object.defineProperty(globalThis, 'navigator', { value: { onLine: false }, configurable: true });
    Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
    Object.defineProperty(globalThis, 'sessionStorage', { value: { getItem: () => null }, configurable: true });
    globalThis.fetch = (async () => Response.json({ success: true, activationToken: 'test-activation-token', licenseType: 'trial', businessName: 'Uji Offline', expiresAt: new Date(Date.now()+86400000).toISOString() })) as typeof fetch;
    assert.equal((await activateLicenseServer('SN-TRIAL-LOCAL')).success, true);
    assert.equal(values.get('sakunota_license_type'), 'trial');
    assert.equal((await checkCashierAccess()).status, 'trial_active');
    values.delete('sakunota_trial_expires_at');
    assert.equal((await checkCashierAccess()).isValid, false);
    values.set('sakunota_trial_expires_at', 'invalid date');
    assert.equal((await checkCashierAccess()).isValid, false);
    values.set('sakunota_trial_expires_at', new Date(Date.now()-1000).toISOString());
    assert.equal((await checkCashierAccess()).status, 'trial_expired');
    values.set('sakunota_license_type', 'berbayar'); values.delete('sakunota_activation_token');
    assert.equal((await checkCashierAccess()).isValid, false);
  } finally {
    globalThis.fetch = realFetch;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; }
  }
});

test('Worker HTTP: owner auth, license checkout, signed webhook, duplicate and delayed notifications', async () => {
  const env = { DB: createD1NodeAdapter(':memory:'), ASSETS: { fetch: async () => new Response('asset') }, SAKUNOTA_OWNER_USERNAME: 'LocalOwner', SAKUNOTA_OWNER_PASSWORD: 'Local-test-only!', SAKUNOTA_OWNER_SALT: 'local-test-salt', SAKUNOTA_OWNER_JWT_SECRET: 'local-test-jwt', SAKUNOTA_SERVER_SECRET: 'local-test-license', MIDTRANS_SERVER_KEY: 'SB-local-test-only', MIDTRANS_CLIENT_KEY: 'SB-client-local' };
  async function call(path: string, body?: unknown, token?: string) {
    const response = await worker.fetch(new Request('http://localhost'+path, { method: body === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) }), env, {});
    return { status: response.status, body: await response.json() as any };
  }
  assert.equal((await call('/api/owner/metrics')).status, 401);
  assert.equal((await call('/api/owner/verify', { orderId: 'ANY-ORDER' })).status, 401);
  assert.equal((await call('/api/owner/beta', { action: 'approve', registrationId: 'ANY-REGISTRATION' })).status, 401);
  assert.equal((await call('/api/owner/beta', { action: 'convert', registrationId: 'ANY-REGISTRATION' })).status, 401);
  const login = await call('/api/owner/login', { username: 'LocalOwner', password: 'Local-test-only!' });
  assert.equal(login.status, 200); assert.ok(login.body.token);
  const token = login.body.token;
  const config = await call('/api/owner/secrets', undefined, token);
  assert.equal(config.status, 200); assert.equal(config.body.configured.MIDTRANS_SERVER_KEY, true);
  assert.equal(JSON.stringify(config.body).includes('SB-local-test-only'), false, 'browser must never receive server secrets');
  const created = await call('/api/orders/create', { buyerName: 'Pembeli Uji', businessName: 'Toko Lokal', whatsapp: '081234567890' });
  assert.equal(created.status, 201);
  const order = created.body.order; assert.equal(order.amount, 50000);
  const realFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async (url: any) => {
      assert.match(String(url), /^https:\/\/app.sandbox.midtrans.com\/snap\/v1\/transactions$/);
      return Response.json({ token: 'sandbox-mocked-token', redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/local-test' });
    }) as typeof fetch;
    const snap = await call('/api/payment/snap', { orderId: order.orderId, accessCode: order.accessCode });
    assert.equal(snap.status, 200); assert.equal(snap.body.token, 'sandbox-mocked-token');
  } finally { globalThis.fetch = realFetch; }
  const notify = (amount = '50000.00', transaction_status = 'settlement') => {
    const payload = { order_id: order.orderId, status_code: '200', gross_amount: amount, transaction_status, signature_key: '' };
    payload.signature_key = crypto.createHash('sha512').update(payload.order_id+payload.status_code+payload.gross_amount+env.MIDTRANS_SERVER_KEY).digest('hex');
    return payload;
  };
  assert.equal((await call('/api/payment/midtrans', { ...notify(), signature_key: 'forged' })).status, 403);
  assert.equal((await call('/api/payment/midtrans', notify('50000.49'))).status, 400);
  const settlements = await Promise.all([call('/api/payment/midtrans', notify()), call('/api/payment/midtrans', notify())]);
  assert.ok(settlements.every(result => result.status === 200));
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS count FROM Licenses WHERE orderId = ?').bind(order.orderId).first<{count: number}>())!.count, 1);
  const first = await call('/api/orders/check', { orderId: order.orderId, accessCode: order.accessCode });
  assert.equal(first.body.order.status, 'lunas_lisensi_terbit');
  const key = first.body.order.licenseKey; assert.ok(key);
  assert.equal((await call('/api/payment/midtrans', notify())).status, 200);
  await call('/api/payment/midtrans', notify('50000.00', 'expire'));
  const final = await call('/api/orders/check', { orderId: order.orderId, accessCode: order.accessCode });
  assert.equal(final.body.order.status, 'lunas_lisensi_terbit'); assert.equal(final.body.order.licenseKey, key);
  const activated = await call('/api/license/activate', { licenseKey: key, deviceId: 'LOCAL-DEVICE', deviceName: 'Test browser' });
  assert.equal(activated.status, 200); assert.equal(activated.body.licenseType, 'berbayar'); assert.ok(activated.body.activationToken);
  assert.equal((await call('/api/license/activate', { licenseKey: key, deviceId: 'OTHER-DEVICE' })).status, 409);
  const registration = await call('/api/beta/register', { ownerName: 'Tester Lokal', businessName: 'Toko Beta', whatsapp: '081234567891', honeypot: '' });
  assert.equal(registration.status, 201);
  const betaId = registration.body.registration.registrationId;
  const approval = await call('/api/owner/beta', { action: 'approve', registrationId: betaId }, token);
  assert.equal(approval.status, 200);
  const trialKey = approval.body.registration.licenseKey;
  const trial = await call('/api/license/activate', { licenseKey: trialKey, deviceId: 'BETA-LOCAL' });
  assert.equal(trial.status, 200); assert.equal(trial.body.licenseType, 'trial'); assert.ok(trial.body.expiresAt);
  assert.equal(new Date(trial.body.expiresAt).getTime() - new Date(trial.body.activatedAt).getTime(), 7*86400000);
  await call('/api/owner/logout', {}, token);
  assert.equal((await call('/api/owner/metrics', undefined, token)).status, 401);
});
