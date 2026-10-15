"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function SakuNotaLandingPage() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (idx: number) => {
    setActiveFaq(activeFaq === idx ? null : idx);
  };

  const faqs = [
    {
      q: "Apakah SakuNota benar-benar bisa digunakan tanpa internet?",
      a: "Ya. Setelah dibuka dan dipasang pertama kali di browser Anda, seluruh aset aplikasi disimpan oleh Service Worker dan seluruh data transaksi, menu, serta meja tersimpan di memori lokal perangkat (IndexedDB). Anda tetap bisa melayani pesanan dan mencetak struk thermal walau sinyal mati total.",
    },
    {
      q: "Apakah ada biaya langganan bulanan atau tahunan?",
      a: "Tidak ada sama sekali. SakuNota dirancang dengan model sekali bayar Rp25.000 untuk akses berkelanjutan. Tidak ada biaya perpanjangan, tidak ada potongan komisi per transaksi, dan tidak ada iklan yang mengganggu kasir.",
    },
    {
      q: "Bagaimana jika HP kasir hilang, rusak, atau ganti baru?",
      a: "Karena data tersimpan secara lokal tanpa database cloud pihak ketiga, Anda dapat menggunakan fitur 'Cadangkan Data (.JSON)' kapan saja dan menyimpannya di WhatsApp atau Google Drive pribadi. Di HP baru, cukup buka SakuNota dan klik 'Pulihkan Data' untuk mengembalikan seluruh menu dan transaksi.",
    },
    {
      q: "Printer apa saja yang didukung oleh SakuNota?",
      a: "Mendukung seluruh printer thermal mini Bluetooth standar ESC/POS dengan lebar kertas 58mm maupun 80mm (seperti merek Panda, Eppos, VSC, Zjiang, Kassen, dsb.), serta printer sistem via dialog cetak browser.",
    },
    {
      q: "Apakah perlu mendownload file APK besar?",
      a: "Tidak perlu. Cukup buka SakuNota di browser Google Chrome atau Safari, lalu pilih menu 'Tambahkan ke Layar Utama' (Install PWA). Aplikasi akan langsung terpasang di HP Anda dengan ikon rapi tanpa memakan memori berlebih.",
    },
  ];

  const features = [
    {
      icon: "📋",
      title: "Katalog & Varian Menu",
      desc: "Kelola makanan, minuman, harga, foto, kategori, opsi level pedas/topping (modifier), dan tandai stok habis dalam satu ketukan.",
    },
    {
      icon: "🪑",
      title: "Manajemen Meja & Pesanan",
      desc: "Visual denah meja makan, status terisi atau kosong, nama pelanggan, pesanan dine-in atau bawa pulang (takeaway), serta gabung meja.",
    },
    {
      icon: "💵",
      title: "Pembayaran Tunai & QRIS",
      desc: "Kalkulator uang pas & kembalian cepat, upload bukti transfer QRIS/Bank, serta fitur Split Bill (bagi rata atau bayar per menu).",
    },
    {
      icon: "🖨️",
      title: "Cetak Struk Bluetooth Thermal",
      desc: "Mendukung printer thermal 58mm & 80mm. Cetak struk kasir, tiket dapur terpisah, tiket bar minuman, dan nota draft tanpa mencetak UI browser.",
    },
    {
      icon: "💼",
      title: "Rekap Shift & Z-Report",
      desc: "Catat modal awal laci kasir, penjualan tunai vs non-tunai, kas masuk, kas keluar, dan verifikasi selisih fisik laci secara transparan.",
    },
    {
      icon: "💾",
      title: "Cadangan Mandiri 100% Offline",
      desc: "Data sepenuhnya milik Anda di memori HP. Dilengkapi validasi berkas, pratinjau data, dan snapshot darurat auto-rollback.",
    },
  ];

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col selection:bg-accent selection:text-white">
      {/* 1. Header Nav */}
      <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md shadow-accent/20">
            SN
          </div>
          <div>
            <span className="font-black text-base text-fg tracking-tight block leading-none">
              SakuNota
            </span>
            <span className="text-[10px] text-muted font-bold tracking-wider uppercase block mt-0.5">
              Kasir Simpel UMKM
            </span>
          </div>
        </div>

        {/* Center Nav links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-muted">
          <a href="#fitur" className="hover:text-fg transition-colors">
            Fitur
          </a>
          <a href="#harga" className="hover:text-fg transition-colors">
            Harga
          </a>
          <a href="#cara-kerja" className="hover:text-fg transition-colors">
            Cara Pakai
          </a>
          <a href="#faq" className="hover:text-fg transition-colors">
            Tanya Jawab
          </a>
        </nav>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-accent/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Buka Kasir</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative px-4 sm:px-8 pt-16 pb-20 md:pt-24 md:pb-28 max-w-5xl mx-auto text-center space-y-6">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-accent/20 border border-accent/40 text-accent-text text-xs font-bold">
          <span>🏪</span>
          <span>HARGA PERKENALAN • COBA GRATIS 7 HARI</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black text-fg tracking-tight leading-[1.1] max-w-3xl mx-auto">
          Kasir Simpel, Usaha Lebih Tertata.
        </h1>

        {/* Subtitle */}
        <p className="text-sm sm:text-lg text-muted max-w-2xl mx-auto leading-relaxed">
          Kelola pesanan, meja, pembayaran, dan laporan langsung dari browser. Mulai gratis selama 7 hari, lalu bayar satu kali untuk akses berkelanjutan.
        </p>

        {/* Price Highlight Badge */}
        <div className="inline-block pt-1">
          <div className="px-5 py-3 rounded-2xl bg-surface border border-accent/40 shadow-lg shadow-accent/10 inline-flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted line-through font-bold">Rp50.000</span>
              <span className="text-3xl font-black text-accent-text">Rp25.000</span>
            </div>
            <span className="text-xs text-muted font-bold uppercase tracking-wider">
              / Sekali Bayar • Tanpa Biaya Bulanan
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/pos"
            className="w-full sm:w-auto px-7 py-3.5 bg-accent hover:bg-accent-hover text-white font-black text-sm rounded-2xl shadow-xl shadow-accent/25 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Buka Kasir Sekarang</span>
            <span>→</span>
          </Link>

          <Link
            href="/pos"
            className="w-full sm:w-auto px-7 py-3.5 bg-card hover:bg-line text-fg font-bold text-sm rounded-2xl border border-line transition-all flex items-center justify-center gap-2"
          >
            <span>Lihat Demo Kasir</span>
          </Link>
        </div>

        {/* Trust Badges */}
        <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-muted">
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Coba gratis 7 hari
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Bayar satu kali setelah trial
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Dirancang bisa digunakan offline setelah aktivasi
          </span>
          <span className="flex items-center gap-1.5">
            <span className="text-emerald-400">✓</span> Tanpa potongan komisi per transaksi
          </span>
        </div>
      </section>

      {/* 3. Interactive POS Preview Mockup */}
      <section className="px-4 sm:px-8 max-w-5xl mx-auto pb-20">
        <div className="p-3 sm:p-5 rounded-3xl bg-surface border border-line shadow-2xl space-y-3">
          {/* Mockup browser bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-card/60 rounded-2xl border border-line/60 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="font-mono text-[11px] text-muted">sakunota.my.id/pos</span>
            <span className="text-[10px] font-bold text-emerald-400">🟢 Offline Ready</span>
          </div>

          {/* Visual Workspace Grid Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Catalog preview */}
            <div className="md:col-span-2 p-4 rounded-2xl bg-card border border-line/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-fg">Katalog Menu Kasir</span>
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-accent/20 text-accent-text font-bold">
                  Kategori: Makanan & Minuman
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-surface border border-line/50 space-y-1">
                  <div className="font-bold text-fg truncate">Ayam Panggang Paha</div>
                  <div className="text-[11px] font-black text-accent-text">Rp 25.000</div>
                  <span className="text-[9px] text-emerald-400 block font-bold">Tersedia</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface border border-line/50 space-y-1">
                  <div className="font-bold text-fg truncate">Nasi Bakar Suwir</div>
                  <div className="text-[11px] font-black text-accent-text">Rp 15.000</div>
                  <span className="text-[9px] text-emerald-400 block font-bold">Tersedia</span>
                </div>
                <div className="p-2.5 rounded-xl bg-surface border border-line/50 space-y-1">
                  <div className="font-bold text-fg truncate">Es Teh Manis Jumbo</div>
                  <div className="text-[11px] font-black text-accent-text">Rp 5.000</div>
                  <span className="text-[9px] text-emerald-400 block font-bold">Tersedia</span>
                </div>
              </div>

              {/* Meja status */}
              <div className="pt-2 border-t border-line/40 flex items-center justify-between text-[11px]">
                <span className="text-muted">Denah Meja Aktif:</span>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40">
                    Meja 1 (Kosong)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 font-bold border border-amber-800/40">
                    Meja 2 (Terisi)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-800/40">
                    Meja 3 (Kosong)
                  </span>
                </div>
              </div>
            </div>

            {/* Cart & Thermal Receipt Preview */}
            <div className="p-4 rounded-2xl bg-white text-black font-mono text-[11px] space-y-2 flex flex-col justify-between shadow-inner">
              <div className="space-y-1 text-center">
                <div className="font-black text-xs uppercase tracking-tight">SAKUNOTA POS</div>
                <div className="text-[9px] text-neutral-600">STRUK KASIR THERMAL 58MM</div>
                <div className="border-t border-dashed border-black my-1" />
                <div className="flex justify-between text-[10px]">
                  <span>No: A-042</span>
                  <span className="font-bold">[Meja 2]</span>
                </div>
                <div className="border-t border-dashed border-black my-1" />
                <div className="flex justify-between font-bold text-left">
                  <span>1x Ayam Panggang</span>
                  <span>Rp 25.000</span>
                </div>
                <div className="flex justify-between font-bold text-left">
                  <span>2x Es Teh Jumbo</span>
                  <span>Rp 10.000</span>
                </div>
                <div className="border-t border-dashed border-black my-1" />
                <div className="flex justify-between font-black text-xs">
                  <span>TOTAL:</span>
                  <span>Rp 35.000</span>
                </div>
                <div className="text-[9px] text-neutral-700">Metode: Tunai (Pas)</div>
                <div className="text-center font-black text-[10px] mt-1 border border-black py-0.5">
                  ✅ LUNAS
                </div>
              </div>

              <div className="text-[9px] text-center text-neutral-500">
                Cetak Bluetooth 58mm / 80mm
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Fitur Lengkap Section */}
      <section id="fitur" className="px-4 sm:px-8 py-20 bg-surface/50 border-t border-b border-line">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              SEMUA YANG DIBUTUHKAN KASIR
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-fg tracking-tight">
              Satu Produk, Semua Fitur Kasir Inti
            </h2>
            <p className="text-sm text-muted max-w-xl mx-auto">
              Tidak ada fitur yang disembunyikan di balik paket mahal. Anda mendapatkan sistem kasir lengkap langsung dari awal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, idx) => (
              <div
                key={idx}
                className="p-6 rounded-3xl bg-surface border border-line hover:border-accent/40 transition-all space-y-3 group"
              >
                <div className="w-12 h-12 rounded-2xl bg-card text-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  {f.icon}
                </div>
                <h3 className="text-base font-black text-fg group-hover:text-accent-text transition-colors">
                  {f.title}
                </h3>
                <p className="text-xs text-muted leading-relaxed">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Perbandingan Harga Section */}
      <section id="harga" className="px-4 sm:px-8 py-20 max-w-5xl mx-auto space-y-12">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            SKEMA BIAYA JUJUR & HEMAT
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-fg tracking-tight">
            Cukup Sekali Bayar, Bebas Beban Bulanan
          </h2>
          <p className="text-sm text-muted max-w-xl mx-auto">
            Bandingkan pengeluaran operasional toko Anda antara kasir sewa bulanan dan SakuNota.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card Kasir Langganan Lain */}
          <div className="p-8 rounded-3xl bg-surface/40 border border-line/60 space-y-6 flex flex-col justify-between opacity-80">
            <div className="space-y-4">
              <span className="text-xs font-bold text-muted uppercase tracking-wider block">
                Aplikasi Kasir Berlangganan (SaaS Lain)
              </span>
              <div className="text-3xl font-black text-fg">
                Rp 100.000 - Rp 300.000 <span className="text-xs font-normal text-muted">/ bulan</span>
              </div>
              <p className="text-xs text-muted">
                Beban tetap yang harus Anda bayar setiap bulan, baik toko sedang ramai maupun sepi.
              </p>

              <div className="space-y-2.5 pt-2 text-xs text-muted divide-y divide-line/40">
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-red-400 font-bold">✕</span> Total Rp 1.200.000 - Rp 3.600.000 setiap tahun
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-red-400 font-bold">✕</span> Sering tidak bisa transaksi jika kuota internet habis
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-red-400 font-bold">✕</span> Akun dikunci seketika jika telat bayar bulanan
                </div>
              </div>
            </div>

            <div className="pt-4 text-xs text-muted text-center italic">
              Beban rutin yang mengurangi laba bersih UMKM
            </div>
          </div>

          {/* Card SakuNota */}
          <div className="p-8 rounded-3xl bg-gradient-to-b from-surface to-card border-2 border-accent shadow-2xl shadow-accent/10 space-y-6 flex flex-col justify-between relative">
            <div className="absolute -top-3 right-6 px-3 py-1 rounded-full bg-accent text-white text-[10px] font-black tracking-wider uppercase">
              Harga Perkenalan
            </div>

            <div className="space-y-4">
              <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
                SakuNota
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <span className="text-sm text-muted line-through font-bold">Rp 50.000</span>
                  <span className="text-4xl font-black text-fg">Rp 25.000</span>
                  <span className="text-xs font-bold text-accent-text">sekali bayar</span>
                </div>
                <p className="text-xs text-muted">
                  Harga perkenalan untuk pemilik usaha di tahap awal. Tanpa biaya bulanan.
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-fg divide-y divide-line/60">
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> <strong>Coba gratis 7 hari:</strong> Akses seluruh fitur kasir tanpa komitmen awal
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> <strong>Rp0 biaya langganan:</strong> Akses berkelanjutan tanpa tanggal kedaluwarsa
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> <strong>100% Offline-ready:</strong> Jualan tetap jalan walau internet mati
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> <strong>1 Bisnis 1 Instalasi Aktif:</strong> Lisensi untuk satu perangkat kasir operasional
                </div>
                <div className="pt-2 flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span> <strong>Data privat:</strong> Semua transaksi tersimpan di memori perangkat Anda
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href="/pos"
                className="w-full py-3.5 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-2xl shadow-lg shadow-accent/25 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Mulai Coba Kasir Sekarang</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Cara Kerja PWA Offline Section */}
      <section id="cara-kerja" className="px-4 sm:px-8 py-20 bg-surface/50 border-t border-b border-line">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
              KEMUDAHAN APLIKASI WEB PWA
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-fg tracking-tight">
              Tiga Langkah Mudah Memulai
            </h2>
            <p className="text-sm text-muted max-w-xl mx-auto">
              Tidak perlu instalasi yang rumit dari toko aplikasi. Siap pakai dalam 1 menit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-surface border border-line space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent-text font-black text-base flex items-center justify-center">
                1
              </div>
              <h3 className="font-black text-base text-fg">Buka di Browser</h3>
              <p className="text-xs text-muted leading-relaxed">
                Akses website SakuNota dari browser Google Chrome atau Safari di HP, tablet kasir, atau laptop Anda.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface border border-line space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent-text font-black text-base flex items-center justify-center">
                2
              </div>
              <h3 className="font-black text-base text-fg">Pasang di Layar Utama</h3>
              <p className="text-xs text-muted leading-relaxed">
                Ketuk opsi browser <strong>"Tambahkan ke Layar Utama" (Install PWA)</strong> agar SakuNota memiliki ikon sendiri seperti aplikasi resmi.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-surface border border-line space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-accent/20 text-accent-text font-black text-base flex items-center justify-center">
                3
              </div>
              <h3 className="font-black text-base text-fg">Jualan Tanpa Internet</h3>
              <p className="text-xs text-muted leading-relaxed">
                Setelah terbuka, kasir siap melayani pesanan, mengatur meja, dan mencetak struk walau tanpa kuota data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ Section */}
      <section id="faq" className="px-4 sm:px-8 py-20 max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-bold text-accent-text uppercase tracking-wider block">
            PERTANYAAN UMUM
          </span>
          <h2 className="text-3xl font-black text-fg tracking-tight">
            Hal yang Sering Ditanyakan
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((f, idx) => (
            <div
              key={idx}
              className="rounded-2xl bg-surface border border-line overflow-hidden transition-colors"
            >
              <button
                type="button"
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 sm:p-5 flex items-center justify-between text-left text-xs sm:text-sm font-bold text-fg hover:text-accent-text transition-colors"
              >
                <span>{f.q}</span>
                <span className="text-muted ml-2 shrink-0">{activeFaq === idx ? "▲" : "▼"}</span>
              </button>

              {activeFaq === idx && (
                <div className="px-4 pb-5 sm:px-5 sm:pb-5 text-xs text-muted leading-relaxed border-t border-line/40 pt-3 animate-in fade-in duration-150">
                  {f.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 8. Bottom CTA Banner */}
      <section className="px-4 sm:px-8 pb-20 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-accent to-blue-700 text-white text-center space-y-5 shadow-2xl">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Mulai Rapikan Kasir Usaha Anda Sekarang
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl mx-auto leading-relaxed">
            Tidak ada komitmen kartu kredit. Langsung coba di browser Anda dan rasakan kemudahan kasir mandiri SakuNota.
          </p>
          <div className="pt-2">
            <Link
              href="/pos"
              className="inline-flex px-8 py-4 bg-white hover:bg-slate-100 text-accent font-black text-sm rounded-2xl shadow-lg shadow-black/20 transition-all active:scale-95"
            >
              Buka Kasir SakuNota Sekarang →
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Footer */}
      <footer className="mt-auto border-t border-line bg-surface px-4 sm:px-8 py-10 text-xs text-muted">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-accent text-white flex items-center justify-center font-black text-xs">
              SN
            </div>
            <div>
              <span className="font-bold text-fg block">SakuNota</span>
              <span className="text-[11px] text-muted">Kasir simpel, usaha lebih tertata.</span>
            </div>
          </div>

          {/* Contact and Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <a
              href="https://wa.me/6281234567890"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-fg transition-colors"
            >
              Bantuan WhatsApp
            </a>
            <span className="text-line">•</span>
            <a href="mailto:support@sakunota.my.id" className="hover:text-fg transition-colors">
              support@sakunota.my.id
            </a>
            <span className="text-line">•</span>
            <Link href="/admin/pengaturan/tentang" className="hover:text-fg transition-colors">
              Kebijakan Privasi & Ketentuan
            </Link>
            <span className="text-line">•</span>
            <Link href="/pos" className="text-accent-text font-bold hover:underline">
              Buka Kasir POS
            </Link>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mt-6 pt-6 border-t border-line/40 text-center text-[11px] text-muted">
          © 2026 SakuNota. Hak Cipta Dilindungi. Aplikasi kasir offline untuk UMKM Indonesia.
        </div>
      </footer>
    </div>
  );
}
