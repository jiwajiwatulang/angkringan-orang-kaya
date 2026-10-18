"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { auditOfflineReadiness, downloadAllOfflineAssets, OfflineDiagnostics } from "@/lib/offlineManager";

interface InstallGuideSectionProps {
  className?: string;
  isEmbedded?: boolean;
}

export default function InstallGuideSection({
  className = "",
  isEmbedded = false,
}: InstallGuideSectionProps) {
  const [activeTab, setActiveTab] = useState<"android" | "iphone">("android");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [installSuccess, setInstallSuccess] = useState<boolean>(false);
  
  // Honest offline readiness state
  const [offlineStatus, setOfflineStatus] = useState<OfflineDiagnostics | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [downloadMsg, setDownloadMsg] = useState<string>("");

  // Detect iOS vs Android on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const ua = window.navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) {
        setActiveTab("iphone");
      } else {
        setActiveTab("android");
      }

      // Check if already running in standalone display mode
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;
      setIsInstalled(isStandalone);

      // Listen for browser install prompt (Android Chrome / Chromium)
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      const handleAppInstalled = () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setInstallSuccess(true);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstall);
      window.addEventListener("appinstalled", handleAppInstalled);

      // Perform initial honest offline audit
      runOfflineCheck();

      return () => {
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }
  }, []);

  const runOfflineCheck = async () => {
    setIsAuditing(true);
    try {
      const diag = await auditOfflineReadiness();
      setOfflineStatus(diag);
    } catch {
      // safe fallback
    } finally {
      setIsAuditing(false);
    }
  };

  const handleManualDownloadOffline = async () => {
    setIsDownloading(true);
    setDownloadMsg("Menyimpan seluruh berkas kasir ke memori HP...");
    try {
      const res = await downloadAllOfflineAssets((completed, total) => {
        setDownloadMsg(`Menyimpan berkas kasir: ${completed}/${total} file...`);
      });
      if (res.success) {
        setDownloadMsg("Semua berkas kasir berhasil disimpan! Kasir siap digunakan tanpa internet.");
      } else {
        setDownloadMsg(`Sebagian berkas belum selesai (${res.failed.length} berkas). Hubungkan internet sebentar lalu coba lagi.`);
      }
      await runOfflineCheck();
    } catch {
      setDownloadMsg("Gagal menyimpan berkas. Periksa koneksi internet Anda.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleTriggerInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallSuccess(true);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div id="pasang-hp" className={`space-y-6 ${className}`}>
      {/* Header Info */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-800">
          <span>📱</span>
          <span>Aplikasi Kasir di Layar Utama HP</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
          Pasang SakuNota di HP
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Buka kasir secepat kilat langsung dari layar utama ponsel Anda tanpa harus mengetik alamat website. Praktis, ringan, dan berjalan tanpa internet.
        </p>
      </div>

      {/* Direct Install Button or Status Banner */}
      <div className="max-w-xl mx-auto">
        {isInstalled ? (
          <div className="flex items-center justify-center gap-3 p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-semibold shadow-sm">
            <span className="text-lg">✅</span>
            <span>SakuNota sudah terpasang di HP ini. Buka langsung melalui ikon di layar utama.</span>
          </div>
        ) : deferredPrompt ? (
          <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-500 rounded-2xl text-center space-y-2.5 shadow-md">
            <p className="text-xs sm:text-sm font-bold text-blue-900 dark:text-blue-200">
              Perangkat Anda mendukung pemasangan langsung:
            </p>
            <button
              type="button"
              onClick={handleTriggerInstall}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-extrabold text-sm rounded-xl shadow-md transition-all inline-flex items-center justify-center gap-2"
            >
              <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20H6zM10 18h4" /></svg></span>
              <span>Pasang SakuNota Sekarang</span>
            </button>
            <p className="text-[11px] text-muted">
              Ikon SakuNota akan langsung ditambahkan ke layar utama ponsel Anda.
            </p>
          </div>
        ) : (
          <div className="p-3 bg-surface border border-line rounded-2xl text-center text-xs text-muted flex items-center justify-center gap-2">
            <span>ℹ️</span>
            <span>Untuk memasang di perangkat Anda, ikuti langkah mudah pada tab <strong>Android</strong> atau <strong>iPhone</strong> di bawah.</span>
          </div>
        )}

        {installSuccess && (
          <div className="mt-3 p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-xl text-center text-xs text-emerald-800 dark:text-emerald-200 font-bold">
            🎉 Pemasangan berhasil! Cari ikon <strong>SakuNota</strong> di layar utama ponsel Anda.
          </div>
        )}
      </div>

      {/* Device Tabs: Android & iPhone */}
      <div className="max-w-xl mx-auto bg-card border border-line rounded-3xl p-4 sm:p-6 shadow-sm space-y-5">
        <div className="flex border-b border-line pb-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("android")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "android"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-surface hover:bg-card text-muted hover:text-fg border border-line"
            }`}
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20H6zM10 18h4" /></svg></span>
            <span>Android (Google Chrome)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("iphone")}
            className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === "iphone"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-surface hover:bg-card text-muted hover:text-fg border border-line"
            }`}
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20H6zM10 18h4" /></svg></span>
            <span>iPhone (Safari)</span>
          </button>
        </div>

        {/* Tab Content: Android */}
        {activeTab === "android" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Langkah Resmi Pemasangan di HP Android:</span>
            </div>

            <ol className="space-y-3 text-xs sm:text-sm text-fg">
              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">1</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Buka SakuNota menggunakan Google Chrome</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Pastikan Anda membuka website resmi SakuNota di aplikasi Google Chrome asli (bukan peramban bawaan chat WhatsApp atau Instagram).
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Ketuk menu tiga titik (⋮)</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Tombol menu titik tiga terletak di pojok kanan atas peramban Chrome Anda.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Pilih &ldquo;Instal aplikasi&rdquo; atau &ldquo;Tambahkan ke layar utama&rdquo;</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Pilih menu sesuai versi Chrome yang Anda gunakan.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">4</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Ketuk Instal / Tambahkan</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Konfirmasi pemasangan pada jendela notifikasi yang muncul di layar.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">5</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Ikon SakuNota muncul di layar utama</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Buka kasir kapan saja langsung dari ikon SakuNota di layar ponsel Anda seperti aplikasi kasir pada umumnya.
                  </span>
                </div>
              </li>
            </ol>
          </div>
        )}

        {/* Tab Content: iPhone */}
        {activeTab === "iphone" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 dark:text-blue-400">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span>
              <span>Langkah Resmi Pemasangan di iPhone & iPad:</span>
            </div>

            <ol className="space-y-3 text-xs sm:text-sm text-fg">
              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">1</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Buka SakuNota menggunakan Safari</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Apple mewajibkan penggunaan peramban Safari asli untuk menambahkan aplikasi ke Layar Utama iPhone.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">2</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Ketuk tombol Bagikan (ikon kotak &amp; panah ke atas)</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Tombol Bagikan (Share ⎋) berada di bilah menu bagian bawah layar Safari iPhone Anda.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">3</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Pilih &ldquo;Tambahkan ke Layar Utama&rdquo;</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Gulir sedikit ke bawah pada menu bagikan hingga menemukan pilihan dengan ikon tanda tambah (+).
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-surface border border-line rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center">4</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Aktifkan &ldquo;Buka sebagai Aplikasi&rdquo; jika tersedia</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Pada pembaruan iOS terbaru, pastikan opsi membuka sebagai jendela aplikasi penuh dalam keadaan aktif.
                  </span>
                </div>
              </li>

              <li className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black flex items-center justify-center">5</span>
                <div>
                  <strong className="block text-fg font-extrabold mb-0.5">Ketuk Tambah di pojok kanan atas</strong>
                  <span className="text-muted text-[11px] sm:text-xs">
                    Ikon resmi <strong>SakuNota</strong> langsung muncul di layar utama iPhone Anda dan siap dibuka dalam layar penuh.
                  </span>
                </div>
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Honest Offline Readiness Check */}
      <div className="max-w-xl mx-auto bg-surface border border-line rounded-3xl p-4 sm:p-5 space-y-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 border-b border-line pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">⚡</span>
            <h3 className="text-xs sm:text-sm font-extrabold text-fg">
              Pemeriksaan Kesiapan Tanpa Internet (Offline)
            </h3>
          </div>
          <button
            type="button"
            onClick={runOfflineCheck}
            disabled={isAuditing}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 5h14v14H5zM9 9h6M9 13h6M9 17h3" /></svg></span>
            <span>{isAuditing ? "Memeriksa..." : "Periksa Ulang"}</span>
          </button>
        </div>

        {offlineStatus ? (
          offlineStatus.isFullyPrecached ? (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1 text-emerald-800 dark:text-emerald-300 text-xs">
              <div className="font-extrabold flex items-center gap-1.5">
                <span>✅</span>
                <span>Kasir Siap Digunakan Tanpa Internet</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-400 leading-relaxed">
                Seluruh {offlineStatus.cachedAssetsCount} berkas tampilan dan sistem kasir telah lengkap tersimpan di memori HP Anda. Anda dapat mematikan data internet atau mengaktifkan mode pesawat dan kasir tetap berfungsi normal.
              </p>
            </div>
          ) : (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2 text-amber-900 dark:text-amber-200 text-xs">
              <div className="font-extrabold flex items-center gap-1.5">
                <span>⏳</span>
                <span>Sebagian Berkas Kasir Sedang Disimpan</span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                Tersimpan {offlineStatus.cachedAssetsCount} dari {offlineStatus.totalExpectedAssets} berkas di memori HP. Agar kasir dapat digunakan 100% tanpa internet, pastikan HP Anda terhubung internet sebentar hingga semua berkas selesai disimpan.
              </p>
              <button
                type="button"
                onClick={handleManualDownloadOffline}
                disabled={isDownloading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold rounded-xl text-xs transition-all shadow-sm"
              >
                {isDownloading ? "Menyimpan Berkas..." : " Simpan Berkas Kasir Sekarang"}
              </button>
              {downloadMsg && (
                <p className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                  {downloadMsg}
                </p>
              )}
            </div>
          )
        ) : (
          <div className="text-xs text-muted py-2 text-center">
            Memeriksa penyimpanan lokal perangkat...
          </div>
        )}
      </div>

      {/* Troubleshooting & Business Data Protection FAQ */}
      <div className="max-w-xl mx-auto space-y-3">
        <h4 className="text-xs font-black uppercase tracking-wider text-muted px-1">
          Pertanyaan &amp; Pemecahan Masalah
        </h4>

        <div className="bg-surface border border-line rounded-2xl p-4 space-y-3 text-xs text-muted leading-relaxed">
          <div>
            <strong className="block text-fg font-bold mb-1">
              ❓ Mengapa pilihan &ldquo;Instal&rdquo; atau &ldquo;Tambahkan ke Layar Utama&rdquo; tidak muncul?
            </strong>
            <p>
              • <strong>Di Android:</strong> Pastikan Anda membuka link melalui aplikasi <strong>Google Chrome</strong> resmi, bukan dari peramban bawaan dalam chat WhatsApp/Instagram, dan bukan dalam tab Penyamaran (Incognito). Jika Anda mengklik link dari WhatsApp, ketuk ikon titik tiga di pojok kanan atas chat lalu pilih &ldquo;Buka di Chrome&rdquo;.<br />
              • <strong>Di iPhone:</strong> Apple mewajibkan penggunaan peramban <strong>Safari</strong> untuk memasang aplikasi ke layar utama. Browser lain di iOS (seperti Chrome iOS) tidak memiliki izin dari Apple untuk menambahkan ikon ke layar utama.
            </p>
          </div>

          <div className="border-t border-line pt-3">
            <strong className="block text-fg font-bold mb-1">
              🛡️ Apakah data penjualan, barang, dan nota saya akan hilang saat aplikasi diperbarui?
            </strong>
            <p>
              <strong>Sama sekali tidak.</strong> Seluruh data barang jualan, harga, transaksi, nota, dan shift kasir disimpan secara persisten di database aman ponsel Anda. Pembaruan aplikasi hanya memperbarui tampilan dan fitur kasir tanpa pernah mengubah atau menghapus data usaha Anda.
            </p>
          </div>

          <div className="border-t border-line pt-3">
            <strong className="block text-fg font-bold mb-1">
              🚀 Halaman apa yang pertama kali terbuka saat ikon SakuNota ditekan?
            </strong>
            <p>
              Ikon SakuNota di layar utama langsung mengarahkan Anda ke <strong>meja kasir (POS)</strong> yang siap melayani pembeli, bukan halaman beranda ataupun halaman pemilik.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
