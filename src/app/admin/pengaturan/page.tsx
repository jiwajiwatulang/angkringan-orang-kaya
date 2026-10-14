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
      <div className="pb-3 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
          <span>⚙️</span>
          <span>Pusat Pengaturan SakuNota</span>
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Pilih kategori di bawah untuk mengonfigurasi toko Anda tanpa perlu scroll panjang.
        </p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {settingsCategories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200/80 dark:border-gray-800 hover:border-emerald-500/50 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                  {cat.badge}
                </span>
              </div>

              <h3 className="font-black text-base text-gray-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                {cat.title}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {cat.desc}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span>Buka Pengaturan</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>
        ))}
      </div>

      {/* App Architecture Info Banner */}
      <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🛡️</span>
          <div>
            <span className="font-bold block">SakuNota POS v2.1 • Offline-First Native</span>
            <span className="text-[11px] opacity-80">Seluruh data tersimpan aman di Dexie IndexedDB lokal perangkat Anda.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
