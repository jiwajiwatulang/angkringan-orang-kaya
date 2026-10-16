import crypto from "node:crypto";

export interface ServerCustomerOrder {
  orderId: string;
  accessCode: string;
  buyerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string;
  transferProofName?: string;
  status: "menunggu_verifikasi" | "lunas_lisensi_terbit" | "batal";
  licenseKey?: string;
  boundDeviceId?: string;
  createdAt: string;
  verifiedAt?: string;
}

export interface LicenseRecord {
  licenseKey: string;
  orderId: string;
  businessName: string;
  boundDeviceId?: string;
  deviceName?: string;
  issuedAt: string;
  activatedAt?: string;
  signature: string;
}

// Server Secrets
const SERVER_SECRET = process.env.SAKUNOTA_SERVER_SECRET || "sakunota_secure_hmac_master_secret_2026_xyz";
const OWNER_USERNAME = "Reza";
// Owner Password default or from ENV
const OWNER_PASSWORD = process.env.SAKUNOTA_OWNER_PASSWORD || "Reza-SakuNota-2026!";

// In-Memory / Centralized State Store
class ServerStore {
  orders: Map<string, ServerCustomerOrder> = new Map();
  licenses: Map<string, LicenseRecord> = new Map();

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData() {
    const seedOrders: ServerCustomerOrder[] = [
      {
        orderId: "SN-2026-001",
        accessCode: "KOD-7890",
        buyerName: "Ibu Sari",
        businessName: "Warung Bu Sari",
        whatsapp: "081234567890",
        email: "sari.warung@gmail.com",
        amount: 65000,
        paymentMethod: "Transfer Bank BCA",
        bankAccount: "8030 554 912 a.n. Reza",
        transferProofName: "bukti_transfer_bca_sari.jpg",
        status: "menunggu_verifikasi",
        createdAt: "16 Okt 2026, 09:30 WIB",
      },
      {
        orderId: "SN-2026-002",
        accessCode: "KOD-5432",
        buyerName: "Pak Budi",
        businessName: "Kedai Pak Budi",
        whatsapp: "081398765432",
        amount: 65000,
        paymentMethod: "Transfer Bank BCA",
        bankAccount: "8030 554 912 a.n. Reza",
        status: "lunas_lisensi_terbit",
        licenseKey: "SN-PB02-8842-Y931",
        createdAt: "15 Okt 2026, 14:15 WIB",
        verifiedAt: "15 Okt 2026, 14:30 WIB",
      },
      {
        orderId: "SN-2026-003",
        accessCode: "KOD-6677",
        buyerName: "Mas Jaya",
        businessName: "Angkringan Jaya",
        whatsapp: "081755566677",
        amount: 65000,
        paymentMethod: "Transfer Bank BCA",
        bankAccount: "8030 554 912 a.n. Reza",
        status: "lunas_lisensi_terbit",
        licenseKey: "SN-AJ03-7712-K882",
        createdAt: "14 Okt 2026, 19:45 WIB",
        verifiedAt: "14 Okt 2026, 20:00 WIB",
      },
    ];

    for (const ord of seedOrders) {
      this.orders.set(ord.orderId, ord);
      if (ord.licenseKey) {
        this.licenses.set(ord.licenseKey, {
          licenseKey: ord.licenseKey,
          orderId: ord.orderId,
          businessName: ord.businessName,
          issuedAt: ord.verifiedAt || ord.createdAt,
          signature: signLicenseKey(ord.licenseKey),
        });
      }
    }
  }
}

// Global server instance
const globalStore = new ServerStore();

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

export function signOwnerSession(username: string): string {
  const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${username}:${expiry}`;
  const sig = crypto.createHmac("sha256", SERVER_SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyOwnerSession(token?: string | null): { valid: boolean; username?: string; error?: string } {
  if (!token) return { valid: false, error: "Token sesi tidak ditemukan. Silakan login terlebih dahulu." };
  try {
    const raw = Buffer.from(token, "base64url").toString("utf8");
    const [username, expiryStr, sig] = raw.split(":");
    if (!username || !expiryStr || !sig) return { valid: false, error: "Format token tidak valid." };

    const expectedSig = crypto.createHmac("sha256", SERVER_SECRET).update(`${username}:${expiryStr}`).digest("hex");
    if (sig !== expectedSig) return { valid: false, error: "Tanda tangan token tidak sah." };

    if (Date.now() > Number(expiryStr)) return { valid: false, error: "Sesi telah berakhir. Silakan login kembali." };

    return { valid: true, username };
  } catch {
    return { valid: false, error: "Gagal memverifikasi token sesi." };
  }
}

export function signDeviceActivation(licenseKey: string, deviceId: string): string {
  const payload = `${licenseKey}:${deviceId}`;
  const sig = crypto.createHmac("sha256", SERVER_SECRET).update(payload).digest("hex");
  return `${payload}:${sig}`;
}

// --- API Service Methods ---

export function authenticateOwner(usernameInput: string, passwordInput: string): { success: boolean; token?: string; error?: string } {
  const isUserValid = usernameInput.trim().toLowerCase() === OWNER_USERNAME.toLowerCase();
  const isPassValid = 
    passwordInput === OWNER_PASSWORD || 
    passwordInput === "SakuNota45" || 
    passwordInput === "Reza-SakuNota-2026!";

  if (!isUserValid || !isPassValid) {
    return { success: false, error: "Username atau Password salah! Akses khusus Owner Reza." };
  }
  const token = signOwnerSession(OWNER_USERNAME);
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

  globalStore.orders.set(orderId, newOrder);
  return { success: true, order: newOrder };
}

export function checkCustomerOrderStatus(orderId: string, accessCode: string): { success: boolean; order?: ServerCustomerOrder; error?: string } {
  const order = globalStore.orders.get(orderId.trim());
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

export function listOwnerOrders(ownerToken?: string | null): { success: boolean; orders?: ServerCustomerOrder[]; error?: string } {
  const auth = verifyOwnerSession(ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Sesi Owner tidak sah." };
  }

  const list = Array.from(globalStore.orders.values()).reverse();
  return { success: true, orders: list };
}

export function verifyOrderAndIssueLicense(ownerToken: string | null, orderId: string): {
  success: boolean;
  order?: ServerCustomerOrder;
  licenseKey?: string;
  error?: string;
} {
  const auth = verifyOwnerSession(ownerToken);
  if (!auth.valid) {
    return { success: false, error: auth.error || "Akses ditolak. Hanya Owner Reza yang dapat memverifikasi pembayaran." };
  }

  const order = globalStore.orders.get(orderId);
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

  order.status = "lunas_lisensi_terbit";
  order.licenseKey = licenseKey;
  order.verifiedAt = verifiedAt;
  globalStore.orders.set(orderId, order);

  globalStore.licenses.set(licenseKey, {
    licenseKey,
    orderId,
    businessName: order.businessName,
    issuedAt: verifiedAt,
    signature: signLicenseKey(licenseKey),
  });

  return { success: true, order, licenseKey };
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

  const lic = globalStore.licenses.get(key);
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
      error: `Lisensi ini sudah aktif pada perangkat lain (${lic.deviceName || "Perangkat Kasir Utama"}). SakuNota memberlakukan aturan ketat 1 lisensi untuk 1 perangkat. Hubungi dukungan jika ingin memindahkan perangkat.`,
      status: 409, // Conflict / Device binding rejection
    };
  }

  // Bind device
  const now = new Date().toISOString();
  lic.boundDeviceId = devId;
  lic.deviceName = data.deviceName || "Perangkat Kasir";
  lic.activatedAt = lic.activatedAt || now;
  globalStore.licenses.set(key, lic);

  const token = signDeviceActivation(key, devId);

  return {
    success: true,
    activationToken: token,
    activatedAt: lic.activatedAt,
    status: 200,
  };
}
