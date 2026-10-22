"use client";
import LockIcon from "@/components/LockIcon";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { requireMerchantAdmin, verifyMerchantPin } from "@/lib/merchantAccess";
import { saveStoreSettingsAsync } from "@/lib/settings";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery";
import { App } from "@capacitor/app";
import { isDemoMode } from "@/lib/demoMode";

export default function PengaturanKeamananPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Recovery Code state
  const [revealedCode, setRevealedCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [acknowledgedCode, setAcknowledgedCode] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenPinInput, setRegenPinInput] = useState("");
  const [regenError, setRegenError] = useState("");

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        router.push("/admin/pengaturan");
      }).then((handle) => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [router]);

  const hasExistingPin = Boolean(storeSettings.adminPin);

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (isDemoMode()) {
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      showToast("Mode Demo: Perubahan PIN hanya simulasi dan tidak disimpan.", "info");
      return;
    }

    if (hasExistingPin) {
      if (!(await verifyMerchantPin(currentPin).catch(() => false))) {
        setErrorMessage("PIN lama yang Anda masukkan tidak sesuai.");
        return;
      }
    }

    if (!/^\d{4,12}$/.test(newPin)) {
      setErrorMessage("PIN baru harus 4–12 digit angka.");
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage("Konfirmasi PIN baru tidak cocok.");
      return;
    }

    try {
      let freshRecoveryCode: string | null = null;
      let newHash = storeSettings.recoveryCodeHash;

      // Jika belum memiliki Recovery Code, otomatis buat sekarang
      if (!newHash) {
        freshRecoveryCode = generateRecoveryCode();
        newHash = await hashRecoveryCode(freshRecoveryCode);
      }

      const updated = {
        ...storeSettings,
        adminPin: newPin,
        recoveryCodeHash: newHash,
        failedRecoveryAttempts: 0,
        recoveryLockedUntil: ""
      };
      await requireMerchantAdmin();
      await saveStoreSettingsAsync(updated, { renewAdminSession: true });
      await refreshSettings();
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");

      if (freshRecoveryCode) {
        setRevealedCode(freshRecoveryCode);
        setAcknowledgedCode(false);
      } else {
        showToast(hasExistingPin ? "PIN Admin berhasil diubah!" : "PIN Admin berhasil dibuat!", "success");
      }
    } catch (err: any) {
      alert("Gagal memperbarui PIN: " + err.message);
    }
  };

  const handleRegenerateRecoveryCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegenError("");

    if (isDemoMode()) {
      setIsRegenerating(false);
      setRegenPinInput("");
      setRegenError("");
      showToast("Mode Demo: Kode Pemulihan hanya simulasi dan tidak disimpan.", "info");
      return;
    }

    if (!storeSettings.adminPin) {
      setRegenError("PIN Admin belum aktif.");
      return;
    }

    if (!(await verifyMerchantPin(regenPinInput).catch(() => false))) {
      setRegenError("PIN Admin salah!");
      return;
    }

    try {
      const freshCode = generateRecoveryCode();
      const freshHash = await hashRecoveryCode(freshCode);

      const updated = {
        ...storeSettings,
        recoveryCodeHash: freshHash,
        failedRecoveryAttempts: 0,
        recoveryLockedUntil: ""
      };
      await requireMerchantAdmin();
      await saveStoreSettingsAsync(updated, { renewAdminSession: true });
      await refreshSettings();

      setIsRegenerating(false);
      setRegenPinInput("");
      setRegenError("");
      setRevealedCode(freshCode);
      setAcknowledgedCode(false);
      setCodeCopied(false);
    } catch (err: any) {
      setRegenError("Gagal membuat ulang kode: " + (err as any)?.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl">
      {/* Header */}
      <div className="pb-3 border-b border-line">
        <Link
          href="/admin/pengaturan"
          className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 mb-1"
        >
          <span>← Kembali ke Pengaturan</span>
        </Link>
        <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
          <span><LockIcon /></span>
          <span>Keamanan & PIN Admin</span>
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Lindungi pembatalan nota (Void), pengembalian uang (Refund), dan akses backoffice.
        </p>
      </div>

      {isDemoMode() && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 font-medium">
          <p className="font-bold mb-0.5">Mode Demo (Simulasi)</p>
          <p>Fitur keamanan dan PIN pada mode demo hanya berfungsi sebagai simulasi tampilan. Pengaturan PIN tidak disimpan secara permanen.</p>
        </div>
      )}

      {/* Change PIN Form */}
      <div className=" bg-surface p-6 rounded-3xl border border-line shadow-sm space-y-4">
        <h3 className="text-sm font-black text-fg">
          {hasExistingPin ? "Ubah PIN Otorisasi Admin" : "Buat PIN Otorisasi Admin"}
        </h3>

        <form onSubmit={handleUpdatePin} className="space-y-4">
          {hasExistingPin ? (
            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                PIN Saat Ini:
              </label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Masukkan PIN saat ini"
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full bg-card border border-line rounded-xl p-3 text-sm font-black tracking-widest text-center text-fg outline-none focus:border-accent"
                required
              />
            </div>
          ) : (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 font-medium"> Perangkat ini belum memiliki PIN Admin yang tersimpan. Silakan langsung tentukan PIN baru untuk mengamankan operasional toko.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                PIN Baru (4-6 digit):
              </label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="PIN Baru..."
                value={newPin}
                onChange={(e) => {
                  setNewPin(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full bg-card border border-line rounded-xl p-3 text-sm font-black tracking-widest text-center text-fg outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Ulangi PIN Baru:
              </label>
              <input
                type="password"
                inputMode="numeric"
                placeholder="Konfirmasi..."
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value);
                  setErrorMessage("");
                }}
                className="w-full bg-card border border-line rounded-xl p-3 text-sm font-black tracking-widest text-center text-fg outline-none focus:border-accent"
                required
              />
            </div>
          </div>

          {errorMessage && (
            <p className="text-xs font-bold text-rose-700 p-2.5 rounded-xl bg-rose-50"><LineIcon name="info" />{errorMessage}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 transition-all"
          >
            Simpan PIN Baru
          </button>
        </form>
      </div>

      {/* Recovery Code Card */}
      <div className="bg-surface p-6 rounded-3xl border border-line shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-black text-fg flex items-center gap-1.5">
              
              <span>Kode Pemulihan Pemilik (Offline Recovery Code)</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Kunci darurat offline untuk mereset PIN Admin jika Anda lupa PIN atau data PIN terhapus.
            </p>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            {storeSettings.recoveryCodeHash ? "Aktif (SHA-256)" : "Belum Dibuat"}
          </span>
        </div>

        <div className="p-4 bg-card/60 rounded-2xl border border-line text-xs space-y-2">
          <p className="text-muted leading-relaxed">
            Kode Pemulihan dibuat secara acak terenkripsi dan disimpan hanya dalam bentuk hash di penyimpanan perangkat Anda. Kode ini <strong>tidak pernah disertakan dalam file cadangan JSON</strong> demi privasi.
          </p>
          {!isRegenerating ? (
            <button
              type="button"
              onClick={() => {
                setIsRegenerating(true);
                setRegenPinInput("");
                setRegenError("");
              }}
              className="px-4 py-2 bg-card hover:bg-card/80 border border-line text-xs font-bold text-fg rounded-xl transition-all"
            > Buat Ulang Kode Pemulihan Baru
            </button>
          ) : (
            <form onSubmit={handleRegenerateRecoveryCode} className="space-y-3 pt-2">
              <label className="block text-[11px] font-bold text-fg">
                Masukkan PIN Admin saat ini untuk otorisasi:
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  inputMode="numeric"
                  placeholder="PIN Admin saat ini..."
                  value={regenPinInput}
                  onChange={(e) => {
                    setRegenPinInput(e.target.value);
                    setRegenError("");
                  }}
                  className="flex-1 bg-card border border-line rounded-xl px-3 py-2 text-xs font-bold text-fg outline-none focus:border-accent"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
                >
                  Buat Kode Baru
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegenerating(false)}
                  className="px-3 py-2 bg-line text-muted text-xs font-bold rounded-xl hover:text-fg"
                >
                  Batal
                </button>
              </div>
              {regenError && (
                <p className="text-xs font-bold text-rose-700"><LineIcon name="info" />{regenError}</p>
              )}
            </form>
          )}
        </div>
      </div>

      {/* MODAL TAMPILKAN RECOVERY CODE BARU */}
      {revealedCode && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border-2 border-accent text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-2xl bg-accent text-white flex items-center justify-center text-3xl font-black mx-auto mb-4 shadow-lg shadow-accent/20"><LineIcon name="info" /></div>
            <h2 className="text-xl font-black text-fg">Simpan Kode Pemulihan Baru Anda!</h2>
            <p className="text-xs text-muted mt-1 mb-5">
              Kode pemulihan lama Anda telah dinonaktifkan. Catat kode baru ini di tempat yang aman.
            </p>

            <div className="bg-card p-4 rounded-2xl border-2 border-dashed border-accent mb-4 select-all">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">
                Kode Pemulihan Pemilik Baru:
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

            <label className="flex items-start gap-2.5 text-left text-xs text-fg font-bold mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={acknowledgedCode}
                onChange={(e) => setAcknowledgedCode(e.target.checked)}
                className="mt-0.5 rounded border-line text-accent focus:ring-accent"
              />
              <span>Saya sudah mencatat kode ini di buku catatan / tempat aman.</span>
            </label>

            <button
              type="button"
              disabled={!acknowledgedCode}
              onClick={() => {
                setRevealedCode(null);
                showToast("Kode Pemulihan berhasil diperbarui!", "success");
              }}
              className={`w-full py-3.5 font-black rounded-2xl text-xs transition-all shadow-lg ${
                acknowledgedCode
                  ? "bg-accent hover:bg-accent-hover text-white active:scale-95 shadow-accent/20 cursor-pointer"
                  : "bg-line text-muted cursor-not-allowed"
              }`}
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      )}

      {/* Sensitive Operations Info */}
      <div className=" bg-surface p-5 rounded-3xl border border-line shadow-sm space-y-2 text-xs">
        <h4 className="font-black text-fg flex items-center gap-1.5">
          
          <span>Operasi Kasir yang Memerlukan Otorisasi PIN:</span>
        </h4>
        <ul className="space-y-1.5 text-muted list-disc list-inside pt-1">
          <li><strong>Pembatalan Transaksi (Void):</strong> Kasir tidak bisa membatalkan pesanan secara sepihak tanpa persetujuan Admin/Owner.</li>
          <li><strong>Pengembalian Uang (Refund):</strong> Setiap pengembalian uang dari laci diverifikasi dan tercatat ke Audit Log.</li>
          <li><strong>Akses Backoffice:</strong> Halaman laporan laba, pengaturan toko, dan data menu dilindungi PIN.</li>
          <li><strong>Reset Transaksi:</strong> Penghapusan database penjualan harus melalui validasi ganda.</li>
        </ul>
      </div>
    </div>
  );
}
