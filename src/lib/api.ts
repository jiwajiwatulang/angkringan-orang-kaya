import { db, MenuItem, Order, OrderItem, Payment, SelectedModifier, PaymentProof } from './dexie';
import initialData from './initialData.json';
import { getStoreSettings, SETTINGS_STORAGE_KEY } from './settings';
import { applyOrderStock } from './inventory';

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
          { id: 'sp_hot', nama: 'Pedas Banget', harga: 0 }
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
  if (db.name === 'SakuNotaDemoDB' && count === 0 && initialData.menus.length > 0 && !isInitializingMenus) {
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

  return menus;
}

export async function clearAllMenus() {
  await db.table('menuItems').clear();
  return 0;
}

export async function resetStoreTables(count: number, prefix: string = 'Meja ') {
  await db.table('tables').clear();
  if (count > 0) {
    const toInsert = Array.from({ length: count }).map((_, i) => ({
      nomor: `${prefix}${i + 1}`,
      status: 'kosong'
    }));
    await db.table('tables').bulkAdd(toInsert);
  }
}

export async function seedDemoMenus(type: string = 'angkringan') {
  await db.table('menuItems').clear();

  let rawList: any[] = [];

  if (type === 'kafe') {
    rawList = [
      { nama: "Espresso Single", harga: 15000, kategori: "Kopi", urutan: 1 },
      { nama: "Americano (Ice)", harga: 20000, kategori: "Kopi", urutan: 2 },
      { nama: "Americano (Hot)", harga: 18000, kategori: "Kopi", urutan: 3 },
      { nama: "Caffe Latte", harga: 24000, kategori: "Kopi", urutan: 4 },
      { nama: "Caramel Macchiato", harga: 28000, kategori: "Kopi", urutan: 5 },
      { nama: "Matcha Latte", harga: 25000, kategori: "Non-Kopi", urutan: 6 },
      { nama: "Chocolate Frappe", harga: 26000, kategori: "Non-Kopi", urutan: 7 },
      { nama: "Butter Croissant", harga: 22000, kategori: "Pastry & Bakery", urutan: 8 },
      { nama: "Kaya Toast", harga: 18000, kategori: "Pastry & Bakery", urutan: 9 },
      { nama: "French Fries Truffle", harga: 24000, kategori: "Camilan", urutan: 10 },
      { nama: "Red Velvet Cake", harga: 28000, kategori: "Pastry & Bakery", urutan: 11 },
    ];
  } else if (type === 'warung') {
    rawList = [
      { nama: "Nasi Goreng Spesial", harga: 22000, kategori: "Makanan", urutan: 1 },
      { nama: "Paket Ayam Bakar Madu", harga: 28000, kategori: "Makanan", urutan: 2 },
      { nama: "Paket Ayam Goreng Lengkuas", harga: 26000, kategori: "Makanan", urutan: 3 },
      { nama: "Paket Bebek Goreng Kremes", harga: 35000, kategori: "Makanan", urutan: 4 },
      { nama: "Cah Kangkung Terasi", harga: 14000, kategori: "Sayuran", urutan: 5 },
      { nama: "Tempe Mendoan (4 pcs)", harga: 12000, kategori: "Lauk & Pelengkap", urutan: 6 },
      { nama: "Tahu Goreng Kering", harga: 10000, kategori: "Lauk & Pelengkap", urutan: 7 },
      { nama: "Es Teh Manis Segar", harga: 5000, kategori: "Minuman", urutan: 8 },
      { nama: "Es Jeruk Peras Asli", harga: 8000, kategori: "Minuman", urutan: 9 },
      { nama: "Jus Alpukat Kental", harga: 15000, kategori: "Minuman", urutan: 10 },
    ];
  } else if (type === 'retail') {
    rawList = [
      { nama: "Beras Premium Ramos 5kg", harga: 75000, kategori: "Sembako", urutan: 1 },
      { nama: "Minyak Goreng Pouch 2L", harga: 36000, kategori: "Sembako", urutan: 2 },
      { nama: "Gula Pasir Kristal 1kg", harga: 17500, kategori: "Sembako", urutan: 3 },
      { nama: "Telur Ayam Negeri 1kg", harga: 28000, kategori: "Sembako", urutan: 4 },
      { nama: "Kopi Bubuk Robusta 250g", harga: 18000, kategori: "Minuman Kemasan", urutan: 5 },
      { nama: "Mie Goreng Instan", harga: 3500, kategori: "Makanan Instan", urutan: 6 },
      { nama: "Air Mineral Botol 600ml", harga: 4000, kategori: "Minuman Kemasan", urutan: 7 },
      { nama: "Sabun Mandi Cair 450ml", harga: 22000, kategori: "Perlengkapan Rumah", urutan: 8 },
    ];
  } else {
    // Default angkringan
    rawList = initialData.menus && initialData.menus.length > 0
      ? initialData.menus
      : [
          { nama: "Nasi Kucing Bandeng", harga: 4000, kategori: "Makanan", urutan: 1 },
          { nama: "Nasi Kucing Sambel Teri", harga: 4000, kategori: "Makanan", urutan: 2 },
          { nama: "Sate Usus Bakar", harga: 3000, kategori: "Sate-satean", urutan: 3 },
          { nama: "Sate Kulit Ayam", harga: 3500, kategori: "Sate-satean", urutan: 4 },
          { nama: "Sate Telur Puyuh", harga: 4000, kategori: "Sate-satean", urutan: 5 },
          { nama: "Tempe Mendoan Hangat", harga: 2500, kategori: "Gorengan", urutan: 6 },
          { nama: "Tahu Bacem Goreng", harga: 2500, kategori: "Gorengan", urutan: 7 },
          { nama: "Wedang Jahe Susu", harga: 7000, kategori: "Minuman", urutan: 8 },
          { nama: "Es Teh Manis Jumbo", harga: 4000, kategori: "Minuman", urutan: 9 },
          { nama: "Es Jeruk Peras", harga: 6000, kategori: "Minuman", urutan: 10 },
        ];
  }

  const menusToInsert = rawList.map((m, idx) => ({
    sku: `SKU-${(idx + 1).toString().padStart(3, '0')}`,
    nama: m.nama,
    harga: Number(m.harga) || 5000,
    kategori: m.kategori || "Umum",
    isSoldOut: Boolean(m.isSoldOut),
    urutan: idx + 1,
    modifiers: (m as any).modifiers || getDefaultModifiersForCategory(m.kategori || "Umum", m.nama)
  }));

  await db.table('menuItems').bulkAdd(menusToInsert);
  return menusToInsert.length;
}

export async function createMenu(data: { sku?: string, nama: string, harga: number, kategori: string, isSoldOut?: boolean, modifiers?: any[] }) {
  const cleanName = data.nama.trim();
  const cleanCategory = data.kategori.trim();
  const cleanSku = data.sku ? data.sku.trim() : '';

  // Validasi keunikan SKU jika diisi
  if (cleanSku) {
    const duplicate = await db.table('menuItems').filter((m: MenuItem) => (m.sku || '').toLowerCase() === cleanSku.toLowerCase()).first();
    if (duplicate) {
      throw new Error(`SKU / Kode Menu "${cleanSku}" sudah digunakan oleh menu "${duplicate.nama}". Mohon gunakan kode lain atau kosongkan.`);
    }
  }

  const count = await db.table('menuItems').count();
  return await db.table('menuItems').add({
    sku: cleanSku || undefined,
    nama: cleanName,
    harga: Number(data.harga),
    kategori: cleanCategory,
    isSoldOut: Boolean(data.isSoldOut),
    urutan: count,
    modifiers: data.modifiers || []
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

export async function updateMenu(id: number, data: { sku?: string; nama?: string; harga?: number; kategori?: string; isSoldOut?: boolean; modifiers?: any[] }) {
  const updateData: any = {};
  if (data.sku !== undefined) {
    const cleanSku = data.sku.trim();
    if (cleanSku) {
      const duplicate = await db.table('menuItems').filter((m: MenuItem) => m.id !== id && (m.sku || '').toLowerCase() === cleanSku.toLowerCase()).first();
      if (duplicate) {
        throw new Error(`SKU / Kode Menu "${cleanSku}" sudah digunakan oleh menu "${duplicate.nama}". Mohon gunakan kode lain atau kosongkan.`);
      }
      updateData.sku = cleanSku;
    } else {
      updateData.sku = undefined;
    }
  }
  if (data.nama !== undefined) updateData.nama = data.nama.trim();
  if (data.harga !== undefined) updateData.harga = Number(data.harga);
  if (data.kategori !== undefined) updateData.kategori = data.kategori.trim();
  if (data.isSoldOut !== undefined) updateData.isSoldOut = Boolean(data.isSoldOut);
  if (data.modifiers !== undefined) updateData.modifiers = data.modifiers;

  const count = await db.table('menuItems').update(id, updateData);
  if (count === 0) {
    throw new Error(`Menu dengan ID ${id} tidak ditemukan.`);
  }
  return true;
}

export async function toggleMenuSoldOut(id: number, isSoldOut: boolean) {
  return await updateMenu(id, { isSoldOut });
}

let isInitializingTables = false;

export async function getTables() {
  let tables = await db.table('tables').toArray();
  const settings = getStoreSettings();
  
  // Auto init 10 tables ONLY on fresh initial install before onboarding
  if (tables.length === 0 && !isInitializingTables && !settings.onboardingCompleted && settings.serviceMode !== 'quick') {
    isInitializingTables = true;
    try {
      const count = await db.table('tables').count();
      if (count === 0) {
        const defaultTables = Array.from({length: 10}).map((_, i) => ({
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

export async function setTableStatus(id: number | string, status: 'kosong' | 'open' | 'lunas') {
  const numId = Number(id);
  if (!isNaN(numId)) {
    try {
      await db.table('tables').update(numId, { status });
    } catch (_) {}
  }
  try {
    await db.table('tables').where('id').equals(id).modify({ status });
  } catch (_) {}
}

export async function countUnpaidOrdersForTable(tableId: number | string) {
  const numId = Number(tableId);
  const strId = String(tableId);
  const orders = await db.table('orders').toArray();
  return orders.filter((o: any) => 
    (Number(o.tableId) === numId || String(o.tableId) === strId) && 
    o.status === 'unpaid'
  ).length;
}

export async function refreshTableStatus(tableId: number | string, justPaid: boolean = false) {
  const unpaid = await countUnpaidOrdersForTable(tableId);
  if (unpaid > 0) {
    await setTableStatus(tableId, 'open');
  } else if (justPaid) {
    await setTableStatus(tableId, 'lunas');
  } else {
    await setTableStatus(tableId, 'kosong');
  }
}

export async function clearTable(tableId: number | string) {
  const numId = Number(tableId);
  const strId = String(tableId);
  const allOrders = await db.table('orders').toArray();

  const unpaid = allOrders.filter((o: any) => 
    (Number(o.tableId) === numId || String(o.tableId) === strId) && 
    o.status === 'unpaid'
  );
  if (unpaid.length > 0) {
    throw new Error('Masih ada tagihan yang belum lunas di meja ini.');
  }

  // Lepaskan kaitan meja dari SEMUA order pada meja ini (paid, void, draft)
  for (const o of allOrders) {
    if (Number(o.tableId) === numId || String(o.tableId) === strId) {
      await db.table('orders').update(o.id, { tableId: null, isTableCleared: true });
    }
  }

  // Set status meja menjadi 'kosong'
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
  const proofs = await db.table('paymentProofs').toArray();

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

    const orderPayments = payments.filter(p => p.orderId === order.id).map(p => {
      const proof = proofs.find(pr => pr.paymentId === p.id);
      return {
        ...p,
        proof
      };
    });

    const orderProofs = proofs.filter(pr => pr.orderId === order.id);
    const completedPayments = orderPayments.filter(p => p.status === 'completed');
    const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + p.amount, 0);
    const remainingBalance = Math.max(0, order.total - totalPaid);

    return {
      ...order,
      items,
      payments: orderPayments,
      proofs: orderProofs,
      proof: orderProofs.length > 0 ? orderProofs[0] : undefined,
      proofStatus: orderPayments.length > 0 ? orderPayments[0].proofStatus : undefined,
      paidAmount: orderPayments.length > 0 ? totalPaid : (order.status === 'paid' ? order.total : 0),
      remainingBalance: orderPayments.length > 0 ? remainingBalance : (order.status === 'paid' ? 0 : order.total)
    };
  });
}

export async function createOrder(data: any) {
  if (!Number.isFinite(data.total) || data.total < 0 || !Array.isArray(data.items) || !data.items.length) throw new Error('Total atau item pesanan tidak valid.');
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'paymentProofs', 'shifts', 'tables', 'auditLogs', 'menuItems', 'inventoryMovements'], async () => {
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

    const proofPayload = (data as any).proof || (data as any).paymentProof;
    const hasProof = Boolean(proofPayload?.imageData);

    // Hitung status verifikasi awal
    const verificationStatus = !isPaid 
      ? 'menunggu_bukti' 
      : (data.paymentMethod === 'Cash' 
          ? 'terverifikasi' 
          : (hasProof ? 'menunggu_verifikasi' : 'menunggu_bukti'));

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
      verificationStatus: verificationStatus,
      isHistorical: data.isHistorical || false,
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
      hargaSatuan: item.harga ?? item.hargaSatuan ?? 0,
      selectedModifiers: item.selectedModifiers || []
    }));

    await db.table('orderItems').bulkAdd(itemsToInsert);
    if (!data.isHistorical && orderStatus !== 'void') {
      await applyOrderStock(Number(orderId), [], itemsToInsert, 'Pesanan baru');
    }

    // 5. Jika transaksi dibuat langsung lunas, catat entri pembayaran awal di tabel payments
    if (isPaid && total > 0) {
      const proofStatus = data.paymentMethod === 'Cash' ? 'terverifikasi' : (hasProof ? 'menunggu_verifikasi' : 'menunggu_bukti');
      const paymentId = await db.table('payments').add({
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
        status: 'completed',
        proofStatus: proofStatus
      }) as number;

      if (hasProof && (data.paymentMethod === 'QRIS' || data.paymentMethod === 'Transfer')) {
        const proofId = await db.table('paymentProofs').add({
          paymentId: paymentId,
          orderId: orderId as number,
          imageData: proofPayload.imageData,
          fileName: proofPayload.fileName || 'bukti_bayar.jpg',
          fileSize: proofPayload.fileSize || 0,
          mimeType: proofPayload.mimeType || 'image/jpeg',
          status: 'menunggu_verifikasi',
          uploadedAt: new Date().toISOString(),
          uploadedBy: data.operatorName || 'Kasir',
          notes: proofPayload.notes || ''
        }) as number;

        await db.table('payments').update(paymentId, { proofId });

        await db.table('auditLogs').add({
          action: 'UPLOAD_PROOF',
          orderId: orderId as number,
          amount: total,
          reason: `Upload bukti bayar checkout: ${proofPayload.fileName || 'bukti_bayar.jpg'}`,
          operator: data.operatorName || 'Kasir',
          timestamp: new Date().toISOString()
        });
      }
    }

    if (data.tableId) {
      await setTableStatus(data.tableId, isPaid ? 'lunas' : 'open');
    }

    return { id: orderId, createdAt: new Date().toISOString() };
  });
}

export async function updateOrder(id: number, data: any) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables', 'menuItems', 'inventoryMovements', 'paymentProofs', 'shifts', 'auditLogs'], async () => {
    const existingOrder = await db.table('orders').get(id);
    if (!existingOrder || existingOrder.status === 'void') throw new Error('Nota tidak ditemukan atau sudah dibatalkan.');
    if ((existingOrder.paidAmount || 0) > 0) throw new Error('Nota yang sudah menerima pembayaran tidak dapat diubah. Gunakan refund.');
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
      hargaSatuan: item.harga ?? item.hargaSatuan ?? 0,
      selectedModifiers: item.selectedModifiers || []
    }));
    await db.table('orderItems').bulkAdd(itemsToInsert);
    if (!existingOrder.isHistorical) await applyOrderStock(id, oldItems, itemsToInsert, 'Perubahan pesanan');
    if (data.status === 'paid' && existingOrder.status !== 'paid' && data.total > 0) {
      await recordPayment({ orderId: id, amount: data.total, paymentMethod: data.paymentMethod || 'Cash', cashTendered: data.cashTendered, splitType: 'full', operatorName: data.operatorName || 'Kasir', notes: data.notes, proof: data.proof });
    }
    return { id };
  });
}

// --- STATUS VERIFIKASI PEMBAYARAN NON-TUNAI ---

export async function updateOrderVerificationStatus(orderId: number) {
  const orderPayments = await db.table('payments').where('orderId').equals(orderId).toArray();
  const nonCashPayments = orderPayments.filter((p: any) => p.status === 'completed' && p.paymentMethod !== 'Cash');

  if (nonCashPayments.length === 0) {
    await db.table('orders').update(orderId, { verificationStatus: 'terverifikasi' });
    return 'terverifikasi';
  }

  const allVerified = nonCashPayments.every((p: any) => p.proofStatus === 'terverifikasi');
  const anyWaitingVerification = nonCashPayments.some((p: any) => p.proofStatus === 'menunggu_verifikasi');

  let newStatus: 'terverifikasi' | 'menunggu_verifikasi' | 'menunggu_bukti' = 'menunggu_bukti';
  if (allVerified) {
    newStatus = 'terverifikasi';
  } else if (anyWaitingVerification) {
    newStatus = 'menunggu_verifikasi';
  } else {
    newStatus = 'menunggu_bukti';
  }

  await db.table('orders').update(orderId, { verificationStatus: newStatus });
  return newStatus;
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
  proof?: { imageData: string; fileName?: string; fileSize?: number; mimeType?: string; notes?: string };
}) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'paymentProofs', 'tables', 'shifts', 'auditLogs'], async () => {
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
    if (!Number.isFinite(data.amount)) throw new Error('Nominal pembayaran tidak valid.');
    const payAmount = Math.min(data.amount, remainingBefore);
    if (payAmount <= 0) {
      throw new Error('Nominal pembayaran harus lebih dari Rp 0.');
    }

    const cashTendered = data.paymentMethod === 'Cash' ? (data.cashTendered || payAmount) : payAmount;
    if (!Number.isFinite(cashTendered) || cashTendered < payAmount) throw new Error('Uang tunai yang diterima kurang dari nominal pembayaran.');
    const change = data.paymentMethod === 'Cash' ? Math.max(0, cashTendered - payAmount) : 0;
    const proofPayload = (data as any).proof || (data as any).paymentProof;
    const hasProof = Boolean(proofPayload?.imageData);
    const proofStatus = data.paymentMethod === 'Cash' ? 'terverifikasi' : (hasProof ? 'menunggu_verifikasi' : 'menunggu_bukti');

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
      status: 'completed',
      proofStatus: proofStatus
    }) as number;

    // Jika ada bukti pembayaran dilampirkan
    if (hasProof && data.paymentMethod !== 'Cash') {
      const proofId = await db.table('paymentProofs').add({
        paymentId: paymentId,
        orderId: data.orderId,
        imageData: proofPayload.imageData,
        fileName: proofPayload.fileName || 'bukti_bayar.jpg',
        fileSize: proofPayload.fileSize || 0,
        mimeType: proofPayload.mimeType || 'image/jpeg',
        status: 'menunggu_verifikasi',
        uploadedAt: new Date().toISOString(),
        uploadedBy: data.operatorName || 'Kasir',
        notes: proofPayload.notes || ''
      }) as number;

      await db.table('payments').update(paymentId, { proofId });

      await db.table('auditLogs').add({
        action: 'UPLOAD_PROOF',
        orderId: data.orderId,
        amount: payAmount,
        reason: `Upload bukti bayar split (${data.paymentMethod}): ${proofPayload.fileName || 'bukti_bayar.jpg'}`,
        operator: data.operatorName || 'Kasir',
        timestamp: new Date().toISOString()
      });
    }

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

    // Perbarui status verifikasi nota induk
    await updateOrderVerificationStatus(data.orderId);

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
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables', 'auditLogs', 'shifts'], async () => {
    const payment = await db.table('payments').get(paymentId);
    if (!payment) throw new Error('Data pembayaran tidak ditemukan.');
    if (payment.status === 'refunded') throw new Error('Pembayaran ini sudah pernah di-refund.');

    const order = await db.table('orders').get(payment.orderId);
    if (!order) throw new Error('Nota tidak ditemukan.');
    const refundShift = await getActiveShift();

    // 1. Tandai pembayaran sebagai refunded
    await db.table('payments').update(paymentId, {
      status: 'refunded',
      refundReason: options.reason || 'Refund Pembayaran Parsial',
      refundedAt: new Date().toISOString(),
      refundOperator: options.operator || 'Admin',
      cashRefundAmount: payment.paymentMethod === 'Cash' ? payment.amount : 0,
      refundShiftId: refundShift?.id ?? payment.shiftId
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
  await db.transaction('rw', ['orders', 'orderItems', 'payments', 'tables', 'auditLogs', 'menuItems', 'inventoryMovements', 'shifts'], async () => {
    const order = await db.table('orders').get(orderId);
    if (!order) throw new Error('Nota tidak ditemukan.');
    if (order.status === 'void') throw new Error('Nota sudah dibatalkan.');
    // Refund uang tidak berarti barang kembali layak jual. Retur fisik dicatat di stok masuk.
    if (!order.isHistorical && !(order.paidAmount > 0)) {
      const items = await db.table('orderItems').where('orderId').equals(orderId).toArray();
      await applyOrderStock(orderId, items, [], 'Pembatalan pesanan belum dibayar');
    }
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
    const refundShift = await getActiveShift();
    const paidTotal = orderPayments.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0);
    const requestedRefund = Number(options.refundAmount);
    if (!Number.isFinite(requestedRefund) || requestedRefund < 0 || requestedRefund > paidTotal) throw new Error('Nominal refund tidak valid atau melebihi pembayaran.');
    let cashRefundRemaining = options.isRefunded && ['Cash', 'Tunai'].includes(options.refundMethod) ? requestedRefund : 0;
    for (const p of orderPayments) {
      if (p.status === 'completed') {
        const cashRefundAmount = Math.min(cashRefundRemaining, p.amount);
        cashRefundRemaining -= cashRefundAmount;
        await db.table('payments').update(p.id, {
          status: 'refunded',
          refundReason: `Void Nota: ${options.reason}`,
          refundedAt: new Date().toISOString(),
          refundOperator: options.operator || 'Admin',
          cashRefundAmount,
          refundShiftId: refundShift?.id ?? p.shiftId
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
  await db.transaction('rw', ['orders', 'orderItems', 'payments', 'paymentProofs'], async () => {
    await db.table('orders').bulkDelete(ids);
    const items = await db.table('orderItems').toArray();
    const itemIdsToDelete = items.filter(i => ids.includes(i.orderId)).map(i => i.id!).filter(Boolean);
    await db.table('orderItems').bulkDelete(itemIdsToDelete);
    
    const payments = await db.table('payments').toArray();
    const paymentIdsToDelete = payments.filter(p => ids.includes(p.orderId)).map(p => p.id!).filter(Boolean);
    await db.table('payments').bulkDelete(paymentIdsToDelete);

    // Hapus juga payment proofs terkait jika ada
    const proofs = await db.table('paymentProofs').toArray();
    const proofIdsToDelete = proofs.filter(pr => ids.includes(pr.orderId)).map(pr => pr.id!).filter(Boolean);
    if (proofIdsToDelete.length > 0) {
      await db.table('paymentProofs').bulkDelete(proofIdsToDelete);
    }
  });
}

// --- MANAJEMEN BUKTI PEMBAYARAN (PAYMENT PROOFS) ---

export async function uploadPaymentProof(data: {
  paymentId: number;
  orderId: number;
  imageData: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  operator: string;
  notes?: string;
}) {
  return await db.transaction('rw', ['paymentProofs', 'payments', 'orders', 'auditLogs'], async () => {
    const existingProof = await db.table('paymentProofs').where('paymentId').equals(data.paymentId).first();
    let proofId: number;

    if (existingProof) {
      await db.table('paymentProofs').update(existingProof.id!, {
        imageData: data.imageData,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        status: 'menunggu_verifikasi',
        uploadedAt: new Date().toISOString(),
        uploadedBy: data.operator,
        notes: data.notes || existingProof.notes || ''
      });
      proofId = existingProof.id!;
    } else {
      proofId = await db.table('paymentProofs').add({
        paymentId: data.paymentId,
        orderId: data.orderId,
        imageData: data.imageData,
        fileName: data.fileName,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        status: 'menunggu_verifikasi',
        uploadedAt: new Date().toISOString(),
        uploadedBy: data.operator,
        notes: data.notes || ''
      }) as number;
    }

    await db.table('payments').update(data.paymentId, {
      proofStatus: 'menunggu_verifikasi',
      proofId: proofId
    });

    await updateOrderVerificationStatus(data.orderId);

    await db.table('auditLogs').add({
      action: 'UPLOAD_PROOF',
      orderId: data.orderId,
      amount: 0,
      reason: `Upload bukti bayar: ${data.fileName} (${Math.round(data.fileSize / 1024)} KB)`,
      operator: data.operator,
      timestamp: new Date().toISOString()
    });

    return { proofId, status: 'menunggu_verifikasi' };
  });
}

export async function verifyPaymentProof(proofId: number, options: { operator: string, notes?: string }) {
  return await db.transaction('rw', ['paymentProofs', 'payments', 'orders', 'auditLogs'], async () => {
    const proof = await db.table('paymentProofs').get(proofId);
    if (!proof) throw new Error('Bukti pembayaran tidak ditemukan.');

    await db.table('paymentProofs').update(proofId, {
      status: 'terverifikasi',
      verifiedAt: new Date().toISOString(),
      verifiedBy: options.operator,
      notes: options.notes ? (proof.notes ? `${proof.notes} | ${options.notes}` : options.notes) : proof.notes
    });

    await db.table('payments').update(proof.paymentId, {
      proofStatus: 'terverifikasi'
    });

    await updateOrderVerificationStatus(proof.orderId);

    await db.table('auditLogs').add({
      action: 'VERIFY_PROOF',
      orderId: proof.orderId,
      amount: 0,
      reason: `Verifikasi bukti bayar #${proofId} disetujui`,
      operator: options.operator,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  });
}

export async function deletePaymentProof(proofId: number, options: { operator: string, reason: string }) {
  return await db.transaction('rw', ['paymentProofs', 'payments', 'orders', 'auditLogs'], async () => {
    const proof = await db.table('paymentProofs').get(proofId);
    if (!proof) throw new Error('Bukti pembayaran tidak ditemukan.');

    await db.table('paymentProofs').delete(proofId);

    await db.table('payments').update(proof.paymentId, {
      proofStatus: 'menunggu_bukti',
      proofId: undefined
    });

    await updateOrderVerificationStatus(proof.orderId);

    await db.table('auditLogs').add({
      action: 'DELETE_PROOF',
      orderId: proof.orderId,
      amount: 0,
      reason: `Hapus bukti bayar #${proofId}: ${options.reason}`,
      operator: options.operator,
      timestamp: new Date().toISOString()
    });

    return { success: true };
  });
}

export async function getPaymentProofs(orderId?: number) {
  if (orderId) {
    return await db.table('paymentProofs').where('orderId').equals(orderId).toArray();
  }
  return await db.table('paymentProofs').reverse().toArray();
}

export async function matchBulkPaymentProofs(files: {
  fileName: string;
  imageData: string;
  fileSize: number;
  mimeType: string;
}[]) {
  const orders = await db.table('orders').toArray();
  const payments = await db.table('payments').toArray();
  const nonCashPayments = payments.filter((p: any) => p.paymentMethod !== 'Cash');

  const matches: {
    file: { fileName: string; imageData: string; fileSize: number; mimeType: string };
    matched: boolean;
    payment?: any;
    order?: any;
    confidence: 'high' | 'medium' | 'none';
    reason: string;
  }[] = [];

  for (const f of files) {
    const cleanName = f.fileName.replace(/\.[^/.]+$/, '').toLowerCase();

    // 1. Cocokkan ID Pembayaran: "pay_12" atau "payment-12"
    const payMatch = cleanName.match(/(?:pay|payment)[-_]?(\d+)/i);
    if (payMatch) {
      const payId = parseInt(payMatch[1]);
      const foundPayment = nonCashPayments.find((p: any) => p.id === payId);
      if (foundPayment) {
        const foundOrder = orders.find((o: any) => o.id === foundPayment.orderId);
        matches.push({
          file: f,
          matched: true,
          payment: foundPayment,
          order: foundOrder,
          confidence: 'high',
          reason: `Cocok dengan ID Pembayaran: #${foundPayment.id}`
        });
        continue;
      }
    }

    // 2. Cocokkan ID Order / Nota: "order-10", "nota_10", "inv_10", atau "10"
    const orderMatch = cleanName.match(/(?:order|nota|inv)?[-_]?(\d+)/i);
    if (orderMatch) {
      const ordId = parseInt(orderMatch[1]);
      const foundOrder = orders.find((o: any) => o.id === ordId);
      if (foundOrder) {
        const orderPays = nonCashPayments.filter((p: any) => p.orderId === foundOrder.id);
        if (orderPays.length === 1) {
          matches.push({
            file: f,
            matched: true,
            payment: orderPays[0],
            order: foundOrder,
            confidence: 'high',
            reason: `Cocok dengan Nota #${foundOrder.id} (${orderPays[0].paymentMethod})`
          });
          continue;
        } else if (orderPays.length > 1) {
          const pendingPay = orderPays.find((p: any) => p.proofStatus === 'menunggu_bukti') || orderPays[0];
          matches.push({
            file: f,
            matched: true,
            payment: pendingPay,
            order: foundOrder,
            confidence: 'medium',
            reason: `Cocok dengan Nota #${foundOrder.id} (Pilih pembayaran #${pendingPay.id})`
          });
          continue;
        }
      }
    }

    matches.push({
      file: f,
      matched: false,
      confidence: 'none',
      reason: 'Tidak ditemukan transaksi QRIS/Transfer yang cocok dari nama file'
    });
  }

  return matches;
}

// --- FITUR PENGELOLAAN DATA MASSAL (BULK MANAGEMENT) ---

export async function bulkImportMenus(items: {
  sku?: string;
  nama: string;
  harga: number;
  kategori?: string;
  isSoldOut?: boolean;
}[], options: { mode: 'create_only' | 'update_existing' | 'upsert' }) {
  const existing = await db.table('menuItems').toArray();
  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors: { row: number, item: any, reason: string }[] = [];

  let maxUrutan = existing.reduce((max, m) => Math.max(max, m.urutan || 0), 0);

  await db.transaction('rw', ['menuItems', 'auditLogs'], async () => {
    for (let i = 0; i < items.length; i++) {
      const raw = items[i];
      const rowNum = i + 1;

      if (!raw.nama || typeof raw.nama !== 'string' || raw.nama.trim().length === 0) {
        errors.push({ row: rowNum, item: raw, reason: 'Nama menu tidak boleh kosong' });
        continue;
      }

      const harga = Number(raw.harga);
      if (isNaN(harga) || harga < 0) {
        errors.push({ row: rowNum, item: raw, reason: 'Harga harus berupa angka >= 0' });
        continue;
      }

      const cleanName = raw.nama.trim();
      const sku = raw.sku ? String(raw.sku).trim() : '';

      const match = existing.find(m => 
        (sku && m.sku && m.sku.toLowerCase() === sku.toLowerCase()) || 
        (m.nama.toLowerCase() === cleanName.toLowerCase())
      );

      if (match) {
        if (options.mode === 'create_only') {
          skippedCount++;
          continue;
        }
        await db.table('menuItems').update(match.id!, {
          sku: sku || match.sku,
          nama: cleanName,
          harga: harga,
          kategori: raw.kategori ? raw.kategori.trim() : match.kategori,
          isSoldOut: raw.isSoldOut !== undefined ? Boolean(raw.isSoldOut) : match.isSoldOut
        });
        updatedCount++;
      } else {
        if (options.mode === 'update_existing') {
          skippedCount++;
          continue;
        }
        maxUrutan++;
        const newMenu = {
          sku: sku || undefined,
          nama: cleanName,
          harga: harga,
          kategori: raw.kategori ? raw.kategori.trim() : 'Umum',
          isSoldOut: Boolean(raw.isSoldOut),
          urutan: maxUrutan,
          modifiers: []
        };
        const newId = await db.table('menuItems').add(newMenu) as number;
        existing.push({ id: newId, ...newMenu });
        createdCount++;
      }
    }

    await db.table('auditLogs').add({
      action: 'BULK_IMPORT',
      amount: 0,
      reason: `Bulk Import Menu: ${createdCount} baru, ${updatedCount} diperbarui, ${skippedCount} dilewati, ${errors.length} gagal`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });
  });

  return {
    success: true,
    createdCount,
    updatedCount,
    skippedCount,
    errors
  };
}

export async function bulkUpdateMenuPrices(menuIds: number[], options: { type: 'nominal' | 'percent', value: number }) {
  return await db.transaction('rw', ['menuItems', 'auditLogs'], async () => {
    let count = 0;
    for (const id of menuIds) {
      const item = await db.table('menuItems').get(id);
      if (!item) continue;
      let newPrice = item.harga;
      if (options.type === 'nominal') {
        newPrice = Math.max(0, item.harga + options.value);
      } else {
        newPrice = Math.max(0, Math.round(item.harga * (1 + options.value / 100)));
      }
      await db.table('menuItems').update(id, { harga: newPrice });
      count++;
    }

    await db.table('auditLogs').add({
      action: 'BULK_UPDATE',
      amount: 0,
      reason: `Bulk update harga ${count} menu (${options.type === 'nominal' ? (options.value >= 0 ? '+' : '') + options.value : (options.value >= 0 ? '+' : '') + options.value + '%'})`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });

    return { updatedCount: count };
  });
}

export async function bulkUpdateMenuCategory(menuIds: number[], kategori: string) {
  return await db.transaction('rw', ['menuItems', 'auditLogs'], async () => {
    let count = 0;
    for (const id of menuIds) {
      await db.table('menuItems').update(id, { kategori });
      count++;
    }
    await db.table('auditLogs').add({
      action: 'BULK_UPDATE',
      amount: 0,
      reason: `Bulk ubah kategori ${count} menu ke '${kategori}'`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });
    return { updatedCount: count };
  });
}

export async function bulkToggleMenuStock(menuIds: number[], isSoldOut: boolean) {
  return await db.transaction('rw', ['menuItems', 'auditLogs'], async () => {
    for (const id of menuIds) {
      await db.table('menuItems').update(id, { isSoldOut });
    }
    await db.table('auditLogs').add({
      action: 'BULK_UPDATE',
      amount: 0,
      reason: `Bulk set ${isSoldOut ? 'Habis' : 'Tersedia'} untuk ${menuIds.length} menu`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });
    return { updatedCount: menuIds.length };
  });
}

export async function bulkDeleteMenus(menuIds: number[]) {
  return await db.transaction('rw', ['menuItems', 'orderItems', 'auditLogs'], async () => {
    const allOrderItems = await db.table('orderItems').toArray();
    const usedMenuIds = new Set(allOrderItems.map(oi => oi.menuItemId));

    const deletableIds: number[] = [];
    const protectedIds: number[] = [];

    for (const id of menuIds) {
      if (usedMenuIds.has(id)) {
        protectedIds.push(id);
      } else {
        deletableIds.push(id);
      }
    }

    if (deletableIds.length > 0) {
      await db.table('menuItems').bulkDelete(deletableIds);
    }

    for (const id of protectedIds) {
      await db.table('menuItems').update(id, { isSoldOut: true });
    }

    await db.table('auditLogs').add({
      action: 'BULK_DELETE',
      amount: 0,
      reason: `Bulk delete menu: ${deletableIds.length} dihapus permanen, ${protectedIds.length} dilindungi karena memiliki riwayat transaksi`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });

    return {
      deletedCount: deletableIds.length,
      protectedCount: protectedIds.length
    };
  });
}

export async function bulkCreateTables(params: { prefix?: string, startNum: number, count: number }) {
  const prefix = params.prefix || 'Meja ';
  return await db.transaction('rw', ['tables', 'auditLogs'], async () => {
    const existing = await db.table('tables').toArray();
    const existingNomors = new Set(existing.map(t => t.nomor.toLowerCase()));
    const toInsert = [];

    for (let i = 0; i < params.count; i++) {
      const num = params.startNum + i;
      const nomor = `${prefix}${num}`;
      if (!existingNomors.has(nomor.toLowerCase())) {
        toInsert.push({ nomor, status: 'kosong' });
        existingNomors.add(nomor.toLowerCase());
      }
    }

    if (toInsert.length > 0) {
      await db.table('tables').bulkAdd(toInsert);
    }

    await db.table('auditLogs').add({
      action: 'BULK_IMPORT',
      amount: 0,
      reason: `Bulk tambah meja: ${toInsert.length} meja baru (${prefix}${params.startNum} - ${prefix}${params.startNum + params.count - 1})`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });

    return { createdCount: toInsert.length };
  });
}

export async function bulkRenameTables(tableIds: number[], pattern: string) {
  return await db.transaction('rw', ['tables', 'auditLogs'], async () => {
    let idx = 1;
    for (const id of tableIds) {
      const newName = pattern.includes('{N}') ? pattern.replace('{N}', String(idx)) : `${pattern} ${idx}`;
      await db.table('tables').update(id, { nomor: newName });
      idx++;
    }

    await db.table('auditLogs').add({
      action: 'BULK_UPDATE',
      amount: 0,
      reason: `Bulk rename ${tableIds.length} meja dengan pola '${pattern}'`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });

    return { renamedCount: tableIds.length };
  });
}

export async function bulkDeleteEmptyTables(tableIds: number[]) {
  return await db.transaction('rw', ['tables', 'orders', 'auditLogs'], async () => {
    const orders = await db.table('orders').toArray();
    const unpaidTableIds = new Set(orders.filter(o => o.status === 'unpaid' && o.tableId).map(o => o.tableId));

    const deletableIds: number[] = [];
    const blockedIds: number[] = [];

    for (const id of tableIds) {
      if (unpaidTableIds.has(id)) {
        blockedIds.push(id);
      } else {
        deletableIds.push(id);
      }
    }

    if (deletableIds.length > 0) {
      await db.table('tables').bulkDelete(deletableIds);
    }

    await db.table('auditLogs').add({
      action: 'BULK_DELETE',
      amount: 0,
      reason: `Bulk hapus meja: ${deletableIds.length} dihapus, ${blockedIds.length} ditolak karena memiliki tagihan aktif`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });

    return {
      deletedCount: deletableIds.length,
      blockedCount: blockedIds.length
    };
  });
}

export async function importHistoricalTransactions(transactions: {
  receiptNumber?: string;
  customerName?: string;
  orderType?: string;
  createdAt: string;
  total: number;
  paymentMethod: 'Cash' | 'QRIS' | 'Transfer';
  items?: { nama: string; qty: number; harga: number }[];
}[]) {
  return await db.transaction('rw', ['orders', 'orderItems', 'payments', 'auditLogs'], async () => {
    let importedCount = 0;
    for (const t of transactions) {
      const total = Number(t.total) || 0;
      const orderId = await db.table('orders').add({
        shiftId: null,
        idempotencyKey: `HIST-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        tableId: null,
        receiptNumber: t.receiptNumber || null,
        subtotal: total,
        total: total,
        paidAmount: total,
        remainingBalance: 0,
        status: 'paid',
        verificationStatus: 'terverifikasi',
        isHistorical: true,
        customerName: t.customerName || 'Pelanggan Migrasi',
        paymentMethod: t.paymentMethod || 'Cash',
        orderType: t.orderType || 'Takeaway',
        notes: `Import Riwayat Historis (${t.receiptNumber || 'Tanpa No'})`,
        createdAt: t.createdAt || new Date().toISOString(),
        updatedAt: t.createdAt || new Date().toISOString(),
      }) as number;

      if (t.items && t.items.length > 0) {
        const itemsToInsert = t.items.map(i => ({
          orderId,
          menuItemId: 0,
          namaMenu: i.nama,
          kategoriMenu: 'Historis',
          qty: i.qty || 1,
          paidQty: i.qty || 1,
          hargaSatuan: i.harga || total,
          selectedModifiers: []
        }));
        await db.table('orderItems').bulkAdd(itemsToInsert);
      } else {
        await db.table('orderItems').add({
          orderId,
          menuItemId: 0,
          namaMenu: 'Transaksi Historis',
          kategoriMenu: 'Historis',
          qty: 1,
          paidQty: 1,
          hargaSatuan: total,
          selectedModifiers: []
        });
      }

      await db.table('payments').add({
        orderId,
        shiftId: null,
        paymentMethod: t.paymentMethod || 'Cash',
        amount: total,
        cashTendered: total,
        change: 0,
        splitType: 'full',
        paidAt: t.createdAt || new Date().toISOString(),
        operatorName: 'Migrasi',
        notes: 'Import Riwayat Historis',
        status: 'completed',
        proofStatus: t.paymentMethod === 'Cash' ? 'terverifikasi' : 'menunggu_verifikasi'
      });

      importedCount++;
    }

    await db.table('auditLogs').add({
      action: 'MIGRATION',
      amount: 0,
      reason: `Import ${importedCount} transaksi historis migrasi`,
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });

    return { importedCount };
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

  const storePayments = await db.table('payments').toArray();
  const allPayments = storePayments.filter(p => p.shiftId === shiftId);
  const allOrders = await db.table('orders').toArray();
  const shiftOrders = allOrders.filter(o => o.shiftId === shiftId);

  let cashSales = 0;
  let nonCashSales = 0;
  let cashRefunds = 0;

  if (allPayments.length > 0) {
    // 1. Penjualan Tunai Murni: HANYA dari pembayaran berstatus 'completed' dengan metode Cash
    cashSales = allPayments
      .filter((p: any) => (p.status === 'completed' || p.status === 'refunded') && p.paymentMethod === 'Cash')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    // 2. Penjualan Non-Tunai: QRIS & Transfer Bank (Tercatat terpisah, TIDAK masuk kas fisik laci)
    nonCashSales = allPayments
      .filter((p: any) => p.status === 'completed' && p.paymentMethod !== 'Cash')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const verifiedNonCashSales = allPayments
      .filter((p: any) => p.status === 'completed' && p.paymentMethod !== 'Cash' && p.proofStatus === 'terverifikasi')
      .reduce((sum: number, p: any) => sum + p.amount, 0);

    const unverifiedNonCashSales = Math.max(0, nonCashSales - verifiedNonCashSales);

    // 3. Refund Tunai
    const refundedPaymentsCash = storePayments
      .filter((p: any) => p.status === 'refunded' && (p.refundShiftId ?? p.shiftId) === shiftId)
      .reduce((sum: number, p: any) => sum + (p.cashRefundAmount ?? (p.paymentMethod === 'Cash' ? p.amount : 0)), 0);

    const voidedOrdersCash = shiftOrders
      .filter(o => o.status === 'void' && o.isRefunded && o.refundMethod === 'Tunai')
      .reduce((sum, o) => sum + (o.refundAmount || o.total), 0);

    const legacyRefunds = allPayments.some((p: any) => p.status === 'refunded' && p.cashRefundAmount === undefined);
    cashRefunds = legacyRefunds ? Math.max(refundedPaymentsCash, voidedOrdersCash) : refundedPaymentsCash;
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
  // A refund can belong to this shift even when its original sale was in a previous shift.
  if (allPayments.length === 0) cashRefunds += storePayments.filter((p: any) => p.refundShiftId === shiftId && p.shiftId !== shiftId).reduce((sum: number, p: any) => sum + (p.cashRefundAmount || 0), 0);
  const expectedCash = (Number(shift.startingCash) || 0) + cashSales - cashRefunds + cashIn - cashOut;

  const verifiedNonCash = typeof allPayments !== 'undefined'
    ? allPayments.filter((p: any) => p.status === 'completed' && p.paymentMethod !== 'Cash' && p.proofStatus === 'terverifikasi').reduce((s: number, p: any) => s + p.amount, 0)
    : 0;
  const unverifiedNonCash = Math.max(0, nonCashSales - verifiedNonCash);

  return {
    ...shift,
    totalTransactions: allPayments.length > 0 ? allPayments.filter((p: any) => p.status === 'completed').length : shiftOrders.filter(o => o.status !== 'void').length,
    cashSales,
    nonCashSales,
    verifiedNonCashSales: verifiedNonCash,
    unverifiedNonCashSales: unverifiedNonCash,
    cashRefunds,
    cashIn,
    cashOut,
    expectedCash,
    movements
  };
}

export async function openShift(data: { operatorName: string, startingCash: number, notes?: string }) {
  if (!Number.isFinite(data.startingCash) || data.startingCash < 0) throw new Error('Modal awal tidak valid.');
  return db.transaction('rw', ['shifts', 'auditLogs'], async () => {
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

  return { id: Number(id), ...shiftData };
  });
}

export async function closeShift(shiftId: number, data: { actualCash: number, notes?: string, operatorName?: string }) {
  if (!Number.isFinite(data.actualCash) || data.actualCash < 0) throw new Error('Jumlah uang fisik tidak valid.');
  return db.transaction('rw', ['shifts', 'orders', 'payments', 'cashMovements', 'auditLogs'], async () => {
  const stats = await getShiftLiveStats(shiftId);
  if (stats.status !== 'open') throw new Error('Shift sudah ditutup.');
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
  });
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
  await db.transaction('rw', ['orders', 'orderItems', 'payments', 'paymentProofs', 'tables', 'auditLogs', 'shifts', 'cashMovements'], async () => {
    await db.table('orderItems').clear();
    await db.table('orders').clear();
    await db.table('payments').clear();
    await db.table('paymentProofs').clear();
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

export async function resetDemoSandbox() {
  if (db.name !== 'SakuNotaDemoDB') throw new Error('Reset demo hanya diizinkan pada database demo.');
  await resetAllTransactions();
  await db.table('inventoryMovements').clear();
  await db.table('menuItems').clear();
  const menusToInsert = initialData.menus.map(m => ({
    nama: m.nama,
    harga: m.harga,
    kategori: m.kategori,
    isSoldOut: m.isSoldOut,
    urutan: m.urutan,
    modifiers: (m as any).modifiers || getDefaultModifiersForCategory(m.kategori, m.nama)
  }));
  await db.table('menuItems').bulkAdd(menusToInsert);
  const tables = await db.table('tables').toArray();
  if (tables.length === 0) {
    await resetStoreTables(8, 'Meja ');
  } else {
    for (const t of tables) {
      await db.table('tables').update(t.id, { status: 'kosong' });
    }
  }
  const demoProduct = await db.table('menuItems').orderBy('id').first();
  if (demoProduct) {
    const quantities = [9, 14, 8, 18, 11, 23, 17];
    for (let day = 0; day < quantities.length; day++) {
      const date = new Date(); date.setDate(date.getDate() - (6 - day)); date.setHours(12, 0, 0, 0);
      const qty = quantities[day], total = demoProduct.harga * qty;
      const result = await createOrder({ total, status: 'paid', paymentMethod: day % 2 ? 'QRIS' : 'Cash', isHistorical: true, customerName: 'Contoh penjualan demo', items: [{ ...demoProduct, qty }] });
      await db.table('orders').update(result.id, { createdAt: date.toISOString(), updatedAt: date.toISOString() });
      await db.table('payments').where('orderId').equals(Number(result.id)).modify({ paidAt: date.toISOString() });
    }
  }
  return true;
}

// --- FITUR CADANGAN (BACKUP) & PEMULIHAN (RESTORE) ---

export async function exportAllData() {
  return db.transaction('r', db.tables, async () => {
  const menus = await db.table('menuItems').toArray();
  const tables = await db.table('tables').toArray();
  const orders = await db.table('orders').toArray();
  const orderItems = await db.table('orderItems').toArray();
  const payments = await db.table('payments').toArray();
  const paymentProofs = await db.table('paymentProofs').toArray();
  const auditLogs = await db.table('auditLogs').toArray();
  const shifts = await db.table('shifts').toArray();
  const cashMovements = await db.table('cashMovements').toArray();
  const inventoryMovements = await db.table('inventoryMovements').toArray();
  
  let settings = null;
  try {
    const entry = await db.table('settings').get('pos_store_settings');
    if (entry && entry.value) {
      settings = entry.value;
    }
  } catch (_) {}
  if (!settings && typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) settings = JSON.parse(raw);
    } catch (e) {}
  }

  // Sanitasi keamanan: Jangan pernah sertakan PIN Otorisasi Admin maupun Recovery Code dalam file cadangan publik
  if (settings) {
    const safeSettings = { ...settings };
    delete safeSettings.adminPin;
    delete safeSettings.recoveryCodeHash;
    delete safeSettings.failedRecoveryAttempts;
    delete safeSettings.recoveryLockedUntil;
    settings = safeSettings;
  }

  const integrity = {
    totalMenus: menus.length,
    totalOrders: orders.length,
    totalPayments: payments.length,
    totalProofs: paymentProofs.length,
    checksum: (menus.length * 3) + (orders.length * 7) + (payments.length * 11) + (paymentProofs.length * 13)
  };

  return {
    version: 3,
    appName: 'SakuNota',
    exportedAt: new Date().toISOString(),
    integrity,
    settings,
    menus,
    tables,
    orders,
    orderItems,
    payments,
    paymentProofs,
    auditLogs,
    shifts,
    cashMovements,
    inventoryMovements
  };
  });
}

export function validateBackupSchema(data: any): {
  isValid: boolean;
  version?: number;
  error?: string;
  stats: {
    menus: number;
    tables: number;
    orders: number;
    payments: number;
    proofs: number;
    shifts: number;
    hasSettings: boolean;
    storeName?: string;
  };
} {
  if (!data || typeof data !== 'object') {
    return {
      isValid: false,
      error: 'Format file tidak valid (bukan JSON object).',
      stats: { menus: 0, tables: 0, orders: 0, payments: 0, proofs: 0, shifts: 0, hasSettings: false }
    };
  }

  if (!Array.isArray(data.menus)) {
    return {
      isValid: false,
      error: 'Format file cadangan tidak valid: Data menu tidak ditemukan.',
      stats: { menus: 0, tables: 0, orders: 0, payments: 0, proofs: 0, shifts: 0, hasSettings: false }
    };
  }

  const menusCount = data.menus.length;
  const tablesCount = Array.isArray(data.tables) ? data.tables.length : 0;
  const ordersCount = Array.isArray(data.orders) ? data.orders.length : 0;
  const paymentsCount = Array.isArray(data.payments) ? data.payments.length : 0;
  const proofsCount = Array.isArray(data.paymentProofs) ? data.paymentProofs.length : 0;
  const shiftsCount = Array.isArray(data.shifts) ? data.shifts.length : 0;
  const storeName = data.settings?.storeName;

  return {
    isValid: true,
    version: data.version || 1,
    stats: {
      menus: menusCount,
      tables: tablesCount,
      orders: ordersCount,
      payments: paymentsCount,
      proofs: proofsCount,
      shifts: shiftsCount,
      hasSettings: Boolean(data.settings),
      storeName
    }
  };
}

export async function importAllData(data: any, options?: { skipPreBackup?: boolean }) {
  const validation = validateBackupSchema(data);
  if (!validation.isValid) {
    throw new Error(validation.error || 'Format file cadangan tidak valid: Data menu tidak ditemukan.');
  }
  if (data.inventoryMovements !== undefined && !Array.isArray(data.inventoryMovements)) throw new Error('Riwayat stok tidak valid.');
  for (const product of data.menus) {
    if (product.trackStock && (!Number.isInteger(product.stockQty) || product.stockQty < 0 || !Number.isInteger(product.minimumStock ?? 0) || (product.minimumStock ?? 0) < 0)) throw new Error('Saldo stok dalam cadangan tidak valid.');
  }

  // 1. Ambil snapshot cadangan saat ini untuk keamanan (disimpan di IndexedDB agar bebas dari batas kuota localStorage 5MB)
  let preRestoreSnapshot: any = null;
  if (!options?.skipPreBackup) {
    try {
      preRestoreSnapshot = await exportAllData();
      await db.table('settings').put({
        key: 'pre_restore_snapshot',
        value: preRestoreSnapshot,
        updatedAt: new Date().toISOString()
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('sakunota_pre_restore_snapshot_meta', JSON.stringify({
          timestamp: new Date().toISOString(),
          menuCount: preRestoreSnapshot.menus?.length || 0,
          orderCount: preRestoreSnapshot.orders?.length || 0
        }));
      }
    } catch (snapErr) {
      console.warn('Gagal membuat snapshot pre-restore otomatis:', snapErr);
    }
  }

  // Helper pemulihan data ke tabel Dexie - SEMUA tabel DAN pengaturan dieksekusi dalam 1 transaksi ACID
  const restoreToTables = async (payload: any) => {
    await db.transaction('rw', ['menuItems', 'tables', 'orders', 'orderItems', 'payments', 'paymentProofs', 'auditLogs', 'shifts', 'cashMovements', 'settings', 'inventoryMovements'], async () => {
      await db.table('inventoryMovements').clear();
      if (payload.inventoryMovements?.length) await db.table('inventoryMovements').bulkAdd(payload.inventoryMovements);
      await db.table('auditLogs').clear();
      await db.table('shifts').clear();
      await db.table('cashMovements').clear();
      await db.table('paymentProofs').clear();
      await db.table('payments').clear();
      await db.table('orderItems').clear();
      await db.table('orders').clear();
      await db.table('tables').clear();
      await db.table('menuItems').clear();

      if (payload.menus && payload.menus.length > 0) {
        const cleanMenus = payload.menus.map((m: any) => ({
          id: m.id,
          sku: m.sku || undefined,
          nama: m.nama,
          harga: Number(m.harga) || 0,
          kategori: m.kategori || 'Umum',
          isSoldOut: Boolean(m.isSoldOut),
          urutan: Number(m.urutan || 0),
          modifiers: m.modifiers || [],
          trackStock: Boolean(m.trackStock),
          stockQty: Number(m.stockQty) || 0,
          minimumStock: Number(m.minimumStock) || 0,
          stockUnit: m.stockUnit || 'pcs'
        }));
        await db.table('menuItems').bulkAdd(cleanMenus);
      }

      if (payload.tables && payload.tables.length > 0) {
        await db.table('tables').bulkAdd(payload.tables);
      }

      if (payload.orders && payload.orders.length > 0) {
        await db.table('orders').bulkAdd(payload.orders);
      }

      if (payload.orderItems && payload.orderItems.length > 0) {
        await db.table('orderItems').bulkAdd(payload.orderItems);
      }

      if (payload.payments && payload.payments.length > 0) {
        await db.table('payments').bulkAdd(payload.payments);
      }

      if (payload.paymentProofs && payload.paymentProofs.length > 0) {
        await db.table('paymentProofs').bulkAdd(payload.paymentProofs);
      }

      if (payload.auditLogs && payload.auditLogs.length > 0) {
        await db.table('auditLogs').bulkAdd(payload.auditLogs);
      }

      if (payload.shifts && payload.shifts.length > 0) {
        await db.table('shifts').bulkAdd(payload.shifts);
      }

      if (payload.cashMovements && payload.cashMovements.length > 0) {
        await db.table('cashMovements').bulkAdd(payload.cashMovements);
      }

      // Pengaturan toko disimpan DI DALAM transaksi yang sama demi konsistensi atomik 100%
      if (payload.settings) {
        // Ambil kredensial lokal perangkat ini dari database lokal sebelum ditimpa
        const currentEntry = await db.table('settings').get('pos_store_settings');
        const localPin = currentEntry?.value?.adminPin;
        const localRecoveryHash = currentEntry?.value?.recoveryCodeHash;

        // Kredensial keamanan (PIN & Recovery Code) TIDAK PERNAH diambil dari file cadangan (selalu diabaikan/dibersihkan).
        // - Di perangkat lama: PIN lokal dan Recovery Code lokal yang sudah ada tetap dipertahankan.
        // - Di perangkat baru: jika perangkat baru sudah memiliki kredensial lokal, gunakan milik perangkat baru.
        // - Jika belum ada: biarkan kosong "" sehingga sistem meminta pembuatan PIN/Recovery mandiri.
        const settingsToSave = {
          ...payload.settings,
          adminPin: localPin || "",
          recoveryCodeHash: localRecoveryHash || "",
          failedRecoveryAttempts: 0,
          recoveryLockedUntil: ""
        };

        await db.table('settings').put({
          key: 'pos_store_settings',
          value: settingsToSave,
          updatedAt: new Date().toISOString()
        });

        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
            window.dispatchEvent(new CustomEvent('sakunota:settings_updated', { detail: settingsToSave }));
          } catch (e) {}
        }
      }
    });
  };

  try {
    await restoreToTables(data);

    // 2. Pemeriksaan integritas menyeluruh (Counts, Relasional, Finansial)
    const [
      restoredMenuCount,
      restoredTableCount,
      restoredOrderCount,
      restoredOrderItemCount,
      restoredPaymentCount,
      restoredProofCount,
      restoredShiftCount,
      restoredOrders,
      restoredPayments,
      restoredOrderItems
    ] = await Promise.all([
      db.table('menuItems').count(),
      db.table('tables').count(),
      db.table('orders').count(),
      db.table('orderItems').count(),
      db.table('payments').count(),
      db.table('paymentProofs').count(),
      db.table('shifts').count(),
      db.table('orders').toArray(),
      db.table('payments').toArray(),
      db.table('orderItems').toArray()
    ]);

    const expectedMenuCount = data.menus?.length || 0;
    if (restoredMenuCount !== expectedMenuCount) {
      throw new Error(`Verifikasi integritas gagal: Jumlah menu tidak cocok (${restoredMenuCount} vs ${expectedMenuCount}).`);
    }

    const expectedTableCount = data.tables?.length || 0;
    if (restoredTableCount !== expectedTableCount) {
      throw new Error(`Verifikasi integritas gagal: Jumlah meja tidak cocok (${restoredTableCount} vs ${expectedTableCount}).`);
    }

    const expectedOrderCount = data.orders?.length || 0;
    if (restoredOrderCount !== expectedOrderCount) {
      throw new Error(`Verifikasi integritas gagal: Jumlah pesanan tidak cocok (${restoredOrderCount} vs ${expectedOrderCount}).`);
    }

    const expectedPaymentCount = data.payments?.length || 0;
    if (restoredPaymentCount !== expectedPaymentCount) {
      throw new Error(`Verifikasi integritas gagal: Jumlah pembayaran tidak cocok (${restoredPaymentCount} vs ${expectedPaymentCount}).`);
    }

    const expectedProofCount = data.paymentProofs?.length || 0;
    if (restoredProofCount !== expectedProofCount) {
      throw new Error(`Verifikasi integritas gagal: Jumlah bukti pembayaran tidak cocok (${restoredProofCount} vs ${expectedProofCount}).`);
    }

    const expectedShiftCount = data.shifts?.length || 0;
    if (restoredShiftCount !== expectedShiftCount) {
      throw new Error(`Verifikasi integritas gagal: Jumlah shift tidak cocok (${restoredShiftCount} vs ${expectedShiftCount}).`);
    }

    // Verifikasi Checksum Integritas File Cadangan
    if (data.integrity && typeof data.integrity.checksum === 'number') {
      const calculatedChecksum = (restoredMenuCount * 3) + (restoredOrderCount * 7) + (restoredPaymentCount * 11) + (restoredProofCount * 13);
      if (calculatedChecksum !== data.integrity.checksum) {
        throw new Error(`Verifikasi integritas gagal: Checksum file cadangan tidak cocok (${calculatedChecksum} vs ${data.integrity.checksum}). File telah dimodifikasi atau rusak.`);
      }
    }

    // Verifikasi total nominal finansial (Omzet & Total Terbayar)
    if (data.orders && data.orders.length > 0) {
      const expectedTotalOmzet = data.orders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
      const restoredTotalOmzet = restoredOrders.reduce((sum: number, o: any) => sum + (Number(o.total) || 0), 0);
      if (Math.abs(expectedTotalOmzet - restoredTotalOmzet) > 0.01) {
        throw new Error(`Verifikasi integritas gagal: Total omzet tidak cocok (Rp ${restoredTotalOmzet} vs Rp ${expectedTotalOmzet}).`);
      }
    }

    // Verifikasi integritas relasional kunci asing (Order <-> Items & Order <-> Payments)
    if (restoredOrders.length > 0) {
      const orderIds = new Set(restoredOrders.map((o: any) => o.id));
      for (const item of restoredOrderItems) {
        if (!orderIds.has(item.orderId)) {
          throw new Error(`Verifikasi integritas relasi gagal: Item pesanan #${item.id} merujuk ke nota #${item.orderId} yang tidak ditemukan.`);
        }
      }
      for (const pay of restoredPayments) {
        if (!orderIds.has(pay.orderId)) {
          throw new Error(`Verifikasi integritas relasi gagal: Pembayaran #${pay.id} merujuk ke nota #${pay.orderId} yang tidak ditemukan.`);
        }
      }
    }

    return true;
  } catch (err: any) {
    // 3. Rollback otomatis jika snapshot tersedia
    if (preRestoreSnapshot) {
      console.warn('Terjadi kesalahan saat memulihkan database. Menjalankan auto-rollback ke kondisi semula...', err);
      try {
        await restoreToTables(preRestoreSnapshot);
        console.info('Auto-rollback berhasil. Database dikembalikan ke kondisi sebelum pemulihan gagal.');
      } catch (rbErr) {
        console.error('Kritis: Gagal melakukan auto-rollback:', rbErr);
      }
    }
    throw new Error(`Gagal memulihkan cadangan: ${err.message || err}`);
  }
}

export async function getPreRestoreSnapshot(): Promise<{ timestamp: string; data: any } | null> {
  try {
    const entry = await db.table('settings').get('pre_restore_snapshot');
    if (entry && entry.value) {
      return {
        timestamp: entry.updatedAt || new Date().toISOString(),
        data: entry.value
      };
    }
  } catch (_) {}

  // Fallback to legacy localStorage if available
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('sakunota_pre_restore_snapshot');
      if (raw) return JSON.parse(raw);
    } catch (_) {}
  }
  return null;
}

export async function rollbackPreRestoreBackup(): Promise<boolean> {
  const snapshotObj = await getPreRestoreSnapshot();
  if (!snapshotObj || !snapshotObj.data) {
    throw new Error('Tidak ada snapshot cadangan sebelum pemulihan yang tersimpan.');
  }

  await importAllData(snapshotObj.data, { skipPreBackup: true });
  try {
    await db.table('settings').delete('pre_restore_snapshot');
  } catch (_) {}
  if (typeof window !== 'undefined') {
    localStorage.removeItem('sakunota_pre_restore_snapshot');
    localStorage.removeItem('sakunota_pre_restore_snapshot_meta');
  }
  return true;
}

export async function bulkExportTransactions(options: { startDate?: string, endDate?: string, paymentMethod?: string }) {
  const orders = await getOrders();
  let filtered = orders;

  if (options.startDate) {
    filtered = filtered.filter(o => o.createdAt >= options.startDate!);
  }
  if (options.endDate) {
    const endStr = options.endDate + 'T23:59:59.999Z';
    filtered = filtered.filter(o => o.createdAt <= endStr);
  }
  if (options.paymentMethod && options.paymentMethod !== 'all') {
    filtered = filtered.filter(o => o.paymentMethod === options.paymentMethod);
  }

  return filtered;
}
