"use client";

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
  onNavigate: (tab: 'home' | 'menu' | 'meja' | 'nota' | 'lainnya') => void;
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
      onNavigate('menu');
    }
  };

  const getCategoryIcon = (category: string, name?: string) => {
    const c = (category || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (c.includes('minum') || n.includes('teh') || n.includes('kopi') || n.includes('jeruk') || n.includes('wedang') || n.includes('susu') || n.includes('es ') || n.includes('lemon')) return '🥤';
    if (c.includes('nasi') || n.includes('ayam') || n.includes('bebek') || n.includes('mie') || n.includes('soto') || n.includes('bakso')) return '🍚';
    if (c.includes('sate') || n.includes('sate') || n.includes('sunduk')) return '🍢';
    if (c.includes('snack') || c.includes('gorengan') || n.includes('mendoan') || n.includes('tahu') || n.includes('tempe') || n.includes('pisang')) return '🥟';
    return '🍽️';
  };

  // Top 4 favorite items from menu
  const favoriteItems = menuData.filter(m => !m.isSoldOut).slice(0, 4);

  // Active tables count
  const occupiedTablesCount = tableData.filter(t => t.status === 'terisi').length;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-28">
      {/* 1. Search Bar */}
      <form onSubmit={handleSearchSubmit} className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">
          🔍
        </span>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Cari menu..."
          className="w-full bg-card border border-line rounded-2xl pl-10 pr-4 py-3 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent transition-colors shadow-sm"
        />
        {localSearch && (
          <button
            type="submit"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all"
          >
            Cari
          </button>
        )}
      </form>

      {/* 2. Hero Status Card (KASIR HARI INI) */}
      <div className="bg-gradient-to-br from-card to-card/90 border border-line rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-3 -bottom-3 text-7xl opacity-5 select-none pointer-events-none">
          ☕
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-accent-text bg-accent/20 px-2.5 py-0.5 rounded-full border border-accent/30">
              Kasir Hari Ini
            </span>
            {activeShift && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-accent-text">
                <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                Shift Aktif
              </span>
            )}
          </div>

          <h2 className="text-xl font-black text-fg mb-1">
            Siap melayani pelanggan?
          </h2>
          <p className="text-xs text-muted mb-4">
            Mulai transaksi dengan cepat dan pantau penjualan secara instan.
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onNavigate('menu')}
              className="px-4 py-2 bg-accent hover:bg-accent-hover active:scale-95 text-white font-bold text-xs rounded-xl shadow-md shadow-accent/20 transition-all flex items-center gap-1.5"
            >
              <span>🛒</span>
              <span>Buka Katalog Menu</span>
            </button>

            {activeShift ? (
              <button
                type="button"
                onClick={onOpenCashMovement}
                className="px-3 py-2 bg-surface hover:bg-line border border-line text-xs font-bold text-fg rounded-xl transition-colors flex items-center gap-1"
              >
                <span>💵</span>
                <span>+/- Kas</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenShiftModal}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1"
              >
                <span>💼</span>
                <span>Buka Shift Baru</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Akses Cepat (4 Circular Icons) */}
      <div>
        <h3 className="text-sm font-black text-fg mb-3 px-1">
          Akses Cepat
        </h3>
        <div className="grid grid-cols-4 gap-2.5">
          {/* Menu */}
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-accent/20 group-hover:bg-accent/30 text-accent-text flex items-center justify-center text-xl mb-1.5 transition-colors shadow-sm">
              🍽️
            </div>
            <span className="text-xs font-bold text-fg group-hover:text-accent-text transition-colors">
              Menu
            </span>
          </button>

          {/* Meja */}
          <button
            type="button"
            onClick={() => onNavigate('meja')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-accent/20 group-hover:bg-accent/30 text-accent-text flex items-center justify-center text-xl mb-1.5 transition-colors shadow-sm">
              🪑
            </div>
            <span className="text-xs font-bold text-fg group-hover:text-accent-text transition-colors">
              Meja
            </span>
            {occupiedTablesCount > 0 && (
              <span className="text-[10px] text-amber-400 font-bold mt-0.5">
                {occupiedTablesCount} Terisi
              </span>
            )}
          </button>

          {/* Nota */}
          <button
            type="button"
            onClick={() => onNavigate('nota')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-accent/20 group-hover:bg-accent/30 text-accent-text flex items-center justify-center text-xl mb-1.5 transition-colors shadow-sm">
              🧾
            </div>
            <span className="text-xs font-bold text-fg group-hover:text-accent-text transition-colors">
              Nota
            </span>
          </button>

          {/* Laporan */}
          <button
            type="button"
            onClick={() => onNavigate('lainnya')}
            className="flex flex-col items-center justify-center p-3 rounded-2xl bg-card border border-line hover:border-accent active:scale-95 transition-all text-center group"
          >
            <div className="w-12 h-12 rounded-full bg-accent/20 group-hover:bg-accent/30 text-accent-text flex items-center justify-center text-xl mb-1.5 transition-colors shadow-sm">
              📊
            </div>
            <span className="text-xs font-bold text-fg group-hover:text-accent-text transition-colors">
              Laporan
            </span>
          </button>
        </div>
      </div>

      {/* 4. Menu Favorit */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-sm font-black text-fg">
            Menu Favorit
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('menu')}
            className="text-xs font-bold text-accent-text hover:underline"
          >
            Lihat Semua →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {favoriteItems.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-line rounded-2xl p-3 flex flex-col justify-between shadow-sm hover:border-accent/60 transition-all"
            >
              {/* Image/Icon Box */}
              <div className="w-full h-24 rounded-xl bg-surface/80 flex items-center justify-center text-3xl mb-2.5 border border-line/40">
                {getCategoryIcon(item.kategori, item.nama)}
              </div>

              {/* Title & Price */}
              <div>
                <h4 className="font-bold text-xs text-fg leading-tight truncate mb-1" title={item.nama}>
                  {item.nama}
                </h4>
                <span className="text-xs font-black text-accent-text block">
                  Rp {item.harga.toLocaleString('id-ID')}
                </span>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => onAddToCart(item)}
                className="mt-2.5 w-full py-1.5 bg-accent/20 hover:bg-accent active:scale-95 text-accent-text hover:text-white font-bold text-xs rounded-xl border border-accent/40 hover:border-transparent transition-all flex items-center justify-center gap-1"
              >
                <span>Tambah +</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
