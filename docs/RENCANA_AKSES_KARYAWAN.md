# Akses kasir dan pemilik toko

## Diterapkan pada v2.6.7

- Navigasi depan: **Kasir · Menu · Pesanan · Shift Saya**, serta **Meja** untuk mode meja. Tombol tengah Kasir/Katalog dan tautan backoffice pada navigasi karyawan dihapus. Printer dan Admin tersedia sebagai tindakan ringkas.
- Kasir adalah keranjang dan pembayaran; Menu untuk memilih produk, varian dan barcode. Kedua layar berbagi keranjang yang sama.
- Pesanan kasir mencakup tagihan belum lunas yang masih perlu dilayani dan transaksi shift aktif pada perangkat. Transaksi historis, void, dan transaksi lunas shift lain tidak disajikan oleh fungsi pembacaan kasir.
- Kembali ke POS mengakhiri sesi Admin. Halaman Admin memeriksa sesi/PIN; tab lama diperiksa kembali ketika fokus dan secara berkala. Tindakan produk, stok, impor, ekspor, reset dan riwayat penuh memeriksa otorisasi juga. Demo backoffice tetap dapat dicoba pada database demo terpisah.
- Refund dari POS selalu memerlukan PIN Admin, meskipun pengaturan lama enablePin dimatikan. Persetujuan refund hanya untuk tindakan itu; tidak membuka sesi backoffice. Percobaan PIN gagal dibatasi.
- **Shift Saya** merujuk shift aktif perangkat beserta nama operatornya. Akun dan PIN per karyawan belum dibuat. Ini belum merupakan identifikasi personal staf atau dukungan beberapa perangkat.
- Lisensi tetap satu perangkat. Usulan dua perangkat/satu usaha dan sinkronisasi ditahan sesuai keputusan pemilik.

Bagian berikut adalah rancangan lanjutan; belum seluruhnya diterapkan.

## Bedakan pemilik toko dan pengelola SakuNota

Admin toko adalah pemilik/manajer usaha, dengan data operasional di IndexedDB perangkat. Portal `/owner` di Cloudflare adalah pengelola bisnis SakuNota untuk lisensi, pembayaran lisensi dan trial. Portal itu bukan dashboard penjualan semua toko.

## Navigasi yang disarankan

Rancangan awal memakai Perangkat; keputusan akhir v2.6.7 adalah **Kasir · Menu · Pesanan · Shift Saya**, dengan tombol Printer terpisah.

Keputusan akhir memisahkan Menu (pemilihan produk) dari Kasir (keranjang/pembayaran) dengan satu keranjang bersama. Katalog Admin tetap menjadi tempat mengedit produk, foto, harga dan persediaan.

| Aksi | Kasir/karyawan | Pelayan | Admin toko |
|---|---|---|---|
| Cari produk, scan barcode, tambah pesanan | Ya | Ya, pada meja tugas | Ya |
| Terima pembayaran | Ya, pada shift aktif | Tidak | Ya |
| Lihat pesanan operasional | Shift berjalan; tanpa laporan omzet lintas shift | Meja tugas | Semua |
| Riwayat transaksi lama dan ekspor laporan | Memerlukan izin Admin | Tidak | Ya |
| Buka/tutup shift sendiri, catat kas | Ya sesuai izin; tetap blind closing | Tidak | Ya |
| Ubah harga, katalog, stok, opname | Tidak | Tidak | Ya |
| Diskon di atas batas, void, refund | Persetujuan Admin tercatat | Tidak | Ya |
| Hubungkan printer/perangkat | Ya, sesuai izin | Tidak | Ya |
| Backup/restore, pajak, profil, keamanan | Tidak | Tidak | Ya |

Pengaturan depan diganti nama menjadi **Perangkat**, bukan pintu ke seluruh Admin. Contohnya printer dan kesiapan offline. Jangan memberikan backup/restore atau reset data kepada kasir.

## Rencana implementasi

1. Daftar operator dengan identitas, role dan PIN masing-masing. PIN karyawan berbeda dari PIN Admin.
2. Sesi aktif menyimpan identitas/role; shift, pesanan, pembayaran, kas dan audit terhubung ke operator.
3. Periksa izin pada fungsi tindakan, bukan hanya menyembunyikan tombol atau tautan. Pembukaan URL Admin, impor, mutasi stok, ekspor, void/refund dan perubahan harga harus melewati pemeriksaan yang sama.
4. Persetujuan Admin bersifat per tindakan, berumur pendek dan mencatat alasan/identitas pemberi persetujuan. Selesai menyetujui, kembali ke sesi kasir; jangan meninggalkan sesi Admin terbuka.
5. PIN disimpan dalam bentuk hash dengan salt dan pembatasan percobaan. Uji akses melalui URL langsung, tab lama, reload, offline, pergantian operator dan pencabutan izin.

Pada browser/perangkat tepercaya, ini pembatasan operasional aplikasi. IndexedDB masih berada pada profil browser yang sama; isolasi keras dari pengguna yang menguasai DevTools atau file browser membutuhkan lapisan tambahan, misalnya kiosk/isolasi OS atau layanan yang menegakkan akses di server. Jangan menjanjikan bahwa menyembunyikan menu saja sudah mengisolasi data.

## Kondisi sekarang

Navigasi dan pembatasan operasional v2.6.7 dijelaskan di atas. Pengelolaan akun/izin individual karyawan masih menjadi pengembangan lanjutan. Waiter Floor tetap menggunakan perangkat yang sama.
