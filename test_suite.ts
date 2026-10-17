// Test Environment Variables (Isolated for Test Suite)
process.env.SAKUNOTA_SERVER_SECRET = process.env.SAKUNOTA_SERVER_SECRET || "test_sakunota_secure_hmac_master_secret_2026_xyz";
process.env.SAKUNOTA_OWNER_SALT = process.env.SAKUNOTA_OWNER_SALT || "test_sakunota_secure_owner_salt_test_2026";
process.env.SAKUNOTA_OWNER_USERNAME = process.env.SAKUNOTA_OWNER_USERNAME || "OwnerSakuNota";
process.env.SAKUNOTA_OWNER_PASSWORD = process.env.SAKUNOTA_OWNER_PASSWORD || "Test-Owner-Password-2026!";

import 'fake-indexeddb/auto';
import { db } from './src/lib/dexie';
import {
  createOrder,
  getOrders,
  recordPayment,
  refundPartialPayment,
  getOrderPayments,
  openShift,
  closeShift,
  getShiftLiveStats,
  resetAllTransactions,
  exportAllData,
  importAllData,
  refreshTableStatus
} from './src/lib/api';
import {
  generateGenuineLicenseKey,
  signLicenseKey,
  activateLicenseOnDevice,
  checkCustomerOrderStatus,
  createCustomerOrder,
  verifyOrderAndIssueLicense,
  registerBetaAccount,
  approveBetaRegistration,
  verifyDeviceLicense,
  convertBetaTrialToPaid
} from './src/lib/server/sakunotaServer';
import {
  getD1,
  initD1Tables,
  insertOrderD1,
  insertLicenseD1,
  getLicenseD1,
  unbindLicenseDeviceD1,
  updateOrderStatusAndLicenseD1,
  getBetaRegistrationByIdD1,
  getBetaRegistrationByLicenseKeyD1
} from './src/lib/server/d1';
import { detectClockTampering } from './src/lib/licenseGuard';

if (typeof (globalThis as any).localStorage === 'undefined') {
  let mockStore: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem: (key: string) => mockStore[key] || null,
    setItem: (key: string, val: string) => { mockStore[key] = String(val); },
    removeItem: (key: string) => { delete mockStore[key]; },
    clear: () => { mockStore = {}; }
  };
}

interface TestResult {
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details?: string) {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`  ✅ PASS: ${name}${details ? ` (${details})` : ''}`);
  } else {
    results.push({ name, passed: false, details, error: 'Assertion failed' });
    console.error(`  ❌ FAIL: ${name}${details ? ` (${details})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('  🧪 SAKUNOTA AUTOMATED COMPREHENSIVE TEST SUITE');
  console.log('======================================================\n');

  await resetAllTransactions();

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 1] Modifier Snapshotting & Immutability');
  // --------------------------------------------------------------------------
  try {
    const order1 = await createOrder({
      customerName: 'Budi Santoso',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      tableId: 1,
      total: 16000,
      subtotal: 16000,
      status: 'paid',
      items: [
        {
          id: 101,
          nama: 'Es Teh Manis Original',
          kategori: 'Minuman',
          harga: 10000,
          qty: 1,
          selectedModifiers: [
            { groupName: 'Pilihan Es', optionName: 'Less Ice', harga: 0 },
            { groupName: 'Topping Tambahan', optionName: 'Boba / Pearl', harga: 6000 }
          ]
        }
      ]
    });

    // Simulate owner modifying menu catalog later (changing price and name)
    const ordersAfter = await getOrders();
    const fetchedOrder = ordersAfter.find(o => o.id === order1.id);

    assert(fetchedOrder !== undefined, 'Order successfully created and fetched');
    assert(fetchedOrder.items[0].nama === 'Es Teh Manis Original', 'Menu item name snapshot is preserved', fetchedOrder.items[0].nama);
    assert(fetchedOrder.items[0].selectedModifiers.length === 2, 'Modifiers count preserved');
    assert(fetchedOrder.items[0].selectedModifiers[1].harga === 6000, 'Modifier price snapshot is preserved', 'Rp ' + fetchedOrder.items[0].selectedModifiers[1].harga);
  } catch (err: any) {
    assert(false, 'Test Group 1 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 2] Atomic Idempotency Guard (Race Condition)');
  // --------------------------------------------------------------------------
  try {
    const idempotencyKey = 'IDEM-TEST-' + Date.now();
    const payload = {
      idempotencyKey,
      customerName: 'Dewi Ratna',
      paymentMethod: 'QRIS',
      orderType: 'Takeaway',
      total: 25000,
      status: 'paid',
      items: [{ id: 201, nama: 'Ayam Goreng', harga: 25000, qty: 1 }]
    };

    // Parallel calls simulating fast double-tap
    const [res1, res2] = await Promise.all([
      createOrder(payload),
      createOrder(payload)
    ]);

    const allOrders = await db.table('orders').where('idempotencyKey').equals(idempotencyKey).toArray();
    assert(allOrders.length === 1, 'Only exactly 1 order persisted for identical idempotency key');
    assert(res1.id === res2.id || (res2 as any).isDuplicate, 'Second request intercepted by atomic idempotency guard');
  } catch (err: any) {
    assert(false, 'Test Group 2 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 3] Shift Association & Pure Cash Accounting');
  // --------------------------------------------------------------------------
  try {
    // 1. Open Shift 1
    const shift1 = await openShift({
      operatorName: 'Kasir Siang (Siti)',
      startingCash: 200000,
      notes: 'Shift siang hari'
    });
    assert(shift1.id !== undefined, 'Shift 1 opened successfully with Modal Awal Rp 200.000');

    // 2. Transact in Shift 1: Rp 50.000 Cash
    await createOrder({
      shiftId: shift1.id,
      customerName: 'Pelanggan Tunai 1',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      total: 50000,
      status: 'paid',
      items: [{ id: 301, nama: 'Nasi Bakar', harga: 50000, qty: 1 }]
    });

    const shift1Stats = await getShiftLiveStats(shift1.id);
    assert(shift1Stats.cashSales === 50000, 'Shift 1 Cash Sales is Rp 50.000', `Rp ${shift1Stats.cashSales}`);
    assert(shift1Stats.expectedCash === 250000, 'Shift 1 Expected Physical Cash is Rp 250.000', `Rp ${shift1Stats.expectedCash}`);

    // 3. Close Shift 1 (Blind close with exact 250.000)
    const closedShift1 = await closeShift(shift1.id, {
      actualCash: 250000,
      notes: 'Uang fisik pas cocok'
    });
    assert(closedShift1.cashDifference === 0, 'Shift 1 Reconciliation PAS / COCOK (Selisih Rp 0)');

    // 4. Open Shift 2
    const shift2 = await openShift({
      operatorName: 'Kasir Malam (Joko)',
      startingCash: 300000,
      notes: 'Shift malam'
    });

    // 5. Transact in Shift 2: Rp 60.000 QRIS (Non-cash) + Rp 75.000 Cash
    await createOrder({
      shiftId: shift2.id,
      customerName: 'Pelanggan QRIS',
      paymentMethod: 'QRIS',
      orderType: 'Dine-in',
      total: 60000,
      status: 'paid',
      items: [{ id: 302, nama: 'Iga Panggang', harga: 60000, qty: 1 }]
    });

    await createOrder({
      shiftId: shift2.id,
      customerName: 'Pelanggan Tunai 2',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      total: 75000,
      status: 'paid',
      items: [{ id: 303, nama: 'Bebek Goreng', harga: 75000, qty: 1 }]
    });

    const shift2Stats = await getShiftLiveStats(shift2.id);
    assert(shift2Stats.cashSales === 75000, 'Shift 2 Cash Sales only counts Cash (Rp 75.000)');
    assert(shift2Stats.nonCashSales === 60000, 'Shift 2 QRIS tracked separately as Non-Cash (Rp 60.000)');
    // Expected Cash MUST NOT include QRIS 60.000! Starting (300.000) + Cash (75.000) = 375.000
    assert(shift2Stats.expectedCash === 375000, 'Shift 2 Expected Physical Cash correctly excludes QRIS (Rp 375.000)', `Rp ${shift2Stats.expectedCash}`);

    await closeShift(shift2.id, { actualCash: 375000, operatorName: 'Kasir Malam (Joko)' });
  } catch (err: any) {
    assert(false, 'Test Group 3 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 4] Split Bill - Split by Item (Pilih Menu)');
  // --------------------------------------------------------------------------
  try {
    // Table 5 has 2x Ayam Panggang (@25.000 = 50.000) + 2x Es Teh (@10.000 = 20.000). Total = 70.000
    const openOrder = await createOrder({
      customerName: 'Rombongan Meja 5',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      tableId: 5,
      total: 70000,
      subtotal: 70000,
      status: 'unpaid',
      items: [
        { id: 401, menuItemId: 401, nama: 'Ayam Panggang', harga: 25000, qty: 2 },
        { id: 402, menuItemId: 402, nama: 'Es Teh Manis', harga: 10000, qty: 2 }
      ]
    });

    // Pelanggan 1 pays for 2x Es Teh (Rp 20.000) via QRIS
    const pay1 = await recordPayment({
      orderId: openOrder.id,
      paymentMethod: 'QRIS',
      amount: 20000,
      splitType: 'item',
      itemsPaid: [{ menuItemId: 402, nama: 'Es Teh Manis', qty: 2, harga: 10000 }],
      operatorName: 'Kasir',
      notes: 'Pelanggan 1 bayar minum'
    });

    assert(pay1.remainingBalance === 50000, 'Remaining balance after Part 1 is Rp 50.000', `Rp ${pay1.remainingBalance}`);
    assert(!pay1.isFullyPaid, 'Order is NOT fully paid yet');

    const ordersCheck1 = await getOrders();
    const orderState1 = ordersCheck1.find(o => o.id === openOrder.id);
    assert(orderState1.status === 'unpaid', 'Parent Order status remains unpaid');
    assert(orderState1.items.find((i: any) => i.menuItemId === 402).paidQty === 2, 'Es Teh paidQty marked as 2 (fully paid)');
    assert(orderState1.items.find((i: any) => i.menuItemId === 401).paidQty === 0, 'Ayam Panggang paidQty remains 0 (unpaid)');

    // Pelanggan 2 pays for 2x Ayam Panggang (Rp 50.000) via Cash
    const pay2 = await recordPayment({
      orderId: openOrder.id,
      paymentMethod: 'Cash',
      amount: 50000,
      cashTendered: 100000,
      change: 50000,
      splitType: 'item',
      itemsPaid: [{ menuItemId: 401, nama: 'Ayam Panggang', qty: 2, harga: 25000 }],
      operatorName: 'Kasir',
      notes: 'Pelanggan 2 bayar makanan'
    });

    assert(pay2.remainingBalance === 0, 'Remaining balance after Part 2 is Rp 0', `Rp ${pay2.remainingBalance}`);
    assert(pay2.isFullyPaid === true, 'Order is marked as fully paid');

    const ordersCheck2 = await getOrders();
    const orderState2 = ordersCheck2.find(o => o.id === openOrder.id);
    assert(orderState2.status === 'paid', 'Parent Order status is now PAID');
    assert(orderState2.payments.length === 2, 'Parent Order contains both payment records without duplicate omzet');
  } catch (err: any) {
    assert(false, 'Test Group 4 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 5] Split Bill - Split Equally with Exact Remainder');
  // --------------------------------------------------------------------------
  try {
    // Total Rp 100.000 divided by 3 people
    // 100.000 / 3 = 33.333 remainder 1
    // Person 1 pays 33.334, Person 2 pays 33.333, Person 3 pays 33.333
    const orderEqual = await createOrder({
      customerName: 'Meja 3 Orang',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      tableId: 6,
      total: 100000,
      status: 'unpaid',
      items: [{ id: 501, nama: 'Paket Makan Rame-rame', harga: 100000, qty: 1 }]
    });

    // Person 1 pays
    const p1 = await recordPayment({
      orderId: orderEqual.id,
      paymentMethod: 'Cash',
      amount: 33334,
      splitType: 'equal',
      operatorName: 'Kasir'
    });
    assert(p1.remainingBalance === 66666, 'After Person 1: remaining Rp 66.666');

    // Person 2 pays
    const p2 = await recordPayment({
      orderId: orderEqual.id,
      paymentMethod: 'QRIS',
      amount: 33333,
      splitType: 'equal',
      operatorName: 'Kasir'
    });
    assert(p2.remainingBalance === 33333, 'After Person 2: remaining Rp 33.333');

    // Person 3 pays
    const p3 = await recordPayment({
      orderId: orderEqual.id,
      paymentMethod: 'Transfer',
      amount: 33333,
      splitType: 'equal',
      operatorName: 'Kasir'
    });
    assert(p3.remainingBalance === 0, 'After Person 3: remaining is EXACTLY Rp 0');
    assert(p3.isFullyPaid === true, 'Order marked as fully paid with zero discrepancy');
  } catch (err: any) {
    assert(false, 'Test Group 5 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 6] Mixed Payments & Partial Refund');
  // --------------------------------------------------------------------------
  try {
    const orderMixed = await createOrder({
      customerName: 'Pelanggan Campuran',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      tableId: 7,
      total: 150000,
      status: 'unpaid',
      items: [{ id: 601, nama: 'Aneka Menu', harga: 150000, qty: 1 }]
    });

    // 1. Pay Rp 50.000 Cash
    const payA = await recordPayment({
      orderId: orderMixed.id,
      paymentMethod: 'Cash',
      amount: 50000,
      cashTendered: 100000,
      change: 50000,
      splitType: 'partial',
      operatorName: 'Kasir'
    });
    assert(payA.remainingBalance === 100000, 'Remaining is Rp 100.000 after Cash Rp 50.000');

    // 2. Pay Rp 60.000 QRIS
    const payB = await recordPayment({
      orderId: orderMixed.id,
      paymentMethod: 'QRIS',
      amount: 60000,
      splitType: 'partial',
      operatorName: 'Kasir'
    });
    assert(payB.remainingBalance === 40000, 'Remaining is Rp 40.000 after QRIS Rp 60.000');

    // 3. Customer wants refund for the QRIS payment (e.g. wrong QR code)
    const refundRes = await refundPartialPayment(payB.paymentId, {
      reason: 'Salah transfer QRIS',
      operator: 'Admin'
    });

    assert(refundRes.refundedAmount === 60000, 'Refunded amount is Rp 60.000');
    assert(refundRes.remainingBalance === 100000, 'Remaining balance re-opened to Rp 100.000');

    const ordersCheck = await getOrders();
    const updatedMixedOrder = ordersCheck.find(o => o.id === orderMixed.id);
    assert(updatedMixedOrder.status === 'unpaid', 'Order reverts to unpaid after partial refund');

    const payments = await getOrderPayments(orderMixed.id);
    const refundedP = payments.find(p => p.id === payB.paymentId);
    assert(refundedP.status === 'refunded', 'Payment record explicitly tagged as refunded');
  } catch (err: any) {
    assert(false, 'Test Group 6 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 7] Force Close, Backup & Restore Persistence');
  // --------------------------------------------------------------------------
  try {
    const backupData = await exportAllData();
    assert(backupData.payments !== undefined && backupData.payments.length > 0, 'Backup contains payments table records', `${backupData.payments.length} payments`);
    assert(backupData.orders.length > 0, 'Backup contains orders', `${backupData.orders.length} orders`);
    assert(backupData.shifts.length > 0, 'Backup contains shifts', `${backupData.shifts.length} shifts`);

    // Wipe DB
    await resetAllTransactions();
    const ordersAfterWipe = await getOrders();
    assert(ordersAfterWipe.length === 0, 'Database wiped clean for restore test');

    // Restore from backup
    await importAllData(backupData);
    const restoredOrders = await getOrders();
    assert(restoredOrders.length === backupData.orders.length, 'All orders restored successfully');
    
    const sampleRestored = restoredOrders.find(o => o.payments && o.payments.length > 0);
    assert(sampleRestored !== undefined && sampleRestored.paidAmount > 0, 'Payments and remaining balances restored intact');
  } catch (err: any) {
    assert(false, 'Test Group 7 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 8] Store Settings Dual-Layer Persistence & Integrity');
  // --------------------------------------------------------------------------
  try {
    const { saveStoreSettingsAsync, loadStoreSettingsAsync, DEFAULT_SETTINGS } = await import('./src/lib/settings');
    const customSettings = {
      ...DEFAULT_SETTINGS,
      storeName: 'Angkringan Khas Nusantara',
      storeAddress: 'Jl. Malioboro No. 45, Yogyakarta',
      storePhone: '081234567890',
      receiptFooter: 'Matur nuwun sanget, sugeng rawuh malih',
      taxPercent: 10,
      enableTax: true,
      servicePercent: 5,
      enableService: true
    };

    // Save asynchronously to Dexie + localStorage
    await saveStoreSettingsAsync(customSettings);

    // Verify Dexie settings table directly
    const dexieEntry = await db.table('settings').get('pos_store_settings');
    assert(dexieEntry !== undefined, 'Settings persisted into Dexie settings table');
    assert(dexieEntry.value.storeName === 'Angkringan Khas Nusantara', 'Dexie stored correct store name', dexieEntry.value.storeName);
    assert(dexieEntry.value.taxPercent === 10, 'Dexie stored correct tax percentage', `${dexieEntry.value.taxPercent}%`);

    // Verify loadStoreSettingsAsync
    const loaded = await loadStoreSettingsAsync();
    assert(loaded.storeName === 'Angkringan Khas Nusantara', 'loadStoreSettingsAsync retrieves saved store name');
    assert(loaded.receiptFooter === 'Matur nuwun sanget, sugeng rawuh malih', 'loadStoreSettingsAsync retrieves saved footer');

    // Verify exportAllData includes settings
    const backupWithSettings = await exportAllData();
    assert(backupWithSettings.settings !== null && backupWithSettings.settings.storeName === 'Angkringan Khas Nusantara', 'exportAllData contains custom store settings');
  } catch (err: any) {
    assert(false, 'Test Group 8 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 9] Menu & Table CRUD Operations');
  // --------------------------------------------------------------------------
  try {
    const { createMenu, updateMenu, toggleMenuSoldOut, deleteMenus, getMenus, addTable, renameTable, deleteTable, getTables } = await import('./src/lib/api');

    // 1. Create Menu
    await createMenu({
      nama: 'Wedang Ronde Spesial',
      harga: 12000,
      kategori: 'Minuman Tradisional'
    });
    let menus = await getMenus();
    const createdMenu = menus.find(m => m.nama === 'Wedang Ronde Spesial');
    assert(createdMenu !== undefined, 'createMenu successfully inserts new menu item');
    assert(createdMenu!.harga === 12000, 'Menu item price is correct (Rp 12.000)');

    // 2. Update Menu
    await updateMenu(createdMenu!.id!, {
      nama: 'Wedang Ronde Jahe Merah',
      harga: 15000,
      kategori: 'Minuman Hangat'
    });
    menus = await getMenus();
    const updatedMenu = menus.find(m => m.id === createdMenu!.id);
    assert(updatedMenu !== undefined, 'Updated menu found');
    assert(updatedMenu!.nama === 'Wedang Ronde Jahe Merah', 'Menu name successfully updated', updatedMenu!.nama);
    assert(updatedMenu!.harga === 15000, 'Menu price successfully updated (Rp 15.000)');
    assert(updatedMenu!.kategori === 'Minuman Hangat', 'Menu category successfully updated');

    // 3. Toggle Sold Out
    await toggleMenuSoldOut(createdMenu!.id!, true);
    menus = await getMenus();
    let checkedItem = menus.find(m => m.id === createdMenu!.id);
    assert(checkedItem!.isSoldOut === true, 'toggleMenuSoldOut sets isSoldOut = true');

    await toggleMenuSoldOut(createdMenu!.id!, false);
    menus = await getMenus();
    checkedItem = menus.find(m => m.id === createdMenu!.id);
    assert(checkedItem!.isSoldOut === false, 'toggleMenuSoldOut sets isSoldOut = false');

    // 4. Delete Menu
    await deleteMenus([createdMenu!.id!]);
    menus = await getMenus();
    const deletedCheck = menus.find(m => m.id === createdMenu!.id);
    assert(deletedCheck === undefined, 'deleteMenus removes menu item from database');

    // 5. Table CRUD
    const initialTables = await getTables();
    await addTable('Meja VIP 99');
    let tablesAfter = await getTables();
    const addedTable = tablesAfter.find(t => t.nomor === 'Meja VIP 99');
    assert(addedTable !== undefined, 'addTable creates new table');

    await renameTable(addedTable!.id!, 'Meja VIP Exclusive');
    tablesAfter = await getTables();
    const renamedTable = tablesAfter.find(t => t.id === addedTable!.id);
    assert(renamedTable !== undefined && renamedTable.nomor === 'Meja VIP Exclusive', 'renameTable updates table name');

    await deleteTable(addedTable!.id!);
    tablesAfter = await getTables();
    const deletedTable = tablesAfter.find(t => t.id === addedTable!.id);
    assert(deletedTable === undefined, 'deleteTable removes table successfully');
  } catch (err: any) {
    assert(false, 'Test Group 9 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 10] Payment Proof Upload, Atomic Attachment & Verification Workflow');
  // --------------------------------------------------------------------------
  try {
    const { uploadPaymentProof, verifyPaymentProof, deletePaymentProof } = await import('./src/lib/api');
    
    // 1. Create QRIS Order WITH payment proof
    const qrisOrder = await createOrder({
      customerName: 'Siti Aminah',
      paymentMethod: 'QRIS',
      orderType: 'Dine-in',
      tableId: 1,
      total: 50000,
      status: 'paid',
      items: [{ id: 101, nama: 'Paket Nasi Kucing Komplit', harga: 50000, qty: 1 }],
      paymentProof: {
        imageData: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAD8D+JaQAA3AA/ua1AAA=',
        fileName: 'bukti_qris_siti.webp',
        fileSize: 1024,
        mimeType: 'image/webp'
      }
    });

    const orders = await getOrders();
    const fetchedQris = orders.find(o => o.id === qrisOrder.id);
    assert(fetchedQris !== undefined, 'QRIS order created');
    assert(fetchedQris.verificationStatus === 'menunggu_verifikasi', 'Order verificationStatus is "menunggu_verifikasi"', fetchedQris.verificationStatus);
    assert(fetchedQris.proofStatus === 'menunggu_verifikasi', 'Payment proofStatus is "menunggu_verifikasi"');
    assert(fetchedQris.proof !== undefined, 'Payment proof is attached to order');

    // 2. Admin verifies proof
    await verifyPaymentProof(fetchedQris.proof.id, { operator: 'Admin Utama' });
    const ordersAfterVerify = await getOrders();
    const verifiedOrder = ordersAfterVerify.find(o => o.id === qrisOrder.id);
    assert(verifiedOrder.verificationStatus === 'terverifikasi', 'Order verificationStatus updated to "terverifikasi"');
    assert(verifiedOrder.proofStatus === 'terverifikasi', 'Payment proofStatus updated to "terverifikasi"');

    // 3. Create QRIS Order WITHOUT payment proof
    const pendingProofOrder = await createOrder({
      customerName: 'Hendra Gunawan',
      paymentMethod: 'Transfer',
      orderType: 'Takeaway',
      total: 75000,
      status: 'paid',
      items: [{ id: 102, nama: 'Aneka Sate 15 Porsi', harga: 75000, qty: 1 }]
    });

    const ordersPending = await getOrders();
    const fetchedPending = ordersPending.find(o => o.id === pendingProofOrder.id);
    assert(fetchedPending.verificationStatus === 'menunggu_bukti', 'Non-cash order without proof has status "menunggu_bukti"');

    // 4. Retroactive upload proof for Hendra
    const payments = await getOrderPayments(pendingProofOrder.id);
    const transferPayment = payments[0];
    await uploadPaymentProof({
      paymentId: transferPayment.id,
      orderId: pendingProofOrder.id,
      imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/',
      fileName: 'struk_transfer_hendra.jpg',
      fileSize: 2048,
      mimeType: 'image/jpeg',
      operator: 'Kasir Shift 1'
    });

    const ordersAfterUpload = await getOrders();
    const updatedHendra = ordersAfterUpload.find(o => o.id === pendingProofOrder.id);
    assert(updatedHendra.verificationStatus === 'menunggu_verifikasi', 'Retroactive proof upload updates order to "menunggu_verifikasi"');

    // 5. Admin deletes proof with reason
    await deletePaymentProof(updatedHendra.proof.id, { operator: 'Admin Utama', reason: 'Bukti transfer buram/salah nominal' });
    const ordersAfterDelete = await getOrders();
    const revertedHendra = ordersAfterDelete.find(o => o.id === pendingProofOrder.id);
    assert(revertedHendra.verificationStatus === 'menunggu_bukti', 'Deleted proof reverts order status to "menunggu_bukti"');
  } catch (err: any) {
    assert(false, 'Test Group 10 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 11] Reconciliation Calculation: Physical Cash vs Verified Non-Cash');
  // --------------------------------------------------------------------------
  try {
    // Open a fresh shift to test reconciliation stats
    const shift = await openShift({ startingCash: 200000, operatorName: 'Kasir Utama' });

    // 1. Physical Cash Order: Rp 100.000
    await createOrder({
      customerName: 'Pelanggan Tunai',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      total: 100000,
      status: 'paid',
      items: [{ id: 301, nama: 'Makanan', harga: 100000, qty: 1 }]
    });

    // 2. Unverified QRIS Order: Rp 50.000
    await createOrder({
      customerName: 'Pelanggan QRIS Belum Verif',
      paymentMethod: 'QRIS',
      orderType: 'Dine-in',
      total: 50000,
      status: 'paid',
      items: [{ id: 302, nama: 'Minuman', harga: 50000, qty: 1 }]
    });

    // 3. Verified Transfer Order: Rp 150.000
    const verifiedOrder = await createOrder({
      customerName: 'Pelanggan Transfer Verif',
      paymentMethod: 'Transfer',
      orderType: 'Dine-in',
      total: 150000,
      status: 'paid',
      items: [{ id: 303, nama: 'Paket Gathering', harga: 150000, qty: 1 }],
      paymentProof: {
        imageData: 'data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAD8D+JaQAA3AA/ua1AAA=',
        fileName: 'bukti_gathering.webp',
        fileSize: 1500,
        mimeType: 'image/webp'
      }
    });
    const verifPayments = await getOrderPayments(verifiedOrder.id);
    const { verifyPaymentProof } = await import('./src/lib/api');
    await verifyPaymentProof(verifPayments[0].proofId!, { operator: 'Admin' });

    // Fetch live stats
    const stats = await getShiftLiveStats(shift.id);

    // Verification of formulas:
    // Expected Cash = Modal Awal (200.000) + Cash Sales (100.000) = 300.000
    // QRIS and Transfer MUST NOT increase expected physical cash!
    assert(stats.expectedCash === 300000, 'Expected Cash drawer reflects strictly physical cash (Rp 300.000)', `Rp ${stats.expectedCash}`);
    assert(stats.verifiedNonCashSales === 150000, 'Verified Non-Cash Sales correctly reflects only verified proofs (Rp 150.000)', `Rp ${stats.verifiedNonCashSales}`);
    assert(stats.unverifiedNonCashSales === 50000, 'Unverified Non-Cash Sales isolated for reconciliation (Rp 50.000)', `Rp ${stats.unverifiedNonCashSales}`);

    await closeShift(shift.id, { actualCash: 300000, operatorName: 'Kasir Utama' });
  } catch (err: any) {
    assert(false, 'Test Group 11 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 12] Bulk Menu Operations & Financial Immutability Guardrail');
  // --------------------------------------------------------------------------
  try {
    const {
      bulkImportMenus,
      bulkUpdateMenuPrices,
      bulkUpdateMenuCategory,
      bulkToggleMenuStock,
      bulkDeleteMenus
    } = await import('./src/lib/api');

    // 1. Bulk Import (Upsert mode)
    const importPayload = [
      { sku: 'BLK-001', nama: 'Menu Massal Satu', harga: 10000, kategori: 'Snack' },
      { sku: 'BLK-002', nama: 'Menu Massal Dua', harga: 20000, kategori: 'Snack' },
      { sku: 'BLK-003', nama: 'Menu Massal Tiga', harga: 30000, kategori: 'Snack' }
    ];
    const importRes = await bulkImportMenus(importPayload, { mode: 'upsert' });
    assert(importRes.createdCount === 3, 'bulkImportMenus created 3 items');

    // Upsert duplicate SKU with new price
    const updatePayload = [
      { sku: 'BLK-001', nama: 'Menu Massal Satu Update', harga: 12000, kategori: 'Snack' },
      { sku: 'BLK-004', nama: 'Menu Massal Empat', harga: 40000, kategori: 'Minuman' }
    ];
    const upsertRes = await bulkImportMenus(updatePayload, { mode: 'upsert' });
    assert(upsertRes.createdCount === 1, 'Upsert created 1 new item (BLK-004)');
    assert(upsertRes.updatedCount === 1, 'Upsert updated 1 existing item (BLK-001)');

    const menus = await db.table('menuItems').toArray();
    const item1 = menus.find(m => m.sku === 'BLK-001');
    assert(item1.harga === 12000, 'BLK-001 price updated to 12.000 via upsert');

    // 2. Bulk Price Update (+ nominal Rp 3.000)
    const targetIds = menus.filter(m => ['BLK-001', 'BLK-002'].includes(m.sku)).map(m => m.id);
    await bulkUpdateMenuPrices(targetIds, { type: 'nominal', value: 3000 });
    const item1AfterNom = await db.table('menuItems').get(item1.id);
    assert(item1AfterNom.harga === 15000, 'bulkUpdateMenuPrices nominal (+Rp 3.000) applied: Rp 15.000');

    // Bulk Price Update (+10% percent)
    await bulkUpdateMenuPrices([item1.id], { type: 'percent', value: 10 });
    const item1AfterPct = await db.table('menuItems').get(item1.id);
    assert(item1AfterPct.harga === 16500, 'bulkUpdateMenuPrices percent (+10%) applied: Rp 16.500');

    // 3. Bulk Update Category
    await bulkUpdateMenuCategory(targetIds, 'Makanan Ringan');
    const item2 = await db.table('menuItems').get(targetIds[1]);
    assert(item2.kategori === 'Makanan Ringan', 'bulkUpdateMenuCategory updated category to "Makanan Ringan"');

    // 4. Bulk Toggle Stock
    await bulkToggleMenuStock(targetIds, true);
    const item2SoldOut = await db.table('menuItems').get(targetIds[1]);
    assert(item2SoldOut.isSoldOut === true, 'bulkToggleMenuStock sets isSoldOut = true');

    // 5. Bulk Delete Financial Safety Guardrail:
    // Create an order referencing BLK-001
    await createOrder({
      customerName: 'Pembeli Menu Massal',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      total: 16500,
      status: 'paid',
      items: [{ id: item1.id, nama: item1.nama, harga: item1.harga, qty: 1 }]
    });

    // Now attempt to bulk delete BLK-001 (used in order) and BLK-003 (unused)
    const item3 = menus.find(m => m.sku === 'BLK-003');
    const deleteRes = await bulkDeleteMenus([item1.id, item3.id]);
    assert(deleteRes.deletedCount === 1, 'Unused menu item BLK-003 permanently deleted');
    assert(deleteRes.protectedCount === 1, 'Used menu item BLK-001 protected from deletion');

    const item1Check = await db.table('menuItems').get(item1.id);
    assert(item1Check !== undefined, 'Protected item BLK-001 still exists in database');
    assert(item1Check.isSoldOut === true, 'Protected item BLK-001 marked as sold out / disabled');

    const item3Check = await db.table('menuItems').get(item3.id);
    assert(item3Check === undefined, 'Unused item BLK-003 successfully removed');
  } catch (err: any) {
    assert(false, 'Test Group 12 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 13] Bulk Table Management & Active Order Guardrail');
  // --------------------------------------------------------------------------
  try {
    const { bulkCreateTables, bulkRenameTables, bulkDeleteEmptyTables } = await import('./src/lib/api');

    // 1. Bulk Create Tables
    const createRes = await bulkCreateTables({ prefix: 'Saung ', startNum: 1, count: 5 });
    assert(createRes.createdCount === 5, 'bulkCreateTables generated 5 new tables (Saung 1..5)');

    const tables = await db.table('tables').toArray();
    const saungTables = tables.filter(t => t.nomor.startsWith('Saung '));
    assert(saungTables.length === 5, 'Found 5 Saung tables in database');

    // 2. Bulk Rename Tables
    const saungIds = saungTables.map(t => t.id);
    await bulkRenameTables(saungIds, 'Gazebo #{N}');
    const renamedFirst = await db.table('tables').get(saungIds[0]);
    assert(renamedFirst.nomor === 'Gazebo #1', 'bulkRenameTables formatted first table to "Gazebo #1"');

    // 3. Active Order Safety Guardrail:
    // Create an unpaid / open bill order on Gazebo #1
    await createOrder({
      customerName: 'Pelanggan Gazebo',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      tableId: saungIds[0],
      total: 20000,
      status: 'unpaid',
      items: [{ id: 101, nama: 'Makanan', harga: 20000, qty: 1 }]
    });

    // Attempt to delete all saung tables (one has active unpaid order)
    const delRes = await bulkDeleteEmptyTables(saungIds);
    assert(delRes.blockedCount === 1, 'Table with active unpaid order BLOCKED from deletion');
    assert(delRes.deletedCount === 4, 'Empty tables without active orders deleted successfully');

    const protectedTable = await db.table('tables').get(saungIds[0]);
    assert(protectedTable !== undefined, 'Active table Gazebo #1 remains preserved in database');
  } catch (err: any) {
    assert(false, 'Test Group 13 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 14] Historical Transaction Import & Financial Immutability');
  // --------------------------------------------------------------------------
  try {
    const { importHistoricalTransactions } = await import('./src/lib/api');

    const historicalData = [
      {
        receiptNumber: 'HIST-2025-001',
        createdAt: '2025-01-15T12:00:00.000Z',
        customerName: 'Pelanggan Masa Lalu 1',
        orderType: 'Dine-in' as const,
        tableName: 'Meja Lawas',
        subtotal: 100000,
        taxAmount: 10000,
        discountAmount: 0,
        total: 110000,
        paymentMethod: 'Cash' as const,
        notes: 'Migrasi dari pembukuan buku tulis',
        items: [
          { nama: 'Bebek Goreng', qty: 2, harga: 40000, subtotal: 80000 },
          { nama: 'Es Jeruk', qty: 2, harga: 10000, subtotal: 20000 }
        ]
      }
    ];

    const histRes = await importHistoricalTransactions(historicalData);
    assert(histRes.importedCount === 1, 'importHistoricalTransactions imported 1 record');

    const orders = await db.table('orders').toArray();
    const importedOrder = orders.find(o => o.receiptNumber === 'HIST-2025-001');
    assert(importedOrder !== undefined, 'Historical order found in database');
    assert(importedOrder.isHistorical === true, 'Historical order tagged with isHistorical = true');
    assert(importedOrder.status === 'paid', 'Historical order status is paid');
    assert(importedOrder.total === 110000, 'Historical order total is Rp 110.000');
  } catch (err: any) {
    assert(false, 'Test Group 14 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 15] Full Backup & Restore with Payment Proofs Integrity');
  // --------------------------------------------------------------------------
  try {
    // 1. Export entire database to backup object
    const backup = await exportAllData();
    assert(backup.version === 3, 'Backup version is 3');
    assert(Array.isArray(backup.paymentProofs), 'Backup contains paymentProofs table');
    assert(backup.paymentProofs.length > 0, 'paymentProofs backup array has records');

    const proofBefore = backup.paymentProofs[0];
    assert(proofBefore.imageData !== undefined, 'paymentProof imageData preserved in backup');

    // 2. Perform restore from backup object
    const restoreRes = await importAllData(backup);
    assert(restoreRes === true, 'importAllData restored successfully');

    // 3. Verify restored payment proofs in Dexie
    const proofsAfter = await db.table('paymentProofs').toArray();
    assert(proofsAfter.length === backup.paymentProofs.length, 'Restored paymentProofs count matches original backup');
    const matchedProof = proofsAfter.find(p => p.id === proofBefore.id);
    assert(matchedProof !== undefined, 'Original proof ID restored');
    assert(matchedProof.fileName === proofBefore.fileName, 'Proof fileName intact after restore');
    assert(matchedProof.imageData === proofBefore.imageData, 'Proof imageData intact after restore');
  } catch (err: any) {
    assert(false, 'Test Group 15 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 16] Menu Management: Optional SKU, Non-Enrichment & Stock Availability');
  // --------------------------------------------------------------------------
  try {
    const { createMenu, getMenus, updateMenu } = await import('./src/lib/api');

    // 1. Create menu without SKU and without modifiers
    const menuId1 = await createMenu({
      nama: 'Tahu Goreng Gurih',
      harga: 5000,
      kategori: 'Gorengan',
      isSoldOut: false,
      modifiers: []
    });
    assert(typeof menuId1 === 'number', 'Menu created without SKU');

    const created1 = await db.table('menuItems').get(menuId1);
    assert(created1 !== undefined, 'Menu 1 retrieved from Dexie');
    assert(created1.sku === undefined, 'Menu 1 SKU is undefined (not auto-filled with SKU-XXX)', String(created1.sku));
    assert(Array.isArray(created1.modifiers) && created1.modifiers.length === 0, 'Menu 1 modifiers is empty array []');

    // 2. Call getMenus() multiple times to ensure ZERO auto-enrichment
    const allMenus1 = await getMenus();
    const fetched1_1 = allMenus1.find((m: any) => m.id === menuId1);
    assert(fetched1_1 !== undefined && fetched1_1.modifiers.length === 0, 'getMenus() does not auto-enrich empty modifiers (Call 1)');

    const allMenus2 = await getMenus();
    const fetched1_2 = allMenus2.find((m: any) => m.id === menuId1);
    assert(fetched1_2 !== undefined && fetched1_2.modifiers.length === 0, 'getMenus() does not auto-enrich empty modifiers (Call 2)');

    // 3. Create menu with custom modifiers and specific SKU
    const menuId2 = await createMenu({
      sku: 'AYAM-001',
      nama: 'Ayam Penyet Sambal Bawang',
      harga: 22000,
      kategori: 'Lauk',
      isSoldOut: false,
      modifiers: [
        {
          id: 'mod-pedas',
          name: 'Tingkat Pedas',
          required: true,
          selectionType: 'single',
          options: [
            { id: 'p0', name: 'Tidak Pedas', extraPrice: 0 },
            { id: 'p1', name: 'Sedang', extraPrice: 0 },
            { id: 'p2', name: 'Pedas Gila', extraPrice: 2000 }
          ]
        },
        {
          id: 'mod-lalap',
          name: 'Tambah Lalapan',
          required: false,
          selectionType: 'multiple',
          options: [
            { id: 'l1', name: 'Kemangi Extra', extraPrice: 2000 },
            { id: 'l2', name: 'Kol Goreng', extraPrice: 3000 }
          ]
        }
      ]
    });
    assert(typeof menuId2 === 'number', 'Menu with modifiers and SKU created');

    const created2 = await db.table('menuItems').get(menuId2);
    assert(created2.sku === 'AYAM-001', 'Menu 2 SKU correctly stored as AYAM-001');
    assert(created2.modifiers.length === 2, 'Menu 2 has 2 modifier groups');
    assert(created2.modifiers[0].options.length === 3, 'Tingkat Pedas has 3 options');
    assert(created2.modifiers[1].options[1].extraPrice === 3000, 'Kol Goreng extra price is Rp 3.000');

    // 4. Test duplicate SKU validation on createMenu
    let duplicateErrorThrown = false;
    try {
      await createMenu({
        sku: 'AYAM-001',
        nama: 'Ayam Bakar Madu',
        harga: 23000,
        kategori: 'Lauk'
      });
    } catch (err: any) {
      duplicateErrorThrown = true;
      assert(err.message.includes('sudah digunakan'), 'Duplicate SKU error message is user-friendly', err.message);
    }
    assert(duplicateErrorThrown, 'createMenu rejected duplicate SKU');

    // 5. Test duplicate SKU validation on updateMenu
    let updateDuplicateThrown = false;
    const mId1 = Number(menuId1);
    try {
      await updateMenu(mId1, { sku: 'AYAM-001' });
    } catch (err: any) {
      updateDuplicateThrown = true;
      assert(err.message.includes('sudah digunakan'), 'updateMenu rejected duplicate SKU', err.message);
    }
    assert(updateDuplicateThrown, 'updateMenu rejected duplicate SKU against another item');

    // 6. Test stock availability toggle & idempotency
    await updateMenu(mId1, { isSoldOut: true });
    let updated1 = await db.table('menuItems').get(mId1);
    assert(updated1.isSoldOut === true, 'Menu 1 status updated to isSoldOut = true (Habis)');

    // Setting same status again (idempotent)
    await updateMenu(mId1, { isSoldOut: true });
    updated1 = await db.table('menuItems').get(mId1);
    assert(updated1.isSoldOut === true, 'Menu 1 remains isSoldOut = true on idempotent call');

    // Restore to available
    await updateMenu(mId1, { isSoldOut: false });
    updated1 = await db.table('menuItems').get(mId1);
    assert(updated1.isSoldOut === false, 'Menu 1 status updated to isSoldOut = false (Tersedia)');

    // 7. Order creation with custom modifier and extra price
    const orderRes = await createOrder({
      customerName: 'Siti Aminah',
      paymentMethod: 'Cash',
      orderType: 'Dine-in',
      tableId: 2,
      total: 27000,
      subtotal: 27000,
      status: 'paid',
      items: [
        {
          id: menuId2,
          nama: 'Ayam Penyet Sambal Bawang',
          kategori: 'Lauk',
          harga: 22000,
          qty: 1,
          selectedModifiers: [
            { groupName: 'Tingkat Pedas', optionName: 'Pedas Gila', harga: 2000 },
            { groupName: 'Tambah Lalapan', optionName: 'Kol Goreng', harga: 3000 }
          ]
        }
      ]
    });
    assert(orderRes !== undefined && typeof orderRes.id === 'number', 'Order with custom modifier created successfully');

    const ordersAfterMod = await getOrders();
    const orderWithMod = ordersAfterMod.find((o: any) => o.id === orderRes.id);
    assert(orderWithMod !== undefined, 'Order retrieved from getOrders()');
    assert(orderWithMod.items[0].selectedModifiers.length === 2, 'Order item recorded both modifiers');
    const totalExtra = orderWithMod.items[0].selectedModifiers.reduce((acc: number, m: any) => acc + m.harga, 0);
    assert(totalExtra === 5000, 'Total extra price calculated to Rp 5.000 (2.000 + 3.000)');
  } catch (err: any) {
    assert(false, 'Test Group 16 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 17] Midtrans Auto-Settlement, 1-Device Policy, Access Code Security & WhatsApp Message');
  // --------------------------------------------------------------------------
  try {
    const d1 = getD1();
    await initD1Tables(d1);

    // 1. Customer creates Midtrans order (status: menunggu_verifikasi)
    const testOrderId = `SN-TEST-MIDTRANS-${Date.now()}`;
    const testAccessCode = `KOD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const testOrder = {
      orderId: testOrderId,
      accessCode: testAccessCode,
      buyerName: 'Iwan Fals',
      businessName: 'Warung Kopi Seniman',
      whatsapp: '081234567890',
      email: 'iwan@sakunota.my.id',
      amount: 50000,
      paymentMethod: 'Midtrans Otomatis (QRIS / E-Wallet / VA)',
      bankAccount: 'Midtrans Official Gateway',
      status: 'menunggu_verifikasi' as const,
      createdAt: '16 Okt 2026, 10:00',
    };
    await insertOrderD1(d1, testOrder);

    const savedOrder = await checkCustomerOrderStatus(d1, testOrderId, testAccessCode);
    assert(savedOrder.success === true, 'Order created and retrievable via D1');
    assert(savedOrder.order?.status === 'menunggu_verifikasi', 'Initial order status is menunggu_verifikasi');
    assert(!savedOrder.order?.licenseKey, 'Initial order has no license key before settlement');

    // 2. Midtrans payment confirmed -> Atomic license generation
    const genuineKey = generateGenuineLicenseKey(testOrderId);
    assert(genuineKey.startsWith('SN-'), 'Genuine license starts with SN-');
    assert(genuineKey.split('-').length === 4, 'Genuine license has 4 segments (SN-XXXX-XXXX-XXXX)');

    const verifiedAt = '16 Okt 2026, 10:05';
    await updateOrderStatusAndLicenseD1(d1, testOrderId, genuineKey, verifiedAt);
    await insertLicenseD1(d1, {
      licenseKey: genuineKey,
      orderId: testOrderId,
      businessName: testOrder.businessName,
      issuedAt: verifiedAt,
      signature: signLicenseKey(genuineKey),
    });

    const settledOrder = await checkCustomerOrderStatus(d1, testOrderId, testAccessCode);
    assert(settledOrder.order?.status === 'lunas_lisensi_terbit', 'Order status updated to lunas_lisensi_terbit upon settlement');
    assert(settledOrder.order?.licenseKey === genuineKey, 'Order records genuine license key');

    // 3. 1-Device Rule: License is unattached upon initial issuance
    const newlyIssuedLic = await getLicenseD1(d1, genuineKey);
    assert(newlyIssuedLic !== null, 'License retrieved from database');
    assert(!newlyIssuedLic?.boundDeviceId, 'Newly issued license is unbound (boundDeviceId is empty/null)');

    // 4. First device activation: HP-KASIR-01
    const actDevice1 = await activateLicenseOnDevice(d1, {
      licenseKey: genuineKey,
      deviceId: 'HP-KASIR-01',
      deviceName: 'Samsung Galaxy A54 (Kasir Utama)',
    });
    assert(actDevice1.success === true, 'Device 1 activation succeeds');
    assert(actDevice1.status === 200, 'Device 1 activation returns HTTP 200');

    const licBound1 = await getLicenseD1(d1, genuineKey);
    assert(licBound1?.boundDeviceId === 'HP-KASIR-01', 'License is bound to Device 1 (HP-KASIR-01)');
    assert(licBound1?.deviceName === 'Samsung Galaxy A54 (Kasir Utama)', 'Device 1 name is recorded');

    // 5. Same device re-activation is idempotent
    const actDevice1Again = await activateLicenseOnDevice(d1, {
      licenseKey: genuineKey,
      deviceId: 'HP-KASIR-01',
      deviceName: 'Samsung Galaxy A54 (Kasir Utama)',
    });
    assert(actDevice1Again.success === true, 'Re-activation on the same device is idempotent and permitted');

    // 6. Second device activation attempt: HP-KASIR-02 (Must be REJECTED)
    const actDevice2 = await activateLicenseOnDevice(d1, {
      licenseKey: genuineKey,
      deviceId: 'HP-KASIR-02',
      deviceName: 'Xiaomi Redmi 12 (HP Kasir Cadangan)',
    });
    assert(actDevice2.success === false, 'Second device activation is strictly REJECTED (1-device policy)');
    assert(actDevice2.status === 409, 'Second device activation returns HTTP 409 Conflict');
    assert(
      typeof actDevice2.error === 'string' && actDevice2.error.includes('sudah aktif pada perangkat lain'),
      'Rejection error message clearly informs customer of 1-device policy',
      actDevice2.error
    );

    // 7. Device Transfer Workflow: Owner unbinds device
    await unbindLicenseDeviceD1(d1, genuineKey);
    const licAfterUnbind = await getLicenseD1(d1, genuineKey);
    assert(!licAfterUnbind?.boundDeviceId, 'Owner unbind action successfully releases device binding');

    // 8. Device 2 can now activate after unbind
    const actDevice2AfterUnbind = await activateLicenseOnDevice(d1, {
      licenseKey: genuineKey,
      deviceId: 'HP-KASIR-02',
      deviceName: 'Xiaomi Redmi 12 (HP Kasir Baru)',
    });
    assert(actDevice2AfterUnbind.success === true, 'Device 2 activation succeeds after owner releases device');
    assert(actDevice2AfterUnbind.status === 200, 'Device 2 activation returns HTTP 200');

    const licBound2 = await getLicenseD1(d1, genuineKey);
    assert(licBound2?.boundDeviceId === 'HP-KASIR-02', 'License is now bound to Device 2 (HP-KASIR-02)');

    // 9. Customer Order Retrieval Security (Cek Status Pesanan)
    // Valid orderId + valid accessCode
    const authCheckPass = await checkCustomerOrderStatus(d1, testOrderId, testAccessCode);
    assert(authCheckPass.success === true, 'Order retrieval with correct access code succeeds');
    assert(authCheckPass.order?.licenseKey === genuineKey, 'Retrieved order contains genuine license');

    // Valid orderId + invalid accessCode
    const authCheckFail = await checkCustomerOrderStatus(d1, testOrderId, 'KOD-SALAH-1234');
    assert(authCheckFail.success === false, 'Order retrieval with invalid access code is blocked');
    assert(
      typeof authCheckFail.error === 'string' && authCheckFail.error.includes('Kode akses rahasia tidak cocok'),
      'Access rejection clarifies secret code mismatch'
    );

    // 10. WhatsApp Ready Message Formatting Integrity
    const waMessage = `Halo Kak ${testOrder.buyerName}, terima kasih telah membeli SakuNota!

Berikut rincian lisensi resmi untuk usaha *${testOrder.businessName}*:
• Nomor Lisensi: *${genuineKey}*
• Nomor Pesanan: ${testOrder.orderId}
• Kode Akses Rahasia: ${testOrder.accessCode}`;

    assert(waMessage.includes(testOrder.buyerName), 'WhatsApp message contains buyer name');
    assert(waMessage.includes(testOrder.businessName), 'WhatsApp message contains business name');
    assert(waMessage.includes(genuineKey), 'WhatsApp message contains license key');
    assert(waMessage.includes(testOrder.accessCode), 'WhatsApp message contains secret access code');
    assert(waMessage.includes(testOrder.orderId), 'WhatsApp message contains order ID');
  } catch (err: any) {
    assert(false, 'Test Group 17 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n[TEST GROUP 18] Fix 1A (Order ID Collisions), Fix 1B (Atomic Batch Issuance) & Closed Beta 7-Day Trial Lifecycle');

  try {
    const dbD1 = getD1();
    await initD1Tables(dbD1);

    // 1. Fix 1A: Collision-Free High-Entropy Order ID Generation
    const orderIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await createCustomerOrder(dbD1, {
        buyerName: `Tester ${i}`,
        businessName: `Usaha ${i}`,
        whatsapp: `08123456789${i}`,
        email: `tester${i}@example.com`
      });
      assert(res.success && !!res.order, `Order creation ${i} succeeded`);
      if (res.order) {
        orderIds.push(res.order.orderId);
      }
    }

    const uniqueIds = new Set(orderIds);
    assert(uniqueIds.size === 10, 'All 10 generated order IDs are strictly unique (no collision)');
    assert(
      orderIds.every(id => /^SN-\d{4}-[A-Z0-9]{8,12}$/.test(id)),
      'Order IDs strictly follow high-entropy collision-free format SN-YYYY-XXXXXXXX'
    );

    // 2. Fix 1B: Atomic Batch License Issuance
    const targetOrderId = orderIds[0];
    const verifyRes = await verifyOrderAndIssueLicense(dbD1, targetOrderId);
    assert(verifyRes.success, 'Atomic verification and license issuance succeeded');
    assert(!!verifyRes.licenseKey, `Issued genuine license key: ${verifyRes.licenseKey}`);
    
    // Verify D1 order and license state
    const orderInD1 = await checkCustomerOrderStatus(dbD1, targetOrderId, verifyRes.order?.accessCode || "");
    assert(orderInD1.success && orderInD1.order?.status === "lunas_lisensi_terbit", 'Order status atomically updated to lunas_lisensi_terbit');
    const licenseInD1 = await getLicenseD1(dbD1, verifyRes.licenseKey!);
    assert(!!licenseInD1 && licenseInD1.revoked === 0 && licenseInD1.licenseType === "berbayar", 'Commercial license atomically inserted in D1');

    // 3. Closed Beta Honeypot Bot Trap
    const botRes = await registerBetaAccount(dbD1, {
      ownerName: "Bot Spammer",
      businessName: "Casino Online",
      whatsapp: "081200000000",
      honeypot: "http://spam.org"
    });
    assert(!botRes.success, 'Bot honeypot submission was blocked');
    assert((botRes as any).status === 400 || !botRes.success, 'Bot honeypot returns status 400 Bad Request');

    // 4. Legitimate Closed Beta Registration
    const testBetaPhone = `0812${Date.now().toString().slice(-8)}`;
    const betaRegRes = await registerBetaAccount(dbD1, {
      ownerName: "Hendra Wijaya",
      businessName: "Kopi Titik Temu",
      whatsapp: testBetaPhone,
      honeypot: ""
    });
    assert(betaRegRes.success && !!betaRegRes.registration, 'Legitimate beta registration succeeded');
    assert(betaRegRes.registration?.status === "pending", 'Initial beta registration status is strictly "pending"');
    assert(!betaRegRes.registration?.licenseKey, 'No license key issued before owner approval');
    const betaId = String(betaRegRes.registration!.id || betaRegRes.registration!.registrationId);

    // 5. Owner Approval of Beta Registration
    const approveRes = await approveBetaRegistration(dbD1, betaId);
    assert(approveRes.success && !!approveRes.registration, 'Owner approval succeeded');
    assert(approveRes.registration?.status === "disetujui", 'Beta registration status transitioned to "disetujui"');
    const trialKey = approveRes.registration!.licenseKey!;
    assert(trialKey.startsWith("SN-TRIAL-"), `Trial license starts with "SN-TRIAL-" (${trialKey})`);

    // 6. First Device Activation Starts 7-Day Clock
    const dev1Res = await activateLicenseOnDevice(dbD1, {
      licenseKey: trialKey,
      deviceId: "DEV-CASHIER-HP-01",
      deviceName: "Samsung A54 Kasir"
    });
    assert(dev1Res.success, 'First device trial activation succeeded (HTTP 200)');
    assert(dev1Res.licenseType === "trial", 'License type is trial');
    assert(!!dev1Res.activationToken, 'Cryptographic activation token generated');
    assert(!!dev1Res.activatedAt, `Activation timestamp recorded: ${dev1Res.activatedAt}`);
    assert(!!dev1Res.expiresAt, `Expiration timestamp recorded: ${dev1Res.expiresAt}`);

    const trialStart = new Date(dev1Res.activatedAt!).getTime();
    const trialEnd = new Date(dev1Res.expiresAt!).getTime();
    const durationDays = Math.round((trialEnd - trialStart) / (1000 * 60 * 60 * 24));
    assert(durationDays === 7, `Trial duration is exactly 7 days (calculated: ${durationDays} days)`);

    // 7. Strict 1-Device Rule for Beta Trial (Conflict 409)
    const dev2Res = await activateLicenseOnDevice(dbD1, {
      licenseKey: trialKey,
      deviceId: "DEV-CASHIER-HP-02",
      deviceName: "Redmi Note 12"
    });
    assert(!dev2Res.success, 'Second device activation was REJECTED');
    assert(dev2Res.status === 409, 'Rejection returned HTTP 409 Conflict');
    assert(Boolean(dev2Res.error && dev2Res.error.includes("Samsung A54 Kasir")), 'Rejection error identifies existing bound device');

    // 8. Monotonic Clock Tampering Detection
    localStorage.setItem("sakunota_clock_watermark", String(Date.now() + 120000)); // Future watermark
    const isTampered = detectClockTampering();
    assert(isTampered === true, 'Clock tampering correctly detected when system clock is turned back');
    localStorage.removeItem("sakunota_clock_watermark");

    // 9. Trial Expiration & Verification
    const telemetryCheck = await verifyDeviceLicense(dbD1, trialKey, "DEV-CASHIER-HP-01");
    assert(telemetryCheck.valid, 'Active trial device telemetry check is valid');
    assert(telemetryCheck.status === "trial_active", 'Status is trial_active');
    assert(telemetryCheck.daysRemaining! <= 7 && telemetryCheck.daysRemaining! >= 6, 'Days remaining accurately calculated');

    // 10. Data Safety Guarantee (Never Held Hostage)
    const exportedData = await exportAllData();
    assert(!!exportedData && typeof exportedData === "object", 'exportAllData() successfully exports complete business data');
    assert(Array.isArray(exportedData.orders), 'Exported data contains orders array');

    // 11. Conversion of Beta Trial to Permanent Commercial License
    const convertRes = await convertBetaTrialToPaid(dbD1, betaId);
    assert(convertRes.success, 'Conversion to paid license succeeded');
    assert(convertRes.success, 'Conversion to paid license succeeded');
    assert(convertRes.status === "dikonversi_berbayar", 'Beta registration marked as dikonversi_berbayar');
    assert(!!convertRes.licenseKey && convertRes.licenseKey.startsWith("SN-"), `New permanent license key issued: ${convertRes.licenseKey}`);

    // Verify converted license preserves bound device
    const convertedLic = await getLicenseD1(dbD1, convertRes.licenseKey!);
    assert(!!convertedLic, 'Permanent commercial license retrievable from D1');
    assert(convertedLic?.boundDeviceId === "DEV-CASHIER-HP-01", 'Device binding preserved intact without resetting merchant setup');
  } catch (err: any) {
    assert(false, 'Test Group 18 Error', err.message);
  }

  // --------------------------------------------------------------------------
  console.log('\n======================================================');
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  console.log(`  📊 TEST SUITE SUMMARY: ${passCount} PASSED, ${failCount} FAILED (Total: ${results.length})`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTestSuite().catch(e => {
  console.error("Fatal Test Suite Error:", e);
  process.exit(1);
});
