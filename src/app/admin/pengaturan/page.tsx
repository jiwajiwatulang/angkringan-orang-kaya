"use client";

import React, { useState } from "react";
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
      badge: storeSettings.paperWidth || "58mm",
    },
    {
      href: "/admin/pengaturan/keamanan",
      icon: "🔒",
      title: "Keamanan & PIN Admin",
      desc: "Ganti PIN Admin 4 digit untuk melindungi Void, Refund, dan Pengaturan Sensitif.",
      badge: storeSettings.enablePin ? "PIN Aktif" : "PIN Siap",
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
      title: "Data & Cadangan",
      desc: "Simpan salinan data usaha, kembalikan data lama, atau pindah ke HP baru.",
      badge: "Simpan Data",
    },
    {
      href: "/admin/pengaturan/tentang",
      icon: "ℹ️",
      title: "Tentang Aplikasi & Bantuan",
      badge: "Informasi",
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
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
        {settingsCategories.map((cat) => (
          <Link
            key={cat.href}
            href={cat.href}
            className="p-5 rounded-3xl bg-surface border border-line hover:border-accent/50 hover:shadow-md transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="w-12 h-12 rounded-2xl bg-accent/20 text-accent-text flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
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

      {/* Customer-Facing About & Support Banner */}
      <div className="p-5 rounded-3xl bg-surface border border-line space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-accent/20 text-accent-text flex items-center justify-center text-xl">
              🏪
            </span>
            <div>
              <h3 className="font-black text-sm text-fg">SakuNota — Kasir Tetap Jalan, Meski Tanpa Internet</h3>
              <p className="text-xs text-muted">Aplikasi kasir praktis tanpa biaya bulanan. Solusi mandiri untuk UMKM.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/pengaturan/tentang"
              className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-accent-text border border-line transition-colors"
            >
              Lihat Detail & Bantuan →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
