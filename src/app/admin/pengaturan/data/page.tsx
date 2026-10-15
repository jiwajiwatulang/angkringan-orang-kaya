"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { exportAllData, importAllData, resetAllTransactions } from "@/lib/api";
import { App } from "@capacitor/app";

export default function PengaturanDataPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPinInput, setResetPinInput] = useState("");
  const [resetPinError, setResetPinError] = useState("");

  useEffect(() => {
    const savedDate = localStorage.getItem("sakunota_last_backup_date");
    if (savedDate) setLastBackupDate(savedDate);
  }, []);

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (isResetModalOpen) {
          setIsResetModalOpen(false);
        } else {
          router.push("/admin/pengaturan");
        }
      }).then((handle) => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [isResetModalOpen, router]);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `Backup_SakuNota_${(storeSettings.storeName || "Toko").replace(/\s+/g, "_")}_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const nowIso = new Date().toISOString();
      localStorage.setItem("sakunota_last_backup_date", nowIso);
      setLastBackupDate(nowIso);
      showToast("Cadangan database .JSON berhasil diunduh!", "success");
    } catch (err: any) {
      alert("Gagal membuat cadangan: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm("Peringatan: Memulihkan cadangan akan menimpa seluruh menu, meja, dan riwayat transaksi saat ini dengan isi file. Lanjutkan?")) {
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      await importAllData(json);
      await refreshSettings();
      showToast("Data berhasil dipulihkan dari cadangan!", "success");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      alert("Gagal memulihkan file: " + err.message);
    } finally {
      e.target.value = "";
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctPin = storeSettings.adminPin || "1234";

    if (resetPinInput !== correctPin) {
      setResetPinError("PIN Admin salah!");
      return;
    }

    try {
      await resetAllTransactions();
      setIsResetModalOpen(false);
      setResetPinInput("");
      setResetPinError("");
      showToast("Seluruh riwayat transaksi demo berhasil dibersihkan!", "info");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err: any) {
      alert("Gagal mereset transaksi: " + err.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="pb-3 border-b border-line">
        <Link
          href="/admin/pengaturan"
          className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 mb-1"
        >
          <span>← Kembali ke Pengaturan</span>
        </Link>
        <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
          <span>💾</span>
          <span>Cadangan & Pemulihan Data</span>
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Simpan database kasir ke file eksternal untuk menghindari kehilangan data jika HP diganti.
        </p>
      </div>

      {/* Backup Status Reminder Banner */}
      <div className="p-5 rounded-3xl bg-accent/20 border border-accent/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h4 className="text-xs font-black text-accent-text uppercase tracking-wider">
              Status Pencadangan Terakhir
            </h4>
            <p className="text-xs text-accent-text font-bold mt-0.5">
              {lastBackupDate
                ? `Terakhir dicadangkan: ${new Date(lastBackupDate).toLocaleString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`
                : "Belum pernah membuat file cadangan eksternal."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all shrink-0 disabled:opacity-50"
        >
          {isExporting ? "Membuat Cadangan..." : "Unduh Cadangan (.JSON)"}
        </button>
      </div>

      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Restore Card */}
        <div className=" bg-surface p-5 rounded-3xl border border-line shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xl block mb-2">📥</span>
            <h3 className="font-black text-base text-fg">
              Pulihkan Data (Restore)
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Pilih file .JSON yang sudah Anda unduh sebelumnya untuk memulihkan seluruh menu dan riwayat transaksi di HP baru.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-line">
            <label className="w-full py-2.5 bg-accent hover:bg-accent-hover active:scale-95 text-white font-black text-xs rounded-xl shadow-md transition-all text-center cursor-pointer block">
              Pilih File .JSON Cadangan
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Reset Demo Transactions Card */}
        <div className=" bg-surface p-5 rounded-3xl border border-line shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-2xl block mb-2">🧹</span>
            <h3 className="font-black text-base text-fg">
              Bersihkan Transaksi Demo
            </h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">
              Hapus seluruh nota pesanan percobaan, riwayat shift, dan kas masuk/keluar sebelum toko resmi dibuka. Menu dan meja tetap aman.
            </p>
          </div>

          <div className="mt-5 pt-3 border-t border-line">
            <button
              type="button"
              onClick={() => {
                setResetPinInput("");
                setResetPinError("");
                setIsResetModalOpen(true);
              }}
              className="w-full py-2.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 font-black text-xs rounded-xl transition-colors"
            >
              Reset Data Transaksi...
            </button>
          </div>
        </div>
      </div>

      {/* --- CONFIRMATION MODAL: RESET TRANSAKSI --- */}
      {isResetModalOpen && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-fg mb-1">
              Reset Semua Transaksi?
            </h3>
            <p className="text-xs text-muted leading-relaxed mb-4">
              Tindakan ini akan mengosongkan seluruh nota penjualan, pembayaran, dan shift kasir. Masukkan PIN Admin untuk melanjutkan:
            </p>

            <form onSubmit={handleResetSubmit} className="space-y-3.5">
              <input
                type="password"
                inputMode="numeric"
                placeholder="Masukkan PIN Admin..."
                value={resetPinInput}
                onChange={(e) => {
                  setResetPinInput(e.target.value);
                  setResetPinError("");
                }}
                className="w-full bg-card border border-line rounded-xl p-2.5 text-center text-sm font-black tracking-widest text-fg outline-none focus:border-rose-500"
                autoFocus
                required
              />

              {resetPinError && (
                <p className="text-xs font-bold text-rose-400">{resetPinError}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 bg-card text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
                >
                  Ya, Bersihkan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
