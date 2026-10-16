"use client";

import React, { useState } from "react";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import InstallGuideSection from "@/components/InstallGuideSection";

interface Chapter {
  id: number;
  slug: string;
  title: string;
  tag: string;
  summary: string;
  content: React.ReactNode;
}

export default function SakuNotaPanduanPage() {
  const [activeChapterId, setActiveChapterId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const chapters: Chapter[] = [
    {
      id: 1,
      slug: "mulai-menggunakan",
      title: "1. Mulai Menggunakan & Pasang di HP",
      tag: "Awal & Aktivasi",
      summary: "Panduan resmi pemasangan SakuNota di Android & iPhone, aktivasi lisensi, dan pemilihan jenis usaha.",
      content: (
        <div className="space-y-6 text-xs sm:text-sm text-fg leading-relaxed">
          <p className="text-muted">
            SakuNota dirancang agar dapat langsung dipasang dan digunakan di ponsel pintar (Android &amp; iPhone) tanpa memerlukan instalasi aplikasi yang rumit dari toko aplikasi.
          </p>

          {/* Unified Install Guide Section with Android & iPhone Tabs */}
          <div className="bg-surface border border-line rounded-3xl p-3 sm:p-5">
            <InstallGuideSection isEmbedded={true} />
          </div>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Langkah 2: Memilih Jenis Usaha</h4>
            <p>
              Saat pertama kali menggunakan SakuNota, Anda dapat memilih jenis usaha sesuai operasional Anda:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li><strong className="text-fg">Warung & UMKM:</strong> Alur cepat langsung pilih barang dan bayar, tanpa memerlukan pengaturan meja.</li>
              <li><strong className="text-fg">Toko & Retail:</strong> Kasir langsung barang sembako/eceran dengan kode barang/SKU. Meja otomatis dinonaktifkan.</li>
              <li><strong className="text-fg">Rumah Makan & Restoran:</strong> Menyediakan pengelolaan nomor meja, open bill (makan dulu bayar nanti), dan cetak nota dapur.</li>
              <li><strong className="text-fg">Kafe & Kedai Minuman:</strong> Mendukung varian minuman (ukuran cup, gula/es) dan opsi dine-in maupun bungkus.</li>
            </ul>
            <p className="text-[11px] text-muted italic">
              *Catatan: Pengaturan jenis usaha dapat diubah kapan saja di menu Pengaturan tanpa menghapus riwayat transaksi lama.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Langkah 3: Aktivasi Lisensi Resmi</h4>
            <p>
              Setelah melakukan pembelian lisensi (Rp65.000 satu kali bayar untuk 1 perangkat), Anda akan menerima Nomor Lisensi (format: <code className="text-accent-text font-mono">SN-XXXX-XXXX-XXXX</code>). Masukkan kode lisensi pada menu <em>Pengaturan → Tentang SakuNota</em> untuk mengaktifkan seluruh fitur secara permanen.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      slug: "mengatur-toko",
      title: "2. Mengatur Profil Usaha",
      tag: "Pengaturan Toko",
      summary: "Memasukkan nama usaha, alamat cabang, nomor kontak, logo struk, dan catatan kaki nota.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Informasi toko akan tercetak di bagian atas dan bawah struk belanja pelanggan Anda.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-sm text-fg">Pengaturan yang Tersedia:</h4>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li><strong className="text-fg">Nama Usaha:</strong> Nama yang tampil paling atas pada struk cetak (misal: "Kedai Kopi Nusantara").</li>
              <li><strong className="text-fg">Alamat Cabang:</strong> Alamat singkat lokasi usaha Anda.</li>
              <li><strong className="text-fg">Nomor Telepon:</strong> Nomor WhatsApp atau telepon pemesanan yang tercetak di nota.</li>
              <li><strong className="text-fg">Logo Usaha:</strong> Unggah gambar logo hitam-putih atau transparan agar struk tampak lebih profesional.</li>
              <li><strong className="text-fg">Lebar Kertas Printer:</strong> Pilih antara kertas standar 58mm (printer mini) atau 80mm.</li>
              <li><strong className="text-fg">Catatan Kaki Struk (Footer):</strong> Kalimat penutup di akhir nota, contohnya "Terima kasih atas kunjungan Anda • IG: @kedainusantara".</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      slug: "mengelola-barang",
      title: "3. Mengelola Barang & Menu",
      tag: "Katalog & Produk",
      summary: "Menambah barang jualan, mengatur kategori, harga jual, kode SKU/barcode, dan pilihan tambahan.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Menu atau daftar barang adalah jantung dari operasional kasir Anda. Di SakuNota, Anda bebas mengatur barang jualan tanpa batasan jumlah.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Menambah Barang Baru:</h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Buka menu <strong className="text-fg">Admin → Kelola Menu & Stok</strong>.</li>
              <li>Tekan tombol <strong className="text-fg">+ Tambah Menu Baru</strong>.</li>
              <li>Isi <strong>Nama Barang</strong> dan <strong>Harga Jual</strong>.</li>
              <li>Pilih kategori yang sesuai (misal: Makanan, Minuman, Sembako) atau buat kategori baru sendiri.</li>
              <li><strong>SKU / Kode Barang (Opsional):</strong> Boleh dikosongkan jika usaha Anda tidak menggunakan kode barcode.</li>
              <li>Tekan <strong>Simpan</strong>. Barang akan langsung tersedia di layar kasir.</li>
            </ol>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-sm text-fg">Pilihan Tambahan (Modifier / Varian):</h4>
            <p>
              Untuk usaha makanan & minuman, Anda dapat menambahkan pilihan kustomisasi, misalnya:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Tingkat Pedas (Tidak Pedas, Sedang, Pedas Banget).</li>
              <li>Pilihan Porsi (Reguler, Jumbo +Rp3.000).</li>
              <li>Topping Tambahan (Telur +Rp3.000, Keju +Rp2.000).</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      slug: "mencatat-penjualan",
      title: "4. Mencatat Penjualan & Transaksi",
      tag: "Kasir & Transaksi",
      summary: "Memilih barang, mengubah jumlah pesanan, memberikan diskon, dan menghitung kembalian uang.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Alur kasir SakuNota dirancang secepat mungkin agar antrean pelanggan tidak menumpuk.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Alur Transaksi Standar:</h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Ketuk barang yang dipesan pelanggan untuk memasukkannya ke keranjang.</li>
              <li>Gunakan tombol <strong className="text-fg">[ - ]</strong> dan <strong className="text-fg">[ + ]</strong> untuk mengatur jumlah porsi/barang.</li>
              <li>Bila ada promo atau potongan harga, ketuk <strong className="text-accent-text">+ Tambah Diskon</strong> (bisa persen atau nominal rupiah).</li>
              <li>Ketuk tombol <strong className="text-fg">Bayar</strong>.</li>
              <li>Pilih metode pembayaran:
                <ul className="list-disc list-inside pl-4 mt-1 space-y-1">
                  <li><strong>Tunai (Cash):</strong> Masukkan uang yang diterima atau pilih pecahan tombol cepat. Sistem otomatis menampilkan nominal kembalian.</li>
                  <li><strong>Non-Tunai (QRIS / Transfer):</strong> Pembayaran tercatat terpisah dan Anda bisa mengunggah foto bukti transfer bila diperlukan.</li>
                </ul>
              </li>
              <li>Ketuk <strong>Selesaikan Transaksi</strong>. Struk dapat langsung dicetak atau disimpan.</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 5,
      slug: "meja-dan-pesanan",
      title: "5. Meja & Pesanan (Restoran & Kafe)",
      tag: "Meja & Open Bill",
      summary: "Mengelola pesanan meja, open bill, tambah pesanan susulan, dan split bill (bagi nota).",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Fitur ini khusus untuk usaha makanan & minuman dengan sistem makan di tempat (Dine-in). Untuk toko atau warung langsung bungkus, fitur meja otomatis disembunyikan.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Fungsi Meja & Open Bill:</h4>
            <ul className="list-disc list-inside space-y-2 pl-1">
              <li>
                <strong className="text-fg">Open Bill:</strong> Tamu memesan makanan terlebih dahulu, nota tetap terbuka sementara tamu menikmati hidangan, dan pembayaran dilakukan saat tamu selesai makan.
              </li>
              <li>
                <strong className="text-fg">Pesanan Susulan:</strong> Tambahkan pesanan minuman atau makanan tambahan ke meja yang sama tanpa membuat nota terpisah.
              </li>
              <li>
                <strong className="text-fg">Split Bill (Pisah Tagihan):</strong> Bila sekelompok tamu ingin membayar masing-masing, Anda bisa membagi pembayaran berdasarkan menu yang dipilih atau membagi nominal tagihan secara rata tanpa merusak pembukuan omzet.
              </li>
              <li>
                <strong className="text-fg">Lepas Meja:</strong> Setelah tagihan lunas, tekan tombol "Kosongkan Meja" agar meja siap digunakan tamu berikutnya.
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 6,
      slug: "stok-barang",
      title: "6. Stok Barang & Ketersediaan",
      tag: "Ketersediaan Menu",
      summary: "Menandai menu habis, memantau persediaan, dan memperbarui ketersediaan langsung di kasir.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Mencegah kasir menerima pesanan untuk barang yang bahan bakunya sudah habis.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Mengatur Status Ketersediaan:</h4>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>Pada menu <strong>Admin → Kelola Menu & Stok</strong>, setiap menu memiliki tombol status: <strong className="text-emerald-400">Tersedia</strong> atau <strong className="text-rose-400">Habis</strong>.</li>
              <li>Menu yang berstatus <em>Habis</em> akan tampil abu-abu di layar kasir dengan tanda khusus, sehingga kasir tidak dapat memasukkannya ke keranjang belanja.</li>
              <li>Bila bahan baku sudah datang kembali, cukup ubah status kembali menjadi <em>Tersedia</em> dengan sekali ketuk.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 7,
      slug: "kas-dan-shift",
      title: "7. Kas & Shift Kasir",
      tag: "Arus Kas Laci",
      summary: "Membuka shift kasir, mencatat modal awal, mencatat uang keluar/masuk, dan tutup shift.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Fitur Shift memastikan uang fisik yang ada di laci kasir cocok dengan total penjualan dan tidak ada selisih yang mencurigakan.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Alur Kerja Shift:</h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li><strong className="text-fg">Buka Shift:</strong> Masukkan nama kasir yang bertugas dan modal awal uang kembalian di laci (misal: Rp200.000).</li>
              <li><strong className="text-fg">Arus Kas Masuk / Keluar (+/- Kas):</strong> Bila kasir mengambil uang laci untuk membeli es batu atau bumbu darurat, catat di menu "+/- Kas" dengan keterangan yang jelas.</li>
              <li><strong className="text-fg">Tutup Shift:</strong> Di akhir jam kerja, kasir menghitung uang fisik di laci dan sistem akan mencocokkannya dengan total transaksi tunai. Selisih (bila ada) akan tercatat secara transparan di Laporan Shift (Z-Report).</li>
            </ol>
          </div>
        </div>
      ),
    },
    {
      id: 8,
      slug: "laporan-penjualan",
      title: "8. Laporan Usaha & Kirim WhatsApp",
      tag: "Omzet & Laporan",
      summary: "Melihat omzet per hari, produk terlaris, dan mengirim rangkuman rekap penjualan ke WhatsApp.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Pemilik usaha dapat memantau kesehatan bisnis setiap hari tanpa perlu membuka buku catatan manual.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Fitur Laporan:</h4>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li><strong className="text-fg">Filter Periode:</strong> Lihat omzet untuk <em>Hari Ini</em>, <em>Kemarin</em>, <em>7 Hari Terakhir</em>, atau <em>Bulan Ini</em>.</li>
              <li><strong className="text-fg">Grafik Penjualan:</strong> Visualisasi tren penjualan harian yang bersih dan mudah dibaca.</li>
              <li><strong className="text-fg">Kirim ke WhatsApp:</strong> Ketuk tombol "Kirim Laporan WhatsApp" untuk menghasilkan pesan teks rekap rapi yang langsung terhubung ke nomor WhatsApp pemilik toko.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 9,
      slug: "printer-struk",
      title: "9. Printer Struk Bluetooth Thermal",
      tag: "Pencetakan Nota",
      summary: "Menghubungkan printer mini Bluetooth, melakukan tes cetak, dan solusi bila printer tidak merespons.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            SakuNota mendukung printer struk thermal mini standar (kertas 58mm atau 80mm) seperti merk Panda, VSC, Eppos, Zjiang, Kassen, MiniPOS, dan printer thermal portable lainnya.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Cara Menyambungkan Printer Bluetooth:</h4>
            <ol className="list-decimal list-inside space-y-1.5 pl-1">
              <li>Nyalakan printer Bluetooth dan pastikan kertas thermal terpasang dengan benar (arah gulungan menghadap ke bawah/keluar).</li>
              <li>Buka pengaturan Bluetooth pada ponsel Anda dan pasangkan (pairing) dengan printer (biasanya bernama <em>RPP02N</em>, <em>MPT-II</em>, atau <em>Bluetooth Printer</em>, PIN bawaan umumnya 0000 atau 1234).</li>
              <li>Buka SakuNota, masuk ke menu <strong>Admin → Pengaturan Printer</strong>.</li>
              <li>Pilih ukuran kertas (58mm atau 80mm), lalu ketuk <strong>Sambungkan Printer Bluetooth</strong>.</li>
              <li>Tekan tombol <strong>Uji Cetak (Test Print)</strong> untuk memastikan koneksi berhasil dan teks tercetak jelas.</li>
            </ol>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-amber-500 flex items-center gap-2">
              <span>⚠️</span>
              <span>Jika Printer Tidak Merespons atau Kertas Keluar Polos:</span>
            </h4>
            <ul className="list-disc list-inside space-y-1 text-xs text-amber-600 dark:text-amber-400 pl-1">
              <li><strong>Kertas keluar tapi tidak ada tulisan:</strong> Gulungan kertas terbalik. Balik posisi gulungan kertas thermal Anda.</li>
              <li><strong>Bluetooth tidak mendeteksi printer:</strong> Matikan dan hidupkan kembali Bluetooth di HP, atau unpair lalu pasangkan kembali.</li>
              <li><strong>Izin Bluetooth peramban:</strong> Pastikan Google Chrome diizinkan mengakses Bluetooth / Perangkat Sekitar di Pengaturan Aplikasi HP.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 10,
      slug: "keamanan-dan-backup",
      title: "10. Keamanan Data & Pindah HP Kasir",
      tag: "Cadangan & Pindah HP",
      summary: "Memahami lisensi vs data jualan, mencadangkan data ke file, dan 7 langkah aman pindah ke HP baru.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-xs sm:text-sm text-blue-500 flex items-center gap-2">
              <span>💡</span>
              <span>Penting: Lisensi vs Data Usaha adalah Dua Hal Berbeda!</span>
            </h4>
            <p className="text-xs text-blue-600 dark:text-blue-300 leading-relaxed">
              <strong>1. Nomor Lisensi:</strong> Adalah hak izin penggunaan aplikasi untuk 1 perangkat kasir aktif.<br />
              <strong>2. Data Usaha:</strong> Berisi katalog menu, harga, stok, dan riwayat transaksi harian yang tersimpan di memori HP Anda sendiri.<br />
              Memindahkan lisensi ke HP baru tidak otomatis menyalin data menu Anda, dan mencadangkan file data tidak otomatis mengaktifkan lisensi di HP baru. Lakukan kedua langkah berikut saat berganti ponsel kasir.
            </p>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">7 Langkah Aman Pindah Kasir ke HP Baru:</h4>
            <ol className="list-decimal list-inside space-y-2 pl-1">
              <li><strong>Di HP Lama:</strong> Buka menu <em>Admin → Data & Cadangan</em>.</li>
              <li><strong>Unduh File Cadangan:</strong> Ketuk tombol <em>Cadangkan Seluruh Data (.json)</em>. File cadangan akan tersimpan di folder Download HP.</li>
              <li><strong>Simpan File:</strong> Kirim file tersebut ke WhatsApp pribadi Anda atau simpan di Google Drive.</li>
              <li><strong>Di HP Baru:</strong> Buka Google Chrome, akses SakuNota, lalu pilih <em>Tambahkan ke Layar Utama</em>.</li>
              <li><strong>Pulihkan Data Usaha:</strong> Di HP Baru, buka menu <em>Admin → Data & Cadangan</em>, lalu ketuk <em>Pulihkan Data dari File</em> dan pilih file cadangan Anda. Seluruh katalog menu, stok, dan riwayat langsung muncul.</li>
              <li><strong>Pelepasan Perangkat Lama (Unbind Device):</strong> Hubungi WhatsApp Admin SakuNota dengan menyebutkan nomor pesanan atau nomor lisensi Anda untuk melepas ikatan HP lama (atau reset otomatis bila masa garansi aktif).</li>
              <li><strong>Aktivasi Lisensi di HP Baru:</strong> Masukkan nomor lisensi Anda pada menu <em>Pengaturan → Tentang SakuNota</em>. Kasir siap digunakan kembali!</li>
            </ol>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-2">
            <h4 className="font-extrabold text-sm text-fg">Keamanan Tambahan:</h4>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li><strong>PIN Kasir:</strong> Kunci menu Admin dengan 4-digit PIN agar staf kasir tidak dapat mengubah harga, menghapus barang, atau melihat laporan rahasia.</li>
              <li><strong>Recovery Code:</strong> Catat kode pemulihan darurat saat pertama kali mengatur PIN agar tetap dapat masuk jika lupa sandi kasir.</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      id: 11,
      slug: "bantuan-dan-faq",
      title: "11. Bantuan & Dukungan Teknis",
      tag: "Dukungan Resmi",
      summary: "Pertanyaan umum, panduan pemecahan masalah, dan kontak WhatsApp resmi SakuNota.",
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
          <p>
            Kami siap mendampingi pemilik usaha agar operasional jualan harian berjalan lancar dan bebas kendala.
          </p>

          <div className="bg-surface border border-line rounded-2xl p-4 space-y-3">
            <h4 className="font-extrabold text-sm text-fg">Pusat Layanan Bantuan:</h4>
            <p>
              Bila Anda mengalami kesulitan teknis, aktivasi lisensi, atau pertanyaan seputar pemakaian:
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href="https://wa.me/6281234567890?text=Halo%20SakuNota,%20saya%20memerlukan%20bantuan%20seputar%20aplikasi%20kasir."
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md transition-all active:scale-95"
              >
                <span>💬</span>
                <span>Chat WhatsApp Bantuan Resmi</span>
              </a>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-card border border-line text-fg font-bold text-xs hover:border-slate-500 transition-colors"
              >
                <span>←</span>
                <span>Kembali ke Halaman Utama</span>
              </Link>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const filteredChapters = searchQuery.trim()
    ? chapters.filter(
        (c) =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.tag.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : chapters;

  const currentChapter =
    chapters.find((c) => c.id === activeChapterId) || chapters[0];

  return (
    <div className="min-h-screen bg-app text-fg flex flex-col selection:bg-accent selection:text-white">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md shadow-accent/20 group-hover:scale-105 transition-transform">
              SN
            </div>
            <div>
              <span className="font-black text-lg text-fg tracking-tight block leading-none">
                SakuNota
              </span>
              <span className="text-[10px] text-muted font-bold tracking-wider uppercase block mt-0.5">
                Buku Panduan Penggunaan Kasir
              </span>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle size="sm" />
          <Link
            href="/"
            className="hidden sm:inline-flex px-3.5 py-2 bg-card hover:bg-line text-xs font-bold text-fg rounded-xl border border-line transition-colors items-center gap-1.5"
          >
            <span>Beranda</span>
          </Link>
          <Link
            href="/pos"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-accent/20 transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Buka Kasir</span>
            <span>→</span>
          </Link>
        </div>
      </header>

      {/* 2. Main Layout Container */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-8 flex-1 flex flex-col md:flex-row gap-8">
        {/* Left Sidebar: Chapters List */}
        <aside className="w-full md:w-80 shrink-0 space-y-4">
          <div className="bg-surface border border-line rounded-3xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="text-xs font-black text-fg uppercase tracking-wider">
                Daftar Bab Panduan
              </h3>
              <span className="text-[10px] font-bold text-muted bg-card px-2 py-0.5 rounded-full border border-line">
                11 Bab
              </span>
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik panduan..."
                className="w-full pl-8 pr-3 py-2 bg-card border border-line rounded-xl text-xs font-medium text-fg placeholder:text-muted focus:border-accent outline-none"
              />
              <span className="absolute left-2.5 top-2.5 text-xs text-muted">🔍</span>
            </div>

            {/* List of chapters */}
            <nav className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
              {filteredChapters.map((ch) => {
                const isActive = ch.id === currentChapter.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setActiveChapterId(ch.id)}
                    className={`w-full text-left p-2.5 rounded-2xl transition-all flex flex-col gap-0.5 ${
                      isActive
                        ? "bg-accent text-white font-bold shadow-md shadow-accent/20"
                        : "hover:bg-card text-muted hover:text-fg"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold leading-snug line-clamp-1">
                        {ch.title}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-surface text-muted"
                        }`}
                      >
                        {ch.tag}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] line-clamp-1 ${
                        isActive ? "text-white/80" : "text-muted"
                      }`}
                    >
                      {ch.summary}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Quick Help Card */}
          <div className="bg-card border border-line rounded-3xl p-4 shadow-sm space-y-2">
            <h4 className="text-xs font-bold text-fg">Butuh Bantuan Langsung?</h4>
            <p className="text-[11px] text-muted">
              Tim SakuNota siap membantu pengaturan printer dan pertanyaan seputar usaha Anda.
            </p>
            <a
              href="https://wa.me/6281234567890?text=Halo%20SakuNota,%20saya%20butuh%20bantuan%20panduan."
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-bold text-accent-text hover:underline pt-1"
            >
              Hubungi WhatsApp Bantuan →
            </a>
          </div>
        </aside>

        {/* Right Main Content: Active Chapter */}
        <main className="flex-1 bg-card border border-line rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-line pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[10px] font-black tracking-wider uppercase text-accent-text bg-accent/15 px-2.5 py-1 rounded-full border border-accent/30 inline-block mb-1.5">
                {currentChapter.tag}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-fg tracking-tight">
                {currentChapter.title}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentChapter.id <= 1}
                onClick={() => setActiveChapterId((prev) => Math.max(1, prev - 1))}
                className="px-3 py-1.5 rounded-xl border border-line text-xs font-bold bg-surface hover:bg-line disabled:opacity-40 transition-colors"
              >
                ← Sebelumnya
              </button>
              <button
                type="button"
                disabled={currentChapter.id >= chapters.length}
                onClick={() =>
                  setActiveChapterId((prev) => Math.min(chapters.length, prev + 1))
                }
                className="px-3 py-1.5 rounded-xl border border-line text-xs font-bold bg-surface hover:bg-line disabled:opacity-40 transition-colors"
              >
                Berikutnya →
              </button>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none">
            {currentChapter.content}
          </div>

          <div className="pt-6 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-muted font-medium">
              Bab {currentChapter.id} dari {chapters.length} • SakuNota Kasir Tetap Jalan
            </span>
            <div className="flex items-center gap-2">
              <Link
                href="/pos"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl shadow-md shadow-accent/20 transition-all active:scale-95"
              >
                Coba Langsung di Kasir →
              </Link>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-line py-6 text-center text-xs text-muted bg-surface/50">
        <p>© 2026 SakuNota. Jualan Lebih Mudah, Kasir Tetap Jalan.</p>
      </footer>
    </div>
  );
}
