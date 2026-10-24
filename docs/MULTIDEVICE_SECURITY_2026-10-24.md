# Perbaikan lima temuan audit — 24 Oktober 2026

Dasar aplikasi: rilis `2d63c52`, versi Workers `ffb77a5d-58d3-4049-817f-646a52a271e4`. Cabang perbaikan: `fix/multidevice-authorization-hardening`.

## Perubahan

| Temuan audit | Perbaikan | Bukti regresi |
| --- | --- | --- |
| Pembayaran baru langsung diklaim sebagai pengembalian | Pembayaran baru biasa wajib berstatus completed dan tidak boleh membawa data pengembalian. Refund wajib berasal dari pembayaran diterima; perubahan refund tetap memerlukan pemilik. Impor riwayat oleh pemilik tetap didukung. | Handler HTTP menolak pembayaran refunded baru dari kasir. Verifikasi dan refund pemilik pada pembayaran sebenarnya tetap berhasil. |
| Gerakan stok untuk produk di luar nota | Validasi mencakup semua produk dalam gerakan stok, termasuk yang tidak ada pada nota. Jenis dan kuantitas gerakan wajib sesuai perubahan reservasi. Gerakan saling meniadakan tidak dapat menyamarkan produk tambahan. Kasir tidak dapat menandai nota sebagai riwayat lama untuk melewati reservasi stok. | Pengembalian produk lain, gerakan plus/minus penyeimbang, dan perubahan tanda riwayat kasir ditolak. Koreksi jumlah pada nota belum dibayar serta pembatalan pemilik mengembalikan stok sesuai kuantitas. |
| Kasir mengesahkan QRIS sendiri | Pengesahan pembayaran nontunai baru memerlukan pemilik. Status bukti dan pembayaran harus sesuai; bukti tidak dapat dipindahkan ke pembayaran lain. Status verifikasi nota diturunkan dari pembayaran diterima, bukan klaim nota dari klien. | Pengesahan QRIS oleh kasir ditolak, klaim verifikasi nota tidak dipercaya, unggah bukti kasir dan pengesahan pemilik tetap berhasil. |
| Penanda penghapusan menyembunyikan nota lunas | Penanda penghapusan ditolak pada catatan keuangan, untuk kasir maupun pemilik. Pembatalan/pengembalian tercatat tetap menjadi cara koreksi. Penghapusan barang pada nota belum dibayar dan katalog/meja yang diizinkan tetap didukung. | Percobaan penghapusan nota, pembayaran, shift, gerakan stok, serta log keuangan ditolak tanpa menambah peristiwa atau mengubah data kanonis. |
| Pemulihan macet menghalangi file pengganti | Struktur cadangan diperiksa sebelum ditahapkan. Pemilik dapat menyimpan dan membatalkan pekerjaan pemulihan. Arsip asli disimpan dalam perangkat dan ditawarkan sebagai unduhan; transaksi belum terkirim tidak dihapus. Pekerjaan punya identitas tersendiri agar respons terlambat tidak menghidupkan pekerjaan lama atau menghapus pekerjaan pengganti. | Validasi struktur, pembatalan pekerjaan lama yang tidak valid, larangan pembatalan oleh kasir, serta respons terlambat setelah pekerjaan diganti diuji. Browser membuktikan unduhan arsip pembatalan dan pemulihan file pengganti. |

## Homepage dan Buku Panduan

Homepage memperbarui informasi privasi/cadangan dan kebutuhan internet pada usaha beberapa perangkat. FAQ menjelaskan pembagian akses pemilik-kasir, pemeriksaan dana QRIS/transfer, serta koreksi nota dan pemulihan. Tautan Panduan Data & Cadangan dapat dibuka langsung.

Buku Panduan menambahkan langkah pemeriksaan pembayaran nontunai, batas akses kasir, koreksi nota/stok, serta melanjutkan atau membatalkan pemulihan. Dijelaskan bahwa membatalkan pekerjaan tidak menarik kembali transaksi yang sudah diterima. Panduan Retail dan perilaku barang baru tersimpan setelah pembayaran tetap dipertahankan. Tidak ada perombakan dashboard atau UI pemindai barcode.

## Validasi sebelum rilis

- `npm test`: **198 lulus**.
- `npm run test:stability`: **35 lulus**.
- `npm run test:multidevice`: **44 lulus**, termasuk permintaan HTTP bertanda tangan yang dimodifikasi dan pemulihan bersamaan dengan pembatalan.
- TypeScript dan build produksi dengan `NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE=enabled`: lulus.
- Workers/D1 lokal: lulus untuk aktivasi, pemasangan kasir, otorisasi dan pencabutan akses.
- Browser aktual dengan data sintetis: dashboard lama, transaksi POS, cadangan lengkap, pemulihan yang dibatalkan dengan arsip dipertahankan, file pengganti, dan pemisahan demo lulus.
- Homepage dan Buku Panduan: FAQ, tautan, pencarian serta artikel dapat dibuka pada lebar **390 dan 1365 piksel**, tanpa halaman melebar atau error JavaScript.
- Manifest offline: seluruh **164** URL tersedia dan cocok dengan versi service worker. Paket Worker `deploy --dry-run` lulus tanpa mengubah produksi.
- Tidak menggunakan transaksi pelanggan sebagai data uji; tidak menjalankan migrasi atau reset data usaha.

Tes server penolakan dan alur sah berada pada `tests/multidevice-mutation-guards.test.ts`. Tes pemulihan berada pada `tests/multidevice-recovery.test.ts` dan `tests/multidevice-regressions.test.ts`.

## Batas dan kompatibilitas

Perbaikan mencegah permintaan manipulasi berikutnya. Perbaikan tidak otomatis menghapus atau menulis ulang transaksi produksi yang mungkin pernah dimasukkan sebelum patch; audit data aktual memerlukan pemeriksaan terpisah. Riwayat impor pemilik tetap dianggap tindakan pemilik yang berwenang. Tidak ada klaim bahwa seluruh bagian aplikasi bebas dari kemungkinan bug lain.

Arsip pemulihan yang dibatalkan tetap disimpan di perangkat, dengan tombol untuk mengunduh ulang pembatalan terakhir. Simpan file sebelum mengganti atau menghapus data perangkat. Respons pengiriman yang sudah berjalan mungkin sudah diterima server saat pengguna membatalkan pekerjaan; mengulang arsip memakai ID asli dan tidak menghitung transaksi diterima dua kali.

## Deployment

Menunggu publikasi dan verifikasi domain produksi. Deploy menggunakan `--keep-vars` agar variabel, binding database, dan fitur beberapa perangkat tidak dinonaktifkan.
