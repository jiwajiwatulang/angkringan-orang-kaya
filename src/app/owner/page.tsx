"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { 
  CustomerOrder, 
  OwnerMetrics,
  loginOwnerServer, 
  fetchOwnerOrdersServer, 
  verifyOwnerOrderServer,
  fetchOwnerMetricsServer,
  logoutOwnerServer,
  TesterLicense,
  fetchTesterLicensesServer,
  createTesterLicenseServer,
  unbindTesterLicenseServer,
  revokeTesterLicenseServer,
  CommercialLicense,
  fetchOwnerLicensesServer,
  unbindOwnerLicenseServer,
  revokeOwnerLicenseServer,
  cancelOwnerOrderServer,
  archiveOwnerOrderServer,
  deleteOwnerTestOrderServer,
  syncOwnerMidtransServer,
  BetaRegistration,
  fetchBetaRegistrationsServer,
  approveBetaRegistrationServer,
  rejectBetaRegistrationServer,
  extendBetaTrialServer,
  revokeBetaTrialServer,
  unbindBetaTrialServer,
  convertBetaTrialToPaidServer,
} from "@/lib/ordersClient";

export default function SakuNotaOwnerDashboardPage() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ownerToken, setOwnerToken] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Dashboard Tabs & Data State
  const [activeTab, setActiveTab] = useState<
    "orders" | "beta" | "summary" | "customers" | "devices" | "tester" | "support" | "settings"
  >("orders");
  const [orderFilter, setOrderFilter] = useState<"semua" | "menunggu" | "berhasil" | "gagal" | "kedaluwarsa" | "dikembalikan" | "arsip">("semua");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [licenses, setLicenses] = useState<CommercialLicense[]>([]);
  const [testerLicenses, setTesterLicenses] = useState<TesterLicense[]>([]);
  const [betaRegistrations, setBetaRegistrations] = useState<BetaRegistration[]>([]);
  const [isLoadingBeta, setIsLoadingBeta] = useState(false);
  const [betaFilter, setBetaFilter] = useState<"semua" | "pending" | "disetujui" | "trial_active" | "trial_expired" | "dicabut" | "dikonversi_berbayar">("semua");
  const [betaSearch, setBetaSearch] = useState("");
  const [extendTarget, setExtendTarget] = useState<BetaRegistration | null>(null);
  const [extendDays, setExtendDays] = useState<number>(7);
  const [extendReason, setExtendReason] = useState<string>("Permintaan perpanjangan evaluasi fitur");
  const [isExtending, setIsExtending] = useState(false);
  const [metrics, setMetrics] = useState<OwnerMetrics>({
    totalPembeli: 0,
    pembayaranBerhasil: 0,
    lisensiAktif: 0,
    penggunaAktif: 0,
    menungguVerifikasi: 0,
    menungguPembayaran: 0,
  });
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Tester License Form State
  const [testerRecipient, setTesterRecipient] = useState("");
  const [testerWhatsapp, setTesterWhatsapp] = useState("");
  const [testerDuration, setTesterDuration] = useState<number>(7);
  const [testerNotes, setTesterNotes] = useState("");
  const [isCreatingTester, setIsCreatingTester] = useState(false);

  // Data Cleanup Form State in Settings
  const [deleteTargetOrderId, setDeleteTargetOrderId] = useState("");
  const [deleteAuditNote, setDeleteAuditNote] = useState("");
  const [deletePasswordConfirm, setDeletePasswordConfirm] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [isDeletingOrder, setIsDeletingOrder] = useState(false);
  const [showDevDrawer, setShowDevDrawer] = useState(false);

  // Load orders helper with silent polling support
  const loadOrders = async (token: string, silent = false) => {
    if (!silent) setIsLoadingOrders(true);
    setLoadError("");

    try {
      const res = await fetchOwnerOrdersServer(token);
      if (res.success && res.orders) {
        setOrders(res.orders);

        // Fetch genuine metrics from database
        const mRes = await fetchOwnerMetricsServer(token);
        if (mRes.success && mRes.metrics) {
          setMetrics(mRes.metrics);
        } else {
          // Fallback calculate directly from orders list with ZERO hardcoded values
          const paidCount = res.orders.filter((o) => o.status === "lunas_lisensi_terbit").length;
          const pendingCount = res.orders.filter((o) => o.status === "menunggu_verifikasi").length;
          setMetrics({
            totalPembeli: res.orders.filter((o) => o.status !== "batal" && (o.status as any) !== "arsip_uji").length,
            pembayaranBerhasil: paidCount,
            lisensiAktif: paidCount,
            penggunaAktif: res.orders.filter((o) => (o as any).boundDeviceId).length,
            menungguVerifikasi: pendingCount,
            menungguPembayaran: pendingCount,
          });
        }
      } else if (res.error?.includes("berakhir") || res.error?.includes("dicabut") || res.error?.includes("ditolak")) {
        handleLogout();
        setLoginError(res.error);
      } else if (res.error) {
        if (!silent) setLoadError(res.error);
      }
    } catch {
      if (!silent) setLoadError("Gagal memuat data dari server. Periksa koneksi Anda.");
    } finally {
      if (!silent) setIsLoadingOrders(false);
    }
  };

  // Load commercial licenses
  const loadLicenses = async (token: string) => {
    try {
      const res = await fetchOwnerLicensesServer(token);
      if (res.success && res.licenses) {
        setLicenses(res.licenses);
      }
    } catch (_) {}
  };

  // Load tester licenses
  const loadTesterLicenses = async (token: string) => {
    try {
      const res = await fetchTesterLicensesServer(token);
      if (res.success && res.testerLicenses) {
        setTesterLicenses(res.testerLicenses);
      }
    } catch (_) {}
  };

  // Load beta registrations
  const loadBetaRegistrations = async (token: string, silent = false) => {
    if (!silent) setIsLoadingBeta(true);
    try {
      const res = await fetchBetaRegistrationsServer(token);
      if (res.success && res.registrations) {
        setBetaRegistrations(res.registrations);
      }
    } catch (_) {}
    finally {
      if (!silent) setIsLoadingBeta(false);
    }
  };

  // Check stored session token on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem("sakunota_owner_token");
      if (storedToken) {
        setOwnerToken(storedToken);
        setIsLoggedIn(true);
        loadOrders(storedToken);
        loadLicenses(storedToken);
        loadTesterLicenses(storedToken);
        loadBetaRegistrations(storedToken);
      }
    }
  }, []);

  // Real-time live polling (every 8 seconds)
  useEffect(() => {
    if (!ownerToken || !isLoggedIn) return;
    const interval = setInterval(() => {
      loadOrders(ownerToken, true);
    }, 8000);
    return () => clearInterval(interval);
  }, [ownerToken, isLoggedIn]);

  const handleApproveBeta = async (regId: string) => {
    if (!ownerToken) return;
    try {
      const res = await approveBetaRegistrationServer(ownerToken, regId);
      if (res.success && res.registration) {
        setToastMsg(`Pendaftaran disetujui! Lisensi: ${res.registration.licenseKey}`);
        await loadBetaRegistrations(ownerToken, true);
        setTimeout(() => setToastMsg(""), 5000);
      } else {
        alert(res.error || "Gagal menyetujui pendaftaran beta.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleRejectBeta = async (regId: string) => {
    if (!ownerToken) return;
    const reason = window.prompt("Alasan penolakan (opsional):") || "";
    try {
      const res = await rejectBetaRegistrationServer(ownerToken, regId, reason);
      if (res.success) {
        setToastMsg("Pendaftaran beta telah ditolak.");
        await loadBetaRegistrations(ownerToken, true);
        setTimeout(() => setToastMsg(""), 4000);
      } else {
        alert(res.error || "Gagal menolak pendaftaran.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleCopyBetaInvite = (reg: BetaRegistration) => {
    if (!reg.licenseKey) {
      alert("Lisensi belum diterbitkan.");
      return;
    }
    const cleanPhone = reg.whatsapp.replace(/[^0-9]/g, "");
    const formattedPhone = cleanPhone.startsWith("0") ? "62" + cleanPhone.slice(1) : cleanPhone;
    const message = `Halo ${reg.ownerName}, pendaftaran Closed Beta SakuNota untuk "${reg.businessName}" telah DISETUJUI! 🎉\n\nNomor Lisensi Uji Coba 7 Hari Anda:\n👉 *${reg.licenseKey}*\n\nCara Aktivasi di HP Kasir:\n1. Buka https://angkringan-orang-kaya.ranutarde.workers.dev/pos\n2. Masukkan nomor lisensi di atas lalu tekan "Aktifkan Perangkat".\n3. SakuNota siap dipakai berjualan secara offline tanpa internet!\n\nPanduan Pemasangan & Pemakaian:\nhttps://angkringan-orang-kaya.ranutarde.workers.dev/panduan\n\nJika butuh bantuan teknis, silakan balas pesan WhatsApp ini. Selamat mencoba!`;

    navigator.clipboard.writeText(message);
    setToastMsg("Teks undangan disalin ke clipboard!");
    setTimeout(() => setToastMsg(""), 4000);
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  const handleUnbindBeta = async (regId: string) => {
    if (!ownerToken) return;
    if (!confirm("Lepas perangkat kasir terikat? Pendaftar dapat mengaktifkan kasir di HP baru.")) return;
    const reason = window.prompt("Alasan pelepasan perangkat:", "Ganti perangkat kasir") || "Ganti perangkat kasir";
    try {
      const res = await unbindBetaTrialServer(ownerToken, regId, reason);
      if (res.success) {
        setToastMsg("Perangkat kasir berhasil dilepas.");
        await loadBetaRegistrations(ownerToken, true);
        setTimeout(() => setToastMsg(""), 4000);
      } else {
        alert(res.error || "Gagal melepas perangkat.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleRevokeBeta = async (regId: string) => {
    if (!ownerToken) return;
    if (!confirm("Cabut izin trial beta ini? Kasir akan langsung terkunci pada sinkronisasi berikutnya.")) return;
    const reason = window.prompt("Alasan pencabutan izin:", "Pelanggaran ketentuan evaluasi") || "Dicabut oleh Owner";
    try {
      const res = await revokeBetaTrialServer(ownerToken, regId, reason);
      if (res.success) {
        setToastMsg("Akses trial berhasil dicabut.");
        await loadBetaRegistrations(ownerToken, true);
        setTimeout(() => setToastMsg(""), 4000);
      } else {
        alert(res.error || "Gagal mencabut akses.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleConvertBetaToPaid = async (regId: string) => {
    if (!ownerToken) return;
    if (!confirm("Konversi pendaftar beta ini menjadi Lisensi Berbayar Permanen (Rp65.000)? Perangkat dan data lokal kasir tetap utuh tanpa reset.")) return;
    try {
      const res = await convertBetaTrialToPaidServer(ownerToken, regId);
      if (res.success) {
        setToastMsg(`Berhasil dikonversi menjadi lisensi berbayar permanen! Lisensi: ${res.licenseKey}`);
        await loadBetaRegistrations(ownerToken, true);
        await loadOrders(ownerToken, true);
        setTimeout(() => setToastMsg(""), 5000);
      } else {
        alert(res.error || "Gagal mengonversi pendaftar beta.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleConfirmExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerToken || !extendTarget) return;
    setIsExtending(true);
    try {
      const regId = extendTarget.registrationId || String(extendTarget.id);
      const res = await extendBetaTrialServer(ownerToken, regId, extendDays, extendReason);
      if (res.success) {
        setToastMsg(`Trial diperpanjang +${extendDays} hari!`);
        setExtendTarget(null);
        await loadBetaRegistrations(ownerToken, true);
        setTimeout(() => setToastMsg(""), 4000);
      } else {
        alert(res.error || "Gagal memperpanjang trial.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setIsExtending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setIsSubmittingLogin(true);

    try {
      const res = await loginOwnerServer(usernameInput, passwordInput);
      if (res.success && res.token) {
        setOwnerToken(res.token);
        setIsLoggedIn(true);
        sessionStorage.setItem("sakunota_owner_token", res.token);
        setUsernameInput("");
        setPasswordInput("");
        await loadOrders(res.token);
        await loadLicenses(res.token);
        await loadTesterLicenses(res.token);
        await loadBetaRegistrations(res.token);
      } else {
        setLoginError(res.error || "Username atau Password salah! Akses khusus Owner Reza.");
      }
    } catch (err: any) {
      setLoginError("Koneksi gagal: " + err.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleLogout = async () => {
    if (ownerToken) {
      try {
        await logoutOwnerServer(ownerToken);
      } catch (_) {}
    }
    setIsLoggedIn(false);
    setOwnerToken(null);
    setOrders([]);
    setLicenses([]);
    setTesterLicenses([]);
    setMetrics({ totalPembeli: 0, pembayaranBerhasil: 0, lisensiAktif: 0, penggunaAktif: 0, menungguVerifikasi: 0, menungguPembayaran: 0 });
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("sakunota_owner_token");
    }
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  // Owner action: Verify money arrival & issue genuine license via Server API
  const handleVerifyAndIssueLicense = async (orderId: string) => {
    if (!ownerToken) {
      showToast("❌ Sesi Anda tidak valid. Silakan login kembali.");
      return;
    }

    const res = await verifyOwnerOrderServer(ownerToken, orderId);
    if (res.success && res.licenseKey) {
      showToast(`✅ Pembayaran pesanan ${orderId} diverifikasi & Lisensi ${res.licenseKey} diterbitkan!`);
      setOrders((prev) =>
        prev.map((o) =>
          o.orderId === orderId
            ? {
                ...o,
                status: "lunas_lisensi_terbit",
                licenseKey: res.licenseKey,
                verifiedAt: new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }),
              }
            : o
        )
      );
      await loadOrders(ownerToken, true);
      await loadLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal menerbitkan lisensi."}`);
    }
  };

  // Owner action: Sync status live with Midtrans API
  const handleSyncMidtrans = async (orderId: string) => {
    if (!ownerToken) return;
    showToast(`🔄 Memeriksa status pesanan ${orderId} di Midtrans...`);
    const res = await syncOwnerMidtransServer(ownerToken, orderId);
    if (res.success) {
      if (res.updated) {
        showToast(`🎉 Pembayaran ${orderId} terverifikasi di Midtrans! Lisensi telah terbit.`);
      } else {
        showToast(`ℹ️ Status Midtrans untuk ${orderId}: ${res.order?.status || "Belum ada pembayaran settlement"}.`);
      }
      await loadOrders(ownerToken, true);
      await loadLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal sinkronisasi dengan Midtrans."}`);
    }
  };

  // Owner action: Copy ready-to-send license message for WhatsApp
  const handleCopyLicenseMessage = (o: CustomerOrder) => {
    const msg = `Halo Kak ${o.buyerName}, terima kasih telah membeli SakuNota!

Berikut rincian lisensi resmi untuk usaha *${o.businessName}*:
• Nomor Lisensi: *${o.licenseKey}*
• Nomor Pesanan: ${o.orderId}
• Kode Akses Rahasia: ${o.accessCode}

Langkah Pasang & Aktivasi di HP:
1. Buka https://angkringan-orang-kaya.ranutarde.workers.dev di Google Chrome HP Anda
2. Ketuk menu titik tiga (⋮) lalu pilih "Instal aplikasi" atau "Tambahkan ke Layar Utama"
3. Buka SakuNota di HP kasir, buka menu Pengaturan → Tentang SakuNota, lalu masukkan Nomor Lisensi di atas dan tekan Aktifkan.

Kasir Anda langsung aktif dan siap jalan tanpa internet.`;

    navigator.clipboard.writeText(msg);
    showToast("📋 Pesan lisensi WhatsApp berhasil disalin!");
  };

  const getWhatsAppLicenseUrl = (o: CustomerOrder) => {
    const cleanPhone = o.whatsapp.replace(/^0/, "62").replace(/[^0-9]/g, "");
    const msg = `Halo Kak ${o.buyerName}, terima kasih telah membeli SakuNota!

Berikut rincian lisensi resmi untuk usaha *${o.businessName}*:
• Nomor Lisensi: *${o.licenseKey}*
• Nomor Pesanan: ${o.orderId}
• Kode Akses Rahasia: ${o.accessCode}

Langkah Pasang & Aktivasi di HP:
1. Buka https://angkringan-orang-kaya.ranutarde.workers.dev di Google Chrome HP Anda
2. Ketuk menu titik tiga (⋮) lalu pilih "Instal aplikasi" atau "Tambahkan ke Layar Utama"
3. Buka SakuNota di HP kasir, buka menu Pengaturan → Tentang SakuNota, lalu masukkan Nomor Lisensi di atas dan tekan Aktifkan.

Kasir Anda langsung aktif dan siap jalan tanpa internet.`;

    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  // Owner action: Cancel unpaid order
  const handleCancelOrder = async (orderId: string) => {
    if (!ownerToken) return;
    if (!confirm(`Batalkan pesanan ${orderId}? Pelanggan tidak akan dapat mengaktifkan lisensi ini.`)) return;

    const res = await cancelOwnerOrderServer(ownerToken, orderId);
    if (res.success) {
      showToast(`✅ Pesanan ${orderId} berhasil dibatalkan.`);
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status: "batal" } : o)));
      await loadOrders(ownerToken, true);
    } else {
      showToast(`❌ ${res.error || "Gagal membatalkan pesanan."}`);
    }
  };

  // Owner action: Archive test order
  const handleArchiveOrder = async (orderId: string) => {
    if (!ownerToken) return;
    const res = await archiveOwnerOrderServer(ownerToken, orderId);
    if (res.success) {
      showToast(`📁 Pesanan uji ${orderId} berhasil diarsipkan.`);
      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, status: "arsip_uji" as any } : o)));
      await loadOrders(ownerToken, true);
    } else {
      showToast(`❌ ${res.error || "Gagal mengarsipkan pesanan."}`);
    }
  };

  // Owner action: Unbind commercial device
  const handleUnbindCommercialDevice = async (licenseKey: string) => {
    if (!ownerToken) return;
    if (!confirm(`Lepas ikatan perangkat untuk lisensi ${licenseKey}? Pelanggan dapat mengaktifkannya di HP baru.`)) return;

    const res = await unbindOwnerLicenseServer(ownerToken, licenseKey);
    if (res.success) {
      showToast(`✅ Perangkat pada lisensi ${licenseKey} berhasil dilepas.`);
      setLicenses((prev) =>
        prev.map((l) => (l.licenseKey === licenseKey ? { ...l, boundDeviceId: null, deviceName: null } : l))
      );
      await loadOrders(ownerToken, true);
      await loadLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal melepas perangkat."}`);
    }
  };

  // Owner action: Revoke commercial license
  const handleRevokeCommercialLicense = async (licenseKey: string) => {
    if (!ownerToken) return;
    if (!confirm(`CABUT LISENSI ${licenseKey}? Kasir pengguna tidak akan dapat mengakses aplikasi setelah online.`)) return;

    const res = await revokeOwnerLicenseServer(ownerToken, licenseKey);
    if (res.success) {
      showToast(`🚫 Lisensi ${licenseKey} berhasil dicabut.`);
      setLicenses((prev) =>
        prev.map((l) => (l.licenseKey === licenseKey ? { ...l, revoked: 1 } : l))
      );
      await loadLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal mencabut lisensi."}`);
    }
  };

  // Owner action: Create Tester License
  const handleCreateTesterLicense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerToken) return;
    if (!testerRecipient.trim() || !testerWhatsapp.trim()) {
      showToast("❌ Nama penerima dan nomor WhatsApp wajib diisi.");
      return;
    }

    setIsCreatingTester(true);
    const res = await createTesterLicenseServer(ownerToken, {
      recipientName: testerRecipient,
      whatsapp: testerWhatsapp,
      durationDays: testerDuration,
      notes: testerNotes,
    });

    if (res.success && res.testerLicense) {
      showToast(`✅ Lisensi tester ${res.testerLicense.licenseKey} berhasil diterbitkan!`);
      const newLic = res.testerLicense;
      setTesterLicenses((prev) => [newLic, ...prev.filter((t) => t.licenseKey !== newLic.licenseKey)]);
      setTesterRecipient("");
      setTesterWhatsapp("");
      setTesterNotes("");
      await loadTesterLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal menerbitkan lisensi tester."}`);
    }
    setIsCreatingTester(false);
  };

  // Owner action: Unbind tester device
  const handleUnbindTester = async (licenseKey: string) => {
    if (!ownerToken) return;
    const res = await unbindTesterLicenseServer(ownerToken, licenseKey);
    if (res.success) {
      showToast(`✅ Perangkat pada lisensi ${licenseKey} berhasil dilepas.`);
      setTesterLicenses((prev) =>
        prev.map((t) => (t.licenseKey === licenseKey ? { ...t, boundDeviceId: null, deviceName: null } : t))
      );
      await loadTesterLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal melepas perangkat."}`);
    }
  };

  // Owner action: Revoke tester license
  const handleRevokeTester = async (licenseKey: string) => {
    if (!ownerToken) return;
    const res = await revokeTesterLicenseServer(ownerToken, licenseKey);
    if (res.success) {
      showToast(`✅ Lisensi ${licenseKey} berhasil dicabut.`);
      setTesterLicenses((prev) =>
        prev.map((t) => (t.licenseKey === licenseKey ? { ...t, revoked: 1 } : t))
      );
      await loadTesterLicenses(ownerToken);
    } else {
      showToast(`❌ ${res.error || "Gagal mencabut lisensi."}`);
    }
  };

  // Owner action: Safe test order deletion in Settings
  const handleDeleteTestOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerToken) return;
    setDeleteMessage("");

    if (!deleteTargetOrderId.trim() || !deleteAuditNote.trim()) {
      setDeleteMessage("❌ Nomor pesanan dan catatan audit wajib diisi.");
      return;
    }

    if (deletePasswordConfirm !== "Reza-SakuNota-2026!") {
      setDeleteMessage("❌ Konfirmasi sandi Owner Reza salah.");
      return;
    }

    setIsDeletingOrder(true);
    const res = await deleteOwnerTestOrderServer(ownerToken, deleteTargetOrderId.trim(), deleteAuditNote.trim());
    if (res.success) {
      setDeleteMessage(`✅ Data uji coba ${deleteTargetOrderId} berhasil dibersihkan dengan aman.`);
      setDeleteTargetOrderId("");
      setDeleteAuditNote("");
      setDeletePasswordConfirm("");
      await loadOrders(ownerToken);
    } else {
      setDeleteMessage(`❌ ${res.error || "Gagal menghapus data pengujian."}`);
    }
    setIsDeletingOrder(false);
  };

  // 1. TAMPILAN LOGIN OWNER
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-app text-fg flex flex-col justify-center items-center p-4 selection:bg-accent selection:text-white">
        <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-surface border border-line shadow-2xl space-y-6">
          <div className="text-center space-y-1.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl mx-auto shadow-lg shadow-purple-600/30">
              SN
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
              SakuNota Owner Portal
            </h1>
            <p className="text-xs text-muted">
              Pusat Pengelolaan Pelanggan, Pembayaran, dan Lisensi Perangkat
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold leading-relaxed">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Username Owner
              </label>
              <input
                type="text"
                required
                placeholder="Masukkan username (contoh: Reza)"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-purple-500 outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-fg mb-1">
                Password Rahasia
              </label>
              <input
                type="password"
                required
                placeholder="Masukkan password rahasia"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-line text-xs text-fg focus:border-purple-500 outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingLogin}
              className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
            >
              {isSubmittingLogin ? "Memverifikasi..." : "Masuk ke Dashboard Owner"}
            </button>
          </form>

          <div className="pt-2 border-t border-line text-center text-xs">
            <Link href="/" className="text-muted hover:text-fg font-bold transition-colors">
              ← Kembali ke Beranda SakuNota
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Filtered orders list
  const filteredOrders = orders.filter((o) => {
    if (orderFilter === "semua") return true;
    if (orderFilter === "menunggu") return o.status === "menunggu_verifikasi";
    if (orderFilter === "berhasil") return o.status === "lunas_lisensi_terbit";
    if (orderFilter === "gagal") return o.status === "batal" || (o.status as any) === "gagal";
    if (orderFilter === "kedaluwarsa") return (o.status as any) === "kedaluwarsa";
    if (orderFilter === "dikembalikan") return (o.status as any) === "dikembalikan";
    if (orderFilter === "arsip") return (o.status as any) === "arsip_uji";
    return true;
  });

  // 2. DASHBOARD OWNER
  return (
    <div className="min-h-screen bg-app text-fg flex flex-col selection:bg-purple-600 selection:text-white">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl bg-surface border border-line shadow-2xl text-xs font-bold text-fg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-md">
            SN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-base text-fg tracking-tight leading-none">
                SakuNota Owner
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-600 dark:text-purple-400 text-[10px] font-black border border-purple-500/30">
                Pusat Kontrol Bisnis
              </span>
            </div>
            <span className="text-[10px] text-muted font-bold block mt-0.5">
              Halo, Reza • Cloudflare Production Edge
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle size="sm" />
          <button
            type="button"
            onClick={() => ownerToken && loadOrders(ownerToken)}
            disabled={isLoadingOrders}
            className="p-2 bg-card hover:bg-line text-xs font-bold text-fg rounded-xl border border-line transition-colors"
            title="Segarkan Data"
          >
            🔄
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl border border-rose-500/30 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Connection Failure Error Banner */}
        {loadError && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span>⚠️</span>
              <span>{loadError}</span>
            </div>
            <button
              type="button"
              onClick={() => ownerToken && loadOrders(ownerToken)}
              className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-black hover:bg-rose-700 transition-colors shrink-0"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Metric Cards - 4 Key Business Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Total Pembeli</span>
            <div className="text-2xl sm:text-3xl font-black text-fg">{metrics.totalPembeli}</div>
            <span className="text-[10px] font-bold text-blue-500">
              {metrics.totalPembeli === 0 ? "Belum ada pembeli" : `${metrics.totalPembeli} pembeli terdaftar`}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Pembayaran Berhasil</span>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {metrics.pembayaranBerhasil ?? orders.filter((o) => o.status === "lunas_lisensi_terbit").length}
            </div>
            <span className="text-[10px] font-bold text-emerald-500">
              {(metrics.pembayaranBerhasil || 0) === 0 ? "Belum ada pembayaran" : "Lisensi resmi aktif"}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Lisensi Aktif</span>
            <div className="text-2xl sm:text-3xl font-black text-fg">{metrics.lisensiAktif}</div>
            <span className="text-[10px] font-bold text-purple-500">
              {metrics.lisensiAktif === 0 ? "Belum ada lisensi" : `${metrics.lisensiAktif} lisensi terikat`}
            </span>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-muted">Menunggu Pembayaran</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-500">{metrics.menungguVerifikasi}</div>
            <span className="text-[10px] font-bold text-rose-400">
              {metrics.menungguVerifikasi === 0 ? "Tidak ada pesanan tertunda" : "Perlu cek mutasi BCA"}
            </span>
          </div>
        </div>

        {/* Clean Operational Tabs */}
        <div className="flex border-b border-line gap-2 text-xs font-bold overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "orders"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            📋 Pesanan & Pembayaran ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("beta");
              if (ownerToken) loadBetaRegistrations(ownerToken);
            }}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "beta"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            🚀 Pendaftar Beta ({betaRegistrations.filter((b) => b.status === "pending").length} baru)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("customers")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "customers"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            👥 Pelanggan
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("devices");
              if (ownerToken) loadLicenses(ownerToken);
            }}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "devices"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            📱 Lisensi & Perangkat
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("tester");
              if (ownerToken) loadTesterLicenses(ownerToken);
            }}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "tester"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            🧪 Lisensi Tester ({testerLicenses.filter((t) => t.revoked === 0).length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("support")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "support"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            💬 Laporan Masalah
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-purple-600 text-white shadow-sm"
                : "bg-surface text-muted hover:text-fg border border-line"
            }`}
          >
            ⚙️ Pengaturan & Pemeliharaan
          </button>
        </div>

        {/* TAB 1: PESANAN & PEMBAYARAN */}
        {activeTab === "orders" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base text-fg">Pesanan & Pembayaran Masuk</h3>
                <p className="text-xs text-muted">
                  Pantau pembayaran transfer manual dan gerbang Midtrans. Verifikasi mutasi sebelum menerbitkan lisensi.
                </p>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {[
                  { id: "semua", label: "Semua" },
                  { id: "menunggu", label: "Menunggu" },
                  { id: "berhasil", label: "Berhasil" },
                  { id: "gagal", label: "Gagal / Batal" },
                  { id: "arsip", label: "Arsip Uji" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setOrderFilter(f.id as any)}
                    className={`px-3 py-1 rounded-xl transition-colors ${
                      orderFilter === f.id
                        ? "bg-purple-600 text-white"
                        : "bg-card text-muted hover:text-fg border border-line"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Empty State */}
            {filteredOrders.length === 0 ? (
              <div className="py-16 px-4 text-center space-y-2.5 bg-card/40 rounded-2xl border border-line/60">
                <div className="text-4xl">📋</div>
                <h4 className="text-sm font-black text-fg">Belum ada pesanan</h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Pesanan akan muncul setelah pelanggan benar-benar melakukan pembelian. Tidak ada data contoh fiktif.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredOrders.map((o) => (
                  <div
                    key={o.orderId}
                    className="p-4 sm:p-5 rounded-2xl bg-card border border-line space-y-3 hover:border-purple-500/30 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm font-black text-fg font-mono">
                            {o.orderId}
                          </strong>
                          <span className="text-[10px] font-bold text-muted px-2 py-0.5 rounded-md bg-surface border border-line">
                            {o.paymentMethod?.includes("BCA") ? "🏦 Transfer BCA" : "⚡ Midtrans Otomatis"}
                          </span>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              o.status === "lunas_lisensi_terbit"
                                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : o.status === "batal"
                                ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                                : (o.status as any) === "arsip_uji"
                                ? "bg-slate-500/15 text-slate-500 border border-slate-500/30"
                                : "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {o.status === "lunas_lisensi_terbit"
                              ? "Lunas & Lisensi Terbit"
                              : o.status === "batal"
                              ? "Dibatalkan"
                              : (o.status as any) === "arsip_uji"
                              ? "Arsip Uji Coba"
                              : "Menunggu Verifikasi"}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted block mt-0.5">
                          Dibuat: {o.createdAt} {o.verifiedAt ? `• Diverifikasi: ${o.verifiedAt}` : ""}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-muted block">Total Tagihan:</span>
                        <strong className="text-base font-black text-emerald-600 dark:text-emerald-400">
                          Rp {(o.amount || 65000).toLocaleString("id-ID")}
                        </strong>
                      </div>
                    </div>

                    {/* Customer & Business Details */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-muted font-bold block uppercase">Nama Usaha:</span>
                        <strong className="text-fg">{o.businessName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted font-bold block uppercase">Nama Pemilik:</span>
                        <span className="text-fg font-medium">{o.buyerName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-muted font-bold block uppercase">WhatsApp:</span>
                        <a
                          href={`https://wa.me/62${o.whatsapp.replace(/^0/, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                        >
                          💬 {o.whatsapp}
                        </a>
                      </div>
                    </div>

                    {/* License details & device binding status if paid */}
                    {o.licenseKey && (
                      <div className="p-3.5 rounded-2xl bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-muted font-bold uppercase block">Kode Lisensi Resmi:</span>
                          <div className="flex items-center gap-2">
                            <strong className="font-mono text-sm text-purple-600 dark:text-purple-400 select-all">
                              {o.licenseKey}
                            </strong>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(o.licenseKey || "");
                                showToast("📋 Nomor lisensi berhasil disalin!");
                              }}
                              className="text-[11px] font-bold text-muted hover:text-fg px-1.5 py-0.5 rounded border border-line bg-card"
                            >
                              Salin
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] text-muted space-y-0.5 sm:text-right">
                          <div>
                            Status Perangkat:{" "}
                            {o.boundDeviceId ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                🟢 Terikat di {o.deviceName || "Perangkat Kasir"} ({o.boundDeviceId})
                              </span>
                            ) : (
                              <span className="text-amber-600 dark:text-amber-400 font-bold">
                                🟡 Belum Diaktifkan di HP Kasir
                              </span>
                            )}
                          </div>
                          {o.lastConnectedAt && (
                            <div className="text-[10px] text-muted">
                              Terakhir Terhubung: {o.lastConnectedAt}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions Toolbar */}
                    <div className="flex flex-wrap items-center justify-end gap-2 pt-1 border-t border-line/60">
                      {o.status === "menunggu_verifikasi" && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleCancelOrder(o.orderId)}
                            className="px-3 py-1.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-muted hover:text-rose-500 border border-line transition-colors"
                          >
                            Batalkan Pesanan
                          </button>

                          {o.paymentMethod?.includes("BCA") ? (
                            <button
                              type="button"
                              onClick={() => handleVerifyAndIssueLicense(o.orderId)}
                              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              <span>✓</span>
                              <span>Verifikasi Mutasi BCA & Terbitkan Lisensi</span>
                            </button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2.5 py-1.5 rounded-xl border border-blue-200 dark:border-blue-800">
                                ⚡ Verifikasi Otomatis Midtrans
                              </span>
                              <button
                                type="button"
                                onClick={() => handleSyncMidtrans(o.orderId)}
                                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                              >
                                <span>🔄</span>
                                <span>Cek Status Midtrans Live</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}

                      {o.status === "lunas_lisensi_terbit" && (
                        <>
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs font-black">
                            ✓ {o.paymentMethod?.includes("BCA") ? "Lunas (Transfer BCA)" : "Lunas (Midtrans Otomatis)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyLicenseMessage(o)}
                            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 hover:bg-purple-100 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-300 dark:border-purple-800 transition-colors flex items-center gap-1.5"
                          >
                            <span>📋</span>
                            <span>Salin Pesan Lisensi</span>
                          </button>
                          <a
                            href={getWhatsAppLicenseUrl(o)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <span>💬</span>
                            <span>Kirim via WhatsApp</span>
                          </a>
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => handleArchiveOrder(o.orderId)}
                        className="px-2.5 py-1 rounded-xl bg-card hover:bg-line text-[11px] font-bold text-muted border border-line"
                      >
                        Arsipkan Uji
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: PENDAFTAR CLOSED BETA (7-DAY TRIAL) */}
        {activeTab === "beta" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-base text-fg">Pendaftar Closed Beta (Trial 7 Hari)</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-500 text-[10px] font-black border border-blue-500/30">
                    {betaRegistrations.length} Pendaftar
                  </span>
                </div>
                <p className="text-xs text-muted mt-0.5">
                  Setujui pendaftaran untuk menerbitkan lisensi trial 7 hari unik. Pantau masa berlaku, perpanjang, lepas perangkat, atau konversi ke lisensi berbayar permanen.
                </p>
              </div>

              {/* Beta Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                {[
                  { id: "semua", label: "Semua" },
                  { id: "pending", label: "Menunggu" },
                  { id: "disetujui", label: "Disetujui" },
                  { id: "trial_active", label: "Trial Aktif" },
                  { id: "trial_expired", label: "Kedaluwarsa" },
                  { id: "dicabut", label: "Dicabut" },
                  { id: "dikonversi_berbayar", label: "Berbayar" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setBetaFilter(f.id as any)}
                    className={`px-3 py-1 rounded-xl transition-colors ${
                      betaFilter === f.id
                        ? "bg-purple-600 text-white"
                        : "bg-card text-muted hover:text-fg border border-line"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <input
                type="text"
                value={betaSearch}
                onChange={(e) => setBetaSearch(e.target.value)}
                placeholder="Cari berdasarkan nama pemilik, nama usaha, lisensi, atau WhatsApp..."
                className="w-full bg-card border border-line rounded-2xl px-4 py-2.5 text-xs text-fg placeholder-muted outline-none focus:border-purple-500 transition-colors"
              />
              {betaSearch && (
                <button
                  type="button"
                  onClick={() => setBetaSearch("")}
                  className="absolute right-3 top-2.5 text-xs text-muted hover:text-fg font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Registration Cards */}
            {isLoadingBeta ? (
              <div className="py-12 text-center text-xs text-muted">Memuat data pendaftar beta...</div>
            ) : betaRegistrations.length === 0 ? (
              <div className="py-14 px-4 text-center space-y-2.5 bg-card/40 rounded-2xl border border-line/60">
                <div className="text-3xl">🚀</div>
                <h4 className="text-sm font-black text-fg">Belum Ada Pendaftar Closed Beta</h4>
                <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
                  Pendaftar dari form pendaftaran website akan otomatis masuk ke sini untuk Anda evaluasi dan setujui.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {betaRegistrations
                  .filter((b) => {
                    if (betaFilter !== "semua" && b.status !== betaFilter) return false;
                    if (!betaSearch.trim()) return true;
                    const q = betaSearch.toLowerCase();
                    return (
                      b.ownerName.toLowerCase().includes(q) ||
                      b.businessName.toLowerCase().includes(q) ||
                      b.whatsapp.includes(q) ||
                      (b.licenseKey && b.licenseKey.toLowerCase().includes(q))
                    );
                  })
                  .map((b) => {
                    const isPending = b.status === "pending";
                    const isApproved = b.status === "disetujui";
                    const isActive = b.status === "trial_active";
                    const isExpired = b.status === "trial_expired";
                    const isRevoked = b.status === "dicabut";
                    const isConverted = b.status === "dikonversi_berbayar";

                    let remainingText = "";
                    if (b.expiresAt) {
                      const exp = new Date(b.expiresAt).getTime();
                      const now = Date.now();
                      if (now >= exp) {
                        remainingText = "Kedaluwarsa";
                      } else {
                        const hrs = Math.floor((exp - now) / 3600000);
                        const days = Math.floor(hrs / 24);
                        remainingText = days > 0 ? `Sisa ${days} hari` : `Sisa ${hrs} jam`;
                      }
                    }

                    return (
                      <div
                        key={b.id}
                        className="bg-card p-5 rounded-2xl border border-line space-y-4 shadow-sm hover:border-purple-500/40 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-black text-sm text-fg">{b.businessName}</span>
                              <span className="text-xs text-muted">• {b.ownerName}</span>
                              
                              {/* Status Badge */}
                              <span
                                className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                  isPending
                                    ? "bg-amber-500/15 text-amber-500 border-amber-500/30"
                                    : isApproved
                                    ? "bg-sky-500/15 text-sky-500 border-sky-500/30"
                                    : isActive
                                    ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                                    : isExpired
                                    ? "bg-rose-500/15 text-rose-500 border-rose-500/30"
                                    : isConverted
                                    ? "bg-purple-500/15 text-purple-400 border-purple-500/30"
                                    : "bg-slate-500/15 text-slate-400 border-slate-500/30"
                                }`}
                              >
                                {isPending
                                  ? "Menunggu Persetujuan"
                                  : isApproved
                                  ? "Disetujui (Belum Aktif)"
                                  : isActive
                                  ? "Trial Aktif"
                                  : isExpired
                                  ? "Trial Kedaluwarsa"
                                  : isConverted
                                  ? "Berbayar Permanen"
                                  : "Dicabut"}
                              </span>
                            </div>

                            <div className="text-xs text-muted flex flex-wrap items-center gap-3">
                              <span>
                                WhatsApp:{" "}
                                <a
                                  href={`https://wa.me/${b.whatsapp.replace(/[^0-9]/g, "").startsWith("0") ? "62" + b.whatsapp.replace(/[^0-9]/g, "").slice(1) : b.whatsapp.replace(/[^0-9]/g, "")}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-purple-400 hover:underline font-mono"
                                >
                                  {b.whatsapp}
                                </a>
                              </span>
                              <span>Daftar: {new Date(b.registeredAt || (b as any).createdAt || Date.now()).toLocaleDateString("id-ID")}</span>
                            </div>
                          </div>

                          {/* Right Side License & Expiry Info */}
                          {b.licenseKey && (
                            <div className="text-left sm:text-right space-y-0.5 shrink-0">
                              <div className="font-mono font-bold text-xs text-purple-400 select-all bg-surface px-3 py-1 rounded-xl border border-line inline-block">
                                {b.licenseKey}
                              </div>
                              {remainingText && (
                                <div className="text-[11px] font-semibold text-muted">
                                  {remainingText} {b.expiresAt ? `(s.d ${new Date(b.expiresAt).toLocaleDateString("id-ID")})` : ""}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Device Info */}
                        <div className="text-[11px] bg-surface p-3 rounded-xl border border-line/60 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span>📱 Perangkat Kasir:</span>
                            {b.boundDeviceId ? (
                              <span className="font-semibold text-fg">
                                {b.deviceName || "Perangkat Kasir"} ({b.boundDeviceId.slice(0, 10)}...)
                              </span>
                            ) : (
                              <span className="text-muted italic">Belum terikat ke perangkat mana pun</span>
                            )}
                          </div>
                          {b.activatedAt && (
                            <div className="text-muted">
                              Pertama Aktif: {new Date(b.activatedAt).toLocaleDateString("id-ID")}
                            </div>
                          )}
                        </div>

                        {/* Audit Log / Notes */}
                        {b.notes && (
                          <div className="text-[10px] text-muted italic bg-card/60 px-3 py-1.5 rounded-lg border border-line/40">
                            Catatan Audit: {b.notes}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveBeta(b.registrationId || String(b.id))}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm"
                              >
                                ✅ Setujui & Terbitkan Trial
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRejectBeta(b.registrationId || String(b.id))}
                                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-rose-500/15 text-rose-400 border border-line hover:border-rose-500/30 text-xs font-bold transition-colors"
                              >
                                ❌ Tolak
                              </button>
                            </>
                          )}

                          {b.licenseKey && (
                            <button
                              type="button"
                              onClick={() => handleCopyBetaInvite(b)}
                              className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
                            >
                              <span>📲</span> Salin & Buka WA
                            </button>
                          )}

                          {!isPending && b.status !== "ditolak" && !isRevoked && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setExtendTarget(b);
                                  setExtendDays(7);
                                }}
                                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-card text-muted hover:text-fg border border-line text-xs font-bold transition-colors"
                              >
                                ⏳ Perpanjang Trial
                              </button>

                              {b.boundDeviceId && (
                                <button
                                  type="button"
                                  onClick={() => handleUnbindBeta(b.registrationId || String(b.id))}
                                  className="px-3 py-1.5 rounded-xl bg-surface hover:bg-amber-500/15 text-amber-500 border border-line hover:border-amber-500/30 text-xs font-bold transition-colors"
                                >
                                  📱 Lepas Perangkat
                                </button>
                              )}

                              {!isConverted && (
                                <button
                                  type="button"
                                  onClick={() => handleConvertBetaToPaid(b.registrationId || String(b.id))}
                                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                                >
                                  <span>💎</span> Konversi Berbayar (Rp65rb)
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleRevokeBeta(b.registrationId || String(b.id))}
                                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-rose-500/15 text-rose-500 border border-line hover:border-rose-500/30 text-xs font-bold transition-colors"
                              >
                                🚫 Cabut Akses
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* Extend Trial Modal */}
            {extendTarget && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-sm text-fg">Perpanjang Masa Trial Beta</h4>
                    <button
                      type="button"
                      onClick={() => setExtendTarget(null)}
                      className="text-muted hover:text-fg text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>
                  <p className="text-xs text-muted leading-relaxed">
                    Perpanjang akses kasir trial untuk <strong>{extendTarget.businessName}</strong> ({extendTarget.ownerName}).
                  </p>
                  <form onSubmit={handleConfirmExtend} className="space-y-3">
                    <div>
                      <label className="text-[11px] font-bold text-muted block mb-1">
                        Tambah Hari Masa Berlaku
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {[7, 14, 30].map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setExtendDays(d)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                              extendDays === d
                                ? "bg-purple-600 text-white border-purple-600"
                                : "bg-card text-muted border-line hover:text-fg"
                            }`}
                          >
                            +{d} Hari
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-muted block mb-1">
                        Alasan / Catatan Audit
                      </label>
                      <input
                        type="text"
                        value={extendReason}
                        onChange={(e) => setExtendReason(e.target.value)}
                        placeholder="Contoh: Tambahan waktu uji coba fitur laporan"
                        className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs text-fg outline-none focus:border-purple-500"
                        required
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setExtendTarget(null)}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:text-fg"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        disabled={isExtending}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                      >
                        {isExtending ? "Memproses..." : "Simpan Perpanjangan"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PELANGGAN */}
        {activeTab === "customers" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-black text-base text-fg">Direktori Pelanggan Terdaftar</h3>
              <p className="text-xs text-muted">Daftar pemilik usaha yang telah membeli lisensi SakuNota.</p>
            </div>

            {orders.filter((o) => o.status === "lunas_lisensi_terbit").length === 0 ? (
              <div className="py-14 px-4 text-center space-y-2 bg-card/40 rounded-2xl border border-line/60">
                <div className="text-3xl">👥</div>
                <p className="text-xs font-bold text-fg">Belum Ada Pelanggan Terdaftar</p>
                <p className="text-xs text-muted">Daftar pelanggan akan tercatat otomatis saat ada pesanan yang lunas.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider">
                      <th className="py-2.5 px-3">Nama Usaha & Pemilik</th>
                      <th className="py-2.5 px-3">WhatsApp</th>
                      <th className="py-2.5 px-3">Kode Lisensi</th>
                      <th className="py-2.5 px-3">Status Perangkat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {orders
                      .filter((o) => o.status === "lunas_lisensi_terbit")
                      .map((o) => (
                        <tr key={o.orderId} className="hover:bg-card/40">
                          <td className="py-3 px-3">
                            <strong className="text-fg block">{o.businessName}</strong>
                            <span className="text-muted text-[11px]">{o.buyerName}</span>
                          </td>
                          <td className="py-3 px-3">
                            <a
                              href={`https://wa.me/62${o.whatsapp.replace(/^0/, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
                            >
                              💬 {o.whatsapp}
                            </a>
                          </td>
                          <td className="py-3 px-3 font-mono font-bold text-fg select-all">
                            {o.licenseKey || "-"}
                          </td>
                          <td className="py-3 px-3">
                            {o.boundDeviceId ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
                                Terikat ({o.boundDeviceId})
                              </span>
                            ) : (
                              <span className="text-muted text-[11px]">Belum Diaktifkan</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: LISENSI & PERANGKAT (DEVICE MONITORING) */}
        {activeTab === "devices" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-6">
            <div>
              <h3 className="font-black text-base text-fg">Pemantauan Lisensi & Perangkat Aktif</h3>
              <p className="text-xs text-muted">
                Kelola ikatan perangkat pengguna. SakuNota menjaga privasi penuh: hanya status koneksi perangkat dan versi aplikasi yang dipantau saat kasir online, tanpa menarik omzet usaha.
              </p>
            </div>

            {/* Informative Migration Callout for Owner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-purple-500/30 space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-base">📱</span>
                <strong className="text-fg font-black">
                  Panduan Pindah HP: Lisensi dan Data Usaha adalah Dua Hal Berbeda
                </strong>
              </div>
              <p className="text-muted leading-relaxed">
                Ketika pedagang berganti HP, jelaskan 2 hal terpisah ini:
              </p>
              <ol className="list-decimal pl-4 space-y-1 text-muted text-[11px]">
                <li><strong>Lisensi:</strong> Hak pakai aplikasi. Owner menekan tombol <em>Lepas Perangkat</em> di bawah, lalu pedagang memasukkan lisensinya di HP baru.</li>
                <li><strong>Data Usaha:</strong> Menu, omzet, dan transaksi tersimpan lokal di IndexedDB HP lama. Pedagang harus melakukan <em>Cadangkan Data</em> di HP lama, lalu <em>Pulihkan Data</em> di HP baru.</li>
              </ol>
            </div>

            {/* Licenses List */}
            {licenses.length === 0 && orders.filter((o) => o.status === "lunas_lisensi_terbit").length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-card/40 rounded-2xl border border-line/60">
                <span className="text-3xl">📱</span>
                <p className="text-xs font-bold text-fg">Belum Ada Lisensi Komersial Terdaftar</p>
                <p className="text-xs text-muted">Lisensi komersial akan tercatat otomatis saat pesanan pembeli diverifikasi.</p>
              </div>
            ) : (
              <div className="divide-y divide-line/60">
                {(licenses.length > 0 ? licenses : orders.filter((o) => o.status === "lunas_lisensi_terbit").map((o) => ({
                  licenseKey: o.licenseKey || "",
                  orderId: o.orderId,
                  businessName: o.businessName,
                  boundDeviceId: o.boundDeviceId || null,
                  deviceName: null,
                  issuedAt: o.verifiedAt || o.createdAt,
                  activatedAt: null,
                  lastConnectedAt: o.lastSeenAt || null,
                  signature: "",
                  appVersion: "v2.6.0",
                  activeDays: 1,
                  licenseType: "berbayar" as const,
                  revoked: 0,
                }))).map((l) => {
                  const isRevoked = l.revoked === 1;
                  return (
                    <div key={l.licenseKey} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-md bg-card border border-line text-purple-600 dark:text-purple-400">
                            {l.licenseKey}
                          </span>
                          <strong className="text-sm font-black text-fg">{l.businessName}</strong>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                            isRevoked
                              ? "bg-rose-500/15 text-rose-600 border-rose-500/30"
                              : l.boundDeviceId
                              ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/30"
                              : "bg-slate-500/15 text-slate-500 border-slate-500/30"
                          }`}>
                            {isRevoked ? "Dicabut" : l.boundDeviceId ? "Aktif di Perangkat" : "Belum Diaktifkan"}
                          </span>
                        </div>

                        <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1">
                          <span>Pesanan: <strong className="font-mono">{l.orderId}</strong></span>
                          <span>Terbit: {l.issuedAt}</span>
                          <span>Versi Kasir: <strong className="font-mono">{l.appVersion || "v2.6.0"}</strong></span>
                          <span>Aktivitas: {l.activeDays || 1} Hari Aktif</span>
                          {l.lastConnectedAt && <span>Terakhir Online: {l.lastConnectedAt}</span>}
                        </div>

                        <div className="text-[11px] text-muted">
                          Status Perangkat: {l.boundDeviceId ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Terikat pada {l.deviceName || "Perangkat Kasir"} ({l.boundDeviceId})
                            </span>
                          ) : (
                            <span className="text-muted">Siap diaktifkan di HP baru</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(l.licenseKey);
                            showToast(`📋 Lisensi ${l.licenseKey} berhasil disalin!`);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-fg border border-line transition-colors"
                        >
                          Salin Lisensi
                        </button>

                        {l.boundDeviceId && !isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleUnbindCommercialDevice(l.licenseKey)}
                            className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors"
                          >
                            Lepas Perangkat
                          </button>
                        )}

                        {!isRevoked && (
                          <button
                            type="button"
                            onClick={() => handleRevokeCommercialLicense(l.licenseKey)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors"
                          >
                            Cabut
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: LISENSI TESTER (GRATIS UNTUK PENGUJIAN) */}
        {activeTab === "tester" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-fg">Penerbitan Lisensi Tester Gratis</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-500/30">
                  Uji Coba & Review
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                Terbitkan lisensi uji coba untuk rekan warung atau penguji tanpa mencatat omzet penjualan fiktif. Lisensi tester dapat dibatasi masa berlaku dan dicabut kapan saja.
              </p>
            </div>

            {/* Form Buat Lisensi Tester */}
            <form onSubmit={handleCreateTesterLicense} className="p-4 sm:p-5 rounded-2xl bg-card border border-line space-y-4">
              <h4 className="font-black text-xs text-fg uppercase tracking-wider">Form Terbitkan Lisensi Baru</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Nama Penerima / Warung *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Mas Joko (Warung Kopi Sleman)"
                    value={testerRecipient}
                    onChange={(e) => setTesterRecipient(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Nomor WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 081234567891"
                    value={testerWhatsapp}
                    onChange={(e) => setTesterWhatsapp(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Masa Berlaku *</label>
                  <select
                    value={testerDuration}
                    onChange={(e) => setTesterDuration(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg focus:border-purple-500 outline-none"
                  >
                    <option value={7}>7 Hari (Uji Coba Cepat)</option>
                    <option value={14}>14 Hari (Dua Minggu)</option>
                    <option value={30}>30 Hari (Satu Bulan Penuh)</option>
                    <option value={0}>Tanpa Batas Kedaluwarsa (Permanen Tester)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Catatan Penggunaan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Pengujian printer Bluetooth Panda 58mm"
                    value={testerNotes}
                    onChange={(e) => setTesterNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg focus:border-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={isCreatingTester}
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  <span>{isCreatingTester ? "Menerbitkan..." : "Terbitkan Lisensi Tester (Gratis) →"}</span>
                </button>
              </div>
            </form>

            {/* Tabel Daftar Lisensi Tester */}
            <div className="space-y-3">
              <h4 className="font-black text-xs text-fg uppercase tracking-wider">
                Daftar Lisensi Tester Terbit ({testerLicenses.length})
              </h4>

              {testerLicenses.length === 0 ? (
                <div className="py-10 text-center space-y-2 bg-card/40 rounded-2xl border border-line/60">
                  <span className="text-2xl">🧪</span>
                  <p className="text-xs text-muted">Belum ada lisensi tester yang diterbitkan.</p>
                </div>
              ) : (
                <div className="divide-y divide-line/60">
                  {testerLicenses.map((t) => {
                    const isExpired = t.expiresAt && new Date(t.expiresAt).getTime() < Date.now();
                    const isRevoked = t.revoked === 1;

                    return (
                      <div key={t.licenseKey} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-xs px-2 py-0.5 rounded-md bg-card border border-line text-purple-600 dark:text-purple-400">
                              {t.licenseKey}
                            </span>
                            <strong className="text-sm font-black text-fg">{t.recipientName}</strong>
                            {isRevoked ? (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px] font-black border border-rose-500/30">
                                Dicabut
                              </span>
                            ) : isExpired ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-500/30">
                                Kedaluwarsa
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-500/30">
                                Aktif ({t.durationDays === 0 ? "Permanen" : `${t.durationDays} Hari`})
                              </span>
                            )}
                          </div>

                          <div className="text-xs text-muted flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                            <span>WA: <a href={`https://wa.me/62${t.whatsapp.replace(/^0/, "")}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline">💬 {t.whatsapp}</a></span>
                            {t.expiresAt && <span>Kedaluwarsa: {new Date(t.expiresAt).toLocaleDateString("id-ID")}</span>}
                            <span>Terbit: {new Date(t.createdAt).toLocaleDateString("id-ID")}</span>
                            {t.notes && <span>Catatan: <em>{t.notes}</em></span>}
                          </div>

                          <div className="text-[11px] text-muted pt-0.5">
                            Status Perangkat: {t.boundDeviceId ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                Terikat pada {t.deviceName || "Perangkat Tester"} ({t.boundDeviceId})
                              </span>
                            ) : (
                              <span className="text-muted font-medium">Belum digunakan pada perangkat</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(t.licenseKey);
                              showToast(`📋 Lisensi ${t.licenseKey} berhasil disalin!`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-fg border border-line transition-colors"
                          >
                            Salin Lisensi
                          </button>

                          {t.boundDeviceId && !isRevoked && (
                            <button
                              type="button"
                              onClick={() => handleUnbindTester(t.licenseKey)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 transition-colors"
                            >
                              Lepas Perangkat
                            </button>
                          )}

                          {!isRevoked && (
                            <button
                              type="button"
                              onClick={() => handleRevokeTester(t.licenseKey)}
                              className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-500/30 transition-colors"
                            >
                              Cabut
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: LAPORAN MASALAH & DUKUNGAN */}
        {activeTab === "support" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-4">
            <div>
              <h3 className="font-black text-base text-fg">Pusat Bantuan & Laporan Pengguna</h3>
              <p className="text-xs text-muted">Daftar laporan kendala kasir dari pedagang.</p>
            </div>

            <div className="p-4 rounded-2xl bg-card border border-line space-y-3 text-xs">
              <span className="text-[10px] text-muted font-bold uppercase block">Kontak Bantuan Resmi:</span>
              <p className="text-muted leading-relaxed">
                Pengguna yang mengalami kendala aktivasi lisensi atau pemindahan HP dapat menghubungi WhatsApp resmi Reza.
              </p>
              <a
                href="https://wa.me/6281234567890?text=Halo%20Reza,%20saya%20butuh%20bantuan%20terkait%20lisensi%20SakuNota"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors"
              >
                <span>💬 Buka WhatsApp Bantuan Reza</span>
              </a>
            </div>
          </div>
        )}

        {/* TAB 6: PENGATURAN & PEMELIHARAAN */}
        {activeTab === "settings" && (
          <div className="bg-surface rounded-3xl border border-line shadow-sm p-5 sm:p-6 space-y-6">
            <div>
              <h3 className="font-black text-base text-fg">Pengaturan & Pemeliharaan Data</h3>
              <p className="text-xs text-muted">
                Pembersihan data pengujian aman dengan jejak audit. Transaksi asli dilindungi dari penghapusan bebas.
              </p>
            </div>

            {/* Clean Test Data Form */}
            <form onSubmit={handleDeleteTestOrder} className="p-4 sm:p-5 rounded-2xl bg-card border border-line space-y-4">
              <h4 className="font-black text-xs text-fg uppercase tracking-wider">
                Hapus Data Pengujian Teridentifikasi
              </h4>

              {deleteMessage && (
                <div className={`p-3 rounded-xl text-xs font-bold ${
                  deleteMessage.startsWith("✅") ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30" : "bg-rose-500/10 text-rose-600 border border-rose-500/30"
                }`}>
                  {deleteMessage}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Nomor Pesanan Uji *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: SN-2026-999"
                    value={deleteTargetOrderId}
                    onChange={(e) => setDeleteTargetOrderId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Catatan Audit Tindakan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Alasan: data pengujian developer"
                    value={deleteAuditNote}
                    onChange={(e) => setDeleteAuditNote(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-fg mb-1">Konfirmasi Sandi Owner *</label>
                  <input
                    type="password"
                    required
                    placeholder="Sandi Owner Reza"
                    value={deletePasswordConfirm}
                    onChange={(e) => setDeletePasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface border border-line text-xs text-fg outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isDeletingOrder}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow transition-all disabled:opacity-50"
                >
                  {isDeletingOrder ? "Memproses..." : "Hapus Data Uji Teridentifikasi"}
                </button>
              </div>
            </form>

            {/* Hidden Collapsible Maintenance Drawer (Developer Mode) */}
            <div className="border border-line rounded-2xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDevDrawer(!showDevDrawer)}
                className="w-full p-4 bg-card/60 hover:bg-card flex items-center justify-between text-xs font-bold text-muted hover:text-fg transition-colors"
              >
                <span>🔧 Developer Mode & Status Arsitektur Cloudflare D1 (Khusus Pemeliharaan)</span>
                <span>{showDevDrawer ? "▲ Tutup" : "▼ Buka"}</span>
              </button>

              {showDevDrawer && (
                <div className="p-5 bg-card/30 border-t border-line space-y-4 text-xs">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-muted font-bold block">Versi Rilis</span>
                      <strong className="font-mono text-fg text-sm">v2.6.0-stable</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-muted font-bold block">Git Commit</span>
                      <strong className="font-mono text-purple-600 text-sm">8979552</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-muted font-bold block">Engine DB</span>
                      <strong className="font-mono text-fg text-sm">Cloudflare D1: Terkoneksi & Siap</strong>
                    </div>
                    <div className="p-3 rounded-xl bg-surface border border-line">
                      <span className="text-[10px] text-muted font-bold block">Gateway</span>
                      <strong className="font-mono text-emerald-600 text-sm">Midtrans: Ready</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-muted leading-relaxed">
                    Area ini khusus pemeliharaan sistem teknis dan tidak muncul di panduan maupun antarmuka kasir pedagang.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
