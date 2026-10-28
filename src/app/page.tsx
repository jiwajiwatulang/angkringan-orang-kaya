"use client";
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import AntiGravityGalaxy from "@/components/AntiGravityGalaxy";
import HomepageTryout from "@/components/HomepageTryout";
import { 
  CustomerOrder, 
  submitBuyerOrder, 
  checkOrderStatusServer,
  uploadOrderProofServer,
  activateLicenseServer,
  registerBetaServer,
  checkPromoCodeServer,
} from "@/lib/ordersClient";
import {
  SUPPORT_WHATSAPP,
  PAYMENT_ACCOUNT_NAME,
  PAYMENT_ACCOUNT_NUMBER,
  PAYMENT_BANK_NAME,
} from "@/lib/config";
import { printOfficialInvoice } from "@/lib/invoicePrint";


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
      setBetaErrorMsg("Pendaftaran belum terkirim. Periksa koneksi dan coba lagi.");
    } finally {
      setIsSubmittingBeta(false);
    }
  };

  // Purchase Modal State
  const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"form" | "payment" | "waiting" | "success">("form");
  const [createdOrder, setCreatedOrder] = useState<CustomerOrder | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerNpwp, setBuyerNpwp] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [formError, setFormError] = useState("");
  const [currentOrderId, setCurrentOrderId] = useState("");
  const [currentAccessCode, setCurrentAccessCode] = useState("");
  const [transferProofFileName, setTransferProofFileName] = useState("");
  const [transferProofBase64, setTransferProofBase64] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [snapRedirectUrl, setSnapRedirectUrl] = useState("");
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [isInitiatingSnap, setIsInitiatingSnap] = useState(false);
  const [snapError, setSnapError] = useState("");
  const [snapNotice, setSnapNotice] = useState("");
  const [uploadProofError, setUploadProofError] = useState("");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<CustomerOrder | null>(null);
  const [isActivatingHere, setIsActivatingHere] = useState(false);
  const [activateMsg, setActivateMsg] = useState("");
  const [isActivatedHere, setIsActivatedHere] = useState(false);
  const [isCheckoutExitConfirmOpen, setIsCheckoutExitConfirmOpen] = useState(false);

  // Promo code & discount voucher state
  const [promoInput, setPromoInput] = useState("");
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountType: "nominal" | "percent" | "fixed_price";
    discountValue: number;
    discountAmount: number;
    finalAmount: number;
    description?: string;
  } | null>(null);

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

  // Preload Midtrans Snap Script early so it is immediately ready when user wants to pay
  useEffect(() => {
    const snapScriptId = "midtrans-snap-js";
    if (typeof document === "undefined" || document.getElementById(snapScriptId)) return;

    fetch("/api/payment/config")
      .then((res) => res.json())
      .then((data: any) => {
        if (data?.clientKey && !document.getElementById(snapScriptId)) {
          const script = document.createElement("script");
          script.id = snapScriptId;
          script.src = data.snapJsUrl || "https://app.midtrans.com/snap/snap.js";
          script.setAttribute("data-client-key", data.clientKey);
          script.async = true;
          document.body.appendChild(script);
        }
      })
      .catch(() => {
        // Handled silently when offline
      });
  }, []);

  const requestCloseBuyModal = () => {
    const hasData = buyerName.trim() || businessName.trim() || whatsappNumber.trim() || checkoutStep !== "form";
    if (hasData) {
      setIsCheckoutExitConfirmOpen(true);
    } else {
      setIsBuyModalOpen(false);
    }
  };

  const confirmExitCheckout = () => {
    setIsCheckoutExitConfirmOpen(false);
    setIsBuyModalOpen(false);
    setCheckoutStep("form");
    setFormError("");
    setTransferProofFileName("");
    setTransferProofBase64("");
    setSnapError("");
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
    setBuyerNpwp("");
  };

  // Escape key listener to close modals with unsaved confirmation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isCheckoutExitConfirmOpen) {
          setIsCheckoutExitConfirmOpen(false);
          return;
        }
        if (isBuyModalOpen) {
          requestCloseBuyModal();
          return;
        }
        setIsCheckStatusModalOpen(false);
        setIsBetaModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isBuyModalOpen, isCheckoutExitConfirmOpen, buyerName, businessName, whatsappNumber, checkoutStep]);

  // Mobile Hardware Back Button listener during checkout
  useEffect(() => {
    if (!isBuyModalOpen) return;
    try {
      window.history.pushState({ modal: "checkout" }, "");
    } catch (_) {}

    const handlePopState = () => {
      const hasData = buyerName.trim() || businessName.trim() || whatsappNumber.trim() || checkoutStep !== "form";
      if (hasData) {
        try {
          window.history.pushState({ modal: "checkout" }, "");
        } catch (_) {}
        setIsCheckoutExitConfirmOpen(true);
      } else {
        setIsBuyModalOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isBuyModalOpen, buyerName, businessName, whatsappNumber, checkoutStep]);

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
      } else if ((paymentStatus === "unfinish" || paymentStatus === "error") && ordId && code) {
        setCurrentOrderId(ordId);
        setCurrentAccessCode(code);
        setSearchOrderId(ordId);
        setSearchAccessCode(code);
        setSnapNotice(
          paymentStatus === "unfinish"
            ? "Pembayaran Midtrans sebelumnya belum selesai. Pesanan Anda tetap aman. Silakan klik Bayar Sekarang untuk membuka kembali pembayaran, atau gunakan Transfer BCA."
            : "Pembayaran Midtrans sebelumnya mengalami kendala. Silakan coba lagi atau gunakan Transfer Bank BCA."
        );
        setIsBuyModalOpen(true);
        setCheckoutStep("payment");
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
          `Lisensi berhasil diaktifkan untuk "${res.businessName || "Toko Anda"}"! Siapkan kasir tanpa internet dari Pengaturan POS sebelum mulai berjualan.`
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

  const handleClaimPromo = async () => {
    if (!promoInput.trim()) {
      setPromoError("Masukkan kode promo terlebih dahulu.");
      return;
    }
    setPromoError("");
    setIsCheckingPromo(true);
    try {
      const res = await checkPromoCodeServer(promoInput.trim());
      if (res.valid && res.code && res.finalAmount !== undefined) {
        setAppliedPromo({
          code: res.code,
          discountType: res.discountType || "nominal",
          discountValue: res.discountValue || 0,
          discountAmount: res.discountAmount || 0,
          finalAmount: res.finalAmount,
          description: res.description,
        });
        setPromoInput(res.code);
      } else {
        setAppliedPromo(null);
        setPromoError(res.error || "Kode promo tidak valid atau sudah kedaluwarsa.");
      }
    } catch (err: any) {
      setAppliedPromo(null);
      setPromoError("Gagal memeriksa promo: " + (err.message || "Periksa koneksi internet"));
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
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
        npwp: buyerNpwp.trim() || undefined,
        promoCode: appliedPromo?.code,
      });

      if (res.success && res.order) {
        setCurrentOrderId(res.order.orderId);
        setCurrentAccessCode(res.order.accessCode);
        setCreatedOrder(res.order);
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
        if (data.redirect_url) {
          setSnapRedirectUrl(data.redirect_url);
        }
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
              const confirmed = await checkOrderStatusServer(currentOrderId, currentAccessCode);
              if (confirmed.success && confirmed.order) setCreatedOrder(confirmed.order);
              setCheckoutStep(confirmed.order?.status === "lunas_lisensi_terbit" ? "success" : "waiting");
            },
            onPending: function () {
              setCheckoutStep("waiting");
            },
            onError: function (err: any) {
              setSnapError("Pembayaran gagal diproses: " + (err?.status_message || "Silakan coba lagi."));
            },
            onClose: function () {
              setSnapNotice("Sesi pembayaran Midtrans ditutup. Anda belum menyelesaikan pembayaran Rp 50.000. Klik tombol Bayar Sekarang untuk membuka kembali pembayaran, atau gunakan Transfer Bank BCA.");
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

  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadProofError("");
    setTransferProofFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (file.type.startsWith("image/")) {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1000;
          let w = img.width;
          let h = img.height;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const compressed = canvas.toDataURL("image/jpeg", 0.75);
            setTransferProofBase64(compressed);
          } else {
            setTransferProofBase64(rawDataUrl);
          }
        };
        img.src = rawDataUrl;
      } else {
        setTransferProofBase64(rawDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSendTransferProof = async () => {
    setUploadProofError("");
    if (!transferProofBase64) {
      setUploadProofError("Silakan pilih dan lampirkan foto atau screenshot bukti transfer Anda terlebih dahulu sebelum mengonfirmasi.");
      return;
    }
    setIsUploadingProof(true);
    try {
      const res = await uploadOrderProofServer(
        currentOrderId,
        currentAccessCode,
        transferProofFileName || "bukti_transfer.jpg",
        transferProofBase64
      );
      if (res.success && res.order) {
        setCreatedOrder(res.order);
        setCheckoutStep("waiting");
      } else {
        setUploadProofError(res.error || "Gagal mengunggah bukti transfer. Silakan periksa file Anda dan coba lagi.");
      }
    } catch (err: any) {
      setUploadProofError("Koneksi gagal saat mengunggah foto: " + (err.message || "Periksa koneksi Anda."));
    } finally {
      setIsUploadingProof(false);
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
        setActivateMsg("Lisensi resmi berhasil diaktifkan di perangkat ini! Kasir Anda siap digunakan tanpa internet.");
      } else {
        setActivateMsg(" " + (res.error || "Gagal mengaktifkan lisensi di perangkat ini."));
      }
    } catch (err: any) {
      setActivateMsg(" " + err.message);
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
    "Toko Retail",
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
              <span>Login</span>
            </button>
            <a
              href="#coba-sakunota"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-all border border-slate-200"
            >
              Coba Kasir
            </a>
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
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="px-3 py-2 rounded-xl bg-blue-600 text-white font-black text-xs flex items-center gap-1.5 shadow-sm shadow-blue-600/25 active:scale-95"
              aria-label="Toggle menu"
            >
              <span>Menu</span>
              <span>{mobileMenuOpen ? "×" : "☰"}</span>
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
                  ×
                </button>
              </div>

              <nav aria-label="Menu utama HP" className="flex flex-col gap-2">
                <button type="button" onClick={() => { setMobileMenuOpen(false); handleOpenBuyModal(); }} className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700">Beli Rp50.000</button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); setIsBetaModalOpen(true); }} className="min-h-11 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-100">Daftar Beta</button>
                <Link href="/panduan" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Buku Panduan</Link>
                <Link href="/tentang" onClick={() => setMobileMenuOpen(false)} className="flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">Tentang Kami</Link>
              </nav>
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
            <span>SakuNota</span>
            <span className="text-blue-300">•</span>
            <span className="text-blue-800">Sekali Bayar Rp50.000</span>
          </div>

          {/* Main Headline */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15]">
              Kasir Jalan Tanpa Internet
            </h1>
            <p className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-blue-600 tracking-tight">
              Dimana aja, Sambil jalan dan melayani
            </p>
          </div>

          {/* Description */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base text-slate-700 leading-relaxed font-medium">
            Dari warung dan kafe sampai toko retail. Scan barcode, kelola stok, catat penjualan, dan baca perkembangan usaha dari satu aplikasi. Sekali bayar, tanpa langganan bulanan.
          </p>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 max-w-lg mx-auto">
            <a
              href="#coba-sakunota"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-blue-50 text-slate-900 hover:text-blue-700 font-extrabold text-xs border-2 border-slate-300 hover:border-blue-300 shadow-xs transition-all text-center flex items-center justify-center gap-2"
            >
              <span>Coba SakuNota</span>
            </a>

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
              <span>Login</span>
              <span>→</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBetaModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
            >
              <span>Daftar Beta · Uji Coba 7 Hari</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      <HomepageTryout onBeta={() => setIsBetaModalOpen(true)} onBuy={handleOpenBuyModal} />

      <section id="fitur" className="border-t border-slate-200 bg-white px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl"><h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Dari penjualan sampai tutup toko</h2>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[
            ['Kasir & Pembayaran','Tambahkan barang, atur pilihan pesanan, dan catat pembayaran pelanggan.'],
            ['Stok & Barcode','Kelola produk dan modal. Gunakan kamera atau scanner barcode yang terhubung.'],
            ['Karyawan & Shift','PIN karyawan, absensi, kasbon, komisi, serta pencatatan selisih kas.'],
            ['Laporan Usaha','Lihat penjualan, produk terlaris, jam ramai, dan ringkasan mingguan.'],
            ['Dua Perangkat, Satu Toko','Pemilik dan Kasir terhubung. Data antarperangkat diperbarui saat ada internet.'],
            ['Pesanan & Cetak Nota','Pantau pesanan dapur dan cetak nota melalui printer yang sesuai perangkat.'],
          ].map(([title,description])=><div key={title} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"><h3 className="text-base font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p></div>)}</div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-slate-600">Kasir tetap dapat dipakai tanpa internet setelah disiapkan.</p><Link href="/panduan" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-600">Lihat Panduan →</Link></div>
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
              Cocok untuk Warung, Toko, dan Kafe
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Pilih alur kasir yang sesuai dengan usaha Anda.
            </p>
          </div>

          {/* Compact 2x2 on Mobile, 4-Grid on Desktop (No Horizontal Slide) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            
            {/* 1. Warung Makan */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black"><LineIcon name="food" /></div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Warung Makan &amp; Kuliner Harian
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Langsung bayar cepat, hitung uang tunai dan kembalian otomatis tanpa ribet pilih nomor meja.
              </p>
            </div>

            {/* 2. Rumah Makan & Restoran */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black"><LineIcon name="food" /></div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Rumah Makan &amp; Restoran (Meja &amp; Open Bill)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Pelanggan duduk santai duluan, tambah pesanan berkala, dan bayar split bill saat selesai makan.
              </p>
            </div>

            {/* 3. Kafe & Kedai Minuman */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black"><LineIcon name="drink" /></div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Kafe &amp; Kedai Minuman (Varian &amp; Topping)
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Pilihan topping tambahan, tingkat kemanisan, pergantian shift barista, dan kirim rekap WhatsApp.
              </p>
            </div>

            {/* 4. Booth Jajanan */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all space-y-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base sm:text-lg font-black"><LineIcon name="takeaway" /></div>
              <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 leading-snug">
                Toko Retail &amp; Kebutuhan Harian
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Pindai barcode, tambah barang, dan periksa stok produk.
              </p>
            </div>

          </div>
        </div>
      </section>

      <section id="harga" className="scroll-mt-24 border-t border-slate-200 bg-white px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl"><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Pilih cara mulai</h2><div className="mt-7 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-blue-200 bg-blue-50/50 p-6 sm:p-8"><h3 className="text-lg font-bold">Lisensi SakuNota</h3><p className="mt-3 text-4xl font-bold tracking-tight text-blue-700">Rp50.000</p><p className="mt-2 text-sm text-slate-600">Sekali bayar, tanpa langganan bulanan.</p><ul className="my-6 space-y-3 text-sm text-slate-700"><li>Satu toko, maksimal dua perangkat: Pemilik dan Kasir.</li><li>Kasir, stok, karyawan, dan laporan usaha.</li><li>Penjualan tanpa internet setelah kasir disiapkan.</li></ul><button type="button" onClick={handleOpenBuyModal} className="mt-auto min-h-12 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700">Beli Lisensi</button></div>
          <div className="flex flex-col rounded-3xl border border-slate-200 bg-slate-50 p-6 sm:p-8"><h3 className="text-lg font-bold">Ikut Beta</h3><p className="mt-3 text-4xl font-bold tracking-tight text-slate-900">7 hari</p><p className="mt-2 text-sm text-slate-600">Uji coba gratis setelah pendaftaran disetujui.</p><ol className="my-6 list-inside list-decimal space-y-3 text-sm text-slate-700"><li>Daftarkan nama usaha dan WhatsApp.</li><li>Tim SakuNota memeriksa pendaftaran.</li><li>Aktifkan lisensi uji coba yang dikirim lewat WhatsApp.</li></ol><button type="button" onClick={()=>setIsBetaModalOpen(true)} className="mt-auto min-h-12 rounded-xl border border-blue-200 bg-white px-5 text-sm font-semibold text-blue-700 hover:bg-blue-50">Daftar Beta</button></div>
        </div></div>
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
                a: "SakuNota adalah aplikasi kasir (Point of Sale) untuk warung makan, kafe, restoran, dan retail agar pencatatan pesanan, pengelolaan meja, cetak struk Bluetooth, dan rekap omzet harian berjalan rapi tanpa biaya langganan bulanan.",
              },
              {
                q: "Apakah benar-benar bisa dipakai tanpa internet?",
                a: "Kasir bisa melayani tanpa internet setelah persiapan dan aktivasi. Pada usaha beberapa perangkat, pengiriman data, pemasangan perangkat, dan pembaruan akses tetap memerlukan internet.",
              },
              {
                q: "Bagaimana cara mengaktifkan Lisensi SakuNota atau Lisensi Tester?",
                a: "Sangat mudah! Anda tidak perlu memasukkan Nomor Pesanan atau Kode Akses jika sudah memegang Kode Lisensi (misal SN-XXXX-XXXX-XXXX atau SN-TEST-XXXX). Cukup klik tombol ' Aktivasi Lisensi' di bagian atas halaman ini atau langsung buka halaman Kasir (/pos), tempel kode lisensi Anda, lalu klik Aktifkan.",
              },
              {
                q: "Berapa harga SakuNota?",
                a: "Harga promo peluncuran hanya Rp50.000 (harga normal Rp99.000) sekali bayar untuk satu toko, maksimal dua perangkat: Pemilik dan Kasir. Tidak ada biaya bulanan dan tidak ada potongan komisi penjualan.",
              },
              {
                q: "Bagaimana pembagian akses pemilik dan karyawan?",
                a: "Pada usaha yang mengaktifkan beberapa perangkat, kasir masuk dengan akun masing-masing. Pemilik mengatur akses karyawan, memeriksa pembayaran nontunai, serta menyetujui pembatalan dan pengembalian.",
              },
              {
                q: "Apakah QRIS dan transfer langsung dianggap terverifikasi?",
                a: "Kasir mencatat pembayaran dan mengunggah bukti. Pemilik memeriksa penerimaan dana sebelum mengesahkannya. Mengunggah foto bukti saja tidak mengesahkan pembayaran.",
              },
              {
                q: "Bagaimana memperbaiki nota atau cadangan yang bermasalah?",
                a: "Gunakan pembatalan atau pengembalian dengan akses pemilik agar riwayat tetap tercatat. Jika pemulihan cadangan terhenti, lanjutkan saat koneksi tersedia atau simpan dan batalkan pemulihan sebelum memilih file pengganti. Langkah lengkap tersedia di Buku Panduan.",
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
            Kelola kasir usaha Anda lebih cepat dan tenang tanpa khawatir internet mati.
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
            > Aktivasi Kode
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
              Aplikasi kasir modern untuk UMKM, angkringan, kafe, dan retail. Kasir tanpa internet setelah disiapkan, tanpa biaya langganan bulanan.
            </p>
            <div className="pt-1">
              <a
                href="https://www.instagram.com/sakunota/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-slate-800 hover:text-blue-600 transition-colors"
                title="Instagram @sakunota"
                aria-label="Instagram SakuNota"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Col 2: Product */}
          <div className="space-y-3">
            <span className="text-slate-900 font-extrabold text-xs uppercase tracking-wider block">
              Produk
            </span>
            <ul className="space-y-2 text-xs font-medium">
              <li><a href="#fitur" className="hover:text-blue-600 transition-colors">Fitur Kasir</a></li>
              <li><a href="#jenis-usaha" className="hover:text-blue-600 transition-colors">Jenis Usaha</a></li>
              <li><a href="#harga" className="hover:text-blue-600 transition-colors">Harga Lisensi</a></li>
              <li><Link href="/tentang" className="hover:text-blue-600 transition-colors font-bold text-blue-600">Tentang Kami</Link></li>
              <li><a href="/pos?demo=true" className="hover:text-blue-600 transition-colors">Demo Kasir Lengkap</a></li>
            </ul>
          </div>

          {/* Col 3: Support */}
          <div className="space-y-3">
            <span className="text-slate-900 font-extrabold text-xs uppercase tracking-wider block">
              Bantuan
            </span>
            <ul className="space-y-2 text-xs font-medium">
              <li><Link href="/panduan" className="hover:text-blue-600 transition-colors">Panduan</Link></li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenLicenseModal("direct_license")}
                  className="hover:text-blue-600 transition-colors text-left font-bold text-blue-600"
                >
                  Aktivasi Kode
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => handleOpenLicenseModal("order_lookup")}
                  className="hover:text-blue-600 transition-colors text-left"
                >
                  Cek Pesanan
                </button>
              </li>
              <li>
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 transition-colors"
                >
                  Bantuan Whatsapp
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar: Copyright, Privacy, Terms */}
        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-600">
          <div>
            © 2026 SakuNota, PT Pemuda Gaya Bebas
          </div>
          <div className="flex items-center gap-6 font-semibold">
            <Link href="/tentang" className="hover:text-blue-600 transition-colors">Tentang Kami</Link>
            <Link href="/privacy" className="hover:text-blue-600 transition-colors">Kebijakan Privasi</Link>
            <Link href="/terms" className="hover:text-blue-600 transition-colors">Terms</Link>
          </div>
        </div>
      </footer>

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
                  <span> DAFTAR BETA</span>
                </div>
                <h3 className="font-black text-xl text-slate-900">Uji Coba 7 Hari SakuNota</h3>
                <p className="text-xs text-slate-600">
                  Ajukan uji coba gratis 7 hari. Lisensi dikirim setelah pendaftaran disetujui.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBetaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-black transition-colors flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {betaSuccessResult ? (
              <div className="space-y-5 text-center py-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center mx-auto text-3xl"><LineIcon name="success" /></div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black text-slate-900">Pendaftaran Berhasil Dikirim!</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                    Terima kasih, <strong>{betaSuccessResult.ownerName}</strong>. Pendaftaran usaha <strong>&ldquo;{betaSuccessResult.businessName}&rdquo;</strong> telah tercatat di sistem kami.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2 text-slate-700">
                  <div className="flex justify-between">
                    <span>Status Pendaftaran:</span>
                    <span className="font-bold text-blue-600">Menunggu Persetujuan Tim</span>
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
                  Pendaftaran akan diperiksa oleh tim SakuNota. Lisensi uji coba dikirim lewat WhatsApp setelah disetujui.
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-2">
                  <a href="#coba-sakunota" onClick={() => setIsBetaModalOpen(false)} className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-center text-xs font-bold text-white hover:bg-blue-700">Coba di Halaman Ini</a>
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
                  <label htmlFor="beta-owner" className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap Pemilik Usaha <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="beta-owner" value={betaOwnerName}
                    onChange={(e) => setBetaOwnerName(e.target.value)}
                    placeholder="Nama pemilik"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="beta-business" className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Usaha / Warung <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    id="beta-business" value={betaBusinessName}
                    onChange={(e) => setBetaBusinessName(e.target.value)}
                    placeholder="Nama usaha atau toko kuliner"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-blue-600 focus:bg-white transition-colors"
                  />
                </div>

                <div>
                  <label htmlFor="beta-phone" className="block text-xs font-bold text-slate-700 mb-1">
                    Nomor WhatsApp Aktif <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    id="beta-phone" value={betaWhatsapp}
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
                    <span><LineIcon name="security" /></span> Jaminan Keamanan Data Toko
                  </div>
                  <p className="leading-relaxed text-slate-700">
                    Cadangkan data usaha dari Pengaturan POS. Perangkat lain hanya terhubung setelah mendapat persetujuan Pemilik.
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
                      <span>Daftar Beta</span>
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
          onClick={requestCloseBuyModal}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 overflow-hidden cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92dvh] sm:max-h-[90vh] flex flex-col shadow-2xl cursor-default animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-150 overflow-hidden"
          >
            {/* Modal Header (Sticky Top) */}
            <div className="shrink-0 px-5 py-3.5 sm:px-6 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-white rounded-t-3xl">
              <div className="flex items-center gap-2.5">
                <img
                  src="/logo-sakunota.png"
                  alt="SakuNota"
                  className="h-7 sm:h-8 w-auto object-contain"
                />
                <div>
                  <h3 className="font-black text-sm sm:text-base text-slate-900">Formulir Pembelian SakuNota</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={requestCloseBuyModal}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-base flex items-center justify-center transition-colors font-bold"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Form Isi Data Pelanggan */}
            {checkoutStep === "form" && (
              <form onSubmit={handleProceedToPayment} className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5 space-y-3.5">
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
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nama Pemilik <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama pemilik"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nama Usaha <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Nama warung / toko kuliner"
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Nomor WhatsApp <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        placeholder="0812xxxxxxxx"
                        value={whatsappNumber}
                        onChange={(e) => setWhatsappNumber(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        Email <span className="text-slate-500 font-normal">(Opsional)</span>
                      </label>
                      <input
                        type="email"
                        placeholder="email@anda.com"
                        value={buyerEmail}
                        onChange={(e) => setBuyerEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        NPWP Usaha / Pribadi <span className="text-slate-500 font-normal">(Opsional - jika butuh faktur pajak)</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: 125383232617000"
                        value={buyerNpwp}
                        onChange={(e) => setBuyerNpwp(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white outline-none font-mono"
                      />
                    </div>

                    <div className="pt-1">
                      <label className="flex items-start gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                        />
                        <span className="text-xs text-slate-700 leading-relaxed font-medium">
                          Saya memahami bahwa data pembelian dipakai untuk pembayaran, aktivasi lisensi, dan dukungan SakuNota.
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Promo Code / Voucher Claim Input */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Punya Kode Promo / Voucher Diskon?
                      </span>
                      {appliedPromo && (
                        <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                          Promo Aktif
                        </span>
                      )}
                    </div>

                    {!appliedPromo ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Contoh: DISKON15"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            if (promoError) setPromoError("");
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleClaimPromo();
                            }
                          }}
                          className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-xs font-mono font-bold uppercase text-slate-900 placeholder:text-slate-400 placeholder:normal-case placeholder:font-sans focus:border-blue-600 outline-none"
                        />
                        <button
                          type="button"
                          disabled={isCheckingPromo}
                          onClick={handleClaimPromo}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-xs shrink-0"
                        >
                          {isCheckingPromo ? "Mengecek..." : "Klaim"}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl">
                        <div>
                          <div className="flex items-center gap-2">
                            <strong className="font-mono font-black text-emerald-800 text-xs">{appliedPromo.code}</strong>
                            <span className="text-[10px] text-emerald-700 font-bold">
                              (Hemat Rp {appliedPromo.discountAmount.toLocaleString("id-ID")})
                            </span>
                          </div>
                          {appliedPromo.description && (
                            <p className="text-[10px] text-emerald-600 mt-0.5">{appliedPromo.description}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={handleRemovePromo}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 px-2 py-1 bg-white rounded-lg border border-rose-200 shrink-0"
                        >
                          Hapus
                        </button>
                      </div>
                    )}

                    {promoError && (
                      <p className="text-[10px] font-bold text-rose-600">{promoError}</p>
                    )}
                  </div>

                  {/* Summary box - High Contrast & Jelas di Layar Mobile */}
                  <div className="p-3.5 rounded-2xl bg-slate-100/90 border border-slate-200 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 text-xs font-medium">Harga Resmi SakuNota:</span>
                      <span className="text-xs text-slate-500 line-through font-semibold">Rp 99.000</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 text-xs font-medium">Harga Promo Peluncuran:</span>
                      <span className="text-xs font-bold text-slate-900">Rp 50.000</span>
                    </div>
                    {appliedPromo && (
                      <div className="flex items-center justify-between text-emerald-800 pt-1 border-t border-slate-200">
                        <span className="text-xs font-bold">Potongan Voucher ({appliedPromo.code}):</span>
                        <strong className="font-mono text-xs font-black text-emerald-700">-Rp {appliedPromo.discountAmount.toLocaleString("id-ID")}</strong>
                      </div>
                    )}
                    <div className="flex items-center justify-between pt-1.5 border-t border-slate-300">
                      <span className="text-slate-900 font-extrabold text-xs sm:text-sm">Total Pembayaran:</span>
                      <strong className="text-blue-700 font-black text-base sm:text-lg">
                        Rp {(appliedPromo ? appliedPromo.finalAmount : 50000).toLocaleString("id-ID")}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 flex gap-2.5 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={requestCloseBuyModal}
                    className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="flex-2 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-md shadow-blue-600/30 transition-all active:scale-95"
                  >
                    {isSubmittingOrder ? "Memproses..." : "Lanjut ke Pembayaran ->"}
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: Pembayaran Midtrans Otomatis atau Transfer Bank BCA */}
            {checkoutStep === "payment" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-6 sm:py-5 space-y-4">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-900">Langkah 2 dari 2: Pembayaran SakuNota</span>
                    <p className="text-[11px] text-slate-600">
                      Selesaikan pembayaran untuk pesanan <strong>{currentOrderId}</strong> ({businessName}).
                    </p>
                  </div>

                  {snapError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-bold flex items-center gap-1.5">
                      <LineIcon name="warning" />
                      <span>{snapError}</span>
                    </div>
                  )}

                  {snapNotice && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium space-y-1">
                      <p className="font-bold text-amber-950">Pembayaran Belum Diselesaikan</p>
                      <p className="text-[11px] leading-relaxed">{snapNotice}</p>
                    </div>
                  )}

                  {/* PILIHAN 1: MIDTRANS SNAP (INSTAN) */}
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-blue-700">
                        Payment with Midtrans
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
                      <span>
                        {isInitiatingSnap
                          ? "Membuka Gerbang Midtrans..."
                          : `Bayar Otomatis Rp ${(createdOrder?.amount || (appliedPromo ? appliedPromo.finalAmount : 50000)).toLocaleString("id-ID")} via Midtrans ->`}
                      </span>
                    </button>
                    {snapRedirectUrl && (
                      <a
                        href={snapRedirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-center text-xs font-bold text-blue-600 underline pt-1"
                      >
                        Buka Langsung di Halaman Pembayaran Midtrans &rarr;
                      </a>
                    )}
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
                    </div>

                    <div className="space-y-1 bg-white p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-600 block font-bold uppercase">Nomor Rekening BCA:</span>
                      <div className="flex items-center justify-between">
                        <strong className="text-lg font-mono font-black text-slate-900 select-all">
                          {PAYMENT_ACCOUNT_NUMBER}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(PAYMENT_ACCOUNT_NUMBER.replace(/\s+/g, ""));
                            alert("Nomor rekening BCA (" + PAYMENT_ACCOUNT_NUMBER + ") berhasil disalin!");
                          }}
                          className="text-[11px] font-bold text-blue-600 hover:underline px-2 py-1 rounded bg-blue-50"
                        >
                          Salin No Rek
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-700 block">Atas Nama: <strong>{PAYMENT_ACCOUNT_NAME}</strong></span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-1">
                      <span className="text-slate-700 font-medium">Nominal Transfer:</span>
                      <div className="text-right">
                        <strong className="text-base font-black text-slate-900">
                          Rp {(createdOrder?.amount || (appliedPromo ? appliedPromo.finalAmount : 50000)).toLocaleString("id-ID")}
                        </strong>
                        {(createdOrder?.promoCode || appliedPromo?.code) && (
                          <span className="block text-[10px] text-emerald-600 font-bold">
                            (Promo: {createdOrder?.promoCode || appliedPromo?.code} hemat Rp {(createdOrder?.discountAmount || appliedPromo?.discountAmount || 0).toLocaleString("id-ID")})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* KARTU NOMOR PESANAN - JELAS & KONTRAS DI HP */}
                    <div className="p-3 bg-amber-50/90 border-2 border-amber-300 rounded-xl space-y-1.5 shadow-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-amber-950 uppercase tracking-wider">
                          Nomor Pesanan (Berita Transfer BCA):
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200 text-amber-950 font-bold">
                          Wajib Disalin
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="text-base sm:text-lg font-mono font-black text-slate-900 tracking-wider select-all break-all">
                          {currentOrderId}
                        </strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentOrderId);
                            alert("Nomor pesanan (" + currentOrderId + ") berhasil disalin!");
                          }}
                          className="shrink-0 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          Salin No Pesanan
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-900 leading-tight">
                        Tulis nomor pesanan ini pada kolom berita/keterangan saat transfer m-Banking / ATM.
                      </p>
                    </div>

                    {/* Real File Upload Bukti Transfer */}
                    <div className="pt-2 border-t border-slate-200 space-y-2">
                      <span className="text-[11px] font-bold text-slate-700 block">
                        Lampirkan Foto Bukti Transfer:
                      </span>
                      <label className="flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-white cursor-pointer transition-colors text-xs font-bold text-slate-700">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleProofFileChange}
                        />
                        <span>{transferProofFileName ? `Terlampir: ${transferProofFileName}` : "Ketuk untuk Unggah Screenshot Bukti Transfer"}</span>
                      </label>
                      {transferProofBase64 && (
                        <div className="relative w-full max-h-48 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex flex-col items-center justify-center p-2">
                          <img src={transferProofBase64} alt="Pratinjau Bukti Transfer" className="max-h-40 object-contain rounded-lg" />
                          <span className="text-[10px] text-emerald-600 font-bold mt-1">Foto bukti siap dikirim ke Owner</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1">
                    <strong className="text-slate-800 block">Proses Verifikasi:</strong>
                    <p>
                      Setelah bukti transfer terlampir, status pesanan akan menjadi <strong>Menunggu Verifikasi</strong>. Tim SakuNota akan mencocokkan mutasi rekening sebelum lisensi terbit.
                    </p>
                  </div>

                  {uploadProofError && (
                    <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold leading-relaxed flex items-start gap-2">
                      <LineIcon name="warning" className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{uploadProofError}</span>
                    </div>
                  )}
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 flex gap-2.5 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep("form")}
                    className="py-3 px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
                  >
                    ← Kembali
                  </button>
                  <button
                    type="button"
                    disabled={isUploadingProof}
                    onClick={handleSendTransferProof}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isUploadingProof ? "Mengirim Bukti Transfer..." : "Kirim Bukti Transfer Sekarang ->"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Status Menunggu Verifikasi */}
            {checkoutStep === "waiting" && (
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6 space-y-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 text-2xl mx-auto flex items-center justify-center border border-blue-200"><LineIcon name="waiting" /></div>

                  <div className="space-y-1">
                    <h4 className="text-lg font-black text-slate-900">Bukti Transfer Telah Dikirim!</h4>
                    <p className="text-xs text-slate-600">
                      Pesanan Anda sedang menunggu pengecekan mutasi bank oleh Owner SakuNota.
                    </p>
                  </div>

                  {/* Status Box with Secret Access Code - Clear and Visible on Mobile */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-3 text-xs">
                    <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold block uppercase">Nomor Pesanan Anda:</span>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="font-mono font-black text-slate-900 text-base select-all break-all">{currentOrderId}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentOrderId);
                            alert("Nomor pesanan (" + currentOrderId + ") berhasil disalin!");
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shrink-0"
                        >
                          Salin
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-blue-900 block uppercase font-bold">Kode Akses Rahasia Pembeli:</span>
                        <span className="text-[9px] text-blue-700 font-bold">Simpan untuk cek status</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <strong className="font-mono font-black text-blue-700 text-base select-all break-all">{currentAccessCode}</strong>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(currentAccessCode);
                            alert("Kode akses (" + currentAccessCode + ") berhasil disalin!");
                          }}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0"
                        >
                          Salin
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-slate-200">
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
                      <div className="text-right">
                        <strong className="text-slate-900 font-black">
                          Rp {(createdOrder?.amount || (appliedPromo ? appliedPromo.finalAmount : 50000)).toLocaleString("id-ID")}
                        </strong>
                        {createdOrder?.promoCode && (
                          <span className="block text-[10px] text-emerald-600 font-bold">
                            (Promo: {createdOrder.promoCode})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-white border border-slate-200 text-left text-xs text-slate-600 space-y-1.5 leading-relaxed">
                    <strong className="text-slate-900 block">Apa yang terjadi selanjutnya?</strong>
                    <p>
                      1. Tim SakuNota memeriksa dana masuk di mutasi BCA.<br />
                      2. Setelah dana cocok, lisensi resmi akan langsung diterbitkan.<br />
                      3. Buka tombol <strong>Cek Status Lisensi</strong> dengan nomor pesanan <strong>{currentOrderId}</strong> dan kode akses <strong>{currentAccessCode}</strong> untuk mengambil lisensi Anda.
                    </p>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 rounded-b-3xl">
                  <button
                    type="button"
                    onClick={() => {
                      if (createdOrder) {
                        setInvoiceData(createdOrder);
                      } else {
                        setInvoiceData({
                          orderId: currentOrderId,
                          buyerName: buyerName,
                          businessName: businessName,
                          whatsapp: whatsappNumber,
                          email: buyerEmail.trim() || undefined,
                          npwp: buyerNpwp.trim() || undefined,
                          amount: appliedPromo ? appliedPromo.finalAmount : 50000,
                          originalAmount: 50000,
                          promoCode: appliedPromo?.code,
                          discountAmount: appliedPromo?.discountAmount,
                          status: "menunggu_verifikasi",
                          paymentMethod: "Transfer Bank BCA Manual",
                          bankAccount: PAYMENT_ACCOUNT_NUMBER,
                          accessCode: currentAccessCode,
                          createdAt: new Date().toISOString(),
                        });
                      }
                      setIsInvoiceOpen(true);
                    }}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LineIcon name="receipt" className="w-3.5 h-3.5" />
                    <span>Lihat &amp; Unduh Faktur / Invoice Tagihan</span>
                  </button>

                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20SakuNota,%20saya%20sudah%20transfer%20Rp${(createdOrder?.amount || (appliedPromo ? appliedPromo.finalAmount : 50000)).toLocaleString("id-ID")}%20untuk%20pesanan%20${currentOrderId}%20(${businessName}).%20Kode%20akses:%20${currentAccessCode}.%20Mohon%20verifikasi%20dan%20terbitkan%20lisensi.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    <span><LineIcon name="info" /></span>
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
              <div className="flex flex-col flex-1 min-h-0">
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6 space-y-4 text-center">
                  <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 text-3xl mx-auto flex items-center justify-center border border-blue-200"><LineIcon name="success" /></div>

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
                            Muat Ulang Lisensi
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
                          <span>{copiedLicense ? "Berhasil Disalin!" : "Salin Nomor Lisensi"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Device Binding Status */}
                    <div className="pt-2 border-t border-slate-200">
                      <span className="text-[10px] text-slate-600 block uppercase font-bold mb-1">Status Perangkat Kasir:</span>
                      {createdOrder?.boundDeviceId ? (
                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs bg-blue-50 p-2.5 rounded-xl border border-blue-200">
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
                      activateMsg.trimStart().startsWith("Lisensi resmi berhasil")
                        ? "bg-blue-50 border border-blue-200 text-blue-800"
                        : "bg-rose-50 border border-rose-200 text-rose-600"
                    }`}>
                      {activateMsg}
                    </div>
                  )}
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-3.5 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col gap-2 rounded-b-3xl">
                  {createdOrder?.licenseKey && !isActivatedHere && !createdOrder.boundDeviceId && (
                    <button
                      type="button"
                      disabled={isActivatingHere}
                      onClick={() => handleActivateOnThisDevice(createdOrder.licenseKey!)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <span><LineIcon name="lightning" /></span>
                      <span>{isActivatingHere ? "Mengaktifkan Lisensi..." : "Aktifkan di Perangkat Ini"}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      if (createdOrder) {
                        setInvoiceData(createdOrder);
                        setIsInvoiceOpen(true);
                      }
                    }}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <span><LineIcon name="receipt" /></span>
                    <span>Lihat &amp; Unduh Invoice Resmi</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="#panduan"
                      onClick={() => setIsBuyModalOpen(false)}
                      className="py-2.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl text-center transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h12v20H6zM10 18h4" /></svg></span>
                      <span>Pasang di HP</span>
                    </a>
                    <Link
                      href="/pos"
                      className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl text-center shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      <span><LineIcon name="demo" /></span>
                      <span>Buka Kasir →</span>
                    </Link>
                  </div>

                  <Link
                    href="/panduan"
                    target="_blank"
                    className="block text-center text-[11px] text-slate-600 hover:text-blue-600 font-semibold pt-1 underline"
                  >
                    Baca Panduan Aktivasi &amp; Pemasangan di HP
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

      {/* Exit Checkout Confirmation Dialog */}
      {isCheckoutExitConfirmOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setIsCheckoutExitConfirmOpen(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-2xl mx-auto">
              <LineIcon name="warning" />
            </div>
            <div className="text-center space-y-1">
              <h4 className="font-black text-base text-slate-900">Batalkan Pembelian Lisensi?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Data formulir atau sesi pesanan Anda belum selesai diproses. Apakah Anda yakin ingin keluar dari halaman pembelian?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCheckoutExitConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
              >
                Lanjut Membeli
              </button>
              <button
                type="button"
                onClick={confirmExitCheckout}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md transition-all active:scale-95"
              >
                Ya, Keluar
              </button>
            </div>
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
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center text-base shadow-sm"><LineIcon name="pin" /></div>
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
                ×
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
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold"><LineIcon name="warning" />{directActivateError}
                    </div>
                  )}

                  {directActivateSuccess && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs space-y-3">
                      <div className="font-extrabold flex items-center gap-1.5">
                        <span><LineIcon name="success" /></span>
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
                      Kode Akses Rahasia / No. WhatsApp <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="KOD-XXXX atau 08xxxxxxxxxx"
                      value={searchAccessCode}
                      onChange={(e) => setSearchAccessCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-600 focus:bg-white outline-none font-mono uppercase"
                    />
                    <span className="text-[10px] text-slate-600 block mt-1">
                      Masukkan Kode Akses berawalan <strong>KOD-</strong> yang muncul saat checkout, ATAU nomor WhatsApp yang Anda gunakan saat memesan. Jika Anda sudah punya Kode Lisensi, pilih tab <strong>Pakai Kode Lisensi</strong> di atas.
                    </span>
                  </div>

                  {searchError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold"><LineIcon name="warning" />{searchError}
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
                            <span>{copiedLicense ? "Tersalin!" : " Salin Lisensi"}</span>
                          </button>
                        </div>

                        {/* Device Binding Status */}
                        <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                          <span className="text-[10px] text-slate-600 block uppercase font-bold mb-1">Status Perangkat Kasir:</span>
                          {searchResult.boundDeviceId ? (
                            <div className="text-blue-700 font-bold text-xs flex items-center gap-1.5">
                              <span></span>
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
                            <span><LineIcon name="lightning" /></span>
                            <span>{isActivatingHere ? "Mengaktifkan..." : "Aktifkan di Perangkat Ini"}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceData(searchResult);
                            setIsInvoiceOpen(true);
                          }}
                          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <span><LineIcon name="receipt" /></span>
                          <span>Lihat &amp; Unduh Invoice Resmi</span>
                        </button>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <a
                            href="#panduan"
                            onClick={() => setIsCheckStatusModalOpen(false)}
                            className="py-2 px-3 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:text-slate-900 text-center transition-colors"
                          > Pasang di HP
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
                          <span><LineIcon name="receipt" /></span>
                          <span>{isSearchingOrder ? "Menyinkronkan..." : "Sinkronkan Status Pembayaran"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setInvoiceData(searchResult);
                            setIsInvoiceOpen(true);
                          }}
                          className="w-full py-2 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <LineIcon name="receipt" className="w-3.5 h-3.5" />
                          <span>Lihat &amp; Unduh Faktur / Invoice Tagihan</span>
                        </button>

                        <a
                          href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20SakuNota,%20saya%20sudah%20transfer%20untuk%20pesanan%20${searchResult.orderId}%20(${searchResult.businessName}).%20Kode%20akses:%20${searchResult.accessCode}.%20Mohon%20verifikasi%20dan%20terbitkan%20lisensi.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold rounded-xl border border-blue-200 transition-all flex items-center justify-center gap-1.5"
                        >
                          <span><LineIcon name="info" /></span>
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

      {/* MODAL INVOICE RESMI PEMBELIAN LISENSI */}
      {isInvoiceOpen && invoiceData && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
          onClick={() => setIsInvoiceOpen(false)}
        >
          <div
            className="bg-white text-slate-900 rounded-3xl max-w-xl w-full p-5 sm:p-7 space-y-4 shadow-2xl relative border border-slate-200 my-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header Actions */}
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
                  <LineIcon name="receipt" className="w-4 h-4" />
                </span>
                <span className="text-xs font-black uppercase text-slate-800 tracking-wider truncate">
                  {invoiceData.status === "lunas_lisensi_terbit" ? "Faktur & Invoice Resmi" : "Faktur Tagihan Pembelian"}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => printOfficialInvoice(invoiceData)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                >
                  <LineIcon name="printer" className="w-3.5 h-3.5" />
                  <span>Cetak / Unduh PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsInvoiceOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Printable Invoice Body */}
            <div className="space-y-4 text-xs text-slate-700">
              {/* Header Toko / Perusahaan */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 pb-3 border-b-2 border-slate-900">
                <div>
                  <div className="text-lg font-black tracking-tight text-slate-900">SakuNota</div>
                  <div className="text-[11px] font-bold text-blue-600">Kasir Jalan Tanpa Internet</div>
                  <div className="text-[11px] text-slate-600 font-medium mt-0.5">PT Pemuda Gaya Bebas</div>
                  <div className="text-[10px] text-slate-500">NPWP: 125383232617000 • sakunota.my.id</div>
                </div>
                <div className="sm:text-right">
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    invoiceData.status === "lunas_lisensi_terbit"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : invoiceData.status === "batal"
                      ? "bg-rose-100 text-rose-800 border border-rose-300"
                      : "bg-amber-100 text-amber-800 border border-amber-300"
                  }`}>
                    {invoiceData.status === "lunas_lisensi_terbit"
                      ? "LUNAS / PAID"
                      : invoiceData.status === "batal"
                      ? "DIBATALKAN"
                      : "MENUNGGU PEMBAYARAN"}
                  </span>
                  <div className="font-mono text-sm font-black text-slate-900 mt-1">INV-{invoiceData.orderId}</div>
                  <div className="text-[10px] text-slate-500">
                    Tanggal: {invoiceData.createdAt ? new Date(invoiceData.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : new Date().toLocaleDateString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Data Pelanggan & Pesanan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 block border-b border-slate-200 pb-1 mb-1">Diterbitkan Untuk (Pelanggan)</span>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Nama Usaha:</span>
                    <strong className="text-slate-900 text-right">{invoiceData.businessName}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Pemilik:</span>
                    <strong className="text-slate-900 text-right">{invoiceData.buyerName}</strong>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">WhatsApp:</span>
                    <span className="font-mono font-semibold text-slate-800">{invoiceData.whatsapp}</span>
                  </div>
                  {invoiceData.npwp && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">NPWP Pelanggan:</span>
                      <span className="font-mono font-semibold text-slate-800">{invoiceData.npwp}</span>
                    </div>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <span className="text-[9px] uppercase font-extrabold text-slate-500 block border-b border-slate-200 pb-1 mb-1">Rincian Pesanan &amp; Akses</span>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">No. Pesanan:</span>
                    <strong className="font-mono text-slate-900">{invoiceData.orderId}</strong>
                  </div>
                  {invoiceData.accessCode && (
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-500">Kode Akses:</span>
                      <strong className="font-mono text-blue-700">{invoiceData.accessCode}</strong>
                    </div>
                  )}
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">Metode Bayar:</span>
                    <strong className="text-slate-900 text-right">{invoiceData.paymentMethod || "Transfer BCA / QRIS"}</strong>
                  </div>
                </div>
              </div>

              {/* Rincian Produk */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-100 text-[10px] font-black uppercase text-slate-600 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Deskripsi Layanan</th>
                      <th className="py-2.5 px-2 text-center whitespace-nowrap">Qty</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Harga</th>
                      <th className="py-2.5 px-3 text-right whitespace-nowrap">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs">
                    <tr>
                      <td className="py-3 px-3">
                        <strong className="text-slate-900 block font-bold">Lisensi SakuNota</strong>
                        <span className="text-[10px] text-slate-500 leading-relaxed block mt-0.5">
                          Satu toko, maksimal dua perangkat. Tanpa langganan bulanan.
                        </span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold whitespace-nowrap">1</td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">Rp {Math.round((invoiceData.originalAmount || 50000) / 1.11).toLocaleString("id-ID")}</td>
                      <td className="py-3 px-3 text-right font-black text-slate-900 whitespace-nowrap">Rp {Math.round((invoiceData.originalAmount || 50000) / 1.11).toLocaleString("id-ID")}</td>
                    </tr>
                    <tr className="bg-slate-50/60 text-slate-600">
                      <td colSpan={3} className="py-2 px-3 text-right font-semibold text-[11px]">
                        Dasar Pengenaan Pajak (DPP):
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-xs whitespace-nowrap">
                        Rp {Math.round((invoiceData.amount || 50000) / 1.11).toLocaleString("id-ID")}
                      </td>
                    </tr>
                    {invoiceData.promoCode && (
                      <tr className="bg-emerald-50/70 text-emerald-800">
                        <td colSpan={3} className="py-2 px-3 text-right font-bold text-[11px]">
                          Potongan Diskon Promo ({invoiceData.promoCode}):
                        </td>
                        <td className="py-2 px-3 text-right font-black text-xs text-emerald-700 whitespace-nowrap">
                          -Rp {(invoiceData.discountAmount || 0).toLocaleString("id-ID")}
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-50/60 text-slate-600">
                      <td colSpan={3} className="py-2 px-3 text-right font-semibold text-[11px]">
                        PPN 11% (Termasuk / Included):
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-xs text-slate-800 whitespace-nowrap">
                        Rp {((invoiceData.amount || 50000) - Math.round((invoiceData.amount || 50000) / 1.11)).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 text-xs font-black border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={3} className="py-3 px-3 text-right uppercase text-[11px] text-slate-700">Total Tagihan (Termasuk PPN 11%):</td>
                      <td className="py-3 px-3 text-right text-blue-700 text-sm whitespace-nowrap">Rp {(invoiceData.amount || 50000).toLocaleString("id-ID")}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Petunjuk Pembayaran jika status belum lunas */}
              {invoiceData.status !== "lunas_lisensi_terbit" && invoiceData.status !== "batal" && (
                <div className="p-3.5 bg-amber-50/90 border border-amber-300 rounded-2xl space-y-2 text-[11px]">
                  <div className="flex items-center justify-between border-b border-amber-200 pb-1.5">
                    <span className="text-[10px] font-black uppercase text-amber-950">Instruksi Pembayaran Transfer Bank</span>
                    <span className="text-[9px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full">Tagihan Aktif</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-slate-800">
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-500">Bank Tujuan: </span>
                      <strong>{PAYMENT_BANK_NAME}</strong>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-500">Nomor Rekening: </span>
                      <strong className="font-mono text-xs">{PAYMENT_ACCOUNT_NUMBER}</strong>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-500">Atas Nama: </span>
                      <strong>{PAYMENT_ACCOUNT_NAME}</strong>
                    </div>
                    <div className="flex justify-between sm:block">
                      <span className="text-slate-500">Nominal Transfer: </span>
                      <strong className="text-emerald-700 font-bold">Rp {(invoiceData.amount || 50000).toLocaleString("id-ID")}</strong>
                    </div>
                    <div className="sm:col-span-2 pt-0.5">
                      <span className="text-slate-500">Berita / Keterangan Transfer: </span>
                      <strong className="font-mono font-bold text-slate-900">{invoiceData.orderId}</strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Info Lisensi */}
              {invoiceData.licenseKey && (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-center space-y-1">
                  <span className="text-[10px] font-black uppercase text-blue-900 block">Nomor Lisensi Resmi SakuNota:</span>
                  <div className="font-mono font-black text-blue-700 text-sm tracking-wider select-all bg-white py-1.5 px-3 rounded-xl border border-blue-200 inline-block">
                    {invoiceData.licenseKey}
                  </div>
                </div>
              )}

              {/* Catatan Legal */}
              <div className="text-[10px] text-slate-500 text-center leading-relaxed pt-1 border-t border-slate-200">
                Faktur / Invoice ini diterbitkan secara elektronik oleh sistem SakuNota (PT Pemuda Gaya Bebas) dan sah tanpa tanda tangan basah.
              </div>
            </div>

            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => printOfficialInvoice(invoiceData)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <LineIcon name="printer" className="w-3.5 h-3.5" />
                <span>Cetak / Simpan PDF</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInvoiceOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
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
