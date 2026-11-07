/** Weight quantities are whole grams. Money is rounded once per line, half up. */
export interface SaleMeasure {
  saleUnit?: 'pcs' | 'weight';
  priceBasis?: 100 | 1000;
  costPrice?: number | null;
}

export function weightEnabled(businessType?: string, serviceCategory?: string) {
  return businessType === 'retail' || businessType === 'warung' || (businessType === 'service' && serviceCategory === 'laundry');
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


export function netWeightLine(order: {discount?: number; items: (SaleMeasure & {qty: number; hargaSatuan: number})[]; weightReturns?: {orderItemId: number | string; grams: number; restock: boolean}[]},
  item: SaleMeasure & {id?: number; qty: number; hargaSatuan: number}) {
  const returns = order.weightReturns?.filter(record => record.orderItemId === item.id) ?? [];
  const returned = returns.reduce((sum, record) => sum + record.grams, 0);
  const restocked = returns.filter(record => record.restock).reduce((sum, record) => sum + record.grams, 0);
  const subtotal = order.items.reduce((sum, line) => sum + lineTotal(line), 0);
  const qty = item.qty - returned;
  const gross = lineTotal(item, qty);
  const net = gross - (subtotal ? ratioMoney(order.discount ?? 0, gross, subtotal) : 0);
  const cost = lineCost({...item, refundedQty: restocked});
  return { qty, gross, cost, profit: cost === null ? null : net - cost };
}
