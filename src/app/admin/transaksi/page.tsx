"use client";

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
} from "@/lib/api";
import {
  exportOrdersToExcel,
  downloadHistoricalTransactionTemplate,
  parseHistoricalTransactionsFile,
} from "@/lib/excelUtils";
import { compressPaymentProof, formatBytes } from "@/lib/imageUtils";
import { generateEscPosReceipt } from "@/lib/receipt";
import { Printer } from "@capgo/capacitor-printer";
import { BluetoothSerial } from "@ascentio-it/capacitor-bluetooth-serial";
import { App } from "@capacitor/app";

export default function AdminTransaksiPage() {
  const { storeSettings, showToast } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab: 'orders' or 'voids'
  const [activeTab, setActiveTab] = useState<'orders' | 'voids'>('orders');

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
    showToast(`Memulai pencetakan ${selectedList.length} nota...`);

    for (const ord of selectedList) {
      await handlePrintSingleOrder(ord, 'all');
    }
  };

  const handlePrintSingleOrder = async (order: any, mode: 'all' | 'food' | 'drink' = 'all') => {
    try {
      const isAndroid = typeof window !== "undefined" && /android/i.test(navigator.userAgent);
      const mac = typeof window !== "undefined" ? localStorage.getItem('bt_printer_mac') : null;

      if (isAndroid && mac) {
        const escPosData = generateEscPosReceipt(order, mode, storeSettings);
        try { await BluetoothSerial.connect({ address: mac }); } catch(e) {}
        await BluetoothSerial.write({ address: mac, value: escPosData });
        return;
      }

      const receiptContent = `
        <html>
          <head>
            <style>
              body { font-family: monospace; padding: 10px; width: ${storeSettings.paperWidth === '80mm' ? '76mm' : '56mm'}; font-size: 11px; }
              .center { text-align: center; }
              .divider { border-bottom: 1px dashed #000; margin: 6px 0; }
              .row { display: flex; justify-content: space-between; }
              .bold { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="center bold">${storeSettings.storeName || "SakuNota POS"}</div>
            <div class="center">${storeSettings.storeAddress || ""}</div>
            <div class="divider"></div>
            <div class="row"><span>Nota #${order.id}</span><span>${new Date(order.createdAt).toLocaleTimeString()}</span></div>
            <div class="row"><span>Tamu: ${order.customerName || "Tamu"}</span><span>${order.tableName || order.orderType}</span></div>
            <div class="divider"></div>
            ${(order.items || []).map((it: any) => `
              <div class="row">
                <span>${it.qty}x ${it.nama || it.namaMenu}</span>
                <span>Rp ${(it.harga * it.qty).toLocaleString("id-ID")}</span>
              </div>
            `).join('')}
            <div class="divider"></div>
            <div class="row bold"><span>TOTAL:</span><span>Rp ${(order.total || 0).toLocaleString("id-ID")}</span></div>
            <div class="row"><span>Metode:</span><span>${order.paymentMethod || "Cash"}</span></div>
          </body>
        </html>
      `;

      if (typeof window !== "undefined" && (window as any).Capacitor) {
        await Printer.printWebView({ name: `Nota #${order.id}` });
      } else {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(receiptContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
      }
    } catch (e: any) {
      console.error("Gagal mencetak nota:", e);
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
      if (voidPinInput !== storeSettings.adminPin) {
        setVoidPinError("PIN Admin salah! Harap periksa kembali.");
        return;
      }
    }

    try {
      await processVoidRefund(voidTargetOrder.id, {
        reason: voidReason,
        isRefunded: isRefundCash,
        refundAmount: voidTargetOrder.total,
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
      showToast("Bukti pembayaran berhasil DIVERIFIKASI ✓");
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

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-16">
      {/* --- TOP BAR & ACTION TOOLS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-4 sm:p-5 rounded-3xl border border-line shadow-sm">
        <div>
          <h2 className="text-lg font-black text-fg flex items-center gap-2">
            <span>🧾</span>
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
                  : " text-rose-400"
              }`}
            >
              <span>Void & Refund</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-900 text-rose-200 text-[10px]">
                {orders.filter(o => o.status === 'void').length}
              </span>
            </button>
          </div>

          {/* Export & Import Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleBulkExport('xlsx')}
              className="px-3 py-2 bg-accent/40 text-accent-text border border-accent/40 hover:bg-accent/15 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>📤</span>
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHistoricalModalOpen(true)}
              className="px-3 py-2 bg-accent/40 text-accent-text border border-accent/40 hover:bg-accent/15 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>📥</span>
              <span>Import Historis</span>
            </button>

            <button
              type="button"
              onClick={() => setIsBulkProofModalOpen(true)}
              className="px-3 py-2 bg-amber-950/40 text-amber-300 border border-amber-800 hover:bg-amber-500/15 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95"
            >
              <span>📷</span>
              <span>Bulk Bukti Bayar</span>
            </button>
          </div>
        </div>
      </div>

      {/* --- FILTER & SEARCH BAR --- */}
      <div className=" bg-surface p-4 rounded-3xl border border-line shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs">🔍</span>
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
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-slate-300 outline-none"
            >
              <option value="all">📅 Semua Waktu</option>
              <option value="today">📅 Hari Ini</option>
              <option value="month">📅 Bulan Ini</option>
              <option value="custom">📅 Rentang Tanggal Khusus</option>
            </select>
          </div>

          {/* Payment Filter */}
          <div>
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-slate-300 outline-none"
            >
              <option value="Semua">💳 Semua Pembayaran</option>
              <option value="Cash">💵 Tunai (Cash)</option>
              <option value="QRIS">📱 QRIS</option>
              <option value="Transfer">💳 Transfer Bank</option>
            </select>
          </div>

          {/* Verification Status Filter */}
          <div>
            <select
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-slate-300 outline-none"
            >
              <option value="Semua">🔍 Semua Status Verifikasi</option>
              <option value="terverifikasi">✓ Terverifikasi</option>
              <option value="menunggu_verifikasi">⏳ Menunggu Verifikasi</option>
              <option value="menunggu_bukti">⚠️ Menunggu Bukti</option>
            </select>
          </div>

          {/* Sort Filter */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-slate-300 outline-none"
            >
              <option value="waktu_desc">⏱️ Waktu (Terbaru)</option>
              <option value="waktu_asc">⏱️ Waktu (Terlama)</option>
              <option value="total_desc">💰 Total (Tertinggi)</option>
              <option value="total_asc">💰 Total (Terendah)</option>
            </select>
          </div>

          {/* Items Per Page */}
          <div>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="w-full py-2.5 px-3 bg-card border border-line rounded-xl text-xs font-bold text-slate-300 outline-none"
            >
              <option value={15}>📄 15 Nota / Hal</option>
              <option value={30}>📄 30 Nota / Hal</option>
              <option value={50}>📄 50 Nota / Hal</option>
              <option value={0}>📄 Tampilkan Semua</option>
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
        <div className="sticky top-16 z-20 bg-accent text-white p-3 sm:p-4 rounded-2xl shadow-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-card/20 flex items-center justify-center font-black text-xs">
              {selectedOrderIds.length}
            </span>
            <span className="text-xs font-black">Nota Terpilih</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkReprint}
              className="px-3 py-1.5 bg-card text-accent-text hover:bg-accent/10 rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm active:scale-95"
            >
              <span>🖨️</span>
              <span>Cetak Terpilih</span>
            </button>
            <button
              type="button"
              onClick={() => handleBulkExport('xlsx')}
              className="px-3 py-1.5 bg-accent text-white hover:bg-accent-hover rounded-xl text-xs font-bold transition-all flex items-center gap-1"
            >
              <span>📤</span>
              <span>Export (.xlsx)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedOrderIds([])}
              className="px-2.5 py-1.5 text-blue-200 hover:text-white text-xs font-semibold"
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
          <span className="text-4xl block mb-2">🧾</span>
          <p className="text-sm font-bold text-slate-300">Tidak ada nota ditemukan</p>
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
                  <span>📋</span>
                  <span>Tabel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("card")}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    viewMode === "card" ? "bg-accent text-white shadow-sm" : "text-muted hover:text-fg"
                  }`}
                >
                  <span>🔲</span>
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
                          <span className="font-bold text-fg block truncate">
                            👤 {order.customerName || "Tamu"}
                          </span>
                          <span className="text-[10px] text-muted block mt-0.5">
                            {order.tableName || (order.tableId ? `Meja ${order.tableId}` : order.orderType || "Takeaway")}
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-2.5 py-1 rounded-lg bg-card border border-line text-[11px] font-bold text-slate-300 inline-block">
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
                                className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                                  vStatus === "terverifikasi"
                                    ? "bg-accent/60 text-accent-text"
                                    : vStatus === "menunggu_verifikasi"
                                    ? "bg-amber-950/60 text-amber-300 animate-pulse"
                                    : "bg-rose-950/60 text-rose-300"
                                }`}
                              >
                                <span>{vStatus === "terverifikasi" ? "✓" : vStatus === "menunggu_verifikasi" ? "⏳" : "⚠️"}</span>
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
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full inline-block ${
                              isVoid
                                ? "bg-rose-950/60 text-rose-300 line-through"
                                : order.status === "paid"
                                ? "bg-accent/60 text-accent-text"
                                : "bg-amber-950/60 text-amber-300"
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
                              <span>🔍</span>
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
                                className="px-2.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 rounded-xl text-xs font-bold transition-colors shadow-sm"
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
                      ? " border-rose-900/40 bg-rose-500/10"
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
                              ? " bg-rose-950/60 text-rose-300 line-through"
                              : order.status === "paid"
                              ? " bg-accent/60 text-accent-text"
                              : " bg-amber-950/60 text-amber-300"
                          }`}
                        >
                          {isVoid ? "VOID" : order.status === "paid" ? "LUNAS" : "OPEN BILL"}
                        </span>

                        {/* Status Verifikasi Bukti Pembayaran */}
                        {isNonCash && !isVoid && (
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              vStatus === "terverifikasi"
                                ? " bg-accent/60 text-accent-text"
                                : vStatus === "menunggu_verifikasi"
                                ? " bg-amber-950/60 text-amber-300 animate-pulse"
                                : " bg-rose-950/60 text-rose-300"
                            }`}
                          >
                            <span>{vStatus === "terverifikasi" ? "✓" : vStatus === "menunggu_verifikasi" ? "⏳" : "⚠️"}</span>
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
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-accent/60 text-accent-text">
                            Migrasi Historis
                          </span>
                        )}

                        <span className="text-[10px] text-muted">{dateDisplay}</span>
                      </div>

                      <p className="text-xs text-muted">
                        {order.tableName || (order.tableId ? `Meja ${order.tableId}` : order.orderType || "Takeaway")} • Tamu: <strong className=" text-fg">{order.customerName || "Tamu"}</strong>
                      </p>

                      {isVoid && order.voidReason && (
                        <div className="mt-2 text-[11px] text-rose-400 bg-rose-950/40 px-2.5 py-1 rounded-lg">
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
                        <span>🔍</span>
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
                          className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 rounded-xl text-xs font-bold transition-colors"
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
                  className="px-3 py-1.5 rounded-xl bg-card border border-line disabled:opacity-40 font-bold text-slate-300 hover:bg-card transition-all active:scale-95"
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
                              : " bg-card border border-line text-slate-300 hover:bg-card"
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
                  className="px-3 py-1.5 rounded-xl bg-card border border-line disabled:opacity-40 font-bold text-slate-300 hover:bg-card transition-all active:scale-95"
                >
                  Berikutnya →
                </button>
              </div>
            </div>
          )}
        </div>
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
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">VOID</span>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-3 space-y-3">
              {/* Thermal Slip Simulation */}
              <div className="font-mono text-[11px] leading-tight space-y-2 bg-card/40 p-3.5 rounded-2xl border border-line">
                <div className="text-center font-bold text-xs pb-1 border-b border-dashed border-line">
                  {storeSettings.storeName || "SakuNota POS"}
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
                      <span>{it.qty}x {it.nama || it.namaMenu}</span>
                      <span>Rp {(it.hargaSatuan || it.harga) * it.qty}</span>
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

              {/* SEKSI BUKTI PEMBAYARAN (QRIS / TRANSFER) */}
              {(receiptData.paymentMethod === "QRIS" || receiptData.paymentMethod === "Transfer" || receiptData.proofs?.length > 0) && (
                <div className="p-3.5 bg-card/60 rounded-2xl border border-line space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-fg flex items-center gap-1.5">
                      <span>📷</span>
                      <span>Bukti Pembayaran ({receiptData.paymentMethod})</span>
                    </h4>

                    {receiptData.proofs && receiptData.proofs.length > 0 ? (
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                        receiptData.proofs[0].status === 'terverifikasi'
                          ? ' bg-accent text-accent-text'
                          : ' bg-amber-950 text-amber-300'
                      }`}>
                        {receiptData.proofs[0].status === 'terverifikasi' ? '✓ Terverifikasi' : '⏳ Menunggu Verifikasi'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                        ⚠️ Belum Ada Bukti
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
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
                              🔍
                            </div>
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-fg truncate">{pr.fileName}</p>
                            <p className="text-[10px] text-muted">
                              Ukuran: {formatBytes(pr.fileSize)} • Unggah: {new Date(pr.uploadedAt).toLocaleTimeString()}
                            </p>
                            <p className="text-[10px] text-muted">
                              Oleh: <span className="font-semibold text-slate-300">{pr.uploadedBy}</span>
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
                              <span>✓</span>
                              <span>Verifikasi Sekarang</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteProof(pr.id)}
                            className="py-1.5 px-3 rounded-lg bg-rose-950/40 text-rose-400 text-xs font-bold hover:bg-rose-500/15 transition-colors"
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
                        <span>📷</span>
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
              >
                🖨️ Cetak Ulang Struk Tamu
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('food')}
                  className="flex-1 py-2 bg-amber-950/40 hover:bg-amber-500/15 text-amber-300 rounded-xl text-[11px] font-bold"
                >
                  🍳 Struk Dapur
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('drink')}
                  className="flex-1 py-2 bg-accent/40 hover:bg-accent/15 text-accent-text rounded-xl text-[11px] font-bold"
                >
                  ☕ Struk Bar
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
              ✕ Tutup Pratinjau
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
                <span>📥</span>
                <span>Import Riwayat Transaksi Historis</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsHistoricalModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4">
              <div className="p-3 bg-accent/40 rounded-2xl border border-accent/40 text-accent-text text-xs leading-relaxed">
                ℹ️ Transaksi historis akan diberi tanda <b>Migrasi Historis</b> untuk menjaga audit finansial tanpa mengubah shift laci kasir saat ini.
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
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Pilih File (.xlsx / .csv):
                </label>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleHistoricalFileChange}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold hover:file:bg-accent/15 file:bg-accent/60 file:text-accent-text"
                />
              </div>

              {/* Preview Hasil Parsing */}
              {parsedHistorical && (
                <div className="p-3.5 bg-card/60 rounded-2xl border border-line space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span>Baris Valid: <strong className="text-accent-text">{parsedHistorical.validTransactions.length}</strong></span>
                    <span>Gagal: <strong className="text-rose-400">{parsedHistorical.invalidRows.length}</strong></span>
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
                className="flex-1 py-2.5 bg-card text-slate-300 rounded-xl text-xs font-bold"
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
                <span>📷</span>
                <span>Pencocokan Massal Bukti Bayar QRIS / Transfer</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsBulkProofModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="py-4 overflow-y-auto space-y-4">
              <p className="text-xs text-muted">
                Pilih beberapa file gambar bukti transfer/QRIS sekaligus. SakuNota otomatis membaca nama file (misal: <code>INV-12.jpg</code>, <code>PAY-45.png</code>, atau <code>12.jpg</code>) untuk dicocokkan ke transaksi kasir.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Pilih Banyak Gambar Bukti Bayar:
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleBulkProofFilesChange}
                  disabled={isMatchingProofs}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold hover:file:bg-amber-500/15 file:bg-amber-950/60 file:text-amber-300"
                />
              </div>

              {isMatchingProofs && (
                <div className="text-center py-6 text-xs text-muted font-semibold animate-pulse">
                  ⏳ Sedang membaca dan mencocokkan gambar ke nota transaksi...
                </div>
              )}

              {matchedProofResults.length > 0 && !isMatchingProofs && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold px-1">
                    <span>Hasil Pencocokan:</span>
                    <span>
                      <strong className="text-accent-text">{matchedProofResults.filter(m => m.matched).length} Cocok</strong> •{" "}
                      <strong className="text-rose-400">{matchedProofResults.filter(m => !m.matched).length} Tidak Cocok</strong>
                    </span>
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {matchedProofResults.map((m, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border flex items-center gap-3 text-xs ${
                          m.matched
                            ? " bg-accent/20 border-accent/40"
                            : " bg-rose-950/20 border-rose-800"
                        }`}
                      >
                        {/* Thumbnail */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={m.file.imageData} alt={m.file.fileName} className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />

                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-fg truncate">{m.file.fileName}</p>
                          <p className={`text-[10px] ${m.matched ? " text-accent-text" : " text-rose-300"}`}>
                            {m.reason}
                          </p>
                        </div>

                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex-shrink-0 ${
                          m.matched ? "bg-accent/15 text-accent-text" : "bg-rose-500/15 text-rose-400"
                        }`}>
                          {m.matched ? "✓ Cocok" : "✕ Gagal"}
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
                className="flex-1 py-2.5 bg-card text-slate-300 rounded-xl text-xs font-bold"
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
            <div className="w-12 h-12 bg-rose-950/60 text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-fg text-center">
              Batalkan Nota #{voidTargetOrder.id}?
            </h3>
            <p className="text-xs text-muted text-center mt-1 mb-4">
              Nilai: <strong>Rp {(voidTargetOrder.total || 0).toLocaleString("id-ID")}</strong> ({voidTargetOrder.paymentMethod})
            </p>

            <form onSubmit={handleProcessVoidSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
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
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-200 block">
                      Kembalikan Uang Kas?
                    </span>
                    <span className="text-[10px] text-amber-400">
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
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
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
                  <p className="text-[10px] font-bold text-rose-400 mt-1">{voidPinError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTargetOrder(null)}
                  className="flex-1 py-2.5 bg-card text-slate-300 rounded-xl text-xs font-bold transition-colors"
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
    </div>
  );
}
