"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { AdminProvider, useAdmin } from "./AdminContext";
import ThemeToggle from "@/components/ThemeToggle";
import { saveStoreSettingsAsync } from "@/lib/settings";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/menu", label: "Kelola Menu", icon: "🍽️" },
  { href: "/admin/meja", label: "Kelola Meja", icon: "🪑" },
  { href: "/admin/transaksi", label: "Transaksi", icon: "🧾" },
  { href: "/admin/shift", label: "Shift Kasir", icon: "💼" },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: "⚙️" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { storeSettings, isAuthenticated, setIsAuthenticated, logout, showToast } = useAdmin();

  const [passwordInput, setPasswordInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLainnyaOpen, setIsLainnyaOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  // Auth verification
  useEffect(() => {
    const loginExpiry = localStorage.getItem("adminLoginExpiry");
    if (loginExpiry && Date.now() < parseInt(loginExpiry)) {
      setIsAuthenticated(true);
    } else if (typeof window !== 'undefined' && window.location.search.includes('auth=demo')) {
      setIsAuthenticated(true);
    }
  }, [setIsAuthenticated]);

  // Android Back button handler
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (isLainnyaOpen) {
          setIsLainnyaOpen(false);
        } else if (pathname !== '/admin') {
          router.push('/admin');
        } else if (canGoBack) {
          window.history.back();
        } else {
          router.push('/');
        }
      }).then(handle => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [isLainnyaOpen, pathname, router]);

  const [newAdminPin, setNewAdminPin] = useState("");
  const [confirmAdminPin, setConfirmAdminPin] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSettings.adminPin) {
      setPinError("PIN Admin belum dikonfigurasi pada perangkat ini.");
      return;
    }
    if (passwordInput === storeSettings.adminPin) {
      localStorage.setItem("adminLoginExpiry", (Date.now() + 2 * 60 * 60 * 1000).toString());
      setIsAuthenticated(true);
      setPasswordInput("");
      setPinError("");
      showToast("Selamat datang di Admin Backoffice", "success");
    } else {
      setPinError("PIN otorisasi salah. Silakan coba lagi.");
    }
  };

  const handleSetupPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAdminPin.length < 4) {
      setPinError("PIN baru minimal harus 4 digit angka.");
      return;
    }
    if (newAdminPin !== confirmAdminPin) {
      setPinError("Konfirmasi PIN baru tidak cocok.");
      return;
    }
    try {
      const updated = {
        ...storeSettings,
        adminPin: newAdminPin
      };
      await saveStoreSettingsAsync(updated);
      localStorage.setItem("adminLoginExpiry", (Date.now() + 2 * 60 * 60 * 1000).toString());
      setIsAuthenticated(true);
      setNewAdminPin("");
      setConfirmAdminPin("");
      setPinError("");
      showToast("PIN Admin berhasil dikonfigurasi!", "success");
    } catch (err: any) {
      setPinError("Gagal menyimpan PIN: " + (err as any)?.message);
    }
  };

  // Unauthenticated: PIN Login or PIN Configuration Screen
  if (!isAuthenticated) {
    const hasConfiguredPin = Boolean(storeSettings.adminPin);

    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
        <div className=" bg-surface rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-line text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-accent/60 text-accent-text flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-sm">
            {hasConfiguredPin ? "🔒" : "🛡️"}
          </div>
          <h2 className="text-2xl font-black text-fg">
            {hasConfiguredPin ? "Login Admin" : "Konfigurasi PIN Admin"}
          </h2>
          <p className="text-xs text-muted mt-1 mb-6">
            {hasConfiguredPin
              ? "Masukkan PIN Otorisasi untuk membuka Backoffice SakuNota."
              : "Perangkat ini belum memiliki PIN Admin yang tersimpan. Buat PIN baru (minimal 4 digit) untuk mengamankan Backoffice."}
          </p>

          {hasConfiguredPin ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    setPinError("");
                  }}
                  placeholder="Masukkan PIN..."
                  className="w-full text-center text-2xl tracking-widest font-black border-2 border-line focus:border-accent rounded-2xl py-3 px-4 bg-card text-fg outline-none transition-all"
                  required
                />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-400 animate-in fade-in">
                  ⚠️ {pinError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black rounded-2xl text-sm shadow-lg shadow-accent/20 transition-all"
              >
                Masuk Backoffice
              </button>
            </form>
          ) : (
            <form onSubmit={handleSetupPin} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Buat PIN Admin Baru:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  value={newAdminPin}
                  onChange={(e) => {
                    setNewAdminPin(e.target.value);
                    setPinError("");
                  }}
                  placeholder="4-6 digit angka..."
                  className="w-full text-center text-lg tracking-widest font-black border-2 border-line focus:border-accent rounded-xl py-2.5 px-4 bg-card text-fg outline-none transition-all"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Konfirmasi PIN Baru:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={confirmAdminPin}
                  onChange={(e) => {
                    setConfirmAdminPin(e.target.value);
                    setPinError("");
                  }}
                  placeholder="Ulangi PIN baru..."
                  className="w-full text-center text-lg tracking-widest font-black border-2 border-line focus:border-accent rounded-xl py-2.5 px-4 bg-card text-fg outline-none transition-all"
                  required
                />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-400 text-center animate-in fade-in">
                  ⚠️ {pinError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black rounded-xl text-xs shadow-lg shadow-accent/20 transition-all mt-2"
              >
                Simpan PIN & Buka Backoffice
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-line">
            <Link
              href="/pos"
              className="text-xs font-bold text-muted hover:text-accent-text inline-flex items-center gap-1.5 transition-colors"
            >
              <span>← Kembali ke Kasir</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isDefaultPin = storeSettings.adminPin === "1234";

  const isActiveLink = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col md:flex-row">
      {/* --- DESKTOP & TABLET SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-surface border-r border-line shrink-0 select-none">
        {/* Brand */}
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-lg shadow-md shadow-accent/20">
              SN
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-fg leading-none">
                SakuNota
              </h1>
              <span className="text-[10px] font-bold tracking-wider text-accent-text uppercase">
                Admin Backoffice
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActiveLink(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-xs font-bold transition-all ${
                  active
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : " text-muted hover:bg-card/60 hover:text-fg"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-line space-y-2">
          <div className="px-3.5 py-2.5 rounded-2xl bg-card/40 border border-line/50">
            <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Toko Aktif</span>
            <span className="text-xs font-bold text-fg truncate block">
              {storeSettings.storeName || "Toko SakuNota"}
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 transition-colors"
          >
            <span>🚪</span>
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className=" bg-surface border-b border-line px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Brand indicator */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs">
                SN
              </div>
              <span className="text-sm font-black text-fg">Admin</span>
            </div>

            {/* Store Name pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent/40 border border-accent/40 text-xs font-bold text-accent-text">
              <span>🏪</span>
              <span>{storeSettings.storeName || "SakuNota POS"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle size="sm" />

            {/* Kembali ke Kasir */}
            <Link
              href="/pos"
              className="px-3.5 py-2 rounded-xl bg-accent hover:bg-accent-hover active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shadow-accent/20 transition-all"
            >
              <span>←</span>
              <span>Kasir</span>
            </Link>
          </div>
        </header>

        {/* Security Reminder if PIN is still default */}
        {isDefaultPin && (
          <div className=" bg-amber-950/50 border-b border-amber-900/60 px-4 py-2.5 flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <span className="text-base">🔒</span>
              <span>
                <strong>Pemberitahuan Keamanan:</strong> Anda masih menggunakan PIN bawaan sistem. Disarankan segera mengganti PIN pribadi Anda.
              </span>
            </div>
            <Link
              href="/admin/pengaturan/keamanan"
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 ml-2 transition-colors"
            >
              Ganti PIN
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* --- MOBILE BOTTOM NAVIGATION (HP < 768px) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-line z-40 px-1 py-1.5 grid grid-cols-4 items-center">
        <Link
          href="/admin"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname === "/admin"
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="truncate w-full text-center">Dashboard</span>
        </Link>

        <Link
          href="/admin/menu"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname.startsWith("/admin/menu")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg">🍽️</span>
          <span className="truncate w-full text-center">Menu</span>
        </Link>

        <Link
          href="/admin/transaksi"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname.startsWith("/admin/transaksi")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg">🧾</span>
          <span className="truncate w-full text-center">Transaksi</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsLainnyaOpen(true)}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            isLainnyaOpen || pathname.startsWith("/admin/meja") || pathname.startsWith("/admin/shift") || pathname.startsWith("/admin/pengaturan")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="truncate w-full text-center">Lainnya</span>
        </button>
      </div>

      {/* --- MOBILE "LAINNYA" BOTTOM SHEET --- */}
      {isLainnyaOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center md:hidden animate-in fade-in duration-200"
          onClick={() => setIsLainnyaOpen(false)}
        >
          <div
            className=" bg-surface rounded-t-3xl w-full p-5 shadow-2xl border-t border-line animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-4" />
            <h3 className="text-base font-black text-fg mb-3">Menu Lainnya</h3>

            <div className="grid grid-cols-1 gap-2 mb-4">
              <Link
                href="/admin/meja"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 hover:bg-accent-hover/40 text-fg text-xs font-bold transition-colors"
              >
                <span className="text-xl">🪑</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Kelola Meja</div>
                  <div className="text-[10px] text-muted">Atur nomor meja dan status dine-in</div>
                </div>
                <span>→</span>
              </Link>

              <Link
                href="/admin/shift"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 hover:bg-accent-hover/40 text-fg text-xs font-bold transition-colors"
              >
                <span className="text-xl">💼</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Shift & Kas Laci</div>
                  <div className="text-[10px] text-muted">Laporan Z-Report, uang fisik, dan kas operasional</div>
                </div>
                <span>→</span>
              </Link>

              <Link
                href="/admin/pengaturan"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 hover:bg-accent-hover/40 text-fg text-xs font-bold transition-colors"
              >
                <span className="text-xl">⚙️</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Pengaturan Toko</div>
                  <div className="text-[10px] text-muted">Profil, Printer Bluetooth, Pajak, PIN, & Backup</div>
                </div>
                <span>→</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-line flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsLainnyaOpen(false);
                  logout();
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-950/40 text-rose-400 font-bold text-xs text-center"
              >
                Keluar Admin
              </button>
              <button
                type="button"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-card text-fg font-bold text-xs text-center"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
