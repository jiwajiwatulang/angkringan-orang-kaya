"use client";

import React from "react";
import Link from "next/link";
import { useAdmin } from "../AdminContext";

export default function AdminPengaturanHubPage() {
  const { storeSettings } = useAdmin();

  const settingsCategories = [
    {
      href: "/admin/pengaturan/profil",
      icon: "🏪",
      title: "Profil Usaha & Struk",
      desc: "Nama toko, alamat cabang, kontak WhatsApp, dan catatan kaki struk thermal.",
      badge: storeSettings.storeName || "Toko SakuNota",
    },
    {
      href: "/admin/pengaturan/printer",
      icon: "🖨️",
      title: "Printer Bluetooth Thermal",
      desc: "Pindai & hubungkan printer kasir Bluetooth (58mm/80mm) dan uji cetak.",
      badge: "Thermal 58mm",
    },
    {
      href: "/admin/pengaturan/keamanan",
      icon: "🔒",
      title: "Keamanan & PIN Admin",
      desc: "Ganti PIN Admin 4 digit untuk melindungi Void, Refund, dan Pengaturan Sensitif.",
      badge: "PIN Aktif",
    },
    {
      href: "/admin/pengaturan/pajak",
      icon: "💵",
      title: "Pajak & Biaya Layanan",
      desc: "Konfigurasi PBJT Restoran (pajak daerah) dan Service Charge otomatis.",
      badge: storeSettings.enableTax ? `PBJT ${storeSettings.taxPercent}%` : "Nonaktif",
    },
    {
      href: "/admin/pengaturan/data",
      icon: "💾",
      title: "Cadangan, Pulihkan & Reset",
      desc: "Ekspor file cadangan .JSON ke memori HP, pulihkan data, dan kelola database.",
      badge: "Ekspor JSON",
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-4xl">
      {/* Header */}
      <div className="pb-3 border-b border-line">
        <h2 className="text-2xl font-black text-fg tracking-tight flex items-center gap-2">
          <span>⚙️</span>
          <span>Pusat Pengaturan SakuNota</span>
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Pilih kategori di bawah untuk mengonfigurasi toko Anda tanpa perlu scroll panjang.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {settingsCategories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="p-5 rounded-3xl bg-surface border border-line hover:border-accent/50 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-12 h-12 rounded-2xl bg-accent/60 text-accent-text flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-card text-slate-300">
                  {cat.badge}
                </span>
              </div>

              <h3 className="font-black text-base text-fg group-hover:text-accent-text transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                {cat.desc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between text-xs font-bold text-accent-text">
              <span>Buka Pengaturan</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* App Architecture & Version Info Card */}
      <div className="p-5 rounded-3xl bg-surface border border-line space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 rounded-2xl bg-accent/60 text-accent-text flex items-center justify-center text-xl">
              ℹ️
            </span>
            <div>
              <h3 className="font-black text-sm text-fg">Tentang Aplikasi SakuNota</h3>
              <p className="text-[11px] text-muted">Informasi versi rilis dan integritas build sistem.</p>
            </div>
          </div>
          <span className="px-3 py-1 rounded-full bg-accent text-accent-text font-black text-xs">
            v2.2.0
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-card/50 border border-line/60">
            <span className="text-[10px] text-muted font-bold uppercase block">Versi Rilis</span>
            <strong className=" text-fg font-mono">v2.2.0-prod</strong>
          </div>

          <div className="p-3 rounded-2xl bg-card/50 border border-line/60">
            <span className="text-[10px] text-muted font-bold uppercase block">Git Commit</span>
            <strong className=" text-accent-text font-mono">19d1ca0</strong>
          </div>

          <div className="p-3 rounded-2xl bg-card/50 border border-line/60">
            <span className="text-[10px] text-muted font-bold uppercase block">Basis Data</span>
            <strong className=" text-fg font-mono">Dexie DB v8</strong>
          </div>

          <div className="p-3 rounded-2xl bg-card/50 border border-line/60">
            <span className="text-[10px] text-muted font-bold uppercase block">Arsitektur</span>
            <strong className=" text-fg font-mono">100% Offline</strong>
          </div>
        </div>

        <div className="pt-2 text-[11px] text-muted leading-relaxed flex items-center gap-1.5">
          <span>🛡️</span>
          <span>Seluruh transaksi, menu, meja, dan bukti pembayaran tersimpan secara lokal di IndexedDB perangkat Anda.</span>
        </div>
      </div>
    </div>
  );
}
