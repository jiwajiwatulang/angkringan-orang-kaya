"use client";

import React from "react";
import Link from "next/link";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-blue-500/20">
              SN
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-base">
              SakuNota<span className="text-blue-600">.</span>
            </span>
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
            Perjanjian Penggunaan
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Syarat &amp; Ketentuan Layanan (Terms of Service)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Terakhir diperbarui: 17 Oktober 2026 • Lisensi Sekali Bayar Selamanya Tanpa Biaya Berlangganan
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">1. Ketentuan Lisensi &amp; Sekali Bayar</h2>
            <p className="text-slate-600">
              SakuNota menyediakan lisensi perangkat lunak Point-of-Sale (POS) dengan model <strong>sekali bayar seharga Rp65.000</strong> untuk satu perangkat kasir fisik aktif seumur hidup.
            </p>
            <p className="text-slate-600">
              Pengguna <strong>tidak dikenakan biaya langganan bulanan, biaya tahunan, maupun potongan komisi penjualan apa pun</strong>. Seluruh omzet dari penjualan usaha Anda 100% menjadi milik Anda.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">2. Aturan 1 Lisensi untuk 1 Perangkat</h2>
            <p className="text-slate-600">
              Setiap nomor lisensi yang diterbitkan terikat secara eksklusif ke 1 perangkat kasir fisik (HP Android, iPhone, tablet, atau PC kasir). Satu nomor lisensi tidak dapat digunakan secara bersamaan pada beberapa perangkat berbeda.
            </p>
            <p className="text-slate-600">
              Apabila Anda berganti perangkat (misalnya HP rusak atau membeli perangkat kasir baru), Anda dapat mengajukan pelepasan ikatan perangkat (unbind) melalui WhatsApp Dukungan Resmi dengan menyertakan Nomor Lisensi dan Kode Rahasia Anda.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">3. Program Uji Coba Closed Beta (7 Hari)</h2>
            <p className="text-slate-600">
              Bagi calon pengguna yang ingin mencoba kesesuaian operasional kasir, SakuNota menyediakan Program Closed Beta gratis selama 7 hari. Masa trial 7 hari dihitung sejak aktivasi pertama kali dilakukan pada perangkat kasir fisik, bukan saat pendaftaran diajukan.
            </p>
            <p className="text-slate-600">
              Setelah masa 7 hari berakhir, seluruh data menu dan riwayat penjualan Anda <strong>tetap tersimpan aman di memori perangkat dan dapat diekspor kapan saja</strong>. Untuk melanjutkan pencatatan transaksi baru, Anda dapat mengaktifkan lisensi komersial resmi.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">4. Tanggung Jawab Pencadangan Data (Backup)</h2>
            <p className="text-slate-600">
              Karena SakuNota mengusung arsitektur 100% offline-first demi keamanan privasi dan kelancaran jualan tanpa internet, pengguna bertanggung jawab penuh untuk melakukan pencadangan data mandiri secara berkala melalui menu <strong>Pengaturan &gt; Data &gt; Cadangkan Data</strong>.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">5. Pembaruan Fitur &amp; Dukungan Teknis</h2>
            <p className="text-slate-600">
              Pemilik lisensi berhak mendapatkan pembaruan aplikasi dan perbaikan sistem secara gratis. Dukungan teknis disediakan melalui saluran resmi WhatsApp SakuNota.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 SakuNota. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-blue-600">Kebijakan Privasi</Link>
            <Link href="/panduan" className="hover:text-blue-600">Buku Panduan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
