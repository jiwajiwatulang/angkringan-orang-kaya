# Rencana pengembangan SakuNota

Tanggal: 18 Oktober 2026. Branch kerja: `codex/stability-retail-dashboard`.

## Tujuan produk

Kasir yang sederhana untuk UMKM dengan lisensi sekali bayar Rp50.000 per perangkat. Pilihan jenis usaha menyesuaikan alur dan istilah, sementara transaksi inti tetap sama. Data operasional toko berada di perangkat. Portal pengelola SakuNota berada di Cloudflare.

## Kebutuhan menurut jenis usaha

| Jenis | Alur utama | Persediaan |
|---|---|---|
| Retail | Barcode, kasir cepat tanpa meja | Jumlah unit, saldo awal, masuk/keluar, batas minimum, opname |
| Warung | Transaksi cepat, tunai/nontunai | Penghitungan stok produk dapat diaktifkan per barang |
| Kafe | Meja, takeaway, ukuran dan tambahan | Stok barang jadi tersedia; resep bahan baku belum dibuat |
| Restoran | Meja, open bill, split pembayaran | Stok barang jadi tersedia; dapur/KDS dan resep belum dibuat |

Jenis usaha dapat diganti melalui profil toko. Pergantian jenis tidak menghapus transaksi atau menonaktifkan stok produk yang sudah dipantau. Produk lama tidak otomatis diberi stok nol. Pemilik mengaktifkan penghitungan per produk setelah menghitung saldo fisik.

## Perubahan pada branch ini

- Stok lokal dengan ledger pergerakan, validasi bilangan bulat, pencegahan stok minus, dan penguncian transaksi IndexedDB.
- Pesanan tersimpan mengurangi stok, termasuk open bill. Perubahan pesanan belum dibayar mengubah selisih jumlah saja. Pembayaran berikutnya tidak mengurangi stok lagi.
- Pembatalan pesanan belum dibayar mengembalikan stok. Refund uang tidak otomatis mengembalikan barang; pemilik mencatat retur setelah memeriksa kondisi fisiknya.
- Opname menolak penyimpanan apabila saldo berubah sejak formulir dibuka.
- Backup/restore menyertakan stok dan ledger; cadangan lama tetap dapat dibaca.
- Database demo `SakuNotaDemoDB` terpisah dari `AngkringanDB`. Pengaturan demo dan kanal sinkronisasi antar-tab juga dipisahkan.
- Demo berisi contoh penjualan tujuh hari untuk memperlihatkan grafik. Seluruh contoh tersebut bukan transaksi usaha nyata.
- Dashboard menampilkan nota lunas, rentang harian 24 jam, bulan berjalan dari tanggal satu, serta tanggal lokal perangkat. Split pembayaran dihitung dari entri pembayarannya.
- Panduan barcode, stok, backup, dan printer disesuaikan dengan fitur nyata. Klaim tombol yang belum tersedia dihapus.
- Respons aktivasi mengirim jenis lisensi, nama usaha, dan waktu kedaluwarsa; browser menyimpan metadata untuk penggunaan offline.
- Trial offline tanpa metadata aktivasi lengkap ditolak. Webhook tidak membatalkan pesanan lunas karena notifikasi terlambat, dan nominal tidak dibulatkan sebelum validasi.
- Kredensial server tidak lagi diekspor ke browser melalui portal Owner. Halaman konfigurasi hanya menampilkan tersedia/belum tersedia.
- Kata sandi alternatif yang tertanam dalam kode autentikasi dihapus; autentikasi memakai konfigurasi server.
- Service worker menunggu seluruh aset sebelum aktivasi dan tidak mengganti halaman stok offline dengan dashboard.
- Build kembali memeriksa kesalahan TypeScript, bukan mengabaikannya.
- Permintaan HTTP Owner tanpa token ditolak di router; webhook bersamaan diuji agar satu pesanan menghasilkan satu lisensi.
- Refund tunai dihitung satu kali pada shift pengembalian uang, dengan penjagaan buka/tutup shift bersamaan.
- Tanggal baru disimpan dalam ISO; data tanggal lama tetap ditampilkan tanpa `Invalid Date`.
- Pelunasan open bill mencatat payment, uang diterima dan kembalian. Klik bayar ganda dijaga di UI dan dengan kunci idempotensi.

## Arah tampilan

Referensi: https://pos.sentrik.co/ . Arah yang dipakai adalah halaman terang, ruang yang lapang, navigasi konsisten, tabel yang mudah dibaca, dan grafik garis dengan detail interval. Identitas, harga, serta model penyimpanan SakuNota tetap dipertahankan. Penyesuaian saat ini mencakup hero, dashboard, dan halaman stok; belum merupakan penyalinan seluruh antarmuka Sentrik.

## Model bisnis

Pendapatan inti adalah pembelian baru lisensi per perangkat, bukan pendapatan langganan. Contoh pendapatan kotor: 100 lisensi = Rp5 juta; 1.000 = Rp50 juta; 10.000 = Rp500 juta. Angka ini skenario, bukan penjualan aktual.

Biaya transaksi kasir tidak meningkat satu banding satu dengan transaksi server karena transaksi toko diproses lokal. Namun hosting aset, D1 lisensi, Worker API, biaya gateway, dukungan, distribusi, dan akuisisi pelanggan tetap perlu dihitung. Margin kotor >92% merupakan target sampai biaya variabel dibuktikan; pada harga Rp50.000, biaya variabel per lisensi harus di bawah Rp4.000 untuk melewati margin tersebut.

Peluang tambahan: bundling printer/scanner, pemasangan dan pelatihan, serta modul tambahan dengan lingkup terpisah. HPP, akuntansi laba, gudang, pembelian pemasok, resep, multi-cabang dan sinkronisasi multi-kasir belum dinyatakan selesai.

## Tahap rilis

1. Jalankan tes regresi, tes API lokal, validasi build offline, typecheck, dan build final.
2. Uji UI desktop/mobile serta perpindahan demo. Catat hasil dan batas pengujian.
3. Uji sandbox Midtrans nyata dengan kredensial sandbox terpisah; uji printer, scanner, dan kamera fisik pada perangkat sasaran.
4. Cadangkan D1 produksi dan data lokal toko uji sebelum rollout. Siapkan rotasi secret yang telah dibagikan tanpa memutus lisensi aktif.
5. Deploy ke staging dahulu; smoke test domain, pembelian, trial, aktivasi, dan offline pada origin staging.
6. Lakukan rollout produksi setelah hasil diterima. Pantau kegagalan pembayaran dan aktivasi.

## Batas migrasi dan rollback

Schema IndexedDB naik dari versi 8 ke 9 untuk menambah ledger stok. Migrasi bersifat penambahan dan tidak menghapus tabel lama. Sesudah sebuah perangkat memakai v9, bundle lama yang hanya mengenal v8 tidak boleh digunakan sebagai rollback karena dapat memicu VersionError. Gunakan perbaikan maju atau bundle rollback yang tetap mengenal schema v9, dan simpan backup JSON sebelum rollout.

Database lokal terpisah menurut origin dan profil browser. `sakunota.my.id`, `www.sakunota.my.id`, preview localhost, dan aplikasi Android dapat memiliki data berbeda. Memindahkan kode atau database D1 tidak memindahkan transaksi kasir; gunakan backup/restore toko.
