# Perbaikan regresi beberapa perangkat — 23 Oktober 2026

Dasar pemeriksaan: `origin/main` pada `80c3346b305da0130c17dc7f68c724ee23d72307`. Sumber main diperiksa lagi sebelum penyelesaian. Dashboard yang sudah ada dipakai kembali; tidak mengambil implementasi dari PR dashboard lain. Data usaha produksi tidak direset dan tidak dipakai untuk pengujian.

## Hasil perubahan

| Temuan | Perbaikan | Bukti pemeriksaan |
| --- | --- | --- |
| Demo memilih data perangkat usaha | Permintaan demo dari URL atau sesi mengabaikan pemilihan partisi usaha. Identitas perangkat tetap disimpan untuk kembali ke usaha. | Tes konteks demo dan browser: database demo terpisah; nota usaha tetap ada setelah keluar demo. |
| Antrean kasir lama menghentikan kasir baru | Kegagalan akses 401/403 milik kasir sebelumnya ditandai untuk pemulihan; peristiwa asli dan urutannya disimpan. Pengiriman kasir aktif bisa berlanjut. Penolakan akses kasir aktif tetap berlaku. | Tes dua identitas, ketergantungan antarperistiwa, pengiriman kembali menggunakan akses kasir asli yang diperbarui, dan penolakan akses aktif. |
| Dua barang Retail belum terdaftar punya identitas keranjang sama | Pemetaan keranjang memakai identitas baris nota untuk barang sementara. Jalur muat dan penggabungan memakai fungsi yang sama. Pembayaran per barang memakai identitas baris hingga barang tersimpan ke katalog. | Tes impor dua baris, perubahan jumlah independen, serta pembayaran per barang di API sebenarnya sampai keduanya masuk katalog setelah pelunasan. |
| Nota baru dapat diklaim lunas tanpa pembayaran | Server menolak status lunas yang tidak didukung pembayaran diterima. Nota lama yang diimpor tanpa rekaman pembayaran tetap didukung. | Percobaan peristiwa palsu pada server lokal ditolak dan tidak menghasilkan nota/pendapatan baru. |
| Dashboard diganti setelah aktivasi perangkat | Dashboard lama digunakan dalam kedua mode; mode beberapa perangkat menghitung penerimaan dan pengembalian pada tanggal terjadinya. Grafik dapat menampilkan nilai negatif. | Tes pembayaran cicilan/pengembalian, grafik per dua jam, metode pembayaran, serta browser desktop dan lebar HP 390 piksel. Pilihan periode, Garis/Batang, laporan WA/PNG, dan panel produk tetap tersedia. |
| Cadangan lengkap hilang | Halaman Data & Cadangan kembali mengekspor katalog, nota, pembayaran, bukti, shift, stok, dan antrean pada perangkat pemilik. Cadangan Pengiriman diberi nama terpisah. Pemulihan meneruskan peristiwa asli lalu membaca kembali data diterima mulai dari awal. | Ekspor melalui browser berisi nota dan pembayaran. Simulasi salinan nota lokal rusak dapat dipulihkan tanpa menimpa data server. Tes kehilangan respons pemulihan mempertahankan antrean sampai konfirmasi diterima. |
| Penanda konflik stok tidak terlihat | Status “Stok Perlu Dicek” membaca data stok aktif dan tetap terlihat saat ada data belum terkirim atau perangkat tidak tersambung. | Tes tampilan status bersamaan dengan keadaan offline dan antrean. |
| Informasi privasi tidak sesuai mode beberapa perangkat | Kebijakan di Pengaturan dan halaman publik menjelaskan pengiriman data saat fitur beberapa perangkat diaktifkan. Panduan menjelaskan cadangan, pemulihan, dan pembagian foto produk. | Pemeriksaan sumber dan build halaman panduan/privasi. |

## Validasi

- `npm test`: **198 lulus**.
- `npm run test:stability`: **35 lulus**.
- `npm run test:multidevice`: **41 lulus**.
- TypeScript dan build produksi dengan `NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE=enabled`: lulus.
- API Workers/D1 lokal: lulus, termasuk aktivasi palsu, penyalinan akses perangkat, pemasangan kasir, login karyawan, pembatasan akses pemilik, pembaruan akses, serta pencabutan perangkat dan lisensi.
- Browser Chromium lokal: transaksi POS, komponen dashboard lama, laporan PNG, lebar HP, unduhan cadangan lengkap, pemulihan salinan lokal, pemisahan demo, dan nota asli tetap tersedia; tidak ada error halaman.
- Manifest offline: seluruh 164 URL menunjuk berkas build yang tersedia; API dan berkas privat tidak masuk daftar.
- Paket Worker lokal (`wrangler deploy --dry-run`): lulus, tanpa unggahan produksi.
- `git diff --check`: lulus. Lint untuk dua fungsi bantu baru: lulus.

## Batas operasional

Antrean kasir lama tidak dibuang atau dikirim dengan identitas kasir baru. Selama masih ada peristiwa lokal belum diterima, unduhan tidak mengganti salinan data lokal. Masuk kembali sebagai kasir pembuat transaksi untuk mengirim ulang dengan aksesnya yang baru; jika kasir dinonaktifkan, pemilik perlu memulihkan aksesnya. Ekspor kasir tetap terbatas pada transaksi kasir itu. Cadangan lengkap pemilik hanya mencakup salinan pada perangkat tersebut, bukan transaksi offline yang masih berada pada perangkat lain.

Pemulihan beberapa perangkat membutuhkan internet dan perangkat pemilik yang terhubung ke usaha yang sama. Data diterima dibaca dari layanan usaha; berkas cadangan tidak dipakai untuk menimpa nota diterima, mengimpor kunci perangkat, atau memulihkan kewenangan karyawan. Pemulihan satu perangkat tetap memakai mekanisme lama dengan pratinjau dan salinan sebelum pemulihan. Tombol reset massal dan penggantian paket contoh tidak ditawarkan pada usaha beberapa perangkat karena tidak sesuai riwayat transaksi bersama.

Pengujian memakai perangkat/browser dan D1 lokal dengan data sintetis. Ini tidak merupakan klaim bahwa seluruh bug tidak mungkin ada atau pengujian perangkat fisik sudah dilakukan.

## Deployment

**Belum dipublikasikan dari pekerjaan ini.** Percobaan autentikasi Cloudflare ditolak dengan `Invalid access token` (9109). Identitas deployment yang diberikan tidak menggantikan kredensial akses. Build dapat dipaketkan lokal; deployment produksi memerlukan token aktif. Pertahankan variabel produksi dan binding yang ada (`wrangler deploy --keep-vars`); jangan menonaktifkan fitur beberapa perangkat untuk menyamarkan regresi. Setelah rilis, verifikasi versi dan aset pada domain produksi sebelum menyatakan deployment berhasil.
