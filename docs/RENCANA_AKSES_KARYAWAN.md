# Rencana akses kasir dan pemilik toko — belum diterapkan

## Bedakan pemilik toko dan pengelola SakuNota

Admin toko adalah pemilik/manajer usaha, dengan data operasional di IndexedDB perangkat. Portal `/owner` di Cloudflare adalah pengelola bisnis SakuNota untuk lisensi, pembayaran lisensi dan trial. Portal itu bukan dashboard penjualan semua toko.

## Navigasi yang disarankan

Kasir depan: **Kasir · Pesanan · Shift Saya · Perangkat**.

Menu jualan sudah ada di dalam layar Kasir, sehingga tidak perlu navigasi Menu/Katalog kedua. Katalog Admin adalah tempat mengedit produk; katalog pada kasir adalah pemilihan barang untuk dijual. Label yang sama saat ini membuat dua fungsi itu terasa bertumpuk.

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

Rencana role kasir ini belum mengubah navigasi atau izin kasir yang ada. Admin masih memakai autentikasi PIN yang sudah tersedia. Waiter Floor adalah alur terbatas yang sudah ada pada perangkat sama. Penggabungan Katalog & Stok hanya menyatukan tempat pengelolaan produk dan persediaan; tidak mengubah hak akses staf.
