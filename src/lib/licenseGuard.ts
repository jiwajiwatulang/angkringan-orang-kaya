// SakuNota License & Closed Beta Trial Guard
// Handles offline verification, monotonic clock tampering detection, and 7-day trial expiry

import { getLocalDeviceId, verifyLicenseServer } from "./ordersClient";

export interface CashierAccessStatus {
  isValid: boolean;
  isDemo: boolean;
  status: "unregistered" | "pending_approval" | "trial_active" | "trial_expired" | "paid_active" | "tester_active" | "tester_expired" | "revoked";
  licenseKey?: string;
  licenseType?: "berbayar" | "trial" | "tester";
  businessName?: string;
  expiresAt?: string | null;
  daysRemaining?: number;
  hoursRemaining?: number;
  isClockTampered?: boolean;
  error?: string;
}

export function detectClockTampering(): boolean {
  const storage = typeof window !== "undefined" ? window.localStorage : (typeof globalThis !== "undefined" && (globalThis as any).localStorage ? (globalThis as any).localStorage : null);
  if (!storage) return false;
  try {
    const now = Date.now();
    const lastSeenStr = storage.getItem("sakunota_clock_watermark");
    if (lastSeenStr) {
      const lastSeen = Number(lastSeenStr);
      // If system clock was turned back by more than 1 minute (60,000 ms)
      if (now < lastSeen - 60000) {
        return true;
      }
    }
    // Update watermark
    storage.setItem("sakunota_clock_watermark", String(now));
  } catch (_) {}
  return false;
}

export async function checkCashierAccess(forceOnlineCheck: boolean = false): Promise<CashierAccessStatus> {
  if (typeof window === "undefined") {
    return { isValid: false, isDemo: false, status: "unregistered" };
  }

  // Check Demo Mode (query param or sessionStorage)
  const isDemo = 
    (typeof window !== "undefined" && window.location.search.includes("demo=true")) ||
    (typeof sessionStorage !== "undefined" && sessionStorage.getItem("sakunota_demo_mode") === "true");

  if (isDemo) {
    return {
      isValid: true,
      isDemo: true,
      status: "trial_active",
      businessName: "Demo Warung SakuNota",
      daysRemaining: 7,
      hoursRemaining: 168,
    };
  }

  const licenseKey = localStorage.getItem("sakunota_license_key") || "";
  const token = localStorage.getItem("sakunota_activation_token") || "";
  const deviceId = getLocalDeviceId();

  if (!licenseKey) {
    return {
      isValid: false,
      isDemo: false,
      status: "unregistered",
      error: "Perangkat ini belum memiliki lisensi atau trial aktif. Silakan daftar Closed Beta atau masukkan nomor lisensi Anda.",
    };
  }

  const isClockTampered = detectClockTampering();
  const cachedType = (localStorage.getItem("sakunota_license_type") || "trial") as "berbayar" | "trial" | "tester";
  const cachedExpiresAt = localStorage.getItem("sakunota_trial_expires_at");
  const cachedBusinessName = localStorage.getItem("sakunota_business_name") || "Usaha Saya";

  // Try Online Verification if connected
  if (navigator.onLine || forceOnlineCheck) {
    try {
      const serverCheck = await verifyLicenseServer(licenseKey, deviceId, token);
      if (serverCheck.valid) {
        // Update local cache
        localStorage.setItem("sakunota_license_type", serverCheck.licenseType || "berbayar");
        if (serverCheck.expiresAt) {
          localStorage.setItem("sakunota_trial_expires_at", serverCheck.expiresAt);
        } else {
          localStorage.removeItem("sakunota_trial_expires_at");
        }
        if (serverCheck.businessName) {
          localStorage.setItem("sakunota_business_name", serverCheck.businessName);
        }

        return {
          isValid: true,
          isDemo: false,
          status: serverCheck.status,
          licenseKey,
          licenseType: serverCheck.licenseType,
          businessName: serverCheck.businessName || cachedBusinessName,
          expiresAt: serverCheck.expiresAt,
          daysRemaining: serverCheck.daysRemaining,
          hoursRemaining: serverCheck.hoursRemaining,
        };
      } else {
        // Explicit rejection from server
        return {
          isValid: false,
          isDemo: false,
          status: serverCheck.status,
          licenseKey,
          licenseType: serverCheck.licenseType,
          businessName: serverCheck.businessName || cachedBusinessName,
          expiresAt: serverCheck.expiresAt,
          error: serverCheck.error,
        };
      }
    } catch (_) {
      // Fallback to offline evaluation
    }
  }

  // --- Offline Evaluation ---
  // If user has a commercial paid license: Lifetime access offline
  if (cachedType === "berbayar") {
    return {
      isValid: true,
      isDemo: false,
      status: "paid_active",
      licenseKey,
      licenseType: "berbayar",
      businessName: cachedBusinessName,
      expiresAt: null,
    };
  }

  // If clock was turned back to bypass trial expiration
  if (isClockTampered) {
    return {
      isValid: false,
      isDemo: false,
      status: "trial_expired",
      licenseKey,
      licenseType: cachedType,
      businessName: cachedBusinessName,
      isClockTampered: true,
      error: "Manipulasi jam perangkat terdeteksi. Tanggal perangkat dimundurkan dari catatan sebelumnya. Harap sambungkan ke internet atau sesuaikan waktu perangkat.",
    };
  }

  // If trial or tester: check expiration timestamp
  if (cachedExpiresAt) {
    const expTime = new Date(cachedExpiresAt).getTime();
    const now = Date.now();
    if (now >= expTime) {
      return {
        isValid: false,
        isDemo: false,
        status: cachedType === "tester" ? "tester_expired" : "trial_expired",
        licenseKey,
        licenseType: cachedType,
        businessName: cachedBusinessName,
        expiresAt: cachedExpiresAt,
        daysRemaining: 0,
        hoursRemaining: 0,
        error: "Masa coba 7 hari telah berakhir. Akses kasir dikunci sampai lisensi resmi dibeli atau diperpanjang.",
      };
    }

    const diffMs = expTime - now;
    const hoursRemaining = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60)));
    const daysRemaining = Math.max(0, Math.floor(hoursRemaining / 24));

    return {
      isValid: true,
      isDemo: false,
      status: cachedType === "tester" ? "tester_active" : "trial_active",
      licenseKey,
      licenseType: cachedType,
      businessName: cachedBusinessName,
      expiresAt: cachedExpiresAt,
      daysRemaining,
      hoursRemaining,
    };
  }

  // If no expiresAt recorded for trial
  return {
    isValid: true,
    isDemo: false,
    status: "trial_active",
    licenseKey,
    licenseType: "trial",
    businessName: cachedBusinessName,
    daysRemaining: 7,
    hoursRemaining: 168,
  };
}
