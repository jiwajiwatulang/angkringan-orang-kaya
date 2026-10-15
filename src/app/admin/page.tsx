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
