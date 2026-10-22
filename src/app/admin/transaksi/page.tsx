"use client";
import WeightReturn from '@/components/WeightReturn';
import { lineTotal, quantityLabel } from '@/lib/weight';
import LineIcon from "@/components/LineIcon";

import React, { useState, useEffect, useRef } from "react";
import { useAdmin } from "../AdminContext";
import {
  getOrders,
  processVoidRefund,
  getAuditLogs,
  uploadPaymentProof,
  verifyPaymentProof,
  deletePaymentProof,
  matchBulkPaymentProofs,
  importHistoricalTransactions,
  recordPayment,
} from "@/lib/api";
import {
  exportOrdersToExcel,
  downloadHistoricalTransactionTemplate,
  parseHistoricalTransactionsFile,
} from "@/lib/excelUtils";
import { compressPaymentProof, formatBytes } from "@/lib/imageUtils";
import { generateEscPosReceipt, generateReceiptHtml, generateBulkReceiptHtml, executePrintDocument } from "@/lib/receipt";
import { App } from "@capacitor/app";

export default function AdminTransaksiPage() {
  const { storeSettings, showToast } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab: 'orders', 'voids', or 'kasbon'
  const [activeTab, setActiveTab] = useState<'orders' | 'voids' | 'kasbon'>('orders');

  // Kasbon & Buku Pelanggan States
  const [kasbonSearch, setKasbonSearch] = useState("");
  const [kasbonFilterStatus, setKasbonFilterStatus] = useState<"unpaid" | "all">("unpaid");
  const [kasbonTargetOrder, setKasbonTargetOrder] = useState<any | null>(null);
  const [kasbonPayAmount, setKasbonPayAmount] = useState("");
  const [kasbonPayMethod, setKasbonPayMethod] = useState("Cash");
  const [kasbonPayNotes, setKasbonPayNotes] = useState("");
  const [isSubmittingKasbonPay, setIsSubmittingKasbonPay] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all"); // 'all', 'today', 'month', 'custom'
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("Semua");
  const [verificationFilter, setVerificationFilter] = useState("Semua");

  // Sort & Pagination State
  const [sortBy, setSortBy] = useState<"waktu_desc" | "waktu_asc" | "total_desc" | "total_asc">("waktu_desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(15);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");

  // Selection for Bulk Actions
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);

  // Receipt / Detail Modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [zoomProofImage, setZoomProofImage] = useState<string | null>(null);

  // Void & Refund Modal
  const [voidTargetOrder, setVoidTargetOrder] = useState<any>(null);
  const [voidReason, setVoidReason] = useState("Salah input pesanan");
  const [isRefundCash, setIsRefundCash] = useState(false);
  const [voidPinInput, setVoidPinInput] = useState("");
  const [voidPinError, setVoidPinError] = useState("");

  // Modal: Import Transaksi Historis
  const [isHistoricalModalOpen, setIsHistoricalModalOpen] = useState(false);
  const [historicalFile, setHistoricalFile] = useState<File | null>(null);
  const [parsedHistorical, setParsedHistorical] = useState<any>(null);
  const [isImportingHistorical, setIsImportingHistorical] = useState(false);

  // Modal: Bulk Upload Bukti Bayar
  const [isBulkProofModalOpen, setIsBulkProofModalOpen] = useState(false);
  const [matchedProofResults, setMatchedProofResults] = useState<any[]>([]);
  const [isMatchingProofs, setIsMatchingProofs] = useState(false);
  const [isSavingBulkProofs, setIsSavingBulkProofs] = useState(false);

  // File input ref untuk upload bukti dari detail modal
  const detailProofInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingDetailProof, setIsUploadingDetailProof] = useState(false);

  const loadData = async () => {
    try {
      const [allOrders, logs] = await Promise.all([getOrders(), getAuditLogs()]);
      setOrders(allOrders);
      setAuditLogs(logs);
      // Update receiptData if open
      if (receiptData) {
        const refreshed = allOrders.find(o => o.id === receiptData.id);
        if (refreshed) setReceiptData(refreshed);
      }
    } catch (e) {
      console.error("Error loading transactions:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Back button listener
  useEffect(() => {
    let removeListener: any;
    try {
      App.addListener("backButton", () => {
        if (zoomProofImage) {
          setZoomProofImage(null);
        } else if (receiptData) {
          setReceiptData(null);
        } else if (voidTargetOrder) {
          setVoidTargetOrder(null);
        } else if (isHistoricalModalOpen) {
          setIsHistoricalModalOpen(false);
        } else if (isBulkProofModalOpen) {
          setIsBulkProofModalOpen(false);
        }
      }).then(handle => {
        removeListener = handle;
      }).catch(() => {});
    } catch (_) {}

    return () => {
      if (removeListener && removeListener.remove) {
        removeListener.remove();
      }
    };
  }, [zoomProofImage, receiptData, voidTargetOrder, isHistoricalModalOpen, isBulkProofModalOpen]);

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const oDate = (o.created_at || o.createdAt || "").split("T")[0];
    const todayStr = new Date().toISOString().split("T")[0];
    const monthStr = todayStr.substring(0, 7);

    // Tab filter
    if (activeTab === 'voids' && o.status !== 'void') return false;

    // Date filter
    if (dateFilter === 'today' && oDate !== todayStr) return false;
    if (dateFilter === 'month' && !oDate.startsWith(monthStr)) return false;
    if (dateFilter === 'custom') {
      if (customStartDate && oDate < customStartDate) return false;
      if (customEndDate && oDate > customEndDate) return false;
    }

    // Payment filter
    if (paymentFilter !== 'Semua' && o.paymentMethod !== paymentFilter) return false;

    // Verification filter
    if (verificationFilter !== 'Semua') {
      const st = o.verificationStatus || (o.paymentMethod === 'Cash' ? 'terverifikasi' : 'menunggu_bukti');
      if (st !== verificationFilter) return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toString().includes(q);
      const matchCust = (o.customerName || "").toLowerCase().includes(q);
      const matchTable = (o.tableName || "").toLowerCase().includes(q);
      return matchId || matchCust || matchTable;
    }

    return true;
  });

  // Reset pagination on filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, dateFilter, customStartDate, customEndDate, paymentFilter, verificationFilter, activeTab, sortBy, itemsPerPage]);

  const sortedOrders = [...filteredOrders].sort((a, b) => {
    if (sortBy === "waktu_asc") {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      return dateA - dateB;
    }
    if (sortBy === "total_desc") {
      return (b.total || 0) - (a.total || 0);
    }
    if (sortBy === "total_asc") {
      return (a.total || 0) - (b.total || 0);
    }
    // Default: waktu_desc
    const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
    const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  const totalPages = itemsPerPage === 0 ? 1 : Math.ceil(sortedOrders.length / itemsPerPage);
  const startIndex = itemsPerPage === 0 ? 0 : (currentPage - 1) * itemsPerPage;
  const paginatedOrders = itemsPerPage === 0 ? sortedOrders : sortedOrders.slice(startIndex, startIndex + itemsPerPage);

  // Checkbox helpers
  const handleToggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    }
  };

  const handleToggleSelectOrder = (id: number) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter(i => i !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  // Bulk Actions
  const handleBulkExport = (format: 'xlsx' | 'csv' = 'xlsx') => {
    const targetOrders = selectedOrderIds.length > 0 
      ? orders.filter(o => selectedOrderIds.includes(o.id))
      : filteredOrders;

    if (targetOrders.length === 0) {
      showToast("Tidak ada transaksi untuk diekspor", "error");
      return;
    }

    exportOrdersToExcel(targetOrders, format);
    showToast(`Berhasil mengekspor ${targetOrders.length} transaksi ke ${format.toUpperCase()}`);
  };

  const handleBulkReprint = async () => {
    if (selectedOrderIds.length === 0) {
      showToast("Pilih minimal satu nota untuk dicetak", "error");
      return;
    }

    const selectedList = orders.filter(o => selectedOrderIds.includes(o.id));
    if (selectedList.length === 1) {
      await handlePrintSingleOrder(selectedList[0], 'all');
      return;
    }

    try {
      showToast(`Menyiapkan cetak ${selectedList.length} nota...`);
      // Gabungkan ESC/POS dengan cut/feed antar struk
      const bulkEscposText = selectedList
        .map(ord => generateEscPosReceipt(ord, 'all', storeSettings))
        .join('\n\n\n\x1b\x64\x03\x1d\x56\x42\x00\n\n');
      const bulkHtmlContent = generateBulkReceiptHtml(selectedList, 'all', storeSettings);

      const result = await executePrintDocument({
        title: `Cetak_Masal_${selectedList.length}_Nota`,
        escposText: bulkEscposText,
        htmlContent: bulkHtmlContent,
        settings: storeSettings
      });

      if (result.success) {
        showToast(result.message || `Berhasil mengirim ${selectedList.length} nota ke printer.`, "success");
      }
    } catch (e: any) {
      console.error("Gagal mencetak masal nota:", e);
      alert("Gagal mencetak nota: " + (e.message || e));
    }
  };

  const handlePrintSingleOrder = async (order: any, mode: 'all' | 'food' | 'drink' = 'all') => {
    try {
      const escposText = generateEscPosReceipt(order, mode, storeSettings);
      const htmlContent = generateReceiptHtml(order, mode, storeSettings);
      const modeLabel = mode === 'food' ? 'Dapur' : mode === 'drink' ? 'Bar' : 'Nota';
      const result = await executePrintDocument({
        title: `${modeLabel}_#${order.id}`,
        escposText,
        htmlContent,
        settings: storeSettings
      });
      if (result.success) {
        showToast(result.message, "success");
      }
    } catch (e: any) {
      console.error("Gagal mencetak nota:", e);
      alert("Gagal mencetak nota: " + (e.message || e));
    }
  };

  // Single Print from modal
  const handlePrint = async (mode: 'all' | 'food' | 'drink' = 'all') => {
    if (!receiptData) return;
    await handlePrintSingleOrder(receiptData, mode);
    showToast("Perintah cetak struk dikirim");
  };

  // Void Handler
  const handleProcessVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTargetOrder) return;

    if (storeSettings.enablePin) {
      if (!storeSettings.adminPin) {
        setVoidPinError("PIN Admin belum dikonfigurasi. Harap konfigurasi PIN di Pengaturan Keamanan.");
        return;
      }
      if (voidPinInput !== storeSettings.adminPin) {
        setVoidPinError("PIN Admin salah! Harap periksa kembali.");
        return;
      }
    }

    try {
      await processVoidRefund(voidTargetOrder.id, {
        reason: voidReason,
        isRefunded: isRefundCash,
        refundAmount: isRefundCash ? (voidTargetOrder.paidAmount ?? voidTargetOrder.total - (voidTargetOrder.weightRefundAmount ?? 0)) : 0,
        refundMethod: isRefundCash ? "Tunai" : voidTargetOrder.paymentMethod,
        operator: "Admin",
      });

      showToast(`Nota #${voidTargetOrder.id} berhasil di-VOID`);
      setVoidTargetOrder(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal membatalkan nota: " + err.message);
    }
  };

  // Verifikasi Bukti Bayar
  const handleVerifyProof = async (proofId: number) => {
    try {
      await verifyPaymentProof(proofId, { operator: "Admin" });
      showToast("Bukti pembayaran berhasil DIVERIFIKASI ");
      await loadData();
    } catch (err: any) {
      alert("Gagal memverifikasi: " + err.message);
    }
  };

  // Hapus Bukti Bayar
  const handleDeleteProof = async (proofId: number) => {
    if (!confirm("Hapus bukti pembayaran ini? Status nota akan kembali ke Menunggu Bukti.")) return;
    try {
      await deletePaymentProof(proofId, { operator: "Admin", reason: "Dihapus manual oleh Admin" });
      showToast("Bukti pembayaran berhasil dihapus");
      await loadData();
    } catch (err: any) {
      alert("Gagal menghapus bukti: " + err.message);
    }
  };

  // Upload Bukti Bayar dari Modal Detail
  const handleUploadProofFromDetail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !receiptData) return;

    setIsUploadingDetailProof(true);
    try {
      const processed = await compressPaymentProof(file);
      // Temukan payment yang relevan
      const payment = (receiptData.payments || []).find((p: any) => p.paymentMethod !== 'Cash') || { id: receiptData.id };
      await uploadPaymentProof({
        paymentId: payment.id || receiptData.id,
        orderId: receiptData.id,
        imageData: processed.base64,
        fileName: processed.fileName,
        fileSize: processed.fileSize,
        mimeType: processed.mimeType,
        operator: "Admin",
      });

      showToast("Bukti pembayaran berhasil diunggah");
      await loadData();
    } catch (err: any) {
      alert("Gagal mengunggah bukti: " + err.message);
    } finally {
      setIsUploadingDetailProof(false);
      e.target.value = "";
    }
  };

  // Parser File Transaksi Historis
  const handleHistoricalFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHistoricalFile(file);

    try {
      const parsed = await parseHistoricalTransactionsFile(file);
      setParsedHistorical(parsed);
    } catch (err: any) {
      alert("Format file transaksi historis tidak valid: " + err.message);
      setHistoricalFile(null);
      setParsedHistorical(null);
    }
  };

  const handleConfirmHistoricalImport = async () => {
    if (!parsedHistorical || !parsedHistorical.validTransactions.length) return;
    setIsImportingHistorical(true);

    try {
      const res = await importHistoricalTransactions(parsedHistorical.validTransactions);
      showToast(`Berhasil mengimpor ${res.importedCount} transaksi historis`);
      setIsHistoricalModalOpen(false);
      setHistoricalFile(null);
      setParsedHistorical(null);
      await loadData();
    } catch (err: any) {
      alert("Gagal mengimpor transaksi historis: " + err.message);
    } finally {
      setIsImportingHistorical(false);
    }
  };

  // Bulk Upload Bukti Bayar
  const handleBulkProofFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsMatchingProofs(true);
    try {
      const processedList = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        try {
          const comp = await compressPaymentProof(file);
          processedList.push(comp);
        } catch (compErr) {
          console.warn("Lewati file gagal kompres:", file.name, compErr);
        }
      }

      const matches = await matchBulkPaymentProofs(processedList);
      setMatchedProofResults(matches);
    } catch (err: any) {
      alert("Gagal memproses file bukti: " + err.message);
    } finally {
      setIsMatchingProofs(false);
      e.target.value = "";
    }
  };

  const handleConfirmBulkProofs = async () => {
    const matchedOnly = matchedProofResults.filter(m => m.matched && m.payment);
    if (matchedOnly.length === 0) {
      showToast("Tidak ada bukti yang cocok untuk disimpan", "error");
      return;
    }

    setIsSavingBulkProofs(true);
    let successCount = 0;

    try {
      for (const m of matchedOnly) {
        await uploadPaymentProof({
          paymentId: m.payment.id,
          orderId: m.payment.orderId || m.order.id,
          imageData: m.file.imageData,
          fileName: m.file.fileName,
          fileSize: m.file.fileSize,
          mimeType: m.file.mimeType,
          operator: "Admin (Bulk)",
          notes: m.reason
        });
        successCount++;
      }

      showToast(`Berhasil menyimpan ${successCount} bukti pembayaran!`);
      setIsBulkProofModalOpen(false);
      setMatchedProofResults([]);
      await loadData();
    } catch (err: any) {
      alert("Sebagian bukti gagal disimpan: " + err.message);
    } finally {
      setIsSavingBulkProofs(false);
    }
  };

  // --- KASBON & BUKU PELANGGAN DATA PROCESSING ---
  const kasbonData = React.useMemo(() => {
    const map = new Map<string, {
      key: string;
      customerName: string;
      customerPhone: string;
      orders: any[];
      totalDebt: number;
      totalPaid: number;
      remainingBalance: number;
    }>();

    let totalGlobalRemaining = 0;
    let totalGlobalPaid = 0;
    let totalUnpaidOrdersCount = 0;

    orders.forEach((o) => {
      if (o.status === "void") return;
      const remaining = o.remainingBalance !== undefined ? o.remainingBalance : (o.status === "unpaid" ? o.total : 0);
      const paid = o.paidAmount !== undefined ? o.paidAmount : (o.status === "paid" ? o.total : 0);
      const isUnpaid = o.status === "unpaid" || remaining > 0;

      if (isUnpaid) {
        totalGlobalRemaining += remaining;
        totalGlobalPaid += paid;
        totalUnpaidOrdersCount++;
      }

      if (!isUnpaid && kasbonFilterStatus === "unpaid") return;

      const rawName = (o.customerName || "Pelanggan").trim();
      const rawPhone = (o.customerPhone || "").trim();
      const groupKey = `${rawName.toLowerCase()}___${rawPhone}`;

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          customerName: rawName,
          customerPhone: rawPhone,
          orders: [],
          totalDebt: 0,
          totalPaid: 0,
          remainingBalance: 0,
        });
      }

      const group = map.get(groupKey)!;
      group.orders.push(o);
      group.totalDebt += o.total || 0;
      group.totalPaid += paid;
      group.remainingBalance += remaining;
    });

    const customers = Array.from(map.values())
      .filter((g) => {
        if (!kasbonSearch.trim()) return true;
        const q = kasbonSearch.toLowerCase();
        return (
          g.customerName.toLowerCase().includes(q) ||
          g.customerPhone.includes(q) ||
          g.orders.some((o) => o.id.toString().includes(q))
        );
      })
      .sort((a, b) => b.remainingBalance - a.remainingBalance);

    const debtorsCount = Array.from(map.values()).filter((g) => g.remainingBalance > 0).length;

    return {
      customers,
      totalGlobalRemaining,
      totalGlobalPaid,
      totalUnpaidOrdersCount,
      debtorsCount,
    };
  }, [orders, kasbonFilterStatus, kasbonSearch]);

  const handleOpenKasbonPayModal = (order: any) => {
    const remaining = order.remainingBalance !== undefined
      ? order.remainingBalance
      : (order.status === "unpaid" ? order.total : 0);
    setKasbonTargetOrder(order);
    setKasbonPayAmount(String(remaining > 0 ? remaining : order.total || 0));
    setKasbonPayMethod("Cash");
    setKasbonPayNotes("");
  };

  const handleProcessKasbonPay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!kasbonTargetOrder) return;
    const amt = Number(kasbonPayAmount) || 0;
    if (amt <= 0) {
      alert("Nominal pembayaran harus lebih dari Rp 0!");
      return;
    }
    const currentRemaining = kasbonTargetOrder.remainingBalance !== undefined
      ? kasbonTargetOrder.remainingBalance
      : (kasbonTargetOrder.status === "unpaid" ? kasbonTargetOrder.total : 0);
    if (amt > currentRemaining) {
      alert(`Nominal pembayaran (Rp ${amt.toLocaleString("id-ID")}) melebihi sisa tagihan (Rp ${currentRemaining.toLocaleString("id-ID")})`);
      return;
    }

    setIsSubmittingKasbonPay(true);
    try {
      await recordPayment({
        orderId: kasbonTargetOrder.id,
        amount: amt,
        paymentMethod: kasbonPayMethod as any,
        splitType: 'partial',
        operatorName: "Admin",
        notes: kasbonPayNotes.trim() || (amt >= currentRemaining ? "Pelunasan Kasbon" : "Cicilan Kasbon"),
      });

      showToast(`Pembayaran kasbon Rp ${amt.toLocaleString("id-ID")} berhasil disimpan!`, "success");
      setKasbonTargetOrder(null);
      setKasbonPayAmount("");
      setKasbonPayNotes("");
      await loadData();
    } catch (err: any) {
      alert("Gagal mencatat pembayaran kasbon: " + (err.message || err));
    } finally {
      setIsSubmittingKasbonPay(false);
    }
  };

  const getWhatsAppReminderUrl = (customer: { customerName: string; customerPhone: string; remainingBalance: number; orders: any[] }) => {
    if (!customer.customerPhone) return null;
    let cleanPhone = customer.customerPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    }
    const storeName = storeSettings.storeName || "SakuNota";
    const unpaidOrders = customer.orders.filter((o) => (o.remainingBalance ?? (o.status === "unpaid" ? o.total : 0)) > 0);
    const orderLines = unpaidOrders.map((o) => {
      const sisa = o.remainingBalance ?? (o.status === "unpaid" ? o.total : 0);
      return `• Nota #${o.id}: Rp ${sisa.toLocaleString("id-ID")}`;
    }).join("\n");

    const msg = `Halo Kak *${customer.customerName}*,\n\nIni rincian catatan kasbon di *${storeName}*:\n${orderLines}\n\n*Total Sisa Tagihan: Rp ${customer.remainingBalance.toLocaleString("id-ID")}*.\n\nTerima kasih atas kerja samanya.`;
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* --- TOP BAR & ACTION TOOLS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-3xl border border-line shadow-sm">
        <div>
          <h2 className="text-lg font-black text-fg flex items-center gap-2">
            
            <span>Riwayat Transaksi & Pembatalan</span>
          </h2>
          <p className="text-xs text-muted mt-0.5">
            Daftar seluruh nota penjualan, verifikasi bukti bayar QRIS/Transfer, dan audit void.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tab Filter */}
          <div className=" bg-card p-1 rounded-2xl flex items-center text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                activeTab === 'orders'
                  ? " bg-line text-fg shadow-sm font-black"
                  : " text-muted"
              }`}
            >
              Semua Nota ({orders.filter(o => o.status !== 'void').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('voids')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'voids'
                  ? "bg-rose-600 text-white shadow-sm font-black"
                  : " text-rose-700"
              }`}
            >
              <span>Void & Refund</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-900 text-rose-700 text-[10px]">
                {orders.filter(o => o.status === 'void').length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('kasbon')}
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === 'kasbon'
                  ? "bg-amber-600 text-white shadow-sm font-black"
                  : "text-amber-700 hover:text-amber-800"
              }`}
            >
              <span>Buku Kasbon</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                activeTab === 'kasbon' ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-900"
              }`}>
                {kasbonData.debtorsCount}
              </span>
            </button>
          </div>

          {/* Export & Import Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkExport('xlsx')}
              className="px-3 py-2 bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <span><LineIcon name="export" /></span>
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoricalModalOpen(true)}
              className="px-3 py-2 bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <span><LineIcon name="import" /></span>
              <span>Import Historis</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkProofModalOpen(true)}
              className="px-3 py-2 bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <span><LineIcon name="camera" /></span>
              <span>Bulk Bukti Bayar</span>
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'kasbon' ? (
        /* --- BUKU KASBON & PELANGGAN VIEW --- */
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-muted block uppercase tracking-wider">
                Total Piutang Belum Lunas
              </span>
              <span className="text-2xl font-black text-rose-700 block">
                Rp {kasbonData.totalGlobalRemaining.toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] text-muted block">
                Dari {kasbonData.totalUnpaidOrdersCount} nota belum lunas
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-muted block uppercase tracking-wider">
                Pelanggan Kasbon Aktif
              </span>
              <span className="text-2xl font-black text-amber-600 block">
                {kasbonData.debtorsCount} Orang
              </span>
              <span className="text-[11px] text-muted block">
                Pelanggan yang masih memiliki sisa tagihan
              </span>
            </div>

            <div className="p-4 rounded-3xl bg-surface border border-line shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-muted block uppercase tracking-wider">
                Total Cicilan Masuk
              </span>
              <span className="text-2xl font-black text-emerald-700 block">
                Rp {kasbonData.totalGlobalPaid.toLocaleString("id-ID")}
              </span>
              <span className="text-[11px] text-muted block">
                Akumulasi cicilan & DP yang telah dibayar
              </span>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-3xl bg-surface border border-line shadow-sm">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs">
                <LineIcon name="search" className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={kasbonSearch}
                onChange={(e) => setKasbonSearch(e.target.value)}
                placeholder="Cari nama pelanggan, nomor WhatsApp, atau ID nota..."
                className="w-full pl-9 pr-3 py-2.5 bg-card border border-line rounded-xl text-xs text-fg outline-none focus:border-accent font-semibold"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setKasbonFilterStatus("unpaid")}
                className={`px-3 py-2 rounded-xl transition-all ${
                  kasbonFilterStatus === "unpaid"
                    ? "bg-amber-600 text-white shadow-sm font-black"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Belum Lunas ({kasbonData.debtorsCount})
              </button>
              <button
                type="button"
                onClick={() => setKasbonFilterStatus("all")}
                className={`px-3 py-2 rounded-xl transition-all ${
                  kasbonFilterStatus === "all"
                    ? "bg-fg text-surface shadow-sm font-black"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Semua Riwayat ({kasbonData.customers.length})
              </button>
            </div>
          </div>

          {/* Customer Group Cards */}
          {kasbonData.customers.length === 0 ? (
            <div className="p-12 text-center bg-surface rounded-3xl border border-line space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <LineIcon name="success" className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-fg">Tidak ada catatan kasbon yang cocok</h4>
              <p className="text-xs text-muted">
                {kasbonFilterStatus === "unpaid"
                  ? "Semua kasbon pelanggan telah lunas atau belum ada transaksi kasbon yang tercatat."
                  : "Belum ada riwayat pelanggan yang sesuai dengan pencarian Anda."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {kasbonData.customers.map((customer) => {
                const isPaidOff = customer.remainingBalance <= 0;
                const waUrl = getWhatsAppReminderUrl(customer);

                return (
                  <div
                    key={customer.key}
                    className="p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-4 hover:border-accent/40 transition-all"
                  >
                    {/* Customer Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black shrink-0 ${
                          isPaidOff
                            ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                            : "bg-amber-100 text-amber-900 border border-amber-300"
                        }`}>
                          {customer.customerName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-base text-fg">
                              {customer.customerName}
                            </span>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                isPaidOff
                                  ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                  : "bg-rose-100 text-rose-900 border border-rose-300"
                              }`}
                            >
                              {isPaidOff ? "LUNAS" : "BELUM LUNAS"}
                            </span>
                          </div>
                          <span className="text-xs text-muted block mt-0.5">
                            {customer.customerPhone ? (
                              <span className="font-mono">{customer.customerPhone}</span>
                            ) : (
                              "Nomor HP belum diisi"
                            )}{" "}
                            • {customer.orders.length} Transaksi
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] text-muted block font-semibold">
                            Sisa Tagihan (Piutang)
                          </span>
                          <span className={`text-base font-black ${isPaidOff ? "text-emerald-700" : "text-rose-700"}`}>
                            Rp {customer.remainingBalance.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[10px] text-muted block">
                            Dari Total: Rp {customer.totalDebt.toLocaleString("id-ID")}
                          </span>
                        </div>

                        {waUrl && !isPaidOff && (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
                            title="Kirim rincian tagihan via WhatsApp"
                          >
                            <LineIcon name="info" className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Kirim WA</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Orders Breakdown */}
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-muted block">
                        Daftar Nota Pembelian:
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {customer.orders.map((o) => {
                          const orderRemaining = o.remainingBalance !== undefined
                            ? o.remainingBalance
                            : (o.status === "unpaid" ? o.total : 0);
                          const isOrderPaid = orderRemaining <= 0;

                          return (
                            <div
                              key={o.id}
                              className="p-3 rounded-2xl bg-card/50 border border-line space-y-2 text-xs"
                            >
                              <div className="flex items-center justify-between pb-1.5 border-b border-line">
                                <div>
                                  <span className="font-black text-fg">Nota #{o.id}</span>
                                  <span className="text-[10px] text-muted ml-2">
                                    {new Date(o.createdAt || o.created_at).toLocaleString("id-ID", {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    isOrderPaid
                                      ? "bg-emerald-100 text-emerald-900"
                                      : "bg-amber-100 text-amber-900"
                                  }`}
                                >
                                  {isOrderPaid ? "Lunas" : "Sisa Tagihan"}
                                </span>
                              </div>

                              {o.notes && (
                                <p className="text-[10px] text-muted italic">
                                  Catatan: {o.notes}
                                </p>
                              )}

                              <div className="flex items-center justify-between pt-1">
                                <div>
                                  <span className="text-[10px] text-muted block">Total / Sisa:</span>
                                  <span className="font-bold text-fg">
                                    Rp {(o.total || 0).toLocaleString("id-ID")}{" "}
                                    <span className="font-normal text-muted">/</span>{" "}
                                    <strong className={orderRemaining > 0 ? "text-rose-700" : "text-emerald-700"}>
                                      Rp {orderRemaining.toLocaleString("id-ID")}
                                    </strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setReceiptData(o)}
                                    className="px-2.5 py-1.5 bg-card hover:bg-line text-muted hover:text-fg rounded-xl text-xs font-semibold transition-colors"
                                  >
                                    Struk
                                  </button>
                                  {!isOrderPaid && (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenKasbonPayModal(o)}
                                      className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 flex items-center gap-1"
                                    >
                                      <span>+ Bayar / Cicil</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* --- FILTER & SEARCH BAR --- */}
          <div className=" bg-surface p-4 rounded-3xl border border-line shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs"><LineIcon name="info" /></span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari No. Nota, Tamu, Meja..."
              className="w-full pl-9 pr-3 py-2.5 bg-card border border-line rounded-xl text-xs text-fg outline-none focus:border-accent font-semibold"
            />
          </div>

          {/* Date Filter */}
          <div>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-fg outline-none"
            >
              <option value="all"> Semua Waktu</option>
              <option value="today"> Hari Ini</option>
              <option value="month"> Bulan Ini</option>
              <option value="custom"> Rentang Tanggal Khusus</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-fg outline-none"
            >
              <option value="Semua"> Semua Pembayaran</option>
              <option value="Cash"> Tunai (Cash)</option>
              <option value="QRIS"> QRIS</option>
              <option value="Transfer"> Transfer Bank</option>
              <option value="Kasbon"> Kasbon / Piutang</option>
            </select>
          </div>

          {/* Verification Status Filter */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-fg outline-none"
            >
              <option value="Semua"> Semua Status Verifikasi</option>
              <option value="terverifikasi">Terverifikasi</option>
              <option value="menunggu_verifikasi"> Menunggu Verifikasi</option>
              <option value="menunggu_bukti"> Menunggu Bukti</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-fg outline-none"
            >
              <option value="waktu_desc"> Waktu (Terbaru)</option>
              <option value="waktu_asc"> Waktu (Terlama)</option>
              <option value="total_desc"> Total (Tertinggi)</option>
              <option value="total_asc"> Total (Terendah)</option>
            </select>
          </div>

          {/* Items Per Page */}
          <div>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-fg outline-none"
            >
              <option value={15}> 15 Nota / Hal</option>
              <option value={30}> 30 Nota / Hal</option>
              <option value={50}> 50 Nota / Hal</option>
              <option value={0}> Tampilkan Semua</option>
            </select>
          </div>
        </div>

        {/* Custom Date Range Inputs */}
        {dateFilter === "custom" && (
          <div className="flex items-center gap-2 pt-2 border-t border-line">
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="py-1.5 px-3 bg-card border border-line rounded-xl text-xs font-semibold"
            />
            <span className="text-xs text-muted">s/d</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="py-1.5 px-3 bg-card border border-line rounded-xl text-xs font-semibold"
            />
          </div>
        )}
      </div>

      {/* --- STICKY BULK ACTION BAR JIKA ADA NOTA TERPILIH --- */}
      {selectedOrderIds.length > 0 && (
        <div className="sticky top-16 z-20 bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200 border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center font-black text-xs text-white">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-black text-white">Nota Terpilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkReprint}
              className="px-3 py-1.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span className="text-white"><LineIcon name="printer" /></span>
              <span>Cetak Terpilih</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkExport('xlsx')}
              className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <span className="text-white"><LineIcon name="export" /></span>
              <span>Export (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white border border-slate-500 rounded-xl text-xs font-bold transition-colors shadow-xs"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* --- TABLE / CARD LIST TRANSAKSI --- */}
      {isLoading ? (
        <div className="p-12 text-center text-muted text-xs">Memuat daftar transaksi...</div>
      ) : filteredOrders.length === 0 ? (
        <div className=" bg-surface rounded-3xl p-12 text-center border border-line">
          <span className="text-4xl block mb-2"><LineIcon name="info" /></span>
          <p className="text-sm font-bold text-fg">Tidak ada nota ditemukan</p>
          <p className="text-xs text-muted mt-1">Coba sesuaikan filter pencarian atau rentang tanggal Anda.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Header Row untuk Select All & View Switcher */}
          <div className="px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted font-bold bg-card/40 rounded-2xl border border-line">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 accent-accent-text rounded"
                />
                <span>Pilih Semua ({filteredOrders.length} Nota)</span>
              </label>
              <span className="hidden sm:inline">Total: <strong className="text-fg">Rp {filteredOrders.filter(o => o.status !== 'void').reduce((s, o) => s + (o.total || 0), 0).toLocaleString('id-ID')}</strong></span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-3">
              <span className="sm:hidden">Total: <strong className="text-fg">Rp {filteredOrders.filter(o => o.status !== 'void').reduce((s, o) => s + (o.total || 0), 0).toLocaleString('id-ID')}</strong></span>
              
              {/* View Mode Toggle: Table vs Card */}
              <div className="flex bg-surface rounded-xl p-0.5 border border-line shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode("table")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === "table" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg"
                  }`}
                >
                  <span><LineIcon name="receipt" /></span>
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === "card" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg"
                  }`}
                >
                  <span><LineIcon name="catalog" /></span>
                  <span>Kartu</span>
                </button>
              </div>
            </div>
          </div>

          {viewMode === "table" ? (
            /* Structured Desktop Transactions Table */
            <div className="overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
              <table className="w-full text-left text-xs border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-line bg-card/60 text-muted font-bold">
                    <th className="py-3.5 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 accent-accent-text rounded cursor-pointer"
                      />
                    </th>
                    <th className="py-3.5 px-3">No. Nota & Waktu</th>
                    <th className="py-3.5 px-3">Tamu / Meja</th>
                    <th className="py-3.5 px-3">Metode</th>
                    <th className="py-3.5 px-3">Bukti Bayar</th>
                    <th className="py-3.5 px-3">Total Tagihan</th>
                    <th className="py-3.5 px-3">Status</th>
                    <th className="py-3.5 px-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {paginatedOrders.map((order) => {
                    const isVoid = order.status === "void";
                    const dateDisplay = new Date(order.createdAt).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    });
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isNonCash = order.paymentMethod === "QRIS" || order.paymentMethod === "Transfer";
                    const vStatus = order.verificationStatus || (isNonCash ? (order.proofs?.length > 0 ? "menunggu_verifikasi" : "menunggu_bukti") : "terverifikasi");
                    const hasProof = order.proofs && order.proofs.length > 0;

                    return (
                      <tr
                        key={order.id}
                        className={`transition-colors cursor-pointer select-none ${
                          isSelected
                            ? "bg-accent/15"
                            : isVoid
                            ? "bg-rose-500/5 hover:bg-rose-500/10"
                            : "hover:bg-card/50"
                        }`}
                        onClick={() => setReceiptData(order)}
                      >
                        <td className="py-3.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOrder(order.id)}
                            className="w-4 h-4 accent-accent-text rounded cursor-pointer"
                          />
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-fg">#{order.id}</span>
                            {order.isHistorical && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-accent/20 text-accent-text">
                                Historis
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted block mt-0.5">{dateDisplay}</span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="font-bold text-fg block truncate"><LineIcon name="info" />{order.customerName || "Tamu"}
                          </span>
                          <span className="text-[10px] text-muted block mt-0.5">
                            {order.tableName || (order.tableId ? `Meja ${order.tableId}` : order.orderType || "Takeaway")}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-lg bg-card border border-line text-[11px] font-bold text-fg inline-block shadow-2xs">
                            {order.paymentMethod || "Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3" onClick={(e) => e.stopPropagation()}>
                          {isNonCash ? (
                            <div className="flex items-center gap-2">
                              {hasProof ? (
                                <button
                                  type="button"
                                  onClick={() => setZoomProofImage(order.proofs[0].imageData)}
                                  className="w-8 h-8 rounded-lg overflow-hidden border border-line shrink-0 bg-card hover:scale-105 transition-transform"
                                  title="Lihat foto bukti transfer"
                                >
                                  <img
                                    src={order.proofs[0].imageData}
                                    alt="Bukti"
                                    className="w-full h-full object-cover"
                                  />
                                </button>
                              ) : null}
                              <span
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                                  vStatus === "terverifikasi"
                                    ? "bg-blue-100 text-blue-900 border-blue-200"
                                    : vStatus === "menunggu_verifikasi"
                                    ? "bg-amber-100 text-amber-950 border-amber-300 animate-pulse"
                                    : "bg-rose-50 text-rose-700 border-rose-200"
                                }`}
                              >
                                <span><LineIcon name={vStatus === "terverifikasi" ? "success" : vStatus === "menunggu_verifikasi" ? "waiting" : "warning"} /></span>
                                <span>
                                  {vStatus === "terverifikasi"
                                    ? "Terverifikasi"
                                    : vStatus === "menunggu_verifikasi"
                                    ? "Perlu Cek"
                                    : "Tanpa Bukti"}
                                </span>
                              </span>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className={`font-black text-sm block ${isVoid ? "line-through text-muted" : "text-fg"}`}>
                            Rp {(order.total || 0).toLocaleString("id-ID")}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block border ${
                              isVoid
                                ? "bg-rose-50 text-rose-700 border-rose-200 line-through"
                                : order.status === "paid"
                                ? "bg-blue-100 text-blue-900 border-blue-200"
                                : "bg-amber-100 text-amber-950 border-amber-300"
                            }`}
                          >
                            {isVoid ? "VOID" : order.status === "paid" ? "LUNAS" : "OPEN BILL"}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setReceiptData(order)}
                              className="px-2.5 py-1.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                              title="Lihat detail & cetak ulang"
                            >
                              <span><LineIcon name="search" /></span>
                              <span>Rincian</span>
                            </button>

                            {!isVoid && (
                              <button
                                type="button"
                                onClick={() => {
                                  setVoidTargetOrder(order);
                                  setVoidReason("Salah input pesanan");
                                  setIsRefundCash(order.paymentMethod === "Cash");
                                  setVoidPinInput("");
                                  setVoidPinError("");
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors shadow-sm"
                                title="Batalkan nota (Void)"
                              >
                                Void
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            /* Card View */
            paginatedOrders.map((order) => {
              const isVoid = order.status === "void";
              const dateDisplay = new Date(order.createdAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              });
              const isSelected = selectedOrderIds.includes(order.id);
              const isNonCash = order.paymentMethod === "QRIS" || order.paymentMethod === "Transfer";
              const vStatus = order.verificationStatus || (isNonCash ? (order.proofs?.length > 0 ? "menunggu_verifikasi" : "menunggu_bukti") : "terverifikasi");

              return (
                <div
                  key={order.id}
                  className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isVoid
                      ? " border-rose-200 bg-rose-500/10"
                      : isSelected
                      ? "border-accent ring-2 ring-accent/20"
                      : " border-line hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOrder(order.id)}
                      className="w-4 h-4 mt-1 accent-accent-text rounded cursor-pointer"
                    />

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-black text-sm text-fg">
                          Nota #{order.id}
                        </span>

                        {/* Status Lunas / Void */}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            isVoid
                              ? " bg-rose-50 text-rose-700 border border-rose-200 line-through"
                              : order.status === "paid"
                              ? " bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : " bg-amber-50 text-amber-950 border border-amber-300"
                          }`}
                        >
                          {isVoid ? "VOID" : order.status === "paid" ? "LUNAS" : "OPEN BILL"}
                        </span>

                        {/* Status Verifikasi Bukti Pembayaran */}
                        {isNonCash && !isVoid && (
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              vStatus === "terverifikasi"
                                ? " bg-blue-50 text-blue-900 border border-blue-200"
                                : vStatus === "menunggu_verifikasi"
                                ? " bg-amber-50 text-amber-950 border border-amber-300 animate-pulse"
                                : " bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            <span><LineIcon name={vStatus === "terverifikasi" ? "success" : vStatus === "menunggu_verifikasi" ? "waiting" : "warning"} /></span>
                            <span>
                              {vStatus === "terverifikasi"
                                ? "Terverifikasi"
                                : vStatus === "menunggu_verifikasi"
                                ? "Menunggu Verifikasi"
                                : "Menunggu Bukti"}
                            </span>
                          </span>
                        )}

                        {order.isHistorical && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                            Migrasi Historis
                          </span>
                        )}

                        <span className="text-[10px] text-muted">{dateDisplay}</span>
                      </div>

                      <p className="text-xs text-muted">
                        {order.tableName || (order.tableId ? `Meja ${order.tableId}` : order.orderType || "Takeaway")} • Tamu: <strong className=" text-fg">{order.customerName || "Tamu"}</strong>
                      </p>

                      {isVoid && order.voidReason && (
                        <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg">
                          <span className="font-bold">Alasan Batal:</span> {order.voidReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-line">
                    <div className="text-left sm:text-right">
                      <span className={`text-base font-black ${isVoid ? "line-through text-muted" : " text-fg"}`}>
                        Rp {(order.total || 0).toLocaleString("id-ID")}
                      </span>
                      <span className="text-[10px] text-muted block font-semibold">
                        {order.paymentMethod || "Cash"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setReceiptData(order)}
                        className="px-3 py-2 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                      >
                        <span><LineIcon name="search" /></span>
                        <span>Rincian & Bukti</span>
                      </button>

                      {!isVoid && (
                        <button
                          type="button"
                          onClick={() => {
                            setVoidTargetOrder(order);
                            setVoidReason("Salah input pesanan");
                            setIsRefundCash(order.paymentMethod === "Cash");
                            setVoidPinInput("");
                            setVoidPinError("");
                          }}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors"
                        >
                          Void
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination Navigation Bar */}
          {itemsPerPage > 0 && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-line text-xs">
              <span className=" text-muted font-semibold">
                Menampilkan {Math.min(startIndex + 1, sortedOrders.length)} - {Math.min(startIndex + itemsPerPage, sortedOrders.length)} dari {sortedOrders.length} nota
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-xl bg-card border border-line disabled:opacity-40 font-bold text-fg hover:border-accent hover:text-accent-text transition-all active:scale-95"
                >
                  ← Sebelumnya
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                  .map((p, idx, arr) => {
                    const prev = arr[idx - 1];
                    return (
                      <React.Fragment key={p}>
                        {prev && p - prev > 1 && (
                          <span className="px-1 text-muted">...</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setCurrentPage(p)}
                          className={`w-8 h-8 rounded-xl font-black text-xs transition-all ${
                            currentPage === p
                              ? "bg-accent text-white shadow-md shadow-accent/20"
                              : " bg-card border border-line text-fg hover:border-accent hover:text-accent-text"
                          }`}
                        >
                          {p}
                        </button>
                      </React.Fragment>
                    );
                  })}

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-xl bg-card border border-line disabled:opacity-40 font-bold text-fg hover:border-accent hover:text-accent-text transition-all active:scale-95"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )}

      {/* --- RECEIPT & DETAIL BUKTI PEMBAYARAN MODAL --- */}
      {receiptData && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setReceiptData(null)}
        >
          <div
            className=" bg-surface rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-line max-h-[92vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <h3 className="font-black text-sm text-fg flex items-center gap-2">
                <span>Rincian Transaksi Nota #{receiptData.id}</span>
                {receiptData.status === "void" && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700">VOID</span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg text-xs font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {/* Thermal Slip Simulation */}
              <div className="font-mono text-[11px] leading-tight space-y-2 bg-card/40 p-3.5 rounded-2xl border border-line">
                <div className="text-center font-bold text-xs pb-1 border-b border-dashed border-line">
                  {storeSettings.storeName || "SakuNota"}
                </div>
                <div className="text-muted text-[10px]">
                  Nota: #{receiptData.id} • {receiptData.tableName || receiptData.orderType}
                </div>
                <div className="text-muted text-[10px]">
                  Tamu: {receiptData.customerName || "Tamu"} • {new Date(receiptData.createdAt).toLocaleString("id-ID")}
                </div>
                <div className="border-b border-dashed border-line pb-1" />

                <div className="space-y-1">
                  {(receiptData.items || []).map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span>{quantityLabel(it)} {it.nama || it.namaMenu}{it.refundedQty > 0 && <small className="block text-muted">Dikembalikan {quantityLabel(it, it.refundedQty)}</small>}</span>
                      <span>Rp {lineTotal(it).toLocaleString('id-ID')}</span>
                    </div>
                  ))}
                </div>

                <div className="border-b border-dashed border-line pt-1" />
                <div className="flex justify-between font-bold text-xs pt-1">
                  <span>TOTAL:</span>
                  <span>Rp {(receiptData.total || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-[10px] text-muted">
                  <span>Metode:</span>
                  <span>{receiptData.paymentMethod || "Cash"}</span>
                </div>
              </div>

              {receiptData.weightRefundAmount > 0 && <p className="text-sm">Pengembalian: Rp{receiptData.weightRefundAmount.toLocaleString('id-ID')}</p>}
              <WeightReturn key={receiptData.id} order={receiptData} onSaved={loadData} />
              {/* SEKSI BUKTI PEMBAYARAN (QRIS / TRANSFER) */}
              {(receiptData.paymentMethod === "QRIS" || receiptData.paymentMethod === "Transfer" || receiptData.proofs?.length > 0) && (
                <div className="p-3.5 bg-card/60 rounded-2xl border border-line space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-fg flex items-center gap-1.5">
                      
                      <span>Bukti Pembayaran ({receiptData.paymentMethod})</span>
                    </h4>

                    {receiptData.proofs && receiptData.proofs.length > 0 ? (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        receiptData.proofs[0].status === 'terverifikasi'
                          ? ' bg-accent text-accent-text'
                          : ' bg-amber-950 text-amber-300'
                      }`}>
                        {receiptData.proofs[0].status === 'terverifikasi' ? 'Terverifikasi' : ' Menunggu Verifikasi'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-700"> Belum Ada Bukti
                      </span>
                    )}
                  </div>

                  {/* List Bukti Pembayaran */}
                  {receiptData.proofs && receiptData.proofs.length > 0 ? (
                    receiptData.proofs.map((pr: any) => (
                      <div key={pr.id} className="p-3 bg-card rounded-xl border border-line space-y-2.5">
                        <div className="flex items-center gap-3">
                          {/* Thumbnail */}
                          <div
                            onClick={() => setZoomProofImage(pr.imageData)}
                            className="relative w-16 h-16 rounded-lg overflow-hidden bg-line flex-shrink-0 cursor-pointer border border-line group"
                            title="Klik untuk melihat foto penuh"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={pr.imageData} alt={pr.fileName} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs"><LineIcon name="info" /></div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-fg truncate">{pr.fileName}</p>
                            <p className="text-[10px] text-muted">
                              Ukuran: {formatBytes(pr.fileSize)} • Unggah: {new Date(pr.uploadedAt).toLocaleTimeString()}
                            </p>
                            <p className="text-[10px] text-muted">
                              Oleh: <span className="font-bold text-fg">{pr.uploadedBy}</span>
                            </p>
                            {pr.verifiedAt && (
                              <p className="text-[10px] text-accent-text font-bold">
                                Diverifikasi oleh {pr.verifiedBy} pada {new Date(pr.verifiedAt).toLocaleTimeString()}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Verifikasi / Hapus */}
                        <div className="flex items-center gap-2 pt-2 border-t border-line">
                          {pr.status !== 'terverifikasi' && (
                            <button
                              type="button"
                              onClick={() => handleVerifyProof(pr.id)}
                              className="flex-1 py-1.5 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-sm active:scale-95 flex items-center justify-center gap-1"
                            >
                              <span><LineIcon name="success" /></span>
                              <span>Verifikasi Sekarang</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProof(pr.id)}
                            className="py-1.5 px-3 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-500/15 transition-colors"
                          >
                            Hapus Bukti
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    /* Tombol Upload Bukti Susulan jika belum ada */
                    <div className="text-center py-2">
                      <input
                        ref={detailProofInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUploadProofFromDetail}
                      />
                      <button
                        type="button"
                        onClick={() => detailProofInputRef.current?.click()}
                        disabled={isUploadingDetailProof}
                        className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover active:scale-95 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-accent/20 flex items-center justify-center gap-1.5"
                      >
                        <span><LineIcon name="camera" /></span>
                        <span>{isUploadingDetailProof ? "Mengompresi..." : "Upload Bukti Pembayaran Sekarang"}</span>
                      </button>
                      <p className="text-[10px] text-muted mt-1.5">
                        Dapat diambil langsung dari kamera ponsel atau galeri file gambar.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Print Buttons */}
            <div className="space-y-2 pt-3 border-t border-line">
              <button
                type="button"
                onClick={() => handlePrint('all')}
                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-md shadow-accent/20 active:scale-95 transition-all"
              > Cetak Ulang Struk Tamu
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('food')}
                  className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-[11px] font-bold shadow-sm transition-colors"
                > Struk Dapur
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('drink')}
                  className="flex-1 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-[11px] font-bold shadow-sm transition-colors"
                > Struk Bar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LIGHTBOX ZOOM FOTO BUKTI PEMBAYARAN --- */}
      {zoomProofImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomProofImage(null)}
        >
          <div className="relative max-w-2xl w-full max-h-[90vh] flex flex-col items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={zoomProofImage}
              alt="Bukti Pembayaran Penuh"
              className="max-w-full max-h-[82vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="button"
              onClick={() => setZoomProofImage(null)}
              className="mt-4 px-6 py-2 rounded-full bg-card/20 hover:bg-card/30 text-white text-xs font-bold backdrop-blur-md"
            >
              × Tutup Pratinjau
            </button>
          </div>
        </div>
      )}

      {/* --- MODAL IMPORT TRANSAKSI HISTORIS --- */}
      {isHistoricalModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsHistoricalModalOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-line max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <h3 className="text-sm font-black text-fg flex items-center gap-2">
                
                <span>Import Riwayat Transaksi Historis</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoricalModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg text-xs font-bold"
              >
                ×
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4">
              <div className="p-3 bg-accent/40 rounded-2xl border border-accent/40 text-accent-text text-xs leading-relaxed"> Transaksi historis akan diberi tanda <b>Migrasi Historis</b> untuk menjaga audit finansial tanpa mengubah shift laci kasir saat ini.
              </div>

              {/* Unduh Template */}
              <div className="flex items-center justify-between p-3.5 bg-card/60 rounded-2xl border border-line">
                <div>
                  <h4 className="text-xs font-bold text-fg">Unduh Template Resmi</h4>
                  <p className="text-[10px] text-muted">Gunakan format kolom yang sudah disesuaikan</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadHistoricalTransactionTemplate('xlsx')}
                    className="px-3 py-1.5 bg-line border border-line rounded-xl text-xs font-bold hover:bg-card"
                  >
                    .xlsx
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadHistoricalTransactionTemplate('csv')}
                    className="px-3 py-1.5 bg-line border border-line rounded-xl text-xs font-bold hover:bg-card"
                  >
                    .csv
                  </button>
                </div>
              </div>

              {/* Upload File */}
              <div>
                <label className="block text-xs font-bold text-fg mb-1.5">
                  Pilih File (.xlsx / .csv):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleHistoricalFileChange}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold hover:file:opacity-90 file:bg-accent file:text-white"
                />
              </div>

              {/* Preview Hasil Parsing */}
              {parsedHistorical && (
                <div className="p-3.5 bg-card/60 rounded-2xl border border-line space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Baris Valid: <strong className="text-accent-text">{parsedHistorical.validTransactions.length}</strong></span>
                    <span>Gagal: <strong className="text-rose-700">{parsedHistorical.invalidRows.length}</strong></span>
                  </div>

                  {parsedHistorical.validTransactions.length > 0 && (
                    <div className="max-h-40 overflow-y-auto text-[11px] space-y-1 bg-surface p-2 rounded-xl">
                      {parsedHistorical.validTransactions.slice(0, 5).map((t: any, idx: number) => (
                        <div key={idx} className="flex justify-between border-b border-line pb-1">
                          <span>{t.receiptNumber} • {t.customerName}</span>
                          <span className="font-bold">Rp {t.total.toLocaleString('id-ID')} ({t.paymentMethod})</span>
                        </div>
                      ))}
                      {parsedHistorical.validTransactions.length > 5 && (
                        <p className="text-[10px] text-muted text-center pt-1">
                          ...dan {parsedHistorical.validTransactions.length - 5} transaksi lainnya
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line flex gap-2">
              <button
                type="button"
                onClick={() => setIsHistoricalModalOpen(false)}
                className="flex-1 py-2.5 bg-card text-fg border border-line rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmHistoricalImport}
                disabled={!parsedHistorical || !parsedHistorical.validTransactions.length || isImportingHistorical}
                className="flex-[2] py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-accent/20"
              >
                {isImportingHistorical ? "Mengimpor..." : `Impor ${parsedHistorical?.validTransactions?.length || 0} Transaksi`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL BULK UPLOAD BUKTI BAYAR & PENCOCOKAN OTOMATIS --- */}
      {isBulkProofModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsBulkProofModalOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-line max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-line">
              <h3 className="text-sm font-black text-fg flex items-center gap-2">
                
                <span>Pencocokan Massal Bukti Bayar QRIS / Transfer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkProofModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg text-xs font-bold"
              >
                ×
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4">
              <p className="text-xs text-muted">
                Pilih beberapa file gambar bukti transfer/QRIS sekaligus. SakuNota otomatis membaca nama file (misal: <code>INV-12.jpg</code>, <code>PAY-45.png</code>, atau <code>12.jpg</code>) untuk dicocokkan ke transaksi kasir.
              </p>

              <div>
                <label className="block text-xs font-bold text-fg mb-1.5">
                  Pilih Banyak Gambar Bukti Bayar:
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBulkProofFilesChange}
                  disabled={isMatchingProofs}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold hover:file:opacity-90 file:bg-amber-600 file:text-white"
                />
              </div>

              {isMatchingProofs && (
                <div className="text-center py-6 text-xs text-muted font-semibold animate-pulse"> Sedang membaca dan mencocokkan gambar ke nota transaksi...
                </div>
              )}

              {matchedProofResults.length > 0 && !isMatchingProofs && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold px-1">
                    <span>Hasil Pencocokan:</span>
                    <span>
                      <strong className="text-accent-text">{matchedProofResults.filter(m => m.matched).length} Cocok</strong> •{" "}
                      <strong className="text-rose-700">{matchedProofResults.filter(m => !m.matched).length} Tidak Cocok</strong>
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {matchedProofResults.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                          m.matched
                            ? " bg-accent/20 border-accent/40"
                            : " bg-rose-50 border-rose-200"
                        }`}
                      >
                        {/* Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.file.imageData} alt={m.file.fileName} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-fg truncate">{m.file.fileName}</p>
                          <p className={`text-[10px] ${m.matched ? " text-accent-text" : " text-rose-700"}`}>
                            {m.reason}
                          </p>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                          m.matched ? "bg-accent/15 text-accent-text" : "bg-rose-500/15 text-rose-700"
                        }`}>
                          {m.matched ? "Cocok" : "× Gagal"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-line flex gap-2">
              <button
                type="button"
                onClick={() => setIsBulkProofModalOpen(false)}
                className="flex-1 py-2.5 bg-card text-fg border border-line rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkProofs}
                disabled={matchedProofResults.filter(m => m.matched).length === 0 || isSavingBulkProofs}
                className="flex-[2] py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-accent/20"
              >
                {isSavingBulkProofs ? "Menyimpan..." : `Simpan ${matchedProofResults.filter(m => m.matched).length} Bukti Cocok`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- VOID / REFUND CONFIRMATION MODAL --- */}
      {voidTargetOrder && (
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setVoidTargetOrder(null)}
        >
          <div
            className=" bg-surface rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-line"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-50 text-rose-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black"><LineIcon name="info" /></div>
            <h3 className="text-base font-black text-fg text-center">
              Batalkan Nota #{voidTargetOrder.id}?
            </h3>
            <p className="text-xs text-muted text-center mt-1 mb-4">
              Nilai: <strong>Rp {(voidTargetOrder.paidAmount ?? voidTargetOrder.total - (voidTargetOrder.weightRefundAmount ?? 0)).toLocaleString("id-ID")}</strong> ({voidTargetOrder.paymentMethod})
            </p>

            <form onSubmit={handleProcessVoidSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-fg mb-1">
                  Alasan Pembatalan (Audit):
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah input meja / Menu tumpah"
                  className="w-full bg-card border border-line rounded-xl p-2.5 text-xs text-fg outline-none focus:border-rose-500 font-semibold"
                  required
                />
              </div>

              {voidTargetOrder.paymentMethod === "Cash" && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-950 block">
                      Kembalikan Uang Kas?
                    </span>
                    <span className="text-[10px] text-amber-900 font-medium">
                      Mengurangi expected cash laci kasir
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={isRefundCash}
                    onChange={(e) => setIsRefundCash(e.target.checked)}
                    className="w-4 h-4 accent-amber-600 rounded"
                  />
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-fg mb-1">
                  PIN Otorisasi Admin:
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={voidPinInput}
                  onChange={(e) => {
                    setVoidPinInput(e.target.value);
                    setVoidPinError("");
                  }}
                  placeholder="Ketik PIN..."
                  className="w-full bg-card border border-line rounded-xl p-2.5 text-sm font-black text-center text-fg outline-none focus:border-rose-500 tracking-widest"
                  autoFocus
                  required
                />
                {voidPinError && (
                  <p className="text-[10px] font-bold text-rose-700 mt-1">{voidPinError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTargetOrder(null)}
                  className="flex-1 py-2.5 bg-card text-fg border border-line rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-[2] py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md transition-all active:scale-95"
                >
                  Konfirmasi VOID
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Bayar / Cicil Kasbon */}
      {kasbonTargetOrder && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => !isSubmittingKasbonPay && setKasbonTargetOrder(null)}
        >
          <div
            className="bg-surface rounded-3xl p-6 max-w-md w-full shadow-2xl border border-line space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h3 className="text-base font-black text-fg">
                  Catat Pembayaran Kasbon
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Nota #{kasbonTargetOrder.id} • {kasbonTargetOrder.customerName || "Pelanggan"}
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmittingKasbonPay}
                onClick={() => setKasbonTargetOrder(null)}
                className="text-muted hover:text-fg font-bold text-sm p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProcessKasbonPay} className="space-y-4">
              {/* Sisa Tagihan Info */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted block uppercase">
                    Sisa Tagihan Belum Lunas
                  </span>
                  <span className="text-lg font-black text-rose-700 block">
                    Rp {(kasbonTargetOrder.remainingBalance !== undefined
                      ? kasbonTargetOrder.remainingBalance
                      : (kasbonTargetOrder.status === "unpaid" ? kasbonTargetOrder.total : 0)).toLocaleString("id-ID")}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const remaining = kasbonTargetOrder.remainingBalance !== undefined
                      ? kasbonTargetOrder.remainingBalance
                      : (kasbonTargetOrder.status === "unpaid" ? kasbonTargetOrder.total : 0);
                    setKasbonPayAmount(String(remaining));
                  }}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-black transition-colors"
                >
                  Bayar Lunas
                </button>
              </div>

              {/* Input Nominal */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Nominal Pembayaran (Rp):
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-muted text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    min="1"
                    max={kasbonTargetOrder.remainingBalance !== undefined
                      ? kasbonTargetOrder.remainingBalance
                      : (kasbonTargetOrder.status === "unpaid" ? kasbonTargetOrder.total : undefined)}
                    value={kasbonPayAmount}
                    onChange={(e) => setKasbonPayAmount(e.target.value)}
                    placeholder="0"
                    className="w-full bg-card border border-line rounded-xl pl-11 pr-4 py-3 text-lg font-black text-fg outline-none focus:border-accent"
                    required
                    autoFocus
                  />
                </div>
                {/* Presets */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[10000, 20000, 50000, 100000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        const cur = Number(kasbonPayAmount) || 0;
                        setKasbonPayAmount(String(cur + val));
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card hover:bg-line text-muted hover:text-fg border border-line transition-colors"
                    >
                      +{val >= 1000 ? `${val / 1000}rb` : val}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setKasbonPayAmount("")}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-card hover:bg-rose-50 text-rose-600 border border-line transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Metode Pembayaran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Metode Pembayaran:
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: "Cash", label: "Tunai" },
                    { id: "QRIS", label: "QRIS" },
                    { id: "Transfer", label: "Transfer" },
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setKasbonPayMethod(m.id)}
                      className={`py-2 px-1 rounded-xl border text-center font-bold transition-all ${
                        kasbonPayMethod === m.id
                          ? "bg-accent border-accent text-white shadow-sm"
                          : "bg-card border-line text-muted hover:text-fg"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Catatan Pembayaran */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-fg">
                  Catatan Pembayaran:
                </label>
                <input
                  type="text"
                  value={kasbonPayNotes}
                  onChange={(e) => setKasbonPayNotes(e.target.value)}
                  placeholder="Contoh: Cicilan pertama, Pelunasan via BCA"
                  className="w-full bg-card border border-line rounded-xl p-2.5 text-xs text-fg outline-none focus:border-accent"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-line">
                <button
                  type="button"
                  disabled={isSubmittingKasbonPay}
                  onClick={() => setKasbonTargetOrder(null)}
                  className="flex-1 py-3 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKasbonPay}
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-lg shadow-accent/20 transition-all active:scale-95"
                >
                  {isSubmittingKasbonPay ? "Menyimpan..." : "Simpan Pembayaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
