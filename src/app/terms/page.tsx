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
            Syarat &amp; Ketentuan Layanan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Terakhir diperbarui: 17 Oktober 2026 • Lisensi Sekali Bayar Selamanya Tanpa Biaya Berlangganan
          </p>
        </div>

        <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">1. Lisensi Sekali Bayar Selamanya</h2>
            <p className="text-slate-600">
              SakuNota menyediakan lisensi aplikasi kasir dengan model <strong>sekali bayar seharga Rp50.000</strong> untuk satu perangkat kasir aktif seumur hidup.
            </p>
            <p className="text-slate-600">
              Pengguna <strong>tidak dikenakan biaya langganan bulanan, biaya tahunan, maupun potongan komisi penjualan apa pun</strong>. Seluruh omzet dari penjualan usaha Anda 100% bersih menjadi hak milik Anda.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">2. Aturan 1 Lisensi untuk 1 Perangkat</h2>
            <p className="text-slate-600">
              Setiap nomor lisensi yang diterbitkan berlaku untuk 1 HP atau komputer kasir. Satu nomor lisensi tidak dapat digunakan secara bersamaan pada beberapa HP kasir yang berbeda.
            </p>
            <p className="text-slate-600">
              Apabila Anda berganti HP (misalnya HP rusak atau membeli HP kasir baru), Anda dapat mengajukan pemindahan perangkat melalui WhatsApp Dukungan Resmi dengan menyertakan Nomor Lisensi dan Kode Rahasia Anda.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">3. Program Uji Coba Gratis (7 Hari)</h2>
            <p className="text-slate-600">
              Bagi calon pengguna yang ingin mencoba kesesuaian kasir dengan usaha kulinernya, SakuNota menyediakan Program Uji Coba gratis selama 7 hari. Masa 7 hari dihitung sejak pertama kali diaktifkan di HP kasir Anda.
            </p>
            <p className="text-slate-600">
              Setelah masa 7 hari berakhir, seluruh data menu dan riwayat penjualan Anda <strong>tetap tersimpan aman di memori HP Anda dan dapat diekspor kapan saja</strong>. Untuk melanjutkan pencatatan transaksi baru, Anda dapat mengaktifkan lisensi permanen resmi.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">4. Cadangan Data Mandiri (Backup)</h2>
            <p className="text-slate-600">
              Karena SakuNota bekerja mandiri tanpa tergantung internet demi keamanan privasi dan kelancaran jualan Anda, pengguna disarankan untuk rutin mencadangkan data kasir secara berkala melalui menu <strong>Pengaturan &gt; Cadangkan Data</strong> ke file penyimpanan HP.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">5. Pembaruan Fitur &amp; Dukungan Teknis</h2>
            <p className="text-slate-600">
              Pemilik lisensi berhak mendapatkan pembaruan aplikasi dan perbaikan sistem secara gratis. Dukungan teknis dan panduan penggunaan disediakan langsung melalui saluran resmi WhatsApp SakuNota.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">6. Kebijakan Pengembalian Dana (Refund Policy)</h2>
            <p className="text-slate-600">
              Lisensi aplikasi kasir SakuNota merupakan produk digital sekali bayar. Lisensi yang telah diterbitkan dan diaktifkan pada perangkat kasir tidak dapat dibatalkan atau dikembalikan (non-refundable), kecuali terjadi kendala teknis fatal pada sistem yang tidak dapat diselesaikan oleh tim teknis kami dalam 7 hari kerja.
            </p>
            <p className="text-slate-600">
              Untuk memastikan kesesuaian fitur kasir dengan kebutuhan operasional usaha kuliner Anda, kami sangat menyarankan calon pembeli untuk mencoba <strong>Sandbox Kasir</strong> di halaman depan atau mendaftar <strong>Program Uji Coba Gratis 7 Hari</strong> sebelum melakukan pembelian lisensi permanen.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 SakuNota - PT Pemuda Gaya Bebas. Hak cipta dilindungi.</span>
          <div className="flex gap-4 font-semibold">
            <Link href="/tentang" className="hover:text-blue-600">Tentang Kami</Link>
            <Link href="/privacy" className="hover:text-blue-600">Kebijakan Privasi</Link>
            <Link href="/panduan" className="hover:text-blue-600">Buku Panduan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
