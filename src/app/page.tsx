"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  CustomerOrder, 
  submitBuyerOrder, 
  checkOrderStatusServer,
  activateLicenseServer,
  registerBetaServer,
} from "@/lib/ordersClient";
import {
  SUPPORT_WHATSAPP,
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_ACCOUNT_NUMBER,
} from "@/lib/config";
import AntiGravityGalaxy from "@/components/AntiGravityGalaxy";

export default function SakuNotaLandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Closed Beta Registration State
  const [isBetaModalOpen, setIsBetaModalOpen] = useState(false);
  const [betaOwnerName, setBetaOwnerName] = useState("");
  const [betaBusinessName, setBetaBusinessName] = useState("");
  const [betaWhatsapp, setBetaWhatsapp] = useState("");
  const [betaHoneypot, setBetaHoneypot] = useState("");
  const [isSubmittingBeta, setIsSubmittingBeta] = useState(false);
  const [betaSuccessResult, setBetaSuccessResult] = useState<any>(null);
  const [betaErrorMsg, setBetaErrorMsg] = useState("");

  const handleSubmitBeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setBetaErrorMsg("");
    if (!betaOwnerName.trim()) {
      setBetaErrorMsg("Mohon masukkan nama lengkap pemilik usaha.");
      return;
    }
    if (!betaBusinessName.trim()) {
      setBetaErrorMsg("Mohon masukkan nama usaha / warung Anda.");
      return;
    }
    const cleanPhone = betaWhatsapp.replace(/[^0-9]/g, "");
    if (!cleanPhone || cleanPhone.length < 9) {
      setBetaErrorMsg("Nomor WhatsApp tidak valid (minimal 9 digit).");
      return;
    }

    setIsSubmittingBeta(true);
    try {
      const res = await registerBetaServer({
        ownerName: betaOwnerName.trim(),
        businessName: betaBusinessName.trim(),
        whatsapp: cleanPhone,
        honeypot: betaHoneypot,
      });
      if (res.success && res.registration) {
        setBetaSuccessResult(res.registration);
      } else {
        setBetaErrorMsg(res.error || "Gagal mendaftar. Silakan coba kembali.");
      }
    } catch (err: any) {
      setBetaErrorMsg("Terjadi gangguan koneksi: " + (err.message || err));
    } finally {
      setIsSubmittingBeta(false);
    }
  };

  // Mini Interactive Simulation State (Coba Kasir SakuNota)
  // Default values: Kopi Susu (12k x 1) + Es Teh (4k x 2) = 3 porsi, Total Rp 20.000
  const sampleProducts = [
    { id: "p1", name: "Kopi Susu Gula Aren", price: 12000, cat: "Minuman" },
    { id: "p2", name: "Es Teh Manis", price: 4000, cat: "Minuman" },
    { id: "p3", name: "Nasi Goreng Spesial", price: 18000, cat: "Makanan" },
    { id: "p4", name: "Sate Taichan Crispy", price: 15000, cat: "Camilan" },
  ];
  const [demoCart, setDemoCart] = useState<{ [id: string]: number }>({ p1: 1, p2: 2 });
  const [showDemoReceipt, setShowDemoReceipt] = useState(false);

  const demoTotalCount = Object.values(demoCart).reduce((a, b) => a + b, 0);
  const demoTotalPrice = Object.entries(demoCart).reduce((sum, [id, qty]) => {
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
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment" | "waiting" | "success">("form");
  const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null);
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
  const [isActivatingHere, setIsActivatingHere] = useState(false);
  const [activateMsg, setActivateMsg] = useState("");
  const [isActivatedHere, setIsActivatedHere] = useState(false);

  // Check Order / Direct License Activation State
  const [isCheckStatusModalOpen, setIsCheckStatusModalOpen] = useState(false);
  const [statusModalTab, setStatusModalTab] = useState<"direct_license" | "order_lookup">("direct_license");
  const [directLicenseInput, setDirectLicenseInput] = useState("");
  const [directDeviceName, setDirectDeviceName] = useState("");
  const [isActivatingDirect, setIsActivatingDirect] = useState(false);
  const [directActivateSuccess, setDirectActivateSuccess] = useState<string | null>(null);
  const [directActivateError, setDirectActivateError] = useState("");

  const [searchOrderId, setSearchOrderId] = useState("");
  const [searchAccessCode, setSearchAccessCode] = useState("");
  const [searchResult, setSearchResult] = useState<CustomerOrder | null>(null);
  const [searchAttempted, setSearchAttempted] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [isSearchingOrder, setIsSearchingOrder] = useState(false);
  const [copiedLicense, setCopiedLicense] = useState(false);

  // Load Midtrans Snap Script on demand when user opens Buy Modal
  useEffect(() => {
    if (!isBuyModalOpen) return;
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
        // Handled silently when offline
      });
  }, [isBuyModalOpen]);

  // Escape key listener to close modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsBuyModalOpen(false);
        setIsCheckStatusModalOpen(false);
        setIsBetaModalOpen(false);
        setShowDemoReceipt(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle URL query parameters and Midtrans callback
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("beta") === "register") {
        setIsBetaModalOpen(true);
      } else if (params.get("beli") === "true") {
        setIsBuyModalOpen(true);
      } else if (params.get("aktivasi") === "true") {
        setStatusModalTab("direct_license");
        setIsCheckStatusModalOpen(true);
      }

      const paymentStatus = params.get("payment");
      const ordId = params.get("orderId");
      const code = params.get("accessCode");
      if (paymentStatus === "finish" && ordId && code) {
        setSearchOrderId(ordId);
        setSearchAccessCode(code);
        setStatusModalTab("order_lookup");
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

  const handleOpenLicenseModal = (tab: "direct_license" | "order_lookup" = "direct_license") => {
    setStatusModalTab(tab);
    setDirectActivateError("");
    setDirectActivateSuccess(null);
    setSearchError("");
    setIsCheckStatusModalOpen(true);
  };

  const handleDirectActivateLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    setDirectActivateError("");
    setDirectActivateSuccess(null);

    const key = directLicenseInput.trim().toUpperCase();
    if (!key) {
      setDirectActivateError("Mohon masukkan Kode Lisensi SakuNota atau Lisensi Tester Anda.");
      return;
    }

    setIsActivatingDirect(true);
    try {
      const res = await activateLicenseServer(key, directDeviceName.trim() || "Perangkat Kasir Utama");
      if (res.success) {
        setDirectActivateSuccess(
          `Lisensi berhasil diaktifkan untuk "${res.businessName || "Toko Anda"}"! Kasir sekarang siap digunakan 100% offline.`
        );
      } else {
        setDirectActivateError(res.error || "Kode lisensi tidak ditemukan atau sudah terikat di perangkat lain.");
      }
    } catch (err: any) {
      setDirectActivateError("Gagal menghubungi server: " + (err.message || err));
    } finally {
      setIsActivatingDirect(false);
    }
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
        setSnapError("Respon server pembayaran kosong. Pastikan MIDTRANS_SERVER_KEY sudah disimpan.");
        return;
      }

      if (data.success && data.token) {
        if (typeof (window as any).snap !== "undefined" && (window as any).snap.pay) {
          (window as any).snap.pay(data.token, {
            onSuccess: async function () {
              setIsInitiatingSnap(true);
              setSnapError("");
              try {
                const chk = await checkOrderStatusServer(currentOrderId, currentAccessCode);
                if (chk.success && chk.order) {
                  setCreatedOrder(chk.order);
                }
              } catch (_) {}
              setIsInitiatingSnap(false);
              setCheckoutStep("success");
            },
            onPending: function () {
              setCheckoutStep("waiting");
            },
            onError: function (err: any) {
              setSnapError("Pembayaran gagal diproses: " + (err?.status_message || "Silakan coba lagi."));
            },
            onClose: function () {},
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

  const handleActivateOnThisDevice = async (licenseKey: string) => {
    if (!licenseKey) return;
    setIsActivatingHere(true);
    setActivateMsg("");
    try {
      const res = await activateLicenseServer(licenseKey, "Perangkat Kasir Utama");
      if (res.success) {
        setIsActivatedHere(true);
        setActivateMsg("✅ Lisensi resmi berhasil diaktifkan di perangkat ini! Kasir Anda siap digunakan tanpa internet.");
      } else {
        setActivateMsg("❌ " + (res.error || "Gagal mengaktifkan lisensi di perangkat ini."));
      }
    } catch (err: any) {
      setActivateMsg("❌ " + err.message);
    } finally {
      setIsActivatingHere(false);
    }
  };

  const handleSearchOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchAttempted(true);
    setSearchResult(null);
    setSearchError("");

    const ordId = searchOrderId.trim().toUpperCase();
    const code = searchAccessCode.trim().toUpperCase();

    if (!ordId) {
      setSearchError("Mohon masukkan Nomor Pesanan atau Kode Lisensi.");
      return;
    }

    // Jika pengguna memasukkan Kode Lisensi langsung (misal SN-TEST-XXXX atau SN-XXXX-XXXX-XXXX) tanpa Nomor Pesanan
    if (
      ordId.startsWith("SN-TEST-") ||
      ordId.startsWith("SN-TRIAL-") ||
      (!ordId.startsWith("SN-202") && ordId.startsWith("SN-") && !code)
    ) {
      setDirectLicenseInput(ordId);
      setStatusModalTab("direct_license");
      setIsActivatingDirect(true);
      try {
        const actRes = await activateLicenseServer(ordId, "Perangkat Kasir Utama");
        if (actRes.success) {
          setDirectActivateSuccess(
            `Lisensi "${ordId}" berhasil diaktifkan untuk "${actRes.businessName || "Toko Anda"}"! Silakan langsung buka kasir.`
          );
        } else {
          setDirectActivateError(actRes.error || "Kode lisensi tidak valid atau sudah terpakai.");
        }
      } catch (err: any) {
        setDirectActivateError("Koneksi gagal: " + (err.message || err));
      } finally {
        setIsActivatingDirect(false);
      }
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

  const businessTickerList = [
    "Warung Makan",
    "Rumah Makan",
    "Restoran",
    "Kafe",
    "Kedai Kopi",
    "Kedai Minuman",
    "Street Food",
    "Booth Jajanan",
    "Catering",
    "Cloud Kitchen",
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 px-4 sm:px-8 py-3.5 transition-all shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-2 group" title="SakuNota - Kasir Jalan Tanpa Internet">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota - Kasir Jalan Tanpa Internet"
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-700">
            <a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur</a>
            <a href="#jenis-usaha" className="hover:text-blue-600 transition-colors">Jenis Usaha</a>
            <a href="#harga" className="hover:text-blue-600 transition-colors">Harga</a>
            <Link href="/panduan" className="hover:text-blue-600 transition-colors">Panduan</Link>
            <Link href="/tentang" className="hover:text-blue-600 transition-colors">Tentang Kami</Link>
          </nav>

          {/* Action CTAs & Controls (Light Mode Only - No Dark Toggle) */}
          <div className="hidden sm:flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleOpenLicenseModal("direct_license")}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-all border border-blue-200 flex items-center gap-1.5"
            >
              <span>Aktivasi Lisensi</span>
            </button>
            <Link
              href="/pos?demo=true"
              onClick={() => {
                try { sessionStorage.setItem("sakunota_demo_mode", "true"); } catch (_) {}
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all border border-slate-200"
            >
              Coba Kasir
            </Link>
            <button
              type="button"
              onClick={handleOpenBuyModal}
              className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all shadow-md shadow-blue-600/25 active:scale-95"
            >
              Beli SakuNota
            </button>
          </div>

          {/* Mobile Hamburger Button (High Contrast Light Blue) */}
          <div className="flex items-center gap-2 sm:hidden">
            <button
              type="button"
              onClick={() => handleOpenLicenseModal("direct_license")}
              className="px-2.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-[11px] flex items-center gap-1 shadow-xs active:scale-95"
            >
              <span>Aktivasi</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-blue-600/25 active:scale-95"
              aria-label="Toggle menu"
            >
              <span>Menu</span>
              <span>{mobileMenuOpen ? "✕" : "☰"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Modal Menu (High Contrast Light Blue & Compact 4-Grid) */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-50 flex items-start justify-center pt-16 p-4 bg-slate-900/50 backdrop-blur-xs sm:hidden cursor-pointer animate-in fade-in duration-150"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white border-2 border-blue-200 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl cursor-default animate-in zoom-in-95 duration-150"
            >
              {/* Header inside popup */}
              <div className="flex items-center justify-between pb-3 border-b border-blue-100">
                <div className="flex items-center gap-2">
                  <img
                    src="/logo-sakunota.png"
                    alt="SakuNota"
                    className="h-8 w-auto object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-8 h-8 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-black flex items-center justify-center transition-colors"
                  aria-label="Tutup Menu"
                >
                  ✕
                </button>
              </div>

              {/* Compact 4-Grid Nav Links */}
              <div>
                <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-2">
                  Menu Navigasi Cepat:
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <a 
                    href="#fitur" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-1.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-900 hover:border-blue-600 hover:bg-blue-100 transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-base">⚡</span>
                    <span className="text-[11px] font-extrabold">Fitur</span>
                  </a>
                  <a 
                    href="#jenis-usaha" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-1.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-900 hover:border-blue-600 hover:bg-blue-100 transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-base">🏪</span>
                    <span className="text-[11px] font-extrabold">Usaha</span>
                  </a>
                  <a 
                    href="#harga" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-1.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-900 hover:border-blue-600 hover:bg-blue-100 transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-base">🏷️</span>
                    <span className="text-[11px] font-extrabold">Harga</span>
                  </a>
                  <Link 
                    href="/panduan" 
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-1.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-slate-900 hover:border-blue-600 hover:bg-blue-100 transition-all flex flex-col items-center justify-center gap-1 active:scale-95"
                  >
                    <span className="text-base">📖</span>
                    <span className="text-[11px] font-extrabold">Panduan</span>
                  </Link>
                </div>

                {/* Second Row: Tentang Kami & Aktivasi Lisensi */}
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <Link
                    href="/tentang"
                    onClick={() => setMobileMenuOpen(false)}
                    className="py-2.5 px-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:border-blue-500 hover:text-blue-600 transition-all"
                  >
                    <span>Tentang Kami</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleOpenLicenseModal("direct_license");
                    }}
                    className="py-2.5 px-3 rounded-2xl bg-blue-50 border border-blue-300 text-blue-700 font-extrabold text-xs flex items-center justify-center gap-1.5 hover:bg-blue-100 transition-all"
                  >
                    <span>Aktivasi Lisensi</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
                <Link
                  href="/pos?demo=true"
                  onClick={() => {
                    try { sessionStorage.setItem("sakunota_demo_mode", "true"); } catch (_) {}
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-3 text-center rounded-2xl bg-slate-100 border border-slate-300 text-xs font-extrabold text-slate-900 hover:bg-slate-200 transition-all active:scale-95"
                >
                  Coba Demo Kasir
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenBuyModal();
                  }}
                  className="w-full py-3.5 text-center rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-md shadow-blue-600/30 transition-all active:scale-95"
                >
                  Beli SakuNota - Rp50.000
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section with Galaxy Background (Without "Anti-Gravity Offline Engine" text) */}
      <section className="relative pt-14 pb-16 px-4 sm:px-8 overflow-hidden bg-white min-h-[520px] flex items-center justify-center">
        {/* Interactive Galaxy Background */}
        <AntiGravityGalaxy />
        
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* Top Pill Slogan Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50/95 backdrop-blur-md border border-blue-200 text-blue-700 text-xs font-extrabold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Kasir Jalan Tanpa Internet</span>
            <span className="text-blue-300">•</span>
            <span className="text-blue-800">Sekali Bayar Rp50.000</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Kasir Simpel, Tetap Offline.
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-600 tracking-tight">
              Jualan Lancar, Internet Mati Bukan Masalah.
            </p>
          </div>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
            Catat pesanan makanan dan minuman, kelola meja, cetak struk Bluetooth, dan pantau omzet usaha dari satu aplikasi. Tanpa biaya bulanan.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <Link
              href="/pos?demo=true"
              onClick={() => {
                try { sessionStorage.setItem("sakunota_demo_mode", "true"); } catch (_) {}
              }}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-slate-900 hover:text-blue-700 font-extrabold text-xs border-2 border-slate-300 hover:border-blue-300 shadow-xs transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Coba Demo Kasir</span>
            </Link>

            <button
              type="button"
              onClick={handleOpenBuyModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/25 transition-all active:scale-95 text-center flex items-center justify-center gap-2"
            >
              <span>Beli SakuNota - Rp50.000</span>
              <span>→</span>
            </button>
          </div>

          {/* Direct License Activation & Trial Links */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs">
            <button
              type="button"
              onClick={() => handleOpenLicenseModal("direct_license")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-extrabold transition-all shadow-2xs"
            >
              <span>Sudah Punya Lisensi / Kode Tester? Aktifkan Langsung</span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBetaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              <span>Daftar Closed Beta (Free Trial 7 Hari)</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* 3. SakuNota POS Dashboard / Menu (Interactive Mini Demo Kasir) */}
      <section className="relative pb-20 px-4 sm:px-8 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          {/* Card Frame */}
          <div className="rounded-3xl bg-white border border-blue-100 p-4 sm:p-8 shadow-xl shadow-blue-900/5 space-y-5">
            
            {/* Window Topbar / Headers */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-blue-200" />
                  <div className="w-3 h-3 rounded-full bg-blue-300" />
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                </div>
                <div className="h-4 w-px bg-slate-200 mx-1" />
                <span className="text-xs font-extrabold text-slate-800">
                  SakuNota Kasir Interaktif
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200 text-[11px] font-extrabold text-blue-700">
                <span>Simulasi Menu</span>
              </div>
            </div>

            {/* Simulation Header */}
            <div className="space-y-1">
              <h2 className="text-base sm:text-xl font-black text-slate-900">
                Coba Kasir SakuNota Langsung di Sini
              </h2>
              <p className="text-xs text-slate-600">
                Ketuk tombol tambah (+) pada menu di bawah dan lihat hasil cetak struk nota fisik secara langsung.
              </p>
            </div>

            {/* Menu Items Grid: Compact 2x2 on Mobile, 4-Grid on Desktop */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-extrabold text-slate-700 tracking-wider uppercase block">
                Daftar Menu Pilihan (4 Grid Ringkas):
              </span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                {sampleProducts.map((prod) => {
                  const qty = demoCart[prod.id] || 0;
                  return (
                    <div 
                      key={prod.id}
                      className="p-3 sm:p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-blue-400 transition-all flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <span className="inline-block px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-bold text-blue-700 mb-1">
                          {prod.cat}
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2">
                          {prod.name}
                        </h4>
                        <span className="text-xs font-black text-blue-600 mt-1 block">
                          Rp {prod.price.toLocaleString("id-ID")}
                        </span>
                      </div>

                      {/* Add/Remove Controls */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => handleDemoQtyChange(prod.id, -1)}
                          disabled={qty === 0}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 disabled:opacity-30 text-slate-900 font-black text-xs flex items-center justify-center transition-colors"
                          aria-label={`Kurang ${prod.name}`}
                        >
                          -
                        </button>
                        <span className="text-xs font-black text-slate-900">
                          {qty}x
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDemoQtyChange(prod.id, 1)}
                          className="w-7 h-7 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center transition-colors shadow-xs"
                          aria-label={`Tambah ${prod.name}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Keranjang Pembeli Box */}
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold text-blue-700 uppercase tracking-wider block">
                  Keranjang Pembeli:
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xs sm:text-sm font-extrabold text-slate-800">
                    {demoTotalCount} Porsi
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-sm sm:text-base font-black text-slate-900">
                    Total: Rp {demoTotalPrice.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowDemoReceipt(true)}
                className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <span>Lihat Simulasi Struk Nota</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Features Section (Compact Grid on Mobile - No Horizontal Slide!) */}
      <section id="fitur" className="py-16 sm:py-20 px-4 sm:px-8 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-12">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">
              Fitur Unggulan
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Fitur Lengkap Dirancang untuk Kecepatan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Semua yang dibutuhkan operasional kasir makanan dan minuman tanpa tombol berlebih yang membingungkan.
            </p>
          </div>

          {/* Mobile 4-Grid Icon Summary Bar */}
          <div className="grid grid-cols-4 gap-2 sm:hidden">
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-lg block">🍽️</span>
              <span className="text-[10px] font-extrabold text-blue-900 block mt-0.5 leading-tight">Kasir &amp; Meja</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-lg block">🖨️</span>
              <span className="text-[10px] font-extrabold text-blue-900 block mt-0.5 leading-tight">Cetak Struk</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-lg block">📊</span>
              <span className="text-[10px] font-extrabold text-blue-900 block mt-0.5 leading-tight">Rekap WA</span>
            </div>
            <div className="p-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-center">
              <span className="text-lg block">🛡️</span>
              <span className="text-[10px] font-extrabold text-blue-900 block mt-0.5 leading-tight">100% Offline</span>
            </div>
          </div>

          {/* 2x2 Grid on Mobile & Desktop (No Horizontal Scroll) */}
          <div className="grid grid-cols-2 gap-3 sm:gap-6">
            
            {/* Feature 1: Transaksi Fleksibel */}
            <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-6 group">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-extrabold border border-blue-200">
                  <span>Transaksi Fleksibel</span>
                </div>
                <h3 className="text-xs sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  Mode Kasir Cepat atau Denah Meja &amp; Open Bill
                </h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed">
                  Atur menu makanan, minuman, tingkat kepedasan, hingga topping tambahan. Pas untuk warung makan cepat saji maupun restoran dengan sistem meja.
                </p>
                <ul className="hidden sm:block space-y-2 pt-1 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Mode kasir cepat untuk pesanan bungkus atau denah meja interaktif untuk restoran.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Pisah dan gabung nota pembayaran dengan mudah tanpa membingungkan kasir.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-1">
                <span className="text-[11px] sm:text-xs font-extrabold text-blue-600 group-hover:underline inline-flex items-center gap-1">
                  Transaksi Fleksibel →
                </span>
              </div>
            </div>

            {/* Feature 2: Cetak Struk */}
            <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-6 group">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-extrabold border border-blue-200">
                  <span>Cetak Struk</span>
                </div>
                <h3 className="text-xs sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  Cetak Struk Bluetooth Tanpa Internet
                </h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed">
                  Terhubung langsung via Bluetooth ke printer thermal 58mm maupun 80mm tanpa butuh router Wi-Fi atau kuota internet.
                </p>
                <ul className="hidden sm:block space-y-2 pt-1 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Koneksi instan ke printer thermal Bluetooth (Panda, VSC, Eppos, Zjiang, Kassen, dll).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Struk tercetak instan, rapi, dan tersimpan aman di memori HP.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-1">
                <span className="text-[11px] sm:text-xs font-extrabold text-blue-600 group-hover:underline inline-flex items-center gap-1">
                  Cetak Struk →
                </span>
              </div>
            </div>

            {/* Feature 3: Audit & Laporan */}
            <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-6 group">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-extrabold border border-blue-200">
                  <span>Audit &amp; Laporan</span>
                </div>
                <h3 className="text-xs sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  Rekap Omzet Harian &amp; Kirim Laporan ke WhatsApp
                </h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed">
                  Hitung kas masuk-keluar secara akurat, pantau menu terlaris, dan kirim rekap harian langsung ke WhatsApp pemilik usaha.
                </p>
                <ul className="hidden sm:block space-y-2 pt-1 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Hitung kas masuk dan keluar shift secara objektif dan akurat.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Kirim rekapitulasi penjualan harian langsung ke WhatsApp pemilik.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-1">
                <span className="text-[11px] sm:text-xs font-extrabold text-blue-600 group-hover:underline inline-flex items-center gap-1">
                  Rekap Omzet &amp; WA →
                </span>
              </div>
            </div>

            {/* Feature 4: Privasi & Perangkat */}
            <div className="p-4 sm:p-7 rounded-2xl sm:rounded-3xl bg-slate-50 border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between gap-3 sm:gap-6 group">
              <div className="space-y-2.5 sm:space-y-4">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] sm:text-xs font-extrabold border border-blue-200">
                  <span>Privasi &amp; Backup</span>
                </div>
                <h3 className="text-xs sm:text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  100% Offline di Memori HP &amp; Cadangkan Mandiri
                </h3>
                <p className="text-[11px] sm:text-sm text-slate-600 leading-relaxed">
                  Seluruh data tersimpan privat di perangkat Anda sendiri. Mudah dicadangkan ke file dan dipulihkan saat ganti HP baru.
                </p>
                <ul className="hidden sm:block space-y-2 pt-1 text-xs text-slate-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Buka kasir hanya dalam 1 detik tanpa menunggu loading server luar.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold">✓</span>
                    <span>Backup data ke file HP kapan saja dan pulihkan saat ganti perangkat.</span>
                  </li>
                </ul>
              </div>
              <div className="pt-1">
                <span className="text-[11px] sm:text-xs font-extrabold text-blue-600 group-hover:underline inline-flex items-center gap-1">
                  100% Offline &amp; Aman →
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 5. Jenis Usaha Section (Compact Grid on Mobile - No Horizontal Slide!) */}
      <section id="jenis-usaha" className="py-16 sm:py-20 px-4 sm:px-8 border-t border-slate-200 bg-slate-50/70">
        <div className="max-w-5xl mx-auto space-y-8 sm:space-y-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">
              Jenis Usaha
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Cocok untuk Berbagai Usaha Kuliner Anda
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              SakuNota menyesuaikan alur kerja kasir secara otomatis tanpa perlu setup rumit.
            </p>
          </div>

          {/* Compact 2x2 on Mobile, 4-Grid on Desktop (No Horizontal Slide) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* 1. Warung Makan */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black">
                🍛
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Warung Makan &amp; Kuliner Harian
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Langsung bayar cepat, hitung uang tunai dan kembalian otomatis tanpa ribet pilih nomor meja.
              </p>
            </div>

            {/* 2. Rumah Makan & Restoran */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black">
                🍽️
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Rumah Makan &amp; Restoran (Meja &amp; Open Bill)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Pelanggan duduk santai duluan, tambah pesanan berkala, dan bayar split bill saat selesai makan.
              </p>
            </div>

            {/* 3. Kafe & Kedai Minuman */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black">
                ☕
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Kafe &amp; Kedai Minuman (Varian &amp; Topping)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Pilihan topping tambahan, tingkat kemanisan, pergantian shift barista, dan kirim rekap WhatsApp.
              </p>
            </div>

            {/* 4. Booth Jajanan */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black">
                🥡
              </div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Booth Jajanan &amp; Street Food (Ringan)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Cepat dan hemat daya baterai. Siap diajak jualan di bazar, food court, maupun gerobak jalanan.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* 6. Pricing Section */}
      <section id="harga" className="py-16 sm:py-20 px-4 sm:px-8 border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">
              Harga Lisensi
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Satu Harga Sekali Bayar &amp; Siap Dipasang di HP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Tanpa langganan bulanan. Tanpa potongan komisi penjualan.
            </p>
          </div>

          {/* Pricing Cards: Side-by-Side (Bersebelahan) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
            
            {/* Card 1: SakuNota (Featured Hero Card) */}
            <div className="rounded-3xl bg-white border-2 border-blue-600 p-6 sm:p-8 shadow-xl shadow-blue-600/10 flex flex-col justify-between relative space-y-6">
              
              <div className="space-y-6">
                {/* Badge & Title */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-200">
                    <span>🔥</span>
                    <span>Promo Peluncuran</span>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600">
                    Lisensi 1 Perangkat
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">SakuNota</h3>
                  <p className="text-xs text-slate-600">
                    Sekali bayar untuk 1 perangkat kasir aktif selamanya.
                  </p>
                </div>

                {/* Price Numbers */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-3">
                    <span className="text-sm text-slate-400 line-through font-bold">
                      Rp99.000
                    </span>
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                      Rp50.000
                    </span>
                  </div>
                  <span className="text-[11px] text-blue-600 font-bold block">
                    Sekali bayar seumur hidup • 0% Komisi
                  </span>
                </div>

                {/* Checkmarks */}
                <div className="pt-2 border-t border-slate-100 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-black text-sm leading-none">✓</span>
                    <span className="font-semibold">Seluruh Fitur Kasir Lengkap (Menu, Varian &amp; Meja)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-black text-sm leading-none">✓</span>
                    <span className="font-semibold">100% Offline (Tetap jualan lancar tanpa internet)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-black text-sm leading-none">✓</span>
                    <span className="font-semibold">Cetak Struk Bluetooth Mini Thermal (58mm &amp; 80mm)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-black text-sm leading-none">✓</span>
                    <span className="font-semibold">Rekap Kas &amp; Kirim Laporan Harian ke WhatsApp</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-black text-sm leading-none">✓</span>
                    <span className="font-semibold">Data Tersimpan Privat di Memori HP Sendiri</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-blue-600 font-black text-sm leading-none">✓</span>
                    <span className="font-semibold">Tanpa Biaya Bulanan / Tanpa Potongan Penjualan</span>
                  </div>
                </div>
              </div>

              {/* Buy CTA Button */}
              <div className="pt-4 space-y-3">
                <button
                  type="button"
                  onClick={handleOpenBuyModal}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/25 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>Beli SakuNota Sekarang</span>
                  <span>→</span>
                </button>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => handleOpenLicenseModal("direct_license")}
                    className="text-blue-600 hover:text-blue-800 underline font-extrabold transition-colors"
                  >
                    🔑 Sudah Punya Kode Lisensi? Aktifkan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsBetaModalOpen(true)}
                    className="text-slate-600 hover:text-blue-600 underline font-semibold transition-colors"
                  >
                    Coba Gratis 7 Hari (Beta)
                  </button>
                </div>
              </div>

            </div>

            {/* Card 2: Aplikasi Lain (Comparison Card Side-by-Side) */}
            <div className="rounded-3xl bg-slate-50 border border-slate-200 p-6 sm:p-8 flex flex-col justify-between relative space-y-6">
              
              <div className="space-y-6">
                {/* Badge & Title */}
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-200/80 text-slate-800 text-xs font-bold">
                    <span>Aplikasi Lain</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-600">
                    Sistem Langganan
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-bold text-slate-800 tracking-tight">Aplikasi Lain</h3>
                  <p className="text-xs text-slate-600">
                    Model sewa software berbasis server cloud pihak ketiga.
                  </p>
                </div>

                {/* Price Numbers */}
                <div className="space-y-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-700 tracking-tight">
                      Rp150rb - Rp350rb
                    </span>
                    <span className="text-xs text-slate-600 font-semibold">/ bulan</span>
                  </div>
                  <span className="text-[11px] text-slate-600 block">
                    Beban rutin ~Rp1.800.000 - Rp4.200.000 per tahun
                  </span>
                </div>

                {/* Drawbacks Checklist */}
                <div className="pt-2 border-t border-slate-200 space-y-2.5 text-xs text-slate-700">
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold text-sm leading-none">✕</span>
                    <span>Wajib terhubung internet terus (transaksi macet saat offline)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold text-sm leading-none">✕</span>
                    <span>Ada potongan komisi atau biaya transaksi tambahan</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold text-sm leading-none">✕</span>
                    <span>Data tersimpan di server luar (terkunci jika berhenti langganan)</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold text-sm leading-none">✕</span>
                    <span>Tagihan bulanan tetap berjalan meski omzet warung sedang sepi</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="text-rose-500 font-bold text-sm leading-none">✕</span>
                    <span>Tergantung router Wi-Fi atau instalasi jaringan rumit</span>
                  </div>
                </div>
              </div>

              {/* Bottom Info Note */}
              <div className="pt-4">
                <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-[11px] text-slate-700 leading-relaxed text-center font-medium">
                  💡 Dengan beralih ke SakuNota sekali bayar, Anda menghemat jutaan rupiah setiap tahun dan memiliki kedaulatan data 100%.
                </div>
              </div>

            </div>

          </div>

        </div>
      </section>

      {/* 7. Resources (Install Guide - Compact 3-Grid on Mobile, No Horizontal Slide!) */}
      <section id="panduan" className="py-16 sm:py-20 px-4 sm:px-8 border-t border-slate-200 bg-slate-50/70">
        <div className="max-w-4xl mx-auto space-y-8 sm:space-y-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">
              Panduan Ringkas
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Pasang SakuNota ke Layar Utama HP
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Buka kasir secepat kilat langsung dari layar utama ponsel Anda tanpa harus mengetik alamat website berulang kali.
            </p>
          </div>

          {/* 3-Column Grid even on Mobile so no sliding is needed */}
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            
            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 sm:space-y-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center">
                1
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">Buka Website</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Buka SakuNota lewat Chrome (Android) atau Safari (iPhone).
              </p>
            </div>

            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 sm:space-y-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center">
                2
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">Menu Browser</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Ketuk titik tiga (⋮) di Chrome atau tombol Bagikan di Safari.
              </p>
            </div>

            <div className="p-3.5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2 sm:space-y-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-blue-600 text-white font-black text-xs sm:text-sm flex items-center justify-center">
                3
              </div>
              <h4 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">Pasang ke Layar</h4>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Pilih &quot;Tambahkan ke Layar Utama&quot; agar ikon tampil di HP.
              </p>
            </div>

          </div>

          <div className="text-center pt-1 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/panduan"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-sm transition-all"
            >
              <span>Buka Pusat Panduan Lengkap</span>
              <span>→</span>
            </Link>
            <button
              type="button"
              onClick={() => handleOpenLicenseModal("direct_license")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 shadow-xs transition-all"
            >
              <span>Aktivasi Kode Lisensi</span>
              <span>→</span>
            </button>
          </div>

        </div>
      </section>

      {/* 8. Common Questions (FAQ) */}
      <section id="tanya-jawab-utama" className="py-16 sm:py-20 px-4 sm:px-8 border-t border-slate-200 bg-white">
        <div className="max-w-3xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-blue-600 tracking-wider uppercase">
              Tanya Jawab (FAQ)
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Pertanyaan yang Sering Diajukan
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Temukan jawaban jelas atas pertanyaan seputar kasir SakuNota.
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Untuk apa aplikasi SakuNota?",
                a: "SakuNota adalah aplikasi kasir (Point of Sale) untuk warung makan, kafe, restoran, dan kedai kuliner agar pencatatan pesanan, pengelolaan meja, cetak struk Bluetooth, dan rekap omzet harian berjalan rapi tanpa biaya langganan bulanan.",
              },
              {
                q: "Apakah benar-benar bisa dipakai tanpa internet?",
                a: "Ya, 100% bisa dipakai tanpa koneksi internet. SakuNota bekerja langsung di memori HP Anda. Saat kuota habis, mati lampu, atau sinyal hilang total, kasir tetap melayani pembeli dan mencetak struk tanpa macet.",
              },
              {
                q: "Bagaimana cara mengaktifkan Lisensi SakuNota atau Lisensi Tester?",
                a: "Sangat mudah! Anda tidak perlu memasukkan Nomor Pesanan atau Kode Akses jika sudah memegang Kode Lisensi (misal SN-XXXX-XXXX-XXXX atau SN-TEST-XXXX). Cukup klik tombol '🔑 Aktivasi Lisensi' di bagian atas halaman ini atau langsung buka halaman Kasir (/pos), tempel kode lisensi Anda, lalu klik Aktifkan.",
              },
              {
                q: "Berapa harga SakuNota?",
                a: "Harga promo peluncuran hanya Rp50.000 (harga normal Rp99.000) sekali bayar untuk 1 perangkat kasir aktif selamanya. Tidak ada biaya bulanan dan tidak ada potongan komisi penjualan.",
              },
              {
                q: "Bagaimana cara memasangnya di HP?",
                a: "Buka sakunota.my.id melalui browser Chrome (Android) atau Safari (iPhone), ketuk menu pojok kanan atas lalu pilih 'Tambahkan ke Layar Utama' (Add to Home Screen). Ikon aplikasi SakuNota akan langsung muncul di layar HP Anda dan siap dijalankan secara offline.",
              },
            ].map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-4 font-extrabold text-xs sm:text-sm text-slate-900 hover:text-blue-600 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className="text-blue-600 font-mono text-base font-black">
                    {activeFaq === idx ? "−" : "+"}
                  </span>
                </button>
                {activeFaq === idx && (
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-2 text-xs sm:text-sm text-slate-700 leading-relaxed border-t border-slate-200/80 animate-in fade-in duration-150">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Need further assistance footer note */}
          <div className="text-center pt-4 space-y-1 text-xs">
            <span className="text-slate-600 block">Butuh bantuan lebih lanjut?</span>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 font-extrabold inline-flex items-center gap-1.5"
            >
              <span>Hubungi WhatsApp Resmi SakuNota</span>
              <span>→</span>
            </a>
          </div>

        </div>
      </section>

      {/* 9. Scrolling Marquee (Ticker) */}
      <section className="py-8 border-y border-slate-200 bg-white overflow-hidden select-none">
        <div className="max-w-5xl mx-auto text-center mb-4">
          <span className="text-[11px] font-extrabold tracking-widest text-slate-500 uppercase">
            Dirancang untuk Usaha Kuliner yang Mengutamakan Kecepatan
          </span>
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="animate-marquee items-center gap-8 text-xs sm:text-sm font-bold text-slate-700 whitespace-nowrap">
            {businessTickerList.concat(businessTickerList).map((biz, idx) => (
              <div key={idx} className="flex items-center gap-8">
                <span className="hover:text-blue-600 transition-colors">{biz}</span>
                <span className="text-slate-300">•</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. Pre-footer CTA: Ready to Get Started? */}
      <section className="py-20 px-4 sm:px-8 bg-gradient-to-b from-blue-50/70 to-slate-50 border-b border-slate-200 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Siap Mulai Menggunakan SakuNota?
          </h2>
          <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
            Kelola kasir usaha kuliner Anda lebih cepat dan tenang tanpa khawatir internet mati.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-lg mx-auto">
            <button
              type="button"
              onClick={handleOpenBuyModal}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-lg shadow-blue-600/30 transition-all active:scale-95"
            >
              Beli SakuNota - Rp50.000
            </button>
            <button
              type="button"
              onClick={() => handleOpenLicenseModal("direct_license")}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-extrabold text-xs border border-blue-200 shadow-xs transition-all"
            >
              🔑 Aktivasi Kode Lisensi / Tester
            </button>
          </div>
        </div>
      </section>

      {/* 11. Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 px-4 sm:px-8 py-14 text-xs text-slate-600">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10">
          
          {/* Col 1: Brand Info */}
          <div className="space-y-3">
            <div className="flex flex-col gap-1">
              <img
                src="/logo-sakunota.png"
                alt="SakuNota"
                className="h-8 w-auto object-contain self-start"
              />
            </div>
            <p className="text-blue-600 font-bold text-xs">
              Kasir Jalan Tanpa Internet
            </p>
            <p className="text-slate-600 text-[11px] leading-relaxed max-w-sm">
              Aplikasi kasir modern untuk UMKM, angkringan, kafe, dan retail. 100% jalan offline tanpa biaya langganan bulanan.
            </p>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <span className="text-slate-900 font-extrabold text-xs uppercase tracking-wider block">
              Produk &amp; Perusahaan
            </span>
            <ul className="space-y-2 text-xs font-medium">
              <li><a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur Kasir</a></li>
              <li><a href="#jenis-usaha" className="hover:text-blue-600 transition-colors">Jenis Usaha</a></li>
              <li><a href="#harga" className="hover:text-blue-600 transition-colors">Harga Lisensi</a></li>
              <li><Link href="/tentang" className="hover:text-blue-600 transition-colors font-bold text-blue-600">Tentang Kami</Link></li>
              <li><Link href="/pos?demo=true" className="hover:text-blue-600 transition-colors">Coba Demo Kasir</Link></li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div className="space-y-3">
            <span className="text-slate-900 font-extrabold text-xs uppercase tracking-wider block">
              Bantuan &amp; Lisensi
            </span>
            <ul className="space-y-2 text-xs font-medium">
              <li><Link href="/panduan" className="hover:text-blue-600 transition-colors">Panduan</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenLicenseModal("direct_license")}
                  className="hover:text-blue-600 transition-colors text-left font-bold text-blue-600"
                >
                  Aktivasi Kode Lisensi / Tester
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenLicenseModal("order_lookup")}
                  className="hover:text-blue-600 transition-colors text-left"
                >
                  Cek Status Lisensi / Pesanan
                </button>
              </li>
              <li>
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  Bantuan WhatsApp Resmi
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Privacy, Terms */}
        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
          <div>
            © 2026 SakuNota. Hak cipta dilindungi.
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/tentang" className="hover:text-blue-600 transition-colors">Tentang Kami</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

      {/* MODAL 1: Simulation Thermal Receipt Preview */}
      {showDemoReceipt && (
        <div 
          onClick={() => setShowDemoReceipt(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white text-slate-900 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 font-mono text-xs cursor-default border border-slate-200 animate-in zoom-in-95 duration-150"
          >
            <div className="text-center space-y-1 pb-3 border-b-2 border-dashed border-slate-300">
              <h3 className="font-black text-sm tracking-widest uppercase">SAKUNOTA</h3>
              <p className="text-[10px] text-slate-600">KASIR JALAN TANPA INTERNET</p>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-700">
                <span>Nota: #SN-DEMO-01</span>
                <span>Meja 04</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Kasir: Kasir 1</span>
                <span>{new Date().toLocaleDateString("id-ID")}</span>
              </div>
            </div>

            {/* Receipt Items */}
            <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
              {Object.entries(demoCart).map(([id, qty]) => {
                const item = sampleProducts.find((p) => p.id === id);
                if (!item) return null;
                return (
                  <div key={id} className="flex justify-between text-xs">
                    <span>{qty}x {item.name}</span>
                    <span className="font-bold">Rp {(item.price * qty).toLocaleString("id-ID")}</span>
                  </div>
                );
              })}
            </div>

            {/* Calculations */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between font-black text-sm pt-1 text-slate-900">
                <span>TOTAL:</span>
                <span>Rp {demoTotalPrice.toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>BAYAR TUNAI:</span>
                <span>Rp 50.000</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>KEMBALIAN:</span>
                <span>Rp {Math.max(0, 50000 - demoTotalPrice).toLocaleString("id-ID")}</span>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-dashed border-slate-300 text-center space-y-1 text-[10px] text-slate-600">
              <p className="font-bold tracking-wider">TERIMA KASIH TELAH BERKUNJUNG!</p>
              <p>Struk dicetak via Bluetooth Thermal 58mm</p>
            </div>

            <button
              type="button"
              onClick={() => setShowDemoReceipt(false)}
              className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-sans font-bold text-xs hover:bg-blue-700 transition-colors mt-2"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: Closed Beta Registration (Trial 7 Hari Gratis) */}
      {isBetaModalOpen && (
        <div 
          onClick={() => setIsBetaModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 cursor-default animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-black border border-blue-200">
                  <span>🚀 PROGRAM CLOSED BETA</span>
                </div>
                <h3 className="font-black text-xl text-slate-900">Uji Coba 7 Hari SakuNota</h3>
                <p className="text-xs text-slate-600">
                  Daftarkan usaha Anda untuk mendapatkan lisensi uji coba gratis selama 7 hari tanpa komitmen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBetaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-black transition-colors flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {betaSuccessResult ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto text-3xl">
                  🎉
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900">Pendaftaran Berhasil Dikirim!</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    Terima kasih, <strong>{betaSuccessResult.ownerName}</strong>. Pendaftaran usaha <strong>&ldquo;{betaSuccessResult.businessName}&rdquo;</strong> telah tercatat di sistem kami.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span>Status Pendaftaran:</span>
                    <span className="font-bold text-blue-600">Menunggu Persetujuan Owner</span>
                  </div>
                  <div className="flex justify-between">
                    <span>WhatsApp Terdaftar:</span>
                    <span className="font-mono font-bold text-slate-900">{betaSuccessResult.whatsapp}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Masa Uji Coba:</span>
                    <span className="font-bold text-slate-900">7 Hari Penuh (Setelah Diaktifkan)</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-xs text-blue-800 leading-relaxed text-left">
                  Tim SakuNota akan memverifikasi pendaftaran Anda dan mengirimkan nomor lisensi trial via WhatsApp. Anda bisa langsung mencoba demo kasir sambil menunggu!
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <Link
                    href="/pos?demo=true"
                    onClick={() => {
                      try { sessionStorage.setItem("sakunota_demo_mode", "true"); } catch (_) {}
                      setIsBetaModalOpen(false);
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-md text-center"
                  >
                    Coba Demo Kasir Sekarang →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setIsBetaModalOpen(false)}
                    className="py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitBeta} className="space-y-4">
                {/* Honeypot field - invisible to humans */}
                <div style={{ display: "none" }} aria-hidden="true">
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    value={betaHoneypot}
                    onChange={(e) => setBetaHoneypot(e.target.value)}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Pemilik Usaha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={betaOwnerName}
                    onChange={(e) => setBetaOwnerName(e.target.value)}
                    placeholder="Nama pemilik"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Usaha / Warung <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={betaBusinessName}
                    onChange={(e) => setBetaBusinessName(e.target.value)}
                    placeholder="Nama usaha atau toko kuliner"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={betaWhatsapp}
                    onChange={(e) => setBetaWhatsapp(e.target.value)}
                    placeholder="0812xxxxxxxx"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                  <span className="text-[10px] text-slate-600 block mt-1">
                    Nomor ini digunakan untuk mengirimkan lisensi trial dan verifikasi aktivasi kasir.
                  </span>
                </div>

                {/* Safe Data Guarantee Box */}
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-blue-900">
                    <span>🛡️</span> Jaminan Keamanan Data Toko
                  </div>
                  <p className="leading-relaxed text-slate-700">
                    Semua transaksi, menu, dan rekap shift selama uji coba tersimpan utuh di perangkat Anda dan dapat diekspor kapan pun.
                  </p>
                </div>

                {betaErrorMsg && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                    {betaErrorMsg}
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={isSubmittingBeta}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-xs transition-all shadow-md shadow-blue-600/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSubmittingBeta ? (
                      <span>Mengirim Pendaftaran...</span>
                    ) : (
                      <span>Daftar Closed Beta Sekarang (Gratis) →</span>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsBetaModalOpen(false);
                        handleOpenBuyModal();
                      }}
                      className="text-[11px] text-slate-600 hover:text-blue-600 font-bold underline"
                    >
                      Ingin langsung beli lisensi permanen tanpa batas hari? Beli Rp50.000 →
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: Purchase Modal (Midtrans Snap & BCA Transfer Manual) */}
      {isBuyModalOpen && (
        <div 
          onClick={() => setIsBuyModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border border-slate-200 rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl my-8 cursor-default animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-sakunota.png"
                  alt="SakuNota"
                  className="h-8 w-auto object-contain"
                />
                <div>
                  <h3 className="font-black text-base text-slate-900">Formulir Pembelian SakuNota</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBuyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-sm flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Form Isi Data Pelanggan */}
            {checkoutStep === "form" && (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Langkah 1 dari 2: Data Pemilik Usaha</span>
                </div>

                {formError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                    {formError}
                  </div>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Pemilik <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama pemilik"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nama Usaha <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Nama warung / toko kuliner"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="0812xxxxxxxx"
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Email (Opsional)
                    </label>
                    <input
                      type="email"
                      placeholder="email@anda.com"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                    />
                  </div>

                  <div className="pt-1">
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentChecked}
                        onChange={(e) => setConsentChecked(e.target.checked)}
                        className="mt-0.5 rounded border-slate-300 text-blue-600"
                      />
                      <span className="text-[11px] text-slate-600 leading-relaxed">
                        Saya memahami bahwa data pembelian dipakai untuk pembayaran, aktivasi lisensi, dan dukungan SakuNota.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Summary box */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-600 block text-[10px]">Total Pembayaran Promo</span>
                    <strong className="text-blue-600 font-black text-sm">
                      Rp50.000
                    </strong>
                  </div>
                  <span className="text-[10px] text-slate-400 line-through">Rp99.000</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(false)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95"
                  >
                    {isSubmittingOrder ? "Memproses..." : "Lanjut ke Pembayaran →"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Pembayaran Midtrans Otomatis atau Transfer Bank BCA */}
            {checkoutStep === "payment" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-900">Langkah 2 dari 2: Pembayaran SakuNota</span>
                  <p className="text-[11px] text-slate-600">
                    Selesaikan pembayaran untuk pesanan <strong>{currentOrderId}</strong> ({businessName}).
                  </p>
                </div>

                {snapError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold">
                    ⚠️ {snapError}
                  </div>
                )}

                {/* PILIHAN 1: MIDTRANS SNAP (INSTAN) */}
                <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700">
                      Gerbang Pembayaran Otomatis
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-black uppercase">
                      QRIS &amp; Transfer
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    Bayar instan dengan scan QRIS atau transfer bank. Lisensi langsung terbit otomatis setelah pembayaran terverifikasi.
                  </p>

                  <button
                    type="button"
                    onClick={handlePayWithMidtrans}
                    disabled={isInitiatingSnap}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>{isInitiatingSnap ? "Membuka Gerbang Midtrans..." : "Bayar Otomatis Rp50.000 via Midtrans →"}</span>
                  </button>
                </div>

                <div className="relative flex py-1 items-center">
                  <div className="flex-grow border-t border-slate-200"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-slate-500 uppercase">Atau Transfer Bank Manual</span>
                  <div className="flex-grow border-t border-slate-200"></div>
                </div>

                {/* PILIHAN 2: TRANSFER BANK BCA RESMI */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-blue-700">
                      BANK BCA
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                      Rekening Resmi SakuNota
                    </span>
                  </div>

                  <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-600 block font-bold uppercase">Nomor Rekening:</span>
                    <div className="flex items-center justify-between">
                      <strong className="text-lg font-mono font-black text-slate-900 select-all">
                        8030 554 912
                      </strong>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(PAYMENT_ACCOUNT_NUMBER.replace(/\s+/g, ""));
                          alert("Nomor rekening BCA berhasil disalin!");
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:underline"
                      >
                        Salin No Rek
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-700 block">Atas Nama: <strong>{PAYMENT_ACCOUNT_NAME}</strong></span>
                  </div>

                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-slate-700">Nominal Transfer:</span>
                    <strong className="text-base font-black text-slate-900">
                      Rp 50.000
                    </strong>
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-700">Nomor Pesanan (Berita Transfer):</span>
                    <strong className="font-mono font-bold text-blue-600">
                      {currentOrderId}
                    </strong>
                  </div>

                  {/* Real File Upload Bukti Transfer */}
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">
                      Lampirkan Foto Bukti Transfer:
                    </span>
                    <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 bg-white cursor-pointer transition-colors text-xs font-bold text-slate-700">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) setTransferProofFileName(file.name);
                        }}
                      />
                      <span>{transferProofFileName ? `✅ Terlampir: ${transferProofFileName}` : "📎 Ketuk untuk Unggah Screenshot Bukti Transfer"}</span>
                    </label>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
                  <strong className="text-slate-800 block">ℹ️ Proses Verifikasi:</strong>
                  <p>
                    Setelah bukti transfer terlampir, status pesanan akan menjadi <strong>Menunggu Verifikasi</strong>. Tim SakuNota akan mencocokkan mutasi rekening sebelum lisensi terbit.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("form")}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    ← Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("waiting")}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95"
                  >
                    Kirim Bukti Transfer Sekarang →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Status Menunggu Verifikasi */}
            {checkoutStep === "waiting" && (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 text-2xl mx-auto flex items-center justify-center border border-blue-200">
                  ⏳
                </div>

                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900">Bukti Transfer Telah Dikirim!</h4>
                  <p className="text-xs text-slate-600">
                    Pesanan Anda sedang menunggu pengecekan mutasi bank oleh Owner SakuNota.
                  </p>
                </div>

                {/* Status Box with Secret Access Code */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-2.5 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-600">Nomor Pesanan:</span>
                    <strong className="font-mono font-black text-slate-900 text-sm">{currentOrderId}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-blue-50 -mx-4 px-4 py-2">
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase font-bold">Kode Akses Rahasia Pembeli:</span>
                      <strong className="font-mono font-black text-blue-600 text-sm select-all">{currentAccessCode}</strong>
                    </div>
                    <span className="text-[9px] text-slate-600 max-w-[170px] text-right font-medium">
                      Simpan kode ini untuk mengecek status pesanan secara privat
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Status:</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-black text-[11px] border border-blue-200">
                      Menunggu Verifikasi Owner
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Nama Usaha:</span>
                    <strong className="text-slate-900">{businessName}</strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600">Nominal:</span>
                    <strong className="text-slate-900 font-black">Rp 50.000</strong>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-left text-xs text-slate-600 space-y-1.5 leading-relaxed">
                  <strong className="text-slate-900 block">💡 Apa yang terjadi selanjutnya?</strong>
                  <p>
                    1. Tim SakuNota memeriksa dana masuk di mutasi BCA.<br />
                    2. Setelah dana cocok, lisensi resmi akan langsung diterbitkan.<br />
                    3. Buka tombol <strong>Cek Status Lisensi</strong> dengan nomor pesanan <strong>{currentOrderId}</strong> dan kode akses <strong>{currentAccessCode}</strong> untuk mengambil lisensi Anda.
                  </p>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20SakuNota,%20saya%20sudah%20transfer%20Rp50.000%20untuk%20pesanan%20${currentOrderId}%20(${businessName}).%20Kode%20akses:%20${currentAccessCode}.%20Mohon%20verifikasi%20dan%20terbitkan%20lisensi.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span>💬</span>
                    <span>Konfirmasi Cepat via WhatsApp</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(false)}
                    className="w-full py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Simpan &amp; Tutup Halaman
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Pembayaran Berhasil & Lisensi Resmi Terbit */}
            {checkoutStep === "success" && (
              <div className="space-y-5 text-center">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 text-3xl mx-auto flex items-center justify-center border border-blue-200">
                  ✓
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-black text-slate-900">Pembayaran Berhasil!</h4>
                  <p className="text-xs text-slate-600">
                    Lisensi SakuNota Anda sudah tersedia dan siap diaktifkan di HP kasir.
                  </p>
                </div>

                {/* License Card */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-blue-200 text-left space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <span className="text-slate-600">Nomor Pesanan:</span>
                    <strong className="font-mono font-black text-slate-900">{currentOrderId || createdOrder?.orderId}</strong>
                  </div>

                  {/* Secret Access Code */}
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200 bg-blue-50 -mx-4 px-4 py-2">
                    <div>
                      <span className="text-[10px] text-slate-600 block uppercase font-bold">Kode Akses Rahasia Pembeli:</span>
                      <strong className="font-mono font-black text-blue-600 text-sm select-all">
                        {currentAccessCode || createdOrder?.accessCode}
                      </strong>
                    </div>
                  </div>

                  {/* License Key Display */}
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold">Nomor Lisensi SakuNota:</span>
                    {createdOrder?.licenseKey ? (
                      <div className="p-3 rounded-xl bg-white border border-blue-500 text-center font-mono font-black text-base text-blue-600 select-all tracking-wider">
                        {createdOrder.licenseKey}
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-white border border-slate-200 text-center text-xs text-slate-600">
                        Sedang menyinkronkan nomor lisensi...
                        <button
                          type="button"
                          onClick={async () => {
                            const chk = await checkOrderStatusServer(currentOrderId, currentAccessCode);
                            if (chk.success && chk.order) setCreatedOrder(chk.order);
                          }}
                          className="block mx-auto mt-2 text-xs font-bold text-blue-600 underline"
                        >
                          🔄 Muat Ulang Lisensi
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const key = createdOrder?.licenseKey;
                          if (key) {
                            navigator.clipboard.writeText(key);
                            setCopiedLicense(true);
                            setTimeout(() => setCopiedLicense(false), 2000);
                          }
                        }}
                        className="flex-1 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span>{copiedLicense ? "✓ Berhasil Disalin!" : "📋 Salin Nomor Lisensi"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Device Binding Status */}
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-[10px] text-slate-600 block uppercase font-bold mb-1">Status Perangkat Kasir:</span>
                    {createdOrder?.boundDeviceId ? (
                      <div className="flex items-center gap-2 text-blue-700 font-bold text-xs bg-blue-50 p-2.5 rounded-xl border border-blue-200">
                        <span>🟢</span>
                        <span>Terikat di: {createdOrder.deviceName || createdOrder.boundDeviceId}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                        <span className="text-slate-900 font-bold block">Belum Terikat ke HP Kasir</span>
                        <span>Lisensi baru diikat saat Anda pertama kali mengaktifkannya di HP kasir fisik.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Activation on This Device Feedback */}
                {activateMsg && (
                  <div className={`p-3 rounded-xl text-xs font-bold leading-relaxed ${
                    activateMsg.startsWith("✅")
                      ? "bg-blue-50 border border-blue-200 text-blue-800"
                      : "bg-rose-50 border border-rose-200 text-rose-600"
                  }`}>
                    {activateMsg}
                  </div>
                )}

                {/* Quick Next Step Actions */}
                <div className="space-y-2 pt-1">
                  {createdOrder?.licenseKey && !isActivatedHere && !createdOrder.boundDeviceId && (
                    <button
                      type="button"
                      disabled={isActivatingHere}
                      onClick={() => handleActivateOnThisDevice(createdOrder.licenseKey!)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span>🚀</span>
                      <span>{isActivatingHere ? "Mengaktifkan Lisensi..." : "Aktifkan di Perangkat Ini"}</span>
                    </button>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="#panduan"
                      onClick={() => setIsBuyModalOpen(false)}
                      className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl text-center transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>📱</span>
                      <span>Pasang di HP</span>
                    </a>
                    <Link
                      href="/pos"
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl text-center shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <span>🏪</span>
                      <span>Buka Kasir →</span>
                    </Link>
                  </div>

                  <Link
                    href="/panduan"
                    target="_blank"
                    className="block text-center text-[11px] text-slate-600 hover:text-blue-600 font-semibold pt-1 underline"
                  >
                    📖 Baca Panduan Aktivasi &amp; Pemasangan di HP
                  </Link>

                  <button
                    type="button"
                    onClick={() => setIsBuyModalOpen(false)}
                    className="w-full py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors pt-2"
                  >
                    Selesai &amp; Tutup Jendela
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 4: Direct License Activation (Tester / Official) & Order Status Check */}
      {isCheckStatusModalOpen && (
        <div 
          onClick={() => setIsCheckStatusModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-2 border-blue-200 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl cursor-default animate-in zoom-in-95 duration-150"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shadow-sm">
                  🔑
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">Aktivasi Lisensi &amp; Cek Pesanan</h3>
                  <span className="text-[10px] text-slate-600 block">Aktifkan Kode Lisensi / Tester atau cek status transfer</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckStatusModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* 2-Tab Switcher */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setStatusModalTab("direct_license")}
                className={`py-2.5 px-2 rounded-xl text-[11px] font-extrabold transition-all ${
                  statusModalTab === "direct_license"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:text-blue-600"
                }`}
              >
                Pakai Kode Lisensi
              </button>
              <button
                type="button"
                onClick={() => setStatusModalTab("order_lookup")}
                className={`py-2.5 px-2 rounded-xl text-[11px] font-extrabold transition-all ${
                  statusModalTab === "order_lookup"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-700 hover:text-blue-600"
                }`}
              >
                Cek Status Pesanan
              </button>
            </div>

            {/* TAB 1: LANGSUNG AKTIFKAN DENGAN KODE LISENSI / TESTER (TANPA NOMOR PESANAN & TANPA KODE AKSES) */}
            {statusModalTab === "direct_license" && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 text-[11px] text-blue-900 leading-relaxed">
                  <strong>Punya Lisensi Tester atau Kode Lisensi Resmi?</strong><br />
                  Masukkan langsung kode lisensi Anda di bawah ini (tidak perlu Nomor Pesanan dan tidak perlu Kode Akses Rahasia).
                </div>

                <form onSubmit={handleDirectActivateLicense} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-extrabold text-slate-800 mb-1">
                      Kode Lisensi SakuNota / Tester <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: SN-TEST-XXXX atau SN-XXXX-XXXX-XXXX"
                      value={directLicenseInput}
                      onChange={(e) => setDirectLicenseInput(e.target.value.toUpperCase())}
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border-2 border-blue-200 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none font-mono font-bold uppercase tracking-wider"
                    />
                  </div>

                  {directActivateError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                      ⚠️ {directActivateError}
                    </div>
                  )}

                  {directActivateSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
                      <div className="font-extrabold flex items-center gap-1.5">
                        <span>✅</span>
                        <span>{directActivateSuccess}</span>
                      </div>
                      <Link
                        href="/pos"
                        className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md"
                      >
                        <span>Buka Kasir SakuNota Sekarang →</span>
                      </Link>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isActivatingDirect}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md shadow-blue-600/25 active:scale-95 disabled:opacity-50"
                  >
                    {isActivatingDirect ? "Memverifikasi & Mengaktifkan..." : "Aktifkan Lisensi di Perangkat Ini →"}
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: CEK STATUS PESANAN (BAGI YANG BARU TRANSFER) */}
            {statusModalTab === "order_lookup" && (
              <div className="space-y-4">
                <form onSubmit={handleSearchOrder} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Nomor Pesanan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="SN-2026-XXXX"
                      value={searchOrderId}
                      onChange={(e) => setSearchOrderId(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Kode Akses Rahasia Pembeli <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="KOD-XXXX"
                      value={searchAccessCode}
                      onChange={(e) => setSearchAccessCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none font-mono uppercase"
                    />
                    <span className="text-[10px] text-slate-600 block mt-1">
                      Kode rahasia diberikan saat checkout. Jika Anda sudah punya Kode Lisensi / Tester, pilih tab <strong>🔑 Pakai Kode Lisensi</strong> di atas.
                    </span>
                  </div>

                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold">
                      ⚠️ {searchError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSearchingOrder}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50"
                  >
                    {isSearchingOrder ? "Memeriksa Status..." : "Periksa Status & Tampilkan Lisensi →"}
                  </button>
                </form>

                {/* Hasil Pencarian Terverifikasi */}
                {searchAttempted && searchResult && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs animate-in fade-in duration-150">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <div>
                        <strong className="text-slate-900 block">{searchResult.businessName}</strong>
                        <span className="text-[10px] text-slate-600 font-mono">{searchResult.orderId}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        searchResult.status === "lunas_lisensi_terbit"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}>
                        {searchResult.status === "lunas_lisensi_terbit" ? "Lunas & Aktif" : "Menunggu Verifikasi"}
                      </span>
                    </div>

                    {searchResult.status === "lunas_lisensi_terbit" && searchResult.licenseKey ? (
                      <div className="space-y-3 pt-1">
                        <span className="text-[10px] text-slate-600 font-bold block uppercase">KODE LISENSI RESMI ANDA:</span>
                        <div className="p-3 rounded-xl bg-white border border-blue-400 text-center font-mono font-black text-sm text-blue-600 select-all tracking-wider">
                          {searchResult.licenseKey}
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (searchResult.licenseKey) {
                                navigator.clipboard.writeText(searchResult.licenseKey);
                                setCopiedLicense(true);
                                setTimeout(() => setCopiedLicense(false), 2000);
                              }
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5"
                          >
                            <span>{copiedLicense ? "✓ Tersalin!" : "📋 Salin Lisensi"}</span>
                          </button>
                        </div>

                        {/* Device Binding Status */}
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-600 block uppercase font-bold mb-1">Status Perangkat Kasir:</span>
                          {searchResult.boundDeviceId ? (
                            <div className="text-blue-700 font-bold text-xs flex items-center gap-1.5">
                              <span>🟢</span>
                              <span>Terikat di: {searchResult.deviceName || searchResult.boundDeviceId}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-slate-600">
                              <span className="text-slate-900 font-bold block">Belum Terikat ke Perangkat</span>
                              <span>Lisensi ini belum digunakan di HP mana pun. Aktifkan di HP kasir yang Anda inginkan.</span>
                            </div>
                          )}
                        </div>

                        {/* Activate on this device if not bound */}
                        {!searchResult.boundDeviceId && !isActivatedHere && (
                          <button
                            type="button"
                            disabled={isActivatingHere}
                            onClick={() => handleActivateOnThisDevice(searchResult.licenseKey!)}
                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                          >
                            <span>🚀</span>
                            <span>{isActivatingHere ? "Mengaktifkan..." : "Aktifkan di Perangkat Ini"}</span>
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href="#panduan"
                            onClick={() => setIsCheckStatusModalOpen(false)}
                            className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:text-slate-900 text-center transition-colors"
                          >
                            📱 Pasang di HP
                          </a>
                          <Link
                            href="/pos"
                            className="py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black text-center shadow-sm"
                          >
                            Buka Kasir →
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] leading-relaxed space-y-1">
                          <strong className="text-slate-800 block font-bold">Sedang Menunggu Verifikasi Pembayaran</strong>
                          <p>
                            Jika Anda membayar otomatis via Midtrans, tekan tombol sinkronisasi di bawah untuk memeriksa status secara langsung.
                          </p>
                          <p>
                            Jika Anda membayar transfer BCA manual, Tim SakuNota akan mencocokkan mutasi rekening sebelum lisensi terbit.
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={isSearchingOrder}
                          onClick={async () => {
                            setIsSearchingOrder(true);
                            setSearchError("");
                            try {
                              const res = await checkOrderStatusServer(searchResult.orderId, searchResult.accessCode);
                              if (res.success && res.order) {
                                setSearchResult(res.order);
                              } else {
                                setSearchError(res.error || "Gagal menyinkronkan status pesanan.");
                              }
                            } catch (e: any) {
                              setSearchError("Koneksi gagal: " + e.message);
                            } finally {
                              setIsSearchingOrder(false);
                            }
                          }}
                          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <span>🔄</span>
                          <span>{isSearchingOrder ? "Menyinkronkan..." : "Sinkronkan Status Pembayaran"}</span>
                        </button>

                        <a
                          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20SakuNota,%20saya%20sudah%20transfer%20untuk%20pesanan%20${searchResult.orderId}%20(${searchResult.businessName}).%20Kode%20akses:%20${searchResult.accessCode}.%20Mohon%20verifikasi%20dan%20terbitkan%20lisensi.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span>💬</span>
                          <span>Konfirmasi via WhatsApp SakuNota</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="pt-1 text-right">
              <button
                type="button"
                onClick={() => setIsCheckStatusModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl"
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
