import type Dexie from 'dexie';
import { db, type MenuItem } from './dexie';

export const DEMO_WEIGHT_PRODUCTS: Record<'warung' | 'retail', MenuItem[]> = {
  warung: [
    { sku: 'DEMO-WRG-WEIGHT-01', nama: 'Lauk Ayam Ungkep', harga: 48000, costPrice: 34000, saleUnit: 'weight', priceBasis: 1000, kategori: 'Barang Timbang', trackStock: true, stockQty: 10000, minimumStock: 1000, stockUnit: 'g', isSoldOut: false, urutan: -2 },
    { sku: 'DEMO-WRG-WEIGHT-02', nama: 'Kacang Goreng', harga: 8000, costPrice: 5000, saleUnit: 'weight', priceBasis: 100, kategori: 'Barang Timbang', trackStock: true, stockQty: 3000, minimumStock: 500, stockUnit: 'g', isSoldOut: false, urutan: -1 },
  ],
  retail: [
    { sku: 'DEMO-RTL-WEIGHT-01', nama: 'Beras Premium Curah', harga: 18000, costPrice: 12000, saleUnit: 'weight', priceBasis: 1000, kategori: 'Barang Timbang', trackStock: true, stockQty: 25000, minimumStock: 2000, stockUnit: 'g', isSoldOut: false, urutan: -2 },
    { sku: 'DEMO-RTL-WEIGHT-02', nama: 'Kopi Bubuk Curah', harga: 12000, costPrice: 8000, saleUnit: 'weight', priceBasis: 100, kategori: 'Barang Timbang', trackStock: true, stockQty: 3000, minimumStock: 500, stockUnit: 'g', isSoldOut: false, urutan: -1 },
  ],
};

/** Add missing examples to fresh or existing demos. Never touch a merchant store or reset used stock. */
export async function ensureDemoWeightProducts(businessType?: string, store: Dexie = db): Promise<number> {
  if (store.name !== 'SakuNotaDemoDB' || (businessType !== 'warung' && businessType !== 'retail')) return 0;
  return store.transaction('rw', ['menuItems', 'inventoryMovements'], async () => {
    let added = 0;
    for (const product of DEMO_WEIGHT_PRODUCTS[businessType]) {
      if (await store.table('menuItems').where('sku').equals(product.sku!).first()) continue;
      const id = await store.table('menuItems').add({ ...product });
      await store.table('inventoryMovements').add({ menuItemId: id, productName: product.nama, type: 'opening', delta: product.stockQty, balance: product.stockQty, reason: 'Stok awal demo', operator: 'Demo', timestamp: new Date().toISOString() });
      added++;
    }
    return added;
  });
}
