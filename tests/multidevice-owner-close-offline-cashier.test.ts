import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { environment, owner } from './multideviceFixtures';
import { createPairing, requestPairing, approvePairing, saveEmployee, employeeLogin } from '../src/lib/server/multideviceAccess';
import { testDeviceProof } from './securityFixtures';
import { submitEvent, pullEntities } from '../src/lib/server/multideviceSync';
import type { PosCommit, PosTable } from '../src/lib/multidevice/posWire';
import type { AccessClaims } from '../src/lib/multidevice/protocol';

function makeCommit(claims: AccessClaims, rows: { table: PosTable; id: string; expectedVersion: number; value: Record<string, any> }[]): PosCommit {
  const commitId = crypto.randomUUID();
  return {
    id: commitId,
    entityId: commitId,
    storeId: claims.storeId,
    deviceId: claims.deviceId,
    operatorId: claims.employeeId || claims.deviceId,
    kind: 'pos.commit',
    data: {
      bootstrap: false,
      rows: rows.map(r => ({
        ...r,
        value: {
          ...r.value,
          mdId: r.id,
          mdStoreId: claims.storeId,
          mdDeviceId: r.value.mdDeviceId || claims.deviceId,
          mdOperatorId: r.value.mdOperatorId || (claims.employeeId || claims.deviceId),
          mdVersion: r.expectedVersion + 1
        }
      }))
    }
  };
}

test('owner closing cashier shift preserves offline cashier sales and cash movements without 409 rejection', { timeout: 30000 }, async () => {
  const env = await environment();
  const primary = await owner(env);

  // 1. Setup Menu Katalog oleh Pemilik
  const menuId1 = crypto.randomUUID();
  const menuId2 = crypto.randomUUID();
  const createMenuCommit = makeCommit(primary.claims, [
    {
      table: 'menuItems',
      id: menuId1,
      expectedVersion: 0,
      value: {
        nama: 'Nasi Kucing Spesial',
        harga: 25000,
        kategori: 'Makanan',
        trackStock: false,
        isSoldOut: false,
        mdCatalogVersion: 1
      }
    },
    {
      table: 'menuItems',
      id: menuId2,
      expectedVersion: 0,
      value: {
        nama: 'Kopi Susu Gula Aren',
        harga: 25000,
        kategori: 'Minuman',
        trackStock: false,
        isSoldOut: false,
        mdCatalogVersion: 1
      }
    }
  ]);
  await submitEvent(env.DB, primary.claims, createMenuCommit);

  // 2. Setup Cashier Device & Employee Session
  const cashierDeviceId = crypto.randomUUID();
  const pair = await createPairing(env, primary.claims);
  const pairData = () => ({ code: pair.code, deviceId: cashierDeviceId, deviceName: 'Tablet Kasir', proof: testDeviceProof('multi.pair', pair.code, cashierDeviceId) });
  await requestPairing(env, pairData());
  await approvePairing(env, primary.claims, pair.id);
  const secondary = await requestPairing(env, pairData());
  if (secondary.pending) throw new Error('Pairing kasir gagal.');

  const empId = crypto.randomUUID();
  await saveEmployee(env, primary.claims, { id: empId, name: 'Kasir Budi', pin: '123456', active: true });
  const cashierSession = await employeeLogin(env, secondary.claims, { id: empId, pin: '123456' });
  const cashierClaims = cashierSession.claims;

  // 3. Kasir membuka shift kasir #1 di server
  const shiftGlobalId = crypto.randomUUID();
  const openShiftCommit = makeCommit(cashierClaims, [
    {
      table: 'shifts',
      id: shiftGlobalId,
      expectedVersion: 0,
      value: {
        startingCash: 100000,
        startTime: '2026-10-29T08:00:00Z',
        status: 'open',
        operatorName: 'Kasir Budi',
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    }
  ]);
  await submitEvent(env.DB, cashierClaims, openShiftCommit);

  // Verifikasi shift terbuka di server
  const entitiesAfterOpen = (await pullEntities(env.DB, cashierClaims, 0)).entities;
  const openShiftEntity = entitiesAfterOpen.find(e => e.kind === 'pos_shifts' && e.id === shiftGlobalId);
  assert.ok(openShiftEntity);
  assert.equal(openShiftEntity.value.status, 'open');

  // 4. Kasir OFFLINE dan mencatat penjualan serta kas keluar di laci
  const orderId1 = crypto.randomUUID();
  const itemId1 = crypto.randomUUID();
  const paymentId1 = crypto.randomUUID();

  const orderId2 = crypto.randomUUID();
  const itemId2 = crypto.randomUUID();
  const paymentId2 = crypto.randomUUID();
  const movementId = crypto.randomUUID();

  // Commit offline kasir 1: Penjualan tunai Rp 25.000
  const cashierOfflineSale1 = makeCommit(cashierClaims, [
    {
      table: 'orders',
      id: orderId1,
      expectedVersion: 0,
      value: {
        receiptNumber: 'NOTA-001',
        total: 25000,
        subtotal: 25000,
        paidAmount: 25000,
        status: 'paid',
        shiftId: shiftGlobalId,
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    },
    {
      table: 'orderItems',
      id: itemId1,
      expectedVersion: 0,
      value: {
        orderId: orderId1,
        menuItemId: menuId1,
        namaMenu: 'Nasi Kucing Spesial',
        qty: 1,
        hargaSatuan: 25000,
        mdCatalogVersion: 1,
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    },
    {
      table: 'payments',
      id: paymentId1,
      expectedVersion: 0,
      value: {
        orderId: orderId1,
        shiftId: shiftGlobalId,
        paymentMethod: 'Cash',
        amount: 25000,
        cashTendered: 25000,
        change: 0,
        status: 'completed',
        paidAt: '2026-10-29T09:00:00Z',
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    }
  ]);

  // Commit offline kasir 2: Penjualan non-tunai QRIS Rp 50.000 dan Kas Keluar Operasional Rp 10.000
  const cashierOfflineSale2 = makeCommit(cashierClaims, [
    {
      table: 'orders',
      id: orderId2,
      expectedVersion: 0,
      value: {
        receiptNumber: 'NOTA-002',
        total: 50000,
        subtotal: 50000,
        paidAmount: 50000,
        status: 'paid',
        shiftId: shiftGlobalId,
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    },
    {
      table: 'orderItems',
      id: itemId2,
      expectedVersion: 0,
      value: {
        orderId: orderId2,
        menuItemId: menuId2,
        namaMenu: 'Kopi Susu Gula Aren',
        qty: 2,
        hargaSatuan: 25000,
        mdCatalogVersion: 1,
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    },
    {
      table: 'payments',
      id: paymentId2,
      expectedVersion: 0,
      value: {
        orderId: orderId2,
        shiftId: shiftGlobalId,
        paymentMethod: 'QRIS',
        amount: 50000,
        status: 'completed',
        proofStatus: 'menunggu_verifikasi',
        paidAt: '2026-10-29T09:30:00Z',
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    },
    {
      table: 'cashMovements',
      id: movementId,
      expectedVersion: 0,
      value: {
        shiftId: shiftGlobalId,
        type: 'out',
        amount: 10000,
        reason: 'Beli plastik dan es batu',
        category: 'operasional',
        timestamp: '2026-10-29T09:40:00Z',
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    }
  ]);

  // 5. Saat kasir masih offline, PEMILIK menutup shift kasir di server
  // Uang fisik dihitung pemilik: Rp 115.000 (sesuai kasir sesungguhnya)
  const ownerCloseCommit = makeCommit(primary.claims, [
    {
      table: 'shifts',
      id: shiftGlobalId,
      expectedVersion: 1,
      value: {
        ...openShiftEntity.value,
        status: 'closed',
        closedBy: 'owner',
        closedByOperator: 'Pak Budi (Pemilik)',
        closureReason: 'Kasir pulang lebih awal karena sakit',
        actualCash: 115000,
        endTime: '2026-10-29T10:00:00Z',
        notes: '[Ditutup Pemilik: Pak Budi (Pemilik)] Alasan: Kasir pulang lebih awal karena sakit',
        mdDeviceId: cashierClaims.deviceId,
        mdOperatorId: cashierClaims.employeeId
      }
    }
  ]);
  await submitEvent(env.DB, primary.claims, ownerCloseCommit);

  // Verifikasi shift telah ditutup di server oleh pemilik
  const entitiesAfterClose = (await pullEntities(env.DB, primary.claims, 0)).entities;
  const closedShiftOnServer = entitiesAfterClose.find(e => e.kind === 'pos_shifts' && e.id === shiftGlobalId);
  assert.ok(closedShiftOnServer);
  assert.equal(closedShiftOnServer.value.status, 'closed');
  assert.equal(closedShiftOnServer.value.closedBy, 'owner');
  // Pada saat pemilik menutup, transaksi offline kasir belum sampai
  assert.equal(closedShiftOnServer.value.expectedCash, 100000); // baru modal awal

  // 6. Kasir KEMBALI ONLINE dan mengirimkan transaksi offline yang tersimpan di outbox
  // Sebelumnya baris ini melempar 409 Conflict ("Mulai shift kasir terlebih dahulu.")
  const ack1 = await submitEvent(env.DB, cashierClaims, cashierOfflineSale1);
  assert.equal(ack1.id, cashierOfflineSale1.id, 'Transaksi offline kasir 1 diterima tanpa penolakan');

  const ack2 = await submitEvent(env.DB, cashierClaims, cashierOfflineSale2);
  assert.equal(ack2.id, cashierOfflineSale2.id, 'Transaksi offline kasir 2 diterima tanpa penolakan');

  // 7. Verifikasi server merekonsiliasi ulang shift yang sudah ditutup
  const finalEntities = (await pullEntities(env.DB, primary.claims, 0)).entities;
  const reconciledShift = finalEntities.find(e => e.kind === 'pos_shifts' && e.id === shiftGlobalId);
  assert.ok(reconciledShift);
  assert.equal(reconciledShift.value.status, 'closed');
  assert.equal(reconciledShift.value.closedBy, 'owner');

  // Penjualan kasir terintegrasi sempurna ke dalam shift tertutup:
  // Modal awal: 100.000
  // Penjualan tunai kasir: 25.000
  // Pengeluaran operasional laci: 10.000
  // Estimasi uang fisik akhir: 100.000 + 25.000 - 10.000 = 115.000
  // Uang fisik dihitung pemilik: 115.000
  // Selisih kas: 115.000 - 115.000 = 0 (PAS / COCOK)
  assert.equal(reconciledShift.value.cashSales, 25000);
  assert.equal(reconciledShift.value.nonCashSales, 50000);
  assert.equal(reconciledShift.value.unverifiedNonCashSales, 50000);
  assert.equal(reconciledShift.value.cashOut, 10000);
  assert.equal(reconciledShift.value.expectedCash, 115000);
  assert.equal(reconciledShift.value.actualCash, 115000);
  assert.equal(reconciledShift.value.cashDifference, 0);

  // 8. Kasir menarik pembaruan dan melihat shift telah tertutup aman
  const cashierPulled = (await pullEntities(env.DB, cashierClaims, 0)).entities;
  const cashierSeenShift = cashierPulled.find(e => e.kind === 'pos_shifts' && e.id === shiftGlobalId);
  assert.ok(cashierSeenShift, 'Kasir dapat melihat shift yang ditutup pemilik');
  assert.equal(cashierSeenShift.value.status, 'closed');
  assert.equal(cashierSeenShift.value.expectedCash, 115000);
});
