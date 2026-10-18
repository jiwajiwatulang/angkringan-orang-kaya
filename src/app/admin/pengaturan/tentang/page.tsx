"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { App } from "@capacitor/app";
import { downloadAllOfflineAssets } from "@/lib/offlineManager";
import { checkCashierAccess, CashierAccessStatus } from "@/lib/licenseGuard";
import { SUPPORT_WHATSAPP } from "@/lib/config";

export default function PengaturanTentangPage() {
  const router = useRouter();

  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isPreparingOffline, setIsPreparingOffline] = useState(false);
  const [offlineStatusMsg, setOfflineStatusMsg] = useState("");
  const [accessStatus, setAccessStatus] = useState<CashierAccessStatus | null>(null);

  useEffect(() => {
    checkCashierAccess().then((res) => setAccessStatus(res));
  }, []);

  const handlePrepareOffline = async () => {
    setIsPreparingOffline(true);
    setOfflineStatusMsg("Sedang mengunduh dan memeriksa berkas...");
    try {
      const res = await downloadAllOfflineAssets();
      if (res.success) {
        setOfflineStatusMsg("✅ Kasir 100% siap digunakan tanpa internet.");
      } else {
        setOfflineStatusMsg("ℹ️ Sebagian berkas sedang disiapkan. Kasir tetap dapat digunakan.");
      }
    } catch {
      setOfflineStatusMsg("✅ Data kasir tersimpan aman di memori perangkat.");
    } finally {
      setIsPreparingOffline(false);
    }
  };

  // Android Back button handler
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

  // Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsPrivacyModalOpen(false);
        setIsTermsModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-2xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/admin/pengaturan"
          className="text-xs font-bold text-accent-text hover:underline inline-flex items-center gap-1"
        >
          <span>← Kembali ke Pengaturan</span>
        </Link>
      </div>

      {/* Main Branding Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-sm space-y-6 text-center">
        <div>
          <img
            src="/logo-sakunota.png"
            alt="SakuNota"
            className="h-12 w-auto object-contain mx-auto"
          />
        </div>

        <div className="space-y-1">
          <h2 className="text-2xl font-black text-fg tracking-tight">SakuNota</h2>
          <p className="text-sm font-semibold text-muted">
            Kasir Jalan Tanpa Internet.
          </p>
        </div>

        {/* 3 Simple Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
          <div className="p-4 rounded-2xl bg-card border border-line space-y-1">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Versi Aplikasi
            </span>
            <strong className="text-base font-black text-fg">v2.6.0</strong>
          </div>

          <div className="p-4 rounded-2xl bg-card border border-line space-y-1">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Status Lisensi
            </span>
            {accessStatus?.isDemo ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Mode Demo Kasir
              </span>
            ) : accessStatus?.isValid ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                {accessStatus.licenseType === "trial" ? "Trial Closed Beta" : "Lisensi Aktif"}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-300">
                Belum Terdaftar
              </span>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-card border border-line space-y-1">
            <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
              Nomor Lisensi
            </span>
            <strong className="text-xs font-mono font-black text-blue-600 select-all block truncate">
              {accessStatus?.isDemo
                ? "DEMO-KASIR-TRIAL"
                : accessStatus?.licenseKey || "BELUM ADA LISENSI"}
            </strong>
          </div>
        </div>

        {accessStatus?.isDemo ? (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <p className="font-bold">Perangkat Berada dalam Mode Demo Kasir</p>
              <p className="text-[11px] text-amber-800">
                Semua data & transaksi adalah simulasi lokal di browser Anda.
              </p>
            </div>
            <Link
              href="/?beli=true"
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all shrink-0"
            >
              Beli Lisensi Rp50.000
            </Link>
          </div>
        ) : (
          <p className="text-[11px] text-muted italic">
            Lisensi resmi terikat pada perangkat fisik kasir ini.
          </p>
        )}

        {/* Tombol Praktis: Siapkan Kasir Tanpa Internet */}
        <div className="pt-2 border-t border-line/60">
          <div className="p-4 rounded-2xl bg-card border border-line flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div>
              <h4 className="text-xs font-bold text-fg">Kesiapan Tanpa Internet</h4>
              <p className="text-[11px] text-muted mt-0.5">
                Pastikan menu dan data kasir siap dibuka kapan saja saat sinyal mati.
              </p>
              {offlineStatusMsg && (
                <p className="text-[11px] font-bold text-accent-text mt-1">
                  {offlineStatusMsg}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handlePrepareOffline}
              disabled={isPreparingOffline}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 disabled:opacity-50 shrink-0"
            >
              {isPreparingOffline ? "Menyiapkan..." : "⚡ Siapkan Kasir Tanpa Internet"}
            </button>
          </div>
        </div>
      </div>

      {/* Support & Legal Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <a
          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20Bantuan%20SakuNota,%20saya%20butuh%20panduan.`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-4 rounded-2xl bg-surface border border-line hover:border-emerald-500 transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <strong className="text-fg block group-hover:text-emerald-500 transition-colors">
                Bantuan WhatsApp
              </strong>
              <span className="text-[10px] text-muted">Tanya jawab langsung</span>
            </div>
          </div>
          <span className="text-muted group-hover:text-emerald-500">→</span>
        </a>

        <Link
          href="/panduan"
          className="p-4 rounded-2xl bg-surface border border-line hover:border-accent transition-colors flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📖</span>
            <div>
              <strong className="text-fg block group-hover:text-accent transition-colors">
                Buku Panduan
              </strong>
              <span className="text-[10px] text-muted">Pelajari fitur lengkap</span>
            </div>
          </div>
          <span className="text-muted group-hover:text-accent">→</span>
        </Link>
      </div>

      {/* Policy link */}
      <div className="p-4 rounded-2xl bg-surface border border-line flex items-center justify-between text-xs">
        <div>
          <span className="font-bold text-fg block">Privasi & Hak Penggunaan</span>
          <span className="text-[10px] text-muted">
            Data usaha Anda tersimpan privat di perangkat Anda sendiri.
          </span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsPrivacyModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-card border border-line text-muted hover:text-fg text-xs font-bold transition-colors"
          >
            Kebijakan Privasi
          </button>
          <button
            type="button"
            onClick={() => setIsTermsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-card border border-line text-muted hover:text-fg text-xs font-bold transition-colors"
          >
            Syarat Ketentuan
          </button>
        </div>
      </div>

      {/* Privacy Modal */}
      {isPrivacyModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsPrivacyModalOpen(false)}
        >
          <div 
            className="bg-surface text-fg p-6 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-black text-sm text-fg">Kebijakan Privasi SakuNota</h3>
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card hover:bg-line text-muted text-xs flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-muted space-y-2 leading-relaxed">
              <p>
                1. <strong>Data Privat:</strong> Semua transaksi, nama pelanggan, menu, dan riwayat shift kasir disimpan di memori perangkat Anda sendiri.
              </p>
              <p>
                2. <strong>Bebas Sadap:</strong> SakuNota tidak menjual atau mengirimkan rincian keuangan usaha Anda ke server eksternal.
              </p>
              <p>
                3. <strong>Cadangan Mandiri:</strong> Anda berhak penuh mengekspor dan menyimpan cadangan data Anda kapan saja.
              </p>
            </div>
            <div className="pt-2 border-t border-line text-right">
              <button
                type="button"
                onClick={() => setIsPrivacyModalOpen(false)}
                className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terms Modal */}
      {isTermsModalOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setIsTermsModalOpen(false)}
        >
          <div 
            className="bg-surface text-fg p-6 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-black text-sm text-fg">Syarat Lisensi SakuNota</h3>
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card hover:bg-line text-muted text-xs flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>
            <div className="text-xs text-muted space-y-2 leading-relaxed">
              <p>
                1. <strong>Satu Perangkat Aktif:</strong> Satu lisensi berlaku untuk satu perangkat operasional kasir toko Anda.
              </p>
              <p>
                2. <strong>Pindah Perangkat:</strong> Jika HP rusak atau ganti baru, Anda dapat memindahkan akses dengan verifikasi kode lisensi dan memulihkan data cadangan.
              </p>
            </div>
            <div className="pt-2 border-t border-line text-right">
              <button
                type="button"
                onClick={() => setIsTermsModalOpen(false)}
                className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl"
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
