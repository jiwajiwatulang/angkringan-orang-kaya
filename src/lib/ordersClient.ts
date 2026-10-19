import { createDeviceProof } from './deviceIdentity';

export interface CustomerOrder {
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
  createdAt: string;
  verifiedAt?: string;
  boundDeviceId?: string | null;
  deviceName?: string | null;
  activatedAt?: string | null;
  lastConnectedAt?: string | null;
  lastSeenAt?: string | null;
}

export function getLocalDeviceId(): string {
  if (typeof window === "undefined") return "dev-server";
  let id = localStorage.getItem("sakunota_device_id");
  if (!id) {
    id = "SN-DEV-" + crypto.randomUUID().toUpperCase();
    localStorage.setItem("sakunota_device_id", id);
  }
  return id;
}

export async function submitBuyerOrder(data: {
  buyerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
}): Promise<{ success: boolean; order?: CustomerOrder; error?: string }> {
  try {
    const res = await fetch("/api/orders/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && json.order) {
      cacheOrderLocally(json.order);
      return { success: true, order: json.order };
    }
    return { success: false, error: json.error || "Gagal membuat pesanan di server." };
  } catch (_) {
    return { success: false, error: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda lalu coba lagi." };
  }
}

function cacheOrderLocally(order: CustomerOrder) {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("sakunota_customer_orders");
    const list: CustomerOrder[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex((o) => o.orderId === order.orderId);
    if (idx >= 0) {
      list[idx] = order;
    } else {
      list.unshift(order);
    }
    localStorage.setItem("sakunota_customer_orders", JSON.stringify(list));
  } catch (_) {}
}

export async function checkOrderStatusServer(
  orderId: string,
  accessCode: string
): Promise<{ success: boolean; order?: CustomerOrder; error?: string }> {
  try {
    const res = await fetch("/api/orders/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, accessCode }),
    });

    const json = await res.json();
    if (res.ok && json.success && json.order) {
      cacheOrderLocally(json.order);
      return { success: true, order: json.order };
    }
    return { success: false, error: json.error || "Gagal memeriksa status pesanan." };
  } catch (_) {
    // Check locally if server cannot be reached
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("sakunota_customer_orders");
        if (raw) {
          const list: CustomerOrder[] = JSON.parse(raw);
          const found = list.find((o) => o.orderId.toUpperCase() === orderId.trim().toUpperCase());
          if (found) {
            if (found.accessCode && found.accessCode.toUpperCase() !== accessCode.trim().toUpperCase()) {
              return { success: false, error: "Kode akses rahasia tidak cocok dengan pesanan ini." };
            }
            return { success: true, order: found };
          }
        }
      } catch {}
    }
    return { success: false, error: "Pesanan tidak ditemukan atau server tidak dapat dihubungi." };
  }
}

export interface OwnerMetrics {
  totalPembeli: number;
  pembayaranBerhasil?: number;
  lisensiAktif: number;
  penggunaAktif: number;
  menungguVerifikasi: number;
  menungguPembayaran?: number;
}

export async function loginOwnerServer(
  usernameInput: string,
  passwordInput: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch("/api/owner/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: usernameInput, password: passwordInput }),
    });

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success && json.token) {
      return { success: true, token: json.token };
    }
    return { success: false, error: json.error || "Username atau Password salah! Akses khusus Owner." };
  } catch (_) {
    return { success: false, error: "Tidak dapat terhubung ke server autentikasi." };
  }
}

export async function fetchOwnerOrdersServer(
  token: string
): Promise<{ success: boolean; orders?: CustomerOrder[]; error?: string }> {
  try {
    const res = await fetch("/api/owner/orders", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return { success: false, error: "Sesi Owner telah berakhir atau tidak sah. Silakan login kembali." };
    }

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.orders) {
      return { success: true, orders: json.orders };
    }
    return { success: false, error: json.error || "Gagal memuat pesanan dari server." };
  } catch (_) {
    return { success: false, error: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." };
  }
}

export async function fetchOwnerMetricsServer(
  token: string
): Promise<{ success: boolean; metrics?: OwnerMetrics; error?: string }> {
  try {
    const res = await fetch("/api/owner/metrics", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status === 401) {
      return { success: false, error: "Sesi tidak sah atau telah berakhir." };
    }

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.metrics) {
      return { success: true, metrics: json.metrics };
    }
    return { success: false, error: json.error || "Gagal memuat metrik dari server." };
  } catch (_) {
    return { success: false, error: "Tidak dapat terhubung ke server untuk memuat metrik." };
  }
}

export async function logoutOwnerServer(token: string): Promise<void> {
  try {
    await fetch("/api/owner/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (_) {}
}

export async function verifyOwnerOrderServer(
  token: string,
  orderId: string
): Promise<{ success: boolean; order?: CustomerOrder; licenseKey?: string; error?: string }> {
  try {
    const res = await fetch("/api/owner/verify", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId }),
    });

    if (res.status === 401) {
      return { success: false, error: "Akses ditolak: Hanya Owner yang terautentikasi dapat memverifikasi pembayaran." };
    }

    const json = await res.json().catch(() => ({}));
    if (res.ok && json.success) {
      if (json.order) cacheOrderLocally(json.order);
      return { success: true, order: json.order, licenseKey: json.licenseKey };
    }
    return { success: false, error: json.error || "Gagal memverifikasi pesanan di server." };
  } catch (_) {
    return { success: false, error: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." };
  }
}

export async function activateLicenseServer(
  licenseKey: string,
  deviceName: string = "Perangkat Kasir"
): Promise<{ success: boolean; error?: string; status?: number; businessName?: string }> {
  const deviceId = getLocalDeviceId();

  try {
    const token = localStorage.getItem('sakunota_activation_token') || '';
    const deviceProof = await createDeviceProof('activate', licenseKey, deviceId, token);
    const res = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, deviceId, deviceName, token, deviceProof }),
    });

    const json = await res.json();

    if (res.status === 409) {
      return {
        success: false,
        error: json.error || "Lisensi ini sudah aktif pada perangkat lain (Aturan 1 lisensi untuk 1 perangkat).",
        status: 409,
      };
    }

    if (res.ok && json.success) {
      if (!json.activationToken) return { success: false, error: 'Server tidak mengirim token aktivasi. Coba kembali saat online.' };
      if (typeof window !== "undefined") {
        localStorage.setItem("sakunota_license_key", licenseKey);
        localStorage.setItem("sakunota_license_activated", "true");
        localStorage.setItem("sakunota_activation_token", json.activationToken);
        localStorage.removeItem('sakunota_license_rejected');
        localStorage.setItem("sakunota_license_type", json.licenseType || 'berbayar');
        localStorage.setItem("sakunota_business_name", json.businessName || 'Usaha Saya');
        if (json.expiresAt) localStorage.setItem("sakunota_trial_expires_at", json.expiresAt);
        else localStorage.removeItem("sakunota_trial_expires_at");
      }
      return { success: true, status: 200, businessName: json.businessName };
    }

    return { success: false, error: json.error || "Gagal mengaktifkan lisensi.", status: res.status };
  } catch {
    return { success: false, error: "Aktivasi awal membutuhkan koneksi internet untuk memeriksa keaslian lisensi." };
  }
}

// Tester Licenses API Client
export interface TesterLicense {
  id?: number;
  licenseKey: string;
  recipientName: string;
  whatsapp: string;
  durationDays: number;
  expiresAt: string | null;
  notes: string | null;
  boundDeviceId: string | null;
  deviceName: string | null;
  createdAt: string;
  activatedAt: string | null;
  revoked: number;
}

export async function fetchTesterLicensesServer(token: string): Promise<{
  success: boolean;
  testerLicenses?: TesterLicense[];
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/tester-license", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, testerLicenses: data.testerLicenses || [] };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal memuat lisensi tester." };
  } catch {
    return { success: false, error: "Gagal terhubung ke server untuk memuat lisensi tester." };
  }
}

export async function createTesterLicenseServer(
  token: string,
  data: {
    recipientName: string;
    whatsapp: string;
    durationDays: number;
    notes?: string;
  }
): Promise<{ success: boolean; testerLicense?: TesterLicense; error?: string }> {
  try {
    const res = await fetch("/api/owner/tester-license", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const json = await res.json();
      return { success: true, testerLicense: json.testerLicense };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal membuat lisensi tester." };
  } catch {
    return { success: false, error: "Gagal terhubung ke server." };
  }
}

export async function unbindTesterLicenseServer(
  token: string,
  licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/tester-license", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "unbind", licenseKey }),
    });
    if (res.ok) {
      return { success: true };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal melepas perangkat." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export async function revokeTesterLicenseServer(
  token: string,
  licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/tester-license", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "revoke", licenseKey }),
    });
    if (res.ok) {
      return { success: true };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal mencabut lisensi." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export interface CommercialLicense {
  licenseKey: string;
  orderId: string;
  businessName: string;
  boundDeviceId?: string | null;
  deviceName?: string | null;
  issuedAt: string;
  activatedAt?: string | null;
  lastConnectedAt?: string | null;
  signature: string;
  appVersion?: string;
  activeDays?: number;
  licenseType?: "berbayar" | "tester" | "hadiah";
  revoked?: number;
}

export async function fetchOwnerLicensesServer(token: string): Promise<{
  success: boolean;
  licenses?: CommercialLicense[];
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/licenses", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, licenses: data.licenses || [] };
    }
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal memuat lisensi komersial." };
  } catch {
    return { success: false, error: "Gagal terhubung ke server." };
  }
}

export async function unbindOwnerLicenseServer(
  token: string,
  licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/licenses", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "unbind", licenseKey }),
    });
    if (res.ok) return { success: true };
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal melepas perangkat." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export async function revokeOwnerLicenseServer(
  token: string,
  licenseKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/licenses", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "revoke", licenseKey }),
    });
    if (res.ok) return { success: true };
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal mencabut lisensi." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export async function cancelOwnerOrderServer(
  token: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/orders", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "cancel", orderId }),
    });
    if (res.ok) return { success: true };
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal membatalkan pesanan." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export async function archiveOwnerOrderServer(
  token: string,
  orderId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/orders", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "archive", orderId }),
    });
    if (res.ok) return { success: true };
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal mengarsipkan pesanan." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export async function syncOwnerMidtransServer(
  token: string,
  orderId: string
): Promise<{ success: boolean; order?: any; updated?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/orders", {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action: "sync_midtrans", orderId }),
    });
    return await res.json();
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

export async function deleteOwnerTestOrderServer(
  token: string,
  orderId: string,
  auditNote?: string,
  passwordConfirm?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("/api/owner/orders", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ orderId, auditNote, passwordConfirm }),
    });
    if (res.ok) return { success: true };
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || "Gagal menghapus data uji coba." };
  } catch {
    return { success: false, error: "Gagal menghubungi server." };
  }
}

// --- Closed Beta Registration & Trial Client Operations ---

export interface BetaRegistration {
  id?: number;
  registrationId: string;
  trialLicenseKey: string;
  licenseKey?: string;
  ownerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
  status: "pending" | "disetujui" | "ditolak" | "dicabut" | "dikonversi_berbayar" | "trial_active" | "trial_expired";
  notes?: string;
  boundDeviceId?: string | null;
  deviceName?: string | null;
  registeredAt: string;
  createdAt?: string;
  approvedAt?: string | null;
  activatedAt?: string | null;
  expiresAt?: string | null;
  lastConnectedAt?: string | null;
  durationDays: number;
  rejectionReason?: string | null;
  auditLog?: string | null;
}

export async function registerBetaServer(data: {
  ownerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
  notes?: string;
  honeypot?: string;
}): Promise<{ success: boolean; registration?: BetaRegistration; error?: string }> {
  try {
    const res = await fetch("/api/beta/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mengirim pendaftaran beta." };
  }
}

export async function checkBetaStatusServer(query: string): Promise<{
  success: boolean;
  registration?: Partial<BetaRegistration>;
  error?: string;
}> {
  try {
    const res = await fetch(`/api/beta/status?q=${encodeURIComponent(query)}`);
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal memeriksa status beta." };
  }
}

export async function fetchBetaRegistrationsServer(token: string): Promise<{
  success: boolean;
  registrations?: BetaRegistration[];
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mengambil data pendaftar beta." };
  }
}

export async function approveBetaRegistrationServer(token: string, registrationId: string): Promise<{
  success: boolean;
  registration?: BetaRegistration;
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "approve", registrationId }),
    });
    const json = await res.json();
    if (json.registration && json.registration.trialLicenseKey && !json.registration.licenseKey) {
      json.registration.licenseKey = json.registration.trialLicenseKey;
    }
    return json;
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal menyetujui pendaftaran beta." };
  }
}

export async function rejectBetaRegistrationServer(token: string, registrationId: string, reason: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "reject", registrationId, reason }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal menolak pendaftaran beta." };
  }
}

export async function extendBetaTrialServer(token: string, registrationId: string, extraDays: number, reason: string): Promise<{
  success: boolean;
  newExpiresAt?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "extend", registrationId, extraDays, reason }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal memperpanjang masa trial." };
  }
}

export async function revokeBetaTrialServer(token: string, trialLicenseKey: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "revoke", trialLicenseKey, reason }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mencabut akses trial." };
  }
}

export async function unbindBetaTrialServer(token: string, trialLicenseKey: string, reason?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "unbind", trialLicenseKey, reason }),
    });
    return await res.json();
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal melepas perangkat trial." };
  }
}

export async function convertBetaTrialToPaidServer(token: string, registrationId: string): Promise<{
  success: boolean;
  commercialLicenseKey?: string;
  licenseKey?: string;
  error?: string;
}> {
  try {
    const res = await fetch("/api/owner/beta", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "convert", registrationId }),
    });
    const json = await res.json();
    if (json.success && json.commercialLicenseKey && !json.licenseKey) {
      json.licenseKey = json.commercialLicenseKey;
    }
    return json;
  } catch (e: any) {
    return { success: false, error: e.message || "Gagal mengonversi ke lisensi berbayar." };
  }
}

export async function verifyLicenseServer(licenseKey: string, deviceId: string, token?: string): Promise<{
  valid: boolean;
  status: "unregistered" | "pending_approval" | "trial_active" | "trial_expired" | "paid_active" | "tester_active" | "tester_expired" | "revoked";
  licenseType?: "berbayar" | "trial" | "tester";
  businessName?: string;
  expiresAt?: string | null;
  daysRemaining?: number;
  hoursRemaining?: number;
  error?: string;
  activationToken?: string;
}> {
  try {
    const deviceProof = await createDeviceProof('verify', licenseKey, deviceId, token || '');
    const res = await fetch("/api/license/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, deviceId, token, deviceProof }),
    });
    if (res.status >= 500 || res.status === 429) throw new Error('Server lisensi sementara tidak tersedia.');
    return await res.json();
  } catch (e: any) {
    throw new Error(e.message || "Gagal memverifikasi lisensi.");
  }
}


