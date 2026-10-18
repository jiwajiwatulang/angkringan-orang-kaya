"use client";
import LineIcon from "@/components/LineIcon";
import ProductPhoto from "@/components/ProductPhoto";

import React, { useState } from "react";

interface MenuItem {
  id: number;
  nama: string;
  harga: number;
  kategori: string;
  isGroup?: boolean;
  variants?: MenuItem[];
  isSoldOut?: boolean;
  modifiers?: any[];
}

interface MobileHomeScreenProps {
  menuData: MenuItem[];
  activeShift: any;
  currentShiftStats: any;
  tableData: any[];
  activeOrders: any[];
  onNavigate: (tab: "home" | "menu" | "meja" | "nota" | "lainnya") => void;
  onAddToCart: (item: MenuItem) => void;
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
  onOpenCashMovement: () => void;
  onSearchFocus: (query: string) => void;
}

export default function MobileHomeScreen({
  menuData,
  activeShift,
  currentShiftStats,
  tableData,
  activeOrders,
  onNavigate,
  onAddToCart,
  onOpenShiftModal,
  onOpenCloseShiftModal,
  onOpenCashMovement,
  onSearchFocus,
}: MobileHomeScreenProps) {
  const [localSearch, setLocalSearch] = useState("");

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (localSearch.trim()) {
      onSearchFocus(localSearch.trim());
      onNavigate("menu");
    }
  };

  const getCategoryIcon = (category: string, name?: string) => {
    const c = (category || "").toLowerCase();
    const n = (name || "").toLowerCase();
    if (c.includes("minum") || n.includes("teh") || n.includes("kopi") || n.includes("jeruk") || n.includes("es ")) return <LineIcon name="drink" className="w-6 h-6" />;
    if (c.includes("nasi") || n.includes("ayam") || n.includes("bebek") || n.includes("mie")) return <LineIcon name="food" className="w-6 h-6" />;
    if (c.includes("sate") || n.includes("sunduk")) return <LineIcon name="skewers" className="w-6 h-6" />;
    if (c.includes("snack") || n.includes("gorengan") || n.includes("mendoan")) return <LineIcon name="snack" className="w-6 h-6" />;
    return <LineIcon name="catalog" className="w-6 h-6" />;
  };

  // Top 4 favorite items from menu
  const favoriteItems = (menuData || []).filter((m) => m && !m.isSoldOut).slice(0, 4);

  // Active metrics
  const occupiedTables = (tableData || []).filter((t) => t && (t.status === "terisi" || t.status === "open")).length;
  const totalTables = (tableData || []).length;
  const todayOrdersCount = (activeOrders || []).length;


  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-28 select-none">
      {/* 1. Shift & Operator Status Strip (Functional, Non-Marketing) */}
      <div className="bg-card border border-line rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${activeShift ? "bg-blue-600 animate-pulse" : "bg-slate-400"}`} />
          <div className="min-w-0">
            <span className="text-xs font-black text-fg block truncate">
              {activeShift ? `Shift Aktif • ${activeShift.operatorName}` : "Shift Kasir Tutup"}
            </span>
            <span className="text-[11px] text-muted block truncate">
              {activeShift ? "Hitung kas fisik saat tutup shift" : "Buka shift untuk mulai mencatat arus kas"}
            </span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-1.5">
          {activeShift ? (
            <button
              type="button"
              onClick={onOpenCashMovement}
              className="px-2.5 py-1.5 bg-surface hover:bg-line border border-line text-[11px] font-bold text-accent-text rounded-xl active:scale-95 transition-all"
              title="Catat Kas Masuk atau Keluar"
            >
              +/- Kas
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenShiftModal}
              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-[11px] font-bold rounded-xl active:scale-95 transition-all shadow-sm"
            >
              Buka Shift
            </button>
          )}
        </div>
      </div>

      {/* 2. Primary POS Operational Action */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => onNavigate("menu")}
          className="w-full py-3.5 bg-accent hover:bg-accent-hover active:scale-98 text-white font-black text-sm rounded-2xl shadow-lg shadow-accent/25 transition-all flex items-center justify-center gap-2"
        >
          <span className="text-base font-black">+</span>
          <span>Transaksi Baru / Buka Katalog</span>
        </button>

        {/* Quick Search */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs"><LineIcon name="info" /></span>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Pencarian cepat..."
            className="w-full bg-card border border-line rounded-xl pl-9 pr-4 py-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
        </form>
      </div>

      {/* 3. Live Metrics Row (High-Utility, Clean) */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Meja Status */}
        <button
          type="button"
          onClick={() => onNavigate("meja")}
          className="p-3 bg-card border border-line rounded-2xl text-left active:scale-95 transition-transform"
        >
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Status Meja
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-fg">{occupiedTables}</span>
            <span className="text-xs text-muted">/ {totalTables} terisi</span>
          </div>
          <span className="text-[10px] text-accent-text font-bold mt-1 block">
            Lihat Denah Meja →
          </span>
        </button>

        {/* Nota / Order Status */}
        <button
          type="button"
          onClick={() => onNavigate("nota")}
          className="p-3 bg-card border border-line rounded-2xl text-left active:scale-95 transition-transform"
        >
          <span className="text-[10px] font-bold text-muted uppercase tracking-wider block">
            Pesanan Berjalan
          </span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-lg font-black text-fg">{todayOrdersCount}</span>
            <span className="text-xs text-muted">aktif</span>
          </div>
          <span className="text-[10px] text-accent-text font-bold mt-1 block">
            Lihat Riwayat Nota →
          </span>
        </button>
      </div>

      {/* 4. Akses Cepat Navigasi (Minimalist 4-Column Row) */}
      <div>
        <span className="text-[11px] font-bold text-muted uppercase tracking-wider px-1 block mb-2">
          Akses Cepat
        </span>
        <div className="grid grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => onNavigate("menu")}
            className="p-2.5 rounded-xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center flex flex-col items-center"
          >
            <span className="text-base mb-1"><LineIcon name="food" /></span>
            <span className="text-[11px] font-bold text-fg">Menu</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("meja")}
            className="p-2.5 rounded-xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center flex flex-col items-center"
          >
            <span className="text-base mb-1"><LineIcon name="tables" /></span>
            <span className="text-[11px] font-bold text-fg">Meja</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("nota")}
            className="p-2.5 rounded-xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center flex flex-col items-center"
          >
            <span className="text-base mb-1"><LineIcon name="receipt" /></span>
            <span className="text-[11px] font-bold text-fg">Nota</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate("lainnya")}
            className="p-2.5 rounded-xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center flex flex-col items-center"
          >
            <span className="text-base mb-1"><LineIcon name="settings" /></span>
            <span className="text-[11px] font-bold text-fg">Lainnya</span>
          </button>
        </div>
      </div>

      {/* 5. Menu Terlaris (Compact 4-Grid 1-Tap Direct Add) */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
            Menu Sering Dipesan (4 Grid)
          </span>
          <button
            type="button"
            onClick={() => onNavigate("menu")}
            className="text-xs font-extrabold text-blue-600 hover:underline"
          >
            Semua Menu →
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {favoriteItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onAddToCart(item)}
              className="bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-2 flex flex-col justify-between text-left shadow-2xs active:scale-95 transition-all"
            >
              <div className="w-full h-10 rounded-lg bg-blue-50/70 border border-blue-100 flex items-center justify-center text-lg mb-1.5">
                <ProductPhoto product={item} />
              </div>
              <div className="w-full">
                <h4 className="font-extrabold text-[10px] text-slate-900 leading-tight line-clamp-2" title={item.nama}>
                  {item.nama}
                </h4>
                <span className="text-[10px] font-black text-blue-600 mt-1 block truncate">
                  Rp {((item.harga ?? 0) / 1000).toFixed(0)}rb
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
