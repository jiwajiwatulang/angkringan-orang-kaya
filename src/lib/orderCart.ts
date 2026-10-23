import type {RetailDraftProduct} from './retailDraft';
export interface OrderCartLine {
  id: number;
  nama: string;
  harga: number;
  kategori: string;
  qty: number;
  selectedModifiers?: {groupName: string; optionName: string; harga: number}[];
  itemKey?: string;
  pendingRetailProduct?: RetailDraftProduct;
  imageData?: string | null;
}
interface ReceiptCartSource {
  id?: number;
  mdId?: string;
  menuItemId?: number | null;
  nama?: string;
  namaMenu?: string;
  kategori?: string;
  kategoriMenu?: string;
  hargaSatuan: number;
  qty?: number;
  quantity?: number;
  selectedModifiers?: OrderCartLine['selectedModifiers'];
  pendingRetailProduct?: RetailDraftProduct;
}
/** A receipt line is distinct from its catalog product, especially before retail checkout. */
export function orderItemsToCart(items: ReceiptCartSource[], catalog: Pick<OrderCartLine, 'id' | 'nama' | 'kategori'>[]): OrderCartLine[] {
  return items.map((item, index) => {
    const mods = item.selectedModifiers || [];
    const signature = mods.map(m => `${m.groupName}:${m.optionName}`).sort().join('|');
    const product = catalog.find(p => p.id === item.menuItemId);
    return {
      pendingRetailProduct: item.pendingRetailProduct,
      imageData: item.pendingRetailProduct?.imageData,
      id: item.menuItemId ?? -(Number(item.id) || index + 1),
      nama: item.nama || item.namaMenu || item.pendingRetailProduct?.nama || product?.nama || 'Item Terhapus',
      harga: item.hargaSatuan,
      kategori: item.kategori || item.kategoriMenu || product?.kategori || 'Lainnya',
      qty: item.qty ?? item.quantity ?? 1,
      selectedModifiers: mods,
      itemKey: item.pendingRetailProduct ? `draft:${item.mdId || item.id || index}` : signature ? `${item.menuItemId}_${signature}` : `${item.menuItemId}`,
    };
  });
}
