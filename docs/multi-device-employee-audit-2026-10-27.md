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

## Hotfix penyimpanan PIN — 27 Oktober 2026

Pesan pengguna: Data belum dapat diproses. Coba lagi. Pemeriksaan baca atas struktur MdEmployees menunjukkan kolom sesuai; agregasi format menunjukkan belum ada akun karyawan tersimpan pada saat diagnosis. Tidak membaca nilai PIN/verifier pelanggan.

Reproduksi pada Worker Cloudflare terpisah tanpa D1/secret pelanggan: PBKDF2 100.000 iterasi berhasil, 210.000 gagal dengan pesan Pbkdf2 failed: iteration counts above 100000 are not supported (requested 210000). Node dan workerd lokal tidak menerapkan pembatasan hosted yang sama, sehingga tes sebelumnya lulus.

Penyimpanan baru menggunakan format verifier versi 2 dengan tiga putaran berurutan PBKDF2-SHA256 masing-masing 70.000; total pekerjaan derivasi tetap 210.000 tanpa melebihi batas tiap pemanggilan. Ini format baru, bukan hasil hash yang identik dengan versi 1. Verifikasi server dan offline diperbarui bersama; pembacaan format 1 tetap dipertahankan untuk kompatibilitas Node/browser. Tidak ada akun produksi yang perlu dimigrasikan menurut agregasi baca saat diagnosis; tidak mengubah PIN pengguna.

Worker pemeriksaan terpisah diuji ulang memakai kode aplikasi aktual: pembuatan verifier, verifikasi PIN benar/salah di server, serta verifikasi offline benar/salah semuanya berhasil. Hasil di employee-pin-hosted-runtime.json. Worker uji dibersihkan setelah diagnosis.

Form Tambah/Ubah PIN kini mencantumkan 6–12 angka dan menampilkan kesalahan validasi/server di dalam formulir, tidak mengandalkan popup validasi browser. Pesan ini tidak dihapus oleh refresh daftar berkala. Uji browser: empat angka ditolak dengan pesan jelas, enam angka berhasil tersimpan memakai data uji lokal. Screenshot employee-pin-validation.jpg.

Tes baru mensimulasikan batas 100.000 tiap pemanggilan, memverifikasi total pekerjaan, konsistensi server/offline, penolakan PIN salah/parameter berubah, dan kompatibilitas verifier lama. Seluruh 48 tes Multi-Device dan 11 alur runtime Workers lulus; typecheck, build dan 164 aset offline lulus.
