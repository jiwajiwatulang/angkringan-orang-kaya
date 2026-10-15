"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export default function PengaturanTentangPage() {
  const router = useRouter();

  const [isOnline, setIsOnline] = useState(true);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [storageUsage, setStorageUsage] = useState<string>("Memeriksa...");
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

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
                <h3 className="text-xl font-black text-fg">SakuNota POS</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-accent/20 text-accent-text font-black text-[11px] border border-accent/40">
                  v2.4.0 Pro
                </span>
              </div>
              <p className="text-xs text-muted mt-0.5">
                Aplikasi Kasir Pintar UMKM, Kafe, Angkringan & Ritel
              </p>
            </div>
          </div>

          {/* Live Network Status Indicator */}
          <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-card border border-line self-start sm:self-auto">
            <span
              className={`w-3 h-3 rounded-full shrink-0 ${
                isOnline ? "bg-emerald-500 shadow-md shadow-emerald-500/40 animate-pulse" : "bg-amber-500"
              }`}
            />
            <div className="text-xs">
              <span className="text-[10px] text-muted block font-bold uppercase leading-none">
                Status Jaringan
              </span>
              <strong className="text-fg font-black">
                {isOnline ? "Terhubung Online" : "Mode Offline (Aktif)"}
              </strong>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted leading-relaxed pt-2 border-t border-line">
          SakuNota dirancang khusus untuk kenyamanan transaksi UMKM di Indonesia. Beroperasi <strong>100% mandiri secara lokal (offline)</strong> tanpa ketergantungan koneksi internet, menjamin kasir Anda tetap dapat melayani pelanggan tanpa kendala sinyal.
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
          href="mailto:support@sakunota.id?subject=Permintaan%20Bantuan%20SakuNota%20POS"
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
                support@sakunota.id
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
                <span className="text-[10px] text-muted font-bold uppercase block">Basis Data</span>
                <strong className="text-fg font-mono">Dexie DB v8</strong>
              </div>

              <div className="p-3 rounded-2xl bg-card border border-line/60">
                <span className="text-[10px] text-muted font-bold uppercase block">Platform Runtime</span>
                <strong className="text-fg font-mono">{isNative ? "Android APK" : "Modern PWA"}</strong>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-card border border-line/60 text-xs">
              <span className="text-[10px] text-muted font-bold uppercase block">Kapasitas Penyimpanan IndexedDB</span>
              <strong className="text-fg font-mono">{storageUsage}</strong>
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
              <h4 className="font-bold text-fg">1. Penyimpanan Data 100% Offline</h4>
              <p>
                SakuNota beroperasi sepenuhnya secara lokal di perangkat Anda. Seluruh katalog menu, harga, pesanan, dan bukti transfer tersimpan aman di database IndexedDB perangkat. Pengembang tidak mengumpulkan, melihat, atau membagikan data keuangan usaha Anda ke pihak mana pun.
              </p>

              <h4 className="font-bold text-fg">2. Izin Perangkat (Bluetooth & Penyimpanan)</h4>
              <p>
                Aplikasi hanya meminta izin Bluetooth untuk menyambungkan struk ke printer thermal portabel kasir, dan izin penyimpanan untuk mengunduh berkas cadangan .JSON atau laporan Excel yang Anda minta.
              </p>

              <h4 className="font-bold text-fg">3. Cadangan & Tanggung Jawab Data</h4>
              <p>
                Karena tidak menggunakan server cloud pihak ketiga, keamanan data berada sepenuhnya dalam kendali Anda. Sangat disarankan untuk rutin mengekspor file cadangan melalui menu Cadangan & Pemulihan.
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
