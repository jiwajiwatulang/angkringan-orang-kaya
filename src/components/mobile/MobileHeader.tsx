"use client";

import React from "react";
import Link from "next/link";
import { StoreSettings } from "@/lib/settings";
import CashierPrinter from "@/components/CashierPrinter";
import {getPosScope} from '@/lib/multidevice/posWire';

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
      <Link href="/" className="flex items-center gap-2 min-w-0 flex-1 mr-2 hover:opacity-85 transition-opacity" title="Beranda SakuNota">
        {storeSettings.storeLogo ? (
          <img
            src={storeSettings.storeLogo}
            alt="Logo Toko"
            className="w-8 h-8 rounded-xl object-contain bg-card border border-line p-0.5 shrink-0"
          />
        ) : (
          <img
            src="/icon.png"
            alt="SakuNota"
            className="w-8 h-8 rounded-xl object-contain shadow-md shadow-accent/20 shrink-0"
          />
        )}
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-black text-fg leading-tight truncate">
            {storeSettings.storeName || "SakuNota"}
          </span>
          <span className="text-[10px] text-muted font-medium leading-none truncate">
            {activeShift ? `Kasir: ${activeShift.operatorName}` : "Shift Tutup"}
          </span>
        </div>
      </Link>

      {/* Right Side: Shift Status & Quick Action */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeShift ? (
          <div className="flex items-center gap-1 bg-accent/15 border border-accent/30 px-2 py-1 rounded-lg text-[11px] font-bold text-accent-text">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse shrink-0" />
            <button
              type="button"
              onClick={onOpenCashMovement}
              className="hover:underline"
              title="Catat Kas Masuk/Keluar"
            >
              +/- Kas
            </button>
            <span className="text-muted/60">|</span>
            <button
              type="button"
              onClick={onOpenCloseShiftModal}
              className="text-rose-600 hover:underline"
              title="Tutup Shift"
            >
              Tutup
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenShiftModal}
            className="px-2 py-1 rounded-lg bg-accent/20 border border-accent/40 text-accent-text text-[11px] font-bold hover:bg-accent/30 transition-colors"
            title="Buka Shift Kasir"
          >
            + Shift
          </button>
        )}
        <CashierPrinter settings={storeSettings} />
        {getPosScope()?.claims.role!=='cashier'&&<button type="button" onClick={onAdmin} className="px-2.5 py-1.5 bg-card border border-line text-fg rounded-xl text-xs font-bold">Admin</button>}
      </div>
    </header>
  );
}
