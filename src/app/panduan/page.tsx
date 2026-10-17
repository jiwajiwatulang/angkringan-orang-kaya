"use client";

import React, { useState } from "react";
import Link from "next/link";
import { SUPPORT_WHATSAPP } from "@/lib/config";

type GuideTabId =
  | "ringkasan"
  | "aktivasi"
  | "kasir"
  | "toko"
  | "backup"
  | "faq";

interface StepFlowItem {
  step: string;
  badge: string;
  title: string;
  desc: string;
  bullets: string[];
  targetLabel: string;
  targetHref: string;
  secondaryLabel?: string;
  secondaryHref?: string;
}

export default function PanduanPage() {
  const [activeTab, setActiveTab] = useState<GuideTabId>("ringkasan");
  const [searchQuery, setSearchQuery] = useState("");

  const navTabs: { id: GuideTabId; label: string; shortLabel: string; icon: string }[] = [
    { id: "ringkasan", label: "Ringkasan & Peta Arah", shortLabel: "Ringkasan", icon: "🧭" },
    { id: "aktivasi", label: "Pasang & Aktivasi Lisensi", shortLabel: "Aktivasi", icon: "🔑" },
    { id: "kasir", label: "Cara Pakai Kasir & Meja", shortLabel: "Kasir", icon: "🏪" },
    { id: "toko", label: "Atur Menu & Printer", shortLabel: "Menu & Struk", icon: "🖨️" },
    { id: "backup", label: "Laporan WA & Pindah HP", shortLabel: "Backup & WA", icon: "💾" },
    { id: "faq", label: "Tanya Jawab & Bantuan", shortLabel: "Tanya Jawab", icon: "💬" },
  ];

  const timelineSteps: StepFlowItem[] = [
    {
      step: "01",
      badge: "Langkah Pertama",
      title: "Aktifkan Kode Lisensi (Resmi / Tester / Trial)",
      desc: "Jika Anda sudah memiliki Kode Lisensi Resmi (SN-XXXX-XXXX-XXXX), Lisensi Tester (SN-TEST-XXXX), atau Lisensi Trial (SN-TRIAL-XXXX), Anda bisa langsung mengaktifkannya tanpa perlu Nomor Pesanan dan tanpa Kode Akses Rahasia.",
      bullets: [
        "Buka halaman utama SakuNota lalu klik tombol '🔑 Aktivasi Lisensi' di bagian atas, atau langsung buka halaman Kasir (/pos).",
        "Masukkan kode lisensi Anda pada kolom yang tersedia lalu tekan tombol 'Aktifkan Kasir'.",
        "Setelah aktif, lisensi akan mengunci otomatis di HP kasir Anda dan siap dipakai jualan tanpa internet.",
      ],
      targetLabel: "Buka Menu Aktivasi Lisensi Sekarang",
      targetHref: "/?aktivasi=true",
      secondaryLabel: "Atau Langsung ke Layar Kasir (/pos)",
      secondaryHref: "/pos",
    },
    {
      step: "02",
      badge: "Langkah Kedua",
      title: "Pasang Ikon SakuNota ke Layar Utama HP",
      desc: "Agar kasir bisa dibuka dalam 1 detik seperti aplikasi biasa dan tetap berjalan saat kuota internet habis, pasang pintasan SakuNota ke layar utama HP atau tablet Anda.",
      bullets: [
        "Pengguna Android (Chrome): Ketuk ikon titik tiga (⋮) di pojok kanan atas browser - pilih 'Tambahkan ke Layar Utama' (Add to Home Screen).",
        "Pengguna iPhone/iPad (Safari): Ketuk tombol Bagikan (kotak dengan panah ke atas) di bawah layar - pilih 'Tambah ke Layar Utama'.",
        "Setelah terpasang, buka SakuNota langsung dari ikon biru 'SN' di layar HP Anda.",
      ],
      targetLabel: "Lihat Status Kesiapan Offline",
      targetHref: "/admin/pengaturan/tentang",
    },
    {
      step: "03",
      badge: "Langkah Ketiga",
      title: "Atur Nama Toko, Denah Meja, dan Daftar Menu",
      desc: "Sesuaikan identitas warung atau kafe Anda, pilih apakah memakai sistem nomor meja atau bayar langsung, lalu masukkan daftar makanan dan minuman.",
      bullets: [
        "Masuk ke halaman Pengaturan Toko untuk mengisi Nama Usaha, Alamat, Nomor Telepon, dan catatan kaki struk.",
        "Buka menu Kelola Menu & Varian untuk menambah nama produk, harga jual, kategori, hingga pilihan varian atau topping tambahan.",
        "Jika usaha Anda memiliki meja makan (Dine-in), aktifkan fitur Manajemen Meja di Pengaturan Toko.",
      ],
      targetLabel: "Buka Halaman Kelola Menu",
      targetHref: "/admin/menu",
      secondaryLabel: "Buka Pengaturan Info Toko",
      secondaryHref: "/admin/pengaturan",
    },
    {
      step: "04",
      badge: "Langkah Keempat",
      title: "Hubungkan Printer Struk Bluetooth (58mm / 80mm)",
      desc: "SakuNota mencetak nota langsung menggunakan sinyal Bluetooth HP ke printer thermal tanpa memerlukan jaringan Wi-Fi atau kabel rumit.",
      bullets: [
        "Nyalakan printer Bluetooth Anda, lalu buka Pengaturan Bluetooth bawaan HP dan pasangkan (Pair) printer terlebih dahulu.",
        "Buka menu Pengaturan Printer di dalam SakuNota, pilih ukuran kertas (58mm atau 80mm), lalu klik tombol 'Cari & Hubungkan Printer'.",
        "Tekan tombol 'Tes Cetak Struk' untuk memastikan kertas keluar dengan rapi.",
      ],
      targetLabel: "Buka Pengaturan Printer Bluetooth",
      targetHref: "/admin/pengaturan/printer",
    },
    {
      step: "05",
      badge: "Langkah Kelima",
      title: "Buka Shift Kasir & Mulai Catat Pesanan Pembeli",
      desc: "Setiap kali mulai berjualan, buka shift kasir dan masukkan jumlah uang kembalian awal di laci agar hitungan uang tunai saat tutup toko selalu akurat.",
      bullets: [
        "Di layar Kasir (/pos), klik tombol '💼 Buka Shift', isi nama kasir yang bertugas dan jumlah modal uang kembalian awal di laci.",
        "Ketuk menu yang dipesan pelanggan, pilih varian/topping jika ada, lalu klik tombol 'Bayar Sekarang' atau 'Simpan ke Meja (Open Bill)'.",
        "Jika ada uang keluar dari laci (misal beli es batu atau gas), catat lewat tombol '+/- Kas' agar saldo laci tetap cocok.",
      ],
      targetLabel: "Buka Layar Kasir Utama (/pos)",
      targetHref: "/pos",
    },
    {
      step: "06",
      badge: "Langkah Keenam",
      title: "Tutup Shift, Kirim Laporan ke WhatsApp & Backup Data",
      desc: "Saat selesai jualan, tutup shift untuk mencocokkan uang fisik di laci, kirim laporan omzet ke WhatsApp pemilik, dan simpan file cadangan data.",
      bullets: [
        "Klik tombol 'Tutup Shift' di kasir, hitung uang fisik di laci, lalu cetak struk rekap tutup shift (Z-Report).",
        "Buka halaman Ringkasan Penjualan (/admin) lalu klik tombol 'Kirim ke WhatsApp' untuk mengirim laporan omzet rapi ke nomor pemilik.",
        "Buka menu Data & Cadangan secara berkala untuk mengunduh file cadangan (.JSON) ke memori HP agar data aman saat ganti HP baru.",
      ],
      targetLabel: "Buka Ringkasan Penjualan & Laporan WA",
      targetHref: "/admin",
      secondaryLabel: "Buka Menu Backup & Pindah HP",
      secondaryHref: "/admin/pengaturan/data",
    },
  ];

  const bentoCards = [
    {
      id: "aktivasi" as GuideTabId,
      badge: "Aktivasi Cepat",
      icon: "🔑",
      title: "Cara Aktivasi Lisensi & Kode Tester",
      desc: "Punya kode SN-TEST-XXXX atau kode lisensi resmi? Langsung aktifkan tanpa perlu Nomor Pesanan atau Kode Akses.",
      directionText: "Arah: Beranda → Tombol 🔑 Aktivasi Lisensi",
      href: "/?aktivasi=true",
      linkText: "Aktifkan Lisensi Sekarang",
    },
    {
      id: "kasir" as GuideTabId,
      badge: "Operasional Harian",
      icon: "🏪",
      title: "Transaksi Cepat, Open Bill & Split Bill",
      desc: "Cara melayani pesanan bungkus (Takeaway), simpan tagihan meja (Open Bill), hingga bayar pisah nota (Split Bill).",
      directionText: "Arah: Layar Kasir (/pos) → Pilih Menu / Meja",
      href: "/pos",
      linkText: "Buka Layar Kasir",
    },
    {
      id: "toko" as GuideTabId,
      badge: "Katalog & Produk",
      icon: "🍽️",
      title: "Tambah Menu, Varian Rasa & Stok Habis",
      desc: "Atur daftar makanan, minuman, pilihan level pedas/topping tambahan, atau tandai menu yang sedang habis.",
      directionText: "Arah: Admin → Kelola Menu (/admin/menu)",
      href: "/admin/menu",
      linkText: "Atur Menu Toko",
    },
    {
      id: "toko" as GuideTabId,
      badge: "Cetak Nota Fisik",
      icon: "🖨️",
      title: "Pasang Printer Bluetooth 58mm & 80mm",
      desc: "Panduan menyambungkan printer thermal Bluetooth ke HP Android dan cetak struk otomatis tanpa internet.",
      directionText: "Arah: Admin → Printer (/admin/pengaturan/printer)",
      href: "/admin/pengaturan/printer",
      linkText: "Atur Printer Struk",
    },
    {
      id: "backup" as GuideTabId,
      badge: "Keuangan & Omzet",
      icon: "📊",
      title: "Rekap Kas Shift & Laporan ke WhatsApp",
      desc: "Pantau grafik penjualan 7 hari terakhir, menu paling laris, dan kirim rekap harian ke WhatsApp pemilik usaha.",
      directionText: "Arah: Admin → Ringkasan Penjualan (/admin)",
      href: "/admin",
      linkText: "Lihat Laporan Omzet",
    },
    {
      id: "backup" as GuideTabId,
      badge: "Keamanan Data",
      icon: "💾",
      title: "Cadangkan Data & Pindah ke HP Baru",
      desc: "Cara menyimpan seluruh data menu dan riwayat transaksi ke file HP serta memulihkannya saat ganti perangkat.",
      directionText: "Arah: Admin → Data & Cadangan (/admin/pengaturan/data)",
      href: "/admin/pengaturan/data",
      linkText: "Cadangkan Data Toko",
    },
  ];

  const faqList = [
    {
      q: "Saya punya Lisensi Tester (SN-TEST-XXXX), bagaimana cara mengaktifkannya?",
      a: "Anda tidak perlu mengisi Nomor Pesanan atau Kode Akses Rahasia. Cukup buka halaman utama SakuNota lalu klik tombol '🔑 Aktivasi Lisensi' di bagian atas (atau langsung buka halaman /pos), ketik kode SN-TEST-XXXX Anda pada tab 'Pakai Kode Lisensi', lalu klik Aktifkan.",
    },
    {
      q: "Kalau saya baru selesai transfer pembelian, di mana saya mengambil kode lisensi saya?",
      a: "Buka halaman utama SakuNota, klik tombol '🔑 Aktivasi Lisensi', lalu pilih tab ke-2 yaitu '🧾 Cek Nomor Pesanan'. Masukkan Nomor Pesanan (SN-2026-XXXX) dan Kode Akses Rahasia Pembeli (KOD-XXXX) yang muncul saat Anda checkout.",
    },
    {
      q: "Ke mana saya harus pergi setelah lisensi berhasil aktif?",
      a: "Setelah lisensi aktif, ikuti urutan ini: (1) Buka '/admin/pengaturan' untuk mengisi nama warung dan alamat struk, (2) Buka '/admin/menu' untuk memasukkan daftar makanan dan minuman, lalu (3) Buka '/pos' untuk mulai melayani pembeli.",
    },
    {
      q: "Bagaimana jika kuota internet habis atau mati lampu saat sedang ramai pembeli?",
      a: "Kasir SakuNota tetap berjalan 100% normal. Seluruh perhitungan pesanan, meja, dan cetak struk Bluetooth diproses langsung di memori HP Anda tanpa membutuhkan sinyal internet.",
    },
    {
      q: "Bagaimana cara memindahkan data kasir dan lisensi ke HP baru?",
      a: "Di HP lama, buka '/admin/pengaturan/data' lalu klik 'Unduh Cadangan Data (.JSON)'. Kirim file tersebut ke HP baru, lalu pilih 'Pulihkan dari File Cadangan'. Untuk memindahkan ikatan lisensi ke HP baru, hubungi WhatsApp resmi SakuNota agar tim kami mereset ikatan perangkat lama Anda.",
    },
  ];

  const filteredSteps = timelineSteps.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.desc.toLowerCase().includes(q) ||
      item.bullets.some((b) => b.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* 1. Top Navigation Bar (Light Mode & Light Blue) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <img
                src="/icons/icon-mark.png"
                alt="SakuNota"
                className="w-8 h-8 object-contain group-hover:scale-105 transition-transform"
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm sm:text-base text-slate-900 leading-none">
                    SakuNota
                  </span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-[10px] font-extrabold text-blue-700">
                    Pusat Panduan
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-bold block mt-0.5">
                  PT Pemuda Gaya Bebas
                </span>
              </div>
            </Link>
          </div>

          {/* Search Input in Header (Desktop) */}
          <div className="hidden lg:block flex-1 max-w-md mx-4">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari panduan (misal: lisensi tester, printer, meja, backup)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-800 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Quick Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/tentang"
              className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 hover:bg-slate-100 transition-colors"
            >
              Tentang Kami
            </Link>
            <Link
              href="/?aktivasi=true"
              className="px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-extrabold text-xs transition-all flex items-center gap-1.5"
            >
              <span>🔑</span>
              <span className="hidden sm:inline">Aktivasi Lisensi</span>
              <span className="sm:hidden">Aktivasi</span>
            </Link>
            <Link
              href="/pos"
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm shadow-blue-600/20 transition-all flex items-center gap-1.5"
            >
              <span>🏪</span>
              <span>Buka Kasir</span>
            </Link>
          </div>
        </div>

        {/* Sub-Navigation Horizontal Bar (Desktop) & Compact 3x2 Grid (Mobile - Tanpa Slide!) */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-4 sm:px-8 py-2">
          <div className="max-w-7xl mx-auto">
            {/* Mobile Compact 3-Column Grid (No Horizontal Slide) */}
            <div className="grid grid-cols-3 gap-1.5 md:hidden">
              {navTabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`py-2 px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="truncate">{t.shortLabel}</span>
                  </button>
                );
              })}
            </div>

            {/* Desktop Sub-Nav Bar */}
            <div className="hidden md:flex items-center gap-2">
              {navTabs.map((t) => {
                const isActive = activeTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setActiveTab(t.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all ${
                      isActive
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-700 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      {/* 2. Main Layout: Left Sidebar + Right Content Area (Matching Screenshot Architecture in Light Mode) */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-6 px-4 sm:px-8 py-6 sm:py-8">
        
        {/* Left Sidebar Navigation (Desktop) */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-5">
          <div className="bg-white border border-blue-100 rounded-2xl p-4 shadow-2xs space-y-3 sticky top-28">
            <div className="pb-2 border-b border-slate-100">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                Daftar Isi Panduan
              </span>
              <h3 className="text-xs font-extrabold text-slate-900 mt-0.5">
                Urutan Belajar SakuNota
              </h3>
            </div>

            <nav className="space-y-1">
              {navTabs.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700 border border-blue-200 font-extrabold"
                        : "text-slate-700 hover:bg-slate-50 hover:text-blue-600"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span>{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className={isActive ? "text-blue-600 font-black" : "text-slate-300"}>
                      →
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Quick Links Box inside Sidebar */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                Pintasan Halaman Aplikasi
              </span>
              <Link
                href="/?aktivasi=true"
                className="w-full py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-[11px] font-extrabold flex items-center justify-between transition-colors"
              >
                <span>🔑 Aktivasi Kode Lisensi</span>
                <span>→</span>
              </Link>
              <Link
                href="/pos?demo=true"
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-between transition-colors"
              >
                <span>🎮 Coba Demo Sandbox</span>
                <span>→</span>
              </Link>
              <Link
                href="/admin"
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-bold flex items-center justify-between transition-colors"
              >
                <span>📊 Buka Halaman Admin</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </aside>

        {/* Right Main Content Column */}
        <main className="flex-1 min-w-0 space-y-8">
          
          {/* Mobile Search Input */}
          <div className="lg:hidden">
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari panduan (misal: lisensi tester, printer, meja)..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 outline-none shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* HERO OVERVIEW CARD (2-Column Split like User's Reference Screenshot, in Light Blue & White) */}
          <section className="rounded-3xl bg-white border-2 border-blue-100 p-5 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              
              {/* Left 7 Columns: Overview & Primary Actions */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold">
                  <span>📘 PANDUAN PENGGUNA RESMI</span>
                  <span>•</span>
                  <span>PT PEMUDA GAYA BEBAS</span>
                </div>

                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                  Panduan Lengkap SakuNota - Jelas Arahnya dari Awal Sampai Jualan
                </h1>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Halaman ini memandu Anda langkah demi langkah menggunakan bahasa yang mudah dipahami. Setiap bagian dilengkapi tombol arah langsung agar Anda tahu persis halaman mana yang harus dibuka selanjutnya.
                </p>

                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <Link
                    href="/pos"
                    className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2 active:scale-95"
                  >
                    <span>🏪 Mulai Buka Kasir Sekarang</span>
                    <span>→</span>
                  </Link>
                  <Link
                    href="/?aktivasi=true"
                    className="px-5 py-3 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 font-extrabold text-xs transition-all flex items-center gap-2"
                  >
                    <span>🔑 Aktifkan Kode Lisensi / Tester</span>
                    <span>→</span>
                  </Link>
                </div>
              </div>

              {/* Right 5 Columns: Visual Direction Map ("Ke Mana Saya Harus Pergi?") */}
              <div className="lg:col-span-5 bg-gradient-to-br from-blue-50/90 to-slate-50 border border-blue-200 rounded-2xl p-4 sm:p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-blue-200/70 pb-2.5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                      Peta Arah Aplikasi
                    </span>
                    <h2 className="text-xs sm:text-sm font-black text-slate-900">
                      Ke Mana Saya Harus Pergi?
                    </h2>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[10px] font-bold text-blue-700">
                    4 Halaman Utama
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <Link
                    href="/?aktivasi=true"
                    className="p-2.5 rounded-xl bg-white border border-blue-200 hover:border-blue-500 flex items-center justify-between gap-2 transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                        1
                      </span>
                      <div className="min-w-0">
                        <strong className="text-slate-900 block truncate group-hover:text-blue-600">
                          Aktivasi Lisensi / Tester
                        </strong>
                        <span className="text-[10px] text-slate-600 block truncate">
                          Masukkan kode SN-TEST / SN-XXXX tanpa kode akses
                        </span>
                      </div>
                    </div>
                    <span className="text-blue-600 font-black shrink-0">→</span>
                  </Link>

                  <Link
                    href="/admin/menu"
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 flex items-center justify-between gap-2 transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                        2
                      </span>
                      <div className="min-w-0">
                        <strong className="text-slate-900 block truncate group-hover:text-blue-600">
                          Atur Menu &amp; Toko (/admin/menu)
                        </strong>
                        <span className="text-[10px] text-slate-600 block truncate">
                          Isi daftar makanan, minuman, harga, dan meja
                        </span>
                      </div>
                    </div>
                    <span className="text-blue-600 font-black shrink-0">→</span>
                  </Link>

                  <Link
                    href="/pos"
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 flex items-center justify-between gap-2 transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                        3
                      </span>
                      <div className="min-w-0">
                        <strong className="text-slate-900 block truncate group-hover:text-blue-600">
                          Layar Kasir Utama (/pos)
                        </strong>
                        <span className="text-[10px] text-slate-600 block truncate">
                          Buka shift, catat pesanan pembeli, dan cetak struk
                        </span>
                      </div>
                    </div>
                    <span className="text-blue-600 font-black shrink-0">→</span>
                  </Link>

                  <Link
                    href="/admin"
                    className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-blue-500 flex items-center justify-between gap-2 transition-all group shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                        4
                      </span>
                      <div className="min-w-0">
                        <strong className="text-slate-900 block truncate group-hover:text-blue-600">
                          Laporan &amp; Backup (/admin)
                        </strong>
                        <span className="text-[10px] text-slate-600 block truncate">
                          Lihat grafik omzet, kirim laporan WA, dan backup file
                        </span>
                      </div>
                    </div>
                    <span className="text-blue-600 font-black shrink-0">→</span>
                  </Link>
                </div>
              </div>

            </div>
          </section>

          {/* SPECIAL HIGHLIGHT BOX WHEN "AKTIVASI" TAB IS SELECTED OR DEFAULT */}
          {(activeTab === "ringkasan" || activeTab === "aktivasi") && (
            <section className="rounded-3xl bg-blue-50/70 border-2 border-blue-200 p-5 sm:p-7 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-blue-200">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 block">
                    Solusi Cepat Aktivasi
                  </span>
                  <h2 className="text-lg sm:text-xl font-black text-slate-900">
                    Cara Membedakan Aktivasi Kode Lisensi vs Cek Nomor Pesanan
                  </h2>
                </div>
                <Link
                  href="/?aktivasi=true"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-xs w-fit"
                >
                  🔑 Buka Jendela Aktivasi →
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Box A: Sudah Punya Kode Lisensi / Tester */}
                <div className="bg-white border-2 border-blue-400 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-black border border-blue-200">
                    <span>🔑 Kondisi 1: Sudah Pegang Kode Lisensi / Tester</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Punya Kode SN-TEST-XXXX atau SN-XXXX-XXXX-XXXX?
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Anda <strong>tidak perlu</strong> mengisi Nomor Pesanan dan <strong>tidak perlu</strong> Kode Akses Rahasia Pembeli.
                  </p>
                  <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside font-medium">
                    <li>Klik tombol <strong>🔑 Aktivasi Lisensi</strong> di beranda atau buka <strong>/pos</strong>.</li>
                    <li>Pastikan memilih tab <strong>&quot;🔑 Pakai Kode Lisensi&quot;</strong>.</li>
                    <li>Tempel kode lisensi Anda lalu klik <strong>Aktifkan Lisensi</strong>.</li>
                  </ol>
                  <div className="pt-1">
                    <Link
                      href="/?aktivasi=true"
                      className="inline-flex items-center gap-1.5 text-xs font-black text-blue-600 hover:underline"
                    >
                      <span>Langsung Aktifkan Kode Lisensi Anda di Sini</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>

                {/* Box B: Baru Selesai Transfer Pembelian */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-[11px] font-extrabold border border-slate-200">
                    <span>🧾 Kondisi 2: Baru Selesai Transfer Pembelian</span>
                  </div>
                  <h3 className="text-sm font-black text-slate-900">
                    Ingin Mengambil Lisensi Setelah Transfer BCA / QRIS?
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Gunakan fitur ini jika Anda baru saja mengisi formulir pembelian Rp50.000 dan ingin mengambil kode lisensi yang sudah diverifikasi:
                  </p>
                  <ol className="text-xs text-slate-700 space-y-1 list-decimal list-inside font-medium">
                    <li>Buka jendela Aktivasi lalu pilih tab ke-2: <strong>&quot;🧾 Cek Nomor Pesanan&quot;</strong>.</li>
                    <li>Masukkan <strong>Nomor Pesanan (SN-2026-XXXX)</strong>.</li>
                    <li>Masukkan <strong>Kode Akses Rahasia Pembeli (KOD-XXXX)</strong> yang muncul saat checkout.</li>
                  </ol>
                </div>
              </div>
            </section>
          )}

          {/* CHRONOLOGICAL TIMELINE SECTION (Like the Middle Section of the Reference Screenshot) */}
          {activeTab !== "faq" && (
            <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-8 shadow-2xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 block">
                    Alur Langkah demi Langkah
                  </span>
                  <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                    Urutan Penggunaan SakuNota dari Awal Sampai Mahir
                  </h2>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {filteredSteps.length} Langkah Panduan
                </span>
              </div>

              <div className="relative pl-4 sm:pl-6 border-l-2 border-blue-200 space-y-6">
                {filteredSteps.map((item) => (
                  <div
                    key={item.step}
                    className="relative bg-slate-50/80 hover:bg-blue-50/40 border border-slate-200 hover:border-blue-300 rounded-2xl p-4 sm:p-5 transition-all space-y-3"
                  >
                    {/* Timeline Node Circle */}
                    <div className="absolute -left-[25px] sm:-left-[33px] top-5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-xs" />

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-blue-600 text-white font-black text-[11px]">
                          Langkah {item.step}
                        </span>
                        <span className="text-xs font-extrabold text-blue-700">
                          {item.badge}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                      {item.desc}
                    </p>

                    <ul className="space-y-1.5 pt-1 text-xs text-slate-700">
                      {item.bullets.map((b, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-blue-600 font-black mt-0.5">✓</span>
                          <span className="leading-relaxed">{b}</span>
                        </li>
                      ))}
                    </ul>

                    {/* Clear Directional Link Pill */}
                    <div className="pt-2 flex flex-wrap items-center gap-2.5 border-t border-slate-200/80">
                      <span className="text-[11px] font-extrabold text-slate-500">
                        Arah Selanjutnya:
                      </span>
                      <Link
                        href={item.targetHref}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-2xs transition-all"
                      >
                        <span>{item.targetLabel}</span>
                        <span>→</span>
                      </Link>
                      {item.secondaryLabel && item.secondaryHref && (
                        <Link
                          href={item.secondaryHref}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-slate-300 text-slate-800 font-bold text-xs transition-all"
                        >
                          <span>{item.secondaryLabel}</span>
                          <span>→</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* BENTO GRID CARDS SECTION (Matching Bottom Cards in Reference Screenshot) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 block">
                  Pintasan Fitur Utama
                </span>
                <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                  Pilih Menu yang Ingin Anda Buka Sekarang
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bentoCards.map((card, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 flex flex-col justify-between gap-4 shadow-2xs hover:shadow-md transition-all group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl">
                        {card.icon}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                        {card.badge}
                      </span>
                    </div>

                    <h3 className="text-sm sm:text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                      {card.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {card.desc}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 block">
                      📍 {card.directionText}
                    </span>
                    <Link
                      href={card.href}
                      className="w-full py-2 px-3 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white font-extrabold text-xs flex items-center justify-between transition-all"
                    >
                      <span>{card.linkText}</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ & BANTUAN SECTION */}
          <section className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-8 shadow-2xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-600 block">
                Tanya Jawab Pengguna
              </span>
              <h2 className="text-lg sm:text-2xl font-black text-slate-900">
                Pertanyaan yang Sering Ditanyakan Pengguna Baru
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {faqList.map((f, i) => (
                <div
                  key={i}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5"
                >
                  <h3 className="text-xs sm:text-sm font-black text-slate-900">
                    {f.q}
                  </h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {f.a}
                  </p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-xs sm:text-sm font-black text-slate-900">
                  Masih butuh bantuan langsung dari tim kami?
                </h4>
                <p className="text-xs text-slate-700">
                  Tim dukungan SakuNota - PT Pemuda Gaya Bebas siap membantu lewat WhatsApp.
                </p>
              </div>
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs whitespace-nowrap text-center shadow-xs"
              >
                💬 Hubungi WhatsApp Resmi →
              </a>
            </div>
          </section>

        </main>
      </div>

      {/* 3. Footer */}
      <footer className="mt-auto bg-white border-t border-slate-200 px-4 sm:px-8 py-6 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 <strong>SakuNota</strong> - Di bawah naungan <strong>PT Pemuda Gaya Bebas</strong>.
          </div>
          <div className="flex items-center gap-5 font-bold">
            <Link href="/" className="hover:text-blue-600">Beranda</Link>
            <Link href="/tentang" className="hover:text-blue-600">Tentang Kami</Link>
            <Link href="/pos" className="hover:text-blue-600">Buka Kasir</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privasi</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
