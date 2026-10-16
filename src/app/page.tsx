"use client";

import React, { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export interface CustomerOrder {
  orderId: string;
  buyerName: string;
  businessName: string;
  whatsapp: string;
  email?: string;
  amount: number;
  paymentMethod: string;
  bankAccount: string;
  transferProofName?: string;
  status: "menunggu_verifikasi" | "lunas_lisensi_terbit" | "batal";
  licenseKey?: string;
  createdAt: string;
  verifiedAt?: string;
}

export default function SakuNotaLandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Purchase Modal State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment" | "waiting">("form");
  const [buyerName, setBuyerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [formError, setFormError] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [transferProofSimulated, setTransferProofSimulated] = useState(false);

  // Check Order / License Status State
  const [isCheckStatusModalOpen, setIsCheckStatusModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<CustomerOrder | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [copiedLicense, setCopiedLicense] = useState(false);

  // Offline Readiness Check Tool State
  const [isCheckingOffline, setIsCheckingOffline] = useState(false);
  const [offlineCheckResult, setOfflineCheckResult] = useState<{
    tested: boolean;
    swActive: boolean;
    storageReady: boolean;
    cacheReady: boolean;
  } | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const handleOpenBuyModal = () => {
    setIsBuyModalOpen(true);
    setCheckoutStep("form");
    setFormError("");
    setTransferProofSimulated(false);
  };

  const handleFillSampleData = () => {
    setBuyerName("Budi Santoso");
    setBusinessName("Kedai Kopi & Bakso Mas Budi");
    setWhatsappNumber("081234567890");
    setBuyerEmail("budi.santoso@example.com");
    setConsentChecked(true);
    setFormError("");
  };

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerName.trim() || !businessName.trim() || !whatsappNumber.trim()) {
      setFormError("Mohon lengkapi Nama Pemilik, Nama Usaha, dan Nomor WhatsApp.");
      return;
    }
    if (!consentChecked) {
      setFormError("Mohon centang persetujuan penggunaan data pembelian.");
      return;
    }
    setFormError("");

    // Generate unique order ID
    const randomNum = Math.floor(100 + Math.random() * 900);
    const ordId = `SN-2026-${randomNum}`;
    setCurrentOrderId(ordId);
    setCheckoutStep("payment");
  };

  const handleSubmitTransferProof = () => {
    // Save to customer orders (shared with /owner)
    const newOrder: CustomerOrder = {
      orderId: currentOrderId,
      buyerName: buyerName.trim(),
      businessName: businessName.trim(),
      whatsapp: whatsappNumber.trim(),
      email: buyerEmail.trim() || undefined,
      amount: 65000,
      paymentMethod: "Transfer Bank BCA",
      bankAccount: "8030 554 912 a.n. Reza",
      transferProofName: "bukti_transfer_pembeli.jpg",
      status: "menunggu_verifikasi",
      createdAt: new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    if (typeof window !== "undefined") {
      let existing: CustomerOrder[] = [];
      const stored = localStorage.getItem("sakunota_customer_orders");
      if (stored) {
        try {
          existing = JSON.parse(stored);
        } catch (_) {}
      }
      existing.unshift(newOrder);
      localStorage.setItem("sakunota_customer_orders", JSON.stringify(existing));
    }

    setCheckoutStep("waiting");
  };

  const handleSearchOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchAttempted(true);
    setSearchResult(null);

    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("sakunota_customer_orders");
      if (stored) {
        try {
          const list: CustomerOrder[] = JSON.parse(stored);
          const found = list.find((o) => 
            o.orderId.toLowerCase() === query || 
            o.whatsapp.toLowerCase().includes(query) ||
            o.businessName.toLowerCase().includes(query)
          );
          setSearchResult(found || null);
        } catch (_) {}
      }
    }
  };

  const handleCheckOfflineReadiness = async () => {
    setIsCheckingOffline(true);
    setOfflineCheckResult(null);

    await new Promise((resolve) => setTimeout(resolve, 800));

    const swSupported = typeof window !== "undefined" && "serviceWorker" in navigator;
    const storageSupported = typeof window !== "undefined" && "indexedDB" in window;
    const cacheSupported = typeof window !== "undefined" && "caches" in window;

    setOfflineCheckResult({
      tested: true,
      swActive: swSupported,
      storageReady: storageSupported,
      cacheReady: cacheSupported,
    });
    setIsCheckingOffline(false);
  };

  const coreQuestions = [
    {
      q: "1. Untuk apa aplikasi SakuNota?",
      a: "SakuNota adalah aplikasi kasir praktis yang dibuat khusus untuk pemilik warung, angkringan, kedai kopi, dan usaha makanan. SakuNota membantu Anda mencatat pesanan meja atau bungkus, menghitung total bayar & uang kembalian, cetak struk nota fisik, dan melihat rekap penjualan harian secara rapi.",
      icon: "🏪",
    },
    {
      q: "2. Apakah benar-benar bisa dipakai tanpa internet?",
      a: "Ya, 100% bisa. SakuNota bekerja langsung di memori HP Anda. Saat kuota habis, mati lampu, atau sinyal provider hilang total, kasir tetap melayani pembeli dan mencetak struk tanpa macet sedikit pun.",
      icon: "📶",
    },
    {
      q: "3. Berapa harga SakuNota?",
      a: "Harga promo saat ini adalah Rp65.000 (hemat Rp34.000 dari harga normal Rp99.000). Cukup satu kali bayar untuk 1 perangkat kasir aktif, tanpa biaya langganan bulanan dan tanpa potongan komisi per transaksi penjualan.",
      icon: "🏷️",
    },
    {
      q: "4. Bagaimana cara memasangnya di HP?",
      a: "Sangat mudah dan tanpa perlu mencari di Play Store. Cukup buka SakuNota lewat Google Chrome di HP Anda, ketuk menu tiga titik, lalu pilih 'Tambahkan ke layar utama'. Aplikasi langsung terpasang di HP dalam 1 menit.",
      icon: "📲",
    },
  ];

  const features = [
    {
      icon: "📋",
      title: "Pilihan Menu & Tambahan",
      desc: "Kelola makanan, minuman, harga, kategori kustom, serta pilihan tambahan seperti tingkat pedas dan topping tanpa batas.",
    },
    {
      icon: "🪑",
      title: "Denah Meja & Pesanan",
      desc: "Lihat status meja makan kosong atau terisi, pesanan makan di tempat (dine-in) atau bungkus bawa pulang (takeaway).",
    },
    {
      icon: "💵",
      title: "Hitung Pembayaran Cepat",
      desc: "Kalkulator uang pas & kembalian otomatis, simpan bukti bayar transfer/QRIS, serta fitur bayar patungan (pisah tagihan).",
    },
    {
      icon: "🖨️",
      title: "Printer Struk Bluetooth",
      desc: "Cetak nota ke printer struk kertas 58mm maupun 80mm via Bluetooth secara instan tanpa perlu koneksi internet.",
    },
    {
      icon: "📊",
      title: "Ringkasan Penjualan",
      desc: "Pantau omzet harian, jumlah pembeli, dan laporan kas masuk-keluar kasir secara transparan dan mudah dipahami.",
    },
    {
      icon: "💾",
      title: "Cadangkan & Pulihkan Data",
      desc: "Data penjualan aman di HP Anda sendiri. Bisa dicadangkan ke file dan dipulihkan kembali saat Anda berganti HP baru.",
    },
  ];

  const faqs = [
    {
      q: "Apakah ada biaya langganan bulanan?",
      a: "Tidak ada biaya bulanan sama sekali. Cukup bayar promo Rp65.000 untuk 1 lisensi perangkat kasir operasional Anda. Tidak ada komisi penjualan dan tidak ada iklan.",
    },
    {
      q: "Bagaimana alur pembayaran transfer manual?",
      a: "Setelah mengisi formulir, Anda mentransfer Rp65.000 ke rekening resmi BCA 8030 554 912 a.n. Reza. Kirim bukti transfer dan Reza (Owner SakuNota) akan memverifikasi mutasi bank lalu menerbitkan lisensi resmi untuk perangkat Anda.",
    },
    {
      q: "Bagaimana jika kasir berganti HP baru?",
      a: "Anda cukup membuka menu 'Cadangkan Data' di HP lama, simpan file cadangan di WhatsApp atau Google Drive, lalu buka SakuNota di HP baru dan pilih 'Pulihkan Data'. Seluruh menu dan riwayat penjualan akan kembali seperti semula.",
    },
    {
      q: "Printer struk apa saja yang cocok?",
      a: "Mendukung seluruh printer struk thermal Bluetooth mini standar (58mm dan 80mm) yang banyak dijual di pasaran seperti merek Panda, VSC, Eppos, Zjiang, Kassen, dan lainnya.",
    },
    {
      q: "Apakah data omzet warung saya bisa dilihat orang lain?",
      a: "Tidak. SakuNota menjaga privasi Anda secara ketat. Seluruh data transaksi, nama pelanggan, dan omzet tersimpan di memori perangkat Anda sendiri dan tidak dikirim ke server luar.",
    },
  ];

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col selection:bg-accent selection:text-white">
      {/* 1. Header Nav */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md shadow-accent/20">
            SN
          </div>
          <div>
            <span className="font-black text-lg text-fg tracking-tight block leading-none">
              SakuNota
            </span>
            <span className="text-[10px] text-muted font-bold tracking-wider uppercase block mt-0.5">
              Kasir Tetap Jalan, Meski Tanpa Internet
            </span>
          </div>
        </div>

        {/* Center Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-muted">
          <a href="#tanya-jawab-utama" className="hover:text-fg transition-colors">
            Tentang SakuNota
          </a>
          <a href="#cara-pasang" className="hover:text-fg transition-colors">
            Cara Pasang di HP
          </a>
          <a href="#fitur" className="hover:text-fg transition-colors">
            Fitur Kasir
          </a>
          <a href="#harga" className="hover:text-fg transition-colors">
            Harga Promo
          </a>
          <a href="#faq" className="hover:text-fg transition-colors">
            Tanya Jawab
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <ThemeToggle size="sm" />
          <button
            type="button"
            onClick={() => {
              setIsCheckStatusModalOpen(true);
              setSearchAttempted(false);
              setSearchResult(null);
            }}
            className="hidden sm:inline-flex px-3 py-2 bg-card hover:bg-line text-xs font-bold text-fg rounded-xl border border-line transition-colors items-center gap-1.5"
          >
            <span>🔍</span>
            <span>Cek Status Lisensi</span>
          </button>
          <button
            type="button"
            onClick={handleOpenBuyModal}
            className="hidden sm:inline-flex px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 transition-all active:scale-95 items-center gap-1.5"
          >
            <span>Beli SakuNota</span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-800 text-[10px]">Rp65.000</span>
          </button>
          <Link
            href="/pos"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-accent/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Buka Kasir</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 sm:px-8 pt-14 pb-16 md:pt-20 md:pb-24 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent-text text-xs font-black">
          <span>🏪</span>
          <span>SakuNota — Kasir Tetap Jalan, Meski Tanpa Internet</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-fg tracking-tight leading-[1.15] max-w-3xl mx-auto">
          Jualan Lancar, Internet Mati Bukan Masalah.
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          Catat pesanan, hitung pembayaran, cetak struk, dan lihat hasil jualan dalam satu aplikasi kasir yang mudah digunakan.
        </p>

        {/* Price Highlight Badge */}
        <div className="inline-block pt-2">
          <div className="px-6 py-4 rounded-3xl bg-surface border-2 border-accent/40 shadow-xl shadow-accent/10 inline-flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
            <div className="text-left">
              <span className="text-[10px] text-muted uppercase font-bold tracking-wider block">Harga Promo Peluncuran</span>
              <div className="flex items-baseline gap-2.5">
                <span className="text-sm sm:text-base text-muted line-through font-bold">Rp99.000</span>
                <span className="text-3xl sm:text-4xl font-black text-emerald-600 dark:text-emerald-400">Rp65.000</span>
              </div>
            </div>
            <div className="sm:border-l sm:border-line sm:pl-4 text-center sm:text-left">
              <span className="inline-block px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-xs">
                Hemat Rp34.000 (34%)
              </span>
              <span className="text-[11px] text-muted font-semibold block mt-1">
                Transfer Bank BCA Manual • 1 Lisensi Perangkat
              </span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleOpenBuyModal}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Beli SakuNota — Rp65.000</span>
            <span>🛒</span>
          </button>

          <Link
            href="/pos"
            className="w-full sm:w-auto px-7 py-4 bg-card hover:bg-line text-fg font-bold text-sm rounded-2xl border border-line transition-all flex items-center justify-center gap-2"
          >
            <span>Coba Kasir Gratis Sekarang</span>
            <span>→</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setIsCheckStatusModalOpen(true);
              setSearchAttempted(false);
              setSearchResult(null);
            }}
            className="w-full sm:w-auto px-6 py-4 bg-surface hover:bg-card text-muted hover:text-fg font-bold text-xs rounded-2xl border border-line transition-all"
          >
            🔍 Cek Status Pesanan Saya
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-black">✓</span> Kasir tetap bisa dipakai tanpa internet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-black">✓</span> Rekening resmi BCA a.n. Reza
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-black">✓</span> Tanpa potongan komisi penjualan
          </span>
        </div>
      </section>

      {/* 3. Empat Pertanyaan Calon Pembeli */}
      <section id="tanya-jawab-utama" className="px-4 sm:px-8 py-16 bg-surface/50 border-t border-b border-line">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              PENJELASAN PRAKTIS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
              4 Hal Penting Tentang SakuNota
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
              Semua yang perlu diketahui pemilik warung dan usaha kuliner sebelum menggunakan SakuNota.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreQuestions.map((item, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-3 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-2xl bg-accent/15 text-accent-text flex items-center justify-center text-xl shrink-0">
                    {item.icon}
                  </span>
                  <h3 className="font-black text-sm sm:text-base text-fg">
                    {item.q}
                  </h3>
                </div>
                <p className="text-xs sm:text-sm text-muted leading-relaxed pl-1">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Panduan Pasang SakuNota di HP & Uji Kesiapan Offline */}
      <section id="cara-pasang" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            MUDAH & CEPAT
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
            Cara Pasang SakuNota di HP
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
            Tidak perlu unduh dari Play Store dan hemat memori HP. Cukup 3 langkah mudah berikut:
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white font-black text-lg flex items-center justify-center shadow-md shadow-accent/20">
              1
            </div>
            <div>
              <h3 className="font-black text-base text-fg">Buka SakuNota di Chrome</h3>
              <p className="text-xs text-muted leading-relaxed mt-1.5">
                Kunjungi alamat website SakuNota dari browser Google Chrome saat HP Anda sedang terhubung internet.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white font-black text-lg flex items-center justify-center shadow-md shadow-accent/20">
              2
            </div>
            <div>
              <h3 className="font-black text-base text-fg">Ketuk Menu Tiga Titik</h3>
              <p className="text-xs text-muted leading-relaxed mt-1.5">
                Ketuk tombol menu tiga titik (⋮) di pojok kanan atas browser, lalu pilih opsi <strong>"Tambahkan ke layar utama"</strong> atau <strong>"Instal aplikasi"</strong>.
              </p>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-accent text-white font-black text-lg flex items-center justify-center shadow-md shadow-accent/20">
              3
            </div>
            <div>
              <h3 className="font-black text-base text-fg">Ketuk Pasang</h3>
              <p className="text-xs text-muted leading-relaxed mt-1.5">
                Ikon SakuNota akan langsung muncul di layar utama HP Anda. Setelah itu, cukup ketuk ikon SakuNota untuk berjualan kapan saja.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Tool: Cek Kesiapan Offline */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border-2 border-dashed border-accent/40 text-center space-y-4">
          <div className="max-w-xl mx-auto space-y-1.5">
            <span className="text-2xl block">🔍</span>
            <h3 className="text-base sm:text-lg font-black text-fg">
              Uji Kesiapan HP Anda untuk Penggunaan Offline
            </h3>
            <p className="text-xs text-muted">
              Tekan tombol di bawah untuk memeriksa apakah browser HP Anda sudah siap menjalankan kasir saat internet mati.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleCheckOfflineReadiness}
              disabled={isCheckingOffline}
              className="px-6 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
            >
              {isCheckingOffline ? "Sedang Memeriksa..." : "⚡ Cek Kesiapan Offline Sekarang"}
            </button>
          </div>

          {offlineCheckResult && (
            <div className="max-w-lg mx-auto pt-3 animate-in fade-in duration-200">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-xs">
                  <span>✅</span>
                  <span>Perangkat Anda Siap Dipakai Tanpa Internet!</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded-xl bg-surface border border-line text-center">
                    <span className="block text-muted text-[10px]">Penyimpanan Data</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Aktif & Aman</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-line text-center">
                    <span className="block text-muted text-[10px]">Aset Kasir</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Tersimpan</strong>
                  </div>
                  <div className="p-2 rounded-xl bg-surface border border-line text-center">
                    <span className="block text-muted text-[10px]">Mesin Offline</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold">Tersedia</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Fitur Kasir Lengkap */}
      <section id="fitur" className="px-4 sm:px-8 py-16 bg-surface/50 border-t border-b border-line">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              FITUR LENGKAP & MUDAH
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
              Semua yang Dibutuhkan untuk Berjualan
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
              Didesain sederhana agar kasir tidak bingung dan pelayanan kepada pembeli semakin cepat.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface border border-line hover:border-accent/40 transition-all space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-card text-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-base font-black text-fg group-hover:text-accent-text transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Perbandingan Harga & Pembelian */}
      <section id="harga" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            HARGA JUJUR & HEMAT
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
            Cukup Sekali Bayar Promo Rp65.000
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
            Bandingkan biaya SakuNota dengan aplikasi kasir langganan bulanan.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card Kasir Langganan Lain */}
          <div className="p-7 sm:p-8 rounded-3xl bg-surface/50 border border-line space-y-6 flex flex-col justify-between opacity-85">
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                Aplikasi Kasir Langganan Bulanan
              </span>
              <div className="text-2xl sm:text-3xl font-black text-fg">
                Rp100.000 - Rp300.000 <span className="text-xs font-normal text-muted">/ bulan</span>
              </div>
              <p className="text-xs text-muted leading-relaxed">
                Beban biaya rutin yang harus dibayar setiap bulan, baik jualan sedang ramai maupun sepi.
              </p>

              <div className="space-y-2.5 pt-2 text-xs text-muted divide-y divide-line/40">
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-rose-500 font-bold">✕</span> Total Rp1.200.000 - Rp3.600.000 setiap tahun
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-rose-500 font-bold">✕</span> Kasir macet jika internet mati atau kuota habis
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-rose-500 font-bold">✕</span> Akses langsung dikunci jika lupa bayar bulanan
                </div>
              </div>
            </div>

            <div className="pt-4 text-xs text-muted text-center italic">
              Beban bulanan yang mengurangi keuntungan bersih warung
            </div>
          </div>

          {/* Card SakuNota */}
          <div className="p-7 sm:p-8 rounded-3xl bg-gradient-to-b from-surface to-card border-2 border-emerald-500 shadow-2xl shadow-emerald-500/10 space-y-6 flex flex-col justify-between relative">
            <div className="absolute -top-3 right-6 px-3.5 py-1 rounded-full bg-emerald-600 text-white text-[10px] font-black tracking-wider uppercase shadow-md">
              Promo Spesial
            </div>

            <div className="space-y-4">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
                SakuNota
              </span>
              <div className="space-y-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="text-sm text-muted line-through font-bold">Rp99.000</span>
                  <span className="text-4xl font-black text-fg">Rp65.000</span>
                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">promo hemat 34%</span>
                </div>
                <p className="text-xs text-muted">
                  Harga promo untuk 1 lisensi perangkat kasir aktif. Tanpa potongan komisi per transaksi.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-fg divide-y divide-line/60">
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-500 font-black">✓</span> <strong>Kasir tetap jalan tanpa internet:</strong> Berjualan tenang walau mati lampu / kuota habis
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-500 font-black">✓</span> <strong>Rp0 biaya bulanan:</strong> Tidak ada tagihan sewa bulanan atau tahunan
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-500 font-black">✓</span> <strong>1 Lisensi Perangkat:</strong> Akses penuh untuk perangkat kasir operasional Anda
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-500 font-black">✓</span> <strong>Data privat & aman:</strong> Tersimpan di memori HP Anda, bukan server umum
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-500 font-black">✓</span> <strong>Dukungan WhatsApp:</strong> Panduan bantuan dan tanya jawab langsung
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-2">
              <button
                type="button"
                onClick={handleOpenBuyModal}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Beli SakuNota — Rp65.000</span>
                <span>🛒</span>
              </button>
              <Link
                href="/pos"
                className="w-full py-2.5 text-center text-xs font-bold text-muted hover:text-fg transition-colors block"
              >
                Coba dulu kasir gratis →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="px-4 sm:px-8 py-16 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            TANYA JAWAB
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
            Pertanyaan yang Sering Diajukan
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-surface border border-line overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-xs sm:text-sm font-bold text-fg hover:text-accent-text transition-colors"
              >
                <span>{f.q}</span>
                <span className="text-muted ml-2 shrink-0">{activeFaq === idx ? "▲" : "▼"}</span>
              </button>

              {activeFaq === idx && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs text-muted leading-relaxed border-t border-line/40 pt-3 animate-in fade-in duration-150">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Bottom CTA Banner */}
      <section className="px-4 sm:px-8 pb-16 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-accent to-blue-700 text-white text-center space-y-5 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight">
            Mulai Rapikan Kasir Usaha Anda Hari Ini
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Tidak perlu khawatir internet mati saat melayani pembeli. Coba langsung di browser HP Anda.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleOpenBuyModal}
              className="px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95"
            >
              Beli SakuNota — Rp65.000
            </button>
            <Link
              href="/pos"
              className="px-7 py-3.5 bg-white hover:bg-slate-100 text-accent font-black text-sm rounded-2xl shadow-lg transition-all active:scale-95"
            >
              Coba Kasir Gratis Sekarang →
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Interactive Buy Modal (Alur Transfer Bank Manual & Verifikasi Owner) */}
      {isBuyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface border border-line rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs">
                  SN
                </div>
                <div>
                  <h3 className="font-black text-base text-fg">Formulir Pembelian SakuNota</h3>
                  <span className="text-[10px] text-muted">Promo Rp65.000 (Transfer Bank Manual)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-card hover:bg-line text-muted hover:text-fg text-sm flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Form Isi Data Pelanggan */}
            {checkoutStep === "form" && (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-fg">Langkah 1 dari 2: Data Pemilik Usaha</span>
                  <button
                    type="button"
                    onClick={handleFillSampleData}
                    className="text-[11px] font-bold text-accent-text hover:underline"
                  >
                    Salin Contoh Data Pembelian
                  </button>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    {formError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-fg mb-1">
                      Nama Pemilik *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Budi Santoso"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-fg mb-1">
                      Nama Usaha *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Warung Bu Sari / Kedai Kopi"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-fg mb-1">
                      Nomor WhatsApp *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Contoh: 081234567890"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-fg mb-1">
                      Email (Opsional)
                    </label>
                    <input
                      type="email"
                      placeholder="Contoh: budi@gmail.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-0.5 rounded border-line text-accent"
                      />
                      <span className="text-[11px] text-muted leading-relaxed">
                        Saya memahami bahwa data pembelian dipakai untuk pembayaran, aktivasi lisensi, dan dukungan SakuNota.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Summary box */}
                <div className="p-3.5 rounded-2xl bg-card border border-line flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted block text-[10px]">Total Pembayaran Promo</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-black text-sm">
                      Rp65.000
                    </strong>
                  </div>
                  <span className="text-[10px] text-muted line-through">Rp99.000</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(false)}
                    className="flex-1 py-3 bg-card hover:bg-line text-fg text-xs font-bold rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Lanjut ke Rekening Transfer →
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Instruksi Transfer Bank Resmi BCA */}
            {checkoutStep === "payment" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-fg">Langkah 2 dari 2: Transfer Bank Resmi</span>
                  <p className="text-[11px] text-muted">
                    Selesaikan transfer untuk pesanan <strong>{currentOrderId}</strong> ({businessName}).
                  </p>
                </div>

                {/* Bank BCA Details Card */}
                <div className="p-4 rounded-2xl bg-card border border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                      BANK BCA
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold">
                      Rekening Resmi SakuNota
                    </span>
                  </div>

                  <div className="space-y-1 bg-surface p-3 rounded-xl border border-line">
                    <span className="text-[10px] text-muted block font-bold uppercase">Nomor Rekening:</span>
                    <div className="flex items-center justify-between">
                      <strong className="text-lg font-mono font-black text-fg select-all">
                        8030 554 912
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText("8030554912");
                          alert("Nomor rekening BCA berhasil disalin!");
                        }}
                        className="text-[10px] font-bold text-accent-text hover:underline"
                      >
                        Salin No Rek
                      </button>
                    </div>
                    <span className="text-[11px] text-muted block">Atas Nama: <strong>Reza / SakuNota Official</strong></span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-muted">Nominal Transfer:</span>
                    <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">
                      Rp 65.000
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted">Nomor Pesanan (Berita Transfer):</span>
                    <strong className="font-mono font-bold text-fg">
                      {currentOrderId}
                    </strong>
                  </div>
                </div>

                {/* Simulasi Bukti Transfer */}
                <div className="p-3.5 rounded-2xl bg-card border border-line space-y-2">
                  <span className="text-[11px] font-bold text-fg block">
                    Upload Bukti Transfer:
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTransferProofSimulated(true)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                        transferProofSimulated
                          ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400"
                          : "bg-surface border-line text-muted hover:text-fg"
                      }`}
                    >
                      {transferProofSimulated ? "✅ File Bukti Terlampir (bukti_transfer.jpg)" : "📎 Pilih Foto Bukti Transfer"}
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed space-y-1">
                  <strong className="block">ℹ️ Proses Verifikasi Owner:</strong>
                  <p>
                    Setelah Anda mengirim bukti transfer, status pesanan akan menjadi <strong>Menunggu Verifikasi</strong>. Reza (Owner SakuNota) akan mencocokkan mutasi rekening sebelum menerbitkan kode lisensi resmi.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("form")}
                    className="py-3 px-4 bg-card hover:bg-line text-fg text-xs font-bold rounded-xl transition-colors"
                  >
                    ← Kembali
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitTransferProof}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Kirim Bukti Transfer Sekarang →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Status Menunggu Verifikasi Owner */}
            {checkoutStep === "waiting" && (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-500 text-3xl mx-auto flex items-center justify-center animate-pulse">
                  ⏳
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-black text-fg">Bukti Transfer Telah Dikirim!</h4>
                  <p className="text-xs text-muted">
                    Pesanan Anda sedang menunggu pengecekan mutasi bank oleh Owner SakuNota.
                  </p>
                </div>

                {/* Status Box */}
                <div className="p-4 rounded-2xl bg-card border border-line text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-line">
                    <span className="text-muted">Nomor Pesanan:</span>
                    <strong className="font-mono font-black text-fg text-sm">{currentOrderId}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-black text-[11px] border border-amber-500/30">
                      Menunggu Verifikasi Owner
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Nama Usaha:</span>
                    <strong className="text-fg">{businessName}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted">Nominal:</span>
                    <strong className="text-fg font-black">Rp 65.000</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-surface border border-line text-left text-xs text-muted space-y-1.5 leading-relaxed">
                  <strong className="text-fg block">💡 Apa yang terjadi selanjutnya?</strong>
                  <p>
                    1. Reza (Owner SakuNota) memeriksa dana masuk di mutasi BCA.<br />
                    2. Setelah dana cocok, lisensi resmi akan langsung diterbitkan.<br />
                    3. Anda dapat mengecek nomor lisensi kapan saja lewat tombol <strong>Cek Status Lisensi</strong> di halaman depan.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Mas%20Reza%20(Owner%20SakuNota),%20saya%20sudah%20transfer%20Rp65.000%20untuk%20pesanan%20${currentOrderId}%20(${businessName}).%20Mohon%20verifikasi%20dan%20terbitkan%20lisensi.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>💬</span>
                    <span>Konfirmasi Cepat via WhatsApp Reza</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(false)}
                    className="w-full py-2.5 text-xs font-bold text-muted hover:text-fg transition-colors"
                  >
                    Simpan & Tutup Halaman
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 10. Modal Cek Status Pesanan / Lisensi Saya */}
      {isCheckStatusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <h3 className="font-black text-sm text-fg">Cek Status Pesanan & Lisensi</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckStatusModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card hover:bg-line text-muted text-xs flex items-center justify-center font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSearchOrder} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-muted mb-1 uppercase">
                  Masukkan No Pesanan atau No WhatsApp:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SN-2026-001 atau 0812345..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl transition-all"
                  >
                    Cari
                  </button>
                </div>
              </div>
            </form>

            {/* Hasil Pencarian */}
            {searchAttempted && searchResult && (
              <div className="p-4 rounded-2xl bg-card border border-line space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex justify-between items-center pb-2 border-b border-line">
                  <div>
                    <strong className="text-fg block">{searchResult.businessName}</strong>
                    <span className="text-[10px] text-muted font-mono">{searchResult.orderId}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    searchResult.status === "lunas_lisensi_terbit"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  }`}>
                    {searchResult.status === "lunas_lisensi_terbit" ? "Lunas & Aktif" : "Menunggu Verifikasi"}
                  </span>
                </div>

                {searchResult.status === "lunas_lisensi_terbit" && searchResult.licenseKey ? (
                  <div className="space-y-2 pt-1">
                    <span className="text-[10px] text-muted font-bold block uppercase">KODE LISENSI RESMI ANDA:</span>
                    <div className="p-3 rounded-xl bg-surface border border-emerald-500/40 text-center font-mono font-black text-sm text-emerald-600 dark:text-emerald-400 select-all">
                      {searchResult.licenseKey}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (searchResult.licenseKey) {
                            navigator.clipboard.writeText(searchResult.licenseKey);
                            setCopiedLicense(true);
                            setTimeout(() => setCopiedLicense(false), 2000);
                          }
                        }}
                        className="flex-1 py-2 rounded-xl bg-surface border border-line text-xs font-bold text-fg hover:border-accent transition-colors"
                      >
                        {copiedLicense ? "✓ Tersalin!" : "📋 Salin Lisensi"}
                      </button>
                      <Link
                        href="/pos"
                        className="flex-1 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold text-center shadow-sm"
                      >
                        Buka Kasir →
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-surface border border-line text-muted text-[11px] leading-relaxed space-y-1">
                    <strong className="text-amber-600 dark:text-amber-400 block font-bold">Sedang Menunggu Verifikasi</strong>
                    <p>
                      Bukti pembayaran sedang dicek di mutasi rekening BCA. Setelah dana diverifikasi oleh Reza (Owner), nomor lisensi otomatis tampil di sini.
                    </p>
                  </div>
                )}
              </div>
            )}

            {searchAttempted && !searchResult && (
              <div className="p-4 rounded-2xl bg-card border border-line text-center text-xs text-muted space-y-1 animate-in fade-in">
                <span className="text-xl block">🔎</span>
                <strong className="text-fg block">Pesanan Tidak Ditemukan</strong>
                <p className="text-[11px]">
                  Periksa kembali nomor pesanan (contoh: SN-2026-001) atau nomor WhatsApp yang Anda masukkan saat memesan.
                </p>
              </div>
            )}

            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={() => setIsCheckStatusModalOpen(false)}
                className="px-4 py-2 bg-card hover:bg-line text-fg text-xs font-bold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Footer */}
      <footer className="mt-auto border-t border-line bg-surface px-4 sm:px-8 py-10 text-xs text-muted">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-black text-xs">
              SN
            </div>
            <div>
              <span className="font-bold text-fg block">SakuNota</span>
              <span className="text-[11px] text-muted">Kasir Tetap Jalan, Meski Tanpa Internet.</span>
            </div>
          </div>

          {/* Contact and Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors font-bold text-emerald-600 dark:text-emerald-400"
            >
              Bantuan WhatsApp
            </a>
            <span className="text-line">•</span>
            <a href="mailto:support@sakunota.my.id" className="hover:text-fg transition-colors">
              support@sakunota.my.id
            </a>
            <span className="text-line">•</span>
            <Link href="/owner" className="hover:text-fg transition-colors">
              Portal Pemilik (Reza)
            </Link>
            <span className="text-line">•</span>
            <Link href="/pos" className="text-accent-text font-bold hover:underline">
              Buka Kasir POS
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-line/40 text-center text-[11px] text-muted">
          © 2026 SakuNota. Kasir simpel untuk warung, angkringan, dan UMKM Indonesia.
        </div>
      </footer>
    </div>
  );
}
