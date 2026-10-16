"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { saveStoreSettingsAsync } from "@/lib/settings";
import { App } from "@capacitor/app";

export default function PengaturanKeamananPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

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

    if (hasExistingPin) {
      if (currentPin !== storeSettings.adminPin) {
        setErrorMessage("PIN lama yang Anda masukkan tidak sesuai.");
        return;
      }
    }

    if (newPin.length < 4) {
      setErrorMessage("PIN baru minimal harus 4 digit angka.");
      return;
    }

    if (newPin !== confirmPin) {
      setErrorMessage("Konfirmasi PIN baru tidak cocok.");
      return;
    }

    try {
      const updated = {
        ...storeSettings,
        adminPin: newPin,
      };
      await saveStoreSettingsAsync(updated);
      await refreshSettings();
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      showToast(hasExistingPin ? "PIN Admin berhasil diubah!" : "PIN Admin berhasil dibuat!", "success");
    } catch (err: any) {
      alert("Gagal memperbarui PIN: " + err.message);
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
          <span>🔒</span>
          <span>Keamanan & PIN Admin</span>
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Lindungi pembatalan nota (Void), pengembalian uang (Refund), dan akses backoffice.
        </p>
      </div>

      {/* Change PIN Form */}
      <div className=" bg-surface p-6 rounded-3xl border border-line shadow-sm space-y-4">
        <h3 className="text-sm font-black text-fg">
          {hasExistingPin ? "Ubah PIN Otorisasi Admin" : "Buat PIN Otorisasi Admin"}
        </h3>

        <form onSubmit={handleUpdatePin} className="space-y-4">
          {hasExistingPin ? (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
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
            <div className="p-3 bg-amber-950/40 border border-amber-800/50 rounded-xl text-xs text-amber-200">
              ℹ️ Perangkat ini belum memiliki PIN Admin yang tersimpan. Silakan langsung tentukan PIN baru untuk mengamankan operasional toko.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
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
              <label className="block text-xs font-bold text-slate-300 mb-1">
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
            <p className="text-xs font-bold text-rose-400 p-2.5 rounded-xl bg-rose-950/40">
              ⚠️ {errorMessage}
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

      {/* Sensitive Operations Info */}
      <div className=" bg-surface p-5 rounded-3xl border border-line shadow-sm space-y-2 text-xs">
        <h4 className="font-black text-fg flex items-center gap-1.5">
          <span>🛡️</span>
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
