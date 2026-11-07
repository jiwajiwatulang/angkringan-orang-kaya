import { lineTotal, ratioMoney, type SaleMeasure } from './weight';

export const returnMethods = ['Cash', 'QRIS', 'Transfer'] as const;
export type ReturnMethod = typeof returnMethods[number];
export type ReturnPayments = Partial<Record<ReturnMethod, number>>;
export type WeightReturnRecord = { orderItemId: number | string; grams: number; returnPayments: ReturnPayments; restock: boolean };
type Line = SaleMeasure & { id?: number | string; qty: number; hargaSatuan: number };

function allocatedAmount(order: { total: number }, items: Line[], id: Line['id']) {
  const subtotal = items.reduce((sum, item) => sum + lineTotal(item), 0);
  if (!subtotal) throw new Error('Nilai nota tidak tersedia.');
  let gross = 0;
  for (const item of items) {
    const before = ratioMoney(order.total, gross, subtotal);
    gross += lineTotal(item);
    if (item.id === id) return ratioMoney(order.total, gross, subtotal) - before;
  }
  throw new Error('Barang tidak ditemukan.');
}

export function measuredSplitAmount(order: { total: number }, items: Line[], selections: { orderItemId?: number | string; qty: number }[]) {
  const seen = new Set<number | string>();
  return selections.reduce((total, selection) => {
    const item = items.find(i => i.id === selection.orderItemId) as (Line & { paidQty?: number }) | undefined;
    if (!item || !selection.orderItemId || seen.has(selection.orderItemId) || !Number.isSafeInteger(selection.qty) ||
        selection.qty <= 0 || selection.qty > item.qty - (item.paidQty ?? 0)) throw new Error('Jumlah pembayaran barang tidak valid.');
    seen.add(selection.orderItemId);
    const amount = allocatedAmount(order, items, item.id);
    const paid = item.paidQty ?? 0;
    return total + ratioMoney(amount, paid + selection.qty, item.qty) - ratioMoney(amount, paid, item.qty);
  }, 0);
}

export function quoteWeightReturn(
  order: { total: number; status: string; isHistorical?: boolean; tableId?: unknown },
  items: Line[],
  payments: { status: string; amount: number; paymentMethod: string }[],
  returns: WeightReturnRecord[],
  itemId: number | string,
  grams: number,
) {
  const completed = payments.filter(p => p.status === 'completed');
  if (order.status !== 'paid' || order.isHistorical || order.tableId || order.total <= 0 ||
      completed.reduce((sum, p) => sum + p.amount, 0) !== order.total) throw new Error('Pilih nota lunas untuk retur timbang.');
  const item = items.find(line => line.id === itemId);
  if (item?.saleUnit !== 'weight') throw new Error('Barang timbang tidak ditemukan.');
  const returned = returns.filter(r => r.orderItemId === itemId).reduce((sum, r) => sum + r.grams, 0);
  if (!Number.isSafeInteger(grams) || grams <= 0 || grams > item.qty - returned) throw new Error('Berat melebihi sisa yang bisa diretur.');
  const lineAmount = allocatedAmount(order, items, itemId);
  const amount = ratioMoney(lineAmount, returned + grams, item.qty) - ratioMoney(lineAmount, returned, item.qty);
  const returnPayments: ReturnPayments = {};
  let remaining = amount;
  for (const method of returnMethods) {
    const received = completed.filter(p => p.paymentMethod === method).reduce((sum, p) => sum + p.amount, 0);
    const previous = returns.reduce((sum, r) => sum + (r.returnPayments[method] ?? 0), 0);
    const refund = Math.min(remaining, received - previous);
    if (refund < 0) throw new Error('Catatan retur tidak sesuai pembayaran.');
    if (refund) returnPayments[method] = refund;
    remaining -= refund;
  }
  if (remaining) throw new Error('Nilai retur melebihi sisa pembayaran.');
  return { amount, returnPayments };
}
