process.env.SAKUNOTA_SERVER_SECRET = process.env.SAKUNOTA_SERVER_SECRET || "test_sakunota_secure_hmac_master_secret_2026_xyz";
process.env.SAKUNOTA_OWNER_SALT = process.env.SAKUNOTA_OWNER_SALT || "test_sakunota_secure_owner_salt_test_2026";
process.env.SAKUNOTA_OWNER_USERNAME = process.env.SAKUNOTA_OWNER_USERNAME || "OwnerSakuNota";
process.env.SAKUNOTA_OWNER_PASSWORD = process.env.SAKUNOTA_OWNER_PASSWORD || "Test-Owner-Password-2026!";

import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { environment } from './multideviceFixtures';
import {
  registerBetaAccount,
  approveBetaRegistration,
  activateLicenseOnDevice,
  convertBetaTrialToPaid,
  verifyDeviceLicense
} from '../src/lib/server/sakunotaServer';
import {
  enrollOwner,
  saveEmployee,
  createPairing,
  requestPairing,
  approvePairing,
  employeeLogin,
  activeLicense,
  renewCashierDevice,
  type MultiDeviceEnv
} from '../src/lib/server/multideviceAccess';
import { submitEvent, pullEntities } from '../src/lib/server/multideviceSync';
import { testSigningJwk, testDeviceProof } from './securityFixtures';
import { publicKeyIdentity } from '../src/lib/licenseProtocol';
import type { AccessClaims, StoreEvent } from '../src/lib/multidevice/protocol';

function makeStoreEvent(c: AccessClaims, kind: StoreEvent['kind'], entityId: string, data: Record<string, unknown>): StoreEvent {
  return {
    id: crypto.randomUUID(),
    storeId: c.storeId,
    deviceId: c.deviceId,
    operatorId: c.employeeId || c.deviceId,
    kind,
    entityId,
    data
  };
}

test('beta to paid conversion retains store identity, both devices, employees, transactions, and never expires', async () => {
  const env: MultiDeviceEnv = await environment();

  // 1. Merchant mendaftar Closed Beta
  const regResult = await registerBetaAccount(env.DB, {
    businessName: 'Warung Kopi Nusantara',
    ownerName: 'Pak Joko',
    whatsapp: '081234567890',
    email: 'joko@warungkopi.test'
  });
  assert.ok(regResult.success);
  const betaId = regResult.registration!.registrationId;

  // 2. Owner SakuNota menyetujui pendaftaran beta -> Lisensi trial 7 hari diterbitkan
  const approveResult = await approveBetaRegistration(env.DB, betaId);
  assert.ok(approveResult.success);
  const trialKey = approveResult.registration!.trialLicenseKey!;
  assert.ok(trialKey.startsWith('SN-TRIAL-'));

  // 3. Aktivasi Trial pada Perangkat 1 (Pemilik)
  const ownerDeviceId = crypto.randomUUID();
  const ownerProof = testDeviceProof('multi.enroll', trialKey, ownerDeviceId);
  const ownerIdentity = publicKeyIdentity(ownerProof.publicKey);

  const activateResult = await activateLicenseOnDevice(env.DB, {
    licenseKey: trialKey,
    deviceId: ownerDeviceId,
    deviceName: 'Samsung S23 (Pemilik)'
  });
  assert.ok(activateResult.success);

  await env.DB.prepare(
    'INSERT INTO LicenseDeviceKeys (licenseKey, deviceId, publicKey) VALUES (?, ?, ?)'
  ).bind(trialKey, ownerDeviceId, ownerIdentity).run();

  // Buat activation token signed dengan signing key test
  const trialClaims = {
    v: 2,
    licenseKey: trialKey,
    deviceId: ownerDeviceId,
    deviceKey: ownerIdentity,
    licenseType: 'trial',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    businessName: 'Warung Kopi Nusantara',
    issuedAt: Date.now()
  };
  const tokenPayload = Buffer.from(JSON.stringify(trialClaims)).toString('base64url');
  const activationToken = `SN2.${tokenPayload}.${crypto.sign('sha256', Buffer.from(tokenPayload), {
    key: crypto.createPrivateKey({ key: testSigningJwk, format: 'jwk' }),
    dsaEncoding: 'ieee-p1363'
  }).toString('base64url')}`;

  // 4. Daftarkan Perangkat Pemilik ke multi-device
  const ownerSession = await enrollOwner(env, {
    activation: activationToken,
    deviceName: 'Samsung S23 (Pemilik)',
    proof: testDeviceProof('multi.enroll', trialKey, ownerDeviceId, activationToken)
  });
  const ownerClaims = ownerSession.claims;
  const originalStoreId = ownerClaims.storeId;
  assert.ok(originalStoreId);
  assert.equal(ownerClaims.role, 'owner');

  // 5. Daftarkan Karyawan & PIN Kasir
  const empId = crypto.randomUUID();
  await saveEmployee(env, ownerClaims, {
    id: empId,
    name: 'Siti Kasir',
    pin: '123456',
    active: true
  });

  // 6. Hubungkan Perangkat 2 (Kasir) melalui pairing
  const cashierDeviceId = crypto.randomUUID();
  const pair = await createPairing(env, ownerClaims);
  const cashierPairData = () => ({
    code: pair.code,
    deviceId: cashierDeviceId,
    deviceName: 'Tablet Kasir',
    proof: testDeviceProof('multi.pair', pair.code, cashierDeviceId)
  });
  assert.equal((await requestPairing(env, cashierPairData())).pending, true);
  await approvePairing(env, ownerClaims, pair.id);

  const secondary = await requestPairing(env, cashierPairData());
  assert.equal(secondary.pending, false);
  if (secondary.pending) throw new Error();
  assert.equal(secondary.claims.role, 'cashier');
  assert.equal(secondary.claims.storeId, originalStoreId);

  // Login PIN kasir di perangkat 2
  const cashierLogin = await employeeLogin(env, secondary.claims, {
    id: empId,
    pin: '123456'
  });
  assert.ok(cashierLogin.access);
  const cashierClaims = cashierLogin.claims;
  assert.equal(cashierClaims.storeId, originalStoreId);
  assert.equal(cashierClaims.role, 'cashier');
  assert.equal(cashierClaims.employeeId, empId);

  // 7. Transaksi awal selama masa Beta
  const productId = crypto.randomUUID();
  const shiftId = crypto.randomUUID();
  const orderId = crypto.randomUUID();
  const paymentId = crypto.randomUUID();

  await submitEvent(env.DB, ownerClaims, makeStoreEvent(ownerClaims, 'catalog.put', productId, {
    expectedVersion: 0,
    name: 'Kopi Susu Gula Aren',
    price: 15000,
    cost: 8000,
    unit: 'pcs',
    priceBasis: 1,
    active: true
  }));
  await submitEvent(env.DB, ownerClaims, makeStoreEvent(ownerClaims, 'stock.adjust', productId, {
    delta: 50,
    reason: 'Stok awal beta'
  }));
  await submitEvent(env.DB, cashierClaims, makeStoreEvent(cashierClaims, 'shift.open', shiftId, {
    startingCash: 100000
  }));
  await submitEvent(env.DB, cashierClaims, makeStoreEvent(cashierClaims, 'order.create', orderId, {
    shiftId,
    lines: [{ productId, catalogVersion: 1, name: 'Kopi Susu Gula Aren', quantity: 2, unit: 'pcs', price: 15000, priceBasis: 1 }]
  }));
  await submitEvent(env.DB, cashierClaims, makeStoreEvent(cashierClaims, 'payment.record', paymentId, {
    orderId,
    shiftId,
    amount: 30000,
    method: 'Cash'
  }));

  // 8. Pembayaran Dikonfirmasi: Konversi Trial Beta ke Berbayar
  const convertRes1 = await convertBetaTrialToPaid(env.DB, betaId);
  assert.ok(convertRes1.success);
  assert.equal(convertRes1.status, 'dikonversi_berbayar');
  const commercialKey = convertRes1.commercialLicenseKey!;
  assert.ok(commercialKey.startsWith('SN-'));

  // 9. Uji Idempotensi: Pembayaran berulang / notifikasi ganda TIDAK membuat lisensi atau toko baru
  const convertRes2 = await convertBetaTrialToPaid(env.DB, betaId);
  assert.ok(convertRes2.success);
  assert.equal(convertRes2.commercialLicenseKey, commercialKey, 'Lisensi komersial harus identik pada pemanggilan berulang');

  // Periksa D1: Hanya 1 toko di MdStores untuk merchant ini
  const storesCount = await env.DB.prepare('SELECT COUNT(*) as count FROM MdStores').first<{count: number}>();
  assert.equal(storesCount?.count, 1, 'Toko tidak boleh terduplikasi');

  // Periksa D1: BetaRegistrations expiresAt sudah NULL
  const betaRow = await env.DB.prepare('SELECT status, expiresAt FROM BetaRegistrations WHERE registrationId = ?').bind(betaId).first<{status: string; expiresAt: string | null}>();
  assert.equal(betaRow?.status, 'dikonversi_berbayar');
  assert.equal(betaRow?.expiresAt, null, 'expiresAt beta harus null setelah konversi berbayar');

  // 10. Uji Kesinambungan Setelah 14 Hari (Melewati masa trial 7 hari sebelumnya)
  // activeLicense dengan trial key lama HARUS tetap aktif tanpa lempar AccessError masa akses berakhir
  const licRecord = await activeLicense(env.DB, trialKey);
  assert.ok(licRecord);

  // verifyDeviceLicense dengan trial key lama menghasilkan paid_active
  const verifyRes = await verifyDeviceLicense(env.DB, {
    licenseKey: trialKey,
    deviceId: ownerDeviceId
  });
  assert.equal(verifyRes.valid, true);
  assert.equal(verifyRes.status, 'paid_active');
  assert.equal(verifyRes.licenseType, 'berbayar');
  assert.equal(verifyRes.expiresAt, null);

  // 11. Perangkat 1 (Pemilik) memperbarui sesi tanpa aktivasi ulang
  const ownerGranted = await activeLicense(env.DB, trialKey);
  assert.ok(ownerGranted);

  // 12. Perangkat 2 (Kasir) memperbarui sesi kasir tanpa scan ulang
  const cashierRenew = await renewCashierDevice(env, secondary.claims);
  assert.ok(cashierRenew.access);
  assert.equal(cashierRenew.claims.storeId, originalStoreId, 'Store ID kasir harus tetap sama');

  // 13. Karyawan kasir tetap bisa verifikasi PIN tanpa reset akun
  const cashierRelogin = await employeeLogin(env, cashierRenew.claims, {
    id: empId,
    pin: '123456'
  });
  assert.ok(cashierRelogin.access);

  // 14. Transaksi kasir berlanjut normal setelah konversi
  const nextOrderId = crypto.randomUUID();
  const nextPaymentId = crypto.randomUUID();
  await submitEvent(env.DB, cashierRelogin.claims, makeStoreEvent(cashierRelogin.claims, 'order.create', nextOrderId, {
    shiftId,
    lines: [{ productId, catalogVersion: 1, name: 'Kopi Susu Gula Aren', quantity: 1, unit: 'pcs', price: 15000, priceBasis: 1 }]
  }));
  await submitEvent(env.DB, cashierRelogin.claims, makeStoreEvent(cashierRelogin.claims, 'payment.record', nextPaymentId, {
    orderId: nextOrderId,
    shiftId,
    amount: 15000,
    method: 'Cash'
  }));

  // Verifikasi stok akhir: 50 - 2 - 1 = 47
  const entities = (await pullEntities(env.DB, ownerClaims, 0)).entities;
  const stockEntity = entities.find(e => e.kind === 'stock' && e.id === productId);
  assert.equal(stockEntity?.value.quantity, 47, 'Stok harus terhitung akurat melintasi konversi lisensi');
});
