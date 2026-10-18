"use client";

import React from "react";
import Link from "next/link";
import { StoreSettings } from "@/lib/settings";

interface MobileMoreScreenProps {
  storeSettings: StoreSettings;
  activeShift: any;
  currentShiftStats: any;
  onOpenShiftModal: () => void;
  onOpenCloseShiftModal: () => void;
  onOpenCashMovement: () => void;
  onOpenOnboarding: () => void;
}

export default function MobileMoreScreen({
  storeSettings,
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
          <p className="text-[11px] text-slate-600">
            Kelola shift kasir, menu, printer, dan konfigurasi toko.
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-[10px] font-extrabold text-blue-700">
          SakuNota
        </span>
      </div>

      {/* 2. Shift Management Card */}
      <div className="bg-white border border-blue-100 rounded-2xl p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💼</span>
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
          Menu Pengaturan &amp; Backoffice (4 Grid Ringkas):
        </span>
        <div className="grid grid-cols-4 gap-2">
          <Link
            href="/admin"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 20h16M7 16v-4M12 16V5M17 16V9" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Laporan Omzet
            </span>
          </Link>

          <Link
            href="/admin/menu"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 12h13M10 8c2-4 8-4 10 0l1 4H8zM2 3v6M5 3v6M2 6h3M3.5 9v12M8 16h13" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Kelola Menu
            </span>
          </Link>

          <Link
            href="/admin/pengaturan/printer"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M7 8V3h10v5M7 17H3V8h18v9h-4M7 14h10v7H7zM17 11h1" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Printer Struk
            </span>
          </Link>

          <Link
            href="/admin/pengaturan/data"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14v6h16v-6M12 3v12M7 10l5 5 5-5" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Backup Data
            </span>
          </Link>

          <Link
            href="/admin/pengaturan"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3l1 4 4 1 2 4-3 3v4l-4 2-3-3-4 1-3-4 2-3-1-4 4-2zM14 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Info Toko
            </span>
          </Link>

          <Link
            href="/panduan"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v16M12 5C9 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-7-2-10 1" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Buku Panduan
            </span>
          </Link>

          <Link
            href="/admin/pengaturan/tentang"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 10a4 4 0 1 0-4 4M10 14l-7 7M5 19l2 2M8 16l2 2" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Status Lisensi
            </span>
          </Link>

          <Link
            href="/tentang"
            className="p-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 active:scale-95 transition-all flex flex-col items-center text-center gap-1 shadow-2xs"
          >
            <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-lg"><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></svg></span>
            <span className="text-[10px] font-extrabold text-slate-900 leading-tight">
              Tentang Kami
            </span>
          </Link>
        </div>
      </div>

      {/* 4. Help & Wizard */}
      <div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="w-full py-2.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-extrabold text-blue-700 hover:bg-blue-100 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
        >
          <span><svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L4 14h7l-1 8 10-13h-7z" /></svg></span>
          <span>Buka Panduan Persiapan Awal Toko</span>
        </button>
      </div>
    </div>
  );
}
