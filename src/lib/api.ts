import { db, MenuItem, Order, OrderItem, Payment, SelectedModifier } from './dexie';
import initialData from './initialData.json';

export function getDefaultModifiersForCategory(kategori: string, nama: string) {
  const cat = (kategori || '').toLowerCase();
  const name = (nama || '').toLowerCase();

  const isDrink = cat.includes('minuman') || cat.includes('tea') || cat.includes('matcha') || 
                  cat.includes('milkshake') || cat.includes('coffee') || cat.includes('drink') || 
                  name.includes('teh') || name.includes('kopi') || name.includes('latte') || name.includes('juice');

  if (isDrink) {
    return [
      {
        id: 'mod_sweetness',
        nama: 'Tingkat Kemanisan',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'sw_normal', nama: 'Normal Sugar', harga: 0 },
          { id: 'sw_less', nama: 'Less Sugar', harga: 0 },
          { id: 'sw_none', nama: 'No Sugar', harga: 0 },
          { id: 'sw_extra', nama: 'Extra Sugar (+1k)', harga: 1000 }
        ]
      },
      {
        id: 'mod_ice',
        nama: 'Pilihan Es',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'ice_normal', nama: 'Normal Ice', harga: 0 },
          { id: 'ice_less', nama: 'Less Ice', harga: 0 },
          { id: 'ice_none', nama: 'No Ice (Hangat/Panas)', harga: 0 }
        ]
      },
      {
        id: 'mod_topping',
        nama: 'Topping Tambahan',
        required: false,
        minSelect: 0,
        maxSelect: 3,
        options: [
          { id: 'top_boba', nama: 'Boba / Pearl', harga: 4000 },
          { id: 'top_jelly', nama: 'Grass Jelly', harga: 3000 },
          { id: 'top_shot', nama: 'Extra Shot Espresso', harga: 5000 }
        ]
      }
    ];
  }

  const isFood = cat.includes('makanan') || cat.includes('lauk') || cat.includes('sambel') ||
                 name.includes('nasi') || name.includes('ayam') || name.includes('iga') || name.includes('sate') || name.includes('pindang');

  if (isFood) {
    return [
      {
        id: 'mod_spicy',
        nama: 'Level Pedas',
        required: true,
        minSelect: 1,
        maxSelect: 1,
        options: [
          { id: 'sp_none', nama: 'Tidak Pedas', harga: 0 },
          { id: 'sp_mild', nama: 'Sedang (Normal)', harga: 0 },
          { id: 'sp_hot', nama: 'Pedas Banget 🔥', harga: 0 }
        ]
      },
      {
        id: 'mod_addon_food',
        nama: 'Tambahan Lauk / Pelengkap',
        required: false,
        minSelect: 0,
        maxSelect: 3,
        options: [
          { id: 'ad_sambel', nama: 'Ekstra Sambel Cumi', harga: 5000 },
          { id: 'ad_lalap', nama: 'Ekstra Lalapan Segar', harga: 2000 },
          { id: 'ad_pete', nama: 'Tambah Pete Bakar', harga: 5000 }
        ]
      }
    ];
  }

  return [];
}

let isInitializingMenus = false;

export async function getMenus() {
  let count = await db.table('menuItems').count();
  if (count === 0 && initialData.menus.length > 0 && !isInitializingMenus) {
    isInitializingMenus = true;
    try {
      count = await db.table('menuItems').count();
      if (count === 0) {
        const menusToInsert = initialData.menus.map(m => ({
          nama: m.nama,
          harga: m.harga,
          kategori: m.kategori,
          isSoldOut: m.isSoldOut,
          urutan: m.urutan,
          modifiers: (m as any).modifiers || getDefaultModifiersForCategory(m.kategori, m.nama)
        }));
        await db.table('menuItems').bulkAdd(menusToInsert);
      }
    } finally {
      isInitializingMenus = false;
    }
  }

  let menus = await db.table('menuItems').orderBy('urutan').toArray();

  // Deduplikasi menu (menghapus yang double dengan nama yang sama)
  const seenNames = new Set();
  const duplicateIds: number[] = [];
  const uniqueMenus = [];
  
  for (const m of menus) {
    if (seenNames.has(m.nama)) {
      duplicateIds.push(m.id);
    } else {
      seenNames.add(m.nama);
      uniqueMenus.push(m);
    }
  }

  if (duplicateIds.length > 0) {
    await db.table('menuItems').bulkDelete(duplicateIds);
    menus = uniqueMenus;
  }

  // Auto-enrich item menu jika belum memiliki modifier
  for (const m of menus) {
    if (!m.modifiers || m.modifiers.length === 0) {
      const defaultMods = getDefaultModifiersForCategory(m.kategori, m.nama);
      if (defaultMods.length > 0) {
        m.modifiers = defaultMods;
        await db.table('menuItems').update(m.id, { modifiers: defaultMods });
      }
    }
  }

  return menus;
}

export async function createMenu(data: { nama: string, harga: number, kategori: string, modifiers?: any[] }) {
  const count = await db.table('menuItems').count();
  const defaultMods = data.modifiers || getDefaultModifiersForCategory(data.kategori, data.nama);
  await db.table('menuItems').add({
    nama: data.nama,
    harga: Number(data.harga),
    kategori: data.kategori,
    isSoldOut: false,
    urutan: count,
    modifiers: defaultMods
  });
}

export async function deleteMenus(ids: number[]) {
  await db.table('menuItems').bulkDelete(ids);
}

export async function reorderMenus(items: {id: number, urutan: number}[]) {
  await db.transaction('rw', 'menuItems', async () => {
    for (const item of items) {
      await db.table('menuItems').update(item.id, { urutan: item.urutan });
    }
  });
}

let isInitializingTables = false;

export async function getTables() {
  let tables = await db.table('tables').toArray();
  
  // Auto init 15 tables if empty
  if (tables.length === 0 && !isInitializingTables) {
    isInitializingTables = true;
    try {
      const count = await db.table('tables').count();
      if (count === 0) {
        const defaultTables = Array.from({length: 15}).map((_, i) => ({
          nomor: `Meja ${i+1}`,
          status: 'kosong'
        }));
        await db.table('tables').bulkAdd(defaultTables);
      }
    } finally {
      isInitializingTables = false;
    }
    tables = await db.table('tables').toArray();
  }

  // Deduplikasi otomatis
  const seenNames = new Set();
  const duplicateIds: number[] = [];
  const uniqueTables = [];
  
  for (const t of tables) {
    if (seenNames.has(t.nomor)) {
      duplicateIds.push(t.id);
    } else {
      seenNames.add(t.nomor);
      uniqueTables.push(t);
    }
  }

  if (duplicateIds.length > 0) {
    await db.table('tables').bulkDelete(duplicateIds);
    tables = uniqueTables;
  }

  return tables.sort((a: any, b: any) =>
    a.nomor.localeCompare(b.nomor, 'id', { numeric: true })
  );
}

export async function setTableStatus(id: number, status: 'kosong' | 'open' | 'lunas') {
  await db.table('tables').update(id, { status });
}

export async function countUnpaidOrdersForTable(tableId: number) {
  const orders = await db.table('orders').toArray();
  return orders.filter((o: any) => o.tableId === tableId && o.status === 'unpaid').length;
}

export async function refreshTableStatus(tableId: number, justPaid: boolean = false) {
  const unpaid = await countUnpaidOrdersForTable(tableId);
  if (unpaid > 0) {
    await setTableStatus(tableId, 'open');
  } else if (justPaid) {
    await setTableStatus(tableId, 'lunas');
  }
}

export async function clearTable(tableId: number) {
  const unpaid = await countUnpaidOrdersForTable(tableId);
  if (unpaid > 0) {
    throw new Error('Masih ada tagihan yang belum lunas di meja ini.');
  }
  await setTableStatus(tableId, 'kosong');
}

export async function addTable(nomor: string) {
  const name = nomor.trim();
  if (!name) throw new Error('Nama meja tidak boleh kosong.');
  const existing = await db.table('tables').toArray();
  if (existing.some((t: any) => t.nomor.toLowerCase() === name.toLowerCase())) {
    throw new Error(`"${name}" sudah ada.`);
  }
  await db.table('tables').add({ nomor: name, status: 'kosong' });
}

export async function renameTable(id: number, nomor: string) {
  const name = nomor.trim();
  if (!name) throw new Error('Nama meja tidak boleh kosong.');
  await db.table('tables').update(id, { nomor: name });
}

export async function deleteTable(id: number) {
  const table = await db.table('tables').get(id);
  const unpaid = await countUnpaidOrdersForTable(id);
  if (unpaid > 0 || (table && table.status !== 'kosong' && table.status !== 'available')) {
    throw new Error('Meja masih dipakai. Kosongkan meja dulu sebelum dihapus.');
  }
  await db.table('tables').delete(id);
}

// --- ORDER & TRANSAKSI DENGAN SNAPSHOTTING & ATOMIC TRANSACTIONS ---

export async function getOrders() {
  const orders = await db.table('orders').reverse().toArray();
  const orderItems = await db.table('orderItems').toArray();
  const menus = await db.table('menuItems').toArray();
  const payments = await db.table('payments').toArray();

  return orders.map(order => {
    const items = orderItems.filter(i => i.orderId === order.id).map(i => {
      const matchedMenu = menus.find(m => m.id === i.menuItemId);
      return {
        ...i,
        nama: i.namaMenu || matchedMenu?.nama || 'Item',
        kategori: i.kategoriMenu || matchedMenu?.kategori || 'Umum',
        menuItem: matchedMenu || { nama: i.namaMenu || 'Item', kategori: i.kategoriMenu || 'Umum' },
        selectedModifiers: i.selectedModifiers || [],
        paidQty: i.paidQty || 0
      };
    });

    const orderPayments = payments.filter(p => p.orderId === order.id);
    const completedPayments = orderPayments.filter(p => p.status === 'completed');
    const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, order.total - totalPaid);

    return {
      ...order,
      items,
      payments: orderPayments,
      paidAmount: orderPayments.length > 0 ? totalPaid : (order.status === 'paid' ? order.total : 0),
      remainingBalance: orderPayments.length > 0 ? remainingBalance : (order.status === 'paid' ? 0 : order.total)
    };
  });
}

export async function createOrder(data: any) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'shifts', 'tables', 'auditLogs'], async () => {
    // 1. Atomic Idempotency check di dalam transaksi (OWASP Compliance)
    if (data.idempotencyKey) {
      const existing = await db.table('orders').where('idempotencyKey').equals(data.idempotencyKey).first();
      if (existing) {
        console.warn("Atomic Idempotency guard hit: Order already processed with key", data.idempotencyKey);
        return { id: existing.id, createdAt: existing.createdAt, isDuplicate: true };
      }
    }

    // 2. Cap transaksi ke shift kasir aktif (atomic query)
    let currentShiftId = data.shiftId || null;
    if (!currentShiftId) {
      const activeShift = await db.table('shifts').where('status').equals('open').first();
      if (activeShift) currentShiftId = activeShift.id;
    }

    const orderStatus = data.status || 'paid';
    const isPaid = orderStatus === 'paid';
    const total = data.total;

    // 3. Simpan Nota Induk (Parent Order)
    const orderId = await db.table('orders').add({
      shiftId: currentShiftId,
      idempotencyKey: data.idempotencyKey || null,
      tableId: data.tableId || null,
      subtotal: data.subtotal || total,
      discount: data.discount || 0,
      discountType: data.discountType || null,
      discountValue: data.discountValue || 0,
      tax: data.tax || 0,
      serviceCharge: data.serviceCharge || 0,
      total: total,
      paidAmount: isPaid ? total : 0,
      remainingBalance: isPaid ? 0 : total,
      cashTendered: data.cashTendered || null,
      change: data.change || null,
      status: orderStatus,
      customerName: data.customerName,
      customerPhone: data.customerPhone || null,
      paymentMethod: data.paymentMethod || 'Cash',
      orderType: data.orderType || 'Dine-in',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Simpan Order Items dengan IMMUTABLE SNAPSHOT (namaMenu, kategoriMenu, hargaSatuan)
    const itemsToInsert = data.items.map((item: any) => ({
      orderId: orderId as number,
      menuItemId: item.id || item.menuItemId,
      namaMenu: item.nama || item.namaMenu || 'Item',
      kategoriMenu: item.kategori || item.kategoriMenu || 'Umum',
      qty: item.qty,
      paidQty: isPaid ? item.qty : (item.paidQty || 0),
      hargaSatuan: item.harga || item.hargaSatuan,
      selectedModifiers: item.selectedModifiers || []
    }));

    await db.table('orderItems').bulkAdd(itemsToInsert);

    // 5. Jika transaksi dibuat langsung lunas, catat entri pembayaran awal di tabel payments
    if (isPaid && total > 0) {
      await db.table('payments').add({
        orderId: orderId as number,
        shiftId: currentShiftId,
        paymentMethod: data.paymentMethod || 'Cash',
        amount: total,
        cashTendered: data.cashTendered || total,
        change: data.change || 0,
        splitType: 'full',
        paidAt: new Date().toISOString(),
        operatorName: data.operatorName || 'Kasir',
        notes: data.notes || 'Pembayaran Penuh',
        status: 'completed'
      });
    }

    return { id: orderId, createdAt: new Date().toISOString() };
  });
}

export async function updateOrder(id: number, data: any) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables'], async () => {
    await db.table('orders').update(id, {
      subtotal: data.subtotal || data.total,
      discount: data.discount || 0,
      discountType: data.discountType || null,
      discountValue: data.discountValue || 0,
      tax: data.tax || 0,
      serviceCharge: data.serviceCharge || 0,
      total: data.total,
      cashTendered: data.cashTendered || null,
      change: data.change || null,
      status: data.status || 'unpaid',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      paymentMethod: data.paymentMethod,
      orderType: data.orderType,
      tableId: data.tableId || null,
      notes: data.notes || '',
      updatedAt: new Date().toISOString(),
    });

    // Hapus item lama dan simpan item baru dengan snapshot lengkap
    const oldItems = await db.table('orderItems').where({ orderId: id }).toArray();
    const oldItemIds = oldItems.map(i => i.id!).filter(Boolean);
    await db.table('orderItems').bulkDelete(oldItemIds);

    const itemsToInsert = data.items.map((item: any) => ({
      orderId: id,
      menuItemId: item.id || item.menuItemId,
      namaMenu: item.nama || item.namaMenu || 'Item',
      kategoriMenu: item.kategori || item.kategoriMenu || 'Umum',
      qty: item.qty,
      paidQty: item.paidQty || 0,
      hargaSatuan: item.harga || item.hargaSatuan,
      selectedModifiers: item.selectedModifiers || []
    }));
    await db.table('orderItems').bulkAdd(itemsToInsert);
    return { id };
  });
}

// --- SISTEM SPLIT BILL & PEMBAYARAN PARSIAL (ATOMIC TRANSACTIONS) ---

export async function recordPayment(data: {
  orderId: number;
  shiftId?: number | null;
  paymentMethod: 'Cash' | 'QRIS' | 'Transfer';
  amount: number;
  cashTendered?: number;
  change?: number;
  splitType: 'full' | 'item' | 'equal' | 'partial';
  itemsPaid?: { menuItemId: number; itemKey?: string; nama: string; qty: number; harga: number }[];
  operatorName: string;
  notes?: string;
}) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables', 'shifts', 'auditLogs'], async () => {
    const order = await db.table('orders').get(data.orderId);
    if (!order) throw new Error('Nota tidak ditemukan.');
    if (order.status === 'void') throw new Error('Nota sudah dibatalkan (void).');

    // 1. Tentukan shift ID aktif secara atomic
    let shiftId = data.shiftId || null;
    if (!shiftId) {
      const activeShift = await db.table('shifts').where('status').equals('open').first();
      if (activeShift) shiftId = activeShift.id;
    }

    // 2. Ambil seluruh pembayaran aktif sebelumnya
    const existingPayments = await db.table('payments')
      .where('orderId').equals(data.orderId)
      .and((p: any) => p.status === 'completed')
      .toArray();

    const alreadyPaid = existingPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const remainingBefore = Math.max(0, order.total - alreadyPaid);

    if (remainingBefore <= 0) {
      throw new Error('Nota ini sudah lunas.');
    }

    // Batasi nominal bayar agar tidak melebihi sisa tagihan
    const payAmount = Math.min(data.amount, remainingBefore);
    if (payAmount <= 0) {
      throw new Error('Nominal pembayaran harus lebih dari Rp 0.');
    }

    const cashTendered = data.paymentMethod === 'Cash' ? (data.cashTendered || payAmount) : payAmount;
    const change = data.paymentMethod === 'Cash' ? Math.max(0, cashTendered - payAmount) : 0;

    // 3. Masukkan rekaman pembayaran baru
    const paymentId = await db.table('payments').add({
      orderId: data.orderId,
      shiftId: shiftId,
      paymentMethod: data.paymentMethod,
      amount: payAmount,
      cashTendered: cashTendered,
      change: change,
      splitType: data.splitType || 'partial',
      itemsPaid: data.itemsPaid || [],
      paidAt: new Date().toISOString(),
      operatorName: data.operatorName || 'Kasir',
      notes: data.notes || '',
      status: 'completed'
    });

    // 4. Jika Split by Item: tandai item yang telah terbayar
    if (data.splitType === 'item' && data.itemsPaid && data.itemsPaid.length > 0) {
      const orderItems = await db.table('orderItems').where('orderId').equals(data.orderId).toArray();
      for (const paidItem of data.itemsPaid) {
        const oi = orderItems.find((i: any) => i.menuItemId === paidItem.menuItemId);
        if (oi) {
          const currentPaidQty = oi.paidQty || 0;
          await db.table('orderItems').update(oi.id, {
            paidQty: Math.min(oi.qty, currentPaidQty + paidItem.qty)
          });
        }
      }
    }

    const newTotalPaid = alreadyPaid + payAmount;
    const remainingAfter = Math.max(0, order.total - newTotalPaid);
    const isFullyPaid = remainingAfter === 0;

    // 5. Update Nota Induk
    await db.table('orders').update(data.orderId, {
      paidAmount: newTotalPaid,
      remainingBalance: remainingAfter,
      status: isFullyPaid ? 'paid' : 'unpaid',
      updatedAt: new Date().toISOString()
    });

    // 6. Sinkronisasi status meja
    if (order.tableId) {
      if (isFullyPaid) {
        await refreshTableStatus(order.tableId, true); // Ubah ke 'lunas' (meja terisi tapi sudah bayar)
      } else {
        await setTableStatus(order.tableId, 'open'); // Tetap open jika masih ada sisa tagihan
      }
    }

    // 7. Catat audit trail
    await db.table('auditLogs').add({
      action: isFullyPaid ? 'PAYMENT' : 'PARTIAL_PAYMENT',
      orderId: data.orderId,
      amount: payAmount,
      reason: `Pembayaran ${data.splitType} (${data.paymentMethod}): Rp ${payAmount.toLocaleString('id-ID')} (Sisa: Rp ${remainingAfter.toLocaleString('id-ID')})`,
      refundMethod: data.paymentMethod,
      operator: data.operatorName || 'Kasir',
      timestamp: new Date().toISOString()
    });

    return {
      paymentId: paymentId as number,
      amountPaid: payAmount,
      newTotalPaid,
      remainingBalance: remainingAfter,
      isFullyPaid
    };
  });
}

export async function refundPartialPayment(paymentId: number, options: { reason: string, operator: string }) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables', 'auditLogs'], async () => {
    const payment = await db.table('payments').get(paymentId);
    if (!payment) throw new Error('Data pembayaran tidak ditemukan.');
    if (payment.status === 'refunded') throw new Error('Pembayaran ini sudah pernah di-refund.');

    const order = await db.table('orders').get(payment.orderId);
    if (!order) throw new Error('Nota tidak ditemukan.');

    // 1. Tandai pembayaran sebagai refunded
    await db.table('payments').update(paymentId, {
      status: 'refunded',
      refundReason: options.reason || 'Refund Pembayaran Parsial',
      refundedAt: new Date().toISOString(),
      refundOperator: options.operator || 'Admin'
    });

    // 2. Kembalikan paidQty item jika tipe split per item
    if (payment.splitType === 'item' && payment.itemsPaid && payment.itemsPaid.length > 0) {
      const orderItems = await db.table('orderItems').where('orderId').equals(payment.orderId).toArray();
      for (const paidItem of payment.itemsPaid) {
        const oi = orderItems.find((i: any) => i.menuItemId === paidItem.menuItemId);
        if (oi && oi.paidQty) {
          await db.table('orderItems').update(oi.id, {
            paidQty: Math.max(0, oi.paidQty - paidItem.qty)
          });
        }
      }
    }

    // 3. Hitung ulang akumulasi pembayaran aktif
    const activePayments = await db.table('payments')
      .where('orderId').equals(payment.orderId)
      .and((p: any) => p.status === 'completed')
      .toArray();

    const newTotalPaid = activePayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const newRemaining = Math.max(0, order.total - newTotalPaid);

    // 4. Update status nota induk
    await db.table('orders').update(payment.orderId, {
      paidAmount: newTotalPaid,
      remainingBalance: newRemaining,
      status: newRemaining === 0 && newTotalPaid > 0 ? 'paid' : 'unpaid',
      updatedAt: new Date().toISOString()
    });

    // 5. Update meja kembali ke open jika ada sisa tagihan
    if (order.tableId) {
      if (newRemaining > 0) {
        await setTableStatus(order.tableId, 'open');
      } else {
        await refreshTableStatus(order.tableId);
      }
    }

    // 6. Catat log audit
    await db.table('auditLogs').add({
      action: 'PARTIAL_REFUND',
      orderId: payment.orderId,
      amount: payment.amount,
      reason: `Refund pembayaran parsial #${paymentId} (${payment.paymentMethod}): ${options.reason}`,
      refundMethod: payment.paymentMethod === 'Cash' ? 'Tunai' : payment.paymentMethod,
      operator: options.operator || 'Admin',
      timestamp: new Date().toISOString()
    });

    return {
      paymentId,
      refundedAmount: payment.amount,
      newTotalPaid,
      remainingBalance: newRemaining
    };
  });
}

export async function getOrderPayments(orderId: number) {
  return await db.table('payments').where('orderId').equals(orderId).toArray();
}

export async function getAuditLogs() {
  return await db.table('auditLogs').reverse().toArray();
}

export async function processVoidRefund(orderId: number, options: { reason: string, isRefunded: boolean, refundAmount: number, refundMethod: string, operator: string }) {
  const order = await db.table('orders').get(orderId);
  if (!order) throw new Error('Nota tidak ditemukan.');

  await db.transaction('rw', ['orders', 'payments', 'tables', 'auditLogs'], async () => {
    await db.table('orders').update(orderId, {
      status: 'void',
      voidReason: options.reason || 'Dibatalkan',
      voidedAt: new Date().toISOString(),
      isRefunded: options.isRefunded,
      refundAmount: options.refundAmount,
      refundMethod: options.refundMethod,
      updatedAt: new Date().toISOString()
    });

    // Tandai seluruh payment dari nota ini sebagai refunded jika ada
    const orderPayments = await db.table('payments').where('orderId').equals(orderId).toArray();
    for (const p of orderPayments) {
      if (p.status === 'completed') {
        await db.table('payments').update(p.id, {
          status: 'refunded',
          refundReason: `Void Nota: ${options.reason}`,
          refundedAt: new Date().toISOString(),
          refundOperator: options.operator || 'Admin'
        });
      }
    }

    // Catat log audit
    await db.table('auditLogs').add({
      action: options.isRefunded ? 'REFUND' : 'VOID',
      orderId: orderId,
      amount: order.total,
      reason: options.reason,
      refundMethod: options.refundMethod,
      operator: options.operator || 'Admin',
      timestamp: new Date().toISOString()
    });

    if (order.tableId) {
      await refreshTableStatus(order.tableId);
    }
  });

  return true;
}

export async function voidOrder(orderId: number, reason: string) {
  return await processVoidRefund(orderId, {
    reason: reason,
    isRefunded: false,
    refundAmount: 0,
    refundMethod: 'None',
    operator: 'Kasir/Admin'
  });
}

export async function deleteOrders(ids: number[]) {
  await db.transaction('rw', ['orders', 'orderItems', 'payments'], async () => {
    await db.table('orders').bulkDelete(ids);
    const items = await db.table('orderItems').toArray();
    const itemIdsToDelete = items.filter(i => ids.includes(i.orderId)).map(i => i.id!).filter(Boolean);
    await db.table('orderItems').bulkDelete(itemIdsToDelete);
    
    const payments = await db.table('payments').toArray();
    const paymentIdsToDelete = payments.filter(p => ids.includes(p.orderId)).map(p => p.id!).filter(Boolean);
    await db.table('payments').bulkDelete(paymentIdsToDelete);
  });
}

// --- MANAJEMEN SHIFT & REKONSILIASI KAS PRESISI TINGGI ---

export async function getActiveShift() {
  const shifts = await db.table('shifts').where({ status: 'open' }).toArray();
  return shifts.length > 0 ? shifts[0] : null;
}

export async function getAllShifts() {
  return await db.table('shifts').reverse().toArray();
}

export async function getShiftLiveStats(shiftId: number) {
  const shift = await db.table('shifts').get(shiftId);
  if (!shift) throw new Error('Shift tidak ditemukan.');

  const allPayments = await db.table('payments').where('shiftId').equals(shiftId).toArray();
  const allOrders = await db.table('orders').toArray();
  const shiftOrders = allOrders.filter(o => o.shiftId === shiftId);

  let cashSales = 0;
  let nonCashSales = 0;
  let cashRefunds = 0;

  if (allPayments.length > 0) {
    // 1. Penjualan Tunai Murni: HANYA dari pembayaran berstatus 'completed' dengan metode Cash
    cashSales = allPayments
      .filter((p: any) => p.status === 'completed' && p.paymentMethod === 'Cash')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // 2. Penjualan Non-Tunai: QRIS & Transfer Bank (Tercatat terpisah, TIDAK masuk kas fisik laci)
    nonCashSales = allPayments
      .filter((p: any) => p.status === 'completed' && p.paymentMethod !== 'Cash')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // 3. Refund Tunai
    const refundedPaymentsCash = allPayments
      .filter((p: any) => p.status === 'refunded' && p.paymentMethod === 'Cash')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const voidedOrdersCash = shiftOrders
      .filter(o => o.status === 'void' && o.isRefunded && o.refundMethod === 'Tunai')
      .reduce((sum, o) => sum + (o.refundAmount || o.total), 0);

    cashRefunds = Math.max(refundedPaymentsCash, voidedOrdersCash);
  } else {
    // Fallback transaksi legacy
    cashSales = shiftOrders
      .filter(o => o.status !== 'void' && o.paymentMethod === 'Cash')
      .reduce((sum, o) => sum + o.total, 0);

    nonCashSales = shiftOrders
      .filter(o => o.status !== 'void' && o.paymentMethod !== 'Cash')
      .reduce((sum, o) => sum + o.total, 0);

    cashRefunds = shiftOrders
      .filter(o => o.status === 'void' && o.isRefunded && o.refundMethod === 'Tunai')
      .reduce((sum, o) => sum + (o.refundAmount || o.total), 0);
  }

  // 4. Pergerakan Kas Operasional Manual (Kas Masuk & Kas Keluar)
  const movements = await db.table('cashMovements').where({ shiftId }).toArray();
  const cashIn = movements.filter(m => m.type === 'in').reduce((sum, m) => sum + m.amount, 0);
  const cashOut = movements.filter(m => m.type === 'out').reduce((sum, m) => sum + m.amount, 0);

  // Rumus Finansial Kas Fisik Standar Akuntansi POS:
  // Expected Cash = Modal Awal + Penjualan Tunai - Refund Tunai + Kas Masuk - Kas Keluar
  const expectedCash = (Number(shift.startingCash) || 0) + cashSales - cashRefunds + cashIn - cashOut;

  return {
    ...shift,
    totalTransactions: allPayments.length > 0 ? allPayments.filter((p: any) => p.status === 'completed').length : shiftOrders.filter(o => o.status !== 'void').length,
    cashSales,
    nonCashSales,
    cashRefunds,
    cashIn,
    cashOut,
    expectedCash,
    movements
  };
}

export async function openShift(data: { operatorName: string, startingCash: number, notes?: string }) {
  const active = await getActiveShift();
  if (active) {
    throw new Error('Shift atas nama "' + active.operatorName + '" masih aktif. Tutup shift terlebih dahulu.');
  }

  const shiftData = {
    operatorName: data.operatorName || 'Kasir',
    startTime: new Date().toISOString(),
    startingCash: Number(data.startingCash) || 0,
    cashSales: 0,
    nonCashSales: 0,
    cashRefunds: 0,
    cashIn: 0,
    cashOut: 0,
    expectedCash: Number(data.startingCash) || 0,
    status: 'open',
    notes: data.notes || ''
  };

  const id = await db.table('shifts').add(shiftData);

  await db.table('auditLogs').add({
    action: 'OPEN_SHIFT',
    amount: Number(data.startingCash) || 0,
    reason: `Buka Shift Baru (Modal Awal: Rp ${(Number(data.startingCash) || 0).toLocaleString('id-ID')})`,
    operator: data.operatorName || 'Kasir',
    timestamp: new Date().toISOString()
  });

  return { id, ...shiftData };
}

export async function closeShift(shiftId: number, data: { actualCash: number, notes?: string, operatorName?: string }) {
  const stats = await getShiftLiveStats(shiftId);
  const actual = Number(data.actualCash) || 0;
  const difference = actual - stats.expectedCash;

  const updatePayload = {
    endTime: new Date().toISOString(),
    actualCash: actual,
    cashDifference: difference,
    cashSales: stats.cashSales,
    nonCashSales: stats.nonCashSales,
    cashRefunds: stats.cashRefunds,
    cashIn: stats.cashIn,
    cashOut: stats.cashOut,
    expectedCash: stats.expectedCash,
    status: 'closed',
    notes: data.notes || stats.notes || ''
  };

  await db.table('shifts').update(shiftId, updatePayload);

  await db.table('auditLogs').add({
    action: 'CLOSE_SHIFT',
    amount: actual,
    reason: 'Tutup Shift (Selisih: Rp ' + difference.toLocaleString('id-ID') + ')',
    operator: data.operatorName || stats.operatorName || 'Kasir',
    timestamp: new Date().toISOString()
  });

  return { id: shiftId, ...stats, ...updatePayload };
}

export async function addCashMovement(data: { shiftId: number, type: 'in' | 'out', amount: number, reason: string, operatorName: string }) {
  const movement = {
    shiftId: data.shiftId,
    type: data.type,
    amount: Number(data.amount) || 0,
    reason: data.reason || (data.type === 'in' ? 'Kas Masuk' : 'Kas Keluar'),
    operatorName: data.operatorName || 'Kasir',
    timestamp: new Date().toISOString()
  };

  const id = await db.table('cashMovements').add(movement);

  await db.table('auditLogs').add({
    action: data.type === 'in' ? 'CASH_IN' : 'CASH_OUT',
    amount: movement.amount,
    reason: movement.reason,
    operator: movement.operatorName,
    timestamp: new Date().toISOString()
  });

  return { id, ...movement };
}

export async function resetAllTransactions() {
  await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables', 'auditLogs', 'shifts', 'cashMovements'], async () => {
    await db.table('orderItems').clear();
    await db.table('orders').clear();
    await db.table('payments').clear();
    await db.table('auditLogs').clear();
    await db.table('shifts').clear();
    await db.table('cashMovements').clear();

    const tables = await db.table('tables').toArray();
    for (const t of tables) {
      await db.table('tables').update(t.id, { status: 'kosong' });
    }
  });
  return true;
}

// --- FITUR CADANGAN (BACKUP) & PEMULIHAN (RESTORE) ---

export async function exportAllData() {
  const menus = await db.table('menuItems').toArray();
  const tables = await db.table('tables').toArray();
  const orders = await db.table('orders').toArray();
  const orderItems = await db.table('orderItems').toArray();
  const payments = await db.table('payments').toArray();
  const auditLogs = await db.table('auditLogs').toArray();
  const shifts = await db.table('shifts').toArray();
  const cashMovements = await db.table('cashMovements').toArray();
  
  let settings = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('pos_store_settings');
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}
  }

  return {
    version: 2,
    appName: 'SakuNota POS',
    exportedAt: new Date().toISOString(),
    settings,
    menus,
    tables,
    orders,
    orderItems,
    payments,
    auditLogs,
    shifts,
    cashMovements
  };
}

export async function importAllData(data: any) {
  if (!data || !Array.isArray(data.menus)) {
    throw new Error('Format file cadangan tidak valid.');
  }

  await db.transaction('rw', ['menuItems', 'tables', 'orders', 'orderItems', 'payments', 'auditLogs', 'shifts', 'cashMovements'], async () => {
    await db.table('auditLogs').clear();
    await db.table('shifts').clear();
    await db.table('cashMovements').clear();
    await db.table('payments').clear();
    await db.table('orderItems').clear();
    await db.table('orders').clear();
    await db.table('tables').clear();
    await db.table('menuItems').clear();

    if (data.menus && data.menus.length > 0) {
      const cleanMenus = data.menus.map((m: any) => ({
        id: m.id,
        nama: m.nama,
        harga: Number(m.harga),
        kategori: m.kategori || 'Umum',
        isSoldOut: Boolean(m.isSoldOut),
        urutan: Number(m.urutan || 0),
        modifiers: m.modifiers || []
      }));
      await db.table('menuItems').bulkAdd(cleanMenus);
    }

    if (data.tables && data.tables.length > 0) {
      await db.table('tables').bulkAdd(data.tables);
    }

    if (data.orders && data.orders.length > 0) {
      await db.table('orders').bulkAdd(data.orders);
    }

    if (data.orderItems && data.orderItems.length > 0) {
      await db.table('orderItems').bulkAdd(data.orderItems);
    }

    if (data.payments && data.payments.length > 0) {
      await db.table('payments').bulkAdd(data.payments);
    }

    if (data.auditLogs && data.auditLogs.length > 0) {
      await db.table('auditLogs').bulkAdd(data.auditLogs);
    }

    if (data.shifts && data.shifts.length > 0) {
      await db.table('shifts').bulkAdd(data.shifts);
    }

    if (data.cashMovements && data.cashMovements.length > 0) {
      await db.table('cashMovements').bulkAdd(data.cashMovements);
    }
  });

  if (data.settings && typeof window !== 'undefined') {
    try {
      localStorage.setItem('pos_store_settings', JSON.stringify(data.settings));
    } catch (e) {}
  }

  return true;
}
