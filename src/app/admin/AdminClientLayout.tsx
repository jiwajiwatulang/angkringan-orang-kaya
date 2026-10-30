"use client";
import {supportsKitchen} from '@/lib/operations';
import {StoreSyncNotice} from "@/components/StoreSyncNotice";
import {requestSettingsNavigation,ADMIN_BACK_EVENT} from "@/lib/adminNavigation";
import LockIcon from "@/components/LockIcon";

import { isDemoMode, preserveDemoUrl, demoSessionValid } from "@/lib/demoMode";
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { AdminProvider, useAdmin } from "./AdminContext";
import ThemeToggle from "@/components/ThemeToggle";
import LineIcon from "@/components/LineIcon";
import { saveStoreSettingsAsync, isTableManagementEnabled } from "@/lib/settings";
import { generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } from "@/lib/recovery";
import { createAdminSession, verifyAdminSession, destroyAdminSession } from "@/lib/session";
import { db } from "@/lib/dexie";
import {adminNavigationHref} from "@/lib/adminNavigation";
import { verifyMerchantPin } from "@/lib/merchantAccess";
import { checkCashierAccess, CashierAccessStatus } from "@/lib/licenseGuard";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "chart" },
  { href: "/pos", label: "Kasir & Menu", icon: "cashier" },
  { href: "/admin/meja", label: "Kelola Meja", icon: "tables" },
  { href: "/admin/transaksi", label: "Riwayat Transaksi", icon: "receipt" },
  { href: "/admin/karyawan", label: "Karyawan & Shift", icon: "shift" },
  { href: "/admin/pelayan", label: "Waiter Floor", icon: "table" },
  { href: "/admin/menu", label: "Katalog & Stok", icon: "catalog" },
  { href: "/admin/dapur", label: "Pesanan Dapur", icon: "food" },
  { href: "/admin/pengaturan", label: "Pengaturan POS", icon: "settings" },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { storeSettings, isAuthenticated, setIsAuthenticated, logout, showToast } = useAdmin();

  const [passwordInput, setPasswordInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isLainnyaOpen, setIsLainnyaOpen] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const navigationHref=(href:string)=>adminNavigationHref(href,isDemo);
  const keepDashboard=(event:React.MouseEvent<HTMLAnchorElement>)=>{
    if(!requestSettingsNavigation(event))return;
    if(pathname==='/admin'&&new URL(window.location.href).searchParams.get('view')!=='reports'&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();preserveDemoUrl();}
  };
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<CashierAccessStatus | null>(null);

  useEffect(() => {
    checkCashierAccess().then(setLicenseStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sakunota_admin_sidebar_collapsed");
      if (saved === "true") {
        setIsSidebarCollapsed(true);
      }
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        localStorage.setItem("sakunota_admin_sidebar_collapsed", String(next));
      }
      return next;
    });
  };

  useEffect(() => { preserveDemoUrl(); }, [pathname]);

  useEffect(() => {
    const recheck = async () => {
      if (db.name === 'SakuNotaDemoDB') { if (!demoSessionValid()) setIsAuthenticated(false); return; }
      if (!(await verifyAdminSession())) setIsAuthenticated(false);
    };
    window.addEventListener('focus', recheck);
    document.addEventListener('visibilitychange', recheck);
    const timer = window.setInterval(recheck, 30000);
    return () => { window.removeEventListener('focus', recheck); document.removeEventListener('visibilitychange', recheck); clearInterval(timer); };
  }, [setIsAuthenticated]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
    if (typeof window !== "undefined") {
      const demoFlag =
        isDemoMode();
      setIsDemo(demoFlag);
      if (demoFlag && demoSessionValid()) {
        setIsAuthenticated(true);
      }
    }
  }, [setIsAuthenticated]);

  // Auth verification menggunakan sesi kriptografis aman (IndexedDB + sessionStorage)
  useEffect(() => {
    preserveDemoUrl();
    const wantsDemo = isDemoMode();
    if (wantsDemo !== (db.name === 'SakuNotaDemoDB')) { window.location.reload(); return; }
    verifyAdminSession().then((isValid) => {
      setIsAuthenticated(db.name === 'SakuNotaDemoDB' ? demoSessionValid() : isValid);
    }).catch(() => setIsAuthenticated(false)).finally(() => setIsAuthReady(true));
  }, [setIsAuthenticated]);

  // Android Back button handler
  useEffect(() => {
    let removeListener: any;
    let cancelled=false;
    try {
      App.addListener('backButton', ({ canGoBack }) => {
        if (isLainnyaOpen) {
          setIsLainnyaOpen(false);
        } else if (!window.dispatchEvent(new Event(ADMIN_BACK_EVENT,{cancelable:true}))) {
          return;
        } else if (pathname !== '/admin') {
          router.push(adminNavigationHref('/admin',isDemo));
        } else if (canGoBack) {
          window.history.back();
        } else {
          router.push('/');
        }
      }).then(handle => {
        if(cancelled)void handle.remove();else removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      cancelled=true;
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [isLainnyaOpen, pathname, router, isDemo]);

  const [authView, setAuthView] = useState<"login" | "verify_recovery" | "reset_pin" | "setup_initial">("login");
  const [recoveryCodeInput, setRecoveryCodeInput] = useState("");
  const [newAdminPin, setNewAdminPin] = useState("");
  const [confirmAdminPin, setConfirmAdminPin] = useState("");
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [acknowledgedCode, setAcknowledgedCode] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Sinkronisasi tampilan autentikasi berdasarkan ketersediaan kredensial lokal
  useEffect(() => {
    if (!isAuthenticated) {
      if (storeSettings.adminPin) {
        setAuthView("login");
      } else if (storeSettings.recoveryCodeHash) {
        // Toko yang sudah memiliki data & recovery code tetapi kehilangan PIN -> WAJIB verifikasi Recovery Code
        setAuthView("verify_recovery");
      } else {
        // Toko/perangkat baru bersih atau perangkat baru setelah restore cadangan -> Setup PIN awal mandiri
        setAuthView("setup_initial");
      }
    }
  }, [storeSettings.adminPin, storeSettings.recoveryCodeHash, isAuthenticated]);

  const handleKeypadPress = (val: string) => {
    setPinError("");
    if (val === "C") {
      setPasswordInput("");
    } else if (val === "BACK") {
      setPasswordInput((prev) => prev.slice(0, -1));
    } else {
      if (passwordInput.length < 12) {
        setPasswordInput((prev) => (prev + val).replace(/\D/g, ""));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeSettings.adminPin) {
      setPinError("PIN Admin belum dikonfigurasi pada perangkat ini.");
      return;
    }
    let pinValid = false;
    try { pinValid = await verifyMerchantPin(passwordInput); }
    catch (error) { setPinError((error as Error).message); return; }
    if (pinValid) {
      try {
        await createAdminSession();
        setIsAuthenticated(true);
        setPasswordInput("");
        setPinError("");
        showToast("Selamat datang di Admin Backoffice", "success");
      } catch (err: any) {
        setPinError("Gagal membuat sesi aman: " + err.message);
      }
    } else {
      setPinError("PIN otorisasi salah. Silakan coba lagi.");
    }
  };

  // Verifikasi Kode Pemulihan Pemilik Toko
  const handleVerifyRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    // Cek cooldown brute-force lockout
    if (storeSettings.recoveryLockedUntil) {
      const lockTime = new Date(storeSettings.recoveryLockedUntil).getTime();
      if (lockTime > Date.now()) {
        const remainingMins = Math.ceil((lockTime - Date.now()) / 60000);
        setPinError(`Pemulihan dikunci sementara. Silakan coba lagi dalam ${remainingMins} menit.`);
        return;
      }
    }

    // PRINSIP FAIL-CLOSED: Tolak reset jika hash tidak ditemukan pada toko yang aktif
    if (!storeSettings.recoveryCodeHash) {
      setPinError("Kredensial pemulihan tidak ditemukan pada perangkat ini. Reset PIN ditolak demi keamanan data usaha Anda. Silakan hubungi dukungan resmi SakuNota dengan bukti lisensi usaha.");
      return;
    }

    const isValid = await verifyRecoveryCode(recoveryCodeInput, storeSettings.recoveryCodeHash);
    if (isValid) {
      const updated = {
        ...storeSettings,
        failedRecoveryAttempts: 0,
        recoveryLockedUntil: ""
      };
      await saveStoreSettingsAsync(updated);
      setRecoveryCodeInput("");
      setPinError("");
      setAuthView("reset_pin");
      showToast("Kode Pemulihan terverifikasi! Silakan buat PIN baru.", "info");
    } else {
      const attempts = (storeSettings.failedRecoveryAttempts || 0) + 1;
      let lockedUntil = "";
      let errorMsg = `Kode Pemulihan salah! Sisa percobaan: ${Math.max(0, 5 - attempts)} kali.`;

      if (attempts >= 5) {
        lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        errorMsg = "Kode salah 5 kali berturut-turut! Pemulihan dikunci selama 15 menit.";
      }

      const updated = {
        ...storeSettings,
        failedRecoveryAttempts: attempts,
        recoveryLockedUntil: lockedUntil
      };
      await saveStoreSettingsAsync(updated);
      setPinError(errorMsg);
    }
  };

  // Simpan PIN Baru & Generate Recovery Code Baru
  const handleSaveNewPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemo) {
      setNewAdminPin("");
      setConfirmAdminPin("");
      setPinError("");
      setIsAuthenticated(true);
      showToast("Mode Demo: Pengaturan PIN hanya simulasi dan tidak disimpan.", "info");
      return;
    }
    if (newAdminPin.length < 4) {
      setPinError("PIN baru minimal harus 4 digit angka.");
      return;
    }
    if (newAdminPin !== confirmAdminPin) {
      setPinError("Konfirmasi PIN baru tidak cocok.");
      return;
    }

    try {
      // Buat Kode Pemulihan Pemilik Baru (kode lama langsung hangus)
      const freshRecoveryCode = generateRecoveryCode();
      const freshHash = await hashRecoveryCode(freshRecoveryCode);

      const updated = {
        ...storeSettings,
        adminPin: newAdminPin,
        recoveryCodeHash: freshHash,
        failedRecoveryAttempts: 0,
        recoveryLockedUntil: ""
      };
      await saveStoreSettingsAsync(updated);

      setNewAdminPin("");
      setConfirmAdminPin("");
      setPinError("");
      setRevealedCode(freshRecoveryCode);
      setAcknowledgedCode(false);
      setCodeCopied(false);
    } catch (err: any) {
      setPinError("Gagal menyimpan PIN: " + (err as any)?.message);
    }
  };

  const handleFinishRecoverySetup = async () => {
    if (!acknowledgedCode) return;
    try {
      await createAdminSession();
      setIsAuthenticated(true);
      setRevealedCode(null);
      showToast("Kredensial keamanan berhasil disimpan!", "success");
    } catch (err: any) {
      setPinError("Gagal mengaktifkan sesi aman: " + err.message);
    }
  };

  // Unauthenticated: PIN Login / Pemulihan Pemilik / Konfigurasi Awal
  if (!isAuthReady) return <div className="min-h-screen flex items-center justify-center bg-app text-muted" role="status">Menyiapkan Admin SakuNota…</div>;
  if (isDemo && !demoSessionValid()) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-1">
            <LineIcon name="info" className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-xl font-black text-fg">Sesi Demo Selesai</h2>
            <p className="text-xs text-muted leading-relaxed mt-1">
              Waktu simulasi mode demo 30 menit telah berakhir. Silakan keluar dari demo untuk kembali ke beranda atau beli lisensi resmi untuk penggunaan usaha.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="button"
              onClick={() => {
                ["sakunota_demo_mode", "sakunota_demo_initialized", "sakunota_demo_started_at"].forEach((k) =>
                  sessionStorage.removeItem(k)
                );
                window.location.assign("/");
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Keluar Mode Demo</span>
              <span>→</span>
            </button>

            <Link
              href="/?beli=true"
              className="w-full py-3 px-4 rounded-2xl bg-card hover:bg-line border border-line text-fg font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Beli Lisensi Resmi (Rp50.000)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isDemo && licenseStatus && !licenseStatus.isValid) {
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
        <div className="bg-surface border border-line rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center mx-auto mb-1">
            <LockIcon />
          </div>
          <div>
            <h2 className="text-xl font-black text-fg">Akses Admin Memerlukan Lisensi</h2>
            <p className="text-xs text-muted leading-relaxed mt-1">
              Perangkat ini belum memiliki lisensi berbayar, tester, atau masa uji coba aktif. Silakan aktivasi lisensi resmi untuk membuka Backoffice.
            </p>
          </div>

          <div className="pt-2 space-y-2">
            <Link
              href={navigationHref("/pos")}
              className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>Aktivasi Kode Lisensi di Kasir</span>
              <span>→</span>
            </Link>

            <Link
              href="/pos?demo=true"
              className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Buka Demo Kasir (Simulasi 30 Menit)</span>
            </Link>

            <Link
              href="/"
              className="w-full py-2.5 text-xs text-muted hover:text-fg font-bold block"
            >
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // 1. MODAL TAMPILKAN RECOVERY CODE BARU KEPADA PEMILIK
    if (revealedCode) {
      return (
        <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
          <div className=" bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-accent text-center animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-lg shadow-accent/20"><LineIcon name="info" /></div>
            <h2 className="text-xl font-black text-fg">Simpan Kode Pemulihan Anda!</h2>
            <p className="text-xs text-muted mt-1 mb-5">
              Kode ini adalah <strong>satu-satunya kunci</strong> untuk mereset PIN Admin Anda secara offline jika lupa PIN atau data PIN terhapus.
            </p>

            {/* Kotak Kode Pemulihan */}
            <div className="bg-card p-4 rounded-2xl border-2 border-dashed border-accent mb-4 select-all">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">
                Kode Pemulihan Pemilik (Offline):
              </span>
              <div className="text-2xl font-black font-mono text-accent-text tracking-widest py-1">
                {revealedCode}
              </div>
            </div>

            <div className="flex justify-center mb-5">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(revealedCode);
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 3000);
                }}
                className="px-4 py-2 rounded-xl bg-card border border-line text-xs font-bold text-fg hover:border-accent flex items-center gap-2 transition-all"
              >
                <span>{codeCopied ? "Berhasil Disalin" : " Salin Kode"}</span>
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-left text-xs text-amber-950 mb-5 space-y-1">
              <p className="font-bold"> Perhatian Penting:</p>
              <p className="text-[11px] text-amber-900 leading-relaxed font-medium">
                Catat kode ini di buku catatan atau simpan di chat WhatsApp pribadi Anda. Kode ini <strong>tidak disimpan dalam bentuk teks</strong> di aplikasi dan tidak disertakan dalam file cadangan demi privasi.
              </p>
            </div>

            {/* Checkbox Konfirmasi */}
            <label className="flex items-start gap-2.5 text-left text-xs text-fg font-bold mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledgedCode}
                onChange={(e) => setAcknowledgedCode(e.target.checked)}
                className="mt-0.5 rounded border-line text-accent focus:ring-accent"
              />
              <span>Saya sudah mencatat dan menyimpan Kode Pemulihan ini di tempat yang aman.</span>
            </label>

            <button
              type="button"
              disabled={!acknowledgedCode}
              onClick={handleFinishRecoverySetup}
              className={`w-full py-3.5 font-black rounded-2xl text-xs transition-all shadow-lg ${
                acknowledgedCode
                  ? "bg-accent hover:bg-accent-hover text-white active:scale-95 shadow-accent/20 cursor-pointer"
                  : "bg-line text-muted cursor-not-allowed"
              }`}
            >Selesai & Buka Backoffice 
            </button>
          </div>
        </div>
      );
    }

    // 2. TAMPILAN LOGIN / VERIFIKASI / RESET PIN
    return (
      <div className="min-h-screen bg-app flex flex-col items-center justify-center p-4">
        <div className=" bg-surface rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-line text-center animate-in zoom-in-95 duration-200">
          <div className="w-16 h-16 rounded-2xl bg-accent/60 text-accent-text flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-sm">
            <LockIcon />
          </div>

          <h2 className="text-2xl font-black text-fg">
            {authView === "login" && "Login Admin"}
            {authView === "verify_recovery" && "Verifikasi Pemilik Toko"}
            {authView === "reset_pin" && "Buat PIN Admin Baru"}
            {authView === "setup_initial" && "Buat PIN Admin"}
          </h2>

          <p className="text-xs text-muted mt-1 mb-6">
            {authView === "login" && "Masukkan PIN Admin untuk melanjutkan."}
            {authView === "verify_recovery" && "PIN tidak ditemukan atau lupa. Masukkan Kode Pemulihan Pemilik untuk memverifikasi hak akses."}
            {authView === "reset_pin" && "Pemilik terverifikasi. Silakan tentukan PIN Admin baru untuk perangkat ini."}
            {authView === "setup_initial" && "Perangkat ini belum memiliki PIN Admin. Buat PIN baru (minimal 4 digit) untuk melindungi pengaturan toko."}
          </p>

          {authView === "login" && storeSettings.adminPin === "1234" && (
            <div role="note" className="mb-4 rounded-2xl border border-blue-200 bg-blue-50/90 p-3.5 text-left shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Lisensi Baru / PIN Default</span>
                <span className="rounded-md bg-blue-600 px-2 py-0.5 text-xs font-black tracking-widest text-white">1234</span>
              </div>
              <p className="mt-1.5 text-xs font-medium leading-relaxed text-blue-900">
                Toko atau lisensi baru menggunakan password default <strong>1234</strong>. Masukkan pada keypad angka di bawah, lalu ganti PIN melalui Pengaturan Keamanan.
              </p>
            </div>
          )}
          {/* FORM 1: NORMAL LOGIN DENGAN KEYPAD */}
          {authView === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="relative">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoFocus
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value.replace(/\D/g, ""));
                    setPinError("");
                  }}
                  aria-label="PIN Admin"
                  placeholder="••••"
                  className="w-full text-center text-3xl tracking-widest font-black border-2 border-line focus:border-accent rounded-2xl py-3 px-4 bg-card text-fg outline-none transition-all shadow-inner"
                  required
                />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-700 animate-in fade-in">
                  <LineIcon name="info" />{pinError}
                </p>
              )}

              {/* Modern Numeric Keypad */}
              <div className="grid grid-cols-3 gap-2 pt-1" role="group" aria-label="Keypad PIN">
                {[
                  "1", "2", "3",
                  "4", "5", "6",
                  "7", "8", "9",
                  "C", "0", "Hapus"
                ].map((key) => {
                  const isAction = key === "C" || key === "Hapus";
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleKeypadPress(key === "Hapus" ? "BACK" : key)}
                      className={`min-h-12 py-3 rounded-2xl text-base font-black transition-all active:scale-95 shadow-xs border select-none ${
                        isAction
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 text-xs tracking-wide"
                          : "bg-surface hover:bg-card text-fg border-line hover:border-accent/40 active:bg-accent/10"
                      }`}
                    >
                      {key}
                    </button>
                  );
                })}
              </div>

              <button
                type="submit"
                disabled={!passwordInput}
                className="w-full py-3.5 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black rounded-2xl text-sm shadow-lg shadow-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Masuk Admin
              </button>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setPinError("");
                    setAuthView("verify_recovery");
                  }}
                  className="text-xs font-bold text-accent-text hover:underline transition-colors"
                >
                  Lupa PIN Admin?
                </button>
              </div>
            </form>
          )}

          {/* FORM 2: VERIFIKASI RECOVERY CODE PEMILIK */}
          {authView === "verify_recovery" && (
            <form onSubmit={handleVerifyRecovery} className="space-y-4 text-left">
              <div>
                <label className="block text-[11px] font-bold text-fg mb-1">
                  Masukkan Kode Pemulihan Pemilik:
                </label>
                <input
                  type="text"
                  autoFocus
                  value={recoveryCodeInput}
                  onChange={(e) => {
                    setRecoveryCodeInput(e.target.value.toUpperCase());
                    setPinError("");
                  }}
                  placeholder="SAKU-XXXXX-XXXXX-XXXXX-XXXXX-XXXXXX"
                  className="w-full text-center text-sm font-mono tracking-wider font-black border-2 border-line focus:border-accent rounded-xl py-2.5 px-3 bg-card text-fg outline-none transition-all"
                  required
                />
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-700 text-center animate-in fade-in"><LineIcon name="info" />{pinError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black rounded-xl text-xs shadow-lg shadow-accent/20 transition-all"
              >Verifikasi Hak Pemilik 
              </button>

              {storeSettings.adminPin && (
                <div className="pt-1 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setPinError("");
                      setAuthView("login");
                    }}
                    className="text-xs font-bold text-muted hover:text-fg transition-colors"
                  >
                    ← Kembali ke Login PIN
                  </button>
                </div>
              )}
            </form>
          )}

          {/* FORM 3 & 4: SETUP PIN BARU / RESET PIN SETELAH RECOVERY */}
          {(authView === "reset_pin" || authView === "setup_initial") && (
            <form onSubmit={handleSaveNewPin} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-bold text-fg mb-1">
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
                <label className="block text-[11px] font-bold text-fg mb-1">
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
                <p className="text-xs font-bold text-rose-700 text-center animate-in fade-in"><LineIcon name="info" />{pinError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black rounded-xl text-xs shadow-lg shadow-accent/20 transition-all mt-2"
              >
                Simpan PIN & Buat Kode Pemulihan
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-line">
            <Link
              href={navigationHref("/pos")}
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
    if (href === "/admin") return pathname === "/admin" || pathname === "/admin/laporan";
    if (href === "/admin/karyawan") return pathname.startsWith("/admin/karyawan") || pathname.startsWith("/admin/shift");
    return pathname.startsWith(href);
  };

  return (
    <div className="sn-admin min-h-screen bg-app text-fg flex flex-col md:flex-row">
      {/* --- DESKTOP & TABLET SIDEBAR --- */}
      <aside
        className={`hidden md:flex flex-col bg-surface border-r border-line shrink-0 select-none transition-all duration-300 ease-in-out ${
          isSidebarCollapsed ? "w-20" : "w-64 lg:w-72"
        }`}
      >
        {/* Brand & Collapse Toggle */}
        <div
          className={`p-4 border-b border-line flex items-center ${
            isSidebarCollapsed ? "flex-col justify-center gap-3" : "justify-between gap-2"
          }`}
        >
          <Link
            href={navigationHref("/admin")} onClick={keepDashboard}
            className="flex items-center gap-2.5 overflow-hidden"
            title="SakuNota - Admin Backoffice"
          >
            {isSidebarCollapsed ? (
              <img
                src="/icon.png"
                alt="SakuNota"
                className="w-8 h-8 rounded-xl object-contain shadow-xs shrink-0"
              />
            ) : (
              <img
                src="/logo-sakunota.png"
                alt="SakuNota - Admin Backoffice"
                className="h-8 w-auto object-contain"
              />
            )}
          </Link>
          <button
            type="button"
            onClick={toggleSidebar}
            title={isSidebarCollapsed ? "Perlebar Menu" : "Perkecil Menu"}
            className="p-1.5 rounded-xl border border-line bg-card/60 hover:bg-card text-muted hover:text-fg transition-all active:scale-95 shrink-0"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${
                isSidebarCollapsed ? "rotate-180" : ""
              }`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems
            .filter(item => item.href !== "/admin/dapur" || supportsKitchen(storeSettings.businessType))
            .filter(
              (item) =>
                !["/admin/meja", "/admin/pelayan"].includes(item.href) ||
                isTableManagementEnabled(storeSettings)
            )
            .map((item) => {
              const active = isActiveLink(item.href);
              return (
                <Link
                  key={item.href}
                  href={navigationHref(item.href)}
                  onClick={item.href==='/admin'?keepDashboard:event=>{requestSettingsNavigation(event);}}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center rounded-2xl font-bold transition-all ${
                    isSidebarCollapsed
                      ? "justify-center p-3 text-xs"
                      : "gap-3.5 px-3.5 py-3 text-xs"
                  } ${
                    active
                      ? "bg-accent text-white shadow-lg shadow-accent/20"
                      : "text-muted hover:bg-card/60 hover:text-fg"
                  }`}
                >
                  <LineIcon name={item.icon} className="w-5 h-5 shrink-0" />
                  {!isSidebarCollapsed && (
                    <span className="text-sm font-bold truncate">{item.label}</span>
                  )}
                </Link>
              );
            })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-line space-y-2">
          {isSidebarCollapsed ? (
            <div
              className="p-2.5 rounded-2xl bg-card/40 border border-line/50 flex items-center justify-center"
              title={`Toko Aktif: ${storeSettings.storeName || "Toko SakuNota"}`}
            >
              <LineIcon name="store" className="w-4 h-4 text-muted" />
            </div>
          ) : (
            <div className="px-3.5 py-2.5 rounded-2xl bg-card/40 border border-line/50">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">
                Toko Aktif
              </span>
              <span className="text-xs font-bold text-fg truncate block">
                {storeSettings.storeName || "Toko SakuNota"}
              </span>
            </div>
          )}

          <button
            onClick={logout}
            title={isSidebarCollapsed ? "Keluar Admin" : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors ${
              isSidebarCollapsed
                ? "justify-center p-2.5"
                : "justify-center gap-2 px-3 py-2.5"
            }`}
          >
            <LineIcon name="logout" className="w-4 h-4 shrink-0" />
            {!isSidebarCollapsed && <span>Keluar Admin</span>}
          </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Demo Kasir Top Banner */}
        {isDemo && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 shadow-sm sm:sticky sm:top-0 z-40">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 font-black text-[10px] tracking-wide uppercase">
                Demo Kasir
              </span>
              <span className="font-medium text-[11px] sm:text-xs">
                <span className="sm:hidden">Data latihan</span><span className="hidden sm:inline">Anda sedang dalam <strong>Mode Demo Admin</strong>. Data &amp; pengaturan di sini adalah simulasi uji coba.</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/pos?demo=true"
                className="px-2.5 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-[11px] transition-colors"
              >
                ← Kasir Demo
              </Link>
              <Link
                href="/?beli=true"
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-[11px] shadow-sm transition-all"
              >
                Beli Lisensi Rp50.000
              </Link>
            </div>
          </div>
        )}

        {/* Top Header */}
        <header className="bg-surface border-b border-line px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Mobile Brand indicator */}
            <div className="flex items-center gap-2 md:hidden">
              <img
                src="/logo-sakunota.png"
                alt="SakuNota"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-blue-100 text-blue-800">Admin</span>
            </div>

            {/* Store Name / Demo pill */}
            <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isDemo
                ? "bg-amber-100 border border-amber-300 text-amber-900"
                : "bg-blue-50 border border-blue-200 text-blue-700"
            }`}>
              <span>{isDemo ? "Mode Demo Admin (Simulasi)" : (storeSettings.storeName || "SakuNota")}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Kembali ke Kasir */}
            <Link
              href={isDemo ? "/pos?demo=true" : "/pos"}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all"
            >
              <span>←</span>
              <span>{isDemo ? "Kasir Demo" : "Kasir"}</span>
            </Link>
          </div>
        </header>

        {/* Security Reminder if PIN is still default */}
        {isDefaultPin && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex flex-wrap gap-3 items-center justify-between text-xs text-amber-900">
            <div className="flex items-center gap-2">
              <span className="text-base"><LockIcon /></span>
              <span>
                <strong>Pemberitahuan Keamanan:</strong> Anda masih menggunakan PIN bawaan sistem. Disarankan segera mengganti PIN pribadi Anda.
              </span>
            </div>
            <Link
              href={navigationHref("/admin/pengaturan/keamanan")}
              className="px-2.5 py-1 bg-accent hover:bg-accent-hover text-white font-bold rounded-lg shrink-0 transition-colors"
            >
              Ganti PIN
            </Link>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8 max-w-7xl w-full mx-auto">
          <StoreSyncNotice/>
          {children}
        </main>
      </div>

      {/* --- MOBILE BOTTOM NAVIGATION (HP < 768px) --- */}
      {typeof document !== "undefined" && createPortal(<nav aria-label="Navigasi Admin" className="admin-bottom-nav md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-line z-40 px-1 pt-1.5 grid grid-cols-4 items-center" style={{paddingBottom:"calc(0.375rem + env(safe-area-inset-bottom))"}}>
        <Link
          href={navigationHref("/admin")} onClick={keepDashboard}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            (pathname === "/admin" || pathname === "/admin/laporan")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg"><LineIcon name="chart" /></span>
          <span className="truncate w-full text-center">Dashboard</span>
        </Link>

        <Link
          href={navigationHref("/admin/menu")} onClick={event=>{requestSettingsNavigation(event);}}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname.startsWith("/admin/menu")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg"><LineIcon name="catalog" /></span>
          <span className="truncate w-full text-center">Katalog</span>
        </Link>

        <Link
          href={navigationHref("/admin/transaksi")} onClick={event=>{requestSettingsNavigation(event);}}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            pathname.startsWith("/admin/transaksi")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg"><LineIcon name="receipt" /></span>
          <span className="truncate w-full text-center">Transaksi</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsLainnyaOpen(true)}
          className={`flex flex-col items-center justify-center py-1 rounded-xl text-[10px] font-bold transition-all text-center ${
            isLainnyaOpen || pathname.startsWith("/admin/pelayan") || pathname.startsWith("/admin/dapur") || pathname.startsWith("/admin/karyawan") || pathname.startsWith("/admin/meja") || pathname.startsWith("/admin/shift") || pathname.startsWith("/admin/pengaturan")
              ? " text-accent-text font-black"
              : " text-muted"
          }`}
        >
          <span className="text-lg"><LineIcon name="settings" /></span>
          <span className="truncate w-full text-center">Lainnya</span>
        </button>
      </nav>, document.body)}

      {/* --- MOBILE "LAINNYA" BOTTOM SHEET --- */}
      {isLainnyaOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center md:hidden animate-in fade-in duration-200"
          onClick={event=>{if(requestSettingsNavigation(event))setIsLainnyaOpen(false);}}
        >
          <div
            className=" bg-surface rounded-t-3xl w-full p-5 shadow-2xl border-t border-line animate-in slide-in-from-bottom duration-250 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-1.5 bg-line rounded-full mx-auto mb-4" />
            <h3 className="text-base font-black text-fg mb-3">Menu Lainnya</h3>

            <div className="grid grid-cols-1 gap-2 mb-4">
              {navItems.filter(item =>
                item.href === '/admin/pelayan' && isTableManagementEnabled(storeSettings) ||
                item.href === '/admin/dapur' && supportsKitchen(storeSettings.businessType)
              ).map(item => <Link key={item.href} href={navigationHref(item.href)} onClick={event=>{if(requestSettingsNavigation(event))setIsLainnyaOpen(false);}} className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3.5 text-fg">
                <LineIcon name={item.icon}/><span className="text-sm font-bold">{item.label}</span>
              </Link>)}
              {isTableManagementEnabled(storeSettings) && (
                <Link
                  href={navigationHref("/admin/meja")}
                  onClick={event=>{if(requestSettingsNavigation(event))setIsLainnyaOpen(false);}}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 hover:bg-accent-hover/40 text-fg text-xs font-bold transition-colors"
                >
                  <span className="text-xl"><LineIcon name="tables" /></span>
                  <div className="flex-1">
                    <div className="font-bold text-sm">Kelola Meja</div>
                    <div className="text-[10px] text-muted">Atur nomor meja dan status dine-in</div>
                  </div>
                  <span>→</span>
                </Link>
              )}

              <Link
                href={navigationHref("/admin/karyawan")}
                onClick={event=>{if(requestSettingsNavigation(event))setIsLainnyaOpen(false);}}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 hover:bg-accent-hover/40 text-fg text-xs font-bold transition-colors"
              >
                <span className="text-xl"><LineIcon name="shift" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Karyawan &amp; Shift</div>
                  <div className="text-[10px] text-muted">Karyawan, shift kasir, dan kas usaha</div>
                </div>
                <span>→</span>
              </Link>

              <Link
                href={navigationHref("/admin/pengaturan")}
                onClick={event=>{if(requestSettingsNavigation(event))setIsLainnyaOpen(false);}}
                className="flex items-center gap-3 p-3.5 rounded-2xl bg-card/60 hover:bg-accent-hover/40 text-fg text-xs font-bold transition-colors"
              >
                <span className="text-xl"><LineIcon name="settings" /></span>
                <div className="flex-1">
                  <div className="font-bold text-sm">Pengaturan POS</div>
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
                className="flex-1 py-3 rounded-2xl bg-rose-50 text-rose-700 font-bold text-xs text-center"
              >
                Keluar Admin
              </button>
              <button
                type="button"
                onClick={event=>{if(requestSettingsNavigation(event))setIsLainnyaOpen(false);}}
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

export default function AdminClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <AdminShell>{children}</AdminShell>
    </AdminProvider>
  );
}
