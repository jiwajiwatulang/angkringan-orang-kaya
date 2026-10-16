"use client";

import React from "react";
import Link from "next/link";
import { StoreSettings } from "@/lib/settings";
import ThemeToggle from "@/components/ThemeToggle";

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
    <div className="flex-1 overflow-y-auto p-4 pb-28 space-y-4 select-none">
      {/* 1. Header */}
      <div>
        <h2 className="text-lg font-black text-fg">
          Lainnya & Pengaturan
        </h2>
        <p className="text-xs text-muted">
          Kelola shift kasir, menu, printer, dan konfigurasi toko.
        </p>
      </div>

      {/* 2. Shift Management Card */}
      <div className="bg-card border border-line rounded-3xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">💼</span>
            <div>
              <h3 className="text-xs font-black text-fg uppercase tracking-wider">
                Shift Kasir
              </h3>
              <span className="text-[11px] text-muted block">
                {activeShift ? `Operator: ${activeShift.operatorName}` : "Belum ada shift terbuka"}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              activeShift
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-line text-muted"
            }`}
          >
            {activeShift ? "Shift Aktif" : "Shift Tutup"}
          </span>
        </div>

        {activeShift && (
          <div className="bg-surface rounded-2xl p-3 border border-line flex items-center justify-between">
            <span className="text-xs text-muted">Kas di Laci:</span>
            <span className="text-sm font-black text-accent-text">
              Rp {(currentShiftStats?.expectedCash || activeShift.startingCash || 0).toLocaleString("id-ID")}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-1">
          {activeShift ? (
            <>
              <button
                type="button"
                onClick={onOpenCashMovement}
                className="py-2.5 bg-surface hover:bg-line border border-line text-xs font-bold text-fg rounded-xl active:scale-95 transition-all text-center"
              >
                💵 +/- Kas Fisik
              </button>
              <button
                type="button"
                onClick={onOpenCloseShiftModal}
                className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl active:scale-95 transition-all text-center shadow-sm"
              >
                🔒 Tutup Shift
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenShiftModal}
              className="col-span-2 py-3 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl active:scale-95 transition-all shadow-md shadow-accent/20"
            >
              💼 Buka Shift Baru Sekarang
            </button>
          )}
        </div>
      </div>

      {/* 3. Navigation Shortcuts */}
      <div className="bg-card border border-line rounded-3xl overflow-hidden shadow-sm divide-y divide-line/40">
        <Link
          href="/admin"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📊</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Dashboard Admin</h4>
              <p className="text-[10px] text-muted">Laporan omzet, produk terlaris, dan analitik</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>

        <Link
          href="/admin/menu"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🍽️</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Kelola Menu & Varian</h4>
              <p className="text-[10px] text-muted">Tambah item, ubah harga, toggle stok habis</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>

        <Link
          href="/admin/pengaturan/printer"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🖨️</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Printer Thermal Bluetooth</h4>
              <p className="text-[10px] text-muted">Hubungkan printer kasir 58mm / 80mm</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>

        <Link
          href="/admin/pengaturan/data"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">💾</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Data & Cadangan</h4>
              <p className="text-[10px] text-muted">Simpan data usaha atau pindah ke HP baru</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>

        <Link
          href="/admin/pengaturan"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">⚙️</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Pengaturan Toko & Pajak</h4>
              <p className="text-[10px] text-muted">Nama toko, alamat, footer struk, persentase pajak</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>

        {/* Theme Preference Toggle */}
        <div className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors">
          <div className="flex items-center gap-3">
            <span className="text-xl">🌓</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Mode Tampilan (Tema)</h4>
              <p className="text-[10px] text-muted">Beralih antara Mode Gelap (Dark) dan Terang (Light)</p>
            </div>
          </div>
          <ThemeToggle size="sm" showLabel />
        </div>

        <Link
          href="/panduan"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">📖</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Buku Panduan SakuNota</h4>
              <p className="text-[10px] text-muted">11 bab panduan lengkap cara pakai kasir, printer, dan laporan</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>

        <Link
          href="/admin/pengaturan/tentang"
          className="p-3.5 flex items-center justify-between hover:bg-surface/50 active:bg-surface transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">ℹ️</span>
            <div>
              <h4 className="text-xs font-bold text-fg">Tentang SakuNota</h4>
              <p className="text-[10px] text-muted">Status lisensi, informasi aplikasi, dan bantuan WhatsApp</p>
            </div>
          </div>
          <span className="text-muted text-xs">→</span>
        </Link>
      </div>

      {/* 4. Help & Wizard */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="w-full py-3 rounded-2xl bg-surface border border-line text-xs font-bold text-muted hover:text-fg hover:border-slate-500 active:scale-95 transition-all text-center flex items-center justify-center gap-2"
        >
          <span>✨</span>
          <span>Panduan Penggunaan Awal (Onboarding)</span>
        </button>
      </div>
    </div>
  );
}
