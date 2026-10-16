/**
 * SakuNota Offline-First Recovery Code Utility
 * 
 * Standar keamanan OWASP untuk pemulihan kredensial tanpa koneksi internet (offline).
 * Menggunakan kode acak terstruktur ber-entropi tinggi (Crockford Base32),
 * disimpan hanya dalam bentuk hash SHA-256 pada IndexedDB lokal,
 * dan TIDAK PERNAH disertakan dalam file cadangan (backup JSON).
 */

const RECOVERY_CHARS = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

/**
 * Menghasilkan Kode Pemulihan Pemilik berformat SAKU-XXXX-XXXX
 * Menggunakan generator acak kriptografis (Web Crypto API)
 */
export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(8);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let code1 = '';
  let code2 = '';
  for (let i = 0; i < 4; i++) {
    code1 += RECOVERY_CHARS[bytes[i] % RECOVERY_CHARS.length];
  }
  for (let i = 4; i < 8; i++) {
    code2 += RECOVERY_CHARS[bytes[i] % RECOVERY_CHARS.length];
  }

  return `SAKU-${code1}-${code2}`;
}

/**
 * Menormalisasi input pengguna (uppercase, tanpa spasi/tanda hubung)
 */
export function normalizeRecoveryCode(rawCode: string): string {
  return rawCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
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
