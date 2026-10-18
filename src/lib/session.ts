/**
 * SakuNota Cryptographic Admin Session Manager
 * 
 * Menggantikan timestamp LocalStorage yang rentan manipulasi dengan:
 * 1. Token sesi acak 256-bit yang digenerasi secara kriptografis (Web Crypto).
 * 2. Plaintext token HANYA disimpan di sessionStorage (otomatis terhapus saat tab ditutup).
 * 3. Hash SHA-256 token disimpan di IndexedDB bersama batas waktu kadaluarsa (2 jam).
 * 4. Peniadaan total parameter bypass seperti ?auth=demo.
 */

import { db } from './dexie';

const SESSION_STORAGE_KEY = 'sakunota_admin_session_token';
const DB_SESSION_KEY = 'admin_active_session';
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 Jam

/**
 * Meng-hash token sesi dengan SHA-256
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Membuat sesi Admin baru setelah otorisasi PIN / Recovery Code berhasil
 */
export async function createAdminSession(): Promise<string> {
  if (typeof globalThis.crypto === 'undefined' || !globalThis.crypto.getRandomValues) {
    throw new Error('Web Crypto API tidak tersedia untuk membuat sesi aman.');
  }

  // 32 byte acak kriptografis (256-bit)
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  const rawToken = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const tokenHash = await hashToken(rawToken);

  const expiresAt = Date.now() + SESSION_DURATION_MS;

  // 1. Simpan hash token di IndexedDB lokal
  await db.table('settings').put({
    key: DB_SESSION_KEY,
    value: {
      tokenHash,
      expiresAt
    },
    updatedAt: new Date().toISOString()
  });

  // 2. Simpan plaintext token HANYA di sessionStorage peramban
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, rawToken);
      // Bersihkan jejak legacy timestamp LocalStorage jika ada
      localStorage.removeItem('adminLoginExpiry');
    } catch (_) {}
  }

  return rawToken;
}

/**
 * Memverifikasi keabsahan sesi Admin aktif
 */
export async function verifyAdminSession(): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  try {
    const rawToken = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawToken) {
      // Hapus sisa-sisa sesi di LocalStorage jika ada
      localStorage.removeItem('adminLoginExpiry');
      return false;
    }

    const tokenHash = await hashToken(rawToken);

    // Ambil data sesi dari IndexedDB
    const entry = await db.table('settings').get(DB_SESSION_KEY);
    if (!entry || !entry.value) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      return false;
    }

    const { tokenHash: storedHash, expiresAt } = entry.value;

    // Periksa kecocokan hash dan masa berlaku
    if (storedHash === tokenHash && Date.now() < expiresAt) {
      return true;
    }

    // Jika kadaluarsa atau hash tidak cocok: bersihkan
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    // An old tab must not revoke a newer owner's session with a different token.
    if (storedHash === tokenHash && Date.now() >= expiresAt) await db.table('settings').delete(DB_SESSION_KEY);
    return false;
  } catch (err) {
    console.error('Session verification error:', err);
    return false;
  }
}

/**
 * Mengakhiri sesi Admin (Logout)
 */
export async function destroyAdminSession(): Promise<void> {
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      localStorage.removeItem('adminLoginExpiry');
    } catch (_) {}
  }

  try {
    await db.table('settings').delete(DB_SESSION_KEY);
  } catch (_) {}
}
