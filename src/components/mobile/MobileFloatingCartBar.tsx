"use client";

import React from "react";

interface MobileFloatingCartBarProps {
  itemCount: number;
  totalPrice: number;
  onOpenCart: () => void;
}

export default function MobileFloatingCartBar({
  itemCount,
  totalPrice,
  onOpenCart,
}: MobileFloatingCartBarProps) {
  if (itemCount === 0) return null;

  return (
    <div className="fixed bottom-14 left-0 right-0 p-3 z-20 select-none flex justify-center landscape:hidden">
      <div className="w-full max-w-md">
        <button
          type="button"
          onClick={onOpenCart}
          className="w-full bg-accent hover:bg-accent-hover active:scale-98 text-white p-3 rounded-2xl shadow-xl shadow-accent/30 border border-accent-hover/40 flex items-center justify-between transition-all"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center text-sm font-black"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h3l3 12h11l3-9H6M10 20h.01M18 20h.01" /></svg></div>
            <div className="text-left">
              <span className="text-xs font-black block leading-tight">
                {itemCount} Menu Dipilih
              </span>
              <span className="text-[11px] text-white/80 block leading-tight">
                Rp {totalPrice.toLocaleString("id-ID")}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-white/20 px-3 py-1.5 rounded-xl text-xs font-black">
            <span>Keranjang</span>
            <span>→</span>
          </div>
        </button>
      </div>
    </div>
  );
}
