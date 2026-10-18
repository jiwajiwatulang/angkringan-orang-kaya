import { db, type MenuItem, type SelectedModifier } from './dexie';
import { createOrder, getDefaultModifiersForCategory } from './api';
import { loadStoreSettingsAsync } from './settings';
import { destroyAdminSession, verifyAdminSession } from './session';
import { getWaiterSession, WAITER_SESSION_KEY, type WaiterSession } from './waiterSession';

export interface WaiterLine { menuItemId: number; qty: number; choices: Record<string, string[]> }

export async function startWaiterSession(name: string, tableIds: number[]) {
  if (!(await verifyAdminSession()) && db.name !== 'SakuNotaDemoDB') throw new Error('Buka Waiter Floor melalui Admin.');
  const settings = await loadStoreSettingsAsync();
  if (settings.serviceMode !== 'resto') throw new Error('Aktifkan mode meja terlebih dahulu.');
  if (!settings.adminPin) throw new Error('Atur PIN Admin sebelum membuka Waiter Floor.');
  const tables = await db.table('tables').toArray();
  if (!name.trim() || !tableIds.length || tableIds.some(id => !tables.some(t => t.id === id))) throw new Error('Isi nama pelayan dan pilih meja yang tersedia.');
  const value: WaiterSession = { name: name.trim(), tableIds: [...new Set(tableIds)], startedAt: new Date().toISOString() };
  await db.table('settings').put({ key: WAITER_SESSION_KEY, value, updatedAt: value.startedAt });
  await destroyAdminSession();
}

export async function endWaiterSession(pin: string) {
  const settings = await loadStoreSettingsAsync();
  return db.transaction('rw', db.table('settings'), async () => {
    const session = await getWaiterSession();
    if (!session) return;
    if ((session.lockedUntil || 0) > Date.now()) throw new Error('Terlalu banyak percobaan. Tunggu 5 menit.');
    if (!settings.adminPin || pin !== settings.adminPin) {
      const attempts = (session.failedAttempts || 0) + 1;
      await db.table('settings').put({ key: WAITER_SESSION_KEY, value: { ...session, failedAttempts: attempts, lockedUntil: attempts >= 5 ? Date.now() + 300000 : 0 } });
      return false;
    }
    await db.table('settings').delete(WAITER_SESSION_KEY);
    return true;
  });
}

export async function submitWaiterOrder(tableId: number, lines: WaiterLine[], notes: string, requestId: string) {
  const settings = await loadStoreSettingsAsync();
  if (settings.serviceMode !== 'resto') throw new Error('Waiter Floor membutuhkan mode meja.');
  if (!requestId || requestId.length > 100 || !Array.isArray(lines) || !lines.length) throw new Error('Pesanan belum lengkap.');
  return db.transaction('rw', ['orders', 'orderItems', 'payments', 'paymentProofs', 'shifts', 'tables', 'auditLogs', 'menuItems', 'inventoryMovements', 'settings'], async () => {
    const session = await getWaiterSession();
    if (!session || !session.tableIds.includes(tableId)) throw new Error('Meja di luar tugas pelayan.');
    const table = await db.table('tables').get(tableId);
    if (!table || table.status === 'lunas') throw new Error('Meja belum siap. Minta kasir mengosongkan meja yang sudah lunas.');
    const shift = await db.table('shifts').where('status').equals('open').first();
    if (!shift) throw new Error('Minta kasir membuka shift terlebih dahulu.');
    const items: (MenuItem & { qty: number; selectedModifiers: SelectedModifier[] })[] = [];
    for (const line of lines) {
      if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 999) throw new Error('Jumlah pesanan tidak valid.');
      const menu = await db.table('menuItems').get(line.menuItemId) as MenuItem | undefined;
      if (!menu || menu.isSoldOut || !Number.isFinite(menu.harga) || menu.harga < 0) throw new Error('Menu tidak tersedia.');
      const groups = menu.modifiers || getDefaultModifiersForCategory(menu.kategori, menu.nama);
      const selectedModifiers: SelectedModifier[] = [];
      const choices = line.choices || {};
      if (Object.keys(choices).some(id => !groups.some(g => g.id === id))) throw new Error('Pilihan menu tidak valid.');
      for (const group of groups) {
        const ids = choices[group.id] || [];
        const minimum = Math.max(group.required ? 1 : 0, group.minSelect || 0);
        if (!Array.isArray(ids) || new Set(ids).size !== ids.length || ids.length < minimum || ids.length > group.maxSelect) throw new Error(`Lengkapi ${group.nama}.`);
        for (const id of ids) {
          const option = group.options.find(o => o.id === id);
          if (!option || !Number.isFinite(option.harga)) throw new Error('Pilihan menu tidak valid.');
          selectedModifiers.push({ groupName: group.nama, optionName: option.nama, harga: option.harga });
        }
      }
      items.push({ ...menu, qty: line.qty, selectedModifiers });
    }
    const subtotal = items.reduce((sum, item) => sum + (item.harga + item.selectedModifiers.reduce((n, m) => n + m.harga, 0)) * item.qty, 0);
    const serviceCharge = settings.enableService ? Math.round(subtotal * settings.servicePercent / 100) : 0;
    const tax = settings.enableTax ? Math.round((subtotal + (settings.taxAppliesToService ? serviceCharge : 0)) * settings.taxPercent / 100) : 0;
    const total = subtotal + serviceCharge + tax;
    if (![subtotal, serviceCharge, tax, total].every(n => Number.isFinite(n) && n >= 0)) throw new Error('Harga atau biaya layanan tidak valid.');
    return createOrder({ idempotencyKey: `waiter:${session.startedAt}:${requestId}`, shiftId: shift.id, tableId, status: 'unpaid', orderType: 'Dine-in', subtotal, serviceCharge, tax, total, customerName: `Pelayan: ${session.name}`, notes: notes.trim().slice(0, 500), items });
  });
}
