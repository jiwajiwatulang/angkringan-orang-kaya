import { db } from './dexie';
import { normalizeRetailName, validateRetailDraft, type RetailDraftProduct } from './retailDraft';
import { sameBarcode } from './productReference';

/** Must run inside the caller's payment transaction: a failed sale leaves no catalog entry. */
export async function resolveRetailProduct(draft: RetailDraftProduct): Promise<number> {
  const clean = validateRetailDraft(draft);
  const existing = await db.table('menuItems').filter(p => (clean.sku && p.sku && sameBarcode(p.sku, clean.sku)) || normalizeRetailName(p.nama) === normalizeRetailName(clean.nama)).first();
  if (existing) {
    if (existing.harga !== clean.harga || existing.isSoldOut || existing.saleUnit === 'weight' || existing.trackStock || existing.modifiers?.length) {
      throw new Error('Barang ini sudah ada di katalog. Pilih barang dari katalog untuk melanjutkan.');
    }
    if (clean.sku && (!existing.sku || !sameBarcode(existing.sku, clean.sku))) throw new Error('Nama barang ini sudah ada dengan barcode berbeda atau kosong. Periksa melalui Katalog & Stok.');
    return existing.id!;
  }
  return Number(await db.table('menuItems').add({ ...clean, kategori: 'Retail', isSoldOut: false, urutan: Date.now(), modifiers: [], trackStock: false }));
}

export async function finishRetailOrder(orderId: number) {
  const items = await db.table('orderItems').where('orderId').equals(orderId).toArray();
  for (const item of items) {
    if (!item.pendingRetailProduct) continue;
    const menuItemId = await resolveRetailProduct(item.pendingRetailProduct);
    await db.table('orderItems').update(item.id!, { menuItemId, pendingRetailProduct: undefined });
  }
}
