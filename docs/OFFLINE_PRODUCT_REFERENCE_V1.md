# Referensi produk offline v1

Paket awal berisi 150 referensi pangan kemasan dari Open Food Facts contributors,
termasuk beberapa varian Indomie. Ini referensi awal untuk uji pemakaian, bukan
katalog lengkap produk Indonesia dan bukan model pengenal bentuk/logo kemasan.

## Alur pengguna

- Barcode yang sudah ada di katalog toko tetap memakai harga dan stok toko.
- Pada Retail, barcode baru membuka Tambah Barang. Jika referensinya tersedia,
  nama dan ukuran disarankan; pengguna memeriksa lalu mengisi harga jual.
- Foto kemasan mencoba membaca barcode terlebih dahulu pada browser yang
  mendukung. Jika tidak, OCR membaca tulisan dengan mode teks tersebar, menyaring
  baris lemah, dan mencoba penyesuaian kontras bila bacaan awal tidak memadai.
- Hasil tulisan dicocokkan dengan merek, kata varian, dan ukuran dalam referensi.
  Maksimal tiga pilihan ditampilkan. Tidak ada varian atau barcode yang ditentukan
  otomatis hanya berdasarkan kemiripan tulisan. Nama tetap dapat diedit.
- Barcode dari pemindaian nyata disimpan bersama produk hanya setelah nota lunas.
  Barcode tidak disalin dari saran tulisan, karena ukuran/varian dapat ambigu.
- Barang di luar cakupan tetap bisa dicatat manual. Stok tidak aktif otomatis.

## Data dan privasi

Snapshot `public/product-reference/indonesia-v1.json` sekitar 15 KB dalam bentuk
ringkas; ikut paket offline dasar tanpa langkah persiapan baru. Pengenalan tulisan
tetap memakai persiapan OCR sekali sekitar 10 MB. Foto tidak diunggah dan runtime
tidak menghubungi API eksternal. Katalog dan harga toko tetap di IndexedDB.

Data berasal dari dua halaman API Open Food Facts bertag Indonesia (200 baris).
50 baris dikeluarkan karena nama/merek kurang lengkap, GTIN tidak valid,
perbedaan ukuran, atau multipack yang ambigu. Sumber, tanggal, dan URL kueri
tersimpan dalam snapshot. Data komunitas tetap memerlukan pemeriksaan pengguna.

Snapshot adaptasi didistribusikan di bawah ODbL 1.0 dengan atribusi Open Food Facts
contributors. Metadata dan NOTICE mencantumkan tautan lisensi serta data unduhan.
Referensi publik dipisahkan dari database toko. Tidak memuat harga atau gambar.

Pembaruan snapshot hanya melalui `node scripts/update-product-reference.mjs`;
build/deploy tidak mengambil data dari pihak ketiga. Pemeriksaan sebelum menulis
mempertahankan snapshot lama jika sumber gagal atau data tidak memadai.

## Validasi yang diperlukan

Uji checksum GTIN, perbedaan UPC/EAN dengan nol awal, foto dengan salah baca satu
huruf, nama generik tanpa merek/varian, ukuran berbeda, transaksi cicilan/lunas,
rollback, dan pemulihan data. Uji browser menggunakan foto kemasan nyata dan
pemindaian kode uji; transaksi produksi tidak digunakan. Kelulusan tes tidak
menetapkan persentase akurasi untuk semua kemasan/HP.

Hasil: 198 tes utama dan 35 tes stabilitas lulus. Browser preview memverifikasi
kode 0089686010947 yang belum ada di katalog toko mengisi Indomie Mi Goreng
Original 85 g tanpa mengisi harga. Uji OCR pada gambar kemasan nyata dari Open
Food Facts (`front_en.72.400.jpg` untuk kode tersebut) belum menghasilkan
merek/varian yang memadai. Rilis ini tidak mengklaim foto depan Indomie selalu
dikenali. Referensi membantu setelah tulisan terbaca; barcode tetap jalur
identifikasi yang lebih pasti dalam cakupan data.
