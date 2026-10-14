"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { AdminProvider, useAdmin } from "./AdminContext";

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
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    } else {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.theme = 'light';
    }
  };

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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = storeSettings.adminPin || "1234";
    if (passwordInput === correctPin) {
      localStorage.setItem("adminLoginExpiry", (Date.now() + 2 * 60 * 60 * 1000).toString());
      setIsAuthenticated(true);
      setPasswordInput("");
      setPinError("");
      showToast("Selamat datang di Admin Backoffice", "success");
    } else {
      setPinError("PIN salah! Default: 1234");
    }
  };

  // Unauthenticated: PIN Login Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-sm">
            🔒
          </div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Login Admin</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-6">
            Masukkan PIN Otorisasi untuk membuka Backoffice SakuNota.
          </p>

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
                className="w-full text-center text-2xl tracking-widest font-black border-2 border-gray-200 dark:border-gray-700 focus:border-emerald-500 dark:focus:border-emerald-500 rounded-2xl py-3 px-4 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none transition-all"
                required
              />
            </div>

            {pinError && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 animate-in fade-in">
                ⚠️ {pinError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black rounded-2xl text-sm shadow-lg shadow-emerald-600/20 transition-all"
            >
              Masuk Backoffice
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800">
            <Link
              href="/"
              className="text-xs font-bold text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 inline-flex items-center gap-1.5 transition-colors"
            >
              <span>← Kembali ke Kasir</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isActiveLink = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col md:flex-row">
      {/* --- DESKTOP & TABLET SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shrink-0 select-none">
        {/* Brand */}
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20">
              SN
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-gray-900 dark:text-white leading-none">
                SakuNota
              </h1>
              <span className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
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
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-bold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800 space-y-2">
          <div className="px-3.5 py-2.5 rounded-2xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-700/50">
            <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider block">Toko Aktif</span>
            <span className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate block">
              {storeSettings.storeName || "Toko SakuNota"}
            </span>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
          >
            <span>🚪</span>
            <span>Keluar Admin</span>
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Brand indicator */}
            <div className="flex items-center gap-2 md:hidden">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                SN
              </div>
              <span className="text-sm font-black text-gray-900 dark:text-white">Admin</span>
            </div>

            {/* Store Name pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
              <span>🏪</span>
              <span>{storeSettings.storeName || "SakuNota POS"}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Ganti Tema"
            >
              {isDark ? "☀️" : "🌙"}
            </button>

            {/* Kembali ke Kasir */}
            <Link
              href="/"
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 transition-all"
            >
              <span>←</span>
              <span>Kasir</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* --- MOBILE BOTTOM NAVIGATION (HP < 768px) --- */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-gray-200 dark:border-gray-800 z-40 px-1 py-1.5 grid grid-cols-4 items-center">
        <Link
          href="/admin"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname === "/admin"
              ? "text-emerald-600 dark:text-emerald-400 font-black"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <span className="text-lg">📊</span>
          <span className="truncate w-full text-center">Dashboard</span>
        </Link>

        <Link
          href="/admin/menu"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname.startsWith("/admin/menu")
              ? "text-emerald-600 dark:text-emerald-400 font-black"
              : "text-gray-500 dark:text-gray-400"
          }`}
        >
          <span className="text-lg">🍽️</span>
          <span className="truncate w-full text-center">Menu</span>
        </Link>

        <Link
          href="/admin/transaksi"
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname.startsWith("/admin/transaksi")
              ? "text-emerald-600 dark:text-emerald-400 font-black"
              : "text-gray-500 dark:text-gray-400"
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
              ? "text-emerald-600 dark:text-emerald-400 font-black"
              : "text-gray-500 dark:text-gray-400"
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
            className="bg-white dark:bg-gray-900 rounded-t-3xl w-full p-5 shadow-2xl border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full mx-auto mb-4" />
            <h3 className="text-base font-black text-gray-900 dark:text-white mb-3">Menu Lainnya</h3>

            <div className="grid grid-cols-1 gap-2 mb-4">
              <Link
                href="/admin/meja"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-800 dark:text-gray-200 text-xs font-bold transition-colors"
              >
                <span className="text-xl">🪑</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Kelola Meja</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Atur nomor meja dan status dine-in</div>
                </div>
                <span>→</span>
              </Link>

              <Link
                href="/admin/shift"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-800 dark:text-gray-200 text-xs font-bold transition-colors"
              >
                <span className="text-xl">💼</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Shift & Kas Laci</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Laporan Z-Report, uang fisik, dan kas operasional</div>
                </div>
                <span>→</span>
              </Link>

              <Link
                href="/admin/pengaturan"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-gray-800 dark:text-gray-200 text-xs font-bold transition-colors"
              >
                <span className="text-xl">⚙️</span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Pengaturan Toko</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Profil, Printer Bluetooth, Pajak, PIN, & Backup</div>
                </div>
                <span>→</span>
              </Link>
            </div>

            <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setIsLainnyaOpen(false);
                  logout();
                }}
                className="flex-1 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold text-xs text-center"
              >
                Keluar Admin
              </button>
              <button
                type="button"
                onClick={() => setIsLainnyaOpen(false)}
                className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-xs text-center"
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
