import { validateProductPhoto } from './productPhoto';
import { validGtin } from './productReference';

export interface RetailDraftProduct { nama: string; harga: number; imageData?: string | null; sku?: string }
export const normalizeRetailName = (value: string) => value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('id-ID');

export function validateRetailDraft(value: RetailDraftProduct) {
  if (!value || typeof value.nama !== 'string' || !value.nama.trim() || value.nama.trim().length > 120) throw new Error('Isi nama barang, maksimal 120 karakter.');
  if (!Number.isSafeInteger(value.harga) || value.harga <= 0) throw new Error('Isi harga jual dengan rupiah bulat lebih dari nol.');
  if (value.sku !== undefined && (typeof value.sku !== 'string' || !validGtin(value.sku))) throw new Error('Barcode barang tidak valid. Pindai ulang atau gunakan Isi Manual.');
  return { nama: value.nama.trim().replace(/\s+/g, ' '), harga: value.harga, imageData: validateProductPhoto(value.imageData), ...(value.sku ? { sku: value.sku } : {}) };
}

/** Reading packaging text provides an editable suggestion, never a catalog identity. */
export function productNameFromText(text: string): string {
  const lines = text.split(/[\r\n]+/).map(s => s.replace(/[^\p{L}\p{N}\s.,%/-]/gu, '').trim().replace(/\s+/g, ' '))
    .filter(s => s.length >= 3 && /[a-zA-Z]{3}/.test(s) && !/^(komposisi|ingredients|nutrition|informasi nilai|diproduksi|distributed|expired|baik digunakan|bpom|halal|www\.|https)/i.test(s));
  return lines.slice(0, 3).join(' ').slice(0, 120).trim();
}
