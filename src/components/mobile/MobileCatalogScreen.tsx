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
  const [gridCols, setGridCols] = useState<2 | 4>(2);

  const getCategoryIcon = (category: string, name?: string) => {
    const c = (category || "").toLowerCase();
    const n = (name || "").toLowerCase();
    if (
      c.includes("minum") ||
      n.includes("teh") ||
      n.includes("kopi") ||
      n.includes("jeruk") ||
      n.includes("wedang") ||
      n.includes("susu") ||
      n.includes("es ") ||
      n.includes("lemon")
    )
      return "🥤";
    if (
      c.includes("nasi") ||
      n.includes("ayam") ||
      n.includes("bebek") ||
      n.includes("mie") ||
      n.includes("soto") ||
      n.includes("bakso")
    )
      return "🍚";
    if (c.includes("sate") || n.includes("sate") || n.includes("sunduk"))
      return "🍢";
    if (
      c.includes("snack") ||
      c.includes("gorengan") ||
      n.includes("mendoan") ||
      n.includes("tahu") ||
      n.includes("tempe") ||
      n.includes("pisang")
    )
      return "🥟";
    return "🍽️";
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
    <div className="flex-1 flex flex-col h-full overflow-hidden select-none bg-slate-50 text-slate-900">
      {/* 1. Header Bar: Title, Grid Mode Switcher & Search */}
      <div className="p-3.5 pb-2.5 shrink-0 border-b border-blue-100 bg-white shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <span>Menu Kasir</span>
            <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredMenu.length}
            </span>
          </h2>

          {/* Grid Density Toggle (2 Grid vs 4 Grid Ringkas) */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGridCols(gridCols === 4 ? 2 : 4)}
              className="px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold active:scale-95 transition-all"
              title="Ubah Ukuran Grid Menu"
            >
              {gridCols === 4 ? "⊞ 2 Grid" : "∷ 4 Grid"}
            </button>
            <button
              type="button"
              onClick={() => onSelectCategory("Semua")}
              className="px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:text-blue-600 text-[11px] font-bold active:scale-95 transition-all"
              title="Tampilkan Semua Menu"
            >
              Semua
            </button>
          </div>
        </div>

        {/* 2. Search Input */}
        <div className="relative mb-2.5">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari nama makanan atau minuman..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* 3. Compact 4-Grid Category Selector (Tanpa Geser / Slide) */}
        <div className="grid grid-cols-4 gap-1.5">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`py-1.5 px-1.5 rounded-xl text-[11px] font-extrabold truncate text-center transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs border border-blue-600"
                    : "bg-slate-50 border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Product Catalog Grid */}
      <div className="flex-1 overflow-y-auto p-3 pb-28">
        {filteredMenu.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
            <span className="text-4xl mb-2">🍽️</span>
            <p className="text-sm font-black text-slate-900">Menu Tidak Ditemukan</p>
            <p className="text-xs text-slate-600 mt-1">
              Coba kata kunci pencarian atau pilih kategori lain di atas.
            </p>
          </div>
        ) : (
          <div
            className={
              gridCols === 4
                ? "grid grid-cols-4 gap-2"
                : "grid grid-cols-2 md:grid-cols-4 gap-2.5"
            }
          >
            {filteredMenu.map((item) => {
              const isSoldOut = item.isSoldOut;
              const hasModifiers =
                (item.modifiers && item.modifiers.length > 0) ||
                (item.isGroup && item.variants && item.variants.length > 0);

              if (gridCols === 4) {
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={isSoldOut}
                    onClick={() => onAddToCart(item)}
                    className={`bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between text-left shadow-2xs transition-all active:scale-95 ${
                      isSoldOut
                        ? "opacity-50 grayscale cursor-not-allowed"
                        : "hover:border-blue-500"
                    }`}
                  >
                    <div className="w-full h-11 rounded-lg bg-blue-50/70 flex items-center justify-center text-xl mb-1.5 border border-blue-100 relative">
                      {getCategoryIcon(item.kategori, item.nama)}
                      {hasModifiers && !isSoldOut && (
                        <span className="absolute top-0.5 right-0.5 bg-blue-600 text-white text-[8px] font-bold px-1 rounded">
                          +
                        </span>
                      )}
                    </div>
                    <div className="w-full">
                      <h3 className="font-extrabold text-[10px] text-slate-900 leading-tight line-clamp-2">
                        {item.nama}
                      </h3>
                      <span className="text-[10px] font-black text-blue-600 block mt-1 truncate">
                        {(item.harga / 1000).toFixed(0)}rb
                      </span>
                    </div>
                  </button>
                );
              }

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isSoldOut) onAddToCart(item);
                  }}
                  className={`bg-white border border-slate-200 rounded-2xl p-3 flex flex-col justify-between shadow-xs relative transition-all cursor-pointer ${
                    isSoldOut
                      ? "opacity-50 grayscale cursor-not-allowed"
                      : "hover:border-blue-500 active:scale-[0.99]"
                  }`}
                >
                  {/* Top: Compact Thumbnail / Icon container */}
                  <div className="w-full h-16 rounded-xl bg-blue-50/60 flex items-center justify-center text-2xl mb-2 border border-blue-100 relative overflow-hidden">
                    {getCategoryIcon(item.kategori, item.nama)}

                    {isSoldOut && (
                      <span className="absolute top-1.5 right-1.5 bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Habis
                      </span>
                    )}

                    {hasModifiers && !isSoldOut && (
                      <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-xs">
                        Pilih Varian
                      </span>
                    )}
                  </div>

                  {/* Middle: Title */}
                  <div className="mb-2">
                    <h3
                      className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2"
                      title={item.nama}
                    >
                      {item.nama}
                    </h3>
                  </div>

                  {/* Bottom: Price & Tactile "+" Button */}
                  <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                    <span className="text-xs font-black text-blue-600 truncate">
                      Rp {item.harga.toLocaleString("id-ID")}
                    </span>

                    <button
                      type="button"
                      disabled={isSoldOut}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(item);
                      }}
                      className={`w-7 h-7 rounded-xl font-black flex items-center justify-center text-sm active:scale-90 transition-transform ${
                        isSoldOut
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
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
