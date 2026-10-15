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
import { App } from "@capacitor/app";

export default function PengaturanDataPage() {
  const router = useRouter();
  const { storeSettings, refreshSettings, showToast } = useAdmin();

  const [lastBackupDate, setLastBackupDate] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPinInput, setResetPinInput] = useState("");
  const [resetPinError, setResetPinError] = useState("");

  // Preview Restore Modal State
  const [previewBackupData, setPreviewBackupData] = useState<any | null>(null);
  const [previewStats, setPreviewStats] = useState<any | null>(null);
  const [previewFileName, setPreviewFileName] = useState("");
  const [previewFileSize, setPreviewFileSize] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);

  // Undo / Pre-restore Snapshot State
  const [preRestoreSnapshot, setPreRestoreSnapshot] = useState<{ timestamp: string; data: any } | null>(null);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedDate = localStorage.getItem("sakunota_last_backup_date");
    if (savedDate) setLastBackupDate(savedDate);

    const snapshot = getPreRestoreSnapshot();
    if (snapshot) setPreRestoreSnapshot(snapshot);
  }, []);

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (previewBackupData) {
          setPreviewBackupData(null);
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
  }, [previewBackupData, isResetModalOpen, router]);

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

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const validation = validateBackupSchema(json);

      if (!validation.isValid) {
        alert("Validasi Gagal: " + validation.error);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      setPreviewFileName(file.name);
      setPreviewFileSize(file.size);
      setPreviewStats(validation.stats);
      setPreviewBackupData(json);
    } catch (err: any) {
      alert("File tidak dapat dibaca sebagai JSON cadangan SakuNota yang valid: " + err.message);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleConfirmRestore = async () => {
    if (!previewBackupData) return;
    setIsRestoring(true);

    try {
      await importAllData(previewBackupData);
      await refreshSettings();
      showToast("Data berhasil dipulihkan dari cadangan & diverifikasi!", "success");
      
      const newSnapshot = getPreRestoreSnapshot();
      if (newSnapshot) setPreRestoreSnapshot(newSnapshot);

      setPreviewBackupData(null);
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      alert("Gagal memulihkan file:\n" + err.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRollbackSnapshot = async () => {
    if (!preRestoreSnapshot) return;

    if (!window.confirm("Apakah Anda yakin ingin membatalkan pemulihan terakhir dan mengembalikan data sebelum restore dilakukan?")) {
      return;
    }

    setIsRollingBack(true);
    try {
      await rollbackPreRestoreBackup();
      await refreshSettings();
      setPreRestoreSnapshot(null);
      showToast("Database berhasil dikembalikan ke kondisi sebelum pemulihan!", "info");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: any) {
      alert("Gagal mengembalikan snapshot: " + err.message);
    } finally {
      setIsRollingBack(false);
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
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}`
                : "Belum pernah mencadangkan database. Sangat disarankan untuk segera ekspor file cadangan."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportBackup}
          disabled={isExporting}
          className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 shrink-0 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <span>📥</span>
          <span>{isExporting ? "Menyiapkan File..." : "Unduh Cadangan Sekarang"}</span>
        </button>
      </div>

      {/* Undo / Rollback Snapshot Card (if available) */}
      {preRestoreSnapshot && (
        <div className="p-5 rounded-3xl bg-amber-950/30 border border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">↩️</span>
            <div>
              <h4 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                Snapshot Darurat Sebelum Pemulihan Tersedia
              </h4>
              <p className="text-xs text-amber-200/80 mt-0.5 leading-relaxed">
                Tersimpan otomatis pada <strong>{new Date(preRestoreSnapshot.timestamp).toLocaleString("id-ID")}</strong> sebelum pemulihan terakhir. Jika file yang Anda pulihkan salah, Anda dapat membatalkannya sekarang.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRollbackSnapshot}
            disabled={isRollingBack}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl transition-all shadow-md shrink-0 disabled:opacity-50"
          >
            {isRollingBack ? "Mengembalikan..." : "Batalkan Pemulihan Terakhir"}
          </button>
        </div>
      )}

      {/* Two Column Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Export Card */}
        <div className="p-6 rounded-3xl bg-surface border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="w-12 h-12 rounded-2xl bg-accent/20 text-accent-text flex items-center justify-center text-2xl">
              📤
            </span>
            <h3 className="font-black text-lg text-fg">Ekspor Database Lengkap</h3>
            <p className="text-xs text-muted leading-relaxed">
              Menghasilkan satu file berkas <code>.JSON</code> yang memuat seluruh menu, varian, meja, bukti pembayaran, shift kasir, dan riwayat transaksi secara utuh dengan validasi checksum.
            </p>
          </div>

          <div className="pt-4 border-t border-line space-y-3">
            <button
              type="button"
              onClick={handleExportBackup}
              disabled={isExporting}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>💾</span>
              <span>{isExporting ? "Memproses Data..." : "Ekspor File Cadangan (.JSON)"}</span>
            </button>
            <p className="text-[10px] text-muted text-center">
              Aman disimpan di Google Drive, Flashdisk, WhatsApp, atau folder Download HP.
            </p>
          </div>
        </div>

        {/* Import Card */}
        <div className="p-6 rounded-3xl bg-surface border border-line space-y-4 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-2xl">
              📥
            </span>
            <h3 className="font-black text-lg text-fg">Pulihkan Database dari Cadangan</h3>
            <p className="text-xs text-muted leading-relaxed">
              Memulihkan data kasir dari file <code>.JSON</code> sebelumnya. Dilengkapi pratinjau data, validasi skema, dan pembuatan snapshot otomatis untuk mencegah kehilangan data.
            </p>
          </div>

          <div className="pt-4 border-t border-line space-y-3">
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
              className="w-full py-3 bg-card hover:bg-line text-fg text-xs font-black rounded-2xl border border-line transition-all flex items-center justify-center gap-2 cursor-pointer text-center select-none"
            >
              <span>📂</span>
              <span>Pilih File Cadangan (.JSON)</span>
            </label>
            <p className="text-[10px] text-muted text-center">
              Data akan dipratinjau terlebih dahulu sebelum diterapkan ke database.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone: Reset Transaksi Demo */}
      <div className="p-6 rounded-3xl bg-red-950/20 border border-red-900/40 space-y-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-2xl bg-red-900/40 text-red-400 flex items-center justify-center text-xl">
            ⚠️
          </span>
          <div>
            <h3 className="font-black text-base text-red-300">Pembersihan Transaksi Demo</h3>
            <p className="text-xs text-red-400/80 mt-0.5">
              Hapus seluruh riwayat pesanan demo sebelum mulai beroperasi resmi. Menu dan meja tidak akan terhapus.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-red-900/30 flex items-center justify-between">
          <p className="text-[11px] text-muted max-w-md">
            Tindakan ini permanen. Pastikan Anda telah mengunduh cadangan sebelum membersihkan data.
          </p>
          <button
            type="button"
            onClick={() => {
              setResetPinInput("");
              setResetPinError("");
              setIsResetModalOpen(true);
            }}
            className="px-4 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 shrink-0"
          >
            Bersihkan Transaksi
          </button>
        </div>
      </div>

      {/* Modal Pratinjau Restore */}
      {previewBackupData && previewStats && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewBackupData(null)}
        >
          <div 
            className="bg-card text-fg p-6 rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📋</span>
                <div>
                  <h3 className="font-black text-base text-fg">Pratinjau Cadangan Data</h3>
                  <p className="text-xs text-muted">Periksa ringkasan isi file sebelum melanjutkan pemulihan.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewBackupData(null)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-line text-muted flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            {/* File info */}
            <div className="p-3.5 rounded-2xl bg-surface border border-line space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Nama File:</span>
                <span className="font-mono font-bold text-fg truncate max-w-[240px]">{previewFileName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Ukuran Berkas:</span>
                <span className="font-mono text-fg">{(previewFileSize / 1024).toFixed(1)} KB</span>
              </div>
              {previewStats.storeName && (
                <div className="flex justify-between">
                  <span className="text-muted">Nama Usaha:</span>
                  <span className="font-bold text-accent-text">{previewStats.storeName}</span>
                </div>
              )}
            </div>

            {/* Counters Table */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
              <div className="p-3 rounded-2xl bg-surface border border-line">
                <span className="text-[10px] text-muted uppercase font-bold block">Katalog Menu</span>
                <strong className="text-lg font-black text-fg">{previewStats.menus} item</strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-line">
                <span className="text-[10px] text-muted uppercase font-bold block">Daftar Meja</span>
                <strong className="text-lg font-black text-fg">{previewStats.tables} meja</strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-line">
                <span className="text-[10px] text-muted uppercase font-bold block">Riwayat Nota</span>
                <strong className="text-lg font-black text-fg">{previewStats.orders} transaksi</strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-line">
                <span className="text-[10px] text-muted uppercase font-bold block">Catatan Bayar</span>
                <strong className="text-lg font-black text-fg">{previewStats.payments} data</strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-line">
                <span className="text-[10px] text-muted uppercase font-bold block">Bukti Pembayaran</span>
                <strong className="text-lg font-black text-emerald-400">{previewStats.proofs} bukti</strong>
              </div>

              <div className="p-3 rounded-2xl bg-surface border border-line">
                <span className="text-[10px] text-muted uppercase font-bold block">Rekap Shift</span>
                <strong className="text-lg font-black text-fg">{previewStats.shifts} shift</strong>
              </div>
            </div>

            {/* Safety guarantee */}
            <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-800/40 text-[11px] text-emerald-200/90 leading-relaxed flex items-start gap-2.5">
              <span className="text-base shrink-0">🛡️</span>
              <div>
                <strong>Perlindungan Data Otomatis:</strong> Sistem akan otomatis mengambil snapshot cadangan data Anda saat ini sebelum menimpa database. Jika pemulihan ini tidak sesuai, Anda dapat membatalkannya melalui tombol Undo.
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-line flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewBackupData(null)}
                className="px-4 py-2.5 bg-surface hover:bg-line text-fg text-xs font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl transition-all shadow-md shadow-accent/20 disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isRestoring ? "Memulihkan..." : "Konfirmasi & Pulihkan Database"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Reset Transaksi */}
      {isResetModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsResetModalOpen(false)}
        >
          <div 
            className="bg-card text-fg p-6 rounded-3xl w-full max-w-sm shadow-2xl relative flex flex-col border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="font-black text-base text-fg">Konfirmasi PIN Admin</h3>
                <p className="text-xs text-muted">Masukkan PIN Admin untuk mereset seluruh transaksi.</p>
              </div>
            </div>

            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={6}
                  autoFocus
                  placeholder="PIN Admin"
                  value={resetPinInput}
                  onChange={(e) => {
                    setResetPinInput(e.target.value);
                    setResetPinError("");
                  }}
                  className="w-full bg-surface border border-line rounded-xl p-3 text-center text-xl tracking-widest font-mono font-bold text-fg outline-none focus:border-red-500"
                />
                {resetPinError && (
                  <p className="text-xs text-red-400 font-bold mt-1 text-center">{resetPinError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="flex-1 py-2.5 bg-surface hover:bg-line text-fg text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black rounded-xl transition-all shadow-md"
                >
                  Hapus Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
