import crypto from "node:crypto";
import {
  insertDbOrder,
  getAllDbOrders,
  getDbOrderById,
  updateDbOrderStatusAndLicense,
  insertDbLicense,
  getDbLicense,
  bindDbLicenseToDevice,
  createDbSession,
  isDbSessionValid,
  revokeDbSession,
  checkAuthLock,
  recordFailedAuth,
  resetAuthAttempts,
  getDbMetrics,
  DbCustomerOrder,
  DbLicense,
} from "./db";

export type ServerCustomerOrder = DbCustomerOrder;
export type LicenseRecord = DbLicense;

// Server Secrets
const SERVER_SECRET = process.env.SAKUNOTA_SERVER_SECRET || "sakunota_secure_hmac_master_secret_2026_xyz";
const OWNER_SALT = process.env.SAKUNOTA_OWNER_SALT || "sakunota_secure_owner_salt_reza_2026";
const OWNER_USERNAME = "Reza";
// Owner Password default or from ENV
const OWNER_PASSWORD = process.env.SAKUNOTA_OWNER_PASSWORD || "Reza-SakuNota-2026!";

function hashPassword(pass: string): string {
  return crypto.createHmac("sha256", OWNER_SALT).update(pass).digest("hex");
}

const OWNER_PASSWORD_HASH = hashPassword(OWNER_PASSWORD);

// --- Crypto Helpers ---

export function signLicenseKey(licenseKey: string): string {
  return crypto.createHmac("sha256", SERVER_SECRET).update(`license:${licenseKey}`).digest("hex").slice(0, 8);
}

export function generateGenuineLicenseKey(orderId: string): string {
  const hash = crypto.createHmac("sha256", SERVER_SECRET).update(`order:${orderId}:${Date.now()}`).digest("hex");
  const p1 = hash.slice(0, 4).toUpperCase();
  const p2 = hash.slice(4, 8).toUpperCase();
  const p3 = hash.slice(8, 12).toUpperCase();
  return `SN-${p1}-${p2}-${p3}`;
}

export function signOwnerSession(username: string, sessionId: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${username}:${sessionId}:${expiry}`;
  const sig = crypto.createHmac("sha256", SERVER_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyOwnerSession(token?: string | null): {
  valid: boolean;
  username?: string;
  sessionId?: string;
  error?: string;
} {
  if (!token) return { valid: false, error: "Token sesi tidak ditemukan. Silakan login terlebih dahulu." };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [username, sessionId, expiryStr, sig] = raw.split(":");
    if (!username || !sessionId || !expiryStr || !sig) {
      return { valid: false, error: "Format token tidak valid." };
    }

    const expectedSig = crypto
      .createHmac("sha256", SERVER_SECRET)
      .update(`${username}:${sessionId}:${expiryStr}`)
      .digest("hex");
    if (sig !== expectedSig) {
      return { valid: false, error: "Tanda tangan token tidak sah." };
    }

    if (Date.now() > Number(expiryStr)) {
      return { valid: false, error: "Sesi telah berakhir. Silakan login kembali." };
    }

    // Check DB session status (support revoking)
    if (!isDbSessionValid(sessionId)) {
      return { valid: false, error: "Sesi telah dicabut (logged out) atau kedaluwarsa. Silakan login kembali." };
    }

    return { valid: true, username, sessionId };
  } catch {
    return { valid: false, error: "Gagal memverifikasi token sesi." };
  }
}

export function revokeOwnerSession(token?: string | null): { success: boolean; error?: string } {
  if (!token) return { success: false, error: "Token tidak diberikan." };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(":");
    const sessionId = parts[1];
    if (sessionId) {
      revokeDbSession(sessionId);
      return { success: true };
    }
    return { success: false, error: "Session ID tidak ditemukan." };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export function signDeviceActivation(licenseKey: string, deviceId: string): string {
  const payload = `${licenseKey}:${deviceId}`;
  const sig = crypto.createHmac("sha256", SERVER_SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

// --- API Service Methods ---

export function authenticateOwner(
  usernameInput: string,
  passwordInput: string,
  clientIp: string = "127.0.0.1"
): { success: boolean; token?: string; error?: string; remainingLockSec?: number } {
  // Check brute force lock
  const lock = checkAuthLock(clientIp);
  if (lock.locked) {
    return {
      success: false,
      error: `Akses diblokir sementara karena terlalu banyak percobaan gagal. Silakan coba lagi dalam ${lock.remainingSec} detik.`,
      remainingLockSec: lock.remainingSec,
    };
  }

  const isUserValid = usernameInput.trim().toLowerCase() === OWNER_USERNAME.toLowerCase();
  const inputHash = hashPassword(passwordInput);

  let isPassValid = false;
  try {
    const bufA = Buffer.from(inputHash, "hex");
    const bufB = Buffer.from(OWNER_PASSWORD_HASH, "hex");
    if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
      isPassValid = true;
    }
  } catch {
    isPassValid = false;
  }

  if (!isUserValid || !isPassValid) {
    const failStatus = recordFailedAuth(clientIp);
    if (failStatus.locked) {
      return {
        success: false,
        error: `Akses diblokir karena 5 kali percobaan gagal. Terkunci selama ${failStatus.remainingSec} detik.`,
        remainingLockSec: failStatus.remainingSec,
      };
    }
    return {
      success: false,
      error: "Username atau Password salah! Akses khusus Owner Reza.",
    };
  }

  // Authentication succeeded, reset failed attempts
  resetAuthAttempts(clientIp);

  // Generate unique session in DB
  const sessionId = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  createDbSession(sessionId, OWNER_USERNAME, expiresAt);

  const token = signOwnerSession(OWNER_USERNAME, sessionId);
  return { success: true, token };
}

export function createCustomerOrder(data: {
  buyerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
}): { success: boolean; order: ServerCustomerOrder } {
  const randomNum = Math.floor(100 + Math.random() * 900);
  const orderId = `SN-2026-${randomNum}`;
  const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
  const accessCode = `KOD-${randomCode}`;

  const newOrder: ServerCustomerOrder = {
    orderId,
    accessCode,
    buyerName: data.buyerName.trim(),
    businessName: data.businessName.trim(),
    whatsapp: data.whatsapp.trim(),
    email: data.email?.trim() || undefined,
    amount: 65000,
    paymentMethod: "Transfer Bank BCA",
    bankAccount: "8030 554 912 a.n. Reza",
    transferProofName: "bukti_transfer_pembeli.jpg",
    status: "menunggu_verifikasi",
    createdAt: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  insertDbOrder(newOrder);
  return { success: true, order: newOrder };
}

export function checkCustomerOrderStatus(
  orderId: string,
  accessCode: string
): { success: boolean; order?: ServerCustomerOrder; error?: string } {
  const order = getDbOrderById(orderId.trim());
  if (!order) {
    return { success: false, error: "Pesanan dengan nomor tersebut tidak ditemukan." };
  }

  // Security check: Access code must match
  if (order.accessCode.trim().toUpperCase() !== accessCode.trim().toUpperCase()) {
    return {
      success: false,
      error: "Kode akses rahasia tidak cocok dengan pesanan ini. Periksa kembali tautan atau kode bukti pembelian Anda.",
    };
  }

  return { success: true, order };
}

export function listOwnerOrders(ownerToken?: string | null): {
  success: boolean;
  orders?: ServerCustomerOrder[];
  error?: string;
} {
  const auth = verifyOwnerSession(ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  const list = getAllDbOrders();
  return { success: true, orders: list };
}

export function verifyOrderAndIssueLicense(
  ownerToken: string | null,
  orderId: string
): {
  success: boolean;
  order?: ServerCustomerOrder;
  licenseKey?: string;
  error?: string;
} {
  const auth = verifyOwnerSession(ownerToken);
  if (!auth.valid) {
    return {
      success: false,
      error: auth.error || "Akses ditolak. Hanya Owner Reza yang dapat memverifikasi pembayaran.",
    };
  }

  const order = getDbOrderById(orderId);
  if (!order) {
    return { success: false, error: "Pesanan tidak ditemukan." };
  }

  if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
    return { success: true, order, licenseKey: order.licenseKey };
  }

  const licenseKey = generateGenuineLicenseKey(orderId);
  const verifiedAt = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const updated = updateDbOrderStatusAndLicense(orderId, licenseKey, verifiedAt);

  insertDbLicense({
    licenseKey,
    orderId,
    businessName: order.businessName,
    issuedAt: verifiedAt,
    signature: signLicenseKey(licenseKey),
  });

  return { success: true, order: updated || order, licenseKey };
}

export function activateLicenseOnDevice(data: {
  licenseKey: string;
  deviceId: string;
  deviceName?: string;
}): {
  success: boolean;
  activationToken?: string;
  activatedAt?: string;
  error?: string;
  status: number;
} {
  const key = data.licenseKey.trim().toUpperCase();
  const devId = data.deviceId.trim();

  const lic = getDbLicense(key);
  if (!lic) {
    return {
      success: false,
      error: "Kode lisensi tidak valid atau belum terdaftar di sistem SakuNota.",
      status: 404,
    };
  }

  // 1-Device Rule Enforcement
  if (lic.boundDeviceId && lic.boundDeviceId !== devId) {
    return {
      success: false,
      error: `Lisensi ini sudah aktif pada perangkat lain (${
        lic.deviceName || "Perangkat Kasir Utama"
      }). SakuNota memberlakukan aturan ketat 1 lisensi untuk 1 perangkat. Hubungi dukungan jika ingin memindahkan perangkat.`,
      status: 409, // Conflict / Device binding rejection
    };
  }

  // Bind device
  const now = new Date().toISOString();
  const deviceName = data.deviceName || "Perangkat Kasir";
  const activatedAt = lic.activatedAt || now;

  bindDbLicenseToDevice(key, devId, deviceName, activatedAt);

  const token = signDeviceActivation(key, devId);

  return {
    success: true,
    activationToken: token,
    activatedAt,
    status: 200,
  };
}

export function getOwnerMetrics(ownerToken?: string | null): {
  success: boolean;
  metrics?: {
    totalPembeli: number;
    lisensiAktif: number;
    penggunaAktif: number;
    menungguVerifikasi: number;
  };
  error?: string;
} {
  const auth = verifyOwnerSession(ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak." };
  }

  const metrics = getDbMetrics();
  return { success: true, metrics };
}
