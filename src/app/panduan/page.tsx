"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { SUPPORT_WHATSAPP } from "@/lib/config";

// --- Types & Data Interfaces ---
interface GuideArticle {
  title: string;
  summary: string;
  steps: string[];
  tips?: string;
  targetHref?: string;
  targetLabel?: string;
}

interface GuideTopic {
  id: string;
  title: string;
  shortDesc: string;
  iconType: string;
  articles: GuideArticle[];
}

// --- Topic Catalog matching SakuNota Features & Sentrik POS Reference Layout ---
const TOPICS: GuideTopic[] = [
  {
    id: "getting-started",
    title: "Memulai & Setup Awal",
    shortDesc: "Panduan cepat awal memasang aplikasi, aktivasi lisensi, hingga siap jualan pertama kali.",
    iconType: "rocket",
    articles: [
      {
        title: "Cara Memasang SakuNota ke Layar Utama HP (PWA)",
        summary: "Jadikan SakuNota seperti aplikasi native di HP tanpa install via Play Store dan langsung bisa dibuka saat offline.",
        steps: [
          "Buka browser Chrome di Android (atau Safari di iPhone).",
          "Kunjungi alamat website https://sakunota.my.id.",
          "Di Chrome, ketuk ikon titik tiga (⋮) di pojok kanan atas, lalu pilih 'Tambahkan ke Layar Utama' (Add to Home screen).",
          "Di iPhone, ketuk ikon Share (kotak panah atas), lalu pilih 'Add to Home Screen'.",
          "Ikon SakuNota akan muncul di layar utama HP Anda dan siap dibuka dalam 1 detik."
        ],
        tips: "Setelah dipasang ke layar utama, aplikasi kasir tetap dapat dibuka normal meskipun kuota internet habis.",
        targetHref: "/pos?demo=true",
        targetLabel: "Coba Buka Kasir Sekarang"
      },
      {
        title: "Aktivasi Kode Lisensi Resmi atau Tester",
        summary: "Cara mengaktifkan lisensi kasir permanen atau lisensi tester tanpa ribet.",
        steps: [
          "Klik tombol 'Aktivasi Lisensi' di bagian atas halaman atau kunjungi /?aktivasi=true.",
          "Pilih tab 'Pakai Kode Lisensi'.",
          "Ketik atau tempel kode lisensi Anda (contoh: SN-TEST-XXXX atau SN-XXXX-XXXX-XXXX).",
          "Klik tombol 'Aktifkan Lisensi' untuk mengikat kasir di perangkat Anda."
        ],
        tips: "Jika Anda memegang kode SN-TEST atau lisensi resmi, Anda TIDAK perlu memasukkan Nomor Pesanan atau Kode Akses Rahasia.",
        targetHref: "/?aktivasi=true",
        targetLabel: "Buka Form Aktivasi Lisensi"
      },
      {
        title: "Alur Singkat dari Buka Warung Sampai Tutup Shift",
        summary: "Pahami siklus harian: Isi modal awal -> Catat pesanan -> Tutup shift -> Kirim rekap omzet.",
        steps: [
          "Buka Kasir (/pos), klik tombol 'Buka Shift', dan masukkan modal kas kembalian awal di laci.",
          "Tekan menu makanan/minuman yang dipilih pembeli, pilih opsi varian jika ada.",
          "Klik 'Bayar Sekarang' untuk pelanggan takeaway, atau 'Simpan ke Meja' untuk dine-in.",
          "Saat warung tutup, klik 'Tutup Shift', hitung uang fisik di laci kas, dan cetak Z-Report rekap harian.",
          "Kirim ringkasan omzet ke WhatsApp pemilik usaha lewat menu Admin."
        ],
        targetHref: "/pos",
        targetLabel: "Mulai Operasional Kasir"
      }
    ]
  },
  {
    id: "account-settings",
    title: "Profil Toko & Pengaturan Usaha",
    shortDesc: "Atur nama outlet, alamat toko, nomor telepon, logo nota, dan catatan kaki struk.",
    iconType: "settings",
    articles: [
      {
        title: "Mengubah Nama Usaha & Alamat Struk",
        summary: "Identitas toko akan tercetak di bagian paling atas struk belanja pelanggan.",
        steps: [
          "Buka menu Pengaturan Toko (/admin/pengaturan/profil).",
          "Isi kolom 'Nama Usaha / Warung' (contoh: Angkringan Mas Reza).",
          "Isi kolom 'Alamat Lengkap' dan 'Nomor WhatsApp Toko'.",
          "Tekan tombol 'Simpan Pengaturan Profil'."
        ],
        targetHref: "/admin/pengaturan/profil",
        targetLabel: "Buka Pengaturan Profil Toko"
      },
      {
        title: "Mengatur Catatan Kaki (Footer) Struk",
        summary: "Tambahkan ucapan terima kasih, info akun sosial media, atau password Wi-Fi di bawah nota.",
        steps: [
          "Buka menu Pengaturan Printer & Struk (/admin/pengaturan/printer).",
          "Scroll ke bagian 'Catatan Kaki Struk'.",
          "Tuliskan pesan Anda (contoh: 'Matur Nuwun Sampun Rawuh - IG: @angkringan.reza').",
          "Klik 'Simpan Format Struk'."
        ],
        targetHref: "/admin/pengaturan/printer",
        targetLabel: "Atur Catatan Kaki Struk"
      }
    ]
  },
  {
    id: "pos-checkout",
    title: "Kasir POS & Transaksi",
    shortDesc: "Input pesanan kilat, opsi bungkus/dine-in, diskon per item, open bill, dan struk bayar.",
    iconType: "cart",
    articles: [
      {
        title: "Cara Menginput Pesanan Pembeli",
        summary: "Langkah cepat memasukkan item pesanan ke keranjang kasir.",
        steps: [
          "Di layar Kasir (/pos), ketuk menu yang dipilih pembeli.",
          "Jika menu memiliki varian (misal: Level Pedas atau Ukuran Cup), popup pilihan varian akan muncul.",
          "Pilih varian lalu klik 'Tambah ke Pesanan'.",
          "Jumlah item di keranjang kasir sebelah kanan akan otomatis bertambah."
        ],
        targetHref: "/pos",
        targetLabel: "Buka Layar Kasir"
      },
      {
        title: "Simpan Tagihan Meja (Open Bill) & Bayar Belakangan",
        summary: "Cocok untuk pelanggan makan di tempat (Dine-in) yang bayar setelah selesai makan.",
        steps: [
          "Setelah memilih menu, klik tombol 'Simpan ke Meja' atau 'Open Bill'.",
          "Pilih nomor meja pelanggan (misal: Meja 04).",
          "Pesanan akan tersimpan di status meja dan dapur bisa mulai memasak.",
          "Saat pelanggan hendak pulang, klik nomor Meja 04 di kasir lalu klik 'Bayar Tagihan'."
        ],
        targetHref: "/pos",
        targetLabel: "Coba Fitur Open Bill"
      },
      {
        title: "Pisah Tagihan (Split Bill)",
        summary: "Melayani rombongan pembeli yang ingin membayar tagihan masing-masing.",
        steps: [
          "Buka tagihan meja aktif di kasir.",
          "Klik opsi 'Pisah Tagihan' (Split Bill).",
          "Pilih menu mana saja yang ingin dibayar pertama kali.",
          "Proses pembayaran pertama, sisa pesanan tetap tertahan di meja menunggu pembayaran kedua."
        ],
        targetHref: "/pos",
        targetLabel: "Lihat Layar Transaksi"
      }
    ]
  },
  {
    id: "products-catalog",
    title: "Katalog Menu & Varian",
    shortDesc: "Kelola daftar makanan, minuman, kategori produk, level pedas, dan topping tambahan.",
    iconType: "package",
    articles: [
      {
        title: "Menambah Menu Makanan atau Minuman Baru",
        summary: "Cara memasukkan produk baru ke dalam daftar kasir.",
        steps: [
          "Buka menu Admin -> Kelola Menu (/admin/menu).",
          "Klik tombol '+ Tambah Menu Baru'.",
          "Ketik Nama Menu (contoh: Nasi Kucing Teri), Kategori (contoh: Makanan), dan Harga Jual (contoh: Rp4.000).",
          "Pilih ikon atau warna kartu menu agar mudah dibedakan kasir.",
          "Klik 'Simpan Menu'."
        ],
        targetHref: "/admin/menu",
        targetLabel: "Kelola Menu Sekarang"
      },
      {
        title: "Membuat Varian Produk & Topping Ekstra",
        summary: "Contoh: Pilihan Manis/Tawar, Dingin/Panas, atau Tambahan Telur Puyuh.",
        steps: [
          "Buka halaman Kelola Menu, pilih salah satu produk lalu klik 'Ubah / Edit'.",
          "Aktifkan opsi 'Memiliki Varian'.",
          "Tambahkan nama varian dan selisih harga (contoh: Es Batu +Rp1.000, Extra Topping +Rp3.000).",
          "Simpan perubahan. Varian akan langsung muncul saat kasir mengetuk menu tersebut."
        ],
        targetHref: "/admin/menu",
        targetLabel: "Atur Varian Menu"
      },
      {
        title: "Menandai Menu yang Sedang Habis (Sold Out)",
        summary: "Nonaktifkan sementara menu tanpa perlu menghapusnya dari database.",
        steps: [
          "Di daftar Kelola Menu, cari menu yang habis stoknya.",
          "Geser tombol switch 'Tersedia' menjadi nonaktif (Habis).",
          "Menu tersebut akan buram di layar kasir dan kasir tidak bisa salah memilihnya."
        ],
        targetHref: "/admin/menu",
        targetLabel: "Cek Ketersediaan Menu"
      }
    ]
  },
  {
    id: "inventory-management",
    title: "Manajemen Stok & Bahan Baku",
    shortDesc: "Pantau sisa stok otomatis berkurang saat penjualan dan dapatkan alarm stok menipis.",
    iconType: "layers",
    articles: [
      {
        title: "Mengaktifkan Pengurangan Stok Otomatis",
        summary: "Setiap transaksi selesai, jumlah stok produk akan langsung dipotong dari memori lokal.",
        steps: [
          "Buka menu Kelola Menu (/admin/menu), pilih produk yang ingin dipantau stoknya.",
          "Centang pilihan 'Lacak Jumlah Stok'.",
          "Masukkan jumlah stok fisik yang saat ini ada di warung (contoh: 50 pcs).",
          "Setiap kasir menyelesaikan penjualan, sistem otomatis mengurangi jumlahnya."
        ],
        targetHref: "/admin/menu",
        targetLabel: "Buka Data Stok Produk"
      },
      {
        title: "Peringatan Stok Menipis",
        summary: "Ketahui barang mana yang harus segera dibeli ke pasar sebelum habis.",
        steps: [
          "Tentukan batas minimum stok di menu pengaturan (misal: 5 pcs).",
          "Jika stok tersisa 5 atau kurang, kartu menu di kasir akan bertanda warna kuning peringatan.",
          "Owner dapat melihat rekap barang menipis di halaman ringkasan admin."
        ],
        targetHref: "/admin",
        targetLabel: "Lihat Ringkasan Stok"
      }
    ]
  },
  {
    id: "customers-loyalty",
    title: "Pelanggan & Kasbon / Hutang",
    shortDesc: "Catat nomor langganan setia, histori belanja, dan pencatatan kasbon pelanggan.",
    iconType: "users",
    articles: [
      {
        title: "Mencatat Data Pelanggan Baru saat Transaksi",
        summary: "Simpan nama dan nomor WhatsApp pelanggan langsung dari kasir.",
        steps: [
          "Di layar kasir sebelah kanan atas, ketuk kolom 'Pelanggan'.",
          "Ketik nama atau nomor HP pelanggan (contoh: Pak Bambang - 08123456789).",
          "Nomor ini akan digunakan jika pelanggan ingin menerima struk via WhatsApp."
        ],
        targetHref: "/pos",
        targetLabel: "Buka Kasir POS"
      },
      {
        title: "Mencatat Pembayaran Kasbon (Hutang)",
        summary: "Untuk warung yang memperbolehkan pelanggan langganan bayar belakangan.",
        steps: [
          "Pada jendela pembayaran, pilih metode pembayaran 'Kasbon / Hutang'.",
          "Pilih nama pelanggan terdaftar.",
          "Tagihan akan dicatat di daftar piutang admin (/admin/transaksi) hingga pelanggan melunasi."
        ],
        targetHref: "/admin/transaksi",
        targetLabel: "Lihat Riwayat Transaksi"
      }
    ]
  },
  {
    id: "table-service",
    title: "Manajemen Meja & Dine-In",
    shortDesc: "Tata nomor meja, lihat meja kosong vs terisi, pindah meja, dan cetak pesanan dapur.",
    iconType: "utensils",
    articles: [
      {
        title: "Menambah Nomor & Kapasitas Meja",
        summary: "Sesuaikan jumlah nomor meja dengan kondisi fisik restoran atau angkringan Anda.",
        steps: [
          "Buka menu Admin -> Kelola Meja (/admin/meja).",
          "Klik tombol '+ Tambah Meja'.",
          "Isi Nomor Meja (contoh: Meja 01, Lesehan A, atau Area Bar) dan jumlah kapasitas kursi.",
          "Klik Simpan. Meja akan muncul di denah meja kasir."
        ],
        targetHref: "/admin/meja",
        targetLabel: "Atur Denah Meja"
      },
      {
        title: "Memindahkan Pesanan Pelanggan ke Meja Lain",
        summary: "Jika pelanggan ingin berpindah tempat duduk saat pesanan masih berjalan.",
        steps: [
          "Buka kasir lalu klik meja asal pelanggan.",
          "Pilih tombol 'Pindah Meja'.",
          "Pilih meja tujuan yang masih kosong.",
          "Seluruh tagihan dan daftar pesanan otomatis berpindah ke meja baru."
        ],
        targetHref: "/pos",
        targetLabel: "Buka Layar Kasir"
      }
    ]
  },
  {
    id: "online-ordering",
    title: "Menu Digital & QR Meja",
    shortDesc: "Buat kode QR untuk setiap meja agar pelanggan bisa melihat menu langsung dari HP.",
    iconType: "globe",
    articles: [
      {
        title: "Mencetak QR Code Menu Meja",
        summary: "Pelanggan cukup scan kamera HP untuk melihat daftar menu dan harga terbaru.",
        steps: [
          "Buka menu Admin -> Kelola Meja (/admin/meja).",
          "Klik tombol 'Cetak QR Code' pada meja yang diinginkan.",
          "Sistem akan menampilkan barcode QR siap cetak atau ditempel di meja kasir.",
          "Pelanggan yang scan akan diarahkan ke tampilan katalog menu warung Anda."
        ],
        targetHref: "/admin/meja",
        targetLabel: "Buka Pengaturan QR Meja"
      }
    ]
  },
  {
    id: "reports-analytics",
    title: "Laporan Penjualan & Shift Kasir",
    shortDesc: "Grafik omzet harian, menu paling laris, selisih kas laci, dan kirim rekap ke WhatsApp.",
    iconType: "bar-chart",
    articles: [
      {
        title: "Melihat Grafik Omzet 7 Hari & Bulanan",
        summary: "Ketahui tren penjualan usaha Anda secara visual dan real-time.",
        steps: [
          "Buka Dashboard Admin (/admin).",
          "Lihat kartu total omzet hari ini, jumlah transaksi, dan rata-rata belanja pembeli.",
          "Periksa grafik tren pendapatan 7 hari terakhir untuk mengetahui hari paling ramai."
        ],
        targetHref: "/admin",
        targetLabel: "Buka Laporan Admin"
      },
      {
        title: "Mengirim Rekap Penjualan Otomatis ke WhatsApp Pemilik",
        summary: "Kirim format laporan rapi ke WhatsApp owner hanya dengan satu kali ketuk.",
        steps: [
          "Di halaman Dashboard Admin (/admin), scroll ke tombol 'Kirim Rekap ke WhatsApp'.",
          "Sistem otomatis menyusun ringkasan: Total Omzet, Kas Masuk/Keluar, Menu Terlaris, dan Selisih Kas.",
          "Aplikasi WhatsApp akan terbuka dengan pesan siap kirim ke nomor HP pemilik."
        ],
        targetHref: "/admin",
        targetLabel: "Coba Fitur Laporan WhatsApp"
      },
      {
        title: "Pencatatan Uang Kas Masuk & Kas Keluar (Petty Cash)",
        summary: "Catat pengeluaran mendadak seperti beli es batu, bumbu, atau gas dari laci kasir.",
        steps: [
          "Di layar kasir (/pos), klik tombol '+/- Kas Laci'.",
          "Pilih 'Kas Keluar' atau 'Kas Masuk'.",
          "Masukkan jumlah nominal dan keterangan (misal: 'Beli galon air Rp20.000').",
          "Uang akhir di laci kasir akan terkalkulasi akurat saat tutup shift."
        ],
        targetHref: "/pos",
        targetLabel: "Buka Kasir"
      }
    ]
  },
  {
    id: "billing-subscription",
    title: "Aktivasi Lisensi & Beli Sekali",
    shortDesc: "Sistem beli sekali pakai selamanya tanpa biaya bulanan, aktivasi tester, dan ganti HP.",
    iconType: "credit-card",
    articles: [
      {
        title: "Beli Sekali Tanpa Biaya Berlangganan Bulanan",
        summary: "SakuNota menerapkan model kepemilikan penuh tanpa potongan per transaksi atau biaya server.",
        steps: [
          "Lisensi resmi SakuNota berlaku selamanya (Lifetime).",
          "Tidak ada tagihan bulanan atau tahunan.",
          "Aplikasi tetap berjalan normal selamanya meskipun Anda tidak pernah terhubung ke internet."
        ],
        targetHref: "/?beli=true",
        targetLabel: "Lihat Info Pembelian"
      },
      {
        title: "Cara Membedakan Lisensi Resmi vs Lisensi Tester",
        summary: "Panduan aktivasi untuk pengguna yang memiliki kode berbeda.",
        steps: [
          "Lisensi Tester (SN-TEST-XXXX): Digunakan untuk uji coba fitur penuh kasir offline.",
          "Lisensi Resmi (SN-XXXX-XXXX-XXXX): Kode permanen untuk usaha toko Anda.",
          "Keduanya diaktifkan langsung di tab 'Pakai Kode Lisensi' tanpa memerlukan nomor pesanan."
        ],
        targetHref: "/?aktivasi=true",
        targetLabel: "Buka Menu Aktivasi"
      }
    ]
  },
  {
    id: "integrations",
    title: "Integrasi WhatsApp & Ekspor Excel",
    shortDesc: "Kirim nota digital ke WA pelanggan, rekap shift ke owner, dan ekspor riwayat ke file Excel.",
    iconType: "plug",
    articles: [
      {
        title: "Kirim Struk Belanja Digital ke WhatsApp Pelanggan",
        summary: "Hemat kertas struk dengan mengirimkan nota digital langsung ke chat pelanggan.",
        steps: [
          "Saat menyelesaikan transaksi di kasir, pilih opsi 'Kirim Struk WA'.",
          "Masukkan nomor WhatsApp pelanggan jika belum tersimpan.",
          "SakuNota akan membuka WhatsApp dengan teks nota rincian belanja yang rapi dan profesional."
        ],
        targetHref: "/pos",
        targetLabel: "Coba Layar Kasir"
      },
      {
        title: "Ekspor Seluruh Riwayat Transaksi ke Microsoft Excel (.xlsx)",
        summary: "Mudahkan akuntan atau pembukuan Anda dengan file spreadsheet resmi.",
        steps: [
          "Buka menu Admin -> Riwayat Transaksi (/admin/transaksi).",
          "Pilih rentang tanggal (Hari ini, Minggu ini, atau Bulan ini).",
          "Klik tombol 'Ekspor ke Excel'. File .xlsx akan otomatis terunduh ke HP Anda."
        ],
        targetHref: "/admin/transaksi",
        targetLabel: "Buka Riwayat & Ekspor"
      }
    ]
  },
  {
    id: "hardware-devices",
    title: "Printer Bluetooth & Perangkat Keras",
    shortDesc: "Hubungkan printer thermal Bluetooth 58mm & 80mm ke HP Android tanpa router kabel.",
    iconType: "printer",
    articles: [
      {
        title: "Menghubungkan Printer Bluetooth Thermal 58mm / 80mm",
        summary: "Cetak struk kilat langsung dari HP via sinyal Bluetooth nirkabel.",
        steps: [
          "Nyalakan printer Bluetooth dan pastikan kertas thermal sudah terpasang.",
          "Buka Pengaturan Bluetooth di HP Android Anda, lalu 'Pasangkan' (Pair) dengan printer.",
          "Buka SakuNota -> Pengaturan Printer (/admin/pengaturan/printer).",
          "Pilih ukuran kertas (58mm atau 80mm), lalu klik tombol 'Cari & Hubungkan Printer'.",
          "Pilih printer Anda dari daftar yang muncul, lalu tekan 'Tes Cetak Struk'."
        ],
        tips: "Pastikan izin Bluetooth dan Izin Lokasi di browser Android Anda sudah dalam status 'Izinkan' (Allow).",
        targetHref: "/admin/pengaturan/printer",
        targetLabel: "Buka Pengaturan Printer"
      },
      {
        title: "Mengatur Buka Laci Kasir Otomatis (Cash Drawer Kick)",
        summary: "Laci uang terbuka otomatis setiap kali struk pembayaran selesai dicetak.",
        steps: [
          "Pastikan kabel RJ11 dari laci kasir sudah tercolok ke port 'Drawer' di belakang printer Bluetooth.",
          "Di menu Pengaturan Printer SakuNota, aktifkan opsi 'Buka Laci Kasir Otomatis'.",
          "Setiap kali struk pembayaran dicetak, printer akan mengirim sinyal pembuka laci otomatis."
        ],
        targetHref: "/admin/pengaturan/printer",
        targetLabel: "Atur Laci Kasir"
      }
    ]
  },
  {
    id: "receipts-templates",
    title: "Format Struk & Catatan Nota",
    shortDesc: "Kustomisasi logo nota, ukuran teks struk, nomor antrean, dan catatan terima kasih.",
    iconType: "file-text",
    articles: [
      {
        title: "Mengatur Tampilan Nomor Antrean di Struk",
        summary: "Nomor antrean tercetak besar di atas nota agar memudahkan pemanggilan pelanggan.",
        steps: [
          "Buka menu Pengaturan Printer (/admin/pengaturan/printer).",
          "Aktifkan switch 'Cetak Nomor Antrean Besar'.",
          "Nomor antrean akan otomatis bertambah dari nomor 1 setiap awal hari."
        ],
        targetHref: "/admin/pengaturan/printer",
        targetLabel: "Buka Template Struk"
      }
    ]
  },
  {
    id: "users-permissions",
    title: "Hak Akses Kasir & PIN Owner",
    shortDesc: "Kunci menu admin dengan PIN rahasia dan batasi pegawai hanya bisa mengakses kasir.",
    iconType: "shield",
    articles: [
      {
        title: "Memasang PIN Pengaman untuk Pemilik Usaha",
        summary: "Cegah karyawan kasir melihat laporan keuntungan, mengubah harga, atau menghapus riwayat.",
        steps: [
          "Buka menu Admin -> Pengaturan Keamanan (/admin/pengaturan/keamanan).",
          "Aktifkan opsi 'Kunci Halaman Admin dengan PIN'.",
          "Masukkan 4 atau 6 digit angka PIN Pemilik yang Anda kehendaki.",
          "Klik Simpan PIN. Karyawan kasir kini tidak akan bisa membuka menu admin tanpa izin Anda."
        ],
        targetHref: "/admin/pengaturan/keamanan",
        targetLabel: "Pasang PIN Pengaman"
      }
    ]
  },
  {
    id: "offline-mode",
    title: "Mode 100% Offline & PWA",
    shortDesc: "Jualan normal tanpa sinyal internet, tanpa buffering, dan data aman di penyimpanan lokal HP.",
    iconType: "wifi-off",
    articles: [
      {
        title: "Cara Kerja Teknologi Offline Local-First SakuNota",
        summary: "Mengapa SakuNota tidak pernah lemot meskipun sinyal provider sedang down?",
        steps: [
          "Seluruh mesin kasir, database produk, dan kalkulasi nota berjalan langsung di memori HP Anda.",
          "Aplikasi tidak perlu mengirim sinyal bolak-balik ke server cloud saat kasir menekan tombol.",
          "Saat kuota habis, mati lampu, atau berada di basement tanpa sinyal, transaksi tetap 100% lancar."
        ],
        tips: "Anda tidak perlu membeli langganan Wi-Fi toko hanya untuk menjalankan mesin kasir SakuNota.",
        targetHref: "/pos",
        targetLabel: "Coba Transaksi Offline"
      }
    ]
  },
  {
    id: "payments-refunds",
    title: "Metode Pembayaran Tunai, QRIS & Void",
    shortDesc: "Hitung kembalian uang otomatis, pembayaran QRIS statis, dan pembatalan transaksi (void).",
    iconType: "banknote",
    articles: [
      {
        title: "Menerima Pembayaran Tunai & Uang Pas",
        summary: "Tombol nominal pecahan rupiah cepat (Rp20.000, Rp50.000, Rp100.000) untuk kasir kilat.",
        steps: [
          "Saat pembeli hendak membayar, tekan tombol 'Bayar Sekarang'.",
          "Klik tombol pecahan uang yang diserahkan pelanggan atau ketik nominalnya.",
          "Sistem otomatis menampilkan jumlah Uang Kembalian dengan angka besar di layar kasir.",
          "Tekan 'Selesai & Cetak Struk'."
        ],
        targetHref: "/pos",
        targetLabel: "Layar Pembayaran Kasir"
      },
      {
        title: "Pembayaran Menggunakan QRIS Toko Sendiri",
        summary: "Gunakan barcode QRIS bank apa pun milik Anda tanpa potongan MDR dari SakuNota.",
        steps: [
          "Upload gambar QRIS toko Anda di menu Pengaturan Pembayaran.",
          "Saat pembeli ingin bayar non-tunai, kasir cukup memilih metode 'QRIS'.",
          "Layar kasir akan menampilkan barcode QRIS toko Anda untuk di-scan oleh pembeli."
        ],
        targetHref: "/admin/pengaturan/pajak",
        targetLabel: "Atur Pembayaran QRIS"
      },
      {
        title: "Membatalkan Transaksi yang Salah Input (Void)",
        summary: "Cara aman membatalkan pesanan yang salah ketik kasir dengan catatan audit.",
        steps: [
          "Buka menu Admin -> Riwayat Transaksi (/admin/transaksi).",
          "Cari nomor struk transaksi yang hendak dibatalkan.",
          "Klik tombol 'Batalkan Transaksi / Void' dan masukkan alasan pembatalan.",
          "Stok produk otomatis dikembalikan dan saldo omzet dikoreksi."
        ],
        targetHref: "/admin/transaksi",
        targetLabel: "Buka Riwayat Transaksi"
      }
    ]
  },
  {
    id: "taxes-compliance",
    title: "Pajak PB1 & Service Charge",
    shortDesc: "Penerapan pajak restoran daerah (PB1 10%) dan biaya layanan yang otomatis terhitung di struk.",
    iconType: "percent",
    articles: [
      {
        title: "Mengaktifkan Pajak Restoran (PB1 10%)",
        summary: "Perhitungan pajak otomatis tercantum transparan di nota pembeli.",
        steps: [
          "Buka menu Admin -> Pengaturan Pajak & Biaya (/admin/pengaturan/pajak).",
          "Aktifkan switch 'Terapkan Pajak Restoran (PB1)'.",
          "Masukkan persentase tarif pajak (contoh: 10%).",
          "Pilih apakah harga menu sudah termasuk pajak (Include) atau belum termasuk pajak (Exclude)."
        ],
        targetHref: "/admin/pengaturan/pajak",
        targetLabel: "Buka Pengaturan Pajak"
      },
      {
        title: "Mengatur Biaya Layanan (Service Charge / Takeaway Fee)",
        summary: "Tambahkan biaya bungkus atau layanan meja secara otomatis.",
        steps: [
          "Di halaman Pengaturan Pajak, aktifkan 'Biaya Layanan'.",
          "Isi persentase atau nominal tetap per pesanan.",
          "Klik Simpan Pengaturan."
        ],
        targetHref: "/admin/pengaturan/pajak",
        targetLabel: "Atur Biaya Layanan"
      }
    ]
  },
  {
    id: "troubleshooting",
    title: "Solusi Kendala & Troubleshooting",
    shortDesc: "Panduan mengatasi Bluetooth printer tidak terdeteksi, cetak struk loncat, dan lupa PIN.",
    iconType: "help-circle",
    articles: [
      {
        title: "Printer Bluetooth Tidak Muncul Saat Dipindai",
        summary: "Solusi jika printer Bluetooth tidak terdeteksi oleh browser HP.",
        steps: [
          "Pastikan printer sudah menyala (lampu indikator power menyala hijau/biru).",
          "Buka pengaturan Bluetooth bawaan HP Android Anda, dan pastikan sudah berpasangan (Paired).",
          "Buka Pengaturan Aplikasi di HP -> Chrome -> Izin (Permissions) -> Aktifkan 'Perangkat Sekitar' (Nearby Devices) dan 'Lokasi' (Location).",
          "Tutup aplikasi Chrome sepenuhnya lalu buka kembali SakuNota dan klik tombol 'Cari Printer'."
        ],
        tips: "Pada Android versi 12 ke atas, izin 'Nearby Devices' wajib diaktifkan agar browser bisa mendeteksi perangkat Bluetooth.",
        targetHref: "/admin/pengaturan/printer",
        targetLabel: "Coba Koneksi Printer Lagi"
      },
      {
        title: "Lupa PIN Pengaman Menu Admin",
        summary: "Cara mereset kode keamanan jika pemilik lupa PIN yang dipasang.",
        steps: [
          "Buka jendela aktivasi lisensi.",
          "Gunakan kode lisensi resmi yang Anda miliki untuk melakukan verifikasi ulang identitas pemilik.",
          "Sistem akan membuka kunci darurat dan mengizinkan Anda membuat PIN baru."
        ],
        tips: "Catat atau simpan PIN baru Anda di tempat aman seperti catatan Google Keep.",
        targetHref: "/admin/pengaturan/keamanan",
        targetLabel: "Buka Keamanan Admin"
      },
      {
        title: "Hasil Cetakan Struk Kosong (Kertas Putih Saja)",
        summary: "Kertas keluar dari printer tapi tidak ada tulisannya sama sekali.",
        steps: [
          "Buka penutup printer thermal.",
          "Periksa posisi gulungan kertas thermal Anda. Umumnya kertas thermal terbalik posisinya.",
          "Balik arah gulungan kertas sehingga sisi yang licin menghadap ke atas/mata head printer.",
          "Tutup kembali dan coba lakukan 'Tes Cetak Struk'."
        ],
        targetHref: "/admin/pengaturan/printer",
        targetLabel: "Tes Cetak Struk"
      }
    ]
  },
  {
    id: "security-privacy",
    title: "Keamanan Data & Backup File",
    shortDesc: "Data tersimpan aman di HP pemilik, unduh cadangan file JSON, dan panduan ganti perangkat.",
    iconType: "lock",
    articles: [
      {
        title: "Mengunduh File Cadangan Data Toko (.JSON)",
        summary: "Simpan salinan seluruh transaksi dan daftar menu ke memori HP Anda secara teratur.",
        steps: [
          "Buka menu Admin -> Pengaturan -> Data & Cadangan (/admin/pengaturan/data).",
          "Klik tombol 'Unduh Cadangan Data (.JSON)'.",
          "File cadangan akan tersimpan di folder Download HP Anda.",
          "Disarankan untuk mengunduh file ini seminggu sekali atau mengirimkannya ke WhatsApp pribadi sebagai arsip."
        ],
        tips: "File cadangan berisi data 100% lengkap: nama menu, riwayat transaksi kasir, daftar meja, dan catatan shift.",
        targetHref: "/admin/pengaturan/data",
        targetLabel: "Unduh Cadangan Data Sekarang"
      },
      {
        title: "Memindahkan Kasir SakuNota ke HP Baru",
        summary: "Cara mudah ganti perangkat tanpa kehilangan riwayat penjualan sebelumnya.",
        steps: [
          "Di HP lama, unduh file cadangan data (.JSON) lewat menu /admin/pengaturan/data.",
          "Kirim file .JSON tersebut ke HP baru via WhatsApp atau Bluetooth.",
          "Buka SakuNota di HP baru, buka menu /admin/pengaturan/data, lalu pilih 'Pulihkan dari File Cadangan'.",
          "Seluruh menu dan riwayat transaksi akan langsung muncul di HP baru.",
          "Untuk memindahkan ikatan lisensi, hubungi WhatsApp resmi SakuNota untuk reset ikatan perangkat lama."
        ],
        targetHref: "/admin/pengaturan/data",
        targetLabel: "Panduan Pindah HP"
      }
    ]
  }
];

// --- Custom Crisp Stroke Icon Component ---
function TopicIcon({ type }: { type: string }) {
  const commonProps = {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (type) {
    case "rocket":
      return (
        <svg {...commonProps}>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2.5 5-2.5" />
          <path d="M15 15v5s3.03-.55 4.5-2c1.63-1.62 2.5-5 2.5-5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "cart":
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );
    case "package":
      return (
        <svg {...commonProps}>
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "layers":
      return (
        <svg {...commonProps}>
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...commonProps}>
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
          <path d="M15 11v11" />
          <path d="M5 2v10a3 3 0 0 0 3 3h1v7h2v-7h1a3 3 0 0 0 3-3V2" />
        </svg>
      );
    case "globe":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      );
    case "bar-chart":
      return (
        <svg {...commonProps}>
          <line x1="12" x2="12" y1="20" y2="10" />
          <line x1="18" x2="18" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
      );
    case "credit-card":
      return (
        <svg {...commonProps}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "plug":
      return (
        <svg {...commonProps}>
          <path d="M12 22v-5" />
          <path d="M9 8V2" />
          <path d="M15 2v6" />
          <path d="M18 8v5a6 6 0 0 1-12 0V8c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "printer":
      return (
        <svg {...commonProps}>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
        </svg>
      );
    case "file-text":
      return (
        <svg {...commonProps}>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      );
    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "wifi-off":
      return (
        <svg {...commonProps}>
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 13a10 10 0 0 1 5.24-2.76" />
          <line x1="12" x2="12.01" y1="20" y2="20" />
        </svg>
      );
    case "banknote":
      return (
        <svg {...commonProps}>
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case "percent":
      return (
        <svg {...commonProps}>
          <line x1="19" x2="5" y1="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      );
    case "help-circle":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "lock":
      return (
        <svg {...commonProps}>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      );
  }
}

export default function PanduanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<GuideTopic | null>(null);

  // Filter topics based on search input
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return TOPICS;
    const q = searchQuery.toLowerCase();
    return TOPICS.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        topic.shortDesc.toLowerCase().includes(q) ||
        topic.articles.some(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.steps.some((s) => s.toLowerCase().includes(q))
        )
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* 1. Header / Navbar (Clean White + Subtle Border) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group" title="SakuNota - Beranda">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota"
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Fitur
            </Link>
            <Link href="/tentang" className="hover:text-blue-600 transition-colors">
              Tentang
            </Link>
            <Link href="/?beli=true" className="hover:text-blue-600 transition-colors">
              Harga
            </Link>
            <Link href="/panduan" className="text-blue-600 font-bold transition-colors">
              Panduan
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <Link
              href="/pos?demo=true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition-all"
            >
              Coba Demo Kasir
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

      {/* 2. Main Hero Title & Search */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-16 sm:pb-24">
        {/* Title Section matching Sentrik POS layout */}
        <div className="max-w-3xl mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Panduan
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Jelajahi panduan penggunaan fitur SakuNota dan temukan solusi operasional kasir Anda.
          </p>

          {/* Search Box */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik atau panduan (contoh: printer, meja, shift, lisensi)..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-xs text-slate-500">
                Menampilkan hasil untuk: &quot;<strong>{searchQuery}</strong>&quot; ({filteredTopics.length} topik ditemukan)
              </p>
            )}
          </div>
        </div>

        {/* 3. Cards Grid: 3 Columns Desktop, 2 Tablet, 1 Mobile (Exact Sentrik POS Reference Pattern) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedTopic(topic);
                }
              }}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Icon Badge & Arrow */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-lime-50 text-lime-700 border border-lime-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                    <TopicIcon type={topic.iconType} />
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                    →
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {topic.title}
                </h2>

                {/* Short Description */}
                <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {topic.shortDesc}
                </p>
              </div>

              {/* Bottom: Article Count */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {topic.articles.length} PANDUAN
                </span>
                <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Buka Pelajari →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State when search has no match */}
        {filteredTopics.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200 p-8 space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Tidak ada topik yang sesuai dengan &quot;{searchQuery}&quot;
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Coba gunakan kata kunci lain seperti &quot;printer&quot;, &quot;meja&quot;, &quot;lisensi&quot;, atau &quot;stok&quot;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Tampilkan Semua Topik
            </button>
          </div>
        )}
      </main>

      {/* 4. Interactive Article Modal / Drawer */}
      {selectedTopic && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedTopic(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-50 text-lime-700 border border-lime-200/60 flex items-center justify-center">
                  <TopicIcon type={selectedTopic.iconType} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedTopic.title}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedTopic.articles.length} PANDUAN LANGKAH DEMI LANGKAH
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
                title="Tutup"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: List of Articles */}
            <div className="p-6 overflow-y-auto space-y-6 divide-y divide-slate-100">
              {selectedTopic.articles.map((article, idx) => (
                <div key={idx} className={idx > 0 ? "pt-6" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-900">
                      {idx + 1}. {article.title}
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {article.summary}
                  </p>

                  {/* Steps */}
                  <div className="mt-3.5 bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                      Langkah Pengerjaan:
                    </span>
                    <ol className="space-y-1.5 text-xs text-slate-700">
                      {article.steps.map((st, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="leading-relaxed">{st}</span>
                        </li>
                      ))}
                    </ol>

                    {article.tips && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start gap-2 text-[11px] text-emerald-800">
                        <span className="font-bold">💡 Tips:</span>
                        <span>{article.tips}</span>
                      </div>
                    )}
                  </div>

                  {/* Direct Link Button */}
                  {article.targetHref && (
                    <div className="mt-3 flex items-center justify-end">
                      <Link
                        href={article.targetHref}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
                      >
                        <span>{article.targetLabel || "Buka Halaman Terkait"}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Butuh panduan langsung?
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-blue-600 text-xs font-bold transition-all"
                >
                  Tanya WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modern Dark Footer (Matching Reference Screenshot) */}
      <footer className="mt-auto bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
            {/* Col 1: Brand Info (Spans 2 columns on lg) */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2 group">
                <img
                  src="/logo-sakunota.png"
                  alt="SakuNota"
                  className="h-8 w-auto object-contain brightness-0 invert"
                />
              </Link>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                Aplikasi kasir modern untuk UMKM, angkringan, kafe, dan retail. 100% jalan offline tanpa biaya langganan bulanan.
              </p>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Produk
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/pos" className="hover:text-white transition-colors">
                    Kasir POS
                  </Link>
                </li>
                <li>
                  <Link href="/admin/menu" className="hover:text-white transition-colors">
                    Kelola Menu
                  </Link>
                </li>
                <li>
                  <Link href="/admin/meja" className="hover:text-white transition-colors">
                    Manajemen Meja
                  </Link>
                </li>
                <li>
                  <Link href="/admin/pengaturan/printer" className="hover:text-white transition-colors">
                    Printer Bluetooth
                  </Link>
                </li>
                <li>
                  <Link href="/pos?demo=true" className="hover:text-white transition-colors">
                    Coba Demo Kasir
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Perusahaan
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/tentang" className="hover:text-white transition-colors">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="/tentang#cerita" className="hover:text-white transition-colors">
                    Cerita Kami
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Support */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Bantuan
              </h3>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link href="/panduan" className="hover:text-white transition-colors">
                    Pusat Panduan
                  </Link>
                </li>
                <li>
                  <Link href="/?aktivasi=true" className="hover:text-white transition-colors">
                    Aktivasi Lisensi
                  </Link>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Kontak Bantuan
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Legal Links */}
          <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              © 2026 SakuNota. Hak cipta dilindungi.
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="hover:text-slate-300 transition-colors">
                Privasi
              </Link>
              <Link href="/terms" className="hover:text-slate-300 transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
