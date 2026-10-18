"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/dexie";
import { selectDashboardOrders, buildSalesSeries } from "@/lib/dashboardMetrics";
import { useAdmin } from "./AdminContext";
import { getOrders, getActiveShift, getShiftLiveStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const { storeSettings } = useAdmin();
  const [orders, setOrders] = useState<any[]>([]);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftStats, setShiftStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Shopify-Style Date Range Filter
  const [timeRange, setTimeRange] = useState<"today" | "yesterday" | "7days" | "30days" | "thisMonth">("7days");
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    sublabel: string;
    omzet: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

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

  const orderRevision = useLiveQuery(() => db.table("orders").toArray(), []);
  const paymentRevision = useLiveQuery(() => db.table("payments").toArray(), []);
  useEffect(() => { let current = true; getOrders().then(data => { if (current) setOrders(data); }); return () => { current = false; }; }, [orderRevision, paymentRevision]);

  const { currentOrders, previousOrders } = selectDashboardOrders(orders, timeRange);

  // Current Metrics
  const currentGrossSales = currentOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const currentOrderCount = currentOrders.length;
  const currentAov = currentOrderCount > 0 ? Math.round(currentGrossSales / currentOrderCount) : 0;
  const currentUnitsSold = currentOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((iSum: number, item: any) => iSum + (item.qty || 1), 0);
  }, 0);

  // Previous Metrics for Delta Calculation
  const prevGrossSales = previousOrders.reduce((sum, o) => sum + (o.total || 0), 0);
  const prevOrderCount = previousOrders.length;
  const prevAov = prevOrderCount > 0 ? Math.round(prevGrossSales / prevOrderCount) : 0;
  const prevUnitsSold = previousOrders.reduce((sum, o) => {
    return sum + (o.items || []).reduce((iSum: number, item: any) => iSum + (item.qty || 1), 0);
  }, 0);

  const calcDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const deltaSales = calcDelta(currentGrossSales, prevGrossSales);
  const deltaOrders = calcDelta(currentOrderCount, prevOrderCount);
  const deltaAov = calcDelta(currentAov, prevAov);
  const deltaUnits = calcDelta(currentUnitsSold, prevUnitsSold);

  const chartPoints = buildSalesSeries(currentOrders, timeRange);

  const maxChartOmzet = Math.max(...chartPoints.map((p) => p.omzet), 50000);
  const chartCeiling = maxChartOmzet > 0 ? Math.ceil(maxChartOmzet * 1.15) : 100000;

  // SVG dimensions for smooth bezier curve
  const svgW = 800;
  const svgH = 220;
  const paddingX = 40;
  const paddingY = 25;
  const usableW = svgW - paddingX * 2;
  const usableH = svgH - paddingY * 2;

  const svgCoords = chartPoints.map((p, i) => {
    const x = paddingX + (i / Math.max(1, chartPoints.length - 1)) * usableW;
    const y = paddingY + usableH - (p.omzet / chartCeiling) * usableH;
    return { x, y, ...p };
  });

  // Construct smooth SVG path (Cubic Bezier Spline)
  const svgPathD = useMemo(() => {
    if (svgCoords.length === 0) return "";
    let d = `M ${svgCoords[0].x} ${svgCoords[0].y}`;
    for (let i = 0; i < svgCoords.length - 1; i++) {
      const p0 = svgCoords[i];
      const p1 = svgCoords[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) / 2;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) / 2;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  }, [svgCoords]);

  const svgAreaD = useMemo(() => {
    if (svgCoords.length === 0) return "";
    const bottomY = paddingY + usableH;
    let d = svgPathD;
    d += ` L ${svgCoords[svgCoords.length - 1].x} ${bottomY}`;
    d += ` L ${svgCoords[0].x} ${bottomY} Z`;
    return d;
  }, [svgPathD, svgCoords, paddingY, usableH]);

  // Payment Breakdown (Shopify Sales by Channel)
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {
      Cash: { total: 0, count: 0 },
      QRIS: { total: 0, count: 0 },
      Transfer: { total: 0, count: 0 },
    };

    currentOrders.forEach((o) => {
      const payments = o.payments?.length ? o.payments.filter((p: any) => p.status === 'completed') : [{ paymentMethod: o.paymentMethod || 'Cash', amount: o.total }];
      payments.forEach((p: any) => {
        const method = String(p.paymentMethod || 'Cash').toLowerCase();
        const key = method.includes('qris') ? 'QRIS' : method.includes('transfer') ? 'Transfer' : 'Cash';
        map[key].total += p.amount || 0; map[key].count += 1;
      });
    });

    const total = currentGrossSales || 1;
    return Object.entries(map).map(([method, data]) => ({
      method,
      total: data.total,
      count: data.count,
      percent: Math.round((data.total / total) * 100),
    }));
  }, [currentOrders, currentGrossSales]);

  // Top Products by Units Sold (Shopify Top Products)
  const topProducts = useMemo(() => {
    const itemMap: Record<string, { qty: number; revenue: number; kategori: string }> = {};

    currentOrders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        const name = item.name || item.nama || item.menuName || "Menu";
        const cat = item.kategori || item.category || "Umum";
        const price = item.harga ?? item.price ?? item.hargaSatuan ?? 0;
        const qty = item.qty || 1;

        if (!itemMap[name]) itemMap[name] = { qty: 0, revenue: 0, kategori: cat };
        itemMap[name].qty += qty;
        itemMap[name].revenue += price * qty;
      });
    });

    return Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [currentOrders]);

  // WhatsApp Report Export Modal State
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const generateWaReportMessage = () => {
    const store = storeSettings.storeName || "SakuNota";
    const dateFormatted = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    let msg = `*RINGKASAN PENJUALAN SAKUNOTA*\n`;
    msg += `Toko: ${store}\n`;
    msg += `Tanggal: ${dateFormatted}\n\n`;
    msg += `💰 *Omzet*: Rp ${currentGrossSales.toLocaleString("id-ID")}\n`;
    msg += `🧾 *Transaksi Selesai*: ${currentOrderCount} nota\n`;
    msg += `📦 *Porsi Terjual*: ${currentUnitsSold} item\n`;
    msg += `📊 *Rata-rata Nota (AOV)*: Rp ${currentAov.toLocaleString("id-ID")}\n\n`;

    if (topProducts.length > 0) {
      msg += `*MENU PALING LARIS*\n`;
      topProducts.forEach((p, i) => {
        msg += `${i + 1}. ${p.name} (${p.qty} unit) - Rp ${p.revenue.toLocaleString("id-ID")}\n`;
      });
      msg += `\n`;
    }

    msg += `_Dibuat dengan Aplikasi Kasir SakuNota 100% Offline_`;
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
    <div className="business-dashboard space-y-6 animate-in fade-in duration-200">
      {/* 1. Header with Store Identity, Shopify-style Period Selector, and Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-fg tracking-tight">
              Dashboard usaha
            </h2>
          </div>
          <p className="text-xs text-muted mt-0.5">
            {storeSettings.storeName || "SakuNota"} • Transaksi lunas, tren penjualan, dan produk terlaris pada perangkat toko ini.
          </p>
        </div>

        {/* Controls: Date Range Selector & Quick Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Pills */}
          <div className="bg-card border border-line p-1 rounded-2xl flex items-center gap-1 text-xs font-bold shadow-xs">
            {[
              { id: "today", label: "Hari ini" },
              { id: "yesterday", label: "Kemarin" },
              { id: "7days", label: "7 Hari" },
              { id: "30days", label: "30 Hari" },
              { id: "thisMonth", label: "Bulan Ini" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTimeRange(t.id as any)}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeRange === t.id
                    ? "bg-accent text-white shadow-sm font-black"
                    : "text-muted hover:text-fg"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsWaModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>Kirim WA</span>
          </button>

          <Link
            href="/pos"
            className="px-3.5 py-2 bg-card hover:bg-line border border-line text-fg rounded-xl text-xs font-bold transition-colors"
          >
            Buka Kasir →
          </Link>
        </div>
      </div>

      {/* 2. Four Shopify-Grade Metric Cards with Delta Growth Badges */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Total Omzet */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">Total Penjualan</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              deltaSales >= 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}>
              {deltaSales >= 0 ? "▲ +" : "▼ "}
              {deltaSales}%
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-fg break-words tabular-nums">
              Rp {currentGrossSales.toLocaleString("id-ID")}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              vs Rp {prevGrossSales.toLocaleString("id-ID")} periode lalu
            </span>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">Total Pesanan</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              deltaOrders >= 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}>
              {deltaOrders >= 0 ? "▲ +" : "▼ "}
              {deltaOrders}%
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-fg break-words tabular-nums">
              {currentOrderCount} <span className="text-xs font-semibold text-muted">transaksi</span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              vs {prevOrderCount} transaksi lalu
            </span>
          </div>
        </div>

        {/* Metric 3: AOV (Average Order Value) */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">Rata-rata Nota (AOV)</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              deltaAov >= 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}>
              {deltaAov >= 0 ? "▲ +" : "▼ "}
              {deltaAov}%
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-2xl font-black text-fg break-words tabular-nums">
              Rp {currentAov.toLocaleString("id-ID")}
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              vs Rp {prevAov.toLocaleString("id-ID")} lalu
            </span>
          </div>
        </div>

        {/* Metric 4: Total Units Sold */}
        <div className="p-4 sm:p-5 rounded-3xl bg-surface border border-line shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted">Unit terjual</span>
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
              deltaUnits >= 0
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}>
              {deltaUnits >= 0 ? "▲ +" : "▼ "}
              {deltaUnits}%
            </span>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-black text-fg truncate">
              {currentUnitsSold} <span className="text-xs font-semibold text-muted">unit</span>
            </div>
            <span className="text-[10px] text-muted block mt-0.5">
              vs {prevUnitsSold} unit lalu
            </span>
          </div>
        </div>
      </div>

      {/* 3. The Core Visual: Shopify-Style Area Trend Graph with Hover Tooltip */}
      <div className="bg-surface rounded-3xl p-5 sm:p-7 border border-line shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
          <div>
            <h3 className="text-base font-black text-fg flex items-center gap-2">
              
              <span>Tren penjualan</span>
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Penjualan lunas per interval • sentuh titik grafik untuk melihat detail
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-black text-accent-text bg-accent/10 px-3 py-1 rounded-xl">
              Akumulasi: Rp {currentGrossSales.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Interactive SVG Area Chart */}
        <div className="relative pt-4 pb-2 select-none">
          {/* Subtle Horizontal Reference Grid Lines */}
          <div className="absolute inset-x-2 top-8 bottom-12 flex flex-col justify-between pointer-events-none opacity-30">
            {[1, 0.75, 0.5, 0.25, 0].map((ratio) => {
              const val = Math.round(chartCeiling * ratio);
              return (
                <div key={ratio} className="border-b border-dashed border-line w-full flex justify-end">
                  <span className="text-[9px] font-mono text-muted bg-surface px-1 -mt-2.5">
                    Rp {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                  </span>
                </div>
              );
            })}
          </div>

          {/* SVG Canvas */}
          <div className="w-full overflow-hidden relative">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full h-56 sm:h-64 overflow-visible"
            >
              <defs>
                <linearGradient id="shopifyGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2563EB" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#38BDF8" stopOpacity="0.10" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.00" />
                </linearGradient>
              </defs>

              {/* Gradient Area Fill */}
              {svgAreaD && (
                <path
                  d={svgAreaD}
                  fill="url(#shopifyGradient)"
                  className="transition-all duration-300"
                />
              )}

              {/* Stroke Curve Line */}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="transition-all duration-300"
                />
              )}

              {/* Interactive Data Nodes */}
              {svgCoords.map((coord, idx) => {
                const isHovered = hoveredPoint?.label === coord.label && hoveredPoint?.sublabel === coord.sublabel;
                return (
                  <g
                    key={idx}
                    onMouseEnter={() => setHoveredPoint(coord)}
                    onClick={() => setHoveredPoint(coord)}
                    className="cursor-pointer"
                  >
                    {/* Hover hotspot hit-box */}
                    <circle cx={coord.x} cy={coord.y} r="18" fill="transparent" />

                    {/* Visible Node */}
                    <circle
                      cx={coord.x}
                      cy={coord.y}
                      r={isHovered ? "6" : coord.omzet > 0 ? "4" : "2.5"}
                      fill={isHovered ? "#2563EB" : coord.omzet > 0 ? "#2563EB" : "#94A3B8"}
                      stroke="#FFFFFF"
                      strokeWidth={isHovered ? "2.5" : "1.5"}
                      className="transition-all duration-150"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip Box */}
            {hoveredPoint && (
              <div
                style={{
                  left: `${(hoveredPoint.x / svgW) * 100}%`,
                  top: `${(hoveredPoint.y / svgH) * 100}%`,
                }}
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full mb-3"
              >
                <div className="bg-slate-900 text-white rounded-2xl px-3.5 py-2 shadow-2xl border border-slate-700 text-xs min-w-[140px] text-center space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
                  <span className="text-[10px] text-slate-400 font-bold block">
                    {hoveredPoint.sublabel} ({hoveredPoint.label})
                  </span>
                  <div className="text-sm font-black text-sky-400">
                    Rp {hoveredPoint.omzet.toLocaleString("id-ID")}
                  </div>
                  <span className="text-[10px] text-slate-300 font-semibold block">
                    {hoveredPoint.count} pesanan
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom X-Axis Labels */}
          <div className="flex justify-between items-center text-[10px] font-bold text-muted px-2 pt-2 border-t border-line">
            {chartPoints.map((p, idx) => (
              <div key={idx} className="text-center flex-1 truncate">
                <span className="block font-black text-fg truncate">{p.label}</span>
                <span className="text-[9px] text-muted truncate">{p.sublabel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. Two Lower Shopify Analytics Panels: Payment Channels & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel A: Sales by Payment Method (Shopify Channel Breakdown) */}
        <div className="bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h4 className="text-sm font-black text-fg flex items-center gap-2">
                
                <span>Komposisi Metode Pembayaran</span>
              </h4>
              <p className="text-xs text-muted mt-0.5">Distribusi penerimaan kasir (Tunai vs Non-Tunai)</p>
            </div>
            <span className="text-[11px] font-bold text-muted">
              {currentOrderCount} transaksi
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {paymentBreakdown.map((item) => {
              const badgeColors: Record<string, string> = {
                Cash: "bg-emerald-500",
                QRIS: "bg-blue-600",
                Transfer: "bg-indigo-600",
              };
              const color = badgeColors[item.method] || "bg-accent";

              return (
                <div key={item.method} className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                      <strong className="text-fg">{item.method}</strong>
                      <span className="text-[10px] text-muted">({item.count} nota)</span>
                    </div>
                    <div className="text-right">
                      <strong className="text-fg">Rp {item.total.toLocaleString("id-ID")}</strong>
                      <span className="text-[10px] text-muted ml-2 font-bold">{item.percent}%</span>
                    </div>
                  </div>

                  <div className="w-full h-2.5 bg-card rounded-full overflow-hidden border border-line">
                    <div
                      style={{ width: `${Math.max(2, item.percent)}%` }}
                      className={`h-full ${color} rounded-full transition-all duration-500`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Panel B: Top 5 Menu Paling Laris (Shopify Top Products) */}
        <div className="bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div>
              <h4 className="text-sm font-black text-fg flex items-center gap-2">
                
                <span>5 Menu Terlaris (Top Products)</span>
              </h4>
              <p className="text-xs text-muted mt-0.5">Produk dengan perputaran unit tertinggi</p>
            </div>
            <Link
              href="/admin/menu"
              className="text-xs font-bold text-accent-text hover:underline"
            >
              Lihat Semua →
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {topProducts.length === 0 ? (
              <div className="py-8 text-center text-muted text-xs">
                Belum ada data unit terjual pada rentang waktu ini.
              </div>
            ) : (
              topProducts.map((p, idx) => {
                const maxQty = topProducts[0]?.qty || 1;
                const percent = Math.round((p.qty / maxQty) * 100);

                return (
                  <div
                    key={p.name}
                    className="p-3 rounded-2xl bg-card border border-line flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-xl bg-accent/15 text-accent-text flex items-center justify-center font-black text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <strong className="text-fg truncate block">{p.name}</strong>
                        <span className="text-[10px] text-muted block">
                          {p.kategori} • Rp {p.revenue.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="font-black text-fg text-sm block">
                        {p.qty} <span className="text-[10px] font-normal text-muted">unit</span>
                      </span>
                      <div className="w-20 h-1.5 bg-line rounded-full overflow-hidden mt-1 ml-auto">
                        <div
                          style={{ width: `${percent}%` }}
                          className="h-full bg-accent rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 5. WhatsApp Export Modal */}
      {isWaModalOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsWaModalOpen(false)}
        >
          <div
            className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-black text-sm text-fg flex items-center gap-2">
                
                <span>Kirim Laporan Omzet ke WhatsApp</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="w-7 h-7 rounded-full bg-card text-muted hover:text-fg font-bold flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 bg-card rounded-2xl border border-line font-mono text-xs whitespace-pre-line text-fg max-h-56 overflow-y-auto leading-relaxed">
              {generateWaReportMessage()}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={handleCopyWaReport}
                className="flex-1 py-2.5 rounded-xl border border-line bg-card hover:bg-line text-xs font-bold text-fg transition-colors"
              >
                {copiedReport ? "✓ Tersalin!" : "Salin Teks"}
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsAppUrl}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h18v14H8l-5 4zM7 7h10M7 12h7" /></svg></span>
                <span>Buka WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
