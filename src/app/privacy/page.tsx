"use client";

import React from "react";
import Link from "next/link";

export default function PrivacyPolicyPage() {
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
            <h2 className="text-base font-black text-slate-900">1. Prinsip Utama: Arsitektur 100% Offline-First</h2>
            <p className="text-slate-600">
              SakuNota dibangun dengan prinsip kedaulatan data penuh bagi pemilik usaha. Seluruh data operasional kasir—termasuk daftar menu, harga, pesanan pelanggan, riwayat transaksi, denah meja, dan catatan kas masuk/keluar—<strong>tersimpan 100% secara lokal di memori perangkat Anda (IndexedDB)</strong>.
            </p>
            <p className="text-slate-600">
              Data transaksi harian Anda <strong>tidak pernah dikirimkan atau disimpan di server cloud SakuNota</strong>. Anda memiliki kendali penuh untuk mencadangkan (backup) dan memulihkan (restore) data Anda sendiri secara mandiri.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">2. Data yang Kami Kumpulkan Saat Pembelian Lisensi</h2>
            <p className="text-slate-600">
              Saat Anda mendaftar program Closed Beta atau membeli lisensi resmi SakuNota seharga Rp65.000, kami mengumpulkan informasi terbatas berikut:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600 pl-2">
              <li><strong>Nama Pemilik &amp; Nama Usaha:</strong> Digunakan untuk pencatatan kepemilikan lisensi dan tampilan nota struk Anda.</li>
              <li><strong>Nomor WhatsApp:</strong> Digunakan untuk pengiriman nomor lisensi resmi, kode akses pemulihan, dan layanan bantuan teknis langsung.</li>
              <li><strong>Email (Opsional):</strong> Digunakan untuk pengiriman salinan bukti pembayaran dan konfirmasi aktivasi.</li>
            </ul>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">3. Keamanan Transaksi Pembayaran</h2>
            <p className="text-slate-600">
              Pembayaran online diproses secara aman melalui gerbang pembayaran resmi <strong>Midtrans</strong> (berlisensi Bank Indonesia). SakuNota tidak pernah menyimpan informasi sensitif seperti nomor kartu debit/kredit, PIN, atau kata sandi perbankan Anda.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">4. Kebijakan 1 Lisensi 1 Perangkat</h2>
            <p className="text-slate-600">
              Untuk mencegah penyalahgunaan dan duplikasi lisensi ilegal, sistem kami mencatat pengidentifikasi perangkat anonim (Device Fingerprint) saat pertama kali Anda melakukan aktivasi di HP kasir fisik. Informasi ini semata-mata digunakan untuk memverifikasi hak akses kasir pada perangkat tersebut.
            </p>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h2 className="text-base font-black text-slate-900">5. Kontak Dukungan</h2>
            <p className="text-slate-600">
              Jika Anda memiliki pertanyaan seputar perlindungan privasi atau ingin memindahkan lisensi ke perangkat baru, Anda dapat menghubungi tim kami langsung melalui WhatsApp Resmi SakuNota:
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/6281234567890?text=Halo%20SakuNota,%20saya%20ingin%20bertanya%20seputar%20kebijakan%20privasi."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                <span>💬 Hubungi Bantuan WhatsApp</span>
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 SakuNota. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-blue-600">Syarat &amp; Ketentuan</Link>
            <Link href="/panduan" className="hover:text-blue-600">Buku Panduan</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
