# Audit dua perangkat — 27 Oktober 2026

## Temuan dan perbaikan

| Prioritas | Temuan | Hasil |
| --- | --- | --- |
| P1 | Saat sesi karyawan tersimpan ditolak server setelah akun dinonaktifkan, pembukaan ulang dapat terjebak pada Coba Lagi. | Sesi operator dibersihkan dan kembali ke login; transaksi yang belum terkirim dipertahankan. |
| P2 | Perangkat terhubung tanpa akun karyawan menampilkan dropdown kosong dan tombol masuk tidak berguna. | Pesan jelas meminta Owner menambahkan nama dan PIN; formulir tampil setelah ada akun aktif. |
| P2 | Nama yang baru dibuat Owner tidak muncul pada halaman login yang sudah terbuka. | Muat ulang otomatis setiap 10 detik saat halaman terlihat, saat fokus/koneksi berubah, serta tombol Perbarui Daftar. Pilihan yang sudah tidak aktif dibersihkan. |
| P2 | Gangguan jaringan tanpa akun offline tersimpan tampak seperti daftar karyawan kosong. | Gangguan memuat nama dibedakan dari daftar kosong; akses offline tetap membutuhkan akun yang pernah diverifikasi. |
| P3 | Data Terakhir Diterima selalu memenuhi bagian atas halaman. | Status normal tidak dirender. Bar Owner hilang saat tidak ada masalah. Pesan offline, antrean, kegagalan, pemeriksaan stok/pemulihan tetap ada; Ganti Karyawan tetap tersedia pada Kasir. |

## Arti screenshot pengguna

Perangkat kedua berperan sebagai Kasir, sedangkan bagian Karyawan pada Pemilik kosong. Penghubungan perangkat memberi akses perangkat; akun karyawan perlu nama dan PIN sendiri. Nama perangkat bukan akun karyawan. Tidak membuat PIN atau akun otomatis pada toko pengguna.

Langkah pengguna: di perangkat Pemilik, Pengaturan POS → Perangkat & Karyawan → Tambah Karyawan → isi Nama dan PIN 6–12 angka → Simpan. Di HP Kasir, nama akan muncul otomatis atau lewat Perbarui Daftar; pilih nama dan masukkan PIN karyawan, bukan PIN Admin 4 angka.

## Validasi

- 198 pemeriksaan POS, 35 tes stabilitas/keamanan, 46 tes Multi-Device lulus.
- 11 pemeriksaan runtime Workers lokal: enrollment, pairing, PIN, penerbitan/perpanjangan akses dan penolakan hak tidak sah.
- Typecheck dan build fitur aktif; kesiapan 164 aset offline.
- Browser memakai dua penyimpanan origin lokal terpisah dengan server uji: perangkat sudah terhubung tanpa akun → pesan kosong; tambah Kasir Uji melalui UI Owner → pilihan otomatis muncul tanpa reload; login PIN berhasil; nonaktifkan akun → reload Kasir kembali ke login tanpa Coba Lagi. Tampilan kosong diperiksa pada 390px.
- Screenshot: multidevice-audit-empty-login-mobile.jpg dan multidevice-audit-cashier-login-success.jpg di outputs.

## Batas dan perlindungan data

Baseline diambil dari cabang rilis produksi terbaru fix/dashboard-mobile-polish (commit aplikasi 6324b74; dokumentasi 9db6e0d), mempertahankan perbaikan dashboard, keamanan, pemulihan dan panel pembayaran yang sudah dirilis. Tidak menggunakan checkout lama untuk menimpa rilis baru. Tidak menulis D1, membuat akun, mengirim transaksi, mengganti PIN, atau melepas perangkat pelanggan produksi. Tidak mengubah dashboard, perhitungan finansial maupun struktur penyimpanan pada perbaikan ini. Main tidak di-merge.

Uji origin lokal bukan dua perangkat fisik dan bukan Safari iPhone. Audit ini tidak membuktikan tidak ada semua kemungkinan bug. Kegagalan jaringan dan penolakan akses diuji melalui regresi lokal; tampilan pada Safari fisik dan data toko pengguna belum dioperasikan langsung.
