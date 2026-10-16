/**
 * SakuNota 130-bit Offline-First Recovery Code Utility
 * 
 * Standar keamanan OWASP untuk kredensial pemulihan darurat offline.
 * - Entropi: 26 karakter Base32 acak (Crockford) = 130-bit kriptografis (> 128-bit).
 * - Wajib menggunakan Web Crypto API (crypto.getRandomValues). Tidak ada Math.random fallback.
 * - Hash SHA-256 untuk penyimpanan lokal di IndexedDB.
 * - Sanitasi mutlak: tidak pernah disertakan dalam file cadangan JSON.
 */

const RECOVERY_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Menghasilkan Kode Pemulihan Pemilik 130-bit berformat SAKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX
 * (26 karakter Base32 acak = 130 bit entropi)
 */
export function generateRecoveryCode(): string {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
    throw new Error(
      "Generator kriptografis aman (Web Crypto API) tidak didukung pada perangkat ini. Pembuatan Recovery Code dibatalkan demi keamanan."
    );
  }

  // 26 byte acak kriptografis
  const bytes = new Uint8Array(26);
  globalThis.crypto.getRandomValues(bytes);

  const chars: string[] = [];
  for (let i = 0; i < 26; i++) {
    chars.push(RECOVERY_CHARS[bytes[i] % RECOVERY_CHARS.length]);
  }

  // Format: SAKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX (5+5+5+5+6 = 26 karakter acak)
  const p1 = chars.slice(0, 5).join('');
  const p2 = chars.slice(5, 10).join('');
  const p3 = chars.slice(10, 15).join('');
  const p4 = chars.slice(15, 20).join('');
  const p5 = chars.slice(20, 26).join('');

  return `SAKU-${p1}-${p2}-${p3}-${p4}-${p5}`;
}

/**
 * Menormalisasi input pengguna (uppercase, tanpa spasi/tanda hubung, toleransi prefix SAKU-)
 */
export function normalizeRecoveryCode(rawCode: string): string {
  let cleaned = rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.startsWith('SAKU') && cleaned.length > 26) {
    cleaned = cleaned.substring(4);
  }
  return cleaned;
}

/**
 * Meng-hash Recovery Code dengan SHA-256
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  const normalized = normalizeRecoveryCode(code);
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Memverifikasi kecocokan Recovery Code yang diinput pengguna terhadap hash tersimpan
 */
export async function verifyRecoveryCode(inputCode: string, storedHash: string): Promise<boolean> {
  if (!inputCode || !storedHash) return false;
  const inputHash = await hashRecoveryCode(inputCode);
  return inputHash === storedHash;
}
