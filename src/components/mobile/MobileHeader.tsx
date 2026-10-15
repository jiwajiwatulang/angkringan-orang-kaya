"use client";

import React from "react";
import Link from "next/link";
import { StoreSettings } from "@/lib/settings";

interface MobileHeaderProps {
  storeSettings: StoreSettings;
  activeShift: any;
  currentShiftStats: any;
  onOpenCashMovement: () => void;
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
}

export default function MobileHeader({
  storeSettings,
  activeShift,
  currentShiftStats,
  onOpenCashMovement,
  onOpenShiftModal,
  onOpenCloseShiftModal,
}: MobileHeaderProps) {
  return (
    <header className="h-14 bg-surface border-b border-line px-4 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand & Store Name */}
      <Link href="/" className="flex items-center gap-2.5 hover:opacity-85 transition-opacity" title="Beranda SakuNota">
        {storeSettings.storeLogo ? (
          <img
            src={storeSettings.storeLogo}
            alt="Logo Toko"
            className="w-8 h-8 rounded-xl object-contain bg-card border border-line p-0.5"
          />
        ) : (
          <div className="w-8 h-8 rounded-xl bg-accent text-white flex items-center justify-center font-black text-xs shadow-md shadow-accent/20">
            SN
          </div>
        )}
        <div className="flex flex-col">
          <span className="text-sm font-black text-fg leading-tight truncate max-w-[140px] sm:max-w-[200px]">
            {storeSettings.storeName || "SakuNota"}
          </span>
          <span className="text-[10px] text-muted font-medium leading-none">
            {activeShift ? `Kasir: ${activeShift.operatorName}` : "Shift Tutup"}
          </span>
        </div>
      </Link>

      {/* Right Side: Shift Status & Quick Action */}
      <div className="flex items-center gap-2">
        {activeShift ? (
          <button
            type="button"
            onClick={onOpenCashMovement}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent/20 border border-accent/40 text-[11px] font-bold text-accent-text active:scale-95 transition-transform"
            title="Catat Kas Masuk / Keluar"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></span>
            <span>Kas Rp {(currentShiftStats?.expectedCash || activeShift.startingCash || 0).toLocaleString('id-ID')}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenShiftModal}
            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-accent text-white text-[11px] font-bold shadow-sm active:scale-95 transition-transform"
          >
            <span>💼</span>
            <span>Buka Shift</span>
          </button>
        )}

        {/* Quick Shift Close or Notification Icon */}
        {activeShift && (
          <button
            type="button"
            onClick={onOpenCloseShiftModal}
            className="w-8 h-8 rounded-xl bg-card border border-line text-muted hover:text-rose-400 flex items-center justify-center text-xs font-bold active:scale-90 transition-all"
            title="Tutup Shift Kasir"
          >
            🔔
          </button>
        )}
      </div>
    </header>
  );
}
