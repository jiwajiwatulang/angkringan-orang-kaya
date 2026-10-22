/** Weight quantities are whole grams. Money is rounded once per line, half up. */
export interface SaleMeasure {
  saleUnit?: 'pcs' | 'weight';
  priceBasis?: 100 | 1000;
  costPrice?: number | null;
}

export function weightEnabled(businessType?: string) {
  return businessType === 'retail' || businessType === 'warung';
}

export function parseWeight(text: string, unit: 'g' | 'kg', allowZero = false): number {
  const value = text.trim().replace(',', '.');
  if (!value) throw new Error('Masukkan berat barang');
  if (!/^\d+(\.\d+)?$/.test(value)) throw new Error('Berat tidak valid');
  const [whole, fraction = ''] = value.split('.');
  const places = unit === 'kg' ? 3 : 0;
  if (fraction.slice(places).replace(/0/g, '')) throw new Error('Gunakan kelipatan 1 g');
  const grams = Number(whole) * (unit === 'kg' ? 1000 : 1) + Number(fraction.slice(0, places).padEnd(places, '0'));
  if (!Number.isSafeInteger(grams) || grams < 0) throw new Error('Berat tidak valid');
  if (!grams && !allowZero) throw new Error('Berat harus lebih dari 0');
  return grams;
}

export function ratioMoney(price: number, quantity: number, basis: number): number {
  if (![price, quantity, basis].every(Number.isSafeInteger) || price < 0 || quantity < 0 || basis <= 0) throw new Error('Harga atau jumlah tidak valid');
  const numerator = BigInt(price) * BigInt(quantity);
  const result = Number((numerator + BigInt(basis) / BigInt(2)) / BigInt(basis));
  if (!Number.isSafeInteger(result)) throw new Error('Total terlalu besar');
  return result;
}

export function lineTotal(item: SaleMeasure & { qty?: number; harga?: number; hargaSatuan?: number }, qty = item.qty ?? 0): number {
  const price = item.hargaSatuan ?? item.harga ?? 0;
  return item.saleUnit === 'weight' ? ratioMoney(price, qty, item.priceBasis ?? 1000) : price * qty;
}

export function lineCost(item: SaleMeasure & { qty: number; refundedQty?: number }): number | null {
  if (item.costPrice == null) return null;
  return ratioMoney(item.costPrice, item.qty - (item.refundedQty ?? 0), item.saleUnit === 'weight' ? item.priceBasis ?? 1000 : 1);
}

export function quantityLabel(item: SaleMeasure & { qty?: number }, qty = item.qty ?? 0): string {
  if (item.saleUnit !== 'weight') return `${qty.toLocaleString('id-ID')} pcs`;
  return qty >= 1000 ? `${(qty / 1000).toLocaleString('id-ID', { maximumFractionDigits: 3 })} kg` : `${qty.toLocaleString('id-ID')} g`;
}

export function priceSuffix(item: SaleMeasure): string {
  return item.saleUnit === 'weight' ? (item.priceBasis === 100 ? '/100 g' : '/kg') : '';
}

export function validateMeasure(item: SaleMeasure & { harga?: number; modifiers?: unknown[] }) {
  if (item.saleUnit !== undefined && !['pcs', 'weight'].includes(item.saleUnit)) throw new Error('Satuan tidak valid');
  if (item.costPrice != null && (!Number.isSafeInteger(item.costPrice) || item.costPrice < 0)) throw new Error('Modal tidak valid');
  if (item.saleUnit === 'weight') {
    if (![100, 1000].includes(item.priceBasis ?? 1000)) throw new Error('Satuan harga tidak valid');
    if (!Number.isSafeInteger(item.harga) || (item.harga ?? 0) <= 0) throw new Error('Harga belum tersedia');
    if (item.modifiers?.length) throw new Error('Produk timbang tidak menggunakan pilihan tambahan');
  }
}

export function weightSalesSummary(orders: any[]) {
  let grams = 0, cost = 0, revenue = 0, missingCost = false;
  for (const order of orders) {
    if (order.status !== 'paid' || order.isHistorical) continue;
    const subtotal = (order.items ?? []).reduce((n: number, i: any) => n + lineTotal(i), 0);
    for (const item of order.items ?? []) {
      if (item.saleUnit !== 'weight') continue;
      const remaining = item.qty - (item.refundedQty ?? 0);
      grams += remaining;
      // Gross product margin excludes tax/service; discount is allocated proportionally.
      const gross = lineTotal(item, remaining);
      revenue += gross - (subtotal ? ratioMoney(order.discount ?? 0, gross, subtotal) : 0);
      const itemCost = lineCost(item);
      if (remaining && itemCost == null) missingCost = true;
      cost += itemCost ?? 0;
    }
  }
  return { grams, cost: missingCost ? null : cost, profit: missingCost ? null : revenue - cost };
}
