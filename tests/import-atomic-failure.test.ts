import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { environment, owner } from './multideviceFixtures';
import { setPosScope } from '../src/lib/multidevice/posWire';
import { submitEvent } from '../src/lib/server/multideviceSync';

test('historical import is 100% atomic across multiple chunks; rolls back completely on failure after 100th transaction', { timeout: 30000 }, async () => {
  const env = await environment();
  const o = await owner(env);
  process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE = 'enabled';

  const values = new Map([['sakunota_pos_partition', JSON.stringify({ storeId: o.claims.storeId, deviceId: o.id })]]);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) || null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key)
    }
  });

  const { db } = await import('../src/lib/dexie');
  const api = await import('../src/lib/api');
  setPosScope({ claims: o.claims, access: o.access, operatorName: 'Pemilik' });

  try {
    // 1. Siapkan 120 transaksi (tiap transaksi memiliki 2 item = 4 baris per transaksi)
    // Total baris transaksi = 120 * 4 = 480 baris.
    // Dengan MAX_ROWS_PER_CHUNK = 400, transaksi terbagi menjadi 2 chunk:
    // Chunk 1: 100 transaksi (400 baris)
    // Chunk 2: 20 transaksi (80 baris)
    const transactions = Array.from({ length: 120 }, (_, i) => ({
      receiptNumber: `NOTA-MIG-${String(i + 1).padStart(4, '0')}`,
      createdAt: new Date(Date.UTC(2025, 0, 1, 10, Math.floor(i / 60), i % 60)).toISOString(),
      total: 30000,
      paymentMethod: 'Cash' as const,
      items: [
        { nama: `Item A-${i + 1}`, qty: 1, harga: 20000 },
        { nama: `Item B-${i + 1}`, qty: 1, harga: 10000 }
      ]
    }));

    // 2. Simulasikan kegagalan pada transaksi ke-105 (di dalam Chunk ke-2)
    const origAdd = db.table('orders').add;
    let addCount = 0;
    (db.table('orders') as any).add = function (item: any, key?: any) {
      addCount++;
      if (addCount === 105) {
        throw new Error('Simulasi kegagalan penyimpanan pada transaksi ke-105');
      }
      return origAdd.call(this, item, key);
    };

    // Eksekusi impor yang gagal di chunk 2
    await assert.rejects(
      api.importHistoricalTransactions(transactions),
      /Simulasi kegagalan penyimpanan pada transaksi ke-105/
    );

    // Kembalikan method asli
    (db.table('orders') as any).add = origAdd;

    // 3. Verifikasi ROLLBACK ATOMIK TOTAL:
    // Chunk 1 (100 transaksi) yang sempat ditulis sebelumnya HARUS BERSIH tanpa jejak
    assert.equal(await db.table('orders').count(), 0, 'Semua orders harus di-rollback (0 tersisa)');
    assert.equal(await db.table('orderItems').count(), 0, 'Semua orderItems harus di-rollback (0 tersisa)');
    assert.equal(await db.table('payments').count(), 0, 'Semua payments harus di-rollback (0 tersisa)');
    assert.equal(await db.table('posOutbox').count(), 0, 'Semua event posOutbox harus di-rollback (0 tersisa)');
    const auditLogs = await db.table('auditLogs').where('action').equals('MIGRATION').toArray();
    assert.equal(auditLogs.length, 0, 'Audit log migrasi tidak boleh tercatat bila impor gagal');

    // 4. Impor ulang 120 transaksi yang sama secara bersih tanpa kegagalan
    const cleanResult = await api.importHistoricalTransactions(transactions);
    assert.equal(cleanResult.importedCount, 120);
    assert.equal(cleanResult.skippedCount, 0);

    assert.equal(await db.table('orders').count(), 120);
    assert.equal(await db.table('orderItems').count(), 240); // 120 * 2
    assert.equal(await db.table('payments').count(), 120);

    // Verifikasi pemecahan chunk pada posOutbox mematuhi batas row budget (maks 400 baris <= 600)
    // 2 chunk pesanan + 1 audit log migrasi
    const outboxRows = await db.table('posOutbox').orderBy('ordinal').toArray();
    assert.equal(outboxRows.length, 3, 'Harus terbagi menjadi 2 chunk pesanan + 1 event audit log');
    for (const outbox of outboxRows) {
      const rowCount = outbox.event.data.rows.length;
      assert.ok(rowCount <= 400, `Jumlah baris pengiriman (${rowCount}) harus <= 400 baris (jauh di bawah 600)`);
    }

    // 5. Seluruh outbox tersinkronisasi bersih ke server tanpa penolakan 413
    for (const outbox of outboxRows) {
      const ack = await submitEvent(env.DB, o.claims, outbox.event);
      assert.equal(ack.id, outbox.id);
      await db.table('posOutbox').delete(outbox.id);
    }
    assert.equal(await db.table('posOutbox').count(), 0);

    // 6. Uji Idempotensi: Mengirim ulang 120 transaksi yang sama harus melewati semuanya tanpa duplikasi
    const retryResult = await api.importHistoricalTransactions(transactions);
    assert.equal(retryResult.importedCount, 0);
    assert.equal(retryResult.skippedCount, 120);
    assert.equal(await db.table('orders').count(), 120);
    assert.equal(await db.table('orderItems').count(), 240);
    assert.equal(await db.table('payments').count(), 120);
    assert.equal(await db.table('posOutbox').count(), 0);

    // 7. Uji transaksi dengan banyak rincian barang (banyak baris)
    // 5 transaksi dengan masing-masing 20 item = (1 + 20 + 1) = 22 baris per transaksi
    const multiItemTransactions = Array.from({ length: 5 }, (_, i) => ({
      receiptNumber: `NOTA-MULTI-${i + 1}`,
      createdAt: `2025-01-02T10:0${i}:00Z`,
      total: 200000,
      paymentMethod: 'Cash' as const,
      items: Array.from({ length: 20 }, (_, j) => ({
        nama: `Menu Rincian ${j + 1}`,
        qty: 1,
        harga: 10000
      }))
    }));

    const multiRes = await api.importHistoricalTransactions(multiItemTransactions);
    assert.equal(multiRes.importedCount, 5);
    const newOutbox = await db.table('posOutbox').toArray();
    for (const ob of newOutbox) {
      assert.ok(ob.event.data.rows.length <= 400, 'Baris tetap berada di bawah 400 baris');
    }
  } finally {
    setPosScope(undefined);
    await db.delete();
  }
});
