"use client";

import React, { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

export default function SakuNotaOwnerDashboardPage() {
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "trial" | "pending">("all");

  const metrics = [
    { label: "Total Pembeli", value: "120", change: "+14 bulan ini", icon: "👥", color: "text-blue-500" },
    { label: "Lisensi Aktif", value: "97", change: "81% dari total pembeli", icon: "🔑", color: "text-emerald-500" },
    { label: "Pengguna Aktif (30 Hari)", value: "76", change: "Perangkat terhubung online", icon: "⚡", color: "text-amber-500" },
    { label: "Menunggu Pembayaran", value: "8", change: "Follow-up WhatsApp", icon: "⏳", color: "text-rose-500" },
  ];

  const customers = [
    {
      id: "CUST-001",
      businessName: "Warung Bu Sari",
      ownerName: "Ibu Sari",
      whatsapp: "081234567890",
      city: "Yogyakarta",
      licenseKey: "SN-BS01-9921-X812",
      status: "active",
      statusLabel: "Aktif",
      installedVersion: "v1.4.2",
      lastConnected: "Hari ini, 10:15 WIB",
      paymentMethod: "QRIS",
    },
    {
      id: "CUST-002",
      businessName: "Kedai Pak Budi",
      ownerName: "Pak Budi",
      whatsapp: "081398765432",
      city: "Solo",
      licenseKey: "SN-PB02-8842-Y931",
      status: "active",
      statusLabel: "Aktif",
      installedVersion: "v1.4.2",
      lastConnected: "2 hari lalu",
      paymentMethod: "Transfer BCA",
    },
    {
      id: "CUST-003",
      businessName: "Angkringan Jaya",
      ownerName: "Mas Jaya",
      whatsapp: "081755566677",
      city: "Semarang",
      licenseKey: "SN-AJ03-TRIAL-7712",
      status: "trial",
      statusLabel: "Trial",
      installedVersion: "v1.4.1",
      lastConnected: "5 hari lalu",
      paymentMethod: "Belum Bayar",
    },
    {
      id: "CUST-004",
      businessName: "Kopi Klotok Asri",
      ownerName: "Bambang Wijaya",
      whatsapp: "081900112233",
      city: "Sleman",
      licenseKey: "SN-KK04-9128-Z554",
      status: "active",
      statusLabel: "Aktif",
      installedVersion: "v1.4.2",
      lastConnected: "Kemarin",
      paymentMethod: "QRIS",
    },
    {
      id: "CUST-005",
      businessName: "Bakso Goyang Lidah",
      ownerName: "H. Sukirno",
      whatsapp: "085233445566",
      city: "Magelang",
      licenseKey: "Menunggu Terbit",
      status: "pending",
      statusLabel: "Menunggu Pembayaran",
      installedVersion: "-",
      lastConnected: "-",
      paymentMethod: "Menunggu Bukti Transfer",
    },
  ];

  const filteredCustomers = customers.filter((c) => {
    if (filterStatus === "all") return true;
    return c.status === filterStatus;
  });

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col selection:bg-accent selection:text-white">
      {/* 1. Owner Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md shadow-purple-600/20">
            👑
          </div>
          <div>
            <span className="font-black text-lg text-fg tracking-tight block leading-none">
              Admin SakuNota (Owner Portal)
            </span>
            <span className="text-[10px] text-muted font-bold tracking-wider uppercase block mt-0.5">
              Pemantauan Pelanggan & Lisensi SakuNota
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle size="sm" />
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-xl bg-card hover:bg-line text-xs font-bold text-fg border border-line transition-colors"
          >
            ← Kembali ke Website
          </Link>
          <Link
            href="/pos"
            className="px-3.5 py-1.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold shadow-sm transition-all"
          >
            Buka Kasir POS
          </Link>
        </div>
      </header>

      {/* 2. Main Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in duration-200">
        {/* Architecture & Privacy Notice */}
        <div className="p-5 sm:p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h2 className="font-black text-base text-fg">
                Pemisahan Data Pemilik vs Database Kasir Warung
              </h2>
              <p className="text-xs text-muted">
                Prinsip privasi SakuNota: Mengelola lisensi tanpa menyedot detail transaksi UMKM.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <strong className="text-emerald-600 dark:text-emerald-400 font-black block">
                ✅ Yang Dipantau di Cloudflare D1 & Workers:
              </strong>
              <p className="text-muted leading-relaxed">
                Jumlah pembeli, status lisensi aktif/kedaluwarsa, versi aplikasi yang terpasang, dan waktu terakhir perangkat terhubung (ping liveness saat online).
              </p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
              <strong className="text-amber-600 dark:text-amber-400 font-black block">
                🔒 Yang Aman & Privat di Perangkat Warung:
              </strong>
              <p className="text-muted leading-relaxed">
                Rincian transaksi, daftar menu rahasia, nama tamu pembeli, dan total omzet tidak diambil otomatis. Hak milik data sepenuhnya ada pada pemilik warung.
              </p>
            </div>
          </div>
        </div>

        {/* 3. Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m, idx) => (
            <div key={idx} className="p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-muted">
                <span>{m.label}</span>
                <span className="text-lg">{m.icon}</span>
              </div>
              <div className="text-3xl font-black text-fg">{m.value}</div>
              <span className={`text-[11px] font-semibold block ${m.color}`}>
                {m.change}
              </span>
            </div>
          ))}
        </div>

        {/* 4. Customer Management Table */}
        <div className="bg-surface rounded-3xl border border-line shadow-sm overflow-hidden space-y-4 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div>
              <h3 className="font-black text-lg text-fg">Daftar Pelanggan SakuNota</h3>
              <p className="text-xs text-muted">Data pembeli, lisensi perangkat, dan status koneksi</p>
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterStatus("all")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === "all"
                    ? "bg-accent text-white"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Semua ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("active")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === "active"
                    ? "bg-emerald-600 text-white"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Aktif ({customers.filter((c) => c.status === "active").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("trial")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === "trial"
                    ? "bg-amber-600 text-white"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Trial ({customers.filter((c) => c.status === "trial").length})
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus("pending")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  filterStatus === "pending"
                    ? "bg-rose-600 text-white"
                    : "bg-card text-muted hover:text-fg border border-line"
                }`}
              >
                Menunggu ({customers.filter((c) => c.status === "pending").length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-muted uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-3">Nama Usaha & Pemilik</th>
                  <th className="py-3 px-3">Kontak WhatsApp</th>
                  <th className="py-3 px-3">Kode Lisensi</th>
                  <th className="py-3 px-3">Versi</th>
                  <th className="py-3 px-3">Terakhir Terhubung</th>
                  <th className="py-3 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {filteredCustomers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-card/40 transition-colors">
                    <td className="py-3.5 px-3">
                      <div className="font-black text-fg">{cust.businessName}</div>
                      <div className="text-[11px] text-muted">
                        {cust.ownerName} • {cust.city}
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <a
                        href={`https://wa.me/62${cust.whatsapp.replace(/^0/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
                      >
                        <span>💬</span>
                        <span>{cust.whatsapp}</span>
                      </a>
                      <span className="block text-[10px] text-muted">{cust.paymentMethod}</span>
                    </td>
                    <td className="py-3.5 px-3 font-mono text-[11px] text-fg select-all">
                      {cust.licenseKey}
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-card border border-line text-[10px] font-bold text-muted">
                        {cust.installedVersion}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-muted text-[11px]">
                      {cust.lastConnected}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          cust.status === "active"
                            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                            : cust.status === "trial"
                            ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                            : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                        }`}
                      >
                        {cust.statusLabel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. Cloudflare D1 Architecture Reference */}
        <div className="p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-black text-sm text-fg">Skema Database Cloudflare D1 (Rekomendasi Pemilik)</h4>
              <p className="text-xs text-muted mt-0.5">
                Model tabel ringan dan cepat untuk pencatatan pembeli & validasi lisensi SakuNota di edge.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black text-xs">
              Cloudflare Workers + D1
            </span>
          </div>

          <pre className="p-4 rounded-2xl bg-card border border-line font-mono text-[11px] text-fg overflow-x-auto leading-relaxed">
{`-- Tabel Pembeli & Usaha
CREATE TABLE buyers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  business_name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabel Lisensi Perangkat
CREATE TABLE licenses (
  license_key TEXT PRIMARY KEY,
  buyer_id TEXT REFERENCES buyers(id),
  device_fingerprint TEXT,
  status TEXT CHECK (status IN ('active', 'trial', 'expired', 'transferred')),
  app_version TEXT,
  last_ping_at DATETIME,
  activated_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`}
          </pre>
        </div>
      </main>

      {/* 6. Footer */}
      <footer className="mt-auto border-t border-line bg-surface px-4 sm:px-8 py-6 text-xs text-muted text-center">
        Portal Manajemen Khusus Pemilik SakuNota • Data terpisah dari instalasi kasir UMKM.
      </footer>
    </div>
  );
}
