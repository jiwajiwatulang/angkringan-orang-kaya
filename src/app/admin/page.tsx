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

  const max7DayOmzet = Math.max(...last7Days.map((d) => d.omzet), 100000);

  // Category sales breakdown
  const categoryMap: Record<string, { total: number; qty: number }> = {};
  orders
    .filter((o) => o.status !== "void")
    .forEach((order) => {
      (order.items || []).forEach((item: any) => {
        const cat = item.kategori || "Lainnya";
        if (!categoryMap[cat]) {
          categoryMap[cat] = { total: 0, qty: 0 };
        }
        categoryMap[cat].total += (item.harga || 0) * (item.qty || 1);
        categoryMap[cat].qty += item.qty || 1;
      });
    });

  const categoryEntries = Object.entries(categoryMap)
    .map(([kategori, stats]) => ({
      kategori,
      ...stats,
    }))
    .sort((a, b) => b.total - a.total);

  const totalAllCategoriesOmzet = categoryEntries.reduce((s, c) => s + c.total, 0) || 1;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
        <div>
          <h2 className="text-2xl font-black text-fg tracking-tight">
            Dashboard
          </h2>
          <p className="text-xs text-muted mt-0.5">
            {storeSettings.storeName || "Angkringan Orang Kaya"} • Ringkasan usaha & akses cepat ke laporan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/menu"
            className="px-3.5 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold shadow-md shadow-accent/20 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>+</span>
            <span>Tambah Menu</span>
          </Link>
          <Link
            href="/"
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

            {/* Bar Chart Visualization */}
            <div className="pt-6 pb-2">
              <div className="h-44 sm:h-52 flex items-end justify-between gap-2 sm:gap-4 px-2">
                {last7Days.map((d, idx) => {
                  const heightPercent = Math.max(8, Math.round((d.omzet / max7DayOmzet) * 100));
                  const isToday = idx === 6;

                  return (
                    <div key={d.dateStr} className="flex-1 flex flex-col items-center h-full justify-end group">
                      {/* Amount on hover / top */}
                      <span className="text-[10px] font-bold text-muted group-hover:text-accent-text transition-colors truncate max-w-full mb-1 opacity-80 group-hover:opacity-100">
                        {d.omzet > 0 ? (d.omzet >= 1000 ? `${Math.round(d.omzet / 1000)}k` : d.omzet) : '-'}
                      </span>

                      {/* Bar Pillar */}
                      <div className="w-full max-w-[48px] bg-card rounded-t-xl overflow-hidden flex flex-col justify-end border border-line/60 p-0.5 transition-all group-hover:border-accent">
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-lg transition-all duration-500 shadow-sm ${
                            isToday
                              ? 'bg-accent shadow-accent/30'
                              : d.omzet > 0
                              ? 'bg-accent/60 group-hover:bg-accent'
                              : 'bg-line/40'
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

            <div className="mt-4 space-y-3.5 max-h-56 overflow-y-auto pr-1">
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
                    <div key={cat.kategori} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-fg flex items-center gap-1.5 truncate">
                          <span>•</span>
                          <span>{cat.kategori}</span>
                          <span className="text-[10px] text-muted font-normal">({cat.qty} terjual)</span>
                        </span>
                        <span className="font-black text-fg shrink-0">
                          Rp {cat.total.toLocaleString("id-ID")}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-card rounded-full overflow-hidden flex border border-line/40">
                        <div
                          style={{ width: `${percent}%` }}
                          className={`h-full ${barColor} rounded-full transition-all duration-500`}
                        />
                      </div>
                      <div className="text-right text-[10px] font-semibold text-muted">
                        {percent}% dari omzet
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
    </div>
  );
}
