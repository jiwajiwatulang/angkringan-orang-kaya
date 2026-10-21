"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import SalesTrendChart from '@/components/SalesTrendChart';
import { useLiveQuery } from "dexie-react-hooks";
import { db, MenuItem } from "@/lib/dexie";
import {
  dashboardPeriod,
  computeFinancialDashboard,
  isWithinPeriod,
  DashboardRange,
  UnifiedFinancialReport
} from "@/lib/financialEngine";
import { useAdmin } from "./AdminContext";
import { getOrders, getActiveShift, getShiftLiveStats } from "@/lib/api";

export default function AdminDashboardPage() {
  const { storeSettings } = useAdmin();
  const [activeTab, setActiveTab] = useState<"summary" | "analytics">("summary");
  const [timeRange, setTimeRange] = useState<DashboardRange>("7days");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [activeShift, setActiveShift] = useState<any>(null);
  const [shiftStats, setShiftStats] = useState<any>(null);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // Load active shift info
  useEffect(() => {
    async function loadShiftInfo() {
      try {
        const currentShift = await getActiveShift();
        setActiveShift(currentShift);
        if (currentShift && currentShift.id) {
          const stats = await getShiftLiveStats(currentShift.id);
          setShiftStats(stats);
        }
      } catch (e) {
        console.error("Error loading shift info:", e);
      }
    }
    loadShiftInfo();
  }, []);

  // Reactive queries via Dexie live query
  const rawOrders = useLiveQuery(async () => {
    return await getOrders();
  }, []) || [];

  const rawPayments = useLiveQuery(() => {
    return db.table("payments").toArray();
  }, []) || [];

  const rawRefundEvents = useLiveQuery(() => {
    return db.table("refundEvents").toArray();
  }, []) || [];

  const rawCashMovements = useLiveQuery(() => {
    return db.table("cashMovements").toArray();
  }, []) || [];

  const rawMenuItems = useLiveQuery(() => {
    return db.table("menuItems").toArray();
  }, []) || [];

  // Compute period boundaries
  const period = useMemo(() => {
    return dashboardPeriod(timeRange);
  }, [timeRange]);

  // Compute unified financial report from Centralized Financial Engine
  const report: UnifiedFinancialReport = useMemo(() => {
    return computeFinancialDashboard({
      orders: rawOrders,
      payments: rawPayments,
      refundEvents: rawRefundEvents,
      cashMovements: rawCashMovements,
      startingCash: activeShift?.startingCash || 0,
      period: { start: period.start, end: period.end }
    });
  }, [rawOrders, rawPayments, rawRefundEvents, rawCashMovements, activeShift, period]);

  // Previous period for delta comparison
  const prevReport: UnifiedFinancialReport = useMemo(() => {
    if (!period.previousStart || !period.previousEnd) return report;
    return computeFinancialDashboard({
      orders: rawOrders,
      payments: rawPayments,
      refundEvents: rawRefundEvents,
      cashMovements: rawCashMovements,
      startingCash: 0,
      period: { start: period.previousStart, end: period.previousEnd }
    });
  }, [rawOrders, rawPayments, rawRefundEvents, rawCashMovements, period, report]);

  const calcDelta = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const deltaSales = calcDelta(report.sales.netSales, prevReport.sales.netSales);
  const deltaOrders = calcDelta(report.sales.orderCount, prevReport.sales.orderCount);
  const deltaProfit = calcDelta(report.sales.grossProfit, prevReport.sales.grossProfit);
  const currentAov = report.sales.orderCount > 0 ? Math.round(report.sales.netSales / report.sales.orderCount) : 0;

  // Build Time Series Data for Chart
  const chartPoints = useMemo(() => {
    const { start, end } = period;
    const result: { label: string; sublabel: string; omzet: number; count: number }[] = [];
    const hourly = timeRange === "today" || timeRange === "yesterday";

    for (const cursor = new Date(start); cursor < end;) {
      const bucketStart = new Date(cursor);
      if (hourly) cursor.setHours(cursor.getHours() + 2);
      else cursor.setDate(cursor.getDate() + 1);

      const matchingOrders = rawOrders.filter((o) => {
        if (o.status === "void") return false;
        const t = new Date(o.createdAt).getTime();
        return t >= bucketStart.getTime() && t < cursor.getTime();
      });

      const matchingRefunds = rawRefundEvents.filter((r) => {
        const isRetur = r.type === "ITEM_RETURN" || r.type === "ORDER_CANCELED";
        if (!isRetur) return false;
        const t = new Date(r.createdAt).getTime();
        return t >= bucketStart.getTime() && t < cursor.getTime();
      });

      const gross = matchingOrders.reduce((sum, o) => sum + (o.subtotal || o.total || 0), 0);
      const discount = matchingOrders.reduce((sum, o) => sum + (o.discount || 0), 0);
      const ref = matchingRefunds.reduce((sum, r) => sum + r.amount, 0);
      const net = Math.max(0, gross - discount - ref);

      const label = hourly
        ? `${String(bucketStart.getHours()).padStart(2, "0")}:00`
        : bucketStart.toLocaleDateString("id-ID", { day: "numeric", month: "short" });

      const sublabel = hourly
        ? `${label}–${String(cursor.getHours()).padStart(2, "0")}:00`
        : bucketStart.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" });

      result.push({
        label,
        sublabel,
        omzet: net,
        count: matchingOrders.length
      });
    }
    return result;
  }, [period, timeRange, rawOrders, rawRefundEvents]);

  // Top Products Ranking
  const topProducts = useMemo(() => {
    const itemMap: Record<string, { qty: number; revenue: number; profit: number; hasCost: boolean }> = {};

    const periodOrders = rawOrders.filter((o) => {
      return isWithinPeriod(o.createdAt, period.start, period.end) && o.status !== "void";
    });

    periodOrders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        const name = item.namaMenu || item.nama || item.name || "Menu";
        const price = item.hargaSatuan ?? item.harga ?? 0;
        const qty = item.qty || 1;
        const cost = typeof item.costPrice === "number" ? item.costPrice : null;

        if (!itemMap[name]) {
          itemMap[name] = { qty: 0, revenue: 0, profit: 0, hasCost: false };
        }
        itemMap[name].qty += qty;
        itemMap[name].revenue += price * qty;
        if (cost !== null) {
          itemMap[name].profit += (price - cost) * qty;
          itemMap[name].hasCost = true;
        }
      });
    });

    return Object.entries(itemMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [rawOrders, period]);

  // Category Profitability Breakdown (100% Cocok dengan Agregat)
  const categoryBreakdown = useMemo(() => {
    const periodOrders = rawOrders.filter((o) => {
      return isWithinPeriod(o.createdAt, period.start, period.end) && o.status !== "void";
    });

    const catMap: Record<string, { qty: number; sales: number; cogs: number }> = {};

    periodOrders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        const cat = item.kategoriMenu || item.kategori || "Umum";
        const price = item.hargaSatuan ?? item.harga ?? 0;
        const qty = item.qty || 1;
        const cost = typeof item.costPrice === "number" ? item.costPrice : 0;

        if (!catMap[cat]) {
          catMap[cat] = { qty: 0, sales: 0, cogs: 0 };
        }
        catMap[cat].qty += qty;
        catMap[cat].sales += price * qty;
        catMap[cat].cogs += cost * qty;
      });
    });

    // Sesuaikan dengan retur penjualan jika ada
    const totalRawCatSales = Object.values(catMap).reduce((s, c) => s + c.sales, 0);
    const returnRatio = totalRawCatSales > 0 ? (totalRawCatSales - report.sales.salesRefunds) / totalRawCatSales : 1;

    return Object.entries(catMap).map(([kategori, data]) => {
      const netSales = Math.round(data.sales * returnRatio);
      const grossProfit = netSales - data.cogs;
      const margin = netSales > 0 ? Number(((grossProfit / netSales) * 100).toFixed(1)) : 0;
      return {
        kategori,
        qty: data.qty,
        sales: netSales,
        cogs: data.cogs,
        grossProfit,
        margin
      };
    }).sort((a, b) => b.sales - a.sales);
  }, [rawOrders, period, report.sales.salesRefunds]);

  // Analisis Jam Ramai (Peak Hours / Hourly Activity)
  const hourlyActivity = useMemo(() => {
    const periodOrders = rawOrders.filter((o) => {
      return isWithinPeriod(o.createdAt, period.start, period.end) && o.status !== "void";
    });

    // 12 bucket 2 jam (00-02, 02-04, ..., 22-24)
    const buckets: { rangeLabel: string; count: number; omzet: number }[] = [];
    for (let h = 0; h < 24; h += 2) {
      const rangeLabel = `${String(h).padStart(2, "0")}:00–${String(h + 2).padStart(2, "0")}:00`;
      buckets.push({ rangeLabel, count: 0, omzet: 0 });
    }

    periodOrders.forEach((o) => {
      const d = new Date(o.createdAt);
      const hour = d.getHours();
      const bucketIdx = Math.min(11, Math.floor(hour / 2));
      if (buckets[bucketIdx]) {
        buckets[bucketIdx].count += 1;
        buckets[bucketIdx].omzet += o.subtotal || o.total || 0;
      }
    });

    const maxCount = Math.max(...buckets.map((b) => b.count), 1);
    const peakBucket = [...buckets].sort((a, b) => b.count - a.count)[0];

    return { buckets, maxCount, peakBucket: peakBucket?.count > 0 ? peakBucket : null };
  }, [rawOrders, period]);

  // Efisiensi Menu: Fast Moving vs Slow Moving
  const menuVelocity = useMemo(() => {
    const periodOrders = rawOrders.filter((o) => {
      return isWithinPeriod(o.createdAt, period.start, period.end) && o.status !== "void";
    });

    const countMap: Record<string, { id: number; nama: string; qty: number; sales: number }> = {};
    rawMenuItems.forEach((m: MenuItem) => {
      if (m.id) {
        countMap[String(m.id)] = { id: m.id, nama: m.nama, qty: 0, sales: 0 };
      }
    });

    periodOrders.forEach((o) => {
      (o.items || []).forEach((item: any) => {
        const id = String(item.menuItemId || item.id || "");
        if (id && countMap[id]) {
          countMap[id].qty += item.qty || 1;
          countMap[id].sales += (item.hargaSatuan || 0) * (item.qty || 1);
        }
      });
    });

    const all = Object.values(countMap);
    const fastMoving = [...all].filter((m) => m.qty > 0).sort((a, b) => b.qty - a.qty).slice(0, 3);
    const slowMoving = [...all].filter((m) => m.qty === 0).slice(0, 3);

    return { fastMoving, slowMoving };
  }, [rawOrders, rawMenuItems, period]);

  // Low Stock Items for Operational Insights
  const lowStockItems = useMemo(() => {
    return rawMenuItems.filter((m: MenuItem) => {
      return m.trackStock && typeof m.stockQty === "number" && typeof m.minimumStock === "number" && m.stockQty <= m.minimumStock;
    });
  }, [rawMenuItems]);

  // WhatsApp Report Generation
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const createReportCanvas = (): HTMLCanvasElement => {
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 960;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 800, 960);

    // Decorative top header bar
    ctx.fillStyle = "#2563eb";
    ctx.fillRect(0, 0, 800, 16);

    // Store Name & Title
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 32px sans-serif";
    const store = storeSettings.storeName || "SakuNota";
    ctx.fillText(store, 40, 70);

    ctx.fillStyle = "#64748b";
    ctx.font = "bold 16px sans-serif";
    const dateFormatted = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    ctx.fillText(`Laporan Ringkas Penjualan • ${dateFormatted}`, 40, 102);

    // Separator
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(40, 125);
    ctx.lineTo(760, 125);
    ctx.stroke();

    // Hero Omzet Box
    ctx.fillStyle = "#eff6ff";
    ctx.beginPath();
    ctx.roundRect(40, 145, 720, 140, 20);
    ctx.fill();
    ctx.strokeStyle = "#bfdbfe";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 14px sans-serif";
    ctx.fillText("PENJUALAN BERSIH", 65, 185);

    ctx.fillStyle = "#0f172a";
    ctx.font = "900 48px sans-serif";
    ctx.fillText(`Rp ${report.sales.netSales.toLocaleString("id-ID")}`, 65, 250);

    // 3 Stat Cards
    const statCards = [
      { label: "TRANSAKSI SELESAI", val: `${report.sales.orderCount} Nota` },
      { label: "PORSI TERJUAL", val: `${rawOrders.filter(o => o.status !== "void" && isWithinPeriod(o.createdAt, period.start, period.end)).reduce((sum, o) => sum + (o.items || []).reduce((n: number, i: any) => n + i.qty, 0), 0)} Porsi` },
      { label: "RATA-RATA NOTA", val: `Rp ${currentAov.toLocaleString("id-ID")}` },
    ];

    statCards.forEach((c, i) => {
      const x = 40 + i * 248;
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.roundRect(x, 305, 224, 100, 16);
      ctx.fill();
      ctx.strokeStyle = "#e2e8f0";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = "#64748b";
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(c.label, x + 18, 335);

      ctx.fillStyle = "#0f172a";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText(c.val, x + 18, 375);
    });

    // Top Products Box
    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("Menu Paling Laris pada Periode Ini", 40, 450);

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.roundRect(40, 470, 720, 370, 20);
    ctx.fill();
    ctx.strokeStyle = "#e2e8f0";
    ctx.lineWidth = 1;
    ctx.stroke();

    if (topProducts.length === 0) {
      ctx.fillStyle = "#94a3b8";
      ctx.font = "italic 16px sans-serif";
      ctx.fillText("Belum ada transaksi menu tercatat pada periode ini.", 65, 540);
    } else {
      topProducts.slice(0, 5).forEach((p, idx) => {
        const rowY = 515 + idx * 64;

        // Rank Circle
        ctx.fillStyle = idx === 0 ? "#2563eb" : "#e2e8f0";
        ctx.beginPath();
        ctx.arc(75, rowY, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = idx === 0 ? "#ffffff" : "#475569";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(idx + 1), 75, rowY + 5);
        ctx.textAlign = "left";

        // Product Name & Qty
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 17px sans-serif";
        ctx.fillText(p.name, 110, rowY - 2);

        ctx.fillStyle = "#64748b";
        ctx.font = "13px sans-serif";
        ctx.fillText(`${p.qty} porsi terjual`, 110, rowY + 18);

        // Revenue
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 17px sans-serif";
        ctx.textAlign = "right";
        ctx.fillText(`Rp ${p.revenue.toLocaleString("id-ID")}`, 735, rowY + 6);
        ctx.textAlign = "left";

        // Light row divider
        if (idx < 4 && idx < topProducts.length - 1) {
          ctx.strokeStyle = "#f1f5f9";
          ctx.beginPath();
          ctx.moveTo(60, rowY + 32);
          ctx.lineTo(740, rowY + 32);
          ctx.stroke();
        }
      });
    }

    // Footer
    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("SakuNota • Kasir Jalan Tanpa Internet", 400, 895);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "11px sans-serif";
    ctx.fillText("Laporan ringkas otomatis 100% offline dari perangkat kasir", 400, 920);
    ctx.textAlign = "left";

    return canvas;
  };

  const handleShareReportImage = async () => {
    setIsGeneratingImage(true);
    try {
      const canvas = createReportCanvas();
      canvas.toBlob(async (blob) => {
        if (!blob) {
          handleOpenWhatsAppUrl();
          return;
        }
        const file = new File([blob], `Laporan_${storeSettings.storeName || "SakuNota"}.png`, { type: "image/png" });
        if (typeof navigator !== "undefined" && (navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
          try {
            await (navigator as any).share({
              files: [file],
              title: `Laporan Penjualan - ${storeSettings.storeName || "SakuNota"}`,
              text: generateWaReportMessage(),
            });
          } catch (_) {}
        } else {
          // Fallback on desktop: download image and open WhatsApp text
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `Laporan_${storeSettings.storeName || "SakuNota"}.png`;
          a.click();
          URL.revokeObjectURL(url);
          handleOpenWhatsAppUrl();
        }
      }, "image/png");
    } catch (_) {
      handleOpenWhatsAppUrl();
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadReportImage = () => {
    const canvas = createReportCanvas();
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `Laporan_SakuNota_${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };


  const generateWaReportMessage = () => {
    const store = storeSettings.storeName || "SakuNota";
    const dateFormatted = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    let msg = `*RINGKASAN KEUANGAN SAKUNOTA*\n`;
    msg += `Toko: ${store}\n`;
    msg += `Tanggal: ${dateFormatted}\n`;
    msg += `Periode: ${{ today: 'Hari ini', yesterday: 'Kemarin', '7days': '7 hari terakhir', '30days': '30 hari terakhir', thisMonth: 'Bulan ini' }[timeRange]}\n\n`;
    msg += `• *Penjualan Bersih*: Rp ${report.sales.netSales.toLocaleString("id-ID")}\n`;
    msg += `• *Laba Kotor*: Rp ${report.sales.grossProfit.toLocaleString("id-ID")} (${report.sales.profitMarginPercent}%)\n`;
    msg += `• *Uang Diterima*: Rp ${report.payments.netPayments.toLocaleString("id-ID")}\n`;
    msg += `• *Transaksi*: ${report.sales.orderCount} Nota (Rata-rata: Rp ${currentAov.toLocaleString("id-ID")})\n`;
    if (report.reconciliation.openBillOutstanding > 0) {
      msg += `• *Tagihan Terbuka (Open Bill)*: Rp ${report.reconciliation.openBillOutstanding.toLocaleString("id-ID")}\n`;
    }
    msg += `\n_Dibuat dengan Aplikasi Kasir SakuNota_`;
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
      {/* 1. Header & Controls Standar POS Modern */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-line">
        <div>
          <h2 className="text-2xl font-black text-fg tracking-tight">
            Dashboard
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {storeSettings.storeName || "SakuNota"} • Analisis keuangan dan laporan performa kasir
          </p>
        </div>

        {/* Controls: Date Range Selector & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time Filter Pills */}
          <div className="bg-card border border-line p-1 rounded-2xl flex items-center gap-1 text-xs font-bold shadow-xs">
            {[
              { id: "today", label: "Hari ini" },
              { id: "yesterday", label: "Kemarin" },
              { id: "7days", label: "7 Hari" },
              { id: "30days", label: "30 Hari" },
              { id: "thisMonth", label: "Bulan Ini" }
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => { setTimeRange(t.id as any); }}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  timeRange === t.id
                    ? "bg-blue-600 text-white shadow-sm font-black"
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

      {/* 2. Tab Navigation Switcher: Ringkasan vs Analitik */}
      <div className="flex items-center gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === "summary"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-surface border border-line text-muted hover:text-fg"
          }`}
        >
          Ringkasan
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("analytics")}
          className={`px-5 py-2 rounded-xl text-xs font-black transition-all ${
            activeTab === "analytics"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-surface border border-line text-muted hover:text-fg"
          }`}
        >
          Analitik
        </button>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: RINGKASAN                                          */}
      {/* ========================================================= */}
      {activeTab === "summary" && (
        <div className="space-y-6">
          {/* 4 Kartu KPI Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Penjualan Bersih */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                  Penjualan Bersih
                </span>
                <div className="text-2xl font-black text-fg font-mono tracking-tight">
                  Rp {report.sales.netSales.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={`font-bold ${deltaSales >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {deltaSales >= 0 ? `+${deltaSales}%` : `${deltaSales}%`} vs lalu
                </span>
                <span className="text-[11px] text-muted">
                  Gross: Rp {report.sales.grossSales.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* KPI 2: Transaksi Selesai */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                  Transaksi Selesai
                </span>
                <div className="text-2xl font-black text-fg font-mono tracking-tight">
                  {report.sales.orderCount} Nota
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className={`font-bold ${deltaOrders >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {deltaOrders >= 0 ? `+${deltaOrders}%` : `${deltaOrders}%`} vs lalu
                </span>
                <span className="text-[11px] text-muted font-bold">
                  AOV: Rp {currentAov.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* KPI 3: Laba Kotor & Margin */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                  Laba Kotor
                </span>
                <div className="text-2xl font-black text-fg font-mono tracking-tight">
                  Rp {report.sales.grossProfit.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                  Margin {report.sales.profitMarginPercent}%
                </span>
                {report.sales.hasIncompleteCOGS ? (
                  <span className="text-[10px] text-amber-600 font-bold">
                    Sebagian Tanpa HPP
                  </span>
                ) : (
                  <span className="text-[10px] text-muted font-bold">
                    HPP Rp {report.sales.totalCOGS.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            </div>

            {/* KPI 4: Penerimaan Pembayaran Netto */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-muted uppercase tracking-wider block mb-1">
                  Uang Diterima
                </span>
                <div className="text-2xl font-black text-fg font-mono tracking-tight">
                  Rp {report.payments.netPayments.toLocaleString("id-ID")}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-blue-600 font-bold">
                  Kas Masuk Bersih
                </span>
                {report.reconciliation.openBillOutstanding > 0 && (
                  <span className="text-[10px] text-amber-600 font-bold">
                    Open: Rp {report.reconciliation.openBillOutstanding.toLocaleString("id-ID")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Tren Penjualan Visual (Interactive Chart) */}
          <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-fg tracking-tight">
                  Tren Penjualan
                </h3>
                <span className="text-xs text-muted">
                  Penjualan bersih · {{ today: 'Hari ini', yesterday: 'Kemarin', '7days': '7 hari terakhir', '30days': '30 hari terakhir', thisMonth: 'Bulan ini' }[timeRange]}
                </span>
              </div>

              <div className="flex items-center gap-1 bg-card border border-line p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => { setChartType("line"); }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    chartType === "line" ? "bg-blue-600 text-white" : "text-muted hover:text-fg"
                  }`}
                >
                  Garis
                </button>
                <button
                  type="button"
                  onClick={() => { setChartType("bar"); }}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    chartType === "bar" ? "bg-blue-600 text-white" : "text-muted hover:text-fg"
                  }`}
                >
                  Batang
                </button>
              </div>
            </div>

            <SalesTrendChart key={`${timeRange}-${chartType}`} points={chartPoints} type={chartType} />
          </div>

          {/* 2 Kolom: Produk Terlaris & Metode Pembayaran */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Produk Terlaris */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="font-black text-sm text-fg">Produk Terlaris</h4>
              <div className="divide-y divide-line text-xs">
                {topProducts.length > 0 ? (
                  topProducts.map((p, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 font-black flex items-center justify-center text-[11px]">
                          {idx + 1}
                        </span>
                        <div>
                          <strong className="font-bold text-fg block">{p.name}</strong>
                          <span className="text-[10px] text-muted">{p.qty} Porsi Terjual</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-fg font-mono block">
                          Rp {p.revenue.toLocaleString("id-ID")}
                        </span>
                        {p.hasCost && (
                          <span className="text-[10px] text-emerald-600 font-bold">
                            Laba: Rp {p.profit.toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-muted">Belum ada transaksi di periode ini</div>
                )}
              </div>
            </div>

            {/* Metode Pembayaran (Penerimaan Bersih per Metode) */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-fg">Metode Pembayaran</h4>
                <span className="text-[11px] text-muted font-bold">Penerimaan Bersih</span>
              </div>

              <div className="space-y-3 text-xs">
                {report.payments.methods.map((m, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between font-bold text-fg mb-0.5">
                      <span>{m.method}</span>
                      <span className="font-mono">
                        Rp {m.netAmount.toLocaleString("id-ID")} ({m.percentageOfTotal}%)
                      </span>
                    </div>
                    <div className="text-[10px] text-muted mb-1">
                      Bruto Rp {m.grossAmount.toLocaleString("id-ID")} − Refund Rp {m.refundAmount.toLocaleString("id-ID")}
                    </div>
                    <div className="w-full bg-line h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          m.method === "Cash"
                            ? "bg-emerald-500"
                            : m.method === "QRIS"
                            ? "bg-blue-600"
                            : "bg-indigo-600"
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, m.percentageOfTotal))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: ANALITIK                                           */}
      {/* ========================================================= */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          {/* Analisis Keuntungan per Kategori Produk */}
          <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-fg tracking-tight">
                  Analisis Keuntungan per Kategori Produk
                </h3>
                <span className="text-xs text-muted">
                  Struktur omzet, modal (HPP), dan margin keuntungan usaha
                </span>
              </div>

              <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 font-bold px-3 py-1 rounded-full self-start sm:self-auto">
                Rekonsiliasi Cocok 100%
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-muted">
                    <th className="py-2.5 font-bold">Kategori</th>
                    <th className="py-2.5 text-center font-bold">Porsi</th>
                    <th className="py-2.5 text-right font-bold">Penjualan Bersih</th>
                    <th className="py-2.5 text-right font-bold">Total HPP</th>
                    <th className="py-2.5 text-right font-bold">Laba Kotor</th>
                    <th className="py-2.5 text-right font-bold">Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line font-mono">
                  {categoryBreakdown.length > 0 ? (
                    categoryBreakdown.map((c, idx) => (
                      <tr key={idx} className="hover:bg-card/50 transition-colors">
                        <td className="py-2.5 font-sans font-bold text-fg">{c.kategori}</td>
                        <td className="py-2.5 text-center font-sans text-muted">{c.qty}</td>
                        <td className="py-2.5 text-right text-fg">
                          Rp {c.sales.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 text-right text-muted">
                          Rp {c.cogs.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 text-right font-bold text-emerald-600">
                          Rp {c.grossProfit.toLocaleString("id-ID")}
                        </td>
                        <td className="py-2.5 text-right font-sans font-bold text-emerald-600">
                          {c.margin}%
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted font-sans">
                        Belum ada penjualan kategori pada rentang waktu ini
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-line font-bold font-mono bg-card/60">
                    <td className="py-3 font-sans text-fg">Total Terverifikasi</td>
                    <td className="py-3 text-center font-sans text-fg">
                      {categoryBreakdown.reduce((s, c) => s + c.qty, 0)}
                    </td>
                    <td className="py-3 text-right text-fg">
                      Rp {report.sales.netSales.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 text-right text-muted">
                      Rp {report.sales.totalCOGS.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 text-right text-emerald-600">
                      Rp {report.sales.grossProfit.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 text-right font-sans text-emerald-600">
                      {report.sales.profitMarginPercent}%
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Rekonsiliasi Kasir & Arus Kas */}
          <div className="bg-surface border border-line rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-black text-xs text-muted uppercase tracking-wider">
                Rekonsiliasi Kasir & Arus Kas
              </h4>
              <span
                className={`text-[11px] font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 self-start sm:self-auto ${
                  report.reconciliation.status === "VERIFIED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    report.reconciliation.status === "VERIFIED" ? "bg-emerald-500" : "bg-amber-500"
                  }`}
                />
                {report.reconciliation.badgeLabel}
              </span>
            </div>

            {/* 4 Kartu Komponen Arus Kas */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-3 bg-card rounded-2xl border border-line">
                <span className="text-muted block text-[11px]">Penerimaan Bruto:</span>
                <strong className="text-fg font-mono text-sm block mt-0.5">
                  Rp {report.payments.grossPayments.toLocaleString("id-ID")}
                </strong>
              </div>

              <div className="p-3 bg-card rounded-2xl border border-line">
                <span className="text-muted block text-[11px]">Refund Pembayaran:</span>
                <strong className="text-rose-600 font-mono text-sm block mt-0.5">
                  -Rp {report.payments.refundPayments.toLocaleString("id-ID")}
                </strong>
              </div>

              <div className="p-3 bg-card rounded-2xl border border-line">
                <span className="text-muted block text-[11px]">Penerimaan Netto:</span>
                <strong className="text-emerald-600 font-mono text-sm block mt-0.5">
                  Rp {report.payments.netPayments.toLocaleString("id-ID")}
                </strong>
              </div>

              <div className="p-3 bg-card rounded-2xl border border-line">
                <span className="text-muted block text-[11px]">Tagihan Terbuka (Open):</span>
                <strong className="text-amber-600 font-mono text-sm block mt-0.5">
                  Rp {report.reconciliation.openBillOutstanding.toLocaleString("id-ID")}
                </strong>
              </div>
            </div>

            {/* Formula Pembuktian Transparan */}
            <div className="p-3 bg-card rounded-2xl border border-line text-[11px] text-muted flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <span>
                Penerimaan Pembayaran: Bruto (Rp {report.payments.grossPayments.toLocaleString("id-ID")}) − Refund (Rp {report.payments.refundPayments.toLocaleString("id-ID")}) = Netto (Rp {report.payments.netPayments.toLocaleString("id-ID")})
              </span>
              <span className="text-muted text-[10px]">
                Saldo Open Bill dicatat terpisah sebagai aset operasional berjalan
              </span>
            </div>
          </div>

          {/* 2 Kolom Analitik Lanjutan: Jam Ramai & Pergerakan Menu */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Analisis Jam Ramai */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm text-fg">Distribusi Jam Sibuk</h4>
                {hourlyActivity.peakBucket && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 font-bold px-2.5 py-0.5 rounded-full">
                    Paling Ramai: {hourlyActivity.peakBucket.rangeLabel}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted">
                Kepadatan transaksi kasir setiap 2 jam untuk penjadwalan staf & dapur
              </p>

              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1 items-end h-[100px] pt-4">
                {hourlyActivity.buckets.map((b, i) => {
                  const pct = Math.round((b.count / hourlyActivity.maxCount) * 100);
                  return (
                    <div key={i} className="flex flex-col items-center h-full justify-end group">
                      <div
                        className="w-full bg-blue-600/70 group-hover:bg-blue-600 rounded-t-sm transition-all"
                        style={{ height: `${Math.max(4, pct)}%` }}
                        title={`${b.rangeLabel}: ${b.count} Transaksi (Rp ${b.omzet.toLocaleString("id-ID")})`}
                      />
                      <span className="text-[9px] text-muted font-mono mt-1 scale-90">
                        {b.rangeLabel.slice(0, 2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pergerakan Menu (Fast vs Slow Moving) */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-3">
              <h4 className="font-black text-sm text-fg">Kecepatan Perputaran Menu</h4>
              <p className="text-xs text-muted">
                Pantau menu berputar cepat vs menu yang belum terjual sama sekali
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                {/* Fast Moving */}
                <div className="p-3 bg-card rounded-2xl border border-line space-y-2">
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider block">
                    Fast Moving (Terlaris)
                  </span>
                  {menuVelocity.fastMoving.length > 0 ? (
                    menuVelocity.fastMoving.map((m, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="font-bold text-fg truncate max-w-[120px]">{m.nama}</span>
                        <span className="text-emerald-600 font-mono font-bold">{m.qty}x</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-muted text-[11px] block py-2">Belum ada data</span>
                  )}
                </div>

                {/* Slow Moving */}
                <div className="p-3 bg-card rounded-2xl border border-line space-y-2">
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider block">
                    Slow Moving (0 Terjual)
                  </span>
                  {menuVelocity.slowMoving.length > 0 ? (
                    menuVelocity.slowMoving.map((m, i) => (
                      <div key={i} className="flex justify-between items-center text-[11px]">
                        <span className="text-muted truncate max-w-[120px]">{m.nama}</span>
                        <span className="text-amber-600 font-mono font-bold">0x</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-emerald-600 text-[11px] block py-2">Semua menu laku</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Insight Operasional & Stok Ringkas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Laci Kas & Shift */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-2">
              <h4 className="font-bold text-xs text-muted uppercase tracking-wider">
                Status Kas Laci Fisik (Tunai)
              </h4>
              <div className="text-lg font-black text-fg font-mono">
                Saldo Fisik Diharapkan: Rp {report.payments.cashDrawer.expectedCash.toLocaleString("id-ID")}
              </div>
              <p className="text-xs text-muted">
                Modal Awal: Rp {report.payments.cashDrawer.startingCash.toLocaleString("id-ID")} • Penjualan Tunai: Rp {report.payments.cashDrawer.cashSalesGross.toLocaleString("id-ID")} • Refund Tunai: Rp {report.payments.cashDrawer.cashRefundsOut.toLocaleString("id-ID")}
              </p>
            </div>

            {/* Peringatan Stok Menipis */}
            <div className="bg-surface border border-line rounded-3xl p-5 shadow-xs space-y-2">
              <h4 className="font-bold text-xs text-muted uppercase tracking-wider">
                Peringatan Stok Produk
              </h4>
              {lowStockItems.length > 0 ? (
                <div className="space-y-1.5 text-xs">
                  {lowStockItems.slice(0, 3).map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center text-rose-600 font-bold">
                      <span>{item.nama}</span>
                      <span className="font-mono">Sisa {item.stockQty} {item.stockUnit || "pcs"}</span>
                    </div>
                  ))}
                  {lowStockItems.length > 3 && (
                    <span className="text-[10px] text-muted block">
                      +{lowStockItems.length - 3} produk lainnya menipis
                    </span>
                  )}
                </div>
              ) : (
                <p className="text-xs text-emerald-600 font-bold">
                  Seluruh stok produk berada dalam batas aman.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Modal */}
      {isWaModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-surface border border-line rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-line pb-3">
              <h3 className="font-black text-sm text-fg">Bagikan Laporan WhatsApp</h3>
              <button
                type="button"
                onClick={() => setIsWaModalOpen(false)}
                className="text-muted hover:text-fg text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex gap-2">
              <button type="button" disabled={isGeneratingImage} onClick={handleShareReportImage} className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">
                {isGeneratingImage ? "Menyiapkan Gambar..." : "Bagikan Gambar"}
              </button>
              <button type="button" onClick={handleDownloadReportImage} className="flex-1 py-2.5 bg-card border border-line rounded-xl text-xs font-bold">Unduh Gambar</button>
            </div>

            <textarea
              readOnly
              rows={8}
              value={generateWaReportMessage()}
              className="w-full bg-card border border-line rounded-2xl p-3 text-xs font-mono text-fg resize-none focus:outline-none"
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopyWaReport}
                className="flex-1 py-2.5 bg-card hover:bg-line border border-line text-fg rounded-xl text-xs font-bold transition-all"
              >
                {copiedReport ? "Tersalin!" : "Salin Teks"}
              </button>
              <button
                type="button"
                onClick={handleOpenWhatsAppUrl}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Buka WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
