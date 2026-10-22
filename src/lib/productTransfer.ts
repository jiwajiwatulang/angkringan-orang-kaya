import { validateMeasure } from './weight';
import type { MenuItem } from './dexie';
import { validateProductPhoto } from './productPhoto';

export function makeProductExport(products: MenuItem[]) {
  return { appName: 'SakuNota', format: 'sakunota-products', version: 1, exportedAt: new Date().toISOString(),
    products: products.map(({ id: _id, ...product }) => ({ ...product, imageData: validateProductPhoto(product.imageData) })) };
}

export function parseProductImport(value: unknown): MenuItem[] {
  const data = value as { appName?: string; format?: string; version?: number; products?: unknown[] };
  if (!data || data.appName !== 'SakuNota' || data.format !== 'sakunota-products' || data.version !== 1 || !Array.isArray(data.products)) {
    throw new Error('Gunakan file Produk Lengkap SakuNota (.json). Cadangan seluruh toko dipulihkan melalui Pemeliharaan Data.');
  }
  if (!data.products.length || data.products.length > 10000) throw new Error('Jumlah produk dalam file tidak valid (1–10.000 produk).');
  const seenNames = new Set<string>(), seenSkus = new Set<string>();
  return data.products.map((value, index) => {
    const p = value as MenuItem;
    if (!p || typeof p.nama !== 'string' || !p.nama.trim() || !Number.isFinite(p.harga) || p.harga < 0 || typeof p.kategori !== 'string') throw new Error(`Produk baris ${index + 1} tidak valid.`);
    validateMeasure(p);
    const nama = p.nama.trim(), sku = String(p.sku || '').trim();
    if ((!sku && seenNames.has(nama.toLowerCase())) || (sku && seenSkus.has(sku.toLowerCase()))) throw new Error(`Produk duplikat dalam file: ${nama}.`);
    if (!sku) seenNames.add(nama.toLowerCase()); if (sku) seenSkus.add(sku.toLowerCase());
    if (p.modifiers !== undefined && (!Array.isArray(p.modifiers) || p.modifiers.some(g => !g || typeof g.nama !== 'string' || !Array.isArray(g.options) || g.options.some(o => !o || typeof o.nama !== 'string' || !Number.isFinite(o.harga) || o.harga < 0)))) throw new Error(`Pilihan produk ${nama} tidak valid.`);
    if (p.trackStock && (!Number.isInteger(p.stockQty) || p.stockQty! < 0 || !Number.isInteger(p.minimumStock ?? 0) || (p.minimumStock ?? 0) < 0)) throw new Error(`Stok produk ${nama} tidak valid.`);
    return { saleUnit: p.saleUnit, priceBasis: p.priceBasis, costPrice: p.costPrice, nama, sku, harga: p.harga, kategori: p.kategori.trim() || 'Umum', isSoldOut: Boolean(p.isSoldOut), urutan: index,
      ...(Object.hasOwn(p, 'imageData') ? { imageData: validateProductPhoto(p.imageData) } : {}),
      ...(p.modifiers !== undefined ? { modifiers: p.modifiers } : {}),
      trackStock: Boolean(p.trackStock), stockQty: p.stockQty, minimumStock: p.minimumStock, stockUnit: p.saleUnit === 'weight' ? 'g' : String(p.stockUnit || 'pcs') };
  });
}
