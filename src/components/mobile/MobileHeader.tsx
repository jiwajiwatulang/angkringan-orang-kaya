"use client";

import React from "react";
import Link from "next/link";
import { StoreSettings } from "@/lib/settings";
import CashierPrinter from "@/components/CashierPrinter";

interface MobileHeaderProps {
  storeSettings: StoreSettings;
  activeShift: any;
  currentShiftStats: any;
  onAdmin: () => void;
  onOpenCashMovement: () => void;
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
}

export default function MobileHeader({
  storeSettings,
  activeShift,
  currentShiftStats,
  onOpenCashMovement,
  onAdmin,
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
          <img
            src="/icon.png"
            alt="SakuNota"
            className="w-8 h-8 rounded-xl object-contain shadow-md shadow-accent/20"
          />
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
      <div className="flex items-center gap-1.5">
        <CashierPrinter settings={storeSettings} />
        <button type="button" onClick={onAdmin} className="px-2.5 py-2 bg-card border border-line text-fg rounded-xl text-xs font-bold">Admin</button>
      </div>
    </header>
  );
}
