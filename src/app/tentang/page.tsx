"use client";

import React from "react";
import Link from "next/link";
import { SUPPORT_WHATSAPP } from "@/lib/config";

export default function TentangSakuNotaPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* 1. Top Navigation Bar (Consistent Light Mode) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group" title="SakuNota - PT Pemuda Gaya Bebas">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota - PT Pemuda Gaya Bebas"
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <Link href="/tentang" className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200">Tentang Kami</Link>
            <Link href="/panduan" className="hover:text-blue-600 transition-colors">Panduan</Link>
            <Link href="/?aktivasi=true" className="hover:text-blue-600 transition-colors">Aktivasi Lisensi</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/pos?demo=true"
              className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200 transition-all"
            >
              Coba Kasir
            </Link>
            <Link
              href="/?beli=true"
              className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all"
            >
              Beli Rp50.000
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Hero Section Tentang SakuNota & PT Pemuda Gaya Bebas */}
      <section className="relative py-14 sm:py-20 px-4 sm:px-8 bg-gradient-to-b from-blue-50/80 via-white to-slate-50 border-b border-blue-100 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center space-y-5 relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-extrabold shadow-xs">
            <span>🏢</span>
            <span>Profil Resmi Perusahaan &amp; Produk</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Tentang SakuNota
          </h1>
          <p className="text-base sm:text-xl font-extrabold text-blue-600">
            Inovasi Kasir Kuliner Mandiri di Bawah Naungan PT Pemuda Gaya Bebas
          </p>
          <p className="max-w-2xl mx-auto text-xs sm:text-sm text-slate-600 leading-relaxed">
            SakuNota dibangun dengan satu tujuan sederhana: membantu pedagang kuliner, pemilik warung makan, kedai kopi, hingga rumah makan di seluruh Indonesia agar memiliki sistem pencatatan kasir yang cepat, rapi, dan 100% tetap berjalan lancar meskipun tanpa sinyal internet.
          </p>

          <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/?aktivasi=true"
              className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-600/20 transition-all flex items-center gap-2"
            >
              <span>🔑</span>
              <span>Aktifkan Kode Lisensi / Tester →</span>
            </Link>
            <Link
              href="/panduan"
              className="px-5 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 font-bold text-xs border border-blue-200 shadow-xs transition-all flex items-center gap-2"
            >
              <span>📖</span>
              <span>Baca Panduan Pengguna →</span>
            </Link>
          </div>
        </div>
      </section>

      {/* 3. Main Content: Naungan Korporasi & Filosofi Produk */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-8 py-12 space-y-12">
        {/* Card Naungan Perusahaan: PT Pemuda Gaya Bebas */}
        <div className="bg-white rounded-3xl border-2 border-blue-200 p-6 sm:p-8 shadow-md shadow-blue-500/5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-xl font-black shadow-md shadow-blue-600/25 shrink-0">
                PGB
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider block">
                  Naungan Hukum &amp; Pengembang Resmi
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  PT Pemuda Gaya Bebas
                </h2>
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-extrabold w-fit">
              Produk Teknologi UMKM Indonesia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm text-slate-600 leading-relaxed">
            <div className="space-y-3">
              <h3 className="font-black text-slate-900 text-sm">Siapa Kami?</h3>
              <p>
                <strong>PT Pemuda Gaya Bebas</strong> adalah perusahaan pengembang teknologi terapan yang berfokus menciptakan perangkat lunak praktis, mandiri, dan terjangkau bagi pelaku usaha di Indonesia.
              </p>
              <p>
                Melalui produk <strong>SakuNota</strong>, kami mematahkan anggapan bahwa aplikasi kasir digital harus selalu mahal, rumit, dan menuntut biaya sewa bulanan seumur hidup.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-black text-slate-900 text-sm">Mengapa SakuNota Berbeda?</h3>
              <p>
                Banyak pemilik warung dan kafe mengeluhkan kasir mereka macet total saat Wi-Fi gangguan atau kuota habis di jam sibuk. Selain itu, tagihan langganan Rp150.000 - Rp350.000 per bulan sangat membebani usaha kecil.
              </p>
              <p>
                <strong>PT Pemuda Gaya Bebas</strong> menghadirkan SakuNota dengan arsitektur <em>Offline-First</em> (berjalan langsung di memori HP Anda) dengan harga cukup <strong>Rp50.000 sekali bayar selamanya</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Pilar Utama SakuNota (4-Grid di Desktop & 2x2 di Mobile) */}
        <div className="space-y-4">
          <div className="text-center space-y-1">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-wider">
              Komitmen Kami
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              4 Prinsip Utama SakuNota untuk Usaha Anda
            </h2>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base">
                📶
              </div>
              <h3 className="font-black text-xs sm:text-sm text-slate-900">100% Jalan Tanpa Internet</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Transaksi, kelola meja, dan cetak struk Bluetooth tetap berjalan normal walau sinyal mati total.
              </p>
            </div>

            <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base">
                💳
              </div>
              <h3 className="font-black text-xs sm:text-sm text-slate-900">Sekali Bayar Rp50.000</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Tidak ada tagihan bulanan, tidak ada biaya tahunan, dan 0% potongan komisi dari omzet Anda.
              </p>
            </div>

            <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base">
                🛡️
              </div>
              <h3 className="font-black text-xs sm:text-sm text-slate-900">Data Milik Anda Sendiri</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Data menu dan laporan keuangan tersimpan privat di HP kasir Anda, bebas dicadangkan kapan saja.
              </p>
            </div>

            <div className="bg-white border border-blue-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center text-base">
                🤝
              </div>
              <h3 className="font-black text-xs sm:text-sm text-slate-900">Mudah Dipahami Kasir</h3>
              <p className="text-[11px] sm:text-xs text-slate-600 leading-relaxed">
                Tampilan bersih bernuansa putih-biru terang yang jelas dibaca oleh siapa pun tanpa pelatihan rumit.
              </p>
            </div>
          </div>
        </div>

        {/* Alur Singkat: Dari Punya Lisensi Sampai Siap Jualan */}
        <div className="bg-blue-50/70 border border-blue-200 rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Sudah Punya Kode Lisensi atau Kode Tester?
              </h2>
              <p className="text-xs text-slate-600">
                Anda tidak perlu nomor pesanan atau kode akses rahasia jika sudah memegang Kode Lisensi.
              </p>
            </div>
            <Link
              href="/?aktivasi=true"
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-sm w-fit"
            >
              🔑 Masukkan Kode Lisensi Sekarang →
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-1">
              <span className="font-black text-blue-600 block">1. Buka Menu Aktivasi</span>
              <p className="text-slate-600 leading-relaxed">
                Klik tombol <strong>Aktivasi Lisensi</strong> di halaman depan atau langsung buka halaman kasir <Link href="/pos" className="text-blue-600 underline font-bold">/pos</Link>.
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-1">
              <span className="font-black text-blue-600 block">2. Tempel Kode Lisensi</span>
              <p className="text-slate-600 leading-relaxed">
                Masukkan kode lisensi Anda (contoh: <code className="font-mono font-bold text-blue-700">SN-XXXX-XXXX-XXXX</code> atau <code className="font-mono font-bold text-blue-700">SN-TEST-XXXX</code>).
              </p>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-blue-100 space-y-1">
              <span className="font-black text-blue-600 block">3. Kasir Siap Offline</span>
              <p className="text-slate-600 leading-relaxed">
                Begitu aktif, seluruh fitur kasir langsung terbuka penuh dan siap dipakai jualan tanpa internet!
              </p>
            </div>
          </div>
        </div>

        {/* Informasi Korporasi & Bantuan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
              <span>🏛️</span> Identitas Pengembang &amp; Korporasi
            </h3>
            <div className="text-xs text-slate-600 space-y-2">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Perusahaan:</span>
                <strong className="text-slate-900">PT Pemuda Gaya Bebas</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Nama Produk:</span>
                <strong className="text-slate-900">SakuNota (Kasir Jalan Tanpa Internet)</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span className="text-slate-500">Model Lisensi:</span>
                <strong className="text-blue-600">Rp50.000 Sekali Bayar (1 Perangkat)</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Website Resmi:</span>
                <strong className="text-slate-900">sakunota.my.id</strong>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-3 flex flex-col justify-between">
            <div className="space-y-2">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <span>💬</span> Hubungi Tim Dukungan Kami
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Butuh bantuan mengaktifkan lisensi, memindahkan lisensi ke HP baru, atau konsultasi penggunaan untuk warung Anda? Tim PT Pemuda Gaya Bebas siap membantu.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 pt-2">
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20Tim%20SakuNota%20(PT%20Pemuda%20Gaya%20Bebas),%20saya%20ingin%20bertanya%20mengenai%20aplikasi%20kasir%20SakuNota.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>Chat WhatsApp Resmi</span>
              </a>
              <Link
                href="/privacy"
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Kebijakan Privasi
              </Link>
              <Link
                href="/terms"
                className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Syarat &amp; Ketentuan
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* 4. Footer */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            © 2026 <strong>SakuNota</strong> - Produk Resmi di Bawah Naungan <strong>PT Pemuda Gaya Bebas</strong>.
          </div>
          <div className="flex items-center gap-5 font-semibold">
            <Link href="/" className="hover:text-blue-600">Beranda</Link>
            <Link href="/panduan" className="hover:text-blue-600">Panduan</Link>
            <Link href="/privacy" className="hover:text-blue-600">Privasi</Link>
            <Link href="/terms" className="hover:text-blue-600">Ketentuan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
