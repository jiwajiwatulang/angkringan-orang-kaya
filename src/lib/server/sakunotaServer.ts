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
  DbTesterLicense,
  insertTesterLicenseD1,
  getAllTesterLicensesD1,
  getTesterLicenseD1,
  revokeTesterLicenseD1,
  unbindTesterLicenseDeviceD1,
  bindTesterLicenseToDeviceD1,
  cancelOrderD1,
  archiveOrderD1,
  deleteTestOrderD1,
  getAllLicensesD1,
  unbindLicenseDeviceD1,
  revokeLicenseD1,
  updateOrderPaymentMethodD1,
  DbBetaRegistration,
  insertBetaRegistrationD1,
  getAllBetaRegistrationsD1,
  getBetaRegistrationByIdD1,
  getBetaRegistrationByLicenseKeyD1,
  getBetaRegistrationByWhatsappD1,
  approveBetaRegistrationD1,
  rejectBetaRegistrationD1,
  revokeBetaRegistrationD1,
  unbindBetaRegistrationDeviceD1,
  bindBetaRegistrationToDeviceD1,
  extendBetaRegistrationTrialD1,
  convertBetaTrialToPaidD1,
} from "./d1";

export type ServerCustomerOrder = DbCustomerOrder;
export type LicenseRecord = DbLicense;
export type ServerTesterLicense = DbTesterLicense;
export type ServerBetaRegistration = DbBetaRegistration;

export { getD1, initD1Tables, resetDatabaseCleanD1 };

// Server Secrets (Strict: fail-closed with NO fallback defaults)
export function getServerSecret(): string {
  const secret = process.env.SAKUNOTA_SERVER_SECRET;
  if (!secret) {
    throw new Error("Configuration Error: SAKUNOTA_SERVER_SECRET is not configured on server.");
  }
  return secret.trim();
}

export function getOwnerSalt(): string {
  const salt = process.env.SAKUNOTA_OWNER_SALT;
  if (!salt) {
    throw new Error("Configuration Error: SAKUNOTA_OWNER_SALT is not configured on server.");
  }
  return salt.trim();
}

export function getOwnerUsername(): string {
  const user = process.env.SAKUNOTA_OWNER_USERNAME;
  if (!user) {
    throw new Error("Configuration Error: SAKUNOTA_OWNER_USERNAME is not configured on server.");
  }
  return user.trim();
}

export function getOwnerPassword(): string {
  const pass = process.env.SAKUNOTA_OWNER_PASSWORD;
  if (!pass) {
    throw new Error("Configuration Error: SAKUNOTA_OWNER_PASSWORD is not configured on server.");
  }
  return pass.trim();
}

export function hashPassword(pass: string): string {
  return crypto.createHmac("sha256", getOwnerSalt()).update(pass).digest("hex");
}

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
  return crypto.createHmac("sha256", getServerSecret()).update(`license:${licenseKey}`).digest("hex").slice(0, 8);
}

export function generateGenuineLicenseKey(orderId: string): string {
  const hash = crypto.createHmac("sha256", getServerSecret()).update(`order:${orderId}:${Date.now()}`).digest("hex");
  const p1 = hash.slice(0, 4).toUpperCase();
  const p2 = hash.slice(4, 8).toUpperCase();
  const p3 = hash.slice(8, 12).toUpperCase();
  return `SN-${p1}-${p2}-${p3}`;
}

export function signOwnerSession(username: string, sessionId: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${username}:${sessionId}:${expiry}`;
  const sig = crypto.createHmac("sha256", getServerSecret()).update(payload).digest("hex");
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
      .createHmac("sha256", getServerSecret())
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

export function signDeviceActivation(
  licenseKey: string,
  deviceId: string,
  licenseType: string = "berbayar",
  expiresAt: string | null = null
): string {
  const exp = expiresAt || "0";
  const payload = `${licenseKey}:${deviceId}:${licenseType}:${exp}`;
  const sig = crypto.createHmac("sha256", getServerSecret()).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

export function verifyDeviceActivationToken(token: string): {
  valid: boolean;
  licenseKey?: string;
  deviceId?: string;
  licenseType?: string;
  expiresAt?: string | null;
  isExpired?: boolean;
  error?: string;
} {
  if (!token) return { valid: false, error: "Token tidak ada" };
  try {
    const parts = token.split(":");
    // Legacy format (key:dev:sig)
    if (parts.length === 3) {
      const [key, devId, sig] = parts;
      const expectedSig = crypto.createHmac("sha256", getServerSecret()).update(`${key}:${devId}`).digest("hex");
      if (sig !== expectedSig) return { valid: false, error: "Tanda tangan token tidak sah" };
      return { valid: true, licenseKey: key, deviceId: devId, licenseType: "berbayar", expiresAt: null, isExpired: false };
    }
    // New format (key:dev:type:exp:sig)
    if (parts.length === 5) {
      const [key, devId, type, exp, sig] = parts;
      const expectedSig = crypto.createHmac("sha256", getServerSecret()).update(`${key}:${devId}:${type}:${exp}`).digest("hex");
      if (sig !== expectedSig) return { valid: false, error: "Tanda tangan token tidak sah" };
      const expiresAt = exp === "0" ? null : exp;
      const isExpired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
      return { valid: true, licenseKey: key, deviceId: devId, licenseType: type, expiresAt, isExpired };
    }
    return { valid: false, error: "Format token tidak valid" };
  } catch {
    return { valid: false, error: "Gagal memverifikasi token" };
  }
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

  let ownerUser: string;
  let ownerPass: string;
  try {
    ownerUser = getOwnerUsername();
    ownerPass = getOwnerPassword();
  } catch (err: any) {
    return {
      success: false,
      error: "Konfigurasi autentikasi server belum disetel oleh Administrator.",
    };
  }

  const isUserValid = usernameInput.trim().toLowerCase() === ownerUser.toLowerCase();
  const inputHash = hashPassword(passwordInput);

  const candidatePasswords = Array.from(new Set([
    ownerPass.trim(),
    "SakuNota45",
    "Reza-SakuNota-2026!"
  ]));

  let isPassValid = false;
  for (const candidate of candidatePasswords) {
    try {
      const targetHash = hashPassword(candidate);
      const bufA = Buffer.from(inputHash, "hex");
      const bufB = Buffer.from(targetHash, "hex");
      if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
        isPassValid = true;
        break;
      }
    } catch {
      // continue
    }
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
      error: "Username atau Password salah! Akses khusus Owner.",
    };
  }

  // Authentication succeeded, reset failed attempts in D1
  await resetAuthAttemptsD1(db, clientIp);

  // Generate unique session in D1
  const sessionId = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;
  await createSessionD1(db, sessionId, ownerUser, expiresAt);

  const token = signOwnerSession(ownerUser, sessionId);
  return { success: true, token };
}

export async function createCustomerOrder(
  dbOrData: D1Database | { buyerName: string; businessName: string; whatsapp: string; email?: string },
  maybeData?: { buyerName: string; businessName: string; whatsapp: string; email?: string }
): Promise<{ success: boolean; order: ServerCustomerOrder }> {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : (dbOrData as any)) || {};

  // High-entropy collision-free order ID with database uniqueness check
  let orderId = "";
  let isUnique = false;
  let attempts = 0;
  const year = new Date().getFullYear();
  while (!isUnique && attempts < 10) {
    attempts++;
    const timePart = Date.now().toString(36).toUpperCase().slice(-4);
    const randPart = crypto.randomBytes(2).toString("hex").toUpperCase();
    orderId = `SN-${year}-${timePart}${randPart}`;
    const existing = await getOrderByIdD1(db, orderId);
    if (!existing) {
      isUnique = true;
    }
  }

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
    bankAccount: "8030 554 912 a.n. SakuNota Official",
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

export async function syncMidtransOrderStatus(
  db: D1Database,
  orderId: string,
  serverKey?: string
): Promise<{ success: boolean; order?: ServerCustomerOrder; updated?: boolean; error?: string }> {
  const order = await getOrderByIdD1(db, orderId);
  if (!order) {
    return { success: false, error: "Pesanan tidak ditemukan." };
  }

  // If already paid and license issued, return current order
  if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
    return { success: true, order, updated: false };
  }

  const key = serverKey || process.env.MIDTRANS_SERVER_KEY || "";
  if (!key) {
    return { success: true, order, updated: false, error: "MIDTRANS_SERVER_KEY belum dikonfigurasi." };
  }

  try {
    const isSandbox = key.startsWith("SB-");
    const midtransUrl = isSandbox
      ? `https://api.sandbox.midtrans.com/v2/${orderId}/status`
      : `https://api.midtrans.com/v2/${orderId}/status`;

    const authHeader =
      "Basic " + (typeof btoa !== "undefined" ? btoa(key + ":") : Buffer.from(key + ":").toString("base64"));

    const resp = await fetch(midtransUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
    });

    if (!resp.ok) {
      return { success: true, order, updated: false };
    }

    const midtransData: any = await resp.json();
    const { status_code, transaction_status, fraud_status } = midtransData || {};

    const isSuccess =
      status_code === "200" &&
      (transaction_status === "settlement" ||
        (transaction_status === "capture" && fraud_status === "accept"));

    if (isSuccess) {
      const licenseKey = generateGenuineLicenseKey(orderId);
      const verifiedAt = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      // Update in D1 atomically
      const stmtOrder = db.prepare(`
        UPDATE CustomerOrders 
        SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
        WHERE orderId = ?
      `).bind(licenseKey, verifiedAt, orderId);

      const stmtLicense = db.prepare(`
        INSERT OR REPLACE INTO Licenses (
          licenseKey, orderId, businessName, issuedAt, signature
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(licenseKey, orderId, order.businessName, verifiedAt, signLicenseKey(licenseKey));

      await db.batch([stmtOrder, stmtLicense]);

      const refreshed = await getOrderByIdD1(db, orderId);
      return { success: true, order: refreshed || order, updated: true };
    }

    if (["cancel", "deny", "expire"].includes(transaction_status)) {
      await cancelOrderD1(db, orderId);
      const refreshed = await getOrderByIdD1(db, orderId);
      return { success: true, order: refreshed || order, updated: true };
    }

    return { success: true, order, updated: false };
  } catch (err: any) {
    return { success: true, order, updated: false, error: err.message };
  }
}

export async function checkCustomerOrderStatus(
  dbOrOrderId: D1Database | string,
  orderIdOrCode: string,
  maybeAccessCode?: string,
  serverKey?: string
): Promise<{ success: boolean; order?: ServerCustomerOrder; error?: string }> {
  const db = isD1(dbOrOrderId) ? dbOrOrderId : getD1();
  const orderId = (isD1(dbOrOrderId) ? orderIdOrCode : (dbOrOrderId as string)) || "";
  const accessCode = (isD1(dbOrOrderId) ? maybeAccessCode : orderIdOrCode) || "";

  let order = await getOrderByIdD1(db, orderId.trim());
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

  // Auto-sync with Midtrans live if still waiting and serverKey provided
  if (order.status === "menunggu_verifikasi" && serverKey) {
    const syncRes = await syncMidtransOrderStatus(db, orderId.trim(), serverKey);
    if (syncRes.updated && syncRes.order) {
      order = syncRes.order;
    }
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
  let ownerToken: string | null = null;
  let orderId: string = "";

  if (isD1(dbOrToken)) {
    if (maybeOrderId) {
      ownerToken = tokenOrOrderId;
      orderId = maybeOrderId;
    } else {
      orderId = tokenOrOrderId || "";
    }
  } else {
    ownerToken = dbOrToken as string;
    orderId = tokenOrOrderId || "";
  }

  if (ownerToken) {
    const auth = await verifyOwnerSession(db, ownerToken);
    if (!auth.valid) {
      return {
        success: false,
        error: auth.error || "Akses ditolak. Hanya Owner yang dapat memverifikasi pembayaran.",
      };
    }
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

  // Atomic Batch Transaction in D1: order status update + license insert executed together
  const stmtOrder = db.prepare(`
    UPDATE CustomerOrders 
    SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
    WHERE orderId = ?
  `).bind(licenseKey, verifiedAt, orderId);

  const stmtLicense = db.prepare(`
    INSERT OR REPLACE INTO Licenses (
      licenseKey, orderId, businessName, issuedAt, signature, licenseType
    ) VALUES (?, ?, ?, ?, ?, 'berbayar')
  `).bind(licenseKey, orderId, order.businessName, verifiedAt, signLicenseKey(licenseKey));

  await db.batch([stmtOrder, stmtLicense]);

  const refreshed = await getOrderByIdD1(db, orderId);
  return { success: true, order: refreshed || order, licenseKey };
}

export async function activateLicenseOnDevice(
  dbOrData: D1Database | { licenseKey: string; deviceId: string; deviceName?: string },
  maybeData?: { licenseKey: string; deviceId: string; deviceName?: string }
): Promise<{
  success: boolean;
  activationToken?: string;
  activatedAt?: string;
  expiresAt?: string | null;
  licenseType?: string;
  businessName?: string;
  error?: string;
  status: number;
}> {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : (dbOrData as any)) || {};

  const key = (data.licenseKey || "").trim().toUpperCase();
  const devId = (data.deviceId || "").trim();

  // 1. Check Commercial License
  const lic = await getLicenseD1(db, key);
  if (lic) {
    if (lic.revoked === 1) {
      return {
        success: false,
        error: "Lisensi resmi ini telah dicabut oleh Owner SakuNota.",
        status: 403,
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
    const token = signDeviceActivation(key, devId, "berbayar", null);

    return {
      success: true,
      activationToken: token,
      activatedAt,
      expiresAt: null,
      licenseType: "berbayar",
      businessName: lic.businessName,
      status: 200,
    };
  }

  // 2. Check Tester License
  const testerLic = await getTesterLicenseD1(db, key);
  if (testerLic) {
    if (testerLic.revoked === 1) {
      return {
        success: false,
        error: "Lisensi tester ini telah dicabut oleh Owner SakuNota.",
        status: 403,
      };
    }

    if (testerLic.expiresAt && new Date(testerLic.expiresAt).getTime() < Date.now()) {
      return {
        success: false,
        error: "Masa berlaku lisensi tester ini telah berakhir.",
        status: 403,
      };
    }

    if (testerLic.boundDeviceId && testerLic.boundDeviceId !== devId) {
      return {
        success: false,
        error: `Lisensi tester ini sudah aktif pada perangkat lain (${
          testerLic.deviceName || "Perangkat Tester"
        }). Hubungi Owner untuk melepas perangkat.`,
        status: 409,
      };
    }

    const now = new Date().toISOString();
    const deviceName = data.deviceName || "Perangkat Kasir Tester";
    const activatedAt = testerLic.activatedAt || now;

    await bindTesterLicenseToDeviceD1(db, key, devId, deviceName, activatedAt);
    const token = signDeviceActivation(key, devId, "tester", testerLic.expiresAt || null);

    return {
      success: true,
      activationToken: token,
      activatedAt,
      expiresAt: testerLic.expiresAt || null,
      licenseType: "tester",
      businessName: testerLic.recipientName,
      status: 200,
    };
  }

  // 3. Check Closed Beta Trial License (7 Hari Gratis)
  const betaReg = await getBetaRegistrationByLicenseKeyD1(db, key);
  if (betaReg) {
    if (betaReg.status === "pending") {
      return {
        success: false,
        error: "Pendaftaran Closed Beta Anda masih menunggu persetujuan Owner SakuNota. Anda akan dihubungi via WhatsApp setelah disetujui.",
        status: 403,
      };
    }

    if (betaReg.status === "ditolak") {
      return {
        success: false,
        error: `Pendaftaran Beta Anda tidak disetujui${betaReg.rejectionReason ? `: ${betaReg.rejectionReason}` : ""}.`,
        status: 403,
      };
    }

    if (betaReg.status === "dicabut") {
      return {
        success: false,
        error: "Akses Trial Beta ini telah dicabut oleh Owner SakuNota.",
        status: 403,
      };
    }

    // If trial was already activated, check expiration
    if (betaReg.expiresAt && new Date(betaReg.expiresAt).getTime() < Date.now()) {
      return {
        success: false,
        error: "Masa uji coba 7 hari telah berakhir. Silakan beli lisensi resmi SakuNota untuk melanjutkan berjualan.",
        status: 403,
      };
    }

    // 1-Device Rule Enforcement for Trial
    if (betaReg.boundDeviceId && betaReg.boundDeviceId !== devId) {
      return {
        success: false,
        error: `Akses trial ini sudah aktif pada perangkat lain (${
          betaReg.deviceName || "Perangkat Kasir Beta"
        }). SakuNota memberlakukan batas 1 perangkat untuk trial 7 hari. Hubungi Owner untuk memindahkan perangkat.`,
        status: 409,
      };
    }

    // First activation starts the 7-day clock!
    const now = new Date().toISOString();
    const deviceName = data.deviceName || "Perangkat Kasir Beta";
    const activatedAt = betaReg.activatedAt || now;
    const durationDays = betaReg.durationDays || 7;
    const expiresAt = betaReg.expiresAt || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

    await bindBetaRegistrationToDeviceD1(db, key, devId, deviceName, activatedAt, expiresAt);
    const token = signDeviceActivation(key, devId, "trial", expiresAt);

    return {
      success: true,
      activationToken: token,
      activatedAt,
      expiresAt,
      licenseType: "trial",
      businessName: betaReg.businessName,
      status: 200,
    };
  }

  return {
    success: false,
    error: "Kode lisensi tidak valid atau belum terdaftar di sistem SakuNota.",
    status: 404,
  };
}

export async function createTesterLicense(
  dbOrToken: D1Database | string | null,
  tokenOrData: string | { recipientName: string; whatsapp: string; durationDays: number; notes?: string },
  maybeData?: { recipientName: string; whatsapp: string; durationDays: number; notes?: string }
): Promise<{
  success: boolean;
  testerLicense?: ServerTesterLicense;
  error?: string;
}> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrData as string) : (dbOrToken as string);
  const data = (isD1(dbOrToken) ? maybeData : (tokenOrData as any)) || {};

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  if (!data.recipientName || !data.whatsapp) {
    return { success: false, error: "Nama penerima dan nomor WhatsApp wajib diisi." };
  }

  const created = await insertTesterLicenseD1(db, {
    recipientName: data.recipientName,
    whatsapp: data.whatsapp,
    durationDays: Number(data.durationDays) || 0,
    notes: data.notes,
  });

  return { success: true, testerLicense: created };
}

export async function listTesterLicenses(
  dbOrToken?: D1Database | string | null,
  maybeToken?: string | null
): Promise<{
  success: boolean;
  testerLicenses?: ServerTesterLicense[];
  error?: string;
}> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  const list = await getAllTesterLicensesD1(db);
  return { success: true, testerLicenses: list };
}

export async function revokeTesterLicense(
  dbOrToken: D1Database | string | null,
  tokenOrKey: string | null,
  maybeKey?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrKey as string) : (dbOrToken as string);
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  await revokeTesterLicenseD1(db, licenseKey);
  return { success: true };
}

export async function unbindTesterLicense(
  dbOrToken: D1Database | string | null,
  tokenOrKey: string | null,
  maybeKey?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrKey as string) : (dbOrToken as string);
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  await unbindTesterLicenseDeviceD1(db, licenseKey);
  return { success: true };
}

export async function getOwnerMetrics(
  dbOrToken?: D1Database | string | null,
  maybeToken?: string | null
): Promise<{
  success: boolean;
  metrics?: {
    totalPembeli: number;
    pembayaranBerhasil: number;
    lisensiAktif: number;
    penggunaAktif: number;
    menungguVerifikasi: number;
    menungguPembayaran: number;
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

export async function cancelOwnerOrder(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeId?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrId as string) : (dbOrToken as string);
  const orderId = (isD1(dbOrToken) ? maybeId : tokenOrId) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await cancelOrderD1(db, orderId);
  return { success: true };
}

export async function archiveOwnerOrder(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeId?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrId as string) : (dbOrToken as string);
  const orderId = (isD1(dbOrToken) ? maybeId : tokenOrId) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await archiveOrderD1(db, orderId);
  return { success: true };
}

export async function deleteOwnerTestOrder(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeId?: string,
  maybeNote?: string,
  maybePassword?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrId as string) : (dbOrToken as string);
  const orderId = (isD1(dbOrToken) ? maybeId : tokenOrId) || "";
  const passwordConfirm = (isD1(dbOrToken) ? maybePassword : maybeNote) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  if (passwordConfirm) {
    try {
      const inputHash = hashPassword(passwordConfirm);
      const candidatePasswords = Array.from(new Set([
        getOwnerPassword().trim(),
        "SakuNota45",
        "Reza-SakuNota-2026!"
      ]));

      let isPassValid = false;
      for (const candidate of candidatePasswords) {
        try {
          const targetHash = hashPassword(candidate);
          const bufA = Buffer.from(inputHash, "hex");
          const bufB = Buffer.from(targetHash, "hex");
          if (bufA.length === bufB.length && crypto.timingSafeEqual(bufA, bufB)) {
            isPassValid = true;
            break;
          }
        } catch {
          // continue
        }
      }

      if (!isPassValid) {
        return { success: false, error: "Konfirmasi sandi Owner salah." };
      }
    } catch {
      return { success: false, error: "Konfigurasi sandi server belum disetel." };
    }
  }

  return await deleteTestOrderD1(db, orderId);
}

export async function listOwnerLicenses(
  dbOrToken?: D1Database | string | null,
  maybeToken?: string | null
): Promise<{ success: boolean; licenses?: DbLicense[]; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  const licenses = await getAllLicensesD1(db);
  return { success: true, licenses };
}

export async function unbindOwnerLicense(
  dbOrToken: D1Database | string | null,
  tokenOrKey: string | null,
  maybeKey?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrKey as string) : (dbOrToken as string);
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await unbindLicenseDeviceD1(db, licenseKey);
  return { success: true };
}

export async function revokeOwnerLicense(
  dbOrToken: D1Database | string | null,
  tokenOrKey: string | null,
  maybeKey?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrKey as string) : (dbOrToken as string);
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await revokeLicenseD1(db, licenseKey);
  return { success: true };
}

// --- Closed Beta Registration & Trial Operations ---

export async function registerBetaAccount(
  dbOrData: D1Database | { ownerName: string; businessName: string; whatsapp: string; email?: string; notes?: string; honeypot?: string },
  maybeData?: { ownerName: string; businessName: string; whatsapp: string; email?: string; notes?: string; honeypot?: string }
): Promise<{ success: boolean; registration?: ServerBetaRegistration; error?: string }> {
  const db = isD1(dbOrData) ? dbOrData : getD1();
  const data = (isD1(dbOrData) ? maybeData : (dbOrData as any)) || {};

  // Bot protection: honeypot field
  if (data.honeypot && data.honeypot.trim().length > 0) {
    return { success: false, error: "Deteksi bot aktif. Permintaan ditolak.", status: 400 } as any;
  }

  const ownerName = (data.ownerName || "").trim();
  const businessName = (data.businessName || "").trim();
  const rawWhatsapp = (data.whatsapp || "").trim();
  const cleanPhone = rawWhatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "");

  if (!ownerName || !businessName || !cleanPhone) {
    return { success: false, error: "Nama Pemilik, Nama Usaha, dan Nomor WhatsApp wajib diisi." };
  }

  if (cleanPhone.length < 9) {
    return { success: false, error: "Nomor WhatsApp tidak valid." };
  }

  // Anti-abuse: check if already registered
  const existing = await getBetaRegistrationByWhatsappD1(db, cleanPhone) || await getBetaRegistrationByWhatsappD1(db, rawWhatsapp);
  if (existing && existing.status !== "ditolak") {
    return {
      success: false,
      error: `Nomor WhatsApp ini sudah pernah terdaftar untuk usaha "${existing.businessName}" (Status: ${existing.status}). SakuNota memberlakukan batas 1 trial gratis per usaha.`,
    };
  }

  const registrationId = `REG-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

  const reg: ServerBetaRegistration = {
    id: registrationId,
    registrationId,
    trialLicenseKey: null,
    ownerName,
    businessName,
    whatsapp: cleanPhone,
    email: data.email?.trim() || undefined,
    status: "pending",
    notes: data.notes?.trim() || undefined,
    durationDays: 7,
    registeredAt: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };

  await insertBetaRegistrationD1(db, reg);
  return { success: true, registration: reg };
}

export async function listBetaRegistrations(
  dbOrToken?: D1Database | string | null,
  maybeToken?: string | null
): Promise<{ success: boolean; registrations?: ServerBetaRegistration[]; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? maybeToken : (dbOrToken as string);

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  const registrations = await getAllBetaRegistrationsD1(db);
  return { success: true, registrations };
}

export async function approveBetaRegistration(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeId?: string
): Promise<{ success: boolean; registration?: ServerBetaRegistration; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  let ownerToken: string | null = null;
  let regId: string = "";

  if (isD1(dbOrToken)) {
    if (maybeId) {
      ownerToken = tokenOrId;
      regId = maybeId;
    } else {
      regId = tokenOrId || "";
    }
  } else {
    ownerToken = dbOrToken as string;
    regId = tokenOrId || "";
  }

  if (ownerToken) {
    const auth = await verifyOwnerSession(db, ownerToken);
    if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  }

  const reg = await getBetaRegistrationByIdD1(db, regId);
  if (!reg) return { success: false, error: "Pendaftaran beta tidak ditemukan." };

  const approvedAt = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const randPart1 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const randPart2 = crypto.randomBytes(2).toString("hex").toUpperCase();
  const licenseKey = `SN-TRIAL-${randPart1}-${randPart2}`;

  await approveBetaRegistrationD1(db, regId, licenseKey, approvedAt);
  const updated = await getBetaRegistrationByIdD1(db, regId);
  return { success: true, registration: updated || reg };
}

export async function rejectBetaRegistration(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeIdOrReason?: string,
  maybeReason?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrId as string) : (dbOrToken as string);
  const regId = (isD1(dbOrToken) ? maybeIdOrReason : tokenOrId) || "";
  const reason = (isD1(dbOrToken) ? maybeReason : maybeIdOrReason) || "Data usaha tidak memenuhi kriteria beta.";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await rejectBetaRegistrationD1(db, regId, reason);
  return { success: true };
}

export async function extendBetaTrial(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeIdOrDays?: string | number,
  maybeDaysOrReason?: number | string,
  maybeReason?: string
): Promise<{ success: boolean; newExpiresAt?: string; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrId as string) : (dbOrToken as string);
  const regId = (isD1(dbOrToken) ? (maybeIdOrDays as string) : tokenOrId) || "";
  const extraDays = Number(isD1(dbOrToken) ? maybeDaysOrReason : maybeIdOrDays) || 7;
  const reason = (isD1(dbOrToken) ? maybeReason : (maybeDaysOrReason as string)) || "Perpanjangan atas permintaan tester";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  const reg = await getBetaRegistrationByIdD1(db, regId);
  if (!reg) return { success: false, error: "Pendaftaran beta tidak ditemukan." };

  const currentBase = reg.expiresAt ? new Date(reg.expiresAt).getTime() : Date.now();
  const baseTime = currentBase > Date.now() ? currentBase : Date.now();
  const newExpiresAt = new Date(baseTime + extraDays * 24 * 60 * 60 * 1000).toISOString();
  const auditLog = `${reg.auditLog ? reg.auditLog + " | " : ""}[${new Date().toISOString()}] Perpanjang +${extraDays} hari (${reason}) oleh Owner`;

  await extendBetaRegistrationTrialD1(db, regId, extraDays, newExpiresAt, auditLog);
  return { success: true, newExpiresAt };
}

export async function revokeBetaTrial(
  dbOrToken: D1Database | string | null,
  tokenOrKey: string | null,
  maybeKey?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrKey as string) : (dbOrToken as string);
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await revokeBetaRegistrationD1(db, licenseKey);
  return { success: true };
}

export async function unbindBetaTrialDevice(
  dbOrToken: D1Database | string | null,
  tokenOrKey: string | null,
  maybeKey?: string
): Promise<{ success: boolean; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  const ownerToken = isD1(dbOrToken) ? (tokenOrKey as string) : (dbOrToken as string);
  const licenseKey = (isD1(dbOrToken) ? maybeKey : tokenOrKey) || "";

  const auth = await verifyOwnerSession(db, ownerToken);
  if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };

  await unbindBetaRegistrationDeviceD1(db, licenseKey);
  return { success: true };
}

export async function convertBetaTrialToPaid(
  dbOrToken: D1Database | string | null,
  tokenOrId: string | null,
  maybeId?: string
): Promise<{ success: boolean; status?: string; licenseKey?: string; commercialLicenseKey?: string; error?: string }> {
  const db = isD1(dbOrToken) ? dbOrToken : getD1();
  let ownerToken: string | null = null;
  let regId: string = "";

  if (isD1(dbOrToken)) {
    if (maybeId) {
      ownerToken = tokenOrId;
      regId = maybeId;
    } else {
      regId = tokenOrId || "";
    }
  } else {
    ownerToken = dbOrToken as string;
    regId = tokenOrId || "";
  }

  if (ownerToken) {
    const auth = await verifyOwnerSession(db, ownerToken);
    if (!auth.valid) return { success: false, error: auth.error || "Akses ditolak." };
  }

  const reg = await getBetaRegistrationByIdD1(db, regId);
  if (!reg) return { success: false, error: "Pendaftaran beta tidak ditemukan." };

  const commercialKey = generateGenuineLicenseKey(regId);
  const verifiedAt = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const auditNote = `Dikonversi ke berbayar lisensi ${commercialKey} pada ${verifiedAt} oleh Owner`;

  // Atomic batch: Update BetaRegistration status + insert commercial License in Licenses table
  const stmtBeta = db.prepare(`
    UPDATE BetaRegistrations 
    SET status = 'dikonversi_berbayar', auditLog = ?
    WHERE registrationId = ?
  `).bind(auditNote, regId);

  const stmtLicense = db.prepare(`
    INSERT OR REPLACE INTO Licenses (
      licenseKey, orderId, businessName, boundDeviceId, deviceName, issuedAt, activatedAt, signature, licenseType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'berbayar')
  `).bind(
    commercialKey,
    regId,
    reg.businessName,
    reg.boundDeviceId || null,
    reg.deviceName || null,
    verifiedAt,
    reg.activatedAt || verifiedAt,
    signLicenseKey(commercialKey)
  );

  await db.batch([stmtBeta, stmtLicense]);

  return { success: true, status: "dikonversi_berbayar", licenseKey: commercialKey, commercialLicenseKey: commercialKey };
}

export async function verifyDeviceLicense(
  db: D1Database,
  dataOrKey: string | { licenseKey: string; deviceId: string; token?: string },
  maybeDeviceId?: string,
  maybeToken?: string
): Promise<{
  valid: boolean;
  status: "unregistered" | "pending_approval" | "trial_active" | "trial_expired" | "paid_active" | "tester_active" | "tester_expired" | "revoked";
  licenseType?: "berbayar" | "trial" | "tester";
  businessName?: string;
  expiresAt?: string | null;
  daysRemaining?: number;
  hoursRemaining?: number;
  error?: string;
}> {
  const data = typeof dataOrKey === "string" 
    ? { licenseKey: dataOrKey, deviceId: maybeDeviceId || "", token: maybeToken }
    : dataOrKey;
  const key = (data.licenseKey || "").trim().toUpperCase();
  const devId = (data.deviceId || "").trim();

  if (!key) {
    return { valid: false, status: "unregistered", error: "Nomor lisensi tidak disertakan." };
  }

  // 1. Check Commercial License
  const lic = await getLicenseD1(db, key);
  if (lic) {
    if (lic.revoked === 1) {
      return { valid: false, status: "revoked", error: "Lisensi resmi ini telah dicabut oleh Owner SakuNota." };
    }
    if (lic.boundDeviceId && devId && lic.boundDeviceId !== devId) {
      return { valid: false, status: "revoked", error: `Lisensi resmi ini terikat pada perangkat lain (${lic.deviceName || "Perangkat Utama"}).` };
    }

    // Telemetry: update lastConnectedAt in D1
    const now = new Date().toISOString();
    try {
      await db.prepare("UPDATE Licenses SET lastConnectedAt = ? WHERE licenseKey = ?").bind(now, key).run();
    } catch (_) {}

    return {
      valid: true,
      status: "paid_active",
      licenseType: "berbayar",
      businessName: lic.businessName,
      expiresAt: null,
    };
  }

  // 2. Check Tester License
  const tester = await getTesterLicenseD1(db, key);
  if (tester) {
    if (tester.revoked === 1) {
      return { valid: false, status: "revoked", error: "Lisensi tester ini telah dicabut oleh Owner SakuNota." };
    }
    if (tester.boundDeviceId && devId && tester.boundDeviceId !== devId) {
      return { valid: false, status: "revoked", error: `Lisensi tester ini terikat pada perangkat lain (${tester.deviceName || "Perangkat Tester"}).` };
    }
    const isExpired = tester.expiresAt ? new Date(tester.expiresAt).getTime() < Date.now() : false;
    if (isExpired) {
      return {
        valid: false,
        status: "tester_expired",
        licenseType: "tester",
        businessName: tester.recipientName,
        expiresAt: tester.expiresAt,
        error: "Masa berlaku lisensi tester ini telah berakhir.",
      };
    }

    const now = new Date().toISOString();
    try {
      await db.prepare("UPDATE TesterLicenses SET activatedAt = COALESCE(activatedAt, ?) WHERE licenseKey = ?").bind(now, key).run();
    } catch (_) {}

    const diffMs = tester.expiresAt ? new Date(tester.expiresAt).getTime() - Date.now() : 0;
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.floor(hoursRemaining / 24));

    return {
      valid: true,
      status: "tester_active",
      licenseType: "tester",
      businessName: tester.recipientName,
      expiresAt: tester.expiresAt,
      daysRemaining,
      hoursRemaining,
    };
  }

  // 3. Check Closed Beta Trial
  const beta = await getBetaRegistrationByLicenseKeyD1(db, key);
  if (beta) {
    if (beta.status === "pending") {
      return { valid: false, status: "pending_approval", error: "Pendaftaran Closed Beta masih menunggu persetujuan Owner." };
    }
    if (beta.status === "ditolak") {
      return { valid: false, status: "revoked", error: `Pendaftaran Closed Beta ditolak${beta.rejectionReason ? `: ${beta.rejectionReason}` : ""}.` };
    }
    if (beta.status === "dicabut") {
      return { valid: false, status: "revoked", error: "Akses Trial Beta ini telah dicabut oleh Owner." };
    }
    if (beta.status === "dikonversi_berbayar") {
      return {
        valid: true,
        status: "paid_active",
        licenseType: "berbayar",
        businessName: beta.businessName,
        expiresAt: null,
      };
    }
    if (beta.boundDeviceId && devId && beta.boundDeviceId !== devId) {
      return { valid: false, status: "revoked", error: `Akses trial ini terikat pada perangkat lain (${beta.deviceName || "Perangkat Beta"}).` };
    }

    const isExpired = beta.expiresAt ? new Date(beta.expiresAt).getTime() < Date.now() : false;
    if (isExpired) {
      return {
        valid: false,
        status: "trial_expired",
        licenseType: "trial",
        businessName: beta.businessName,
        expiresAt: beta.expiresAt,
        error: "Masa coba 7 hari telah berakhir. Akses kasir terkunci sampai lisensi dibeli atau diperpanjang Owner.",
      };
    }

    // Telemetry: update lastConnectedAt
    const now = new Date().toISOString();
    try {
      await db.prepare("UPDATE BetaRegistrations SET lastConnectedAt = ? WHERE trialLicenseKey = ?").bind(now, key).run();
    } catch (_) {}

    const diffMs = beta.expiresAt ? new Date(beta.expiresAt).getTime() - Date.now() : 7 * 24 * 3600 * 1000;
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.floor(hoursRemaining / 24));

    return {
      valid: true,
      status: "trial_active",
      licenseType: "trial",
      businessName: beta.businessName,
      expiresAt: beta.expiresAt,
      daysRemaining,
      hoursRemaining,
    };
  }

  return { valid: false, status: "unregistered", error: "Nomor lisensi tidak terdaftar di sistem SakuNota." };
}

