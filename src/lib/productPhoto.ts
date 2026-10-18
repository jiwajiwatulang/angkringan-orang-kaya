export const MAX_PRODUCT_PHOTO_BYTES = 256 * 1024;

/** Only self-contained raster images can travel with offline product backups. */
export function validateProductPhoto(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > Math.ceil(MAX_PRODUCT_PHOTO_BYTES / 3) * 4 + 40) {
    throw new Error('Foto produk maksimal 256 KB setelah kompresi.');
  }
  const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match || match[2].length % 4 !== 0) throw new Error('Foto harus berupa isi gambar JPG, PNG, atau WebP; bukan tautan.');
  const bytes = atob(match[2]);
  if (bytes.length > MAX_PRODUCT_PHOTO_BYTES) throw new Error('Foto produk maksimal 256 KB.');
  const valid = match[1] === 'png' ? bytes.startsWith('\x89PNG\r\n\x1a\n')
    : match[1] === 'jpeg' ? bytes.startsWith('\xff\xd8\xff')
    : bytes.startsWith('RIFF') && bytes.slice(8, 12) === 'WEBP';
  if (!valid) throw new Error('Isi foto produk tidak sesuai format gambar.');
  return value;
}
