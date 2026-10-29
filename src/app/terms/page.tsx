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
            Perjanjian Penggunaan
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Syarat & Ketentuan
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Terakhir diperbarui: 18 Oktober 2026 • Lisensi Sekali Bayar Selamanya Tanpa Biaya Berlangganan
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
              Untuk memastikan kesesuaian fitur kasir dengan kebutuhan operasional usaha kuliner Anda, kami sangat menyarankan calon pembeli untuk mencoba <strong>Demo Kasir</strong> di halaman depan atau mendaftar <strong>Program Uji Coba Gratis 7 Hari</strong> sebelum melakukan pembelian lisensi permanen.
            </p>
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
              <span className="font-bold text-slate-800">© 2026 SakuNota, PT Pemuda Gaya Bebas</span>
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
            <Link href="/privacy" className="hover:text-blue-600">Kebijakan Privasi</Link>
            <Link href="/panduan" className="hover:text-blue-600">Panduan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
