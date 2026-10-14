"use client";

import React, { useState, useEffect } from "react";
import { useAdmin } from "../AdminContext";
import { getOrders, processVoidRefund, getAuditLogs } from "@/lib/api";
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

  // Receipt Modal
  const [receiptData, setReceiptData] = useState<any>(null);
  const [printMode, setPrintMode] = useState<'all' | 'food' | 'drink'>('all');

  // Void & Refund Modal
  const [voidTargetOrder, setVoidTargetOrder] = useState<any>(null);
  const [voidReason, setVoidReason] = useState("Salah input item menu");
  const [isRefundCash, setIsRefundCash] = useState(false);
  const [voidPinInput, setVoidPinInput] = useState("");
  const [voidPinError, setVoidPinError] = useState("");

  const loadData = async () => {
    try {
      const [allOrders, logs] = await Promise.all([getOrders(), getAuditLogs()]);
      setOrders(allOrders);
      setAuditLogs(logs);
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
        if (receiptData) {
          setReceiptData(null);
        } else if (voidTargetOrder) {
          setVoidTargetOrder(null);
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
  }, [receiptData, voidTargetOrder]);

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

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = o.id.toString().includes(q);
      const matchCust = (o.customerName || "").toLowerCase().includes(q);
      const matchTable = (o.tableName || "").toLowerCase().includes(q);
      if (!matchId && !matchCust && !matchTable) return false;
    }

    return true;
  }).reverse();

  // Print Receipt handler
  const handlePrint = async (mode: 'all' | 'food' | 'drink') => {
    const isAndroid = /android/i.test(navigator.userAgent);
    setPrintMode(mode);

    setTimeout(async () => {
      try {
        const mac = localStorage.getItem("bt_printer_mac");
        if (isAndroid && mac && receiptData) {
          const textToPrint = generateEscPosReceipt(receiptData, mode, storeSettings);
          try {
            await BluetoothSerial.connect({ address: mac });
          } catch (_) {}
          await BluetoothSerial.write({ address: mac, value: textToPrint });
          showToast("Berhasil mencetak ke Printer Bluetooth!", "success");
        } else {
          await Printer.printWebView({ name: "Nota_SakuNota" });
        }
      } catch (e: any) {
        try {
          await Printer.printWebView({ name: "Nota_SakuNota" });
        } catch (_) {
          alert("Gagal memanggil print: " + e.message);
        }
      }
      setPrintMode('all');
    }, 100);
  };

  // Void & Refund Submit
  const handleProcessVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidTargetOrder) return;

    const correctPin = storeSettings.adminPin || "1234";
    if (voidPinInput !== correctPin) {
      setVoidPinError("PIN Admin salah!");
      return;
    }

    try {
      await processVoidRefund(voidTargetOrder.id, {
        reason: voidReason,
        isRefunded: isRefundCash,
        refundAmount: isRefundCash ? voidTargetOrder.total : 0,
        refundMethod: isRefundCash ? "Cash" : "None",
        operator: "Admin",
      });

      showToast(`Nota #${voidTargetOrder.id} berhasil dibatalkan (VOID)`, "info");
      setVoidTargetOrder(null);
      setVoidPinInput("");
      setVoidPinError("");
      await loadData();
    } catch (err: any) {
      alert("Gagal membatalkan nota: " + err.message);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>🧾</span>
            <span>Riwayat Transaksi & Pembatalan</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Daftar seluruh nota penjualan, cetak ulang struk, dan audit void/refund.
          </p>
        </div>

        {/* Tab Switcher (In-page tab) */}
        <div className="flex p-1 bg-gray-200/80 dark:bg-gray-800 rounded-2xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeTab === 'orders'
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            Semua Nota ({orders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voids')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeTab === 'voids'
                ? "bg-rose-600 text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-rose-600"
            }`}
          >
            <span>Void & Refund</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {orders.filter(o => o.status === 'void').length}
            </span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Cari No. Nota, Meja, atau Tamu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 pl-9 pr-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-semibold"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
          </div>

          {/* Date Filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
          >
            <option value="all">📅 Semua Waktu</option>
            <option value="today">📅 Hari Ini</option>
            <option value="month">📅 Bulan Ini</option>
            <option value="custom">📅 Pilih Rentang Tanggal...</option>
          </select>

          {/* Payment Method */}
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl py-2 px-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500 font-bold"
          >
            <option value="Semua">💳 Semua Pembayaran</option>
            <option value="Cash">💵 Tunai (Cash)</option>
            <option value="QRIS">📱 QRIS</option>
            <option value="Transfer">🏦 Transfer Bank</option>
          </select>
        </div>

        {dateFilter === "custom" && (
          <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Mulai Dari:</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-bold block mb-1">Sampai Dengan:</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2 text-xs"
              />
            </div>
          </div>
        )}
      </div>

      {/* Orders List / Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-gray-400 text-xs">Memuat data transaksi...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-12 text-center bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-8">
          <div className="text-4xl mb-2">🧾</div>
          <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">
            {activeTab === 'voids' ? "Tidak ada transaksi void" : "Tidak ada nota ditemukan"}
          </h3>
          <p className="text-xs text-gray-400 mt-1">Coba sesuaikan filter pencarian atau tanggal Anda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const isVoid = order.status === "void";
            const dateDisplay = new Date(order.created_at || order.createdAt || Date.now()).toLocaleString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <div
                key={order.id}
                className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-white dark:bg-gray-900 border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isVoid
                    ? "border-rose-200 dark:border-rose-900/40 bg-rose-50/20"
                    : "border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/40"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-sm text-gray-900 dark:text-white">
                      Nota #{order.id}
                    </span>
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                        isVoid
                          ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 line-through"
                          : order.status === "paid"
                          ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300"
                          : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300"
                      }`}
                    >
                      {isVoid ? "DIBATALKAN (VOID)" : order.status === "paid" ? "LUNAS" : "OPEN BILL"}
                    </span>
                    <span className="text-[10px] text-gray-400">{dateDisplay}</span>
                  </div>

                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {order.tableName || (order.tableId ? `Meja ${order.tableId}` : order.orderType || "Takeaway")} • Tamu: <strong className="text-gray-800 dark:text-gray-200">{order.customerName || "Tamu"}</strong>
                  </p>

                  {isVoid && order.voidReason && (
                    <div className="mt-2 text-[11px] text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2.5 py-1 rounded-lg">
                      <span className="font-bold">Alasan Batal:</span> {order.voidReason}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100 dark:border-gray-800">
                  <div className="text-left sm:text-right">
                    <span className={`text-base font-black ${isVoid ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                      Rp {(order.total || 0).toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-gray-400 block font-semibold">
                      {order.paymentMethod || "Cash"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReceiptData(order)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <span>🖨️</span>
                      <span>Struk</span>
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
                        className="px-3 py-2 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-bold transition-colors"
                      >
                        Void
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* --- RECEIPT MODAL --- */}
      {receiptData && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setReceiptData(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800 max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-sm text-gray-900 dark:text-white">
                Rincian Struk Nota #{receiptData.id}
              </h3>
              <button
                type="button"
                onClick={() => setReceiptData(null)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-gray-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Thermal Slip Simulation */}
            <div className="flex-1 overflow-y-auto py-4 font-mono text-[11px] leading-tight space-y-2 bg-gray-50 dark:bg-gray-800/40 p-3 rounded-2xl my-2">
              <div className="text-center font-bold text-xs pb-1 border-b border-dashed border-gray-300 dark:border-gray-700">
                {storeSettings.storeName || "SakuNota POS"}
              </div>
              <div className="text-gray-500 text-[10px]">
                Nota: #{receiptData.id} • {receiptData.tableName || receiptData.orderType}
              </div>
              <div className="text-gray-500 text-[10px]">
                Tamu: {receiptData.customerName || "Tamu"}
              </div>
              <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pb-1" />

              <div className="space-y-1">
                {(receiptData.items || []).map((it: any, idx: number) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.qty}x {it.nama}</span>
                    <span>Rp {(it.harga * it.qty).toLocaleString("id-ID")}</span>
                  </div>
                ))}
              </div>

              <div className="border-b border-dashed border-gray-300 dark:border-gray-700 pt-1" />
              <div className="flex justify-between font-bold text-xs pt-1">
                <span>TOTAL:</span>
                <span>Rp {(receiptData.total || 0).toLocaleString("id-ID")}</span>
              </div>
            </div>

            {/* Print Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handlePrint('all')}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
              >
                🖨️ Cetak Semua Item (Struk Tamu)
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('food')}
                  className="flex-1 py-2 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-800 dark:text-amber-300 rounded-xl text-[11px] font-bold"
                >
                  🍳 Struk Dapur
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint('drink')}
                  className="flex-1 py-2 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 text-blue-800 dark:text-blue-300 rounded-xl text-[11px] font-bold"
                >
                  ☕ Struk Bar
                </button>
              </div>
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
            className="bg-white dark:bg-gray-900 rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl font-black">
              ⚠️
            </div>
            <h3 className="text-base font-black text-gray-900 dark:text-white text-center">
              Batalkan Nota #{voidTargetOrder.id}?
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1 mb-4">
              Nilai: <strong>Rp {(voidTargetOrder.total || 0).toLocaleString("id-ID")}</strong> ({voidTargetOrder.paymentMethod})
            </p>

            <form onSubmit={handleProcessVoidSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Alasan Pembatalan (Audit):
                </label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Salah input meja / Menu tumpah"
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-none focus:border-rose-500 font-semibold"
                  required
                />
              </div>

              {voidTargetOrder.paymentMethod === "Cash" && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                      Kembalikan Uang Kas?
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400">
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
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
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
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-sm font-black text-center text-gray-900 dark:text-white outline-none focus:border-rose-500 tracking-widest"
                  autoFocus
                  required
                />
                {voidPinError && (
                  <p className="text-[10px] font-bold text-rose-600 mt-1">{voidPinError}</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTargetOrder(null)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors"
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
