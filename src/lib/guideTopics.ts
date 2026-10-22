// SakuNota POS Guide Topics Dataset
// Aligned with implemented routes, controls, and 4 operational stages

export interface GuideArticle {
  title: string;
  summary: string;
  steps: string[];
  tips?: string;
  targetHref?: string;
  targetLabel?: string;
}

export type GuideStage = 1 | 2 | 3 | 4;
export type GuideBusinessType = 'all' | 'warung' | 'restaurant' | 'retail' | 'setup';

export interface GuideTopic {
  id: string;
  title: string;
  shortDesc: string;
  iconType: string;
  stage: GuideStage;
  stageLabel: string;
  badge: string;
  businessTypes: GuideBusinessType[];
  articles: GuideArticle[];
}

export const STAGE_CONFIG: Record<GuideStage, { title: string; subtitle: string; stepNumber: string }> = {
  1: {
    stepNumber: '1',
    title: 'Persiapan Awal',
    subtitle: 'Aktivasi lisensi, profil toko, printer struk, dan keamanan PIN.'
  },
  2: {
    stepNumber: '2',
    title: 'Katalog & Meja',
    subtitle: 'Pengaturan produk, harga, varian, barcode, dan denah ruangan.'
  },
  3: {
    stepNumber: '3',
    title: 'Kasir & Transaksi',
    subtitle: 'Pencatatan pesanan, pembayaran tunai/QRIS, kasbon, dan kas masuk/keluar.'
  },
  4: {
    stepNumber: '4',
    title: 'Laporan & Tutup Shift',
    subtitle: 'Rekap shift kasir, laporan laba rugi, stok opname, dan cadangan data.'
  }
};

export const BUSINESS_TYPE_FILTERS: Array<{ id: GuideBusinessType; label: string; desc: string }> = [
  { id: 'all', label: 'Semua', desc: 'Seluruh topik panduan SakuNota' },
  { id: 'warung', label: 'Warung & UMKM', desc: 'Kasir cepat dan arus kas harian' },
  { id: 'restaurant', label: 'Restoran & Kafe', desc: 'Denah meja, pesanan meja, dan mode pelayan' },
  { id: 'retail', label: 'Toko & Retail', desc: 'Scan barcode, barang timbang, dan stok barang' },
  { id: 'setup', label: 'Perangkat & Sistem', desc: 'Lisensi, printer, PIN kasir, dan backup' }
];

export const GUIDE_TOPICS: GuideTopic[] = [
  // ==========================================
  // TAHAP 1: SETUP AWAL & PERSIAPAN USAHA (WAJIB)
  // ==========================================
  {
    id: 'license-security-update',
    title: 'Aktivasi Lisensi & Uji Coba Demo',
    shortDesc: 'Aktivasi lisensi resmi satu perangkat, aturan trial, dan mode latihan.',
    iconType: 'shield',
    stage: 1,
    stageLabel: 'Tahap 1: Persiapan Awal',
    badge: 'Persiapan Awal',
    businessTypes: ['all', 'setup'],
    articles: [
      {
        title: 'Aktivasi lisensi resmi dan trial',
        summary: 'Aktivasi pertama membutuhkan internet; trial dimulai setelah aktivasi perangkat.',
        steps: [
          'Buka halaman utama SakuNota dan pilih tombol "Aktivasi Kode".',
          'Masukkan kode lisensi resmi berbayar, tester, atau trial yang sudah disetujui (format: SN-XXXX-XXXX-XXXX).',
          'Tekan "Aktifkan Lisensi di Perangkat Ini". Lisensi akan langsung terikat secara kriptografis pada hardware ID perangkat kasir Anda.',
          'Setelah aktivasi pertama berhasil, aplikasi 100% dapat digunakan tanpa sambungan internet.',
          'SakuNota menerapkan aturan ketat 1 lisensi untuk 1 perangkat. Jika ingin memindahkan perangkat di kemudian hari, hubungi dukungan resmi untuk melepas ikatan perangkat lama.'
        ],
        targetHref: '/?aktivasi=true',
        targetLabel: 'Aktivasi lisensi'
      },
      {
        title: 'Mencoba demo kasir dengan aman',
        summary: 'Data latihan disimpan terpisah dari data toko asli Anda.',
        steps: [
          'Pilih tombol "Coba Demo Kasir" pada halaman utama.',
          'Di kasir demo, Anda bebas mencoba buka shift, scan barcode, tambah pesanan, dan mencetak struk latihan.',
          'Data latihan demo disimpan terpisah dan struk dicetak dengan tanda simulasi agar tidak disalahgunakan.',
          'Setelah batas latihan selesai (30 menit atau 50 pesanan), tekan "Keluar Demo" untuk kembali ke kasir usaha asli Anda.'
        ],
        targetHref: '/pos?demo=true',
        targetLabel: 'Buka demo kasir'
      },
      {
        title: 'Memperbarui aktivasi lisensi lama',
        summary: 'Pembeli lama tidak perlu membeli ulang jika terjadi pembaruan sistem.',
        steps: [
          'Buka SakuNota di perangkat kasir dan browser asal yang sebelumnya sudah diaktifkan.',
          'Sambungkan perangkat ke internet satu kali untuk sinkronisasi bukti verifikasi digital terbaru.',
          'Setelah verifikasi berhasil, matikan kembali internet. Lisensi tetap aktif selamanya tanpa biaya langganan bulanan.'
        ],
        tips: 'Jangan gunakan fitur "Hapus Data Browser / Clear Cache Total" karena kunci verifikasi tersimpan di penyimpanan lokal perangkat kasir.'
      }
    ]
  },
  {
    id: 'getting-started',
    title: 'Pilih Profil Usaha & Identitas Toko',
    shortDesc: 'Pilihan alur Warung, Restoran, Kafe, atau Retail, serta nama identitas toko.',
    iconType: 'rocket',
    stage: 1,
    stageLabel: 'Tahap 1: Persiapan Awal',
    badge: 'Persiapan Awal',
    businessTypes: ['all', 'warung', 'restaurant', 'retail', 'setup'],
    articles: [
      {
        title: 'Pilih alur sesuai usaha (Restoran vs Warung & Retail)',
        summary: 'Jenis usaha dapat diganti kapan saja tanpa menghapus data produk atau transaksi.',
        steps: [
          'Buka Admin → Pengaturan → Profil Usaha & Struk.',
          'Pilih salah satu dari 4 jenis usaha: Warung & UMKM, Restoran, Kafe, atau Toko & Retail.',
          'Isi Nama Usaha / Toko (maksimal 25 karakter agar proporsional dan tidak terpotong pada struk thermal).',
          'Untuk Warung & UMKM dan Retail: Sistem otomatis mengaktifkan Kasir Langsung cepat (Direct Checkout), mematikan alur nomor meja, dan nota belanja langsung tercetak tanpa label meja.',
          'Untuk Restoran dan Kafe: Sistem otomatis menyediakan manajemen meja makan, denah visual 2D, pemindahan meja tamu, dan mode kirim pesanan pelayan (Waiter Floor).',
          'Klik Simpan Profil Toko untuk menerapkan konfigurasi.'
        ],
        targetHref: '/admin/pengaturan/profil',
        targetLabel: 'Atur profil usaha'
      },
      {
        title: 'Preset contoh data 4 jenis usaha',
        summary: 'Tersedia paket data latihan siap pakai untuk langsung mencoba operasional.',
        steps: [
          'Buka Admin → Pengaturan → Data & Cadangan, lalu gulir ke bagian Contoh Data Usaha.',
          'Pilih salah satu paket preset: Warung & UMKM (kasir cepat), Restoran (menu lengkap & meja makan), Kafe (aneka kopi & bar seat), atau Retail (barcode EAN & stok satuan).',
          'Konfirmasi pemuatan. Data contoh menu, denah meja visual, dan profil usaha langsung terpasang.',
          'Preset ini sangat berguna untuk melatih karyawan baru sebelum mulai menginput menu asli toko.'
        ],
        targetHref: '/admin/pengaturan/data',
        targetLabel: 'Lihat preset usaha'
      }
    ]
  },
  {
    id: 'hardware',
    title: 'Printer Bluetooth & Format Struk',
    shortDesc: 'Koneksi thermal 58/80 mm, kustomisasi logo, slogan, dan catatan kaki.',
    iconType: 'printer',
    stage: 1,
    stageLabel: 'Tahap 1: Persiapan Awal',
    badge: 'Persiapan Awal',
    businessTypes: ['all', 'setup'],
    articles: [
      {
        title: 'Menyiapkan printer thermal Bluetooth (58/80 mm)',
        summary: 'Cetak struk langsung dari HP Android atau komputer tanpa aplikasi pihak ketiga.',
        steps: [
          'Nyalakan printer thermal Bluetooth Anda (ukuran 58 mm atau 80 mm).',
          'Buka Admin → Pengaturan → Printer.',
          'Pilih lebar kertas: 58 mm (standar struk kasir mini) atau 80 mm (struk lebar restoran).',
          'Pada perangkat aplikasi Android: Tekan "Cari Printer Bluetooth", pilih nama printer Anda (misal: Panda, Eppos, VSC, Zjiang), lalu lakukan Uji Cetak.',
          'Pada browser PC/PWA: Cetak struk memanfaatkan dialog cetak sistem bawaan dengan memilih printer thermal yang terpasang.',
          'Lakukan uji coba cetak beberapa menu untuk memastikan teks tercetak tegas dan tidak terpotong tepi.'
        ],
        tips: 'SakuNota menggunakan koneksi Bluetooth langsung sehingga tidak membutuhkan router Wi-Fi atau kuota internet.',
        targetHref: '/admin/pengaturan/printer',
        targetLabel: 'Pengaturan printer'
      },
      {
        title: 'Kustomisasi format & elemen struk belanja',
        summary: 'Atur slogan header, info WiFi/medsos di footer, serta sembunyikan elemen tertentu.',
        steps: [
          'Buka Admin → Pengaturan → Printer & Struk.',
          'Isi Slogan Toko / Header Nota (contoh: "Cita Rasa Asli Nusantara" atau "Belanja Hemat Setiap Hari").',
          'Isi Catatan Kaki / Info Toko (contoh: "Password WiFi: sakunota2026 | IG: @warungberkah | Terima kasih atas kunjungannya").',
          'Atur sakelar tampilan sesuai kebutuhan: Tampilkan Logo Toko, Nama Kasir yang Bertugas, Nomor Meja / Area, atau Catatan Khusus Menu.',
          'Tekan tombol "Pratinjau Struk" untuk melihat simulasi visual nota sebelum mencetak fisik ke kertas.',
          'Klik Simpan Pengaturan Struk.'
        ],
        targetHref: '/admin/pengaturan/printer',
        targetLabel: 'Kustomisasi struk'
      }
    ]
  },
  {
  "id": "data-security",
  "title": "PIN Admin & Proteksi Keamanan",
  "shortDesc": "Gembok halaman manajemen dengan PIN dan simpan recovery code pemulihan.",
  "iconType": "lock",
  "stage": 1,
  "stageLabel": "Tahap 1: Persiapan Awal",
  "badge": "Persiapan Awal",
  "businessTypes": [
    "all",
    "setup"
  ],
  "articles": [
    {
      "title": "Membuat PIN Admin dan menyimpan Recovery Code",
      "summary": "Mencegah kasir atau pihak yang tidak berwenang mengubah harga dan melihat omzet.",
      "steps": [
        "Buka Admin → Pengaturan → Keamanan & Akses.",
        "Buat PIN Admin pemilik toko dengan 4–12 digit angka.",
        "Sistem akan menampilkan Kode Pemulihan Rahasia (Recovery Code). Salin dan catat kode ini di buku catatan pribadi Anda di luar perangkat kasir.",
        "Setelah PIN benar, akses Admin berlaku satu jam di tab yang sama, termasuk saat berpindah ke kasir dan kembali. Logout mengakhiri akses lebih awal.",
        "Jika pemilik lupa PIN, gunakan Recovery Code untuk mereset PIN baru seketika tanpa menghapus data usaha.",
        "Mengganti PIN membatalkan akses lama. Gunakan PIN terbaru untuk masuk kembali."
      ],
      "targetHref": "/admin/pengaturan/keamanan",
      "targetLabel": "Atur keamanan PIN"
    },
    {
      "title": "Menyiapkan mode offline tanpa internet",
      "summary": "Pastikan seluruh aset aplikasi tersimpan di memori perangkat.",
      "steps": [
        "Buka Admin → Pengaturan → Tentang Aplikasi & Bantuan.",
        "Periksa status kesiapan offline pada kartu Status Offline PWA.",
        "Jika status belum lengkap, sambungkan internet sebentar dan tekan \"Perbarui Aset Offline\". Tunggu sampai semua komponen tersimpan 100%.",
        "Setelah tersimpan, matikan koneksi internet (mode pesawat) dan coba buka ulang halaman kasir. Kasir tetap bekerja lancar tanpa kendala."
      ],
      "tips": "Seluruh data transaksi, menu, dan shift disimpan di penyimpanan perangkat Anda, sehingga toko tetap dapat berjualan di lokasi tanpa sinyal."
    }
  ]
},

  // ==========================================
  // TAHAP 2: MENYIAPKAN KATALOG & RUANGAN
  // ==========================================
  {
    id: 'products-catalog',
    title: 'Katalog Produk & Kategori',
    shortDesc: 'Kelola daftar barang, harga jual, kelompok kategori, dan varian porsi.',
    iconType: 'package',
    stage: 2,
    stageLabel: 'Tahap 2: Katalog & Meja',
    badge: 'Katalog & Menu',
    businessTypes: ['all', 'warung', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Tambah dan ubah produk & batas karakter',
        summary: 'Siapkan katalog sesuai barang atau menu yang dijual.',
        steps: [
          'Buka Admin → Kelola Menu & Produk.',
          'Klik tombol "+ Tambah Produk Baru".',
          'Isi Nama Produk (maksimal 50 karakter agar tidak terpotong pada kartu kasir dan nota thermal).',
          'Tentukan Kategori (misal: Makanan, Minuman, Camilan, Sembako, Rokok, Jasa). Anda juga dapat menambah kategori baru sesuka Anda.',
          'Masukkan Harga Jual Satuan (misal: Rp 15.000).',
          'Untuk restoran/kafe: Anda dapat menambahkan opsi varian (contoh: Level Pedas 1-5, Dingin/Panas, Topping Tambahan).',
          'Klik Simpan Produk. Produk langsung tampil seketika di layar kasir.'
        ],
        targetHref: '/admin/menu',
        targetLabel: 'Buka katalog produk'
      },
      {
        title: 'Mengatur status ketersediaan (Tersedia vs Habis)',
        summary: 'Cegah kasir menerima pesanan untuk menu yang bahan bakunya sedang habis.',
        steps: [
          'Pada tabel Admin → Kelola Menu & Produk, setiap barang memiliki tombol sakelar: "Tersedia" (hijau) atau "Habis" (merah).',
          'Jika bahan baku habis, cukup klik sakelar menjadi "Habis".',
          'Pada layar kasir, menu berstatus Habis otomatis berubah warna abu-abu dan tidak dapat ditambahkan ke keranjang belanja.',
          'Setelah bahan datang kembali, ubah status menjadi Tersedia hanya dengan 1 ketukan.'
        ],
        targetHref: '/admin/menu',
        targetLabel: 'Kelola ketersediaan'
      }
    ]
  },
  {
    id: 'barcode',
    title: 'Scan Barcode & Pindai SKU',
    shortDesc: 'Pindai barcode produk memakai scanner USB HID, Bluetooth, atau kamera HP.',
    iconType: 'package',
    stage: 2,
    stageLabel: 'Tahap 2: Katalog & Meja',
    badge: 'Khusus Retail & Toko',
    businessTypes: ['retail', 'warung'],
    articles: [
      {
        title: 'Mendaftarkan barcode produk ke SKU',
        summary: 'Barcode kemasan harus dicocokkan dengan kode SKU di katalog.',
        steps: [
          'Buka Admin → Kelola Menu & Produk, lalu klik tombol Edit pada produk retail Anda.',
          'Pada kolom "SKU / Barcode", ketik nomor barcode yang tertera pada kemasan barang (misal barcode EAN-13: 8991234567890).',
          'Anda juga dapat menembakkan barcode scanner langsung ke kolom tersebut, atau tekan ikon kamera untuk memindai otomatis.',
          'Pastikan tidak menghilangkan angka nol di depan jika barcode memiliki awalan nol.',
          'Klik Simpan Produk.'
        ],
        targetHref: '/admin/menu',
        targetLabel: 'Kelola barcode produk'
      },
      {
        title: 'Scan memakai USB atau Bluetooth HID scanner',
        summary: 'Scanner barcode bekerja seperti keyboard cepat yang mengirim kode lalu Enter.',
        steps: [
          'Hubungkan alat scan barcode USB (melalui kabel OTG bila memakai HP/Tablet) atau hubungkan via Bluetooth mode HID.',
          'Buka layar Kasir POS.',
          'Arahkan scanner ke barcode kemasan barang. Scanner akan memindai kode dan barang otomatis masuk ke keranjang belanja dalam 0.1 detik.',
          'Jika memindai barang yang sama berulang kali, jumlah item di keranjang akan bertambah otomatis.'
        ],
        tips: 'Jika barcode tidak terdeteksi, periksa apakah scanner disetel dengan akhiran (suffix) "Enter / Carriage Return" sesuai standar pabrik.',
        targetHref: '/pos',
        targetLabel: 'Buka kasir barcode'
      },
      {
        title: 'Scan barcode memakai kamera HP',
        summary: 'Gunakan kamera bawaan HP kasir untuk memindai barang tanpa membeli alat scanner tambahan.',
        steps: [
          'Di layar Kasir POS, tekan tombol "Pindai Barcode (Kamera)".',
          'Izinkan browser mengakses kamera saat notifikasi izin muncul.',
          'Arahkan kamera ke barcode kemasan barang dalam kondisi pencahayaan cukup.',
          'Setelah barcode terbaca, barang otomatis ditambahkan ke keranjang belanja.'
        ],
        tips: 'Gunakan koneksi HTTPS atau aplikasi Android terpasang agar fitur kamera diizinkan oleh sistem keamanan browser.'
      }
    ]
  },
  {
  "id": "weight-sales",
  "title": "Jual Barang Timbang",
  "shortDesc": "Atur harga per kg atau 100 g, lalu masukkan berat di kasir.",
  "iconType": "package",
  "stage": 2,
  "stageLabel": "Tahap 2: Katalog & Meja",
  "badge": "Warung & Retail",
  "businessTypes": [
    "warung",
    "retail"
  ],
  "articles": [
    {
      "title": "Coba contoh Warung dan Retail",
      "summary": "Produk timbang sudah tersedia di demo, tanpa perlu menambah produk sendiri.",
      "steps": [
        "Buka demo kasir, lalu pilih Warung atau Retail di bagian atas.",
        "Buka katalog kasir, lalu pilih kategori Barang Timbang atau cari nama produknya.",
        "Warung: pilih Lauk Ayam Ungkep seharga Rp48.000 per kg. Masukkan 250 g untuk total Rp12.000. Atau pilih Kacang Goreng seharga Rp8.000 per 100 g; 150 g menghasilkan Rp12.000.",
        "Retail: pilih Beras Premium Curah seharga Rp18.000 per kg. Masukkan 0,5 kg untuk total Rp9.000. Atau pilih Kopi Bubuk Curah seharga Rp12.000 per 100 g; 250 g menghasilkan Rp30.000.",
        "Tambah ke keranjang, buka shift bila diminta, lalu selesaikan pembayaran simulasi. Periksa stok, struk, dan modal di Admin."
      ],
      "tips": "Contoh memiliki stok dan modal. Mengganti pilihan usaha memulai ulang data demo. Data demo terpisah dari data usaha berlisensi.",
      "targetHref": "/pos?demo=true",
      "targetLabel": "Coba produk timbang"
    },
    {
      "title": "Siapkan produk timbang",
      "summary": "Tersedia untuk usaha Retail dan Warung.",
      "steps": [
        "Di Admin → Pengaturan → Profil Usaha, pilih Toko & Retail atau Warung & UMKM.",
        "Buka Katalog & Stok → Katalog, lalu tambah produk atau ubah produk yang belum memiliki stok dan transaksi.",
        "Pilih Satuan: Berat. Pilih Harga per: kg atau 100 g, lalu isi harga jualnya.",
        "Isi Modal dengan satuan harga yang sama jika ingin melihat laba. Contoh: harga Rp18.000 per kg dan modal Rp12.000 per kg.",
        "Simpan produk. Di bagian Stok, pilih Aktifkan Stok. Isi berat awal dan batas minimum dalam gram. Contoh: 10 kg diisi 10000 g."
      ],
      "tips": "Satu produk cukup untuk semua ukuran. Satuan produk yang sudah memiliki stok atau transaksi tidak dapat diganti agar catatan lama tetap sesuai.",
      "targetHref": "/admin/menu",
      "targetLabel": "Buka katalog"
    },
    {
      "title": "Coba penjualan di kasir",
      "summary": "Pilih produk, masukkan berat, lalu tambah ke keranjang.",
      "steps": [
        "Buka kasir dan buka shift. Pilih produk timbang dari katalog atau pindai barcode produknya.",
        "Isi Berat: 250 dan pilih g. Pada harga Rp18.000 per kg, totalnya Rp4.500.",
        "Untuk kilogram, pilih kg lalu isi 0,5 atau 1,25. Totalnya masing-masing Rp9.000 dan Rp22.500.",
        "Tekan Tambah ke Keranjang. Tekan Ubah pada berat di keranjang bila perlu mengoreksinya.",
        "Selesaikan pembayaran seperti biasa. Stok berkurang sesuai berat, dan struk menampilkan g atau kg."
      ],
      "tips": "Berat paling kecil 1 g. Gunakan demo atau data latihan untuk mencoba pembayaran. Setelah aplikasi siap digunakan offline, penjualan timbang tetap berjalan tanpa internet.",
      "targetHref": "/pos?demo=true",
      "targetLabel": "Coba di demo"
    },
    {
      "title": "Pembayaran terpisah dan pengembalian",
      "summary": "Bayar atau kembalikan sebagian berat dari nota.",
      "steps": [
        "Untuk membagi pembayaran per barang, buka nota belum lunas dan pilih pembayaran per item. Isi berat yang dibayar dalam gram.",
        "Untuk mengembalikan barang, buka shift lalu masuk Admin → Transaksi dan buka rincian nota yang sudah lunas.",
        "Buka Pengembalian Barang Timbang. Pilih barang, isi berat yang dikembalikan, alasan, dan cara pengembalian uang.",
        "Centang Kembalikan barang ke stok hanya jika barang benar-benar kembali dan masih layak dijual.",
        "Periksa total pengembalian, lalu tekan Simpan Pengembalian. Stok dan laporan akan mengikuti berat yang dikembalikan."
      ],
      "tips": "Harga dan modal pada nota lama tetap mengikuti saat penjualan. Misalnya pengembalian 100 g dari penjualan Rp18.000 per kg bernilai Rp1.800 sebelum penyesuaian diskon atau biaya pada nota.",
      "targetHref": "/admin/transaksi",
      "targetLabel": "Buka transaksi"
    }
  ]
},
  {
    id: 'retail-add-product',
    title: 'Tambah Barang Cepat saat Kasir',
    shortDesc: 'Foto kemasan produk atau isi manual langsung dari layar kasir tanpa keluar menu.',
    iconType: 'package',
    stage: 2,
    stageLabel: 'Tahap 2: Katalog & Meja',
    badge: 'Khusus Retail & Toko',
    businessTypes: ['retail'],
    articles: [
      {
        title: 'Panduan singkat khusus Retail',
        summary: 'Barang baru dapat ditambahkan langsung dari kasir saat pembeli sedang antre.',
        steps: [
          'Pastikan jenis usaha di Profil Usaha adalah Toko & Retail, lalu buka shift kasir.',
          'Di HP, buka tab Menu pada kasir Retail. Tombol "Tambah Barang" ada tepat di bawah kotak pencarian. Pada desktop, tombol ada di samping "Pindai Barcode".',
          'Pilih metode: "Foto Produk" (mendeteksi kemasan & barcode otomatis) atau "Isi Manual".',
          'Periksa nama barang. Jika ada pilihan referensi offline, pilih varian dan ukuran yang sesuai kemasan.',
          'Isi Harga Jual dan Jumlah yang dibeli, lalu tekan "Tambah ke Keranjang".',
          'Selesaikan pembayaran nota. Barang baru otomatis tersimpan permanen ke katalog toko setelah nota berstatus Lunas.'
        ],
        tips: 'Membatalkan formulir, menghapus barang dari keranjang, atau pembayaran yang dibatalkan tidak akan mengotori katalog toko. Untuk kasbon, produk masuk katalog setelah seluruh tagihan dilunasi.',
        targetHref: '/pos',
        targetLabel: 'Buka kasir retail'
      },
      {
        title: 'Menyiapkan pengenalan foto tanpa internet',
        summary: 'Persiapan dilakukan sekali di perangkat kasir saat internet tersedia.',
        steps: [
          'Di formulir Tambah Barang, tekan tombol "Siapkan Pengenalan Foto". Anda juga bisa membukanya melalui Admin → Pengaturan → Foto Produk Retail.',
          'Sambungkan internet untuk mengunduh paket referensi offline sekitar 10 MB. Tunggu hingga proses selesai 100%.',
          'Setelah persiapan selesai, fitur pengenalan foto dapat digunakan sepenuhnya tanpa internet.',
          'Foto bagian depan kemasan barang dengan pencahayaan cukup dan tulisan nama produk yang jelas.',
          'Sistem akan mencocokkan nama merek, varian, dan ukuran secara cerdas; harga jual tetap Anda tentukan sendiri sesuai harga warung/toko Anda.'
        ],
        tips: 'Foto diproses secara lokal di perangkat Anda dan tidak dikirim ke server luar manapun, menjaga privasi dan kecepatan kerja offline.',
        targetHref: '/admin/pengaturan',
        targetLabel: 'Siapkan pengenalan foto'
      }
    ]
  },
  {
    id: 'product-photos',
    title: 'Foto Produk & Impor Gambar',
    shortDesc: 'Foto visual pada menu kasir, kompresi offline, dan ekspor produk JSON.',
    iconType: 'package',
    stage: 2,
    stageLabel: 'Tahap 2: Katalog & Meja',
    badge: 'Katalog & Menu',
    businessTypes: ['all', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Menambahkan foto produk offline',
        summary: 'Produk tanpa foto tetap memakai ikon kategori yang rapi dan kontras tinggi.',
        steps: [
          'Buka Admin → Kelola Menu & Produk, lalu klik tombol Edit pada produk.',
          'Pada bagian Foto Produk, pilih file foto dari galeri HP atau kamera komputer Anda (format JPG, PNG, atau WebP).',
          'Aplikasi otomatis mengompresi ukuran foto agar hemat memori dan cepat dimuat di HP kasir.',
          'Klik Simpan. Foto tersimpan di penyimpanan perangkat perangkat kasir dan dapat ditampilkan selamanya tanpa internet.'
        ],
        targetHref: '/admin/menu',
        targetLabel: 'Kelola foto produk'
      },
      {
        title: 'Ekspor dan impor katalog beserta foto (.json)',
        summary: 'Pindahkan seluruh produk dan fotonya ke perangkat kasir lain dalam 1 file cadangan.',
        steps: [
          'Buka Admin → Kelola Menu & Produk → Tab Impor / Ekspor.',
          'Pilih tombol "Export Produk Lengkap + Foto (.json)". File cadangan akan diunduh ke perangkat Anda.',
          'Pada perangkat kasir tujuan, buka halaman yang sama lalu pilih "Import File JSON".',
          'Periksa pratinjau data produk dan foto yang terdeteksi, lalu tekan "Konfirmasi Impor".',
          'Seluruh produk beserta foto dan pilihan varian langsung terpasang di perangkat baru tanpa perlu input ulang.'
        ],
        tips: 'Gunakan file JSON untuk membawa gambar fisik produk; file format Excel/CSV hanya membawa teks nama dan harga tanpa gambar.',
        targetHref: '/admin/menu',
        targetLabel: 'Ekspor impor produk'
      }
    ]
  },
  {
    id: 'table-floor-plan',
    title: 'Denah Meja 2D & Zona Ruangan',
    shortDesc: 'Bentuk meja visual, zona ruangan (Indoor, Outdoor, VIP), dan kapasitas kursi.',
    iconType: 'utensils',
    stage: 2,
    stageLabel: 'Tahap 2: Katalog & Meja',
    badge: 'Khusus Resto & Kafe',
    businessTypes: ['restaurant'],
    articles: [
      {
        title: 'Mengatur bentuk meja dan zona ruangan',
        summary: 'Cocok untuk kafe dan restoran yang memiliki denah ruangan fisik bertingkat atau area saung.',
        steps: [
          'Buka Admin → Kelola Meja.',
          'Pilih "Tambah Meja" atau klik Ubah pada meja yang sudah ada.',
          'Beri nama meja sesuai fisik ruangan (maksimal 25 karakter), misalnya: Sofa Jendela VIP, Saung Bambu 1, Bar Seat 1, atau Meja Bundar Tengah.',
          'Pilih Bentuk Meja Visual: Kotak (standar), Bundar (keluarga), Panjang/Sofa (komunal), Bar Stool (kursi tinggi), atau Lesehan (karpet).',
          'Tentukan Zona Ruangan (Ruang Utama, Outdoor/Teras, Saung & Lesehan, Bar Counter, atau VIP Room) dan Kapasitas Kursi.',
          'Klik Simpan Meja. Kasir dan pelayan dapat memfilter meja berdasarkan zona ruangan untuk operasional yang lebih gesit.'
        ],
        targetHref: '/admin/meja',
        targetLabel: 'Kelola denah meja'
      },
      {
        title: 'Melihat denah visual 2D dan operasional meja',
        summary: 'Peralihan antara tampilan kartu daftar dan denah visual ruangan spasial.',
        steps: [
          'Pada halaman Admin → Kelola Meja, gunakan tombol peralihan di atas: "Daftar Kartu" atau "Denah Visual 2D".',
          'Mode Denah Visual 2D menampilkan meja di dalam kotak zona ruangan fisik lengkap dengan bentuk fisiknya dan indikator status warna: Kosong (abu-abu), Terisi (merah), dan Tagihan Lunas (hijau).',
          'Pada layar Kasir POS, tab zona memudahkan kasir melihat meja yang sedang terisi serta nominal pesanan yang berjalan.',
          'Setelah pelanggan selesai membayar dan meja dibersihkan, tekan "Lepas Meja" agar meja kembali berstatus Kosong siap ditempati tamu baru.'
        ],
        targetHref: '/pos',
        targetLabel: 'Buka kasir meja'
      }
    ]
  },

  // ==========================================
  // TAHAP 3: OPERASIONAL KASIR HARIAN
  // ==========================================
  {
    id: 'cashier-workspace',
    title: 'Buka Shift & Tata Letak Kasir',
    shortDesc: 'Modal awal laci, pembatas fleksibel nota, dan ukuran tombol ramah jempol.',
    iconType: 'cart',
    stage: 3,
    stageLabel: 'Tahap 3: Kasir & Transaksi',
    badge: 'Operasional Harian',
    businessTypes: ['all', 'warung', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Buka shift kasir dan modal awal laci',
        summary: 'Kasir, Menu, Pesanan, dan Shift Saya memakai data shift yang terpadu.',
        steps: [
          'Sebelum mulai melayani pembeli, buka menu "Shift Saya" atau ketuk indikator status shift di bar atas kasir.',
          'Pilih tombol "Buka Shift Baru".',
          'Masukkan Nama Kasir yang bertugas dan Modal Kas Awal di laci uang (contoh: Rp 200.000 untuk uang kembalian pecahan kecil).',
          'Tekan "Buka Shift". Status kasir seketika berubah menjadi Hijau (Aktif) dan siap menerima transaksi.',
          'Seluruh transaksi tunai yang masuk otomatis dihitung ke kas laci shift ini.'
        ],
        targetHref: '/pos',
        targetLabel: 'Buka shift kasir'
      },
      {
        title: 'Tampilan kasir fleksibel & keranjang mobile responsif',
        summary: 'Tarik pembatas nota, atur tinggi sheet mobile, dan sesuaikan tombol menu agar pas di segala layar.',
        steps: [
          'Pada monitor PC/Laptop kasir: Tahan dan geser garis pembatas vertikal antara katalog menu dan nota belanja ke kiri atau kanan (280px hingga 650px, klik 2x untuk reset ke 380px).',
          'Ukuran teks dan tombol nota di PC membesar otomatis secara proporsional saat ditarik melebar.',
          'Gunakan tombol kerapatan [S] Padat, [M] Standar, atau [L] Besar di bilah pencarian untuk mengatur ukuran kartu menu.',
          'Di HP mode portrait (berdiri): Atur tinggi laci keranjang lewat tombol [60% Kompak], [82% Nyaman], atau [96% Penuh], serta gunakan gestur geser naik/turun.',
          'Ubah ukuran tombol nota kasir mobile antara [Normal] (36px) atau [Jumbo Ramah Jari] (44px) agar nyaman disentuh jempol kasir tanpa salah pencet.',
          'Gunakan tombol tong sampah merah di tiap baris pesanan untuk menghapus item secara instan tanpa perlu menekan tombol minus berkali-kali.'
        ],
        tips: 'Ukuran yang Anda atur tersimpan otomatis di perangkat dan tidak akan hilang saat aplikasi ditutup atau dibuka kembali.',
        targetHref: '/pos',
        targetLabel: 'Coba di kasir'
      }
    ]
  },
  {
    id: 'pos-checkout',
    title: 'Transaksi Kasir, Diskon & Pembayaran',
    shortDesc: 'Pencatatan nota belanja, diskon potongan, uang tunai, QRIS, dan transfer.',
    iconType: 'banknote',
    stage: 3,
    stageLabel: 'Tahap 3: Kasir & Transaksi',
    badge: 'Operasional Harian',
    businessTypes: ['all', 'warung', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Mencatat penjualan kasir dan hitung kembalian',
        summary: 'Pilih produk, atur jumlah porsi, dan terima pembayaran dengan kembalian otomatis.',
        steps: [
          'Pilih menu dari katalog atau scan barcode barang untuk memasukkannya ke nota belanja.',
          'Gunakan tombol [ - ] dan [ + ] untuk mengatur jumlah barang/porsi.',
          'Untuk restoran: Pilih nomor meja tamu bila pelanggan makan di tempat dan membayar belakangan.',
          'Tekan tombol besar "Bayar".',
          'Pilih metode pembayaran: Tunai (Cash), QRIS, Transfer Bank, atau Kasbon.',
          'Untuk Tunai: Masukkan jumlah uang yang diterima dari pembeli (tersedia tombol cepat uang pas, Rp 50.000, Rp 100.000). Sistem seketika menghitung uang kembalian yang harus diserahkan ke pembeli.',
          'Selesaikan pembayaran dan struk belanja langsung tercetak otomatis.'
        ],
        targetHref: '/pos',
        targetLabel: 'Buka kasir'
      },
      {
        title: 'Pemberian diskon persen atau nominal rupiah',
        summary: 'Berikan potongan harga per pesanan secara transparan.',
        steps: [
          'Pada nota belanja di kasir, tekan tombol "+ Tambah Diskon".',
          'Pilih jenis diskon: Persen (%) (misal: 10% promo grand opening) atau Nominal (Rp) (misal: potongan Rp 5.000).',
          'Ketik besaran diskon dan catatan promo.',
          'Total tagihan belanja otomatis terpotong dan rincian diskon tercetak jelas di struk belanja pelanggan.'
        ],
        targetHref: '/pos',
        targetLabel: 'Coba diskon kasir'
      }
    ]
  },
  {
    id: 'waiter-floor',
    title: 'Pelayan Meja (Waiter Floor)',
    shortDesc: 'Pencatatan pesanan langsung di meja tamu dan kirim tagihan instan ke kasir.',
    iconType: 'utensils',
    stage: 3,
    stageLabel: 'Tahap 3: Kasir & Transaksi',
    badge: 'Khusus Resto & Kafe',
    businessTypes: ['restaurant'],
    articles: [
      {
        title: 'Membuka mode pelayan di area makan',
        summary: 'Pelayan mencatat pesanan tamu; pembayaran tetap diselesaikan di meja kasir.',
        steps: [
          'Pastikan profil usaha Anda adalah Restoran atau Kafe, dan meja makan sudah terdaftar.',
          'Buka Admin → Pengaturan POS → Waiter Floor.',
          'Isi nama pelayan yang bertugas dan pilih nomor/area meja tugas.',
          'Tekan tombol "Mulai Mode Pelayan". Layar akan terkunci khusus untuk operasional pelayan.',
          'Pelayan mendatangi meja tamu, memilih menu pesanan tamu beserta catatan khusus (contoh: "jangan pedas, es dipisah"), lalu menekan tombol "Kirim Pesanan ke Kasir".',
          'Pesanan langsung masuk ke kasir sebagai tagihan berjalan atas nomor meja tersebut.',
          'Untuk keluar dari Mode Pelayan dibutuhkan PIN Admin pemilik toko.'
        ],
        targetHref: '/admin/pelayan',
        targetLabel: 'Atur Waiter Floor'
      }
    ]
  },
  {
    id: 'shift',
    title: 'Arus Kas Toko & Belanja Operasional',
    shortDesc: 'Catat belanja bahan dapur, gas, es batu, dan operasional harian toko.',
    iconType: 'file-text',
    stage: 3,
    stageLabel: 'Tahap 3: Kasir & Transaksi',
    badge: 'Operasional Harian',
    businessTypes: ['all', 'warung', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Catat kas keluar operasional harian',
        summary: 'Belanja bahan baku, kemasan, atau bensin tercatat rapi sehingga laba bersih akurat.',
        steps: [
          'Buka Admin → Shift & Kas Laci → Tab Kas & Biaya Operasional, atau ketuk tombol "Arus Kas" di kasir POS.',
          'Pilih "Kas Keluar (Pengeluaran)".',
          'Pilih kategori biaya: Bahan Baku & Dapur, Perlengkapan & Kemasan, Operasional & Utilitas, Gaji/Upah Harian, atau Lainnya.',
          'Pilih Sumber Dana: Kas Fisik Laci (mengurangi uang tunai di laci kasir) atau Rekening Toko (transfer/modal luar).',
          'Ketik nominal uang dan keterangan belanja, atau gunakan tombol pilihan cepat (Es Batu, Gas LPG, Plastik, Air Galon, Parkir, Belanja Pasar, Bensin).',
          'Klik Simpan Pencatatan. Uang keluar tercatat di buku kas shift dan otomatis memotong estimasi laba harian.'
        ],
        targetHref: '/admin/shift',
        targetLabel: 'Buka arus kas'
      }
    ]
  },
  {
    id: 'buku-kasbon',
    title: 'Buku Pelanggan & Catatan Kasbon',
    shortDesc: 'Catatan bayar nanti untuk pelanggan tetap, pantau sisa tagihan, dan terima cicilan.',
    iconType: 'users',
    stage: 3,
    stageLabel: 'Tahap 3: Kasir & Transaksi',
    badge: 'Operasional Harian',
    businessTypes: ['all', 'warung', 'retail'],
    articles: [
      {
        title: 'Mencatat transaksi kasbon pelanggan',
        summary: 'Catat pesanan pelanggan yang belum lunas tanpa menghambat antrean kasir.',
        steps: [
          'Pada saat checkout di kasir POS, pilih metode pembayaran "Kasbon".',
          'Ketik Nama Pelanggan (wajib) dan Nomor WhatsApp / HP (opsional).',
          'Tekan "Simpan Kasbon". Pesanan tersimpan sebagai tagihan piutang dan stok barang langsung terpotong.',
          'Untuk memantau buku utang pelanggan, buka Admin → Riwayat Transaksi → Tab Buku Kasbon.',
          'Admin dapat melihat total sisa tagihan per pelanggan, rincian nota yang belum lunas, serta mengirim tagihan ke WhatsApp pelanggan dengan 1 klik.',
          'Saat pelanggan membayar utang, tekan "+ Bayar / Cicil" untuk mencatat pelunasan atau cicilan bertahap (bisa Tunai, QRIS, atau Transfer).'
        ],
        targetHref: '/admin/transaksi',
        targetLabel: 'Buka buku kasbon'
      }
    ]
  },

  // ==========================================
  // TAHAP 4: PENUTUPAN SHIFT & FITUR LANJUTAN (OPSIONAL)
  // ==========================================
  {
    id: 'closing-shift',
    title: 'Tutup Shift & Struk Z-Report',
    shortDesc: 'Hitung fisik uang laci, verifikasi selisih sistem kasir, dan cetak Z-Report.',
    iconType: 'file-text',
    stage: 4,
    stageLabel: 'Tahap 4: Laporan & Tutup Shift',
    badge: 'Penutupan Kasir',
    businessTypes: ['all', 'warung', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Tutup shift kasir dengan hitungan fisik',
        summary: 'Mencegah kecurangan kasir dan memastikan uang tunai fisik cocok 100% dengan catatan sistem.',
        steps: [
          'Di akhir jam kerja kasir, pilih menu "Shift Saya" atau tekan tombol "Tutup Shift" di kasir.',
          'Buka laci kasir dan hitung seluruh uang kertas dan koin fisik yang ada di dalam laci.',
          'Ketik total uang fisik yang dihitung pada kolom "Jumlah Kas Fisik Laci".',
          'Klik "Tutup Shift Sekarang".',
          'Sistem akan membandingkan uang fisik dengan catatan penjualan sistem (Kas Seharusnya = Modal Awal + Penjualan Tunai + Kas Masuk - Kas Keluar).',
          'Aplikasi menampilkan status rekonsiliasi: Pas (Cocok Rp 0), Lebih (uang fisik berlebih), atau Kurang (uang laci tekor).',
          'Cetak struk Z-Report sebagai bukti serah terima shift kasir yang sah.'
        ],
        tips: 'Penjualan QRIS dan transfer bank tidak menambah fisik kas laci uang dan tercatat terpisah di laporan non-tunai.',
        targetHref: '/admin/shift',
        targetLabel: 'Buka laporan shift'
      }
    ]
  },
  {
    id: 'reports',
    title: 'Dashboard Omzet & Grafik Penjualan',
    shortDesc: 'Analisis grafik penjualan (Garis vs Batang), produk terlaris, dan laba bersih.',
    iconType: 'bar-chart',
    stage: 4,
    stageLabel: 'Tahap 4: Laporan & Tutup Shift',
    badge: 'Laporan Keuangan',
    businessTypes: ['all', 'warung', 'restaurant', 'retail'],
    articles: [
      {
        title: 'Membaca grafik penjualan dan laba bersih',
        summary: 'Pantau pertumbuhan omzet dan estimasi laba bersih toko secara transparan.',
        steps: [
          'Buka Admin → Dashboard.',
          'Pilih filter periode laporan: Hari Ini, Kemarin, 7 Hari Terakhir, 30 Hari, atau Bulan Ini.',
          'Pilih model tampilan grafik: Tekan tombol [Garis] untuk melihat tren ritme fluktuasi omzet, atau pilih [Batang] untuk membandingkan volume omzet per hari.',
          'Arahkan kursor atau sentuh titik grafik untuk melihat rincian omzet dan jumlah nota transaksi.',
          'Lihat kartu Ringkasan Finansial: Total Omzet Penjualan, Total Pengeluaran Biaya Toko, dan Estimasi Laba Bersih Toko.',
          'Lihat daftar 5 Menu Terlaris (Best Seller) untuk mengetahui menu favorit pelanggan Anda.'
        ],
        targetHref: '/admin',
        targetLabel: 'Buka dashboard laporan'
      }
    ]
  },
  {
    id: 'inventory-management',
    title: 'Stok Retail, Supplier & Opname',
    shortDesc: 'Pasokan barang masuk, pencatatan HPP supplier, dan penyesuaian opname fisik.',
    iconType: 'layers',
    stage: 4,
    stageLabel: 'Tahap 4: Laporan & Tutup Shift',
    badge: 'Khusus Retail & Toko',
    businessTypes: ['retail'],
    articles: [
      {
        title: 'Mengaktifkan stok per produk',
        summary: 'Pantau sisa persediaan barang agar kasir tahu kapan harus memesan ulang.',
        steps: [
          'Buka Admin → Kelola Menu & Produk → Tab Stok & Opname.',
          'Pilih "Aktifkan Stok" pada barang yang ingin dipantau persediaannya.',
          'Hitung stok fisik di rak toko, lalu masukkan Stok Awal dan Batas Minimum Stok.',
          'Klik Simpan. Setiap ada penjualan kasir yang lunas atau kasbon, stok barang otomatis terpotong seketika.'
        ],
        targetHref: '/admin/menu?tab=stock',
        targetLabel: 'Kelola stok'
      },
      {
        title: 'Barang masuk dari supplier & pencatatan HPP',
        summary: 'Catat pengiriman dari distributor beserta harga beli modal (HPP).',
        steps: [
          'Cari produk pada halaman Stok & Opname, lalu tekan tombol "+ Barang Masuk".',
          'Masukkan jumlah barang yang diterima dari supplier.',
          'Isi Nama Pemasok / Supplier (misal: Toko Grosir Jaya, PT Sumber Pangan).',
          'Isi Harga Beli Satuan (HPP modal). Sistem otomatis menghitung total nilai pembelian barang.',
          'Centang opsi "Catat otomatis sebagai Kas Keluar Operasional" agar belanja stok tercatat di arus kas pengeluaran toko.',
          'Klik Simpan. Stok toko bertambah dan riwayat belanja modal tercatat rapi.'
        ],
        targetHref: '/admin/menu?tab=stock',
        targetLabel: 'Catat barang masuk'
      },
      {
        title: 'Melakukan stok opname fisik',
        summary: 'Menghitung stok fisik berkala untuk menemukan selisih barang hilang atau rusak.',
        steps: [
          'Pilih tombol "Stok Opname" pada produk yang akan dihitung.',
          'Hitung jumlah fisik barang nyata di rak toko, lalu masukkan angkanya (termasuk angka 0 jika benar-benar habis).',
          'Isi alasan penyesuaian (misal: "Barang rusak kemasan", "Kedaluwarsa", atau "Penghitungan akhir bulan").',
          'Klik Simpan Penyesuaian. Sistem otomatis memperbarui saldo stok dan mencatat selisihnya di riwayat pergerakan stok.'
        ],
        tips: 'Seluruh perhitungan stok tersimpan aman di penyimpanan perangkat tanpa bergantung pada koneksi internet.'
      }
    ]
  },
  {
    id: 'data-backup',
    title: 'Cadangan Data Toko (Backup JSON)',
    shortDesc: 'Unduh seluruh data produk, transaksi, dan riwayat toko ke file cadangan lokal.',
    iconType: 'shield',
    stage: 4,
    stageLabel: 'Tahap 4: Laporan & Tutup Shift',
    badge: 'Keamanan Data',
    businessTypes: ['all', 'setup'],
    articles: [
      {
        title: 'Mengunduh cadangan data toko (.json)',
        summary: 'Cadangan mencakup seluruh katalog produk, foto, riwayat transaksi, shift kasir, dan stok.',
        steps: [
          'Buka Admin → Pengaturan → Data & Cadangan.',
          'Pada bagian Backup Data Usaha, tekan tombol "Unduh Cadangan Lengkap (.json)".',
          'File cadangan akan tersimpan di folder Download perangkat Anda.',
          'Kirimkan atau simpan salinan file cadangan tersebut ke Google Drive, WhatsApp pribadi, atau flashdisk sebagai proteksi jika HP/laptop kasir rusak atau hilang.',
          'Lakukan backup cadangan secara berkala (misalnya setiap minggu atau akhir bulan).'
        ],
        targetHref: '/admin/pengaturan/data',
        targetLabel: 'Buka backup toko'
      },
      {
        title: 'Memulihkan data toko ke perangkat baru (Restore)',
        summary: 'Pindahkan seluruh riwayat toko ke HP atau komputer baru dalam 10 detik.',
        steps: [
          'Buka SakuNota di perangkat baru Anda.',
          'Buka Admin → Pengaturan → Data & Cadangan.',
          'Pada bagian Restore Data Usaha, pilih file cadangan (.json) yang sebelumnya sudah Anda simpan.',
          'Periksa pratinjau ringkasan data: jumlah transaksi, menu produk, dan riwayat shift yang terdeteksi.',
          'Tekan "Konfirmasi Pulihkan Data". Dalam hitungan detik seluruh toko Anda kembali lengkap seperti sedia kala.'
        ],
        targetHref: '/admin/pengaturan/data',
        targetLabel: 'Pulihkan data toko'
      }
    ]
  }
];
