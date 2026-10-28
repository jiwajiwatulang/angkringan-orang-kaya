# Perbaikan akses offline dan pemulihan aplikasi terpasang — 28 Oktober 2026

## Temuan audit yang ditutup

- P1 akun nonaktif: daftar aktif daring merekonsiliasi izin offline, mencabut akun yang hilang/nonaktif, serta menghapus izin lama jika versi akun berubah setelah PIN diganti. Sesi aktif harus cocok dengan izin yang masih tersimpan.
- P1 perangkat dilepas: penolakan perangkat/lisensi membentuk blokir tersimpan untuk toko, perangkat, dan masa penghubungan; semua izin operator lokal ditutup. Reload offline tidak membuka akun lain. Antrean transaksi dan data usaha tidak dihapus. Blokir hanya dapat dilepas setelah server mengonfirmasi akses perangkat, atau lewat penghubungan ulang sah pada masa penghubungan baru.
- P2 pembatasan sementara: respons pembatas trafik tidak menghapus izin offline sah. Penguncian percobaan PIN memiliki alasan dan batas waktu tersendiri yang tetap berlaku offline. Tidak otomatis mengalihkan login yang ditolak menjadi login offline.
- Perlindungan tambahan: respons login terlambat tidak dapat menyimpan ulang sesi setelah penolakan akses yang sudah diketahui. Sesi gagal tidak membiarkan konten kasir tetap terbuka selama pembersihan akses.

Alasan penolakan dikirim sebagai kode internal dan tidak menjadi istilah pada layar pengguna. PIN tetap 6–12 angka, tidak dibuat ulang atau diganti pada akun pelanggan.

## Add to Home Screen: yang dapat dan tidak dapat dipulihkan otomatis

Rute publik baru /pulihkan-kasir dengan tombol Bawa Data Lama pada layar masuk kasir dan bagian pemasangan, serta tautan dari panduan.

Pada penyimpanan browser/profil/alamat situs yang sama, halaman dapat menemukan toko yang masih tersimpan. Untuk toko terhubung, aplikasi memverifikasi tanda tangan akses, kecocokan identitas toko/perangkat, dan kepemilikan pasangan kunci lokal sebelum menawarkan Buka Toko. Pilihan divalidasi ulang saat diklik. Akses kedaluwarsa, palsu, berbeda toko, atau sudah diketahui dicabut tidak dipakai sebagai pintasan. Pembukaan hanya mengembalikan penunjuk toko; kunci tetap di tempatnya dan pemeriksaan lisensi/PIN berjalan seperti biasa. Pada profil yang belum memiliki toko terhubung, data browser lama dapat dipilih tanpa menyalin catatan, menghapus isi, atau mengganti lisensi. Jika sudah pernah terhubung, salinan sebelum penghubungan tidak ditawarkan agar tidak menjadi jalan memutar pencabutan perangkat atau membuat data bercabang.

Pada penyimpanan yang benar-benar terpisah, aplikasi tidak dapat membaca langsung data browser asal. Halaman membedakan Pemilik (cadangan lengkap, aktivasi/pemindahan lisensi yang sah, pemulihan) dan Karyawan (selesaikan pengiriman lama, penghubungan oleh Pemilik, login PIN). Tidak menyatakan bahwa akun atau nota berhasil dipindahkan jika belum dipulihkan. Tidak menambah slot perangkat atau memindahkan ikatan lisensi diam-diam.

Referensi platform: https://webkit.org/blog/14787/webkit-features-in-safari-17-2/ menjelaskan bahwa pembuatan aplikasi layar utama menyalin cookie pada versi yang didukung, tetapi tidak menyalin jenis penyimpanan lokal lain. Instalasi/profil browser berbeda dan alamat www dibanding tanpa www juga perlu dibedakan. Pengguna melaporkan masalah pada ketiga kelompok perangkat; penyebab persis tiap perangkat fisik belum diperiksa langsung.

## Validasi

- 66 tes Multi-Device lulus. Tambahan mencakup pencabutan akun/PIN, pencabutan seluruh perangkat, blokir yang bertahan setelah sesi baru, antrean transaksi tetap utuh, pembatas trafik vs penguncian PIN, koneksi gagal, respons login terlambat, penemuan data tersimpan, dan penolakan pemulihan identitas palsu/kunci berbeda/akses kedaluwarsa atau dicabut.
- 198 pemeriksaan POS dan 35 tes stabilitas/keamanan lulus.
- 11 alur Worker/D1 lokal lulus: penerbitan/perpanjangan akses, pairing, PIN dan penolakan akses tidak sah.
- Typecheck dan build fitur aktif lulus; manifest memuat halaman pemulihan dan 168 URL offline, seluruhnya tersedia dalam build.
- Satu tes lama menggunakan dua pembacaan jam untuk membuat durasi tepat 24 jam dan sesekali gagal karena selisih milidetik. Tes diperbaiki memakai satu nilai jam; aturan masa berlaku produksi tidak dilonggarkan.
- Browser Chromium, dua origin lokal terpisah: kedua akun masuk daring; akun Pagi dinonaktifkan Owner; daftar diperbarui; reload offline hanya menawarkan akun Sore. Akun Pagi diaktifkan dan masuk kembali; Owner melepas perangkat; kasir terkunci; reload offline tetap tidak menawarkan akun mana pun, dengan tautan Hubungkan Kembali.
- Browser: halaman pemulihan menampilkan toko dan jumlah produk/nota; Buka Toko pada kasir terhubung kembali membuka produk asli. Kedua pilihan peran tersedia. Lebar 390 px diperiksa tanpa luapan horizontal.

Bukti di outputs: access-pwa-fix-tests.log, access-pwa-fix-pos.log, access-pwa-fix-stability.log, access-pwa-fix-edge.log, access-pwa-fix-typecheck.log, access-pwa-fix-build.log, access-pwa-fix-artifacts.json. Screenshot: access-pwa-recovery-desktop.png, access-pwa-recovery-mobile.png, access-pwa-inactive-account-offline.png, access-pwa-revoked-device-offline.png.

## Batas dan perlindungan data

Tidak ada temuan P0 terverifikasi dalam audit tiga commit sebelumnya; tidak mengklaim seluruh aplikasi bebas semua bug. Pengujian browser lokal bukan pemasangan fisik Safari/iPhone, Chrome Android atau Edge desktop. Data dari penyimpanan yang terpisah tetap memerlukan pemulihan/penghubungan sah; pemindahan otomatis lintas browser/penyimpanan iOS belum dibuat.

Tidak menulis transaksi, akun atau PIN pelanggan, tidak memindahkan lisensi pelanggan, dan tidak mengubah skema D1 produksi maupun kredensial. Tidak merge main. Perhitungan finansial, stok dan refund tidak diubah.
