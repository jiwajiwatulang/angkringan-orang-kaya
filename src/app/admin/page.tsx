"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAdmin } from "./AdminContext";
import { getOrders, getActiveShift, getShiftLiveStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const { storeSettings } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftStats, setShiftStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const allOrders = await getOrders();
        setOrders(allOrders);

        const currentShift = await getActiveShift();
        setActiveShift(currentShift);

        if (currentShift && currentShift.id) {
          const stats = await getShiftLiveStats(currentShift.id);
          setShiftStats(stats);
        }
      } catch (e) {
        console.error("Error loading dashboard data:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  // Filter today's orders
  const todayStr = new Date().toISOString().split("T")[0];
  const todayOrders = orders.filter((o) => {
    const oDate = (o.created_at || o.createdAt || "").split("T")[0];
    return oDate === todayStr;
  });

  const validOrders = todayOrders.filter((o) => o.status !== "void");
  const voidOrders = todayOrders.filter((o) => o.status === "void");

  const todayOmzet = validOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalRefund = voidOrders.reduce((sum, o) => sum + (o.total || 0), 0);

  // Recent 5 orders
  const recentOrders = [...orders].slice(-5).reverse();

  // 7-day sales calculation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("id-ID", { weekday: "short" });
    const dayDate = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const dayOrders = orders.filter((o) => {
      const oDate = (o.created_at || o.createdAt || "").split("T")[0];
      return oDate === dateStr && o.status !== "void";
    });
    const dayOmzet = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    return {
      dateStr,
      dayName,
      dayDate,
      omzet: dayOmzet,
      orderCount: dayOrders.length,
    };
  });

  const highest7DayOmzet = Math.max(...last7Days.map((d) => d.omzet), 0);
  const max7DayOmzet = highest7DayOmzet > 0 ? Math.ceil(highest7DayOmzet * 1.15) : 100000;

  // Category sales breakdown
  const categoryMap: Record<string, { total: number; qty: number }> = {};
  orders
    .filter((o) => o.status !== "void")
    .forEach((order) => {
      (order.items || []).forEach((item: any) => {
        const cat = item.kategori || item.category || "Lainnya";
        if (!categoryMap[cat]) {
          categoryMap[cat] = { total: 0, qty: 0 };
        }
        const itemPrice = item.harga ?? item.price ?? item.hargaSatuan ?? 0;
        const itemQty = item.qty || 1;
        categoryMap[cat].total += itemPrice * itemQty;
        categoryMap[cat].qty += itemQty;
      });
    });

  const categoryEntries = Object.entries(categoryMap)
    .map(([kategori, stats]) => ({
      kategori,
      ...stats,
    }))
    .sort((a, b) => b.total - a.total);

  const totalAllCategoriesOmzet = categoryEntries.reduce((s, c) => s + c.total, 0) || 1;

  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [waPeriod, setWaPeriod] = useState<"today" | "yesterday" | "7days" | "thisMonth">("today");
  const [copiedReport, setCopiedReport] = useState(false);

  // Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsWaModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Helper dates
  const now = new Date();
  const todayDateStr = now.toISOString().split("T")[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateStr = yesterday.toISOString().split("T")[0];
  const d7Ago = new Date(now);
  d7Ago.setDate(d7Ago.getDate() - 6);
  const d7AgoStr = d7Ago.toISOString().split("T")[0];
  const thisMonthPrefix = todayDateStr.substring(0, 7);

  // Filter orders by selected period (only paid / non-void orders)
  const filteredWaOrders = orders.filter((o) => {
    if (o.status === "void") return false;
    const oDate = (o.created_at || o.createdAt || "").split("T")[0];
    if (waPeriod === "today") return oDate === todayDateStr;
    if (waPeriod === "yesterday") return oDate === yesterdayDateStr;
    if (waPeriod === "7days") return oDate >= d7AgoStr && oDate <= todayDateStr;
    if (waPeriod === "thisMonth") return oDate.startsWith(thisMonthPrefix);
    return true;
  });

  const periodOmzet = filteredWaOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const periodCashSales = filteredWaOrders
    .filter((o) => {
      const pm = (o.paymentMethod || o.metodePembayaran || "").toLowerCase();
      return pm.includes("cash") || pm.includes("tunai");
    })
    .reduce((sum, o) => sum + (o.total || 0), 0);
  const periodNonCashSales = Math.max(0, periodOmzet - periodCashSales);

  const periodItemCounts: Record<string, number> = {};
  filteredWaOrders.forEach((o) => {
    (o.items || []).forEach((item: any) => {
      const name = item.name || item.nama || item.menuName || "Menu";
      periodItemCounts[name] = (periodItemCounts[name] || 0) + (item.qty || 1);
    });
  });
  const periodTopItems = Object.entries(periodItemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const generateWaReportMessage = () => {
    const store = storeSettings.storeName || "SakuNota";
    const dateFormatted = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const periodLabels: Record<string, string> = {
      today: "HARI INI",
      yesterday: "KEMARIN",
      "7days": "7 HARI TERAKHIR",
      thisMonth: "BULAN INI",
    };
    const periodLabel = periodLabels[waPeriod] || "HARI INI";

    let msg = `LAPORAN PENJUALAN — SAKUNOTA\n`;
    msg += `${dateFormatted}\n`;
    msg += `${store}\n\n`;
    msg += `RINGKASAN ${periodLabel}\n`;
    msg += `Rp${periodOmzet.toLocaleString("id-ID")}\n`;
    msg += `${filteredWaOrders.length} transaksi berhasil\n`;
    msg += `Tunai: Rp${periodCashSales.toLocaleString("id-ID")}\n`;
    msg += `Non-Tunai: Rp${periodNonCashSales.toLocaleString("id-ID")}\n\n`;

    if (periodTopItems.length > 0) {
      msg += `MENU TERLARIS\n`;
      periodTopItems.forEach(([name, qty], idx) => {
        msg += `${idx + 1}. ${name} — ${qty} porsi\n`;
      });
      msg += `\n`;
    }
    msg += `Dibuat dengan SakuNota`;
    return msg;
  };

  const handleCopyWaReport = async () => {
    const text = generateWaReportMessage();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      setCopiedReport(true);
      setTimeout(() => setCopiedReport(false), 2500);
    }
  };

  const handleOpenWhatsAppUrl = () => {
    const text = generateWaReportMessage();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
        <div>
          <h2 className="text-2xl font-black text-fg tracking-tight">
            Ringkasan Penjualan
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {storeSettings.storeName || "SakuNota"} • Ringkasan usaha & akses cepat ke laporan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsWaModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>📲</span>
            <span>Kirim ke WhatsApp</span>
          </button>
          <Link
            href="/admin/menu"
            className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-md shadow-accent/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>+</span>
            <span>Tambah Menu</span>
          </Link>
          <Link
            href="/pos"
            className="px-3.5 py-2 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors"
          >
            Buka Kasir
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards (Matching Mockup) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Omzet Card */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted">Omzet Hari Ini</span>
            <span className="w-8 h-8 rounded-xl bg-accent/60 text-accent-text flex items-center justify-center text-sm font-bold">
              💰
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-fg truncate">
            Rp {todayOmzet.toLocaleString("id-ID")}
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            {validOrders.length} transaksi berhasil
          </span>
        </div>

        {/* Transaksi Card */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted">Total Transaksi</span>
            <span className="w-8 h-8 rounded-xl bg-accent/60 text-accent-text flex items-center justify-center text-sm font-bold">
              🧾
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-fg truncate">
            {todayOrders.length}
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            Hari ini ({new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short" })})
          </span>
        </div>

        {/* Shift Aktif Card */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted">Shift Aktif</span>
            <span className="w-8 h-8 rounded-xl bg-amber-950/60 text-amber-400 flex items-center justify-center text-sm font-bold">
              💼
            </span>
          </div>
          <div className="text-base sm:text-lg font-black text-fg truncate">
            {activeShift ? activeShift.operatorName || "Kasir Buka" : "Shift Tutup"}
          </div>
          <span className="text-[10px] text-muted mt-1 block truncate">
            {activeShift ? `Mulai Rp ${(activeShift.startingCash || 0).toLocaleString("id-ID")}` : "Belum ada shift terbuka"}
          </span>
        </div>

        {/* Refund Card */}
        <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-surface border border-line shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-muted">Void / Refund</span>
            <span className="w-8 h-8 rounded-xl bg-rose-950/60 text-rose-400 flex items-center justify-center text-sm font-bold">
              ↩️
            </span>
          </div>
          <div className="text-xl sm:text-2xl font-black text-fg truncate">
            Rp {totalRefund.toLocaleString("id-ID")}
          </div>
          <span className="text-[10px] text-muted mt-1 block">
            {voidOrders.length} nota dibatalkan
          </span>
        </div>
      </div>

      {/* 2 Visual Charts: 7-Day Trend & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 7-Day Sales Trend Bar Chart (2 cols) */}
        <div className="lg:col-span-2 bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h4 className="text-sm font-black text-fg flex items-center gap-2">
                  <span>📊</span>
                  <span>Tren Penjualan 7 Hari Terakhir</span>
                </h4>
                <p className="text-[11px] text-muted mt-0.5">Grafik dinamika omzet harian toko</p>
              </div>
              <span className="text-xs font-black text-accent-text bg-accent/15 px-2.5 py-1 rounded-xl">
                Total: Rp {last7Days.reduce((s, d) => s + d.omzet, 0).toLocaleString("id-ID")}
              </span>
            </div>

            {/* Bar Chart Visualization with Explicit Height and Scale Lines */}
            <div className="pt-6 pb-2 relative">
              {/* Subtle Horizontal Reference Grid Lines */}
              <div className="absolute inset-x-2 top-8 bottom-14 flex flex-col justify-between pointer-events-none opacity-25">
                <div className="border-b border-dashed border-line w-full flex justify-end">
                  <span className="text-[9px] text-muted font-mono -mt-3.5 bg-surface px-1">
                    Rp {max7DayOmzet >= 1000 ? `${Math.round(max7DayOmzet / 1000)}k` : max7DayOmzet}
                  </span>
                </div>
                <div className="border-b border-dashed border-line w-full flex justify-end">
                  <span className="text-[9px] text-muted font-mono -mt-3.5 bg-surface px-1">
                    Rp {Math.round(max7DayOmzet / 2000)}k
                  </span>
                </div>
                <div className="border-b border-line w-full flex justify-end">
                  <span className="text-[9px] text-muted font-mono -mt-3 bg-surface px-1">
                    Rp 0
                  </span>
                </div>
              </div>

              <div className="h-48 sm:h-56 flex items-end justify-between gap-2 sm:gap-4 px-2 relative z-10">
                {last7Days.map((d, idx) => {
                  const heightPercent = d.omzet > 0 
                    ? Math.max(16, Math.min(100, Math.round((d.omzet / max7DayOmzet) * 100))) 
                    : 6;
                  const isToday = idx === 6;

                  return (
                    <div key={d.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group">
                      {/* Amount on Top of Bar */}
                      <span className={`text-[10px] font-black transition-all truncate max-w-full mb-1.5 ${
                        d.omzet > 0 
                          ? (isToday ? "text-accent-text" : "text-fg") 
                          : "text-muted/60"
                      }`}>
                        {d.omzet > 0 ? (d.omzet >= 1000 ? `${(d.omzet / 1000).toLocaleString("id-ID")}k` : d.omzet) : 'Rp 0'}
                      </span>

                      {/* Bar Track with Explicit Height */}
                      <div className="w-full max-w-[48px] h-32 sm:h-36 bg-card/70 rounded-2xl overflow-hidden flex flex-col justify-end border border-line/70 p-1 relative transition-all group-hover:border-accent group-hover:bg-accent/10 shadow-inner">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-xl transition-all duration-500 shadow-md ${
                            isToday
                              ? 'bg-gradient-to-t from-accent to-accent-hover shadow-accent/40'
                              : d.omzet > 0
                              ? 'bg-gradient-to-t from-accent/70 to-accent group-hover:from-accent group-hover:to-accent-hover'
                              : 'bg-line/50'
                          }`}
                        />
                      </div>

                      {/* Day & Date Labels */}
                      <div className="mt-2 text-center">
                        <span className={`block text-[11px] font-black leading-tight ${isToday ? 'text-accent-text' : 'text-fg'}`}>
                          {isToday ? 'Hari Ini' : d.dayName}
                        </span>
                        <span className="block text-[9px] text-muted mt-0.5">
                          {d.dayDate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Category Performance Breakdown Chart (1 col) */}
        <div className="bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h4 className="text-sm font-black text-fg flex items-center gap-2">
                  <span>🍽️</span>
                  <span>Performa Kategori</span>
                </h4>
                <p className="text-[11px] text-muted mt-0.5">Komposisi penjualan per kategori</p>
              </div>
            </div>

            <div className="mt-4 space-y-3 max-h-60 overflow-y-auto pr-1">
              {categoryEntries.length === 0 ? (
                <div className="py-8 text-center text-muted text-xs">
                  Belum ada transaksi menu tercatat.
                </div>
              ) : (
                categoryEntries.map((cat, idx) => {
                  const percent = Math.round((cat.total / totalAllCategoriesOmzet) * 100);
                  const colors = [
                    'bg-accent',
                    'bg-indigo-500',
                    'bg-sky-500',
                    'bg-teal-500',
                    'bg-purple-500',
                  ];
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={cat.kategori} className="space-y-1.5 p-2 rounded-xl hover:bg-card/40 transition-colors">
                      <div className="flex justify-between items-center text-xs gap-2">
                        <div className="font-bold text-fg flex items-center gap-1.5 min-w-0 flex-1">
                          <span className={`w-2 h-2 rounded-full ${barColor} shrink-0`} />
                          <span className="truncate">{cat.kategori}</span>
                          <span className="text-[10px] text-muted font-normal shrink-0">({cat.qty} terjual)</span>
                        </div>
                        <span className="font-black text-fg shrink-0 text-right">
                          Rp {cat.total.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-card rounded-full overflow-hidden flex border border-line/40">
                        <div
                          style={{ width: `${Math.max(4, percent)}%` }}
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-muted font-semibold">
                        <span>Kontribusi</span>
                        <span>{percent}% dari omzet</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Akses Cepat Navigasi */}
      <div>
        <h3 className="text-sm font-black text-fg mb-3 uppercase tracking-wider text-[11px]">
          Akses Cepat Pengelolaan
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Link
            href="/admin/menu"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-accent transition-all flex flex-col items-center text-center group"
          >
            <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🍽️</span>
            <span className="text-xs font-bold text-fg">Kelola Menu</span>
            <span className="text-[10px] text-muted mt-0.5">Daftar & stok</span>
          </Link>

          <Link
            href="/admin/meja"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-accent transition-all flex flex-col items-center text-center group"
          >
            <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🪑</span>
            <span className="text-xs font-bold text-fg">Kelola Meja</span>
            <span className="text-[10px] text-muted mt-0.5">Tata letak meja</span>
          </Link>

          <Link
            href="/admin/transaksi"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-accent transition-all flex flex-col items-center text-center group"
          >
            <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">🧾</span>
            <span className="text-xs font-bold text-fg">Transaksi</span>
            <span className="text-[10px] text-muted mt-0.5">Riwayat & void</span>
          </Link>

          <Link
            href="/admin/shift"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-accent transition-all flex flex-col items-center text-center group"
          >
            <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">💼</span>
            <span className="text-xs font-bold text-fg">Shift & Kas</span>
            <span className="text-[10px] text-muted mt-0.5">Z-Report & laci</span>
          </Link>

          <Link
            href="/admin/pengaturan"
            className="p-4 rounded-2xl bg-surface border border-line hover:border-accent transition-all flex flex-col items-center text-center group col-span-2 sm:col-span-1"
          >
            <span className="text-2xl mb-1.5 group-hover:scale-110 transition-transform">⚙️</span>
            <span className="text-xs font-bold text-fg">Pengaturan</span>
            <span className="text-[10px] text-muted mt-0.5">Profil & printer</span>
          </Link>
        </div>
      </div>

      {/* Ringkasan Kas Shift & Transaksi Terkini */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Kas Laci */}
        <div className=" bg-surface rounded-3xl p-5 border border-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="text-sm font-black text-fg flex items-center gap-2">
                <span>💵</span>
                <span>Kas Laci Saat Ini</span>
              </h4>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${activeShift ? ' bg-accent text-accent-text' : ' bg-card text-muted'}`}>
                {activeShift ? 'Shift Aktif' : 'Shift Nonaktif'}
              </span>
            </div>

            {activeShift && shiftStats ? (
              <div className="mt-4 space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Modal Awal:</span>
                  <span className="font-bold text-fg">Rp {(shiftStats.startingCash || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Penjualan Tunai:</span>
                  <span className="font-bold text-accent-text">Rp {(shiftStats.cashSales || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Kas Masuk (+):</span>
                  <span className="font-bold text-accent-text">Rp {(shiftStats.cashIn || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Kas Keluar (-):</span>
                  <span className="font-bold text-rose-400">-Rp {(shiftStats.cashOut || 0).toLocaleString("id-ID")}</span>
                </div>
                <div className="pt-2 border-t border-line flex justify-between items-center text-sm">
                  <span className="font-bold text-fg">Estimasi Uang Fisik:</span>
                  <span className="font-black text-accent-text text-base">
                    Rp {(shiftStats.expectedCash || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-muted text-xs">
                Belum ada shift yang dibuka di kasir. Silakan buka shift dari aplikasi POS.
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-line">
            <Link
              href="/admin/shift"
              className="w-full py-2.5 bg-card hover:bg-line text-slate-300 rounded-xl text-xs font-bold block text-center transition-colors"
            >
              Lihat Riwayat Shift Lengkap →
            </Link>
          </div>
        </div>

        {/* 5 Transaksi Terkini */}
        <div className="lg:col-span-2 bg-surface rounded-3xl p-5 border border-line shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h4 className="text-sm font-black text-fg flex items-center gap-2">
                <span>🧾</span>
                <span>Transaksi Terkini</span>
              </h4>
              <Link
                href="/admin/transaksi"
                className="text-xs font-bold text-accent-text hover:underline"
              >
                Lihat Semua ({orders.length}) →
              </Link>
            </div>

            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-muted text-xs">
                Belum ada data transaksi yang tercatat.
              </div>
            ) : (
              <div className="divide-y divide-line mt-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-fg">
                          Nota #{order.id}
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          order.status === 'paid'
                            ? ' bg-accent/60 text-accent-text'
                            : order.status === 'void'
                            ? ' bg-rose-950/60 text-rose-300 line-through'
                            : ' bg-amber-950/60 text-amber-300'
                        }`}>
                          {order.status === 'paid' ? 'LUNAS' : order.status === 'void' ? 'VOID' : 'OPEN BILL'}
                        </span>
                      </div>
                      <span className="text-[10px] text-muted">
                        {order.tableName || order.orderType || 'Kasir'} • {order.customerName || 'Tamu'}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="font-black text-fg block">
                        Rp {(order.total || 0).toLocaleString("id-ID")}
                      </span>
                      <span className="text-[10px] text-muted">
                        {order.paymentMethod || 'Cash'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-line flex justify-between items-center text-xs text-muted">
            <span>SakuNota Offline Engine</span>
            <span className="font-bold text-accent-text">● Tersinkronisasi</span>
          </div>
        </div>
      </div>

      {/* Modal Kirim Laporan ke WhatsApp */}
      {isWaModalOpen && (
        <div 
          onClick={() => setIsWaModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl cursor-default"
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">📲</span>
                <div>
                  <h3 className="font-black text-base text-fg">Kirim Laporan ke WhatsApp</h3>
                  <span className="text-[10px] text-muted">Pesan rapih siap kirim tanpa biaya sistem tambahan</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="w-8 h-8 rounded-full bg-card hover:bg-line text-muted hover:text-fg text-sm flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Pilihan Periode Laporan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-muted uppercase tracking-wider block">
                Pilih Periode Laporan:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs font-bold">
                {[
                  { id: "today", label: "Hari Ini" },
                  { id: "yesterday", label: "Kemarin" },
                  { id: "7days", label: "7 Hari Terakhir" },
                  { id: "thisMonth", label: "Bulan Ini" },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setWaPeriod(p.id as any)}
                    className={`py-2 px-2.5 rounded-xl border text-center transition-all ${
                      waPeriod === p.id
                        ? "bg-accent border-accent text-white shadow-sm"
                        : "bg-card border-line text-slate-700 dark:text-slate-300 hover:text-fg hover:border-slate-400"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Pratinjau Teks Laporan */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[11px]">
                <span className="font-bold text-muted uppercase tracking-wider">
                  Pratinjau Pesan ({filteredWaOrders.length} Transaksi):
                </span>
                <span className="font-bold text-blue-600">
                  Rp {periodOmzet.toLocaleString("id-ID")}
                </span>
              </div>
              <pre className="p-4 rounded-2xl bg-card border border-line font-mono text-[11px] text-fg whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto select-all">
                {generateWaReportMessage()}
              </pre>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleCopyWaReport}
                className="flex-1 py-3 px-4 bg-card hover:bg-line text-fg text-xs font-bold rounded-xl border border-line transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>{copiedReport ? "✅ Tersalin!" : "📋 Salin Teks"}</span>
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsAppUrl}
                className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>Kirim ke WhatsApp Sekarang →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
