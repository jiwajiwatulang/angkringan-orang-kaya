"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export interface CustomerOrder {
  orderId: string;
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

const DEFAULT_ORDERS: CustomerOrder[] = [
  {
    orderId: "SN-2026-001",
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

export default function SakuNotaOwnerDashboardPage() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");

  // Dashboard Tabs
  const [activeTab, setActiveTab] = useState<"orders" | "customers" | "developer_mode" | "cloudflare_d1">("orders");
  const [orders, setOrders] = useState<CustomerOrder[]>(DEFAULT_ORDERS);
  const [toastMsg, setToastMsg] = useState("");

  // Check stored session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sess = sessionStorage.getItem("sakunota_owner_session");
      if (sess === "reza_authenticated") {
        setIsLoggedIn(true);
      }

      const storedOrders = localStorage.getItem("sakunota_customer_orders");
      if (storedOrders) {
        try {
          const parsed = JSON.parse(storedOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setOrders(parsed);
          }
        } catch (_) {}
      } else {
        localStorage.setItem("sakunota_customer_orders", JSON.stringify(DEFAULT_ORDERS));
      }
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (usernameInput.trim() === "Reza" && passwordInput === "SakuNota45") {
      setIsLoggedIn(true);
      sessionStorage.setItem("sakunota_owner_session", "reza_authenticated");
      setUsernameInput("");
      setPasswordInput("");
    } else {
      setLoginError("Username atau Password salah! Hanya akun owner Reza yang memiliki hak akses.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    sessionStorage.removeItem("sakunota_owner_session");
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Owner action: Verify money arrival & issue license key
  const handleVerifyAndIssueLicense = (orderId: string) => {
    const randomHex = () => Math.random().toString(36).substring(2, 6).toUpperCase();
    const newLicenseKey = `SN-${randomHex()}-${randomHex()}-${randomHex()}`;

    const updated = orders.map((o) => {
      if (o.orderId === orderId) {
        return {
          ...o,
          status: "lunas_lisensi_terbit" as const,
          licenseKey: newLicenseKey,
          verifiedAt: new Date().toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      }
      return o;
    });

    setOrders(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem("sakunota_customer_orders", JSON.stringify(updated));
    }
    showToast(`✅ Pembayaran pesanan ${orderId} diverifikasi & Lisensi ${newLicenseKey} diterbitkan!`);
  };

  const totalPembeli = 120;
  const lisensiAktif = 97;
  const penggunaAktif = 76;
  const menungguVerifikasiCount = orders.filter((o) => o.status === "menunggu_verifikasi").length;

  // 1. TAMPILAN LOGIN OWNER
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-app text-fg flex flex-col justify-center items-center p-4 selection:bg-accent selection:text-white">
        <div className="max-w-md w-full bg-surface border border-line rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex items-center justify-center text-2xl font-black mx-auto shadow-lg shadow-purple-600/30">
              👑
            </div>
            <h1 className="text-2xl font-black text-fg tracking-tight">SakuNota Owner</h1>
            <p className="text-xs text-muted">
              Masuk untuk mengelola pembeli, mutasi transfer, dan lisensi
            </p>
          </div>

          {loginError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold animate-in fade-in">
              ⚠️ {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-fg mb-1">Username Owner</label>
              <input
                type="text"
                required
                placeholder="Masukkan username (contoh: Reza)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="Masukkan password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-purple-500 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all"
            >
              Masuk ke Dashboard Owner →
            </button>
          </form>

          <div className="pt-2 text-center border-t border-line/60">
            <Link href="/" className="text-xs font-bold text-muted hover:text-fg transition-colors">
              ← Kembali ke Website SakuNota
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD RESMI OWNER (SETELAH LOGIN)
  return (
    <div className="min-h-screen bg-app text-fg flex flex-col selection:bg-accent selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md shadow-purple-600/20">
            👑
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-fg tracking-tight leading-none">
                Admin SakuNota (Owner Portal)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-black border border-purple-500/30">
                Reza (Owner)
              </span>
            </div>
            <span className="text-[10px] text-muted font-bold tracking-wider uppercase block mt-0.5">
              Kelola Pesanan Bank Transfer & Lisensi SakuNota
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <Link
            href="/"
            className="hidden sm:inline-flex px-3 py-1.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-fg border border-line transition-colors"
          >
            Website
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-black border border-rose-500/30 transition-colors"
          >
            Keluar (Logout)
          </button>
        </div>
      </header>

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-16 right-4 z-50 p-4 rounded-2xl bg-emerald-600 text-white text-xs font-bold shadow-xl animate-in fade-in duration-150">
          {toastMsg}
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-6 animate-in fade-in duration-200">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Total Pembeli</span>
            <div className="text-2xl sm:text-3xl font-black text-fg">{totalPembeli}</div>
            <span className="text-[10px] font-bold text-blue-500">+14 bulan ini</span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Lisensi Aktif</span>
            <div className="text-2xl sm:text-3xl font-black text-fg">{lisensiAktif}</div>
            <span className="text-[10px] font-bold text-emerald-500">81% dari total pembeli</span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Pengguna Aktif (30 Hari)</span>
            <div className="text-2xl sm:text-3xl font-black text-fg">{penggunaAktif}</div>
            <span className="text-[10px] font-bold text-amber-500">Terhubung saat online</span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Menunggu Pembayaran</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-500">{menungguVerifikasiCount}</div>
            <span className="text-[10px] font-bold text-rose-400">Perlu cek mutasi BCA</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line gap-2 text-xs font-bold overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "orders"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            📋 Pesanan Transfer Masuk ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "customers"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            👥 Daftar Pelanggan & Lisensi
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("developer_mode")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "developer_mode"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            🔧 Developer Mode (Khusus Reza)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("cloudflare_d1")}
            className={`px-4 py-2 rounded-xl transition-all ${
              activeTab === "cloudflare_d1"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            ☁️ Cloudflare D1 Architecture
          </button>
        </div>

        {/* TAB 1: PESANAN TRANSFER MASUK & TERBITKAN LISENSI */}
        {activeTab === "orders" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-black text-base text-fg">Verifikasi Transfer Bank Manual</h3>
              <p className="text-xs text-muted">
                Rekening Resmi: <strong>Bank BCA 8030 554 912 a.n. Reza / SakuNota Official</strong>. Periksa mutasi rekening sebelum menekan tombol terbitkan lisensi.
              </p>
            </div>

            <div className="divide-y divide-line/60">
              {orders.map((ord) => (
                <div key={ord.orderId} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-card border border-line text-accent-text">
                        {ord.orderId}
                      </span>
                      <strong className="text-sm font-black text-fg">{ord.businessName}</strong>
                      <span className="text-xs text-muted">({ord.buyerName})</span>
                    </div>

                    <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                      <span>Nominal: <strong className="text-fg font-black">Rp {ord.amount.toLocaleString("id-ID")}</strong></span>
                      <span>Metode: <strong>{ord.paymentMethod}</strong></span>
                      <span>Waktu: {ord.createdAt}</span>
                      <span>WA: <a href={`https://wa.me/62${ord.whatsapp.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">💬 {ord.whatsapp}</a></span>
                    </div>

                    {ord.licenseKey && (
                      <div className="pt-1 text-xs">
                        <span className="text-muted">Lisensi Terbit: </span>
                        <strong className="font-mono text-emerald-600 dark:text-emerald-400 font-black">{ord.licenseKey}</strong>
                        {ord.verifiedAt && <span className="text-[10px] text-muted ml-2">({ord.verifiedAt})</span>}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {ord.status === "menunggu_verifikasi" ? (
                      <button
                        type="button"
                        onClick={() => handleVerifyAndIssueLicense(ord.orderId)}
                        className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <span>✅</span>
                        <span>Verifikasi Dana Masuk & Terbitkan Lisensi</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black">
                        ✓ Lunas & Lisensi Terbit
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: DAFTAR PELANGGAN & LISENSI */}
        {activeTab === "customers" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-4">
            <h3 className="font-black text-base text-fg">Daftar Pelanggan Terdaftar</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 px-3">Nama Usaha & Pemilik</th>
                    <th className="py-2.5 px-3">WhatsApp</th>
                    <th className="py-2.5 px-3">Kode Lisensi</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {orders.map((o) => (
                    <tr key={o.orderId} className="hover:bg-card/40">
                      <td className="py-3 px-3">
                        <strong className="text-fg block">{o.businessName}</strong>
                        <span className="text-muted text-[11px]">{o.buyerName}</span>
                      </td>
                      <td className="py-3 px-3 text-emerald-600 dark:text-emerald-400 font-bold">
                        {o.whatsapp}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-fg select-all">
                        {o.licenseKey || "-"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                          o.status === "lunas_lisensi_terbit"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        }`}>
                          {o.status === "lunas_lisensi_terbit" ? "Aktif" : "Menunggu Verifikasi"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: DEVELOPER MODE (TERLINDUNGI UNTUK REZA) */}
        {activeTab === "developer_mode" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-black text-base text-fg">Developer Mode & Integritas Sistem (Khusus Owner)</h3>
              <p className="text-xs text-muted">
                Dipindahkan sepenuhnya dari menu pelanggan ke portal ini agar pemilik warung tidak terganggu istilah teknis.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-card border border-line space-y-1">
                <span className="text-[10px] text-muted font-bold uppercase block">Versi Rilis</span>
                <strong className="font-mono text-fg text-sm">v2.6.0-stable</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-line space-y-1">
                <span className="text-[10px] text-muted font-bold uppercase block">Git Build Commit</span>
                <strong className="font-mono text-accent-text text-sm">9f8c68d</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-line space-y-1">
                <span className="text-[10px] text-muted font-bold uppercase block">Database Engine</span>
                <strong className="font-mono text-fg text-sm">Dexie IndexedDB v8</strong>
              </div>
              <div className="p-3.5 rounded-2xl bg-card border border-line space-y-1">
                <span className="text-[10px] text-muted font-bold uppercase block">Integritas Transaksi</span>
                <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">100% ACID Local</strong>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-line space-y-2 text-xs">
              <span className="text-[10px] text-muted font-bold uppercase block">Aturan Privasi & Perlindungan Data Warung:</span>
              <p className="text-muted leading-relaxed">
                ✓ SakuNota tidak menyedot omzet, detail struk, atau menu makanan warung ke server luar.<br />
                ✓ Pemilik SakuNota (Reza) hanya memantau data pembeli, status lisensi perangkat, dan ping koneksi saat kasir online.<br />
                ✓ Pemindahan perangkat kasir mewajibkan verifikasi kode lisensi dan pemulihan berkas cadangan mandiri.
              </p>
            </div>
          </div>
        )}

        {/* TAB 4: CLOUDFLARE D1 ARCHITECTURE */}
        {activeTab === "cloudflare_d1" && (
          <div className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-4">
            <div>
              <h4 className="font-black text-sm text-fg">Skema Database Cloudflare D1 (Edge Serverless)</h4>
              <p className="text-xs text-muted mt-0.5">
                Struktur tabel untuk Worker API Cloudflare dalam mengelola pembeli dan validasi lisensi resmi.
              </p>
            </div>

            <pre className="p-4 rounded-2xl bg-card border border-line font-mono text-[11px] text-fg overflow-x-auto leading-relaxed">
{`-- Tabel Pembeli & Usaha
CREATE TABLE buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Lisensi Perangkat
CREATE TABLE licenses (
  license_key TEXT PRIMARY KEY,
  buyer_id TEXT REFERENCES buyers(id),
  device_fingerprint TEXT,
  status TEXT CHECK (status IN ('active', 'trial', 'expired', 'transferred')),
  app_version TEXT,
  last_ping_at DATETIME,
  activated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`}
            </pre>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-line bg-surface px-4 sm:px-8 py-6 text-xs text-muted text-center">
        Portal Manajemen Khusus Pemilik SakuNota (Reza) • Hak Akses Terlindungi.
      </footer>
    </div>
  );
}
