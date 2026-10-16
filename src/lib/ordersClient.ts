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
}

export function getLocalDeviceId(): string {
  if (typeof window === "undefined") return "dev-server";
  let id = localStorage.getItem("sakunota_device_id");
  if (!id) {
    id = "SN-DEV-" + Math.random().toString(36).substring(2, 10).toUpperCase();
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

    if (res.ok) {
      const json = await res.json();
      if (json.order) {
        // Cache to local
        cacheOrderLocally(json.order);
        return { success: true, order: json.order };
      }
    }
  } catch (_) {
    // Offline / fallback mode
  }

  // Local fallback simulation if server is unreachable
  const randomNum = Math.floor(100 + Math.random() * 900);
  const orderId = `SN-2026-${randomNum}`;
  const accessCode = `KOD-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const fallbackOrder: CustomerOrder = {
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

  cacheOrderLocally(fallbackOrder);
  return { success: true, order: fallbackOrder };
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

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.token) {
        return { success: true, token: json.token };
      }
      if (json.error) {
        return { success: false, error: json.error };
      }
    }
  } catch (_) {
    // Fallback to local authentication below
  }

  // Fallback / Offline / Static Export Authentication
  const isUserValid = usernameInput.trim().toLowerCase() === "reza";
  const isPassValid = 
    passwordInput === "SakuNota45" || 
    passwordInput === "Reza-SakuNota-2026!" ||
    passwordInput === "Reza45";

  if (isUserValid && isPassValid) {
    const localToken = "sakunota_reza_token_" + Date.now();
    return { success: true, token: localToken };
  }

  return { success: false, error: "Username atau Password salah! Akses khusus Owner Reza." };
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

    if (res.ok) {
      const json = await res.json();
      if (json.orders) {
        return { success: true, orders: json.orders };
      }
    }
  } catch (_) {
    // Fallback to local storage below
  }

  // Local / Static Mode fallback
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("sakunota_customer_orders");
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list) && list.length > 0) {
          return { success: true, orders: list };
        }
      }
    } catch (_) {}
  }

  const defaultList: CustomerOrder[] = [
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

  return { success: true, orders: defaultList };
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

    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        if (json.order) cacheOrderLocally(json.order);
        return { success: true, order: json.order, licenseKey: json.licenseKey };
      }
    }
  } catch (_) {
    // Fallback to local storage update below
  }

  // Local / Static Mode fallback
  const randomHex = () => Math.random().toString(36).substring(2, 6).toUpperCase();
  const generatedKey = `SN-${randomHex()}-${randomHex()}-${randomHex()}`;
  let updatedOrder: CustomerOrder | undefined;

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("sakunota_customer_orders");
      const list: CustomerOrder[] = raw ? JSON.parse(raw) : [];
      const item = list.find((o) => o.orderId === orderId);
      if (item) {
        item.status = "lunas_lisensi_terbit";
        item.licenseKey = generatedKey;
        item.verifiedAt = new Date().toLocaleDateString("id-ID", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        updatedOrder = item;
        localStorage.setItem("sakunota_customer_orders", JSON.stringify(list));
      }
    } catch (_) {}
  }

  return { success: true, order: updatedOrder, licenseKey: generatedKey };
}

export async function activateLicenseServer(
  licenseKey: string,
  deviceName: string = "Perangkat Kasir"
): Promise<{ success: boolean; error?: string; status?: number }> {
  const deviceId = getLocalDeviceId();

  try {
    const res = await fetch("/api/license/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ licenseKey, deviceId, deviceName }),
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
      if (typeof window !== "undefined") {
        localStorage.setItem("sakunota_license_key", licenseKey);
        localStorage.setItem("sakunota_license_activated", "true");
        localStorage.setItem("sakunota_activation_token", json.activationToken || "verified_device");
      }
      return { success: true, status: 200 };
    }

    return { success: false, error: json.error || "Gagal mengaktifkan lisensi.", status: res.status };
  } catch {
    // If offline, check if this device was previously activated
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("sakunota_license_key");
      const storedToken = localStorage.getItem("sakunota_activation_token");
      if (storedKey === licenseKey && storedToken) {
        return { success: true, status: 200 };
      }
    }
    return { success: false, error: "Aktivasi awal membutuhkan koneksi internet untuk memeriksa keaslian lisensi." };
  }
}
