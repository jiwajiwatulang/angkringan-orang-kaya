import { lineTotal } from './weight';
import { requireMerchantAdmin } from './merchantAccess';
import { db } from './dexie';

export const inventoryTables = ['menuItems', 'inventoryMovements'];

function quantity(value: number) {
  if (!Number.isFinite(value) || value < 0 || !Number.isSafeInteger(value)) {
    throw new Error('Jumlah stok harus berupa bilangan bulat nol atau lebih.');
  }
  return value;
}

export async function configureStock(menuItemId: number, stockQty: number, minimumStock = 0, stockUnit = 'pcs') {
  await requireMerchantAdmin();
  quantity(stockQty); quantity(minimumStock);
  return db.transaction('rw', inventoryTables, async () => {
    const product = await db.table('menuItems').get(menuItemId);
    if (!product) throw new Error('Produk tidak ditemukan.');
    if (product.trackStock) throw new Error('Stok sudah aktif. Gunakan stok masuk, keluar, atau opname.');
    await db.table('menuItems').update(menuItemId, { trackStock: true, stockQty, minimumStock, stockUnit: product.saleUnit === 'weight' ? 'g' : stockUnit.trim() || 'pcs', isSoldOut: stockQty === 0 });
    await db.table('inventoryMovements').add({ menuItemId, productName: product.nama, type: 'opening', delta: stockQty, balance: stockQty, reason: 'Saldo awal stok', operator: 'Admin', timestamp: new Date().toISOString() });
  });
}

export async function adjustStock(input: {
  menuItemId: number;
  type: 'in' | 'out' | 'count';
  amount: number;
  reason: string;
  expectedBalance?: number;
  supplierName?: string;
  purchasePrice?: number;
}) {
  await requireMerchantAdmin();
  quantity(input.amount);
  if (!input.reason.trim()) throw new Error('Alasan penyesuaian wajib diisi.');
  if (input.type !== 'count' && input.amount === 0) throw new Error('Jumlah barang harus lebih dari nol.');
  return db.transaction('rw', inventoryTables, async () => {
    const product = await db.table('menuItems').get(input.menuItemId);
    if (!product?.trackStock) throw new Error('Aktifkan penghitungan stok produk terlebih dahulu.');
    const before = product.stockQty ?? 0;
    if (input.type === 'count' && input.expectedBalance !== before) throw new Error('Stok berubah sejak formulir dibuka. Muat ulang sebelum menyimpan opname.');
    const balance = input.type === 'count' ? input.amount : before + (input.type === 'in' ? input.amount : -input.amount);
    if (balance < 0) throw new Error('Stok tidak mencukupi.');
    await db.table('menuItems').update(product.id, { stockQty: balance, isSoldOut: balance === 0 });
    await db.table('inventoryMovements').add({
      menuItemId: product.id,
      productName: product.nama,
      type: input.type,
      delta: balance - before,
      balance,
      countedQty: input.type === 'count' ? input.amount : undefined,
      supplierName: input.supplierName?.trim() || undefined,
      purchasePrice: input.purchasePrice ? Number(input.purchasePrice) : undefined,
      totalCost: (input.purchasePrice && input.amount) ? lineTotal({ ...product, harga: Number(input.purchasePrice), qty: input.amount }) : undefined,
      reason: input.reason.trim(),
      operator: 'Admin',
      timestamp: new Date().toISOString()
    });
    return balance;
  });
}

// Called inside the order transaction. Open bills reserve stock immediately;
// later payments never deduct it again. Edits apply only the quantity difference.
export async function applyOrderStock(orderId: number, oldItems: any[], newItems: any[], reason: string) {
  const totals = (items: any[]) => {
    const result = new Map<number, number>();
    for (const item of items) {
      const id = Number(item.menuItemId ?? item.id);
      const qty = quantity(Number(item.qty));
      if (qty === 0) throw new Error('Jumlah barang pesanan harus lebih dari nol.');
      result.set(id, (result.get(id) ?? 0) + qty);
    }
    return result;
  };
  const before = totals(oldItems), after = totals(newItems);
  for (const id of new Set([...before.keys(), ...after.keys()])) {
    const delta = (before.get(id) ?? 0) - (after.get(id) ?? 0);
    if (!delta) continue;
    const product = await db.table('menuItems').get(id);
    if (!product?.trackStock) continue;
    const balance = (product.stockQty ?? 0) + delta;
    if (balance < 0) throw new Error('Stok tidak mencukupi');
    quantity(balance);
    await db.table('menuItems').update(id, { stockQty: balance, isSoldOut: balance === 0 });
    await db.table('inventoryMovements').add({ menuItemId: id, productName: product.nama, orderId, type: delta < 0 ? 'sale' : 'return', delta, balance, reason, operator: 'Kasir', timestamp: new Date().toISOString() });
  }
}
