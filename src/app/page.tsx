"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import InstallGuideSection from "@/components/InstallGuideSection";
import { 
  CustomerOrder, 
  submitBuyerOrder, 
  checkOrderStatusServer 
} from "@/lib/ordersClient";

export default function SakuNotaLandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [selectedBusinessType, setSelectedBusinessType] = useState<"warung" | "restoran" | "kafe" | "retail">("warung");

  // Mini Interactive Simulation State (Coba Kasir)
  const sampleProducts = [
    { id: "p1", name: "Kopi Susu Gula Aren", price: 12000, cat: "Minuman" },
    { id: "p2", name: "Nasi Goreng Spesial", price: 18000, cat: "Makanan" },
    { id: "p3", name: "Es Teh Manis", price: 4000, cat: "Minuman" },
    { id: "p4", name: "Pisang Goreng Keju", price: 10000, cat: "Camilan" },
  ];
  const [demoCart, setDemoCart] = useState<{ [id: string]: number }>({ p1: 1, p3: 2 });
  const [showDemoReceipt, setShowDemoReceipt] = useState(false);

  const demoTotal = Object.entries(demoCart).reduce((sum, [id, qty]) => {
    const item = sampleProducts.find((p) => p.id === id);
    return sum + (item ? item.price * qty : 0);
  }, 0);

  const handleDemoQtyChange = (id: string, delta: number) => {
    setDemoCart((prev) => {
      const next = { ...prev };
      const current = next[id] || 0;
      const updated = current + delta;
      if (updated <= 0) {
        delete next[id];
      } else {
        next[id] = updated;
      }
      return next;
    });
  };

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
  const [currentAccessCode, setCurrentAccessCode] = useState("");
  const [transferProofFileName, setTransferProofFileName] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isInitiatingSnap, setIsInitiatingSnap] = useState(false);
  const [snapError, setSnapError] = useState("");

  // Check Order / License Status State
  const [isCheckStatusModalOpen, setIsCheckStatusModalOpen] = useState(false);
  const [searchOrderId, setSearchOrderId] = useState("");
  const [searchAccessCode, setSearchAccessCode] = useState("");
  const [searchResult, setSearchResult] = useState<CustomerOrder | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [copiedLicense, setCopiedLicense] = useState(false);

  // Load Midtrans Snap Script on demand from dynamic server configuration
  useEffect(() => {
    const snapScriptId = "midtrans-snap-js";
    if (document.getElementById(snapScriptId)) return;

    fetch("/api/payment/config")
      .then((res) => res.json())
      .then((data: any) => {
        if (data?.clientKey && !document.getElementById(snapScriptId)) {
          const script = document.createElement("script");
          script.id = snapScriptId;
          script.src = data.snapJsUrl || "https://app.midtrans.com/snap/snap.js";
          script.setAttribute("data-client-key", data.clientKey);
          document.body.appendChild(script);
        }
      })
      .catch(() => {
        // Handled silently when offline or unavailable
      });
  }, []);

  // Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBuyModalOpen(false);
        setIsCheckStatusModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle return from Midtrans finish callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const paymentStatus = params.get("payment");
      const ordId = params.get("orderId");
      const code = params.get("accessCode");
      if (paymentStatus === "finish" && ordId && code) {
        setSearchOrderId(ordId);
        setSearchAccessCode(code);
        setIsCheckStatusModalOpen(true);
        setIsSearchingOrder(true);
        checkOrderStatusServer(ordId, code).then((res) => {
          setIsSearchingOrder(false);
          setSearchAttempted(true);
          if (res.success && res.order) {
            setSearchResult(res.order);
          }
        }).catch(() => {
          setIsSearchingOrder(false);
        });
      }
    }
  }, []);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const handleOpenBuyModal = () => {
    setIsBuyModalOpen(true);
    setCheckoutStep("form");
    setFormError("");
    setTransferProofFileName("");
    setSnapError("");
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
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
    setIsSubmittingOrder(true);

    try {
      const res = await submitBuyerOrder({
        buyerName,
        businessName,
        whatsapp: whatsappNumber,
        email: buyerEmail,
      });

      if (res.success && res.order) {
        setCurrentOrderId(res.order.orderId);
        setCurrentAccessCode(res.order.accessCode);
        setCheckoutStep("payment");
      } else {
        setFormError(res.error || "Gagal membuat pesanan.");
      }
    } catch (err: any) {
      setFormError("Koneksi gagal: " + err.message);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handlePayWithMidtrans = async () => {
    setIsInitiatingSnap(true);
    setSnapError("");
    try {
      const res = await fetch("/api/payment/snap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentOrderId,
          accessCode: currentAccessCode,
        }),
      });

      const resText = await res.text();
      let data: any = null;
      try {
        data = resText ? JSON.parse(resText) : null;
      } catch (_) {
        data = null;
      }

      if (!res.ok) {
        setSnapError(data?.error || `Gagal menghubungi gerbang pembayaran (HTTP ${res.status}). Silakan gunakan transfer manual BCA.`);
        return;
      }

      if (!data) {
        setSnapError("Respon server pembayaran kosong. Pastikan MIDTRANS_SERVER_KEY sudah disimpan di Cloudflare Secrets.");
        return;
      }

      if (data.success && data.token) {
        if (typeof (window as any).snap !== "undefined" && (window as any).snap.pay) {
          (window as any).snap.pay(data.token, {
            onSuccess: function () {
              setCheckoutStep("waiting");
            },
            onPending: function () {
              setCheckoutStep("waiting");
            },
            onError: function (err: any) {
              setSnapError("Pembayaran gagal diproses: " + (err?.status_message || "Silakan coba lagi."));
            },
            onClose: function () {
              // Popup closed
            },
          });
        } else if (data.redirect_url) {
          window.location.href = data.redirect_url;
        } else {
          setSnapError("Popup pembayaran tidak dapat dibuka. Silakan gunakan transfer manual.");
        }
      } else {
        setSnapError(data.error || "Gagal membuat sesi pembayaran Midtrans.");
      }
    } catch (err: any) {
      setSnapError("Koneksi gagal: " + err.message);
    } finally {
      setIsInitiatingSnap(false);
    }
  };

  const handleSubmitTransferProof = () => {
    setCheckoutStep("waiting");
  };

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchAttempted(true);
    setSearchResult(null);
    setSearchError("");

    const ordId = searchOrderId.trim();
    const code = searchAccessCode.trim();

    if (!ordId) {
      setSearchError("Mohon masukkan Nomor Pesanan.");
      return;
    }

    setIsSearchingOrder(true);
    try {
      const res = await checkOrderStatusServer(ordId, code);
      if (res.success && res.order) {
        setSearchResult(res.order);
      } else {
        setSearchError(res.error || "Pesanan tidak ditemukan atau kode akses salah.");
      }
    } catch (err: any) {
      setSearchError("Gagal memeriksa pesanan: " + err.message);
    } finally {
      setIsSearchingOrder(false);
    }
  };

  const businessTypesInfo = {
    warung: {
      title: "Warung Makan & UMKM",
      subtitle: "Mode Kasir Cepat (Direct Sale)",
      desc: "Dirancang untuk warung makan, angkringan, pecel lele, dan jualan cepat. Tanpa ribet denah nomor meja — kasir langsung pilih menu, hitung total bayar & kembalian, dan cetak struk nota.",
      points: [
        "Kasir cepat tanpa wajib mengatur meja",
        "Kalkulator bayar & kembalian otomatis",
        "Cetak struk nota kertas dalam 2 detik",
        "Bekerja 100% tanpa jaringan internet",
      ],
    },
    restoran: {
      title: "Rumah Makan & Restoran",
      subtitle: "Mode Denah Meja & Open Bill",
      desc: "Cocok untuk resto dan rumah makan dengan tempat duduk santai. Pelanggan bisa memesan duluan di meja, menambah pesanan nanti, dan membayar saat selesai makan.",
      points: [
        "Status meja kosong atau sedang terisi",
        "Pesanan makan di tempat (Dine-in) atau bungkus (Takeaway)",
        "Dukungan pisah tagihan / bayar patungan (Split Bill)",
        "Struk dapur dan struk kasir terpisah rapi",
      ],
    },
    kafe: {
      title: "Kafe & Kedai Minuman",
      subtitle: "Pilihan Tambahan & Modifiers",
      desc: "Sempurna untuk kedai kopi, boba, jus buah, dan minuman kekinian. Pelanggan bisa memilih tingkat es, tingkat manis, dan varian topping sesuka hati.",
      points: [
        "Grup opsi tambahan (topping, tingkat manis, rasa)",
        "Pencatatan shift kerja barista dan kas kecil",
        "Kirim laporan rekap omzet shift langsung ke WhatsApp",
        "Mendukung printer Bluetooth 58mm & 80mm",
      ],
    },
    retail: {
      title: "Toko Kelontong & Retail",
      subtitle: "Kelola Stok Barang & Kode SKU",
      desc: "Solusi tepat untuk toko sembako, minimarket lokal, dan toko kelontong. Kelola ribuan barang dagangan, cari berdasarkan kode atau barcode, dan pantau sisa stok.",
      points: [
        "Pencarian cepat barang dan kode SKU / Barcode",
        "Peringatan stok menipis dan kontrol stok habis",
        "Rekap omzet harian dan keuntungan bersih",
        "Cadangkan data dagangan aman ke file HP",
      ],
    },
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
      icon: "⚡",
      title: "Kasir 100% Offline",
      desc: "Bekerja mandiri di memori HP. Melayani pelanggan dan mencetak struk nota tanpa perlu sinyal internet atau kuota data.",
    },
    {
      icon: "🪑",
      title: "Fleksibel Sesuai Usaha",
      desc: "Bisa diatur mode kasir cepat tanpa meja untuk warung/toko, atau mode denah meja & open bill untuk restoran.",
    },
    {
      icon: "🖨️",
      title: "Printer Struk Bluetooth",
      desc: "Koneksi instan ke printer thermal mini 58mm maupun 80mm standar (Panda, VSC, Eppos, Zjiang, Kassen, dll).",
    },
    {
      icon: "📋",
      title: "Menu & Pilihan Tambahan",
      desc: "Atur makanan, minuman, harga, stok, dan pilihan varian seperti tingkat pedas dan topping tambahan sesuka hati.",
    },
    {
      icon: "📊",
      title: "Rekap Penjualan & WhatsApp",
      desc: "Pantau omzet harian, hitung kas masuk-keluar, dan kirim laporan penjualan berkala langsung ke WhatsApp pemilik.",
    },
    {
      icon: "💾",
      title: "Cadangkan & Pulihkan Mandiri",
      desc: "Data penjualan tersimpan privat di perangkat Anda sendiri. Bisa dicadangkan ke file dan dipulihkan saat berganti HP.",
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
              Kasir Jalan Tanpa Internet.
            </span>
          </div>
        </div>

        {/* Center Nav links - Clean, merchant-focused, no emojis */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-bold text-muted">
          <a href="#fitur" className="hover:text-fg transition-colors">
            Fitur
          </a>
          <a href="#jenis-usaha" className="hover:text-fg transition-colors">
            Jenis Usaha
          </a>
          <a href="#harga" className="hover:text-fg transition-colors">
            Harga
          </a>
          <a href="#pasang-hp" className="hover:text-blue-600 dark:text-blue-400 font-extrabold text-blue-600 dark:text-blue-400 transition-colors">
            Pasang di HP
          </a>
          <Link href="/panduan" className="hover:text-accent-text text-accent transition-colors">
            Panduan
          </Link>
          <a href="#bantuan" className="hover:text-fg transition-colors">
            Bantuan
          </a>
        </nav>

        {/* Action Buttons */}
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
      <section className="relative px-4 sm:px-8 pt-12 pb-14 md:pt-16 md:pb-20 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/15 border border-accent/30 text-accent-text text-xs font-black">
          <span>Kasir Simpel, Tetap Offline</span>
          <span className="text-muted">•</span>
          <span>SakuNota — Kasir Jalan Tanpa Internet.</span>
        </div>

        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-fg tracking-tight leading-[1.15] max-w-3xl mx-auto">
          Kasir Simpel, Tetap Offline.
          <span className="block text-2xl sm:text-4xl text-accent-text mt-2 font-bold">
            Jualan Lancar, Internet Mati Bukan Masalah.
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          Catat penjualan, kelola barang, cetak struk, dan pantau usaha dari satu aplikasi. Tanpa biaya bulanan.
        </p>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <span className="px-3 py-1 rounded-full bg-card border border-line text-xs font-bold text-fg">
            Bisa offline
          </span>
          <span className="px-3 py-1 rounded-full bg-card border border-line text-xs font-bold text-fg">
            Kasir offline
          </span>
          <span className="px-3 py-1 rounded-full bg-card border border-line text-xs font-bold text-fg">
            HP & tablet
          </span>
          <span className="px-3 py-1 rounded-full bg-card border border-line text-xs font-bold text-fg">
            Cetak struk
          </span>
          <a href="#pasang-hp" className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-800 text-xs font-extrabold text-blue-700 dark:text-blue-300 hover:underline">
            📱 Pasang di HP
          </a>
        </div>

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
                Tanpa Langganan Bulanan • 1 Lisensi Perangkat
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
          </button>

          <Link
            href="/pos"
            className="w-full sm:w-auto px-7 py-4 bg-card hover:bg-line text-fg font-bold text-sm rounded-2xl border border-line transition-all flex items-center justify-center gap-2"
          >
            <span>Coba Kasir Sekarang</span>
            <span>→</span>
          </Link>

          <a
            href="#pasang-hp"
            className="w-full sm:w-auto px-6 py-4 bg-surface hover:bg-card text-blue-600 dark:text-blue-400 font-bold text-xs rounded-2xl border border-blue-200 dark:border-blue-800 transition-all flex items-center justify-center gap-1.5"
          >
            <span>📱</span>
            <span>Pasang di HP</span>
          </a>

          <button
            type="button"
            onClick={() => {
              setIsCheckStatusModalOpen(true);
              setSearchAttempted(false);
              setSearchResult(null);
            }}
            className="w-full sm:w-auto px-6 py-4 bg-surface hover:bg-card text-muted hover:text-fg font-bold text-xs rounded-2xl border border-line transition-all"
          >
            Cek Status Pesanan Saya
          </button>
        </div>

        {/* Trust Badges */}
        <div className="pt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-black">✓</span> Kasir tetap jalan tanpa internet
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-black">✓</span> Tanpa langganan bulanan
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-500 font-black">✓</span> Tanpa potongan komisi penjualan
          </span>
        </div>
      </section>

      {/* 3. Coba Kasir Interactive Demo (Mini POS Preview) */}
      <section className="px-4 sm:px-8 py-12 bg-surface/60 border-t border-b border-line">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-1">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              Coba Kasir
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
              Coba Kasir SakuNota Langsung di Sini
            </h2>
            <p className="text-xs sm:text-sm text-muted">
              Pilih menu, tambahkan ke keranjang, dan lihat simulasi cetak struk nota fisik.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-3xl bg-surface border border-line shadow-lg">
            {/* Left: Product Selector */}
            <div className="space-y-3">
              <span className="text-xs font-bold text-fg block">Daftar Menu Kasir:</span>
              <div className="grid grid-cols-2 gap-2.5">
                {sampleProducts.map((p) => {
                  const qty = demoCart[p.id] || 0;
                  return (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-card border border-line flex flex-col justify-between space-y-2"
                    >
                      <div>
                        <span className="text-[10px] text-muted block uppercase font-bold">{p.cat}</span>
                        <strong className="text-xs font-bold text-fg block leading-snug">{p.name}</strong>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                          Rp {p.price.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-line/50">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleDemoQtyChange(p.id, -1)}
                              className="w-6 h-6 rounded-lg bg-surface border border-line text-xs font-bold flex items-center justify-center hover:bg-line"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-fg">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleDemoQtyChange(p.id, 1)}
                              className="w-6 h-6 rounded-lg bg-surface border border-line text-xs font-bold flex items-center justify-center hover:bg-line"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDemoQtyChange(p.id, 1)}
                            className="w-full py-1.5 rounded-lg bg-accent/10 hover:bg-accent text-accent-text hover:text-white text-[11px] font-bold transition-colors"
                          >
                            + Tambah
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right: Cart Summary & Receipt Preview */}
            <div className="space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="text-xs font-bold text-fg">Keranjang Pembeli</span>
                  <span className="text-[11px] font-bold text-muted">
                    {Object.values(demoCart).reduce((a, b) => a + b, 0)} Porsi
                  </span>
                </div>

                {Object.keys(demoCart).length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted">
                    Keranjang masih kosong. Pilih menu di samping.
                  </div>
                ) : (
                  <div className="divide-y divide-line/40 py-2 space-y-1.5 max-h-40 overflow-y-auto">
                    {Object.entries(demoCart).map(([id, qty]) => {
                      const item = sampleProducts.find((p) => p.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="flex justify-between items-center text-xs pt-1">
                          <div>
                            <span className="font-bold text-fg">{item.name}</span>
                            <span className="text-muted ml-1.5 text-[10px]">x{qty}</span>
                          </div>
                          <span className="font-bold text-fg">
                            Rp {(item.price * qty).toLocaleString("id-ID")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-2 border-t border-line">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted font-bold">Total Pembayaran:</span>
                  <strong className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                    Rp {demoTotal.toLocaleString("id-ID")}
                  </strong>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDemoReceipt(!showDemoReceipt)}
                    className="flex-1 py-2.5 rounded-xl bg-card hover:bg-line border border-line text-xs font-bold text-fg transition-colors"
                  >
                    {showDemoReceipt ? "Sembunyikan Struk" : "Lihat Simulasi Struk"}
                  </button>
                  <Link
                    href="/pos"
                    className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-black text-center shadow-md transition-all active:scale-95"
                  >
                    Buka Kasir Lengkap →
                  </Link>
                </div>

                {showDemoReceipt && (
                  <div className="p-4 rounded-2xl bg-white text-slate-900 font-mono text-[11px] space-y-1 shadow-inner border border-slate-300 animate-in fade-in duration-150">
                    <div className="text-center font-bold text-xs pb-1 border-b border-dashed border-slate-400">
                      SAKUNOTA POS OFFICIAL<br />
                      <span className="text-[10px] font-normal">Kasir Jalan Tanpa Internet.</span>
                    </div>
                    <div className="py-1 border-b border-dashed border-slate-400 space-y-0.5">
                      {Object.entries(demoCart).map(([id, qty]) => {
                        const item = sampleProducts.find((p) => p.id === id);
                        if (!item) return null;
                        return (
                          <div key={id} className="flex justify-between">
                            <span>{item.name} x{qty}</span>
                            <span>Rp {(item.price * qty).toLocaleString("id-ID")}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex justify-between font-bold pt-1">
                      <span>TOTAL BAYAR:</span>
                      <span>Rp {demoTotal.toLocaleString("id-ID")}</span>
                    </div>
                    <div className="text-center text-[9px] pt-1 text-slate-600">
                      Terima kasih atas kunjungan Anda!
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section 4 Jenis Usaha */}
      <section id="jenis-usaha" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            FASILITAS SESUAI KEBUTUHAN
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
            Cocok untuk 4 Jenis Usaha Anda
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
            SakuNota menyesuaikan alur kerja kasir Anda secara otomatis tanpa perlu setup rumit.
          </p>
        </div>

        {/* Business Type Tabs */}
        <div className="flex border-b border-line gap-2 overflow-x-auto pb-1 justify-center">
          {(["warung", "restoran", "kafe", "retail"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSelectedBusinessType(type)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                selectedBusinessType === type
                  ? "bg-accent text-white shadow-md shadow-accent/20"
                  : "bg-surface hover:bg-card text-muted hover:text-fg border border-line"
              }`}
            >
              {businessTypesInfo[type].title}
            </button>
          ))}
        </div>

        {/* Active Business Type Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-md grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-full bg-accent/15 text-accent-text text-xs font-black inline-block">
              {businessTypesInfo[selectedBusinessType].subtitle}
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-fg">
              {businessTypesInfo[selectedBusinessType].title}
            </h3>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              {businessTypesInfo[selectedBusinessType].desc}
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-card border border-line space-y-2.5">
            <span className="text-xs font-bold text-fg uppercase tracking-wider block">
              Kelebihan untuk Usaha Ini:
            </span>
            <ul className="space-y-2 text-xs text-muted">
              {businessTypesInfo[selectedBusinessType].points.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-emerald-500 font-black">✓</span>
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <div className="pt-2">
              <Link
                href="/admin/pengaturan/profil"
                className="text-xs font-bold text-accent-text hover:underline block"
              >
                Atur jenis usaha ini di Pengaturan Profil Usaha →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Section Fitur Kasir Unggulan */}
      <section id="fitur" className="px-4 sm:px-8 py-16 bg-surface/50 border-t border-b border-line">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              LENGKAP & PRAKTIS
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
              Fitur Lengkap Kasir SakuNota
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
              Semua alat yang Anda butuhkan untuk mengelola penjualan, mencetak nota, dan memantau keuntungan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-3 hover:border-accent/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-2xl bg-accent/15 text-accent-text flex items-center justify-center text-xl shrink-0">
                  {f.icon}
                </div>
                <h3 className="font-black text-sm sm:text-base text-fg">
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

      {/* 6. Section Tanpa Internet (Penjelasan Transparan & Tanpa Jargon) */}
      <section className="px-4 sm:px-8 py-16 max-w-5xl mx-auto space-y-8">
        <div className="p-8 sm:p-10 rounded-3xl bg-surface border border-line shadow-md space-y-5">
          <div className="space-y-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
              TRANSPARAN & TANPA KONEKSI TERIKAT
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
              Bagaimana SakuNota Bisa Jalan Tanpa Internet?
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-muted leading-relaxed">
            Aplikasi kasir biasa mewajibkan HP Anda terus terhubung ke internet. Jika sinyal drop atau kuota habis di jam sibuk, kasir akan macet total.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-4 rounded-2xl bg-card border border-line space-y-1.5">
              <strong className="text-fg block font-black">1. Tersimpan di HP Anda</strong>
              <p className="text-muted leading-relaxed">
                Seluruh program dan basis data disimpan langsung di HP Anda. Membuka kasir hanya butuh waktu 1 detik.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line space-y-1.5">
              <strong className="text-fg block font-black">2. Cetak Struk via Bluetooth</strong>
              <p className="text-muted leading-relaxed">
                Printer kasir berkomunikasi langsung melalui sinyal Bluetooth fisik, tanpa butuh router Wi-Fi atau internet.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-card border border-line space-y-1.5">
              <strong className="text-fg block font-black">3. Privasi 100% Milik Anda</strong>
              <p className="text-muted leading-relaxed">
                Detail transaksi, omzet jualan, dan daftar menu tetap berada di HP Anda, tidak diunggah ke pihak ketiga.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Section Cara Memulai (4 Langkah) */}
      <section id="cara-pasang" className="px-4 sm:px-8 py-16 bg-surface/50 border-t border-b border-line">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              MUDAH & CEPAT
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
              4 Langkah Memulai Kasir SakuNota
            </h2>
            <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
              Tidak perlu laptop mahal dan tidak perlu menunggu berhari-hari. Kasir siap dipakai dalam 5 menit.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-3xl bg-surface border border-line space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs">
                1
              </div>
              <strong className="text-sm font-black text-fg block">Beli Lisensi</strong>
              <p className="text-xs text-muted leading-relaxed">
                Cukup Rp65.000 sekali bayar untuk 1 perangkat kasir aktif selamanya.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-surface border border-line space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs">
                2
              </div>
              <strong className="text-sm font-black text-fg block">Buka di HP</strong>
              <p className="text-xs text-muted leading-relaxed">
                Buka lewat Google Chrome di HP Anda, lalu pilih "Tambahkan ke Layar Utama".
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-surface border border-line space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs">
                3
              </div>
              <strong className="text-sm font-black text-fg block">Input Menu & Printer</strong>
              <p className="text-xs text-muted leading-relaxed">
                Masukkan menu jualan dan sambungkan printer Bluetooth 58mm atau 80mm Anda.
              </p>
            </div>

            <div className="p-5 rounded-3xl bg-surface border border-line space-y-2 shadow-sm">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs">
                4
              </div>
              <strong className="text-sm font-black text-fg block">Siap Berjualan</strong>
              <p className="text-xs text-muted leading-relaxed">
                Langsung layani pembeli, cetak struk nota, dan rekap hasil jualan harian Anda.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 8. Section Harga Promo Rp65.000 */}
      <section id="harga" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            BIAYA TERJANGKAU
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-fg tracking-tight">
            Satu Harga Tanpa Biaya Tersembunyi
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-xl mx-auto">
            Tidak ada potongan komisi per transaksi dan tidak ada tagihan langganan bulanan.
          </p>
        </div>

        <div className="max-w-lg mx-auto p-8 rounded-3xl bg-surface border-2 border-accent shadow-2xl space-y-6">
          <div className="text-center space-y-1">
            <span className="px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-black text-xs inline-block">
              Promo Peluncuran (Hemat Rp34.000)
            </span>
            <div className="flex items-center justify-center gap-2 pt-2">
              <span className="text-lg text-muted line-through font-bold">Rp99.000</span>
              <span className="text-4xl font-black text-emerald-600 dark:text-emerald-400">Rp65.000</span>
            </div>
            <span className="text-xs text-muted block">Sekali bayar untuk 1 perangkat kasir aktif</span>
          </div>

          <div className="space-y-2.5 pt-2 border-t border-line text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Seluruh Fitur Kasir Lengkap (Warung, Resto, Kafe, Toko)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Bisa Digunakan Sepenuhnya Tanpa Internet (Offline 100%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Cetak Struk Bluetooth (Thermal 58mm & 80mm)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Rekap Laporan Kas Masuk/Keluar & Kirim ke WhatsApp</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Tanpa Biaya Bulanan / Tahunan Selamanya</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Tanpa Potongan Komisi Penjualan</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenBuyModal}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/25 transition-all active:scale-95"
          >
            Beli SakuNota — Rp65.000
          </button>
        </div>
      </section>

      {/* 9. Section Panduan Lengkap SakuNota (Callout ke /panduan) */}
      <section className="px-4 sm:px-8 py-12 bg-surface/60 border-t border-b border-line">
        <div className="max-w-4xl mx-auto p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="px-3 py-1 rounded-full bg-accent/15 text-accent-text text-xs font-black inline-block">
              BUKU PANDUAN RESMI
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-fg">
              Pusat Panduan Lengkap SakuNota (11 Bab)
            </h3>
            <p className="text-xs text-muted max-w-lg leading-relaxed">
              Pelajari cara mengatur profil usaha, memasukkan menu, menghubungkan printer Bluetooth, mengelola kas & shift, hingga cadangkan data.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <a
              href="#pasang-hp"
              className="px-5 py-3.5 bg-surface hover:bg-card text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-800 text-xs font-black rounded-2xl shadow-sm transition-all active:scale-95"
            >
              📱 Pasang di HP
            </a>
            <Link
              href="/panduan"
              className="px-6 py-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl shadow-md transition-all active:scale-95"
            >
              Buka Buku Panduan →
            </Link>
          </div>
        </div>
      </section>

      {/* 9.1 Section Pasang SakuNota di HP (Android & iPhone) */}
      <section id="pasang-hp" className="px-4 sm:px-8 py-14 max-w-5xl mx-auto border-b border-line">
        <InstallGuideSection />
      </section>

      {/* 10. Empat Pertanyaan Calon Pembeli */}
      <section id="tanya-jawab-utama" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto space-y-10">
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
      </section>

      {/* 11. FAQ Accordion */}
      <section id="faq" className="px-4 sm:px-8 py-16 bg-surface/50 border-t border-b border-line">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              PERTANYAAN LAINNYA
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
              Tanya Jawab Sering Diajukan
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((f, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-surface border border-line overflow-hidden transition-all"
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
        </div>
      </section>

      {/* 12. Bantuan WhatsApp Resmi */}
      <section id="bantuan" className="px-4 sm:px-8 py-16 max-w-5xl mx-auto">
        <div className="p-8 sm:p-10 rounded-3xl bg-card border border-line text-center space-y-4">
          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">
            DUKUNGAN LANGSUNG
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-fg tracking-tight">
            Butuh Bantuan atau Ingin Bertanya?
          </h2>
          <p className="text-xs sm:text-sm text-muted max-w-md mx-auto leading-relaxed">
            Tim SakuNota siap membantu pertanyaan seputar cara penggunaan, aktivasi lisensi, atau kendala printer Bluetooth Anda.
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/6281234567890?text=Halo%20SakuNota,%20saya%20ingin%20bertanya%20seputar%20aplikasi%20kasir."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-2xl shadow-lg transition-all active:scale-95"
            >
              <span>Hubungi WhatsApp Resmi SakuNota</span>
              <span>→</span>
            </a>
          </div>
        </div>
      </section>

      {/* 13. Interactive Buy Modal (Alur Transfer Bank Manual & Verifikasi Owner) */}
      {isBuyModalOpen && (
        <div 
          onClick={() => setIsBuyModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 cursor-default"
          >
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
                      placeholder="Nama pemilik"
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
                      placeholder="Nama usaha / warung / toko"
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
                      placeholder="08123456789"
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
                      placeholder="nama@email.com"
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

            {/* Step 2: Pembayaran Midtrans Otomatis atau Transfer Bank BCA */}
            {checkoutStep === "payment" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-fg">Langkah 2 dari 2: Pembayaran SakuNota</span>
                  <p className="text-[11px] text-muted">
                    Selesaikan pembayaran untuk pesanan <strong>{currentOrderId}</strong> ({businessName}).
                  </p>
                </div>

                {snapError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold">
                    ⚠️ {snapError}
                  </div>
                )}

                {/* PILIHAN 1: MIDTRANS SNAP (INSTAN) */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-accent/10 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      ⚡ Gerbang Pembayaran Otomatis
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black uppercase">
                      QRIS • E-Wallet • Virtual Account
                    </span>
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed">
                    Bayar instan dengan scan QRIS (GoPay, OVO, Dana, BCA Mobile) atau transfer Virtual Account. Lisensi langsung terbit otomatis dalam hitungan detik setelah bayar.
                  </p>

                  <button
                    type="button"
                    onClick={handlePayWithMidtrans}
                    disabled={isInitiatingSnap}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isInitiatingSnap ? "Membuka Gerbang Midtrans..." : "Bayar Otomatis Rp65.000 via Midtrans →"}</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-line"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-muted uppercase">Atau Transfer Bank Manual</span>
                  <div className="flex-grow border-t border-line"></div>
                </div>

                {/* PILIHAN 2: TRANSFER BANK BCA RESMI */}
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

                  {/* Real File Upload Bukti Transfer */}
                  <div className="pt-2 border-t border-line space-y-2">
                    <span className="text-[11px] font-bold text-fg block">
                      Lampirkan Foto Bukti Transfer:
                    </span>
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-line hover:border-accent bg-surface cursor-pointer transition-colors text-xs font-bold">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setTransferProofFileName(file.name);
                        }}
                      />
                      <span>{transferProofFileName ? `✅ Terlampir: ${transferProofFileName}` : "📎 Ketuk untuk Unggah Struk / Screenshot Bukti Transfer"}</span>
                    </label>
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

                {/* Status Box with Secret Access Code */}
                <div className="p-4 rounded-2xl bg-card border border-line text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-line">
                    <span className="text-muted">Nomor Pesanan:</span>
                    <strong className="font-mono font-black text-fg text-sm">{currentOrderId}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-line bg-accent/5 -mx-4 px-4 py-2">
                    <div>
                      <span className="text-[10px] text-muted block uppercase font-bold">Kode Akses Rahasia Anda:</span>
                      <strong className="font-mono font-black text-accent-text text-sm select-all">{currentAccessCode}</strong>
                    </div>
                    <span className="text-[9px] text-muted max-w-[170px] text-right font-medium">
                      Simpan kode ini untuk mengecek status pesanan secara privat
                    </span>
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
                    3. Buka tombol <strong>Cek Status Lisensi</strong> dengan nomor pesanan <strong>{currentOrderId}</strong> dan kode akses <strong>{currentAccessCode}</strong> untuk mengambil nomor lisensi Anda.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/6281234567890?text=Halo%20Mas%20Reza%20(Owner%20SakuNota),%20saya%20sudah%20transfer%20Rp65.000%20untuk%20pesanan%20${currentOrderId}%20(${businessName}).%20Kode%20akses:%20${currentAccessCode}.%20Mohon%20verifikasi%20dan%20terbitkan%20lisensi.`}
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

      {/* 14. Modal Cek Status Pesanan / Lisensi Saya */}
      {isCheckStatusModalOpen && (
        <div 
          onClick={() => setIsCheckStatusModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl cursor-default"
          >
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔍</span>
                <div>
                  <h3 className="font-black text-sm text-fg">Cek Status Pesanan & Lisensi</h3>
                  <span className="text-[10px] text-muted block">Akses privat khusus pemilik pesanan</span>
                </div>
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
                <label className="block text-[11px] font-bold text-fg mb-1">
                  Nomor Pesanan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="SN-2026-XXXX"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-fg mb-1">
                  Kode Akses Rahasia Pembeli *
                </label>
                <input
                  type="text"
                  required
                  placeholder="KOD-XXXX"
                  value={searchAccessCode}
                  onChange={(e) => setSearchAccessCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-accent outline-none font-mono uppercase"
                />
                <span className="text-[10px] text-muted block mt-1">
                  Kode rahasia diberikan saat Anda mengirim bukti transfer.
                </span>
              </div>

              {searchError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
                  ⚠️ {searchError}
                </div>
              )}

              <button
                type="submit"
                disabled={isSearchingOrder}
                className="w-full py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isSearchingOrder ? "Memeriksa Status..." : "Periksa Status & Tampilkan Lisensi →"}
              </button>
            </form>

            {/* Hasil Pencarian Terverifikasi */}
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
                    <strong className="text-amber-600 dark:text-amber-400 block font-bold">Sedang Menunggu Verifikasi Reza (Owner)</strong>
                    <p>
                      Bukti transfer sedang diverifikasi di mutasi bank. Setelah Reza menekan konfirmasi, lisensi resmi akan langsung terbit di sini.
                    </p>
                  </div>
                )}
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

      {/* 15. Footer */}
      <footer className="mt-auto border-t border-line bg-surface px-4 sm:px-8 py-10 text-xs text-muted">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-black text-xs">
              SN
            </div>
            <div>
              <span className="font-bold text-fg block">SakuNota</span>
              <span className="text-[11px] text-muted">Kasir Jalan Tanpa Internet.</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <a href="#pasang-hp" className="hover:text-blue-600 dark:text-blue-400 font-extrabold text-blue-600 dark:text-blue-400 transition-colors">
              📱 Pasang di HP
            </a>
            <span className="text-line">•</span>
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors font-bold text-emerald-600 dark:text-emerald-400"
            >
              Bantuan WhatsApp
            </a>
            <span className="text-line">•</span>
            <Link href="/panduan" className="hover:text-fg transition-colors">
              Buku Panduan
            </Link>
            <span className="text-line">•</span>
            <a href="mailto:support@sakunota.my.id" className="hover:text-fg transition-colors">
              support@sakunota.my.id
            </a>
            <span className="text-line">•</span>
            <Link href="/pos" className="text-accent-text font-bold hover:underline">
              Buka Kasir POS
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-line/40 text-center text-[11px] text-muted">
          © 2026 SakuNota. Kasir simpel untuk warung, restoran, kafe, dan retail di Indonesia.
        </div>
      </footer>
    </div>
  );
}
