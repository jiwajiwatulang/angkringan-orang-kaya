# Perbaikan pembukaan offline dan loading — 27 Oktober 2026

Kasir yang sudah menerima data lengkap membuka data lokal dengan akses yang masih berlaku, lalu memperbarui data di belakang layar. Navigasi antar halaman kasir/admin tidak mengulang persiapan seluruh sesi. Persiapan pertama tetap memerlukan internet dan hasil pengambilan data yang berhasil; data parsial tidak dianggap siap.

Daftar perangkat disimpan untuk dilihat kembali saat koneksi gagal. Salinan dibatasi per toko, perangkat, dan masa penghubungan. Salinan hanya memuat nama/status; tidak memuat PIN, izin persetujuan perangkat, atau kunci akses. Data lama diberi waktu penyimpanan, status Terdaftar, dan perubahan perangkat/karyawan dikunci sampai pembaruan daring berhasil. Kegagalan daftar menghentikan polling otomatis sampai dicoba lagi atau koneksi kembali. Status sehat tidak menambah banner di atas halaman.

Login menampilkan akun yang izin offlinenya masih sah lebih dulu, lalu menyegarkan daftar daring. Pilihan akun tidak dibersihkan oleh tampilan salinan sementara pada setiap polling. Kesalahan login tidak dihapus oleh polling. Waktu berakhir akses offline ditampilkan setelah nama dipilih saat offline. Akun yang belum pernah masuk dan akun kedaluwarsa tidak diberi akses offline. Penolakan sesi aktif menghapus izin offline operator tersebut; penolakan akses pemilik disimpan agar reload offline tidak membuka kembali akses yang sudah ditolak. Antrean transaksi tidak dihapus.

Animasi skeleton Royal Blue dan indikator putar pada tombol digunakan untuk kasir, sesi, perangkat, login, katalog, transaksi, shift, meja, dan daftar perangkat portal Owner. Bentuk dekoratif disembunyikan dari pembaca layar; status pendek tetap tersedia. Pengaturan kurangi gerakan dihormati. Permintaan multi-perangkat dan daftar perangkat portal Owner dibatasi 8 detik per permintaan, dengan pesan singkat dan Coba Lagi.

## Hasil pemeriksaan

- 53 tes Multi-Device lulus, termasuk local readiness, isolasi salinan daftar, penolakan akses tersimpan, batas kedaluwarsa, serta login offline/server.
- 198 pemeriksaan POS, 35 tes stabilitas/keamanan lulus.
- 11 alur Worker/D1 lokal lulus, mencakup enrollment, PIN, perpanjangan dan penolakan akses/perangkat/lisensi.
- Typecheck dan build dengan fitur Multi-Device aktif lulus. Seluruh 165 URL pada manifest tersedia dalam hasil build; antarmuka perangkat dan skeleton ikut terbangun.
- Browser nyata dengan dua origin lokal terpisah: permintaan ditunda 12 detik berakhir dengan pesan retry setelah batas 8 detik; normalisasi koneksi dan Coba Lagi memuat daftar; koneksi diputus mempertahankan daftar dengan tombol perubahan nonaktif.
- Kasir Pemilik dan Karyawan yang telah disiapkan berhasil reload offline, dengan produk tetap tersedia. Kasir Pemilik juga terbuka tanpa menunggu permintaan jaringan lambat.
- Karyawan Pagi login daring, keluar saat offline, melihat hanya akun yang telah tersimpan, melihat tanggal berakhir izin, lalu berhasil masuk lagi menggunakan PIN offline.
- Server uji menolak akses Pemilik: kasir terkunci; koneksi kemudian diputus dan halaman di-reload, akses tetap terkunci dan meminta pembaruan akses.
- Tampilan daftar tersimpan dan login diperiksa pada 390 px. Pengujian ini menggunakan Chromium dan simulasi koneksi di aplikasi lokal, bukan iPhone Safari/perangkat fisik atau pemadaman jaringan sistem operasi. Pemuatan halaman offline di produksi tetap memerlukan penyiapan aset aplikasi sebelumnya.

## Bukti

Folder outputs: offline-loading-tests.log, offline-loading-pos.log, offline-loading-stability.log, offline-loading-edge.log, offline-loading-build.log, offline-loading-typecheck.log, offline-loading-artifacts.json.

Screenshot: offline-loading-desktop.jpg, offline-loading-mobile-cache.png, offline-loading-employee-expiry.png, offline-loading-cashier-reopened.png, offline-loading-rejected-access.png. Kontrol gangguan jaringan yang terlihat hanya milik server uji lokal; tidak menjadi bagian produk.

Tidak mengirim transaksi nyata, mengganti PIN, menulis data toko D1 produksi, menghapus data pelanggan, atau menggabungkan main. Cache perangkat bukan bukti konektivitas langsung. Sesi lokal tetap tunduk pada masa berlaku akses; animasi tidak mengubah aturan lisensi atau otorisasi.
