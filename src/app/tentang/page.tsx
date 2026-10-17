"use client";

import React from "react";
import Link from "next/link";
import { SUPPORT_WHATSAPP } from "@/lib/config";

export default function TentangSakuNotaPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* 1. Header / Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-blue-100 px-4 sm:px-8 py-3.5 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group" title="SakuNota - Kasir Jalan Tanpa Internet">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota"
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">Beranda</Link>
            <a href="#cerita" className="hover:text-blue-600 transition-colors">Cerita Kami</a>
            <a href="#pilar" className="hover:text-blue-600 transition-colors">Prinsip</a>
            <a href="#manifesto" className="hover:text-blue-600 transition-colors">Manifesto</a>
            <a href="#tim" className="hover:text-blue-600 transition-colors">Pengembang</a>
            <Link href="/panduan" className="hover:text-blue-600 transition-colors">Panduan</Link>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href="/pos?demo=true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition-all"
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

      {/* 2. Section: Where It All Began */}
      <section id="cerita" className="relative py-16 sm:py-24 px-4 sm:px-8 bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <span className="text-[11px] font-extrabold tracking-widest text-emerald-600 uppercase block">
            OUR STORY
          </span>

          <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight">
            Where It All Began
          </h1>

          <div className="pt-2 text-left space-y-6 text-sm sm:text-base text-slate-700 leading-relaxed">
            <h2 className="text-xl sm:text-2xl font-black text-emerald-800">
              Finding the Gap
            </h2>

            <p>
              Berangkat dari percakapan santai di warung kopi dan tenda angkringan kaki lima, satu keluhan terdengar berulang-ulang dari para pedagang kuliner:
            </p>

            <blockquote className="border-l-4 border-blue-600 pl-4 py-1 italic font-medium text-slate-800 bg-blue-50/50 rounded-r-xl">
              &ldquo;Mau pakai kasir modern di HP, tapi bayarnya harus langganan bulanan ratusan ribu. Giliran internet lemot atau mati lampu di jam sibuk, kasirnya macet total dan nota nggak bisa dicetak.&rdquo;
            </blockquote>

            <p>
              Aplikasi kasir yang beredar di pasaran hari ini dirancang terlalu rumit untuk korporasi besar, memotong komisi transaksi, dan mengunci data pemilik usaha di server cloud yang mewajibkan pembayaran sewa seumur hidup.
            </p>

            <p>
              Padahal, kebutuhan pemilik warung makan, kafe kecil, dan pedagang mandiri sangat sederhana: sistem kasir yang <strong>cepat</strong>, <strong>mudah dipakai karyawan baru dalam 3 menit</strong>, dan <strong>100% tetap jalan lancar tanpa ada koneksi internet sama sekali</strong>.
            </p>

            <p className="font-bold text-slate-900">
              Dari celah inilah SakuNota lahir. Sebuah perangkat lunak kasir mandiri yang mengembalikan kendali penuh ke tangan juragan warung—cukup sekali bayar Rp50.000 selamanya.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Section: 6 Value Pillars (3x2 Grid) */}
      <section id="pilar" className="py-16 sm:py-24 px-4 sm:px-8 bg-slate-50 border-b border-slate-200">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <span className="text-xs font-extrabold text-blue-600 uppercase tracking-widest block">
              FILOSOFI REKAYASA SISTEM
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900">
              Didesain untuk Realitas Warung Indonesia
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              Setiap baris kode di SakuNota dioptimasi agar kasir Anda tidak pernah terganggu oleh sinyal, kuota, atau gangguan server.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center font-black text-xl shadow-xs">
                  ⚡
                </div>
                <h3 className="text-lg font-black text-slate-900">Seamless Connect</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Hubungkan kasir langsung ke printer thermal Bluetooth 58mm atau 80mm secara instan. Cetak nota transaksi dalam waktu kurang dari 0,5 detik tanpa ribet instalasi driver.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-blue-600 uppercase tracking-wider block pt-2">
                Bluetooth POS Ready
              </span>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center font-black text-xl shadow-xs">
                  📈
                </div>
                <h3 className="text-lg font-black text-slate-900">Built to Scale</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Mampu menampung ribuan riwayat transaksi dan katalog menu tanpa melambat, berkat penyimpanan IndexedDB lokal berkinerja tinggi langsung di memori HP Anda.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-emerald-600 uppercase tracking-wider block pt-2">
                High Performance Local DB
              </span>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200 flex items-center justify-center font-black text-xl shadow-xs">
                  👥
                </div>
                <h3 className="text-lg font-black text-slate-900">People Centered</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Tata letak antarmuka dirancang khusus untuk kasir, pelayan, dan juragan warung. Tombol sentuh besar, pencarian gesit, dan proses transaksi selesai dalam 3 sentuhan.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-indigo-600 uppercase tracking-wider block pt-2">
                0-Hour Learning Curve
              </span>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 border border-cyan-200 flex items-center justify-center font-black text-xl shadow-xs">
                  🛡️
                </div>
                <h3 className="text-lg font-black text-slate-900">Reliable by Design</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Kasir Anda tidak pernah menggantung karena masalah internet penyedia server. Semua kalkulasi diskon, pajak PBJT, dan nomor urut pesanan diproses lokal 100%.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-cyan-600 uppercase tracking-wider block pt-2">
                100% Offline-First
              </span>
            </div>

            {/* Card 5 */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center font-black text-xl shadow-xs">
                  ⚡
                </div>
                <h3 className="text-lg font-black text-slate-900">Fast, Reliable, Easy to Use</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Aplikasi sangat ringan dan dapat dipasang di layar utama Android atau iPhone layaknya aplikasi native tanpa memakan ruang memori yang besar.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-amber-600 uppercase tracking-wider block pt-2">
                Progressive Web App (PWA)
              </span>
            </div>

            {/* Card 6 */}
            <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm hover:border-blue-400 hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center font-black text-xl shadow-xs">
                  🔄
                </div>
                <h3 className="text-lg font-black text-slate-900">Always Evolving</h3>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  SakuNota terus diperbarui berdasarkan masukan nyata dari komunitas pengguna kuliner di lapangan, tanpa pernah membebankan biaya tambahan kepada pembeli lisensi.
                </p>
              </div>
              <span className="text-[11px] font-extrabold text-rose-600 uppercase tracking-wider block pt-2">
                Lifetime Value
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Section: Manifesto (Dark Aesthetic) */}
      <section id="manifesto" className="py-20 sm:py-28 px-4 sm:px-8 bg-[#0B0F17] text-white">
        <div className="max-w-3xl mx-auto space-y-8 text-center sm:text-left">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Manifesto
          </h2>

          <div className="space-y-6 text-sm sm:text-base text-slate-300 leading-relaxed">
            <p>
              Kami meyakini bahwa pemilik usaha berhak memiliki alat kerjanya sendiri, bukan menyewanya seumur hidup.
            </p>
            <p>
              Teknologi seharusnya bekerja mempermudah operasional Anda setiap hari, bukan menjadi sumber kecemasan baru ketika tagihan bulanan tiba atau ketika sinyal internet mendadak hilang di jam sibuk.
            </p>
            <p className="text-white font-bold text-base sm:text-lg">
              Data usaha, rahasia resep, dan laporan omzet Anda adalah milik Anda seutuhnya. Tidak boleh ada server pihak ketiga yang memantau, menjual, atau mengenakan biaya langganan terhadap data Anda.
            </p>
            <p>
              SakuNota hadir sebagai pembuktian bahwa perangkat lunak kasir profesional dapat dihadirkan secara jujur, mandiri, dan berkeadilan: <strong>sekali bayar Rp50.000, tanpa biaya langganan, tanpa komisi, dan siap jalan selamanya.</strong>
            </p>
          </div>
        </div>
      </section>

      {/* 5. Section: The Team Behind SakuNota (Only Reza Rengga dari Pemuda Gaya Bebas) */}
      <section id="tim" className="py-20 sm:py-28 px-4 sm:px-8 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-2">
            <span className="text-[11px] font-extrabold tracking-widest text-blue-600 uppercase block">
              PENGEMBANG &amp; INISIATOR
            </span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
              The team behind SakuNota
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
              SakuNota dibangun secara mandiri dengan dedikasi penuh untuk kemandirian teknologi usaha kecil di Indonesia.
            </p>
          </div>

          {/* Single Founder Profile Card */}
          <div className="max-w-md mx-auto bg-slate-50 border-2 border-blue-200 rounded-3xl p-6 sm:p-8 shadow-lg shadow-blue-500/5 text-center space-y-5">
            {/* Avatar / Badge */}
            <div className="relative mx-auto w-28 h-28 rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 text-white flex items-center justify-center text-3xl font-black shadow-xl shadow-blue-600/25">
              RR
              <div className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-black border-2 border-white shadow-xs">
                Founder
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-2xl font-black text-slate-900">
                Reza Rengga
              </h3>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                Founder &amp; Lead Developer
              </p>
              <div className="inline-block px-3 py-1 rounded-full bg-blue-100/70 border border-blue-200 text-blue-800 text-[11px] font-extrabold mt-1">
                Pemuda Gaya Bebas
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed text-left border-t border-slate-200 pt-4">
              &ldquo;Berangkat dari pengalaman melihat langsung rumit dan mahalnya biaya sewa aplikasi kasir di pasaran, saya mendedikasikan pengembangan SakuNota untuk menyediakan solusi kasir mandiri yang terjangkau, cepat, dan 100% jalan tanpa internet bagi seluruh kawan pedagang di Indonesia.&rdquo;
            </p>

            <div className="pt-2 flex items-center justify-center gap-3">
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20Mas%20Reza%20Rengga,%20saya%20tertarik%20dengan%20SakuNota.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              >
                <span>💬</span>
                <span>Kontak Mas Reza</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Section: Ready to Transform Your Operations? (CTA) */}
      <section className="py-20 sm:py-24 px-4 sm:px-8 bg-gradient-to-b from-[#0B0F17] to-slate-950 text-white text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Ready to transform your operations?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Mulai gunakan SakuNota hari ini. Tanpa tagihan langganan bulanan, tanpa biaya tersembunyi, dan 100% bebas dari risiko kasir macet saat internet mati.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pos?demo=true"
              className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-lg active:scale-95"
            >
              Coba Demo Kasir Gratis →
            </Link>
            <Link
              href="/?beli=true"
              className="px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95"
            >
              Beli Lisensi Rp50.000 Sekali Bayar
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="bg-white border-t border-slate-200 px-4 sm:px-8 py-8 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota"
              className="h-6 w-auto object-contain"
            />
            <span>© 2026 <strong>SakuNota</strong>. Dikelola oleh Reza Rengga (Pemuda Gaya Bebas).</span>
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
