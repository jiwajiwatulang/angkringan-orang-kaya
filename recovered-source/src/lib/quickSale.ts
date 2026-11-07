export interface QuickSaleLine { nama: string; qty: number; harga: number }
export function validateQuickSaleLine(input: {nama?: unknown; qty: unknown; harga: unknown}): QuickSaleLine {
  if (input.nama !== undefined && typeof input.nama !== 'string') throw new Error('Nama barang tidak valid.');
  const nama = String(input.nama || '').normalize('NFKC').trim().replace(/\s+/g,' ') || 'Penjualan langsung';
  if (nama.length > 120) throw new Error('Nama barang maksimal 120 karakter.');
  if (typeof input.qty !== 'number' || !Number.isSafeInteger(input.qty) || input.qty < 1 || input.qty > 9999) throw new Error('Jumlah harus 1 sampai 9.999.');
  if (typeof input.harga !== 'number' || !Number.isSafeInteger(input.harga) || input.harga < 1 || input.harga > 1_000_000_000 || !Number.isSafeInteger(input.harga * input.qty) || input.harga * input.qty > 1_000_000_000_000) throw new Error('Harga tidak valid.');
  return {nama, qty: input.qty, harga: input.harga};
}
