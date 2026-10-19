"use client";

import React from "react";
import Link from "next/link";
import { SUPPORT_WHATSAPP } from "@/lib/config";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota"
              className="h-8 w-auto object-contain"
            />
          </Link>
          <Link
            href="/"
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            <span>← Kembali ke Beranda</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 sm:py-14 space-y-8">
        <div className="space-y-2 border-b border-slate-200 pb-6">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600">
            Legal &amp; Keamanan Data
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Kebijakan Privasi SakuNota
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Terakhir diperbarui: 17 Oktober 2026 • Komitmen 100% Privasi &amp; Kedaulatan Data Offline
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">1. Data Usaha 100% Milik Anda Sendiri</h2>
            <p className="text-slate-600">
              SakuNota sangat menghormati privasi dan rahasia dapur usaha Anda. Seluruh catatan jualan - termasuk daftar menu, harga makanan, pesanan pembeli, meja, catatan shift, dan riwayat omzet kasir - <strong>tersimpan aman langsung di memori HP atau komputer kasir Anda sendiri</strong>.
            </p>
            <p className="text-slate-600">
              Data transaksi harian Anda <strong>tidak pernah kami intip, tidak disimpan di server luar, dan tidak dijual ke pihak mana pun</strong>. Anda memiliki kebebasan penuh untuk mencadangkan (backup) data ke file HP Anda kapan saja.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">2. Data yang Kami Catat Saat Pembelian Lisensi</h2>
            <p className="text-slate-600">
              Saat Anda mendaftar uji coba atau membeli lisensi resmi SakuNota seharga Rp50.000, kami hanya mencatat data penting berikut:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
              <li><strong>Nama Pemilik &amp; Nama Usaha:</strong> Untuk dicantumkan pada sertifikat lisensi resmi dan header nota kasir Anda.</li>
              <li><strong>Nomor WhatsApp:</strong> Untuk mengirimkan nomor lisensi kasir, kode pemulihan jika Anda ganti HP, dan bantuan panduan penggunaan langsung.</li>
              <li><strong>Email (Jika diisi):</strong> Untuk mengirimkan salinan bukti pembayaran resmi.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">3. Keamanan Pembayaran</h2>
            <p className="text-slate-600">
              Pembayaran online diproses secara aman melalui gerbang pembayaran resmi berlisensi Bank Indonesia (Midtrans) atau transfer langsung ke rekening bank resmi kami. SakuNota tidak pernah mengetahui atau menyimpan PIN rekening, nomor kartu ATM, maupun kata sandi perbankan Anda.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">4. Perlindungan 1 Lisensi untuk 1 Perangkat</h2>
            <p className="text-slate-600">
              Agar lisensi yang Anda beli tidak disalahgunakan orang lain, sistem kami hanya mengunci lisensi tersebut ke 1 perangkat kasir yang Anda gunakan. Jika di kemudian hari HP kasir Anda rusak atau Anda ingin ganti HP baru, Anda cukup menghubungi kami via WhatsApp untuk dibantu pemindahan perangkat secara gratis.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">5. Bantuan &amp; Konsultasi</h2>
            <p className="text-slate-600">
              Jika ada hal yang ingin ditanyakan seputar perlindungan privasi data atau penggunaan kasir, kami siap melayani Anda melalui WhatsApp Resmi SakuNota:
            </p>
            <div className="pt-2">
              <a
                href={`https://wa.me/${SUPPORT_WHATSAPP}?text=Halo%20SakuNota,%20saya%20ingin%20bertanya%20seputar%20kebijakan%20privasi.`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <span>Hubungi Bantuan WhatsApp</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8 text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <img
                src="/logo-sakunota.png"
                alt="SakuNota"
                className="h-6 w-auto object-contain"
              />
              <span className="font-bold text-slate-800">© 2026 SakuNota. Hak cipta dilindungi.</span>
            </div>
            <p className="text-[11px] text-slate-500 max-w-md">
              Aplikasi kasir modern untuk UMKM, angkringan, kafe, dan retail. 100% jalan offline tanpa biaya langganan bulanan.
            </p>
            <div className="pt-1 flex justify-center md:justify-start">
              <a
                href="https://www.instagram.com/sakunota/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center text-slate-700 hover:text-blue-600 transition-colors"
                title="Instagram @sakunota"
                aria-label="Instagram SakuNota"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
            </div>
          </div>
          <div className="flex gap-4 font-semibold">
            <Link href="/tentang" className="hover:text-blue-600">Tentang Kami</Link>
            <Link href="/terms" className="hover:text-blue-600">Terms</Link>
            <Link href="/panduan" className="hover:text-blue-600">Panduan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
