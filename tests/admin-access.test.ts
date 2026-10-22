import 'fake-indexeddb/auto';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { db } from '../src/lib/dexie';
import { createAdminSession, verifyAdminSession, destroyAdminSession, SESSION_DURATION_MS } from '../src/lib/session';
import { verifyMerchantPin } from '../src/lib/merchantAccess';
import { DEFAULT_SETTINGS, saveStoreSettingsAsync, getStoreSettings } from '../src/lib/settings';
import { hasSavedLicense, isDemoMode, preserveDemoUrl, workspaceHref } from '../src/lib/demoMode';
import { checkCashierAccess } from '../src/lib/licenseGuard';
import { deviceKeyIdentity } from '../src/lib/deviceIdentity';
import { LICENSE_PUBLIC_KEY } from '../src/lib/licenseProtocol';
import { signOfflineLicense } from '../src/lib/server/licenseSigning';
import { testSigningJwk, testPublicJwk } from './securityFixtures';
import { exportAllData, importAllData } from '../src/lib/api';

after(() => db.close());
function browser() {
  const values = new Map<string, string>(), session = new Map<string, string>();
  const storage = (map: Map<string, string>) => ({ getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => map.set(k, v), removeItem: (k: string) => map.delete(k) });
  const local = storage(values), tab = storage(session), location = new URL('https://sakunota.my.id/pos');
  const old = new Map(['window', 'localStorage', 'sessionStorage', 'navigator'].map(k => [k, Object.getOwnPropertyDescriptor(globalThis, k)]));
  const mockWindow = { location, localStorage: local, history: { state: null, replaceState: (_a: unknown, _b: string, url: string) => { location.href = url; } }, dispatchEvent: () => true };
  for (const [key, value] of Object.entries({ window: mockWindow, localStorage: local, sessionStorage: tab, navigator: { onLine: false } })) Object.defineProperty(globalThis, key, { configurable: true, value });
  return { values, session, local, location, restore: () => { for (const [key, value] of old) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); } } };
}

test('Admin authorization survives navigation/reload for exactly one hour and does not extend itself', async () => {
  await db.delete(); await db.open(); const ctx = browser(); const realNow = Date.now; let now = realNow(); Date.now = () => now;
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' }); assert.equal(await verifyMerchantPin('1234'), true);
    await createAdminSession(); const original = await db.table('settings').get('admin_active_session'); assert.equal(original.value.expiresAt - original.value.issuedAt, 3600000); assert.equal(SESSION_DURATION_MS, 3600000);
    ctx.location.pathname = '/admin'; assert.equal(await verifyAdminSession(), true);
    ctx.location.pathname = '/pos'; now += 3599999; assert.equal(await verifyAdminSession(), true); assert.deepEqual(await db.table('settings').get('admin_active_session'), original);
    now++; assert.equal(await verifyAdminSession(), false); assert.equal(ctx.session.has('sakunota_admin_session_token'), false);
  } finally { Date.now = realNow; ctx.restore(); }
});

test('changing PIN rotates the current session, rejects old PIN, and invalidates old tab tokens', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' }); const old = await createAdminSession();
    await saveStoreSettingsAsync({ ...getStoreSettings(), adminPin: '9876' }, { renewAdminSession: true });
    const current = ctx.session.get('sakunota_admin_session_token'); assert.notEqual(current, old); assert.equal(await verifyAdminSession(), true);
    assert.equal(await verifyMerchantPin('1234'), false); assert.equal(await verifyMerchantPin('9876'), true);
    ctx.session.set('sakunota_admin_session_token', old); assert.equal(await verifyAdminSession(), false);
    ctx.session.set('sakunota_admin_session_token', current!); assert.equal(await verifyAdminSession(), true, 'stale tab did not revoke renewed session');
    await destroyAdminSession(); assert.equal(await verifyAdminSession(), false);
  } finally { ctx.restore(); }
});

test('stale settings cannot restore an old PIN; non-security settings do not revoke a valid session', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' }); const stale = { ...getStoreSettings() }; await createAdminSession();
    await saveStoreSettingsAsync({ ...getStoreSettings(), storeName: 'Toko Baru' }); assert.equal(await verifyAdminSession(), true);
    await saveStoreSettingsAsync({ ...getStoreSettings(), adminPin: '9876' }); assert.equal(await verifyAdminSession(), false);
    await assert.rejects(saveStoreSettingsAsync({ ...stale, storeName: 'Tab Lama' }), /keamanan sudah berubah/);
    assert.equal((await db.table('settings').get('pos_store_settings')).value.adminPin, '9876'); assert.equal(getStoreSettings().adminPin, '9876');
  } finally { ctx.restore(); }
});

test('a failed PIN write leaves the previous PIN, cached settings and session intact', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  const rejectWrite = (_changes: unknown, key: unknown) => { if (key === 'pos_store_settings') throw new Error('simulated storage failure'); };
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' }); await createAdminSession();
    db.table('settings').hook('updating', rejectWrite);
    await assert.rejects(saveStoreSettingsAsync({ ...getStoreSettings(), adminPin: '9876' }, { renewAdminSession: true }), /storage failure/);
    db.table('settings').hook('updating').unsubscribe(rejectWrite);
    assert.equal(getStoreSettings().adminPin, '1234'); assert.equal((await db.table('settings').get('pos_store_settings')).value.adminPin, '1234'); assert.equal(await verifyAdminSession(), true);
  } finally { db.table('settings').hook('updating').unsubscribe(rejectWrite); ctx.restore(); }
});

test('recovery credential rotation also invalidates the old session token', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234', recoveryCodeHash: 'old-recovery-test' }); const old = await createAdminSession();
    await saveStoreSettingsAsync({ ...getStoreSettings(), recoveryCodeHash: 'new-recovery-test' }, { renewAdminSession: true }); const latest = ctx.session.get('sakunota_admin_session_token')!;
    assert.equal(await verifyAdminSession(), true); ctx.session.set('sakunota_admin_session_token', old); assert.equal(await verifyAdminSession(), false);
    ctx.session.set('sakunota_admin_session_token', latest); assert.equal(await verifyAdminSession(), true);
  } finally { ctx.restore(); }
});

test('backup restore cannot replace the local credential revision or revive a stale PIN form', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' }); const stale = { ...getStoreSettings() };
    await saveStoreSettingsAsync({ ...getStoreSettings(), adminPin: '9876' }, { renewAdminSession: true });
    const revision = getStoreSettings().credentialRevision; const backup = await exportAllData(); assert.equal(backup.settings.credentialRevision, undefined);
    backup.settings.credentialRevision = stale.credentialRevision ?? 'from-another-device'; backup.settings.adminPin = '0000';
    await importAllData(backup, { skipPreBackup: true });
    const restored = (await db.table('settings').get('pos_store_settings')).value; assert.equal(restored.adminPin, '9876'); assert.equal(restored.credentialRevision, revision);
    await assert.rejects(saveStoreSettingsAsync({ ...stale, storeName: 'Old form after restore' }), /keamanan sudah berubah/);
  } finally { ctx.restore(); }
});

test('direct credential changes and legacy/forged session timestamps cannot preserve Admin access', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' }); const token = await createAdminSession();
    await db.table('settings').update('pos_store_settings', { 'value.adminPin': '4321' }); assert.equal(await verifyAdminSession(), false);
    ctx.session.set('sakunota_admin_session_token', token); ctx.local.setItem('adminLoginExpiry', String(Date.now() + 86400000)); assert.equal(await verifyAdminSession(), false);
    await createAdminSession(); const entry = await db.table('settings').get('admin_active_session'); delete entry.value.credentialHash; await db.table('settings').put(entry); assert.equal(await verifyAdminSession(), false);
  } finally { ctx.restore(); }
});

test('concurrent wrong PIN attempts count atomically and enforce the five-attempt cooldown', async () => {
  await db.delete(); await db.open(); const ctx = browser();
  try {
    await saveStoreSettingsAsync({ ...DEFAULT_SETTINGS, adminPin: '1234' });
    assert.deepEqual(await Promise.all(Array.from({ length: 5 }, () => verifyMerchantPin('0000'))), [false, false, false, false, false]);
    assert.equal((await db.table('settings').get('admin_pin_attempts')).value.attempts, 5); await assert.rejects(verifyMerchantPin('1234'), /dikunci/);
  } finally { ctx.restore(); }
});

test('saved licenses always take priority over demo URL and stale demo flags; public demo keeps its own links', () => {
  const ctx = browser();
  try {
    ctx.location.search = '?demo=true'; assert.equal(isDemoMode(), true); assert.equal(workspaceHref('/admin'), '/admin?demo=true'); assert.equal(workspaceHref('/admin/menu?tab=stock'), '/admin/menu?tab=stock&demo=true');
    ctx.session.set('sakunota_demo_mode', 'true'); ctx.session.set('sakunota_demo_initialized', 'true'); ctx.local.setItem('sakunota_license_key', 'SN-ACTIVE');
    assert.equal(hasSavedLicense(), true); assert.equal(isDemoMode(), false); assert.equal(workspaceHref('/admin'), '/admin'); assert.equal(workspaceHref('/admin', true), '/admin'); preserveDemoUrl(); assert.equal(ctx.location.search, ''); assert.equal(ctx.session.has('sakunota_demo_mode'), false); assert.equal(ctx.session.has('sakunota_demo_initialized'), false);
    ctx.values.delete('sakunota_license_key'); ctx.local.setItem('sakunota_activation_token', 'pending-upgrade'); ctx.location.search = '?demo=true'; assert.equal(isDemoMode(), false);
  } finally { ctx.restore(); }
});

test('cold page load chooses merchant storage for a saved license before importing the demo database', () => {
  for (const licensed of [true, false]) {
    const script = `
      import 'fake-indexeddb/auto';
      const local = { getItem: key => ${licensed} && key === 'sakunota_license_key' ? 'SN-COLD' : null };
      globalThis.window = { location: { search: '?demo=true' }, localStorage: local };
      globalThis.localStorage = local;
      globalThis.sessionStorage = { getItem: key => key === 'sakunota_demo_mode' ? 'true' : null };
      const module = await import('./src/lib/dexie.ts');
      const database = module.db ?? module.default.db;
      process.stdout.write(database.name);
      database.close();
    `;
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], { cwd: process.cwd(), encoding: 'utf8', timeout: 15000 });
    assert.equal(child.status, 0, child.stderr); assert.equal(child.stdout, licensed ? 'AngkringanDB' : 'SakuNotaDemoDB');
  }
});

test('demo query cannot bypass signed/offline entitlement, expired tester, revoked or unsigned activation', async () => {
  await db.delete(); await db.open(); const ctx = browser(); const original = { ...LICENSE_PUBLIC_KEY }; const oldFetch = globalThis.fetch;
  Object.assign(LICENSE_PUBLIC_KEY, testPublicJwk); process.env.SAKUNOTA_LICENSE_PRIVATE_JWK = JSON.stringify(testSigningJwk);
  try {
    ctx.location.search = '?demo=true'; ctx.session.set('sakunota_demo_mode', 'true'); ctx.values.set('sakunota_license_key', 'SN-MODE'); ctx.values.set('sakunota_device_id', 'DEVICE-MODE');
    const claims = { v: 2 as const, licenseKey: 'SN-MODE', deviceId: 'DEVICE-MODE', deviceKey: await deviceKeyIdentity(), licenseType: 'berbayar' as const, expiresAt: null, businessName: 'Toko', issuedAt: Date.now() };
    ctx.values.set('sakunota_activation_token', signOfflineLicense(claims)); let access = await checkCashierAccess(); assert.equal(access.isDemo, false); assert.equal(access.status, 'paid_active');
    ctx.values.set('sakunota_activation_token', signOfflineLicense({ ...claims, licenseType: 'tester', expiresAt: '2000-01-01T00:00:00Z' })); access = await checkCashierAccess(); assert.equal(access.isDemo, false); assert.equal(access.status, 'tester_expired');
    ctx.values.set('sakunota_activation_token', signOfflineLicense(claims)); Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } }); globalThis.fetch = async () => Response.json({ valid: false, status: 'revoked' }); access = await checkCashierAccess(true); assert.equal(access.isDemo, false); assert.equal(access.status, 'revoked');
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: false } }); assert.equal((await checkCashierAccess()).isValid, false);
    ctx.values.delete('sakunota_license_rejected'); ctx.values.set('sakunota_activation_token', 'UNSIGNED'); access = await checkCashierAccess(); assert.equal(access.isDemo, false); assert.equal(access.isValid, false);
  } finally { globalThis.fetch = oldFetch; Object.assign(LICENSE_PUBLIC_KEY, original); ctx.restore(); }
});
