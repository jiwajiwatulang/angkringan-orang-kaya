import { db } from './dexie';
import { normalizeRetailName, validateRetailDraft, type RetailDraftProduct } from './retailDraft';

/** Must run inside the caller's payment transaction: a failed sale leaves no catalog entry. */
export async function resolveRetailProduct(draft: RetailDraftProduct): Promise<number> {
  const clean = validateRetailDraft(draft);
  const existing = await db.table('menuItems').filter(p => normalizeRetailName(p.nama) === normalizeRetailName(clean.nama)).first();
  if (existing) {
    if (existing.harga !== clean.harga || existing.isSoldOut || existing.trackStock || existing.modifiers?.length) {
      throw new Error('Barang ini sudah ada di katalog. Pilih barang dari katalog untuk melanjutkan.');
    }
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
