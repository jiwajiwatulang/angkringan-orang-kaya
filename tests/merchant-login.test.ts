import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';
import { clearDemoForLogin, isMerchantLoginRequest, openMerchantCashier, MERCHANT_LOGIN_URL } from '../src/lib/merchantEntry';
import { checkCashierAccess } from '../src/lib/licenseGuard';
import { activateLicenseServer } from '../src/lib/ordersClient';
import { db } from '../src/lib/dexie';
import { deviceKeyIdentity } from '../src/lib/deviceIdentity';
import { LICENSE_PUBLIC_KEY } from '../src/lib/licenseProtocol';
import { signOfflineLicense } from '../src/lib/server/licenseSigning';
import { testSigningJwk, testPublicJwk } from './securityFixtures';

function store() {
  const values = new Map<string, string>();
  return { values, getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }, removeItem: (key: string) => { values.delete(key); } };
}
test('Login removes demo markers without clearing license, device, or tutorial preferences', () => {
  const storage = store();
  for (const key of ['sakunota_demo_mode', 'sakunota_demo_initialized', 'sakunota_demo_started_at']) storage.setItem(key, 'true');
  for (const key of ['sakunota_license_key', 'sakunota_activation_token', 'sakunota_device_id', 'sakunota_first_run_guide']) storage.setItem(key, 'preserve-me');
  clearDemoForLogin(storage);
  assert.equal(storage.getItem('sakunota_demo_mode'), null);
  assert.equal(storage.getItem('sakunota_demo_initialized'), null);
  assert.equal(storage.getItem('sakunota_demo_started_at'), null);
  assert.equal(storage.values.size, 4);
  assert.ok([...storage.values.values()].every(value => value === 'preserve-me'));
});
test('Login uses a document navigation after clearing demo, including when reused from a demo URL', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const storage = store(); storage.setItem('sakunota_demo_mode', 'true');
  let destination = '';
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { sessionStorage: storage, location: { search: '?demo=true', assign(url: string) { assert.equal(storage.getItem('sakunota_demo_mode'), null); destination = url; } } } });
  try { openMerchantCashier(); assert.equal(destination, MERCHANT_LOGIN_URL); assert.equal(isMerchantLoginRequest('?demo=true&login=true'), true); assert.equal(isMerchantLoginRequest('?demo=true'), false); }
  finally { if (previous) Object.defineProperty(globalThis, 'window', previous); else Reflect.deleteProperty(globalThis, 'window'); }
});
test('blocked storage fails explicitly rather than silently reopening demo', () => {
  assert.throws(() => clearDemoForLogin({ getItem() { return 'true'; }, removeItem() {} }), /Mode demo/);
  assert.throws(() => clearDemoForLogin({ getItem() { return null; }, removeItem() { throw new Error('blocked'); } }), /blocked/);
});
test('an existing 30-day tester returns from demo to licensed cashier offline with the same token and store data', async () => {
  await db.delete(); await db.open();
  const local = store(), session = store();
  const previous = ['window', 'navigator', 'localStorage', 'sessionStorage'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)] as const);
  const originalKey = { ...LICENSE_PUBLIC_KEY }, oldPrivateKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
  const previousFetch = globalThis.fetch;
  let networkCalls = 0;
  try {
    const location = { search: '?demo=true', assign() { this.search = '?login=true'; } };
    Object.defineProperty(globalThis, 'window', { configurable: true, value: { location, localStorage: local, sessionStorage: session } });
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local });
    Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: session });
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } });
    globalThis.fetch = async () => { networkCalls++; throw new Error('offline'); };
    Object.assign(LICENSE_PUBLIC_KEY, testPublicJwk);
    process.env.SAKUNOTA_LICENSE_PRIVATE_JWK = JSON.stringify(testSigningJwk);
    local.setItem('sakunota_license_key', 'SN-LOGIN-TEST'); local.setItem('sakunota_device_id', 'LOGIN-DEVICE');
    const token = signOfflineLicense({ v: 2, licenseKey: 'SN-LOGIN-TEST', deviceId: 'LOGIN-DEVICE', deviceKey: await deviceKeyIdentity(), licenseType: 'tester', expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(), businessName: 'Toko uji', issuedAt: Date.now() });
    local.setItem('sakunota_activation_token', token);
    await db.table('settings').put({ key: 'pos_store_settings', value: { storeName: 'Toko uji tersimpan' } });
    session.setItem('sakunota_demo_mode', 'true');
    assert.equal((await checkCashierAccess()).isDemo, true);
    const denied = await activateLicenseServer('SN-NEW-EXAMPLE');
    assert.equal(denied.success, false); assert.equal(networkCalls, 0, 'activation cannot bind a real license in demo');
    openMerchantCashier();
    const access = await checkCashierAccess();
    assert.equal(access.isDemo, false); assert.equal(access.isValid, true); assert.equal(access.status, 'tester_active');
    assert.equal(local.getItem('sakunota_activation_token'), token);
    assert.equal(local.getItem('sakunota_device_id'), 'LOGIN-DEVICE');
    assert.equal((await db.table('settings').get('pos_store_settings')).value.storeName, 'Toko uji tersimpan');
    assert.equal(networkCalls, 0, 'reopening a valid licensed browser does not require reactivation or internet');
  } finally {
    globalThis.fetch = previousFetch; Object.assign(LICENSE_PUBLIC_KEY, originalKey);
    if (oldPrivateKey === undefined) delete process.env.SAKUNOTA_LICENSE_PRIVATE_JWK; else process.env.SAKUNOTA_LICENSE_PRIVATE_JWK = oldPrivateKey;
    for (const [key, descriptor] of previous) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
