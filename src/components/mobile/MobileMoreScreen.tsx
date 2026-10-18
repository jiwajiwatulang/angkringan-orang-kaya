"use client";
import LineIcon from "@/components/LineIcon";

import React from "react";
import Link from "next/link";
import { StoreSettings } from "@/lib/settings";

interface MobileMoreScreenProps {
  storeSettings: StoreSettings;
  showOnboarding?: boolean;
  activeShift: any;
  currentShiftStats: any;
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
  onOpenCashMovement: () => void;
  onOpenOnboarding: () => void;
}

export default function MobileMoreScreen({
  storeSettings,
  showOnboarding = false,
  activeShift,
  currentShiftStats,
  onOpenShiftModal,
  onOpenCloseShiftModal,
  onOpenCashMovement,
  onOpenOnboarding,
}: MobileMoreScreenProps) {
  return (
    <div className="flex-1 overflow-y-auto p-3.5 pb-28 space-y-3.5 select-none bg-slate-50 text-slate-900">
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black text-slate-900">
            Menu Lainnya &amp; Pengaturan
          </h2>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-extrabold text-blue-700">
          SakuNota
        </span>
      </div>

      {/* 2. Shift Management Card */}
      <div className="bg-white border border-blue-100 rounded-2xl p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Shift Kasir
              </h3>
              <span className="text-[11px] text-slate-600 block">
                {activeShift
                  ? `Operator: ${activeShift.operatorName}`
                  : "Belum ada shift terbuka"}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
              activeShift
                ? "bg-blue-50 text-blue-700 border border-blue-200"
                : "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {activeShift ? "Shift Aktif" : "Shift Tutup"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {activeShift ? (
            <>
              <button
                type="button"
                onClick={onOpenCashMovement}
                className="py-2.5 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-extrabold text-blue-800 rounded-xl active:scale-95 transition-all text-center"
              > +/- Kas Fisik
              </button>
              <button
                type="button"
                onClick={onOpenCloseShiftModal}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl active:scale-95 transition-all text-center shadow-xs"
              > Tutup Shift
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenShiftModal}
              className="col-span-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl active:scale-95 transition-all shadow-sm"
            > Buka Shift Baru Sekarang
            </button>
          )}
        </div>
      </div>

      {/* 3. Compact 4-Grid Navigation Shortcuts (Tidak Memanjang ke Bawah) */}
      <div>
        <span className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider px-1 block mb-2">
          Pengaturan &amp; Backoffice
        </span>
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/admin"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="chart" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Laporan Omzet
            </span>
          </Link>

          <Link
            href="/admin/menu"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="food" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Kelola Menu
            </span>
          </Link>

          <Link
            href="/admin/pengaturan/printer"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="printer" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Printer Struk
            </span>
          </Link>

          <Link
            href="/admin/pengaturan/data"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="backup" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Backup Data
            </span>
          </Link>

          <Link
            href="/admin/pengaturan"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="settings" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Info Toko
            </span>
          </Link>

          <Link
            href="/panduan"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="guide" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Buku Panduan
            </span>
          </Link>

          <Link
            href="/admin/pengaturan/tentang"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="pin" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Status Lisensi
            </span>
          </Link>

          <Link
            href="/tentang"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><LineIcon name="info" /></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Tentang Kami
            </span>
          </Link>
        </div>
      </div>

      {/* 4. Help & Wizard */}
      {showOnboarding && <div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="w-full py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-extrabold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
        >
          <span><LineIcon name="lightning" /></span>
          <span>Buka Panduan Persiapan Awal Toko</span>
        </button>
      </div>}
    </div>
  );
}
