// Panduan penggunaan untuk pemilik usaha dan kasir.
export const GUIDE_TOPICS = [
  {
    "id": "license-security-update",
    "title": "Pembaruan Lisensi & Batas Demo",
    "shortDesc": "Tetap satu perangkat satu lisensi, dengan data toko lokal.",
    "iconType": "shield",
    "articles": [
      {
        "title": "Memperbarui aktivasi lama",
        "summary": "Pembeli lama tidak perlu membeli ulang.",
        "steps": [
          "Buka SakuNota di perangkat dan browser asal yang sudah diaktifkan.",
          "Sambungkan internet satu kali setelah pembaruan keamanan. Aplikasi memperbarui bukti lisensi yang sah.",
          "Jika koneksi terputus, coba kembali dari perangkat yang sama. Jangan hapus data situs atau browser.",
          "Setelah pembaruan berhasil, lisensi berbayar tetap dapat dipakai offline. Trial dan tester mengikuti masa berlaku yang disetujui.",
          "Untuk berpindah perangkat, hubungi dukungan untuk melepas ikatan perangkat lama, lalu aktifkan dan pulihkan backup di perangkat pengganti."
        ],
        "tips": "Backup toko membawa transaksi dan foto, bukan kunci aktivasi perangkat atau PIN Admin."
      },
      {
        "title": "Batas penggunaan demo",
        "summary": "Demo untuk latihan selama 30 menit dan maksimal 50 transaksi per sesi.",
        "steps": [
          "Pilih Coba Demo Kasir. Penanda demo tetap terlihat pada alamat dan banner.",
          "Data latihan terpisah dari data toko asli. Struk demo ditandai sebagai simulasi.",
          "Backup usaha tidak dapat dipulihkan ke dalam demo.",
          "Setelah batas waktu atau transaksi tercapai, keluar dari demo. Sesi demo baru memakai data contoh yang di-reset.",
          "Gunakan trial yang disetujui atau lisensi resmi untuk operasional usaha."
        ]
      }
    ]
  },
  {
    "id": "cashier-workspace",
    "title": "Kasir & Akses Karyawan",
    "shortDesc": "Menu depan untuk berjualan; pengelolaan usaha melalui PIN Admin.",
    "iconType": "package",
    "articles": [
      {
        "title": "Panduan singkat saat pertama masuk",
        "summary": "Tersedia untuk demo, trial, tester, dan lisensi aktif.",
        "steps": [
          "Saat pertama membuka kasir, pilih Mulai Panduan untuk mengikuti buka shift, memilih produk, memeriksa keranjang, pembayaran, dan struk.",
          "Ikuti bagian yang disorot. Selama panduan, hanya tombol dan isian pada langkah aktif yang bisa digunakan. Menu lain dikunci.",
          "Pilih varian atau tambahan jika diminta. Panduan berpindah setelah tindakan berhasil, misalnya shift tersimpan atau produk masuk keranjang.",
          "Pilih Lewati kapan saja untuk keluar dari panduan dan menggunakan seluruh menu. Menekan Escape hanya mengarahkan ke tombol Lewati.",
          "Setelah Lewati atau Selesai, panduan tidak muncul otomatis lagi pada browser/perangkat yang sama, termasuk saat berpindah dari demo ke lisensi.",
          "Untuk belajar lagi, pilih Panduan Singkat pada header desktop atau menu Shift Saya/Lainnya di HP. Gunakan Pindahkan Petunjuk jika panel menutupi kontrol."
        ],
        "tips": "Pembayaran demo hanya simulasi. Pada toko berlisensi, konfirmasi pembayaran mencatat transaksi usaha. Pilih Lewati jika belum ingin bertransaksi. Pilihan panduan dapat hilang jika data browser dihapus atau perangkat diganti.",
        "targetHref": "/pos",
        "targetLabel": "Buka kasir"
      },
      {
        "title": "Menggunakan layar kasir",
        "summary": "Kasir, Menu, Pesanan, dan Shift Saya memakai keranjang serta data shift yang sama.",
        "steps": [
          "Buka Shift Saya atau ketuk status shift pada header atas untuk mengisi nama kasir dan modal awal.",
          "Pada HP, layar kasir langsung membuka Katalog Menu; ketuk produk atau pindai barcode untuk menambah ke nota belanja.",
          "Keranjang belanja dapat dibuka lewat bar ringkasan di bawah pada HP tegak, atau langsung berdampingan pada layar desktop dan HP miring.",
          "Periksa jumlah pesanan, diskon, dan terima pembayaran dengan metode Tunai, QRIS, atau Transfer.",
          "Pesanan menampilkan tagihan belum lunas serta transaksi pada shift aktif. Riwayat lengkap berada di Admin.",
          "Pengelolaan produk, stok, laporan lengkap, backup dan keamanan melalui tombol Admin dan PIN pemilik. Kembali ke kasir mengunci sesi Admin."
        ],
        "targetHref": "/pos",
        "targetLabel": "Buka kasir"
      }
    ]
  },
  {
    "id": "product-photos",
    "title": "Foto & Pemindahan Produk",
    "shortDesc": "Foto opsional yang tetap tersedia offline dan ikut file produk lengkap.",
    "iconType": "package",
    "articles": [
      {
        "title": "Menambahkan foto produk",
        "summary": "Produk tanpa foto tetap memakai ikon kategori.",
        "steps": [
          "Masuk Admin → Katalog & Stok → Produk.",
          "Tambah atau edit produk, lalu pilih Foto Produk (opsional). Gunakan JPG, PNG, atau WebP.",
          "Tunggu kompresi selesai lalu simpan. Foto tersimpan pada perangkat dan tetap dapat ditampilkan tanpa internet.",
          "Gunakan Hapus Foto bila ingin kembali memakai ikon kategori."
        ],
        "targetHref": "/admin/menu",
        "targetLabel": "Kelola foto produk"
      },
      {
        "title": "Ekspor dan impor beserta foto",
        "summary": "Excel/CSV untuk data produk; JSON Produk Lengkap membawa isi foto juga.",
        "steps": [
          "Gunakan Export Produk + Foto (.json) untuk memindahkan data produk, foto, dan pilihan tambahan.",
          "Pada perangkat tujuan, buka Import Excel / CSV / JSON, pilih file JSON, periksa hasil analisis dan mode impor, lalu konfirmasi impor.",
          "Impor Excel/CSV tidak membaca gambar yang ditempel di spreadsheet dan tidak menghapus foto produk yang sudah ada.",
          "Saldo stok produk baru dari JSON dicatat sebagai stok awal. Saldo produk yang sudah dipantau tidak ditimpa; gunakan Persediaan & Opname untuk koreksi stok.",
          "Untuk pindah seluruh toko beserta transaksi, gunakan cadangan lengkap melalui Pemeliharaan Data. Aktivasi lisensi pada perangkat pengganti tetap merupakan proses terpisah."
        ],
        "tips": "Foto produk ikut tersimpan dalam file produk lengkap."
      }
    ]
  },
  {
    "id": "waiter-floor",
    "title": "Waiter Floor",
    "shortDesc": "Meja tugas dan pencatatan pesanan pelayan pada perangkat kasir.",
    "iconType": "package",
    "articles": [
      {
        "title": "Membuka mode pelayan",
        "summary": "Pelayan mencatat pesanan; pembayaran tetap dilakukan kasir.",
        "steps": [
          "Aktifkan mode meja pada profil usaha, siapkan meja, dan buka shift kasir.",
          "Admin → Pengaturan POS → Waiter Floor. Isi nama pelayan dan pilih meja tugas.",
          "Mulai Mode Pelayan. Pilih meja, menu, varian, jumlah dan catatan; lalu Kirim Pesanan ke Kasir.",
          "Pesanan menjadi tagihan belum dibayar di kasir. Pembayaran, refund dan laporan tidak tersedia pada layar pelayan.",
          "Keluar Mode Pelayan membutuhkan PIN Admin. Versi ini menggunakan perangkat/browser yang sama dengan kasir."
        ],
        "targetHref": "/admin/pelayan",
        "targetLabel": "Atur Waiter Floor"
      }
    ]
  },
  {
    "id": "table-floor-plan",
    "title": "Denah Meja Visual & Layout Ruang",
    "shortDesc": "Bentuk meja visual, zona ruangan, dan tata letak spasial 2D.",
    "iconType": "utensils",
    "articles": [
      {
        "title": "Mengatur bentuk meja dan zona ruangan",
        "summary": "Cocok untuk usaha tanpa nomor meja angka yang mengandalkan nama area atau fisik ruangan.",
        "steps": [
          "Buka Admin → Kelola Meja.",
          "Pilih Tambah Meja atau klik Ubah pada meja yang sudah ada.",
          "Beri nama meja sesuai fisik ruangan (maksimal 25 karakter), misalnya: Sofa Jendela VIP, Saung Bambu 1, Bar Seat 1, atau Meja Bundar Tengah.",
          "Pilih Bentuk Meja Visual: Kotak (standar), Bundar (keluarga), Panjang/Sofa (komunal), Bar Stool (kursi tinggi), atau Lesehan (alas karpet).",
          "Tentukan Zona Ruangan (Ruang Utama, Outdoor/Teras, Saung & Lesehan, Bar Counter, VIP Room) dan Kapasitas Kursi.",
          "Simpan meja. Kasir dan pelayan dapat memfilter meja berdasarkan zona ruangan untuk operasional yang lebih cepat."
        ],
        "targetHref": "/admin/meja",
        "targetLabel": "Kelola denah meja"
      },
      {
        "title": "Melihat denah visual 2D dan operasional meja",
        "summary": "Peralihan antara tampilan kartu daftar dan denah visual ruangan spasial.",
        "steps": [
          "Pada halaman Admin → Kelola Meja, gunakan tombol peralihan di atas: Daftar Kartu atau Denah Visual 2D.",
          "Mode Denah Visual 2D menampilkan meja di dalam kotak zona ruangan fisik lengkap dengan bentuk fisiknya dan indikator status warna: Kosong (abu-abu), Terisi (merah), dan Tagihan Lunas (kuning/hijau).",
          "Pada layar Kasir POS, tab zona memudahkan kasir melihat meja yang sedang terisi serta nominal pesanan yang berjalan.",
          "Setelah pelanggan selesai membayar dan meja dibersihkan, tekan Lepas Meja agar meja kembali berstatus Kosong."
        ],
        "targetHref": "/pos",
        "targetLabel": "Buka kasir meja"
      }
    ]
  },
  {
    "id": "getting-started",
    "title": "Mulai & Pilih Jenis Usaha",
    "shortDesc": "Aktivasi, demo terpisah, serta alur retail dan restoran.",
    "iconType": "rocket",
    "articles": [
      {
        "title": "Pilih alur sesuai usaha (Restoran vs Warung & Retail)",
        "summary": "Jenis usaha dapat diganti tanpa menghapus data toko.",
        "steps": [
          "Buka Admin → Pengaturan → Profil Usaha & Struk.",
          "Pilih salah satu jenis usaha: Warung & UMKM, Restoran, Kafe, atau Toko & Retail.",
          "Isi Nama Usaha / Toko (maksimal 25 karakter agar pas di judul struk huruf ganda tanpa terpotong).",
          "Untuk Warung dan Retail, sistem otomatis menonaktifkan alur meja dan Dine-in, mengaktifkan Kasir Langsung cepat (Direct Checkout), dan struk tercetak bersih tanpa label nomor meja.",
          "Untuk Restoran dan Kafe, sistem menyediakan manajemen meja lengkap, denah visual 2D, pemindahan meja, dan fitur kirim pesanan pelayan (Waiter Floor).",
          "Simpan profil. Untuk menghitung stok retail, buka Katalog & Stok → Persediaan & Opname dan aktifkan stok per produk."
        ],
        "targetHref": "/admin/pengaturan/profil",
        "targetLabel": "Atur jenis usaha"
      },
      {
        "title": "Preset contoh 4 jenis usaha",
        "summary": "Tersedia data latihan siap pakai untuk Warung, Restoran, Kafe, dan Toko Retail.",
        "steps": [
          "Buka Admin → Data & Cadangan, lalu gulir ke bagian Contoh Data Usaha.",
          "Pilih salah satu dari 4 paket: Warung & UMKM (kasir cepat), Restoran (menu lengkap & meja), Kafe (minuman & bar seat), atau Retail (barcode EAN & stok satuan).",
          "Konfirmasi pemuatan. Data contoh menu, denah meja visual, dan profil usaha langsung terpasang.",
          "Pada mode Demo Kasir, Anda juga dapat berpindah preset secara instan melalui switcher di banner atas kasir.",
          "Seluruh 4 jenis usaha ini sama-sama dapat digunakan dalam lisensi tunggal Rp50.000 seumur hidup tanpa biaya langganan bulanan."
        ],
        "targetHref": "/admin/pengaturan/data",
        "targetLabel": "Pilih preset usaha"
      },
      {
        "title": "Aktivasi lisensi dan trial",
        "summary": "Aktivasi pertama membutuhkan internet; trial dimulai setelah aktivasi perangkat.",
        "steps": [
          "Buka halaman utama dan pilih Aktivasi Kode.",
          "Masukkan kode lisensi resmi, tester, atau trial yang sudah disetujui.",
          "Aktifkan pada perangkat kasir yang akan digunakan. Satu lisensi terikat satu perangkat.",
          "Trial beta berlaku tujuh hari sejak aktivasi pertama. Untuk pindah perangkat, hubungi pengelola SakuNota."
        ],
        "targetHref": "/?aktivasi=true",
        "targetLabel": "Aktivasi kode"
      },
      {
        "title": "Mencoba demo dengan aman",
        "summary": "Data latihan disimpan terpisah dari database toko.",
        "steps": [
          "Pilih Coba Demo Kasir pada halaman utama.",
          "Coba buka shift, tambah pesanan, dan bayar menggunakan metode pencatatan yang tersedia.",
          "Pembayaran kasir demo hanya simulasi pencatatan dan tidak memindahkan uang.",
          "Gunakan Keluar Demo sebelum kembali ke operasional toko."
        ],
        "targetHref": "/pos?demo=true",
        "targetLabel": "Buka demo"
      }
    ]
  },
  {
    "id": "barcode",
    "title": "Scan Barcode & SKU",
    "shortDesc": "Daftarkan barcode lalu pindai dengan kamera atau scanner fisik.",
    "iconType": "package",
    "articles": [
      {
        "title": "Mendaftarkan barcode produk",
        "summary": "Barcode harus cocok dengan SKU dalam katalog.",
        "steps": [
          "Buka Admin → Katalog, lalu tambah atau edit produk.",
          "Isi kolom SKU / barcode. Bisa ketik angka atau gunakan tombol pindai kamera.",
          "Gunakan satu kode unik untuk satu produk. Jangan menghapus angka nol di awal barcode.",
          "Isi nama, harga, kategori, lalu simpan."
        ],
        "targetHref": "/admin/menu",
        "targetLabel": "Kelola barcode produk"
      },
      {
        "title": "Scan memakai USB atau Bluetooth HID",
        "summary": "Scanner harus bekerja sebagai keyboard dan mengirim Enter setelah kode.",
        "steps": [
          "Hubungkan scanner USB melalui perangkat/OTG yang kompatibel atau pasangkan Bluetooth dalam mode HID.",
          "Buka layar Kasir dan pastikan tidak sedang mengisi formulir lain.",
          "Pindai produk yang sudah memiliki SKU. Scanner mengirim kode lalu Enter.",
          "Periksa produk, jumlah, dan harga dalam keranjang sebelum pembayaran."
        ],
        "tips": "Barcode tidak ditemukan: periksa SKU, angka nol awal, dan pengaturan suffix Enter pada scanner.",
        "targetHref": "/pos",
        "targetLabel": "Buka kasir"
      },
      {
        "title": "Scan memakai kamera HP",
        "summary": "Dukungan kamera barcode mengikuti kemampuan browser dan perangkat.",
        "steps": [
          "Tekan tombol scan barcode di kasir.",
          "Izinkan kamera pada browser saat diminta.",
          "Arahkan kamera ke barcode dalam cahaya cukup dan tunggu produk ditemukan.",
          "Jika BarcodeDetector tidak didukung atau kamera gagal, masukkan kode secara manual di dialog yang sama."
        ],
        "tips": "Gunakan HTTPS atau localhost. Pada perangkat yang tidak mendukung pemindaian kamera, gunakan scanner HID atau input kode manual."
      }
    ]
  },
  {
    "id": "products-catalog",
    "title": "Katalog & Varian",
    "shortDesc": "Kelola produk, harga, SKU, kategori, dan tambahan.",
    "iconType": "package",
    "articles": [
      {
        "title": "Tambah dan ubah produk & batas karakter",
        "summary": "Siapkan katalog sesuai barang atau menu yang dijual.",
        "steps": [
          "Buka Admin → Katalog.",
          "Tambahkan Nama Produk (dibatasi maksimal 50 karakter agar pas di kartu menu dan tidak meluber di kertas struk thermal 58mm).",
          "Pilih kategori, isi harga jual, serta barcode / SKU bila tersedia.",
          "Untuk makanan atau minuman, tambahkan kelompok varian dan pilihan tambahan bila diperlukan.",
          "Simpan lalu periksa produk di layar kasir."
        ],
        "targetHref": "/admin/menu",
        "targetLabel": "Buka katalog"
      }
    ]
  },
  {
    "id": "inventory-management",
    "title": "Stok Retail, Supplier & Opname",
    "shortDesc": "Stok awal, barang masuk dari supplier, HPP, barang keluar, dan opname fisik.",
    "iconType": "layers",
    "articles": [
      {
        "title": "Mengatur HPP produk untuk laporan laba",
        "summary": "HPP adalah modal dasar untuk satu porsi atau unit yang dijual.",
        "steps": [
          "Buka Admin → Katalog & Stok → Produk, lalu Tambah atau Edit produk.",
          "Isi HPP / Modal per Unit (Rp) dengan biaya satu porsi/unit, lalu simpan.",
          "Kosong berarti HPP belum diketahui. Nilai 0 berarti biaya memang nol; jangan mengisi 0 hanya untuk menghilangkan peringatan HPP.",
          "Setiap transaksi baru menyimpan modal produk saat penjualan. Perubahan HPP produk tidak mengubah modal pada transaksi lama.",
          "Periksa cakupan HPP dan laba kotor pada Dashboard."
        ],
        "tips": "Harga beli pada mutasi barang masuk adalah catatan pembelian. Atur HPP produk secara terpisah; aplikasi tidak menghitung resep atau rata-rata modal otomatis.",
        "targetHref": "/admin/menu",
        "targetLabel": "Atur HPP produk"
      },
      {
        "title": "Mengaktifkan stok per produk",
        "summary": "Produk lama tetap dapat dijual sampai penghitungan stok diaktifkan.",
        "steps": [
          "Tambahkan produk di katalog, lalu buka Admin → Stok & Opname.",
          "Pilih Aktifkan stok pada produk.",
          "Hitung stok fisik dan isi stok awal, batas minimum, serta satuan.",
          "Simpan. Pesanan baru yang tersimpan langsung mengurangi stok, termasuk tagihan belum dibayar. Pembayaran lanjutan tidak memotong stok lagi."
        ],
        "targetHref": "/admin/menu?tab=stock",
        "targetLabel": "Kelola stok"
      },
      {
        "title": "Barang masuk dari supplier & pencatatan HPP",
        "summary": "Catat pasokan barang dari supplier lengkap dengan harga beli satuan dan opsi pembukuan otomatis.",
        "steps": [
          "Cari nama atau barcode produk pada Stok & Opname, lalu tekan + Barang Masuk.",
          "Masukkan jumlah barang/unit yang diterima.",
          "Isi Nama Pemasok / Supplier (contoh: Toko Grosir Berkah, PT Sumber Pangan, Pasar Induk).",
          "Isi Harga Beli Satuan (HPP). Sistem otomatis mengalikan total nilai belanja.",
          "Centang opsi \"Catat otomatis sebagai Kas Keluar Operasional\" agar belanja bahan otomatis tercatat di buku kas laci toko.",
          "Simpan mutasi stok. Persediaan bertambah dan mutasi tercatat rapi di riwayat stok lengkap dengan nama supplier dan harga belinya."
        ],
        "tips": "Refund uang tidak otomatis berarti barang kembali layak jual. Catat barang retur melalui Barang masuk setelah diperiksa fisik."
      },
      {
        "title": "Melakukan stok opname fisik",
        "summary": "Hitung barang fisik lalu simpan penyesuaian dan alasannya.",
        "steps": [
          "Hentikan sementara transaksi produk yang akan dihitung.",
          "Pilih Stok opname dan isi jumlah fisik, termasuk nol jika benar-benar habis.",
          "Isi alasan atau referensi penghitungan, lalu simpan.",
          "Jika stok berubah selama formulir terbuka, aplikasi menolak penyimpanan. Muat ulang dan hitung kembali.",
          "Periksa saldo dan selisih pada Riwayat pergerakan."
        ],
        "tips": "Modul ini menghitung unit barang jadi secara offline dan aman di IndexedDB perangkat."
      }
    ]
  },
  {
    "id": "pos-checkout",
    "title": "Pesanan, Pembayaran & Kasbon",
    "shortDesc": "Tunai, QRIS/transfer, tagihan meja, split bill, dan buku kasbon pelanggan.",
    "iconType": "cart",
    "articles": [
      {
        "title": "Mencatat penjualan kasir",
        "summary": "Buka shift, pilih produk, lalu catat pembayaran.",
        "steps": [
          "Buka Kasir → Buka Shift dan isi nama kasir serta modal awal.",
          "Pilih produk atau scan barcode, periksa jumlah dan tambahan.",
          "Untuk restoran, simpan pesanan ke meja bila pelanggan membayar belakangan.",
          "Pilih pembayaran tunai, QRIS, atau transfer. Untuk tunai masukkan uang diterima dan periksa kembalian.",
          "Selesaikan pembayaran dan cetak struk bila printer tersedia."
        ],
        "targetHref": "/pos",
        "targetLabel": "Buka kasir"
      },
      {
        "title": "Buku pelanggan & catatan kasbon (piutang)",
        "summary": "Catat transaksi kasbon / bayar nanti untuk pelanggan tetap, pantau sisa piutang, dan terima cicilan.",
        "steps": [
          "Pada saat checkout di kasir POS, pilih metode pembayaran \"Kasbon\".",
          "Ketik Nama Pelanggan (wajib) dan Nomor WhatsApp / HP (opsional).",
          "Tekan Simpan Kasbon. Pesanan tersimpan sebagai tagihan belum lunas dan stok produk langsung terpotong.",
          "Untuk melihat seluruh daftar kasbon pelanggan, buka Admin → Riwayat Transaksi → Tab Buku Kasbon.",
          "Admin dapat melihat total sisa tagihan per pelanggan, rincian nota, serta mengirim rekapan tagihan langsung ke WhatsApp pelanggan dalam 1 klik.",
          "Tekan + Bayar / Cicil untuk mencatat pembayaran pelunasan atau cicilan bertahap dengan Tunai, QRIS, atau Transfer Bank."
        ],
        "targetHref": "/admin/transaksi",
        "targetLabel": "Buka buku kasbon"
      },
      {
        "title": "Tampilan kasir fleksibel & keranjang mobile responsif",
        "summary": "Tarik pembatas nota, atur tinggi sheet mobile, dan sesuaikan kerapatan tombol menu agar pas di segala ukuran layar.",
        "steps": [
          "Pada layar monitor PC/laptop kasir, tahan dan geser garis pembatas vertikal antara katalog menu dan nota belanja ke kiri atau kanan (280px hingga 650px, klik 2x untuk reset ke 380px).",
          "Ukuran teks dan tombol nota di PC membesar otomatis secara proporsional saat ditarik melebar.",
          "Gunakan tombol kerapatan [S] Padat, [M] Standar, atau [L] Besar di bilah pencarian untuk mengatur ukuran kartu menu katalog.",
          "Di HP mode portrait (berdiri), atur tinggi keranjang sesuka Anda lewat tombol [60% Kompak], [82% Nyaman] (standar baru), atau [96% Penuh], serta gunakan gestur geser naik/turun.",
          "Ubah ukuran tombol nota kasir mobile antara [Normal] (36px) atau [Jumbo Ramah Jari] (44px) agar nyaman disentuh jempol tanpa salah pencet.",
          "Gunakan tombol tong sampah merah di tiap baris pesanan untuk menghapus item secara instan tanpa perlu menekan tombol minus berkali-kali.",
          "Nama Pelanggan dan Kasir dibatasi maksimal 30 karakter agar nota rapi."
        ],
        "tips": "Ukuran yang Anda atur tersimpan otomatis di perangkat dan tidak akan reset saat aplikasi ditutup atau dibuka kembali.",
        "targetHref": "/pos",
        "targetLabel": "Coba di kasir"
      }
    ]
  },
  {
    "id": "refund-ledger",
    "title": "Refund & Pembatalan Nota",
    "shortDesc": "Sisa tagihan, kas shift, dan catatan pengembalian dana.",
    "iconType": "file-text",
    "articles": [
      {
        "title": "Memeriksa pembayaran setelah refund",
        "summary": "Pengembalian dana dan pembatalan nota adalah tindakan yang berbeda.",
        "steps": [
          "Buka pembayaran nota melalui Bayar / Split Bill, lalu periksa catatan pembayarannya.",
          "Gunakan Refund pada catatan pembayaran yang tersedia, masukkan alasan dan PIN Admin, lalu konfirmasi nominal yang ditampilkan.",
          "Periksa kembali dana yang masih diterima dan sisa tagihan. Pengembalian dana dapat membuka kembali tagihan.",
          "Untuk membatalkan seluruh nota, gunakan tindakan Void melalui Admin → Transaksi. Pilih pengembalian uang hanya jika dana memang dikembalikan.",
          "Periksa arus refund pada periode/shift saat uang keluar. Laporan shift yang sudah ditutup tetap tersimpan. Pengembalian uang berikutnya dicatat pada shift saat uang dikembalikan."
        ],
        "tips": "Refund uang tidak mengembalikan stok secara otomatis. Periksa barang fisik sebelum mencatat barang masuk.",
        "targetHref": "/admin/transaksi",
        "targetLabel": "Buka transaksi"
      }
    ]
  },
  {
    "id": "shift",
    "title": "Shift, Biaya & Estimasi Laba Bersih",
    "shortDesc": "Kas awal, pengeluaran operasional, Z-Report, dan estimasi laba bersih toko.",
    "iconType": "file-text",
    "articles": [
      {
        "title": "Tutup shift dengan hitungan fisik",
        "summary": "Selisih baru ditampilkan setelah penutupan disimpan.",
        "steps": [
          "Catat seluruh kas masuk dan keluar beserta alasannya selama shift.",
          "Pilih Tutup Shift dari kasir.",
          "Hitung uang kertas dan koin di laci, lalu masukkan jumlah fisik.",
          "Simpan penutupan. Aplikasi menghitung kas seharusnya dan menampilkan selisih.",
          "Periksa atau cetak Z-Report; laporan lengkap berada di Admin → Shift & Kas Laci."
        ],
        "tips": "Kas seharusnya = modal awal + penjualan tunai − refund tunai + kas masuk − kas keluar. QRIS/transfer tidak menambah uang laci."
      },
      {
        "title": "Kas keluar, pengeluaran biaya & estimasi laba bersih",
        "summary": "Catat belanja bahan baku, operasional harian, dan pantau estimasi laba bersih usaha.",
        "steps": [
          "Buka Admin → Shift & Kas Laci → Tab Kas & Biaya Operasional atau ketuk tombol Arus Kas di kasir POS.",
          "Pilih Kas Keluar (Pengeluaran) atau Kas Masuk (Penambahan Modal).",
          "Pilih kategori biaya: Bahan Baku & Dapur, Perlengkapan & Kemasan, Operasional & Utilitas, Gaji/Upah Harian, atau Lainnya.",
          "Pilih Sumber Dana: Kas Fisik Laci (memotong uang laci kasir saat tutup shift) atau Rekening Toko (transfer/modal luar).",
          "Ketik nominal uang dan keterangan, atau gunakan tombol pilihan cepat (Es Batu, Gas LPG, Plastik, Air Galon, Parkir, Belanja Pasar, Bensin).",
          "Simpan pencatatan. Kartu Ringkasan Keuangan langsung menghitung Estimasi Laba Bersih Operasional = Total Omzet Penjualan - Total Pengeluaran Biaya Toko."
        ],
        "targetHref": "/admin/shift",
        "targetLabel": "Buka arus kas & laba"
      }
    ]
  },
  {
    "id": "reports",
    "title": "Ringkasan Usaha & Laporan",
    "shortDesc": "Pantau penjualan, modal, laba kotor, dan uang yang diterima.",
    "iconType": "chart",
    "articles": [
      {
        "title": "Membaca Ringkasan dan Analitik",
        "summary": "Pisahkan penjualan, penerimaan uang, dan laba saat membaca laporan.",
        "steps": [
          "Buka Admin → Dashboard, lalu pilih tab Ringkasan atau Analitik.",
          "Pilih periode Hari ini, Kemarin, 7 Hari, 30 Hari, atau Bulan Ini.",
          "Pada Ringkasan, periksa Penjualan Bersih, jumlah transaksi, Laba Kotor, serta penerimaan pembayaran.",
          "Penjualan dan penerimaan dapat berbeda karena uang muka, tagihan belum lunas, pelunasan nota lama, atau refund.",
          "Gunakan grafik Garis atau Batang. Lihat tanggal di bawah grafik dan skala rupiah di sebelah kiri. Arahkan kursor atau sentuh titik yang ingin diperiksa; kotak rincian mengikuti data yang dipilih.",
          "Pada Analitik, periksa perincian kategori, arus kas, Distribusi Jam Sibuk, serta Kecepatan Perputaran Menu."
        ],
        "tips": "Jika ada penanda Sebagian Tanpa HPP, data modal belum lengkap. Laba kotor bukan laba bersih setelah seluruh biaya usaha.",
        "targetHref": "/admin",
        "targetLabel": "Buka dashboard"
      },
      {
        "title": "Mencocokkan pembayaran dan pengembalian uang",
        "summary": "Cocokkan penjualan dengan uang yang diterima dan pengembalian uang.",
        "steps": [
          "Periksa penanda kecocokan catatan transaksi pada Ringkasan Usaha. Jika ada selisih, periksa penjualan, pembayaran, dan pengembalian uangnya.",
          "Bandingkan penerimaan bruto, refund pembayaran, dan penerimaan netto untuk masing-masing metode.",
          "Pembayaran tunai dan refund tunai memengaruhi kas fisik; QRIS dan transfer diperiksa pada metode masing-masing.",
          "Periksa nota belum lunas, pembayaran lintas tanggal, dan data refund ketika ada selisih.",
          "Laporan memakai modal yang tercatat saat penjualan. Transaksi lama yang belum memiliki catatan modal tetap ditandai belum lengkap meskipun HPP produk sudah diisi sekarang."
        ],
        "tips": "Tetap cocokkan laporan dengan uang di laci, saldo bank, dan bukti pembayaran.",
        "targetHref": "/admin",
        "targetLabel": "Periksa analitik"
      },
      {
        "title": "Membagikan ringkasan laporan",
        "summary": "Buat laporan teks atau gambar dari periode dashboard yang dipilih.",
        "steps": [
          "Pilih periode yang ingin dilaporkan pada dashboard.",
          "Buka laporan WhatsApp, lalu periksa ringkasan sebelum membagikannya.",
          "Gunakan Salin Teks atau Buka WhatsApp untuk laporan teks.",
          "Gunakan Bagikan Gambar atau Unduh Gambar untuk menyimpan atau mengirim ringkasan gambar melalui fasilitas perangkat."
        ],
        "tips": "Data laporan berasal dari perangkat toko ini. Periksa periode dan isinya sebelum dikirim."
      }
    ]
  },
  {
    "id": "hardware",
    "title": "Printer, Struk & Label Cup",
    "shortDesc": "Struk 58/80 mm, label pesanan, cetak ulang, dan uji printer.",
    "iconType": "printer",
    "articles": [
      {
        "title": "Menyiapkan printer struk",
        "summary": "Pengaturan printer struk dan printer label dipisahkan.",
        "steps": [
          "Buka Admin → Pengaturan → Printer.",
          "Untuk struk kasir, pilih kertas 58 mm atau 80 mm dan sesuaikan bagian atas dan bawah struk, serta informasi yang ditampilkan.",
          "Pada aplikasi Android, pasangkan printer Bluetooth struk lalu pilih printer kasir yang sesuai.",
          "Pada browser atau aplikasi web, gunakan dialog printer sistem dan driver yang tersedia pada perangkat.",
          "Gunakan Pratinjau Struk dan Tes Cetak Struk sebelum dipakai saat toko ramai."
        ],
        "tips": "Printer label memakai pengaturan tersendiri. Mengganti target label tidak mengganti printer struk.",
        "targetHref": "/admin/pengaturan/printer",
        "targetLabel": "Atur printer"
      },
      {
        "title": "Mengaktifkan Label Pesanan untuk cup",
        "summary": "Cetak satu stiker untuk setiap unit minuman atau item yang dipilih.",
        "steps": [
          "Buka Admin → Pengaturan → Printer → bagian Label Pesanan.",
          "Aktifkan label, pilih 40 × 30 mm, 50 × 30 mm, atau isi lebar dan tinggi khusus.",
          "Pilih Semua kategori atau kategori tertentu, misalnya Minuman.",
          "Untuk browser atau aplikasi web, pilih Dialog printer sistem. Printer USB/LAN yang tersedia lewat driver sistem dipilih di dialog cetak, bukan melalui koneksi langsung dari aplikasi.",
          "Pada aplikasi Android, pasangkan printer label lewat Bluetooth, lalu pilih printer tersebut pada pengaturan Label Pesanan.",
          "Tekan Simpan Label, periksa Pratinjau Label, lalu Tes Cetak Label pada perangkat yang akan dipakai."
        ],
        "tips": "Gunakan printer yang mendukung cetak label. Lakukan Tes Cetak Label untuk memastikan ukuran dan hasilnya sesuai.",
        "targetHref": "/admin/pengaturan/printer#label-pesanan",
        "targetLabel": "Atur label cup"
      },
      {
        "title": "Mencetak label dari pesanan tersimpan",
        "summary": "Label memuat item, pilihan tambahan, pelanggan/meja, jenis pesanan, waktu, serta nomor cup.",
        "steps": [
          "Simpan atau bayar pesanan terlebih dahulu; pratinjau nota yang belum disimpan tidak mencetak label.",
          "Tekan Cetak Label Pesanan pada nota tersimpan atau daftar Pesanan di kasir. Label juga tersedia pada detail nota di Admin → Transaksi.",
          "Pada dialog sistem, pilih printer label, ukuran media yang sesuai, dan skala cetak yang tidak mengubah ukuran label.",
          "Pada aplikasi Android dengan printer label Bluetooth yang sesuai, aktifkan Cetak Otomatis agar label dicetak setelah pesanan disimpan.",
          "Pelunasan Open Bill dengan isi yang sama tidak mengirim ulang label otomatis. Perubahan isi pesanan mengirim satu set label baru bertanda PERUBAHAN; gunakan set terbaru.",
          "Cetak ulang dari tombol yang sama ditandai CETAK ULANG. Nota yang sudah void menghasilkan penanda PEMBATALAN saat label dicetak."
        ],
        "tips": "Batas satu pekerjaan adalah 200 label dan jumlah item harus bulat. Jika catatan terlalu panjang, besarkan label; aplikasi menolak cetak agar instruksi tidak terpotong."
      },
      {
        "title": "Menangani label gagal atau belum terkonfirmasi",
        "summary": "Kegagalan printer tidak membatalkan transaksi yang sudah disimpan.",
        "steps": [
          "Periksa daya, media, koneksi, dan printer tujuan. Dialog terbuka atau data terkirim belum membuktikan label fisik sudah keluar.",
          "Buka Pengaturan → Printer → Label Pesanan untuk melihat status pengiriman terakhir.",
          "Pengiriman gagal tidak dicoba ulang otomatis. Setelah printer diperiksa, buka pesanan lalu tekan Cetak Label Pesanan.",
          "Jika status Pengiriman berjalan / belum terkonfirmasi tertinggal setelah aplikasi tertutup, periksa printer lalu pilih Periksa & izinkan cetak ulang.",
          "Pastikan label belum keluar sebelum mencoba lagi agar tidak ada cup yang diproses ganda."
        ],
        "tips": "Jika koneksi terputus, periksa apakah label sudah keluar sebelum mencoba lagi."
      }
    ]
  },
  {
    "id": "data-security",
    "title": "Tanpa Internet, Cadangan & Keamanan",
    "shortDesc": "Lindungi data lokal, PIN, dan cadangan toko.",
    "iconType": "shield",
    "articles": [
      {
        "title": "Menyiapkan mode offline",
        "summary": "Siapkan aplikasi sebelum dipakai tanpa internet.",
        "steps": [
          "Buka Admin → Pengaturan → Tentang Aplikasi & Bantuan.",
          "Gunakan pemeriksaan atau persiapan offline yang tersedia.",
          "Tunggu persiapan selesai, lalu coba buka kembali kasir tanpa internet.",
          "Jangan hapus data situs/browser karena transaksi disimpan di perangkat."
        ],
        "tips": "Aktivasi awal, pembayaran lisensi, dan portal Owner memerlukan internet."
      },
      {
        "title": "Backup dan restore lengkap",
        "summary": "Cadangan mencakup produk, transaksi, pengembalian uang, shift, dan pergerakan stok.",
        "steps": [
          "Buka Admin → Pengaturan → Data & Cadangan.",
          "Unduh cadangan JSON dan simpan salinan di lokasi aman di luar perangkat kasir.",
          "Untuk memulihkan, pilih file cadangan dan periksa ringkasannya sebelum konfirmasi.",
          "PIN dan recovery code perangkat tujuan tidak diambil dari file backup. Siapkan kembali keamanan bila diminta.",
          "Periksa jumlah produk, transaksi, serta saldo stok setelah restore."
        ],
        "tips": "Simpan file cadangan di tempat aman karena berisi data usaha.",
        "targetHref": "/admin/pengaturan/data",
        "targetLabel": "Buka cadangan"
      },
      {
        "title": "PIN Admin dan recovery code",
        "summary": "Simpan recovery code terpisah dari perangkat toko.",
        "steps": [
          "Buka pengaturan keamanan dan buat PIN Admin.",
          "Simpan recovery code di tempat yang hanya dapat diakses pemilik usaha.",
          "Gunakan PIN untuk membuka halaman Admin dan tindakan yang membutuhkan otorisasi.",
          "Jika lupa PIN, ikuti proses pemulihan dengan recovery code."
        ],
        "targetHref": "/admin/pengaturan/keamanan",
        "targetLabel": "Atur keamanan"
      }
    ]
  }
];
