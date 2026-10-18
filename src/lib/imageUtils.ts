/**
 * SakuNota Image Processing Utilities
 * Mengompresi dan memvalidasi bukti pembayaran secara lokal sebelum disimpan ke IndexedDB
 */

export interface ProcessedImage {
  base64: string;
  imageData: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Kompresi gambar client-side via HTML5 Canvas.
 * Menghasilkan Data URL base64 dengan ukuran <= 2 MB.
 */
export async function compressPaymentProof(file: File | Blob, customFileName?: string, options?: { maxDim: number; maxBytes: number }): Promise<ProcessedImage> {
  const originalName = (file as File).name || customFileName || `bukti_${Date.now()}.jpg`;
  const originalType = file.type || 'image/jpeg';

  // Validasi format file
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!validTypes.includes(originalType.toLowerCase())) {
    throw new Error('Format file tidak didukung. Harap gunakan gambar JPG, PNG, atau WebP.');
  }

  // Jika running di Node.js / SSR environment (misal automated tests)
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    // Di Node / test environment, konversi file/buffer ke base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${originalType};base64,${buffer.toString('base64')}`;
    return {
      base64,
      imageData: base64,
      fileName: originalName,
      fileSize: buffer.length,
      mimeType: originalType
    };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
      img.onload = () => {
        try {
          const maxDim = options?.maxDim ?? 1600;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            throw new Error('Gagal menginisialisasi canvas untuk kompresi.');
          }

          // Background putih untuk transparansi PNG saat diubah ke JPG/WebP
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Coba WebP terlebih dahulu, fallback ke JPEG
          let targetMime = 'image/webp';
          let quality = 0.82;
          let dataUrl = canvas.toDataURL(targetMime, quality);

          // Jika browser tidak support toDataURL webp (akan fallback ke png), gunakan jpeg
          if (!dataUrl.startsWith('data:image/webp')) {
            targetMime = 'image/jpeg';
            dataUrl = canvas.toDataURL(targetMime, quality);
          }

          // Hitung estimasi bytes dari base64
          let byteLength = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);

          // Jika masih > 2MB (2,097,152 bytes), kurangi resolusi & kualitas
          if (byteLength > (options?.maxBytes ?? 2 * 1024 * 1024)) {
            quality = 0.65;
            dataUrl = canvas.toDataURL(targetMime, quality);
            byteLength = Math.round((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
          }

          if (byteLength > (options?.maxBytes ?? 2 * 1024 * 1024)) {
            throw new Error(`Ukuran gambar setelah kompresi masih terlalu besar (${formatBytes(byteLength)}). Harap pilih gambar yang lebih kecil.`);
          }

          const cleanExt = targetMime === 'image/webp' ? '.webp' : '.jpg';
          const finalName = originalName.replace(/\.[^/.]+$/, '') + cleanExt;

          resolve({
            base64: dataUrl,
            imageData: dataUrl,
            fileName: finalName,
            fileSize: byteLength,
            mimeType: targetMime
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
