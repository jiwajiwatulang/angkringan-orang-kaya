import { db, MenuItem, Order, OrderItem } from './dexie';
import initialData from './initialData.json';

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
          urutan: m.urutan
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

  return menus;
}

export async function createMenu(data: { nama: string, harga: number, kategori: string }) {
  const count = await db.table('menuItems').count();
  await db.table('menuItems').add({
    nama: data.nama,
    harga: Number(data.harga),
    kategori: data.kategori,
    isSoldOut: false,
    urutan: count
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
      // Check again inside the lock
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

  // Deduplikasi otomatis jika ada bug double-seeding sebelumnya
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

  // Urutkan berdasarkan angka di nama meja (Meja 2 sebelum Meja 10)
  return tables.sort((a: any, b: any) =>
    a.nomor.localeCompare(b.nomor, 'id', { numeric: true })
  );
}

// Status meja: 'kosong' (hijau) | 'open' (merah, belum bayar) | 'lunas' (biru, masih nongkrong)
export async function setTableStatus(id: number, status: 'kosong' | 'open' | 'lunas') {
  await db.table('tables').update(id, { status });
}

export async function countUnpaidOrdersForTable(tableId: number) {
  const orders = await db.table('orders').toArray();
  return orders.filter((o: any) => o.tableId === tableId && o.status === 'unpaid').length;
}

// Hitung ulang status meja setelah transaksi
export async function refreshTableStatus(tableId: number, justPaid: boolean) {
  const unpaid = await countUnpaidOrdersForTable(tableId);
  if (unpaid > 0) {
    await setTableStatus(tableId, 'open');
  } else if (justPaid) {
    await setTableStatus(tableId, 'lunas');
  }
}

// Kosongkan meja (pelanggan pulang). Ditolak jika masih ada tagihan belum lunas.
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

export async function getOrders() {
  const orders = await db.table('orders').reverse().toArray();
  const orderItems = await db.table('orderItems').toArray();
  const menus = await db.table('menuItems').toArray();

  return orders.map(order => {
    const items = orderItems.filter(i => i.orderId === order.id).map(i => ({
      ...i,
      menuItem: menus.find(m => m.id === i.menuItemId) || { nama: 'Menu Terhapus', kategori: 'Lainnya' }
    }));
    return { ...order, items };
  });
}

export async function createOrder(data: any) {
  return await db.transaction('rw', 'orders', 'orderItems', async () => {
    const orderId = await db.table('orders').add({
      tableId: data.tableId || null,
      total: data.total,
      status: data.status || 'paid',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      paymentMethod: data.paymentMethod,
      orderType: data.orderType,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const itemsToInsert = data.items.map((item: any) => ({
      orderId: orderId as number,
      menuItemId: item.id || item.menuItemId,
      qty: item.qty,
      hargaSatuan: item.harga || item.hargaSatuan
    }));

    await db.table('orderItems').bulkAdd(itemsToInsert);
    return { id: orderId, createdAt: new Date().toISOString() };
  });
}

export async function updateOrder(id: number, data: any) {
  return await db.transaction('rw', 'orders', 'orderItems', async () => {
    await db.table('orders').update(id, {
      total: data.total,
      status: data.status || 'paid',
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      paymentMethod: data.paymentMethod,
      orderType: data.orderType,
      tableId: data.tableId || null,
      notes: data.notes || '',
      updatedAt: new Date().toISOString(),
    });

    // Delete old items
    const oldItems = await db.table('orderItems').where({ orderId: id }).toArray();
    const oldItemIds = oldItems.map(i => i.id!).filter(Boolean);
    await db.table('orderItems').bulkDelete(oldItemIds);

    // Insert new items
    const itemsToInsert = data.items.map((item: any) => ({
      orderId: id,
      menuItemId: item.id || item.menuItemId,
      qty: item.qty,
      hargaSatuan: item.harga || item.hargaSatuan
    }));
    await db.table('orderItems').bulkAdd(itemsToInsert);
    return { id };
  });
}

export async function deleteOrders(ids: number[]) {
  await db.transaction('rw', 'orders', 'orderItems', async () => {
    await db.table('orders').bulkDelete(ids);
    const items = await db.table('orderItems').toArray();
    const itemsToDelete = items.filter(i => ids.includes(i.orderId)).map(i => i.id!);
    await db.table('orderItems').bulkDelete(itemsToDelete);
  });
}


