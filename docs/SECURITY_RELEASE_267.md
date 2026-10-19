# Pengamanan SakuNota v2.6.7

Ruang lingkup: pengamanan lisensi, pemisahan demo, otorisasi API owner, dan keluaran cetak. Aturan satu perangkat satu lisensi tetap berlaku. Data toko tetap di IndexedDB perangkat; backend lisensi tetap di Cloudflare.

## Perubahan

- Semua tindakan API owner memverifikasi sesi, termasuk sinkronisasi pembayaran dan logout. Respons API tidak disimpan di cache.
- Izin offline memakai tanda tangan asimetris dan kunci perangkat yang tidak dapat diekspor. Mengubah status lisensi di localStorage tidak memberi izin transaksi. Aktivasi ganda dilindungi pembaruan database bersyarat.
- Instalasi lama memerlukan internet sekali pada browser asal untuk memigrasikan bukti lisensi yang sah. Tidak perlu membeli ulang. Data toko tidak dihapus.
- Gangguan jaringan, server, atau pembatasan permintaan tidak membatalkan izin offline yang masih sah. Penolakan eksplisit server tidak boleh berubah menjadi izin offline.
- Demo menggunakan database terpisah, batas 30 menit dan 50 pesanan baru, serta penanda URL yang konsisten. Pemulihan backup toko ke demo diblokir.
- Status beta tidak lagi mengungkap kunci lisensi atau identitas perangkat melalui pencarian nomor telepon.
- Teks cetak di-escape, perintah kontrol dari masukan dibersihkan, dan iframe cetak tidak mengizinkan skrip. Halaman mendapat header keamanan.
- Pembatasan permintaan diterapkan pada endpoint publik berisiko; webhook Midtrans tidak ikut dibatasi aturan ini.

## Validasi rilis

Hasil: npm test 198 lulus; npm run test:stability 24 lulus. Build, pemeriksaan 151 URL offline, dan Wrangler dry-run lulus. Uji Chrome dengan profil sementara meliputi checkout demo, cetak aman, normalisasi URL, pemisahan database, muat ulang offline, dan kedaluwarsa demo; seluruhnya lulus tanpa exception halaman. Pengujian otomatis juga mencakup migrasi lisensi lama, pemalsuan sesi, aktivasi bersamaan, backup/restore, dan pembatasan akses waiter.

## Batas verifikasi

Pembayaran Midtrans produksi dan printer fisik Bluetooth belum diuji dengan transaksi/perangkat nyata. Pengujian cetak dilakukan di Chrome dan generator teks printer. Lisensi yang terus offline tidak dapat menerima pencabutan secara langsung. Pemilik sistem operasi masih dapat memodifikasi aplikasi/browser; aplikasi web lokal tidak memberikan jaminan anti-pembajakan mutlak. Kredensial yang pernah dibagikan di percakapan perlu dirotasi oleh pemilik akun.
