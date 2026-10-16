"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAdmin } from "../../AdminContext";
import { 
  exportAllData, 
  importAllData, 
  resetAllTransactions, 
  validateBackupSchema,
  getPreRestoreSnapshot,
  rollbackPreRestoreBackup 
} from "@/lib/api";
import { db } from "@/lib/dexie";
import { App } from "@capacitor/app";

export default function PengaturanDataPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  // Dynamic live counts of business data
  const [businessCounts, setBusinessCounts] = useState({
    menu: 0,
    transaksi: 0,
    meja: 0,
    shift: 0,
    isLoading: true
  });

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  const [resetPinInput, setResetPinInput] = useState("");
  const [resetPinError, setResetPinError] = useState("");
  const [confirmDeleteChecked, setConfirmDeleteChecked] = useState(false);

  // Preview Restore Modal State
  const [previewBackupData, setPreviewBackupData] = useState<any | null>(null);
  const [previewStats, setPreviewStats] = useState<any | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [isRestoring, setIsRestoring] = useState(false);

  // Undo / Pre-restore Snapshot State
  const [preRestoreSnapshot, setPreRestoreSnapshot] = useState<{ timestamp: string; data: any } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load real business data counts & saved backup date
  const loadBusinessStats = async () => {
    try {
      const [menu, transaksi, meja, shift] = await Promise.all([
        db.menuItems.count(),
        db.orders.count(),
        db.tables.count(),
        db.shifts.count()
      ]);
      setBusinessCounts({ menu, transaksi, meja, shift, isLoading: false });
    } catch {
      setBusinessCounts(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    loadBusinessStats();

    const savedDate = localStorage.getItem("sakunota_last_backup_date");
    if (savedDate) setLastBackupDate(savedDate);

    getPreRestoreSnapshot().then(snapshot => {
      if (snapshot) setPreRestoreSnapshot(snapshot);
    });

    if (typeof window !== "undefined") {
      (window as any).__SAKUNOTA_API__ = {
        exportAllData,
        importAllData,
        validateBackupSchema,
        getPreRestoreSnapshot,
        rollbackPreRestoreBackup,
        db
      };
    }
  }, []);

  // Back button handling
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (previewBackupData) {
          setPreviewBackupData(null);
        } else if (isMigrateModalOpen) {
          setIsMigrateModalOpen(false);
        } else if (isResetModalOpen) {
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
  }, [previewBackupData, isMigrateModalOpen, isResetModalOpen, router]);

  // 1. Cadangkan Sekarang
  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const date = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `Cadangan_SakuNota_${(storeSettings.storeName || "Toko").replace(/\s+/g, "_")}_${date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const nowIso = new Date().toISOString();
      localStorage.setItem("sakunota_last_backup_date", nowIso);
      setLastBackupDate(nowIso);
      showToast("Cadangan sudah dibuat. Periksa folder Unduhan di perangkat Anda dan simpan file tersebut di tempat yang aman.", "success");
    } catch {
      showToast("Data belum berhasil disimpan. Silakan coba lagi.", "error");
    } finally {
      setIsExporting(false);
    }
  };

  // 2. Pilih File Cadangan
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const validation = validateBackupSchema(json);

      if (!validation.isValid) {
        showToast("File ini tidak dapat digunakan. Pilih file cadangan SakuNota yang benar.", "error");
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setPreviewFileName(file.name);
      setPreviewStats(validation.stats);
      setPreviewBackupData(json);
    } catch {
      showToast("File ini tidak dapat digunakan. Pilih file cadangan SakuNota yang benar.", "error");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // 3. Konfirmasi Kembalikan Data
  const handleConfirmRestore = async () => {
    if (!previewBackupData) return;
    setIsRestoring(true);

    try {
      await importAllData(previewBackupData);
      await refreshSettings();
      showToast("Data usaha berhasil dikembalikan. Anda bisa mulai menggunakan SakuNota kembali.", "success");
      
      const newSnapshot = await getPreRestoreSnapshot();
      if (newSnapshot) setPreRestoreSnapshot(newSnapshot);

      setPreviewBackupData(null);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      showToast("Data belum berhasil dikembalikan. Pastikan file cadangan tidak rusak dan coba lagi.", "error");
    } finally {
      setIsRestoring(false);
    }
  };

  // Batalkan Pemulihan Terakhir (Undo)
  const handleRollbackSnapshot = async () => {
    if (!preRestoreSnapshot) return;

    if (!window.confirm("Yakin ingin membatalkan pemulihan terakhir dan mengembalikan data usaha ke kondisi sebelumnya?")) {
      return;
    }

    setIsRollingBack(true);
    try {
      await rollbackPreRestoreBackup();
      await refreshSettings();
      setPreRestoreSnapshot(null);
      showToast("Data berhasil dikembalikan ke kondisi sebelum pemulihan.", "info");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch {
      showToast("Gagal membatalkan pemulihan. Silakan muat ulang halaman.", "error");
    } finally {
      setIsRollingBack(false);
    }
  };

  // Hapus Seluruh Riwayat Penjualan & Shift
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmDeleteChecked) {
      setResetPinError("Centang kotak persetujuan konfirmasi terlebih dahulu.");
      return;
    }
    if (!storeSettings.adminPin) {
      setResetPinError("PIN Admin belum dikonfigurasi. Harap buat PIN di menu Pengaturan Keamanan.");
      return;
    }

    if (resetPinInput !== storeSettings.adminPin) {
      setResetPinError("PIN Otorisasi salah. Silakan coba lagi.");
      return;
    }

    try {
      await resetAllTransactions();
      setIsResetModalOpen(false);
      setResetPinInput("");
      setResetPinError("");
      setConfirmDeleteChecked(false);
      showToast("Seluruh riwayat penjualan dan shift telah dihapus. Daftar menu dan meja tetap aman.", "info");
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch {
      showToast("Gagal menghapus data riwayat transaksi. Silakan coba lagi.", "error");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header Halaman */}
      <div className="pb-3 border-b border-line">
        <Link
          href="/admin/pengaturan"
          className="text-xs font-bold text-accent-text hover:underline flex items-center gap-1 mb-1"
        >
          <span>← Kembali ke Pengaturan</span>
        </Link>
        <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
          <span>💾</span>
          <span>Data & Cadangan</span>
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Jaga data usaha tetap aman saat berganti perangkat.
        </p>
      </div>

      {/* Ringkasan Data Usaha Anda (Live Counts dari Perangkat) */}
      <div className="p-5 rounded-3xl bg-surface border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏪</span>
            <h3 className="text-xs font-black text-fg uppercase tracking-wider">
              Data Usaha Anda
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            <span>Tersimpan di Perangkat Ini</span>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3.5 rounded-2xl bg-card border border-line/60">
            <span className="text-[11px] text-muted font-bold block">Menu Makanan & Minuman</span>
            <span className="text-2xl font-black text-fg mt-0.5 block">
              {businessCounts.isLoading ? "..." : businessCounts.menu}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-line/60">
            <span className="text-[11px] text-muted font-bold block">Total Transaksi</span>
            <span className="text-2xl font-black text-accent-text mt-0.5 block">
              {businessCounts.isLoading ? "..." : businessCounts.transaksi.toLocaleString('id-ID')}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-line/60">
            <span className="text-[11px] text-muted font-bold block">Daftar Meja</span>
            <span className="text-2xl font-black text-fg mt-0.5 block">
              {businessCounts.isLoading ? "..." : businessCounts.meja}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-card border border-line/60">
            <span className="text-[11px] text-muted font-bold block">Riwayat Shift Kasir</span>
            <span className="text-2xl font-black text-fg mt-0.5 block">
              {businessCounts.isLoading ? "..." : businessCounts.shift}
            </span>
          </div>
        </div>
      </div>

      {/* Status Pencadangan Terakhir */}
      <div className="p-5 rounded-3xl bg-accent/15 border border-accent/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h4 className="text-xs font-black text-accent-text uppercase tracking-wider">
              Status Cadangan
            </h4>
            <p className="text-xs text-fg font-medium mt-0.5">
              {lastBackupDate
                ? `File dibuat pada: ${new Date(lastBackupDate).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })} (Periksa folder Unduhan di perangkat Anda)`
                : "Belum pernah membuat file cadangan di perangkat ini. Buat cadangan sekarang untuk berjaga-jaga."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover active:scale-95 text-white text-xs font-black rounded-xl shadow-md transition-all shrink-0 flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <span>📥</span>
          <span>{isExporting ? "Menyiapkan File..." : "Cadangkan Sekarang"}</span>
        </button>
      </div>

      {/* Rollback Snapshot jika baru saja melakukan pemulihan */}
      {preRestoreSnapshot && (
        <div className="p-5 rounded-3xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">↩️</span>
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Batalkan Pemulihan Terakhir
              </h4>
              <p className="text-xs text-amber-200/90 mt-0.5 leading-relaxed">
                Tersimpan otomatis pada <strong>{new Date(preRestoreSnapshot.timestamp).toLocaleString("id-ID")}</strong> sebelum data terakhir dipulihkan. Jika file yang Anda pulihkan tadi salah, Anda bisa kembali ke data sebelumnya.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRollbackSnapshot}
            disabled={isRollingBack}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl transition-all shadow-md shrink-0 disabled:opacity-50"
          >
            {isRollingBack ? "Mengembalikan..." : "Kembalikan Data Sebelumnya"}
          </button>
        </div>
      )}

      {/* 3 Tindakan Utama Pengelolaan Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Simpan Cadangan */}
        <div className="p-5 rounded-3xl bg-surface border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="w-11 h-11 rounded-2xl bg-accent/20 text-accent-text flex items-center justify-center text-xl">
              📥
            </span>
            <h3 className="font-black text-base text-fg">Simpan Cadangan</h3>
            <p className="text-xs text-muted leading-relaxed">
              Simpan salinan menu, transaksi, dan pengaturan usaha agar bisa dikembalikan kapan saja.
            </p>
          </div>

          <div className="pt-3 border-t border-line space-y-2">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl shadow-md shadow-accent/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <span>💾</span>
              <span>{isExporting ? "Menyiapkan File..." : "Cadangkan Sekarang"}</span>
            </button>
            <p className="text-[10px] text-muted text-center leading-tight">
              Kirim file ke WhatsApp sendiri atau simpan di Google Drive.
            </p>
          </div>
        </div>

        {/* 2. Kembalikan Data */}
        <div className="p-5 rounded-3xl bg-surface border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl">
              📂
            </span>
            <h3 className="font-black text-base text-fg">Kembalikan Data</h3>
            <p className="text-xs text-muted leading-relaxed">
              Punya cadangan sebelumnya? Pilih file yang pernah disimpan untuk mengembalikan data usaha.
            </p>
          </div>

          <div className="pt-3 border-t border-line space-y-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileSelected}
              className="hidden"
              id="backup-file-input"
            />
            <label
              htmlFor="backup-file-input"
              className="w-full py-3 bg-card hover:bg-line text-fg text-xs font-black rounded-2xl border border-line transition-all flex items-center justify-center gap-2 cursor-pointer text-center select-none active:scale-95 shadow-sm"
            >
              <span>📁</span>
              <span>Pilih File Cadangan</span>
            </label>
            <p className="text-[10px] text-muted text-center leading-tight">
              Anda akan melihat rincian isi file sebelum data diganti.
            </p>
          </div>
        </div>

        {/* 3. Pindah HP / Perangkat */}
        <div className="p-5 rounded-3xl bg-surface border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="w-11 h-11 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
              📱
            </span>
            <h3 className="font-black text-base text-fg">Pindah HP / Perangkat</h3>
            <p className="text-xs text-muted leading-relaxed">
              Ganti HP? Ikuti panduan untuk membawa data usaha ke perangkat baru dengan mudah.
            </p>
          </div>

          <div className="pt-3 border-t border-line space-y-2">
            <button
              type="button"
              onClick={() => setIsMigrateModalOpen(true)}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-2xl shadow-md shadow-purple-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              <span>✨</span>
              <span>Mulai Pindah Perangkat</span>
            </button>
            <p className="text-[10px] text-muted text-center leading-tight">
              Panduan 4 langkah dari HP lama ke HP baru.
            </p>
          </div>
        </div>
      </div>

      {/* Pembersihan Riwayat Transaksi (Selesai Percobaan / Mulai Resmi) */}
      <div className="p-5 rounded-3xl bg-red-950/20 border border-red-900/40 space-y-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-red-900/40 text-red-400 flex items-center justify-center text-xl">
            ⚠️
          </span>
          <div>
            <h3 className="font-black text-sm text-red-300">Hapus Seluruh Riwayat Penjualan & Shift</h3>
            <p className="text-xs text-red-400/80 mt-0.5">
              Hapus seluruh nota transaksi, pembayaran, dan riwayat shift kasir (biasanya dilakukan setelah selesai masa uji coba/latihan sebelum mulai operasional resmi). Menu makanan/minuman dan denah meja TIDAK akan dihapus.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-red-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-amber-300/90 font-medium">
            ⚠️ PERINGATAN: Tindakan ini permanen. Pastikan Anda sudah membuat cadangan data sebelum menghapus transaksi.
          </p>

          <button
            type="button"
            onClick={() => {
              setConfirmDeleteChecked(false);
              setResetPinInput("");
              setResetPinError("");
              setIsResetModalOpen(true);
            }}
            className="px-4 py-2 bg-red-600/20 hover:bg-red-600 border border-red-600/40 hover:border-red-600 text-red-300 hover:text-white text-xs font-bold rounded-xl transition-all active:scale-95 shrink-0"
          >
            Hapus Riwayat Penjualan & Shift
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Konfirmasi Kembalikan Data (Restore) */}
      {/* ======================================================== */}
      {previewBackupData && previewStats && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewBackupData(null)}
        >
          <div 
            className="bg-surface text-fg p-6 rounded-3xl w-full max-w-lg shadow-2xl relative border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h3 className="font-black text-base text-fg">Kembalikan Data Usaha?</h3>
                  <p className="text-xs text-muted">Periksa ringkasan isi file sebelum melanjutkan.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBackupData(null)}
                className="w-8 h-8 rounded-xl bg-card hover:bg-line text-muted flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Warning Text */}
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 leading-relaxed">
              <strong>Peringatan Penting:</strong> Data yang sekarang ada di perangkat ini akan diganti dengan data dari file cadangan. Salinan darurat data saat ini akan dibuat otomatis untuk berjaga-jaga.
            </div>

            {/* Rincian File */}
            <div className="p-4 rounded-2xl bg-card border border-line/60 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Nama File:</span>
                <span className="font-bold text-fg truncate max-w-[220px]">{previewFileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Nama Usaha:</span>
                <span className="font-bold text-accent-text">{previewStats.storeName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-line/40">
                <span className="text-muted">Waktu Pencadangan:</span>
                <span className="font-bold text-fg">
                  {new Date(previewStats.backupDate).toLocaleString("id-ID", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-surface p-2 rounded-xl border border-line/40">
                  <span className="text-muted block">Jumlah Menu:</span>
                  <span className="font-black text-fg text-sm">{previewStats.menuCount} item</span>
                </div>
                <div className="bg-surface p-2 rounded-xl border border-line/40">
                  <span className="text-muted block">Jumlah Transaksi:</span>
                  <span className="font-black text-accent-text text-sm">{previewStats.orderCount} nota</span>
                </div>
              </div>
            </div>

            {/* Tombol Aksi */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewBackupData(null)}
                className="px-4 py-2.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-muted transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-black shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
              >
                <span>{isRestoring ? "Mengembalikan..." : "Ya, Kembalikan Data Sekarang"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Panduan Langkah Demi Langkah Pindah HP / Perangkat */}
      {/* ======================================================== */}
      {isMigrateModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsMigrateModalOpen(false)}
        >
          <div 
            className="bg-surface text-fg p-6 sm:p-7 rounded-3xl w-full max-w-lg shadow-2xl relative border border-line space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📱</span>
                <div>
                  <h3 className="font-black text-base text-fg">Panduan Pindah HP / Perangkat</h3>
                  <p className="text-xs text-muted">Bawa data usaha Anda ke HP baru dalam 4 langkah mudah.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsMigrateModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-card hover:bg-line text-muted flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* Keamanan & Privasi Data */}
            <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 space-y-1">
              <div className="flex items-center gap-2 text-amber-300 font-black text-xs">
                <span>🔒 Keamanan & Privasi Data</span>
              </div>
              <p className="text-[11px] text-amber-200/90 leading-relaxed">
                File cadangan berisi data keuangan, riwayat penjualan, dan nama pelanggan usaha Anda. Simpan file hanya di tempat pribadi (seperti chat WhatsApp ke nomor Anda sendiri atau Google Drive pribadi). <strong>Jangan bagikan file ini ke grup publik atau pihak yang tidak berwenang.</strong>
              </p>
            </div>

            {/* Steps Container */}
            <div className="space-y-4 text-xs">
              {/* Langkah 1 */}
              <div className="p-4 rounded-2xl bg-card border border-line/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  1
                </div>
                <div className="space-y-1.5 flex-1">
                  <h4 className="font-black text-fg text-sm">Di HP Lama: Simpan Data</h4>
                  <p className="text-muted leading-relaxed">
                    Buka SakuNota di HP lama, lalu tekan tombol <strong>Cadangkan Sekarang</strong> untuk mengunduh file cadangan data usaha Anda.
                  </p>
                  <button
                    type="button"
                    onClick={handleExportBackup}
                    disabled={isExporting}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/20 hover:bg-accent/30 text-accent-text font-bold text-xs mt-1 transition-colors"
                  >
                    <span>📥</span>
                    <span>{isExporting ? "Menyiapkan File..." : "Unduh File Cadangan Sekarang"}</span>
                  </button>
                </div>
              </div>

              {/* Langkah 2 */}
              <div className="p-4 rounded-2xl bg-card border border-line/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  2
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-black text-fg text-sm">Kirim File ke HP Baru</h4>
                  <p className="text-muted leading-relaxed">
                    Kirim file cadangan yang baru saja diunduh ke HP baru. Cara paling praktis: kirim via chat <strong>WhatsApp</strong> ke nomor sendiri, atau simpan di <strong>Google Drive</strong>.
                  </p>
                </div>
              </div>

              {/* Langkah 3 */}
              <div className="p-4 rounded-2xl bg-card border border-line/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  3
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-black text-fg text-sm">Di HP Baru: Kembalikan Data</h4>
                  <p className="text-muted leading-relaxed">
                    Buka SakuNota di browser HP baru (misal Google Chrome). Buka menu <strong>Data & Cadangan</strong>, lalu tekan tombol <strong>Pilih File Cadangan</strong> dan pilih file tadi.
                  </p>
                </div>
              </div>

              {/* Langkah 4 */}
              <div className="p-4 rounded-2xl bg-card border border-line/60 flex items-start gap-3">
                <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                  ✓
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-black text-emerald-400 text-sm">Selesai & Siap Jualan</h4>
                  <p className="text-muted leading-relaxed">
                    Seluruh menu, daftar meja, dan riwayat usaha Anda langsung aktif di HP baru. Jangan lupa pilih menu <strong>Tambahkan ke Layar Utama</strong> di browser agar memiliki ikon aplikasi kasir.
                  </p>
                </div>
              </div>
            </div>

            {/* Pemindahan Lisensi Berbayar */}
            <div className="p-3.5 rounded-2xl bg-card border border-line/60 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-fg text-xs flex items-center gap-1.5">
                  <span>🔑 Pemindahan Lisensi SakuNota</span>
                </h4>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-black text-[10px] tracking-wider uppercase">
                  Belum Tersedia Otomatis
                </span>
              </div>
              <p className="text-[11px] text-muted leading-relaxed">
                Panduan 4 langkah di atas untuk memindahkan <strong>data catatan usaha</strong> Anda. Pemindahan lisensi berbayar antar-perangkat belum tersedia otomatis dan akan dibantu manual oleh Customer Support saat masa rilis komersial.
              </p>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMigrateModalOpen(false)}
                className="w-full py-3 rounded-2xl bg-card hover:bg-line text-xs font-bold text-fg border border-line transition-colors text-center"
              >
                Saya Mengerti
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Konfirmasi Hapus Seluruh Riwayat Penjualan & Shift */}
      {/* ======================================================== */}
      {isResetModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div 
            className="bg-surface text-fg p-6 rounded-3xl w-full max-w-md shadow-2xl relative border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <h3 className="font-black text-base text-red-400">Hapus Seluruh Riwayat Penjualan & Shift?</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-card hover:bg-line text-muted flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-red-950/40 border border-red-800/60 text-xs text-red-200 space-y-2 leading-relaxed">
              <p className="font-bold text-red-300">
                PERINGATAN: Tindakan ini permanen dan tidak dapat dibatalkan!
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-red-200/90">
                <li>
                  Akan menghapus: <strong>{businessCounts.transaksi} nota transaksi</strong>, pembayaran, bukti bayar, dan <strong>{businessCounts.shift} riwayat shift</strong>.
                </li>
                <li>
                  Tetap tersimpan: <strong>{businessCounts.menu} menu</strong> dan <strong>{businessCounts.meja} denah meja</strong>.
                </li>
              </ul>
              <p className="text-[11px] text-amber-200 font-semibold">
                Jangan gunakan fitur ini jika Anda sudah mulai berjualan nyata kecuali telah mencadangkan file data Anda sebelumnya.
              </p>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4 pt-1">
              <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-card border border-line cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={confirmDeleteChecked}
                  onChange={(e) => {
                    setConfirmDeleteChecked(e.target.checked);
                    setResetPinError("");
                  }}
                  className="mt-0.5 rounded border-line text-red-600 focus:ring-red-500 cursor-pointer w-4 h-4"
                />
                <span className="text-xs text-fg font-medium leading-tight">
                  Saya mengerti bahwa seluruh data penjualan dan shift akan dihapus permanen.
                </span>
              </label>

              <div>
                <label className="text-[11px] font-bold text-muted block mb-1">
                  Masukkan PIN Admin untuk otorisasi:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  autoFocus
                  placeholder="Masukkan PIN Admin"
                  value={resetPinInput}
                  onChange={(e) => {
                    setResetPinInput(e.target.value);
                    setResetPinError("");
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-card border border-line text-fg text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              {resetPinError && (
                <p className="text-[11px] font-bold text-red-400">{resetPinError}</p>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-muted transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={!confirmDeleteChecked}
                  className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-red-600/20"
                >
                  Hapus Permanen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
