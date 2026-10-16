import crypto from "node:crypto";
import {
  D1Database,
  getD1,
  initD1Tables,
  insertOrderD1,
  getAllOrdersD1,
  getOrderByIdD1,
  updateOrderStatusAndLicenseD1,
  insertLicenseD1,
  getLicenseD1,
  bindLicenseToDeviceD1,
  createSessionD1,
  isSessionValidD1,
  revokeSessionD1,
  checkAuthLockD1,
  recordFailedAuthD1,
  resetAuthAttemptsD1,
  getMetricsD1,
  resetDatabaseCleanD1,
  DbCustomerOrder,
  DbLicense,
} from "./d1";

export type ServerCustomerOrder = DbCustomerOrder;
export type LicenseRecord = DbLicense;

export { getD1, initD1Tables, resetDatabaseCleanD1 };

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

// Ultra-robust Bearer token extraction that eliminates any regex spacing bugs
export function extractBearerToken(authHeader?: string | null): string {
  if (!authHeader) return "";
  const clean = authHeader.trim();
  const match = clean.match(/^Bearer\s+(.+)$/i);
  if (match) return match[1].trim();
  return clean.replace(/^Bearer\s*/i, "").trim();
}

// Database argument resolver (supports both (db, ...args) and (...args))
function isD1(arg: any): arg is D1Database {
  return arg && typeof arg === "object" && typeof arg.prepare === "function";
}

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

export async function verifyOwnerSession(
  dbOrToken: D1Database | string | null | undefined,
  maybeToken?: string | null
): Promise<{
  valid: boolean;
  username?: string;
  sessionId?: string;
  error?: string;
}> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const token = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

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

    // Check D1 database session status (revocable session)
    const valid = await isSessionValidD1(db, sessionId);
    if (!valid) {
      return { valid: false, error: "Sesi telah dicabut (logged out) atau kedaluwarsa. Silakan login kembali." };
    }

    return { valid: true, username, sessionId };
  } catch {
    return { valid: false, error: "Gagal memverifikasi token sesi." };
  }
}

export async function revokeOwnerSession(
  dbOrToken: D1Database | string | null | undefined,
  maybeToken?: string | null
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const token = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

  if (!token) return { success: false, error: "Token tidak diberikan." };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const parts = raw.split(":");
    const sessionId = parts[1];
    if (sessionId) {
      await revokeSessionD1(db, sessionId);
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

export async function authenticateOwner(
  dbOrUser: D1Database | string,
  userOrPass: string,
  passOrIp?: string,
  maybeIp?: string
): Promise<{ success: boolean; token?: string; error?: string; remainingLockSec?: number }> {
  const db = isD1(dbOrUser) ? dbOrUser : getD1();
  const usernameInput = (isD1(dbOrUser) ? userOrPass : (dbOrUser as string)) || "";
  const passwordInput = (isD1(dbOrUser) ? passOrIp : userOrPass) || "";
  const clientIp = (isD1(dbOrUser) ? maybeIp : passOrIp) || "127.0.0.1";

  // Check brute force lock in D1
  const lock = await checkAuthLockD1(db, clientIp);
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
    const failStatus = await recordFailedAuthD1(db, clientIp);
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

  // Authentication succeeded, reset failed attempts in D1
  await resetAuthAttemptsD1(db, clientIp);

  // Generate unique session in D1
  const sessionId = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  await createSessionD1(db, sessionId, OWNER_USERNAME, expiresAt);

  const token = signOwnerSession(OWNER_USERNAME, sessionId);
  return { success: true, token };
}

export async function createCustomerOrder(
  dbOrData: D1Database | { buyerName: string; businessName: string; whatsapp: string; email?: string },
  maybeData?: { buyerName: string; businessName: string; whatsapp: string; email?: string }
): Promise<{ success: boolean; order: ServerCustomerOrder }> {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : (dbOrData as any)) || {};

  const randomNum = Math.floor(100 + Math.random() * 900);
  const orderId = `SN-2026-${randomNum}`;
  const randomCode = crypto.randomBytes(3).toString("hex").toUpperCase();
  const accessCode = `KOD-${randomCode}`;

  const newOrder: ServerCustomerOrder = {
    orderId,
    accessCode,
    buyerName: (data.buyerName || "").trim(),
    businessName: (data.businessName || "").trim(),
    whatsapp: (data.whatsapp || "").trim(),
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

  await insertOrderD1(db, newOrder);
  return { success: true, order: newOrder };
}

export async function checkCustomerOrderStatus(
  dbOrOrderId: D1Database | string,
  orderIdOrCode: string,
  maybeAccessCode?: string
): Promise<{ success: boolean; order?: ServerCustomerOrder; error?: string }> {
  const db = isD1(dbOrOrderId) ? dbOrOrderId : getD1();
  const orderId = (isD1(dbOrOrderId) ? orderIdOrCode : (dbOrOrderId as string)) || "";
  const accessCode = (isD1(dbOrOrderId) ? maybeAccessCode : orderIdOrCode) || "";

  const order = await getOrderByIdD1(db, orderId.trim());
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

export async function listOwnerOrders(
  dbOrToken?: D1Database | string | null,
  maybeToken?: string | null
): Promise<{
  success: boolean;
  orders?: ServerCustomerOrder[];
  error?: string;
}> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  const list = await getAllOrdersD1(db);
  return { success: true, orders: list };
}

export async function verifyOrderAndIssueLicense(
  dbOrToken: D1Database | string | null,
  tokenOrOrderId: string | null,
  maybeOrderId?: string
): Promise<{
  success: boolean;
  order?: ServerCustomerOrder;
  licenseKey?: string;
  error?: string;
}> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrOrderId as string) : (dbOrToken as string);
  const orderId = (isD1(dbOrToken) ? maybeOrderId : tokenOrOrderId) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return {
      success: false,
      error: auth.error || "Akses ditolak. Hanya Owner Reza yang dapat memverifikasi pembayaran.",
    };
  }

  const order = await getOrderByIdD1(db, orderId);
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

  const updated = await updateOrderStatusAndLicenseD1(db, orderId, licenseKey, verifiedAt);

  await insertLicenseD1(db, {
    licenseKey,
    orderId,
    businessName: order.businessName,
    issuedAt: verifiedAt,
    signature: signLicenseKey(licenseKey),
  });

  return { success: true, order: updated || order, licenseKey };
}

export async function activateLicenseOnDevice(
  dbOrData: D1Database | { licenseKey: string; deviceId: string; deviceName?: string },
  maybeData?: { licenseKey: string; deviceId: string; deviceName?: string }
): Promise<{
  success: boolean;
  activationToken?: string;
  activatedAt?: string;
  error?: string;
  status: number;
}> {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : (dbOrData as any)) || {};

  const key = (data.licenseKey || "").trim().toUpperCase();
  const devId = (data.deviceId || "").trim();

  const lic = await getLicenseD1(db, key);
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

  // Bind device in D1
  const now = new Date().toISOString();
  const deviceName = data.deviceName || "Perangkat Kasir";
  const activatedAt = lic.activatedAt || now;

  await bindLicenseToDeviceD1(db, key, devId, deviceName, activatedAt);

  const token = signDeviceActivation(key, devId);

  return {
    success: true,
    activationToken: token,
    activatedAt,
    status: 200,
  };
}

export async function getOwnerMetrics(
  dbOrToken?: D1Database | string | null,
  maybeToken?: string | null
): Promise<{
  success: boolean;
  metrics?: {
    totalPembeli: number;
    lisensiAktif: number;
    penggunaAktif: number;
    menungguVerifikasi: number;
  };
  error?: string;
}> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak." };
  }

  const metrics = await getMetricsD1(db);
  return { success: true, metrics };
}
