import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import test from 'node:test';
import { db } from '../src/lib/dexie';
import {
  createMenu,
  updateMenu,
  createOrder,
  getOrders,
  resetAllTransactions
} from '../src/lib/api';
import { computeSalesMetrics } from '../src/lib/financialEngine';

test('Tahap 3: HPP Produk & Snapshot Biaya Transaksi (Immutability & Integrity)', async (t) => {
  await resetAllTransactions();

  let menuItemId: number;

  await t.test('1. createMenu menyimpan harga modal (costPrice) dengan benar', async () => {
    menuItemId = Number(await createMenu({
      nama: 'Bebek Goreng Madura',
      harga: 35000,
      costPrice: 22000,
      kategori: 'Makanan'
    }));

    const savedMenu = await db.table('menuItems').get(menuItemId);
    assert.strictEqual(savedMenu.nama, 'Bebek Goreng Madura');
    assert.strictEqual(savedMenu.harga, 35000);
    assert.strictEqual(savedMenu.costPrice, 22000, 'costPrice harus tersimpan Rp 22.000');
  });

  await t.test('2. updateMenu dapat memperbarui costPrice modal produk', async () => {
    await updateMenu(menuItemId, {
      costPrice: 24000
    });

    const updatedMenu = await db.table('menuItems').get(menuItemId);
    assert.strictEqual(updatedMenu.costPrice, 24000, 'costPrice modal berhasil diperbarui menjadi Rp 24.000');
  });

  await t.test('3. createOrder melakukan immutable snapshot atas costPrice ke orderItems', async () => {
    const orderRes = await createOrder({
      total: 70000,
      status: 'paid',
      customerName: 'Pelanggan HPP',
      paymentMethod: 'Cash',
      items: [
        {
          id: menuItemId,
          nama: 'Bebek Goreng Madura',
          harga: 35000,
          qty: 2
        }
      ]
    });

    const orderItems = await db.table('orderItems').where('orderId').equals(Number(orderRes.id)).toArray();
    assert.strictEqual(orderItems.length, 1);
    assert.strictEqual(orderItems[0].costPrice, 24000, 'orderItem.costPrice harus tersnapshot Rp 24.000');
    assert.strictEqual(orderItems[0].hargaSatuan, 35000);
    assert.strictEqual(orderItems[0].qty, 2);

    // 4. Pengujian Immutabilitas: Naikkan modal di menu, pastikan orderItem lama TIDAK BERUBAH
    await updateMenu(menuItemId, {
      costPrice: 28000 // Modal naik di kemudian hari karena inflasi
    });

    const orderItemsAfter = await db.table('orderItems').where('orderId').equals(Number(orderRes.id)).toArray();
    assert.strictEqual(orderItemsAfter[0].costPrice, 24000, 'Snapshot modal transaksi lama TETAP ABADI (24.000, bukan 28.000)');

    // 5. Verifikasi Laba Kotor di Financial Engine
    const fullOrder = (await getOrders()).find(o => o.id === Number(orderRes.id));
    assert(fullOrder, 'Order harus ditemukan');
    assert(fullOrder.items && fullOrder.items.length > 0, 'Order harus memiliki items');

    const salesMetrics = computeSalesMetrics([fullOrder]);
    assert.strictEqual(salesMetrics.netSales, 70000);
    assert.strictEqual(salesMetrics.totalCOGS, 48000, 'Total HPP: 2 porsi x Rp 24.000 = Rp 48.000');
    assert.strictEqual(salesMetrics.grossProfit, 22000, 'Laba Kotor: Rp 70.000 - Rp 48.000 = Rp 22.000');
    assert.strictEqual(salesMetrics.profitMarginPercent, 31.43, 'Margin Laba: 22.000 / 70.000 = 31.43%');
    assert.strictEqual(salesMetrics.hasIncompleteCOGS, false, 'Seluruh produk memiliki data modal');
    assert.strictEqual(salesMetrics.cogsCoveragePercent, 100, 'Cakupan data modal 100%');
  });

  await t.test('6. Transaksi tanpa HPP tidak memalsukan modal dan menandai incomplete status', async () => {
    // Menu lama tanpa HPP
    const legacyMenuId = Number(await createMenu({
      nama: 'Kerupuk Kaleng Lama',
      harga: 5000,
      kategori: 'Camilan'
      // costPrice sengaja tidak diisi
    }));

    const orderLegacy = await createOrder({
      total: 10000,
      status: 'paid',
      customerName: 'Pelanggan Kerupuk',
      paymentMethod: 'Cash',
      items: [
        {
          id: legacyMenuId,
          nama: 'Kerupuk Kaleng Lama',
          harga: 5000,
          qty: 2
        }
      ]
    });

    const fullLegacyOrder = (await getOrders()).find(o => o.id === Number(orderLegacy.id));
    assert(fullLegacyOrder);

    const legacyMetrics = computeSalesMetrics([fullLegacyOrder]);
    assert.strictEqual(legacyMetrics.netSales, 10000);
    assert.strictEqual(legacyMetrics.totalCOGS, 0, 'Total COGS 0 karena tidak ada modal tercatat');
    assert.strictEqual(legacyMetrics.hasIncompleteCOGS, true, 'hasIncompleteCOGS harus TRUE');
    assert.strictEqual(legacyMetrics.cogsCoveragePercent, 0, 'Cakupan HPP harus 0%');
  });
});
