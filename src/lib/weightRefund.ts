import { db } from './dexie';
import { requireMerchantAdmin } from './merchantAccess';
import { lineTotal, ratioMoney } from './weight';

/** Allocate the original payable total across lines. Last line absorbs rounding remainder. */
export function refundableLineAmount(order: { total: number }, items: any[], itemId: number): number {
  const subtotal = items.reduce((n, i) => n + lineTotal(i), 0);
  if (!subtotal) return 0;
  let allocated = 0;
  for (let index = 0; index < items.length; index++) {
    const item = items[index];
    const amount = index === items.length - 1 ? order.total - allocated : Math.min(order.total - allocated, ratioMoney(order.total, lineTotal(item), subtotal));
    if (item.id === itemId) return amount;
    allocated += amount;
  }
  throw new Error('Barang tidak ditemukan');
}

export function weightRefundAmount(order: { total: number }, items: any[], itemId: number, grams: number): number {
  const item = items.find(i => i.id === itemId);
  if (!item || item.saleUnit !== 'weight') throw new Error('Barang timbang tidak ditemukan');
  if (!Number.isSafeInteger(grams) || grams <= 0 || grams > item.qty - (item.refundedQty ?? 0)) throw new Error('Berat pengembalian tidak valid');
  const amount = refundableLineAmount(order, items, itemId);
  // Cumulative rounding prevents repeated 1 g refunds from creating or losing rupiah.
  return ratioMoney(amount, (item.refundedQty ?? 0) + grams, item.qty) - ratioMoney(amount, item.refundedQty ?? 0, item.qty);
}

export function measuredSplitAmount(order: { total: number }, items: any[], selections: { orderItemId?: number; qty: number }[]): number {
  let total = 0;
  const seen = new Set<number>();
  for (const selection of selections) {
    const item = items.find(i => i.id === selection.orderItemId);
    if (!item || seen.has(item.id) || !Number.isSafeInteger(selection.qty) || selection.qty <= 0 || selection.qty > item.qty - (item.paidQty ?? 0)) throw new Error('Jumlah pembayaran barang tidak valid');
    seen.add(item.id);
    const amount = refundableLineAmount(order, items, item.id);
    total += ratioMoney(amount, (item.paidQty ?? 0) + selection.qty, item.qty) - ratioMoney(amount, item.paidQty ?? 0, item.qty);
  }
  return total;
}

export async function refundWeight(input: { requestId?: string; orderId: number; orderItemId: number; grams: number; reason: string; restock: boolean; method: 'Cash' | 'Transfer' | 'QRIS' }) {
  await requireMerchantAdmin();
  if (!input.reason.trim()) throw new Error('Isi alasan pengembalian');
  if (!['Cash', 'Transfer', 'QRIS'].includes(input.method)) throw new Error('Metode pengembalian tidak valid');
  return db.transaction('rw', ['orders', 'orderItems', 'payments', 'weightRefunds', 'menuItems', 'inventoryMovements', 'auditLogs', 'shifts'], async () => {
    if (input.requestId) {
      const previous = await db.table('weightRefunds').where('requestId').equals(input.requestId).first();
      if (previous) {
        if (previous.orderId !== input.orderId || previous.orderItemId !== input.orderItemId || previous.grams !== input.grams || previous.method !== input.method || previous.restock !== input.restock) throw new Error('Pengembalian telah berubah. Coba kembali');
        return previous.amount;
      }
    }
    const order = await db.table('orders').get(input.orderId);
    if (!order || order.status !== 'paid' || order.isHistorical) throw new Error('Pengembalian berat tersedia untuk nota lunas');
    const items = await db.table('orderItems').where('orderId').equals(input.orderId).sortBy('id');
    const item = items.find(i => i.id === input.orderItemId);
    const amount = weightRefundAmount(order, items, input.orderItemId, input.grams);
    const payments = await db.table('payments').where('orderId').equals(input.orderId).filter(p => p.status === 'completed').toArray();
    const available = payments.reduce((n, p) => n + p.amount - (p.weightRefundedAmount ?? 0), 0);
    if (amount > available) throw new Error('Nilai pengembalian melebihi pembayaran');
    const shift = await db.table('shifts').where('status').equals('open').first();
    if (!shift) throw new Error('Buka shift terlebih dahulu');
    let remaining = amount;
    for (const payment of payments) {
      const take = Math.min(remaining, payment.amount - (payment.weightRefundedAmount ?? 0));
      if (take) await db.table('payments').update(payment.id, { weightRefundedAmount: (payment.weightRefundedAmount ?? 0) + take });
      remaining -= take;
    }
    await db.table('orderItems').update(item.id, { refundedQty: (item.refundedQty ?? 0) + input.grams });
    await db.table('orders').update(input.orderId, { weightRefundAmount: (order.weightRefundAmount ?? 0) + amount, paidAmount: available - amount, updatedAt: new Date().toISOString() });
    const timestamp = new Date().toISOString();
    await db.table('weightRefunds').add({ ...input, amount, shiftId: shift.id, timestamp });
    if (input.restock) {
      const product = await db.table('menuItems').get(item.menuItemId);
      if (product?.trackStock) {
        if (product.saleUnit !== 'weight') throw new Error('Satuan stok produk telah berubah');
        const balance = product.stockQty + input.grams;
        if (!Number.isSafeInteger(balance)) throw new Error('Stok terlalu besar');
        await db.table('menuItems').update(product.id, { stockQty: balance, isSoldOut: false });
        await db.table('inventoryMovements').add({ menuItemId: product.id, productName: product.nama, orderId: input.orderId, type: 'return', delta: input.grams, balance, reason: input.reason, operator: 'Admin', timestamp });
      }
    }
    await db.table('auditLogs').add({ action: 'PARTIAL_REFUND', orderId: input.orderId, amount, reason: input.reason, refundMethod: input.method, operator: 'Admin', timestamp });
    return amount;
  });
}
