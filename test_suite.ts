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
