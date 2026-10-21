# Smart Add Retail v1.0 — laporan implementasi

Tanggal: 21 Oktober 2026. Perubahan lokal; belum di-deploy ke produksi.

## Pengalaman pengguna

- Tambah Barang hanya tersedia pada jenis usaha Retail, untuk desktop, tablet,
  HP tegak dan mendatar. Barcode yang ada tidak diubah.
- Foto Produk atau Isi Manual → periksa Nama Barang → isi Harga Jual dan Jumlah
  → Tambah ke Keranjang → selesaikan pembayaran.
- Status ringkas: Mengenali produk…, Produk ditemukan, Foto belum terbaca.
  Foto Ulang dan Isi Manual tersedia tanpa menampilkan skor atau detail engine.
- Persiapan pengunduhan hanya di Admin → Pengaturan → Foto Produk Retail.
- Halaman `/panduan` mempunyai Panduan Singkat Retail dan artikel khusus alur
  baru, persiapan foto, kasbon, barang yang sudah ada, serta stok.

## Integritas transaksi

Produk dan pelunasan tersimpan dalam satu transaksi database. Kegagalan transaksi
membatalkan keduanya. Kunci pembayaran yang sama tidak membuat produk ganda.
Nama dinormalisasi untuk pencocokan produk. Produk lama dengan harga/pilihan/stok
yang perlu diperiksa tidak diam-diam ditimpa; kasir diarahkan memilih katalog.
Barang baru tidak mengaktifkan stok secara otomatis. Jumlah belanja bukan saldo
stok fisik. Pemilik melengkapi barcode, kategori dan stok lewat Katalog & Stok.

Kasbon menyimpan foto/data barang sebagai bagian nota, bukan produk katalog.
Pembayaran sebagian tidak menerbitkan katalog. Pelunasan memindahkan referensi
barang ke katalog, sedangkan pembatalan tidak membuat produk. Draft nota bertahan
dalam backup/restore. Perubahan belum membutuhkan migrasi versi database karena
penambahan hanya properti data, bukan indeks/tabel baru.

## Pengenalan foto dan privasi

Tesseract.js 7 membaca tulisan Latin pada kemasan, sepenuhnya di perangkat.
Unduhan opsional sekitar 10 MB berasal dari aset aplikasi sendiri, bukan CDN
runtime. Seluruh checksum diperiksa sebelum penyimpanan; kesiapan baru dicatat
setelah worker berhasil menjalankan pengenalan lokal. Aset fitur terpisah dari
paket offline dasar dan dipertahankan saat cache aplikasi diperbarui.

Saran nama tetap dapat salah, terutama pada kemasan berkilau, tulisan dekoratif,
foto buram atau terpotong. Nama harus diperiksa kasir dan harga diisi sendiri.
Tidak ada klaim pengenalan merek, pencocokan katalog global, harga otomatis, atau
akurasi sempurna. Kamera fisik, izin kamera dan keyboard perangkat Android/iOS
masih perlu uji penerimaan di perangkat sasaran sebelum rilis.

## Validasi

- Prisma Client berhasil digenerasikan; typecheck dan build produksi lulus.
- Lint pada file baru lulus; 150 URL pada ekspor offline terverifikasi.
- Tes utama: 198 lulus. Ekspektasi pesan penolakan kode akses diselaraskan dengan
  pesan aplikasi; penolakan akses tidak diubah.
- Tes stabilitas dan regresi: 30 lulus, mencakup checkout atomik, retry pembayaran,
  produk ganda, kasbon/cicilan/lunas, pembatalan, rollback stok gagal,
  backup/restore draft, validasi foto dan data, serta cache offline opsional.
- Uji browser Chromium pada 1440×1000, 390×844, 844×390, dan 1024×768.
- Checkout melalui browser saat offline berhasil dan produk baru hanya muncul setelah pembayaran; tambah manual berfungsi; fitur tersembunyi pada Resto, Kafe, dan Warung. Pengenalan contoh gambar
  bertulisan KOPI INSTAN ORIGINAL 20 g berhasil ketika browser dibuat offline.
- Foto kosong memunculkan Foto belum terbaca; Isi Manual tetap dapat dipakai.
- Halaman Panduan Singkat Retail terverifikasi, tanpa exception halaman.
- Bukti screenshot dan log lokal: `/workspace/retail-review/`.

Uji browser memakai profil sementara dan backend preview dengan database memori.
Tidak mengakses pembayaran nyata atau database produksi.

## Penyederhanaan navigasi dan akses HP

Kolom Perusahaan serta Cerita Kami di footer Panduan dihapus. Tentang Kami
menjadi tautan terakhir pada Bantuan. Navigasi Panduan dan menu utama HP memakai
urutan Beli Rp50.000, Trial 7 Hari, Buku Panduan, Tentang Kami tanpa ikon.
Tautan trial menuju formulir pendaftaran yang sudah ada. Tata letak diperiksa
pada lebar 360, 390, 768, dan 1440 piksel tanpa gulir horizontal; formulir trial
terbuka dari kedua menu dan browser tidak mencatat exception.

Pada HP, Tambah Barang berada di Kasir → tab Menu, di bawah pencarian,
khusus jenis usaha Retail. Untuk latihan, pilih Retail pada banner demo kasir.
Persiapan foto berada di Admin → Pengaturan → Foto Produk Retail. Perubahan
ini masih lokal dan belum tersedia pada situs produksi sebelum deployment.

## Perbaikan Ambil Foto

Bukti pembayaran QRIS/Transfer dan Foto Produk Retail sekarang memakai kamera
langsung dengan pratinjau video. Atribut pemilih file `capture` sebelumnya hanya
merupakan petunjuk bagi browser, sehingga beberapa browser tetap membuka galeri.
Tombol Dari Galeri tetap memakai pemilih file terpisah. Akses kamera dihentikan
setelah foto diambil, dialog ditutup, atau pengguna beralih ke galeri. Izin yang
ditolak menampilkan petunjuk izin tanpa otomatis membuka galeri. Kamera tidak
meminta akses mikrofon. Pengenalan Retail dimulai setelah dialog kamera ditutup.

Uji Chromium dengan perangkat kamera simulasi memverifikasi video, pengambilan
foto, bukti pembayaran, dialog HP, penghentian track kamera, pilihan galeri, dan
penolakan izin tanpa exception halaman. Kamera fisik tetap perlu diperiksa pada
perangkat pengguna. Tes utama 198 lulus, stabilitas 30 lulus, typecheck, build,
pemeriksaan ekspor offline, regresi browser Retail, dan Wrangler deploy dry-run
lulus. Deploy produksi memerlukan autentikasi Cloudflare yang belum tersedia
di environment saat pemeriksaan awal.

## Perbaikan persiapan foto dan batal galeri

Paket pengenalan perlu disiapkan sekali per browser/perangkat. Tambah Barang
sekarang membedakan belum disiapkan dari browser yang tidak mendukung, dan
menawarkan Siapkan Pengenalan Foto langsung tanpa masuk Admin. Unduhan sekitar
10 MB tetap atas tindakan pengguna; setelah unduhan dan pemeriksaan mesin lokal
berhasil, foto yang sudah dipilih langsung dibaca. Persiapan Admin memakai
prosedur yang sama dan menunggu service worker siap tanpa langsung meminta
pengguna membuka ulang aplikasi. Jika gagal, foto dan isian manual tetap ada.

Event cancel dari input file atau dialog kamera tidak boleh menutup dialog
Tambah Barang. Penutupan hanya diproses bila sumber event adalah dialog itu
sendiri. Tombol tutup dan Escape pada dialog tetap bekerja. Batal galeri tidak
menghapus nama, harga, jumlah, atau foto yang sudah dipilih.

Navigasi publik tetap Beli Rp50.000, Trial 7 Hari, Buku Panduan, Tentang Kami
tanpa ikon. Footer Panduan tidak memiliki kolom Perusahaan/Cerita Kami;
Tentang Kami berada paling bawah pada Bantuan.

Validasi patch: 198 tes utama dan 32 tes stabilitas lulus; lint berkas yang
diubah, build dengan TypeScript, 150 URL offline, dan Wrangler dry-run lulus.
Preview browser memverifikasi formulir/isian tetap ada setelah pemilih galeri
ditutup, serta persiapan langsung berhasil menjalankan mesin lokal hingga status
siap offline. Uji ini bukan pengganti uji pemilih foto pada HP fisik pengguna.
