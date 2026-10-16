"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { 
  auditOfflineReadiness, 
  requestPersistentStorage, 
  downloadAllOfflineAssets, 
  OfflineDiagnostics 
} from "@/lib/offlineManager";

export default function PengaturanTentangPage() {
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string>("Memeriksa...");
  const [isNative, setIsNative] = useState(false);
  const [offlineDiag, setOfflineDiag] = useState<OfflineDiagnostics | null>(null);
  const [isDownloadingAssets, setIsDownloadingAssets] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Audit offline & minta persistent storage otomatis
      const runAudit = async () => {
        await requestPersistentStorage();
        const diag = await auditOfflineReadiness();
        setOfflineDiag(diag);
      };
      runAudit();

      // Cek perkiraan penggunaan penyimpanan lokal
      if (navigator.storage && navigator.storage.estimate) {
        navigator.storage.estimate().then((est) => {
          const usedMb = ((est.usage || 0) / (1024 * 1024)).toFixed(2);
          const quotaMb = ((est.quota || 0) / (1024 * 1024)).toFixed(0);
          setStorageUsage(`${usedMb} MB terpakai dari ${quotaMb} MB kuota lokal`);
        }).catch(() => {
          setStorageUsage("Penyimpanan lokal IndexedDB aktif");
        });
      } else {
        setStorageUsage("Penyimpanan lokal IndexedDB aktif");
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleDownloadOfflineAssets = async () => {
    setIsDownloadingAssets(true);
    setDownloadProgress({ current: 0, total: 100 });
    const res = await downloadAllOfflineAssets((curr, tot) => {
      setDownloadProgress({ current: curr, total: tot });
    });
    setIsDownloadingAssets(false);
    if (res.success) {
      alert(`Sukses: Seluruh ${res.total} aset offline berhasil diunduh dan diverifikasi 100% di memori perangkat!`);
    } else {
      const errCount = res.failed.length + res.missingAfterDownload.length;
      alert(`Peringatan: Pengunduhan belum lengkap (${errCount} file belum tersimpan). Aplikasi belum sepenuhnya siap offline. Pastikan koneksi internet stabil lalu coba lagi.`);
    }
    const diag = await auditOfflineReadiness();
    setOfflineDiag(diag);
  };

  // Back button
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (isPrivacyModalOpen) {
          setIsPrivacyModalOpen(false);
        } else if (isTermsModalOpen) {
          setIsTermsModalOpen(false);
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
  }, [isPrivacyModalOpen, isTermsModalOpen, router]);

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
          <span>ℹ️</span>
          <span>Tentang SakuNota POS</span>
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Informasi aplikasi, kontak bantuan resmi, status konektivitas, dan ketentuan privasi.
        </p>
      </div>

      {/* Main Branding Card */}
      <div className="p-6 rounded-3xl bg-surface border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-accent to-blue-400 text-white flex items-center justify-center text-3xl shadow-lg shadow-accent/20 shrink-0">
              🧾
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-fg">SakuNota</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] border border-emerald-500/40">
                  Rp65.000 Promo Lisensi
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Kasir tetap jalan, meski tanpa internet. Tanpa biaya bulanan.
              </p>
            </div>
          </div>

          {/* Live Network & Offline Readiness Badges */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-card border border-line">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  isOnline ? "bg-emerald-500 shadow-sm shadow-emerald-500/40 animate-pulse" : "bg-amber-500"
                }`}
              />
              <div className="text-[11px]">
                <span className="text-[9px] text-muted block font-bold uppercase leading-none">
                  Jaringan
                </span>
                <strong className="text-fg font-black">
                  {isOnline ? "Online" : "Offline"}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-card border border-line">
              <span
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  offlineDiag?.isFullyPrecached ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
              <div className="text-[11px]">
                <span className="text-[9px] text-muted block font-bold uppercase leading-none">
                  Cache Aset
                </span>
                <strong className="text-fg font-black">
                  {offlineDiag ? `${offlineDiag.cachedAssetsCount}/${offlineDiag.totalExpectedAssets} File` : "Memeriksa..."}
                </strong>
              </div>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted leading-relaxed pt-2 border-t border-line">
          SakuNota dirancang khusus untuk kenyamanan transaksi UMKM di Indonesia. Beroperasi <strong>mandiri secara lokal (offline-first)</strong> tanpa ketergantungan koneksi internet setelah instalasi awal, menjamin kasir Anda tetap dapat melayani pelanggan tanpa kendala sinyal.
        </p>
      </div>

      {/* Help & Support Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* WhatsApp Card */}
        <a
          href="https://wa.me/6281234567890?text=Halo%20Tim%20Support%20SakuNota,%20saya%20butuh%20bantuan%20terkait%20aplikasi%20kasir."
          target="_blank"
          rel="noopener noreferrer"
          className="p-5 rounded-3xl bg-surface border border-line hover:border-emerald-500/50 hover:shadow-lg transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              💬
            </span>
            <div>
              <h4 className="font-black text-sm text-fg group-hover:text-emerald-400 transition-colors">
                Bantuan WhatsApp
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Konsultasi & panduan teknis via chat resmi
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-emerald-400 group-hover:translate-x-1 transition-transform">
            Hubungi →
          </span>
        </a>

        {/* Email Card */}
        <a
          href="mailto:support@sakunota.my.id?subject=Permintaan%20Bantuan%20SakuNota%20POS"
          className="p-5 rounded-3xl bg-surface border border-line hover:border-accent/50 hover:shadow-lg transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-2xl bg-accent/20 text-accent-text flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              ✉️
            </span>
            <div>
              <h4 className="font-black text-sm text-fg group-hover:text-accent-text transition-colors">
                Email Dukungan
              </h4>
              <p className="text-xs text-muted mt-0.5">
                support@sakunota.my.id
              </p>
            </div>
          </div>
          <span className="text-xs font-black text-accent-text group-hover:translate-x-1 transition-transform">
            Kirim →
          </span>
        </a>
      </div>

      {/* Legal & Policy Links */}
      <div className="p-5 rounded-3xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🛡️</span>
          <div>
            <h4 className="text-xs font-black text-fg uppercase tracking-wider">
              Legalitas & Privasi Data
            </h4>
            <p className="text-xs text-muted mt-0.5">
              Data usaha Anda sepenuhnya milik Anda dan tidak pernah dikirim ke pihak ketiga.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="px-3.5 py-2 bg-card hover:bg-line text-fg font-bold text-xs rounded-xl border border-line transition-colors"
          >
            Kebijakan Privasi
          </button>
          <button
            type="button"
            onClick={() => setIsTermsModalOpen(true)}
            className="px-3.5 py-2 bg-card hover:bg-line text-fg font-bold text-xs rounded-xl border border-line transition-colors"
          >
            Syarat Lisensi
          </button>
        </div>
      </div>

      {/* Collapsible Developer Diagnostics Drawer */}
      <div className="rounded-3xl bg-surface border border-line overflow-hidden">
        <button
          type="button"
          onClick={() => setIsDiagnosticsOpen(!isDiagnosticsOpen)}
          className="w-full p-4 flex items-center justify-between text-left text-xs font-bold text-muted hover:text-fg hover:bg-card/40 transition-colors"
        >
          <span className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Diagnostik Teknis & Integritas Sistem (Khusus Tim IT)</span>
          </span>
          <span className="text-sm">{isDiagnosticsOpen ? "▲ Tutup" : "▼ Buka"}</span>
        </button>

        {isDiagnosticsOpen && (
          <div className="p-5 pt-0 border-t border-line/50 space-y-3 animate-in fade-in duration-150">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-3">
              <div className="p-3 rounded-2xl bg-card border border-line/60">
                <span className="text-[10px] text-muted font-bold uppercase block">Rilis Komersial</span>
                <strong className="text-fg font-mono">v2.4.0-release</strong>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-line/60">
                <span className="text-[10px] text-muted font-bold uppercase block">Git Build Commit</span>
                <strong className="text-accent-text font-mono">2b5f65f</strong>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-line/60">
                <span className="text-[10px] text-muted font-bold uppercase block">Data Usaha</span>
                <strong className="text-fg font-mono">Tersimpan di HP</strong>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-line/60">
                <span className="text-[10px] text-muted font-bold uppercase block">Tipe Aplikasi</span>
                <strong className="text-fg font-mono">{isNative ? "Aplikasi Android" : "Aplikasi Kasir Web"}</strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-card border border-line/60 text-xs">
              <span className="text-[10px] text-muted font-bold uppercase block">Penyimpanan Perangkat</span>
              <strong className="text-fg font-mono">{storageUsage}</strong>
            </div>

            {/* Offline Cache & Storage Persistence Details */}
            <div className="p-3.5 rounded-2xl bg-card border border-line/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] text-muted font-bold uppercase block">Status Penggunaan Tanpa Internet (Offline)</span>
                <p className="text-fg font-medium mt-0.5">
                  {offlineDiag ? `${offlineDiag.cachedAssetsCount} dari ${offlineDiag.totalExpectedAssets} aset siap offline (${offlineDiag.storageUsageMb} MB)` : "Sedang memeriksa..."}
                  {offlineDiag?.isPersistentStorage ? " • Perlindungan Data Aktif" : " • Penyimpanan Standar"}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {offlineDiag?.isPersistentStorage 
                    ? "✓ Data usaha terlindungi dari pembersihan otomatis browser. Tetap simpan cadangan berkala untuk keamanan optimal." 
                    : "ℹ Data usaha tersimpan di browser HP. Simpan cadangan secara berkala agar data tetap aman saat ganti HP."}
                </p>
                {offlineDiag && offlineDiag.missingAssets.length > 0 && (
                  <p className="text-[10px] text-rose-400 font-bold mt-1">
                    ⚠️ Ada {offlineDiag.missingAssets.length} file belum tersimpan. Klik tombol di kanan untuk menyiapkan offline.
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={isDownloadingAssets}
                onClick={handleDownloadOfflineAssets}
                className="px-3.5 py-2 bg-accent hover:bg-accent-hover disabled:bg-line text-white font-bold text-xs rounded-xl shadow-sm transition-all shrink-0 active:scale-95"
              >
                {isDownloadingAssets 
                  ? `Menyiapkan... (${downloadProgress?.current || 0}/${downloadProgress?.total || 0})`
                  : "⬇ Siapkan Penggunaan Offline"}
              </button>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Catatan Diagnostik: Seluruh skema database terlindungi transaksi ACID. Tidak ada data transaksi yang bocor keluar perangkat.
            </p>
          </div>
        )}
      </div>

      {/* Privacy Policy Modal */}
      {isPrivacyModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsPrivacyModalOpen(false)}
        >
          <div 
            className="bg-card text-fg p-6 rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-fg">Kebijakan Privasi SakuNota</h3>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-line text-muted flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 text-xs text-slate-300 space-y-3 leading-relaxed">
              <h4 className="font-bold text-fg">1. Penyimpanan Data Aman di Perangkat Anda</h4>
              <p>
                SakuNota beroperasi sepenuhnya secara lokal di perangkat kasir Anda. Seluruh menu, harga, pesanan, dan bukti transfer tersimpan aman di memori HP Anda. Pengembang tidak mengumpulkan, melihat, atau membagikan data keuangan usaha Anda ke pihak mana pun.
              </p>

              <h4 className="font-bold text-fg">2. Izin Perangkat (Bluetooth & Penyimpanan)</h4>
              <p>
                Aplikasi hanya meminta izin Bluetooth untuk menyambungkan struk ke printer thermal kasir, dan izin penyimpanan untuk mengunduh file cadangan data usaha atau laporan penjualan yang Anda minta.
              </p>

              <h4 className="font-bold text-fg">3. Tanggung Jawab Cadangan Data</h4>
              <p>
                Karena data tersimpan aman di HP Anda sendiri tanpa ketergantungan server luar, Anda memiliki kendali penuh atas data usaha Anda. Sangat disarankan untuk rutin menyimpan cadangan melalui menu Data & Cadangan.
              </p>
            </div>

            <div className="pt-3 border-t border-line text-right">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms of Use Modal */}
      {isTermsModalOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsTermsModalOpen(false)}
        >
          <div 
            className="bg-card text-fg p-6 rounded-3xl w-full max-w-lg shadow-2xl relative flex flex-col max-h-[85vh] border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-base text-fg">Syarat Lisensi & Penggunaan</h3>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-surface hover:bg-line text-muted flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 text-xs text-slate-300 space-y-3 leading-relaxed">
              <h4 className="font-bold text-fg">1. Hak Penggunaan Komersial</h4>
              <p>
                Lisensi SakuNota memberikan hak penuh kepada pemilik usaha (UMKM, kafe, restoran, toko) untuk menggunakan perangkat lunak ini dalam operasional transaksi penjualan harian.
              </p>

              <h4 className="font-bold text-fg">2. Tanpa Biaya Berlangganan Tersembunyi</h4>
              <p>
                SakuNota adalah solusi kasir mandiri tanpa biaya langganan bulanan wajib untuk fitur inti operasional POS kasir offline.
              </p>

              <h4 className="font-bold text-fg">3. Integritas Data Keuangan</h4>
              <p>
                Sistem menyediakan kalkulator pajak PBJT, biaya layanan, split bill, dan rekonsiliasi kas laci sesuai kaidah pembukuan UMKM Indonesia.
              </p>
            </div>

            <div className="pt-3 border-t border-line text-right">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-colors"
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
