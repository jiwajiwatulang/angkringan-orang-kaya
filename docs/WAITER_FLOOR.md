# Waiter Floor pada perangkat kasir yang sama

1. Aktifkan mode meja pada Profil Usaha, siapkan meja dan menu, lalu buka shift kasir.
2. Admin → Pengaturan POS → Waiter Floor. Isi nama pelayan dan pilih meja tugas.
3. Mulai mode pelayan. Pelayan hanya melihat meja tugas, pesanan aktif, menu, pilihan varian dan catatan pesanan.
4. Pilih meja, tambah menu/varian/jumlah, lalu Kirim Pesanan ke Kasir. Pesanan tersimpan sebagai `unpaid` dan stok direservasi melalui transaksi stok yang sama dengan POS. Tidak ada pembayaran dari layar pelayan.
5. Keluar Mode Pelayan membutuhkan PIN Admin. Setelah kembali ke kasir, bayar tagihan meja melalui alur POS biasa. Sesi Admin sebelumnya sudah diakhiri sehingga pembukaan Admin memerlukan autentikasi kembali.

Mode pelayan berlaku untuk database lokal yang sedang dipakai dan bertahan saat reload. Tab kasir/admin dengan database yang sama dialihkan ke Waiter Floor selama sesi aktif. Ini pembatasan alur aplikasi pada perangkat tepercaya; pengguna dengan akses DevTools/file browser tetap dapat memanipulasi aplikasi lokal. Tidak ada akun staf cloud atau isolasi OS.

Tambahan pesanan membuat nota belum dibayar baru pada meja yang sama. Pelayan tidak mengubah nota lama, melakukan void/refund, menerima pembayaran, melihat omzet atau mengelola pengaturan. Meja berstatus lunas perlu dikosongkan oleh kasir sebelum menerima pesanan baru.

Belum tersedia: HP pelayan terpisah, sinkronisasi jaringan, denah posisi drag-and-drop, status dapur/antar, atau daftar akun pelayan permanen.
