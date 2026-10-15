"use client";

import React from "react";

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

interface MobileCatalogScreenProps {
  menuData: MenuItem[];
  categories: string[];
  activeCategory: string;
  onSelectCategory: (cat: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onAddToCart: (item: MenuItem) => void;
}

export default function MobileCatalogScreen({
  menuData,
  categories,
  activeCategory,
  onSelectCategory,
  searchQuery,
  onSearchChange,
  onAddToCart,
}: MobileCatalogScreenProps) {
  const getCategoryIcon = (category: string, name?: string) => {
    const c = (category || '').toLowerCase();
    const n = (name || '').toLowerCase();
    if (c.includes('minum') || n.includes('teh') || n.includes('kopi') || n.includes('jeruk') || n.includes('wedang') || n.includes('susu') || n.includes('es ') || n.includes('lemon')) return '🥤';
    if (c.includes('nasi') || n.includes('ayam') || n.includes('bebek') || n.includes('mie') || n.includes('soto') || n.includes('bakso')) return '🍚';
    if (c.includes('sate') || n.includes('sate') || n.includes('sunduk')) return '🍢';
    if (c.includes('snack') || c.includes('gorengan') || n.includes('mendoan') || n.includes('tahu') || n.includes('tempe') || n.includes('pisang')) return '🥟';
    return '🍽️';
  };

  const filteredMenu = menuData.filter((item) => {
    const matchesCategory =
      activeCategory === "Semua" || item.kategori === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      item.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.kategori.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none">
      {/* 1. Header Bar: Title & Filter */}
      <div className="p-4 pb-2 shrink-0 border-b border-line/40 bg-surface/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-black text-fg flex items-center gap-2">
            <span>Menu Kasir</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card text-muted border border-line">
              {filteredMenu.length}
            </span>
          </h2>
          <button
            type="button"
            onClick={() => onSelectCategory("Semua")}
            className="w-8 h-8 rounded-xl bg-card border border-line text-muted hover:text-fg flex items-center justify-center text-xs font-bold active:scale-95 transition-all"
            title="Tampilkan Semua Menu"
          >
            ⚡
          </button>
        </div>

        {/* 2. Search Input */}
        <div className="relative mb-3">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari produk..."
            className="w-full bg-card border border-line rounded-2xl pl-10 pr-9 py-2.5 text-xs text-fg placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-fg text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3. Horizontally Scrollable Category Chips */}
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-md shadow-accent/20"
                    : "bg-card border border-line text-muted hover:text-fg hover:border-slate-500"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Product Catalog Grid (2-column on mobile, 3-column on tablet) */}
      <div className="flex-1 overflow-y-auto p-4 pb-28">
        {filteredMenu.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-muted">
            <span className="text-4xl mb-2">🍽️</span>
            <p className="text-sm font-bold text-fg">Menu Tidak Ditemukan</p>
            <p className="text-xs text-muted mt-1">Coba kata kunci pencarian atau kategori lain.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredMenu.map((item) => {
              const isSoldOut = item.isSoldOut;
              const hasModifiers =
                (item.modifiers && item.modifiers.length > 0) ||
                (item.isGroup && item.variants && item.variants.length > 0);

              return (
                <div
                  key={item.id}
                  className={`bg-card border border-line/70 rounded-2xl p-3 flex flex-col justify-between shadow-sm relative transition-all ${
                    isSoldOut ? "opacity-50 grayscale" : "hover:border-slate-500"
                  }`}
                >
                  {/* Top: Thumbnail / Icon container */}
                  <div className="w-full h-24 rounded-xl bg-surface/60 flex items-center justify-center text-3xl mb-2.5 border border-line/30 relative overflow-hidden">
                    {getCategoryIcon(item.kategori, item.nama)}

                    {isSoldOut && (
                      <span className="absolute top-2 right-2 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        Habis
                      </span>
                    )}

                    {hasModifiers && !isSoldOut && (
                      <span className="absolute top-2 right-2 bg-slate-900/80 text-slate-300 border border-slate-700 text-[9px] font-semibold px-1.5 py-0.5 rounded">
                        Varian
                      </span>
                    )}
                  </div>

                  {/* Middle: Title */}
                  <div className="mb-2">
                    <h3
                      className="font-bold text-xs text-fg leading-tight line-clamp-2"
                      title={item.nama}
                    >
                      {item.nama}
                    </h3>
                  </div>

                  {/* Bottom: Price & Tactile "+" Button */}
                  <div className="flex items-center justify-between pt-1 border-t border-line/30">
                    <span className="text-xs font-black text-accent-text truncate">
                      Rp {item.harga.toLocaleString("id-ID")}
                    </span>

                    <button
                      type="button"
                      disabled={isSoldOut}
                      onClick={() => onAddToCart(item)}
                      className={`w-8 h-8 rounded-xl font-black flex items-center justify-center text-sm active:scale-90 transition-transform ${
                        isSoldOut
                          ? "bg-line/40 text-muted cursor-not-allowed"
                          : "bg-accent hover:bg-accent-hover text-white shadow-sm shadow-accent/20"
                      }`}
                      title={isSoldOut ? "Menu Habis" : "Tambah ke Keranjang"}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
