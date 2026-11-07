# SakuNota — salinan versi live

Dipulihkan pada 7 November 2026 dari Cloudflare versi **329**, yang tayang pada 6 November 2026 pukul 14.33 WIB.

**Ini salinan rilis yang sudah tayang, belum seluruh source proyek dari PC asal.** File tampilan berupa hasil build. Source React/TSX, tes terbaru, dan commit lokal PC asal belum tersedia.

Yang berhasil disimpan:

- Worker yang diunduh dari Cloudflare, tanpa mengubah isinya.
- 52 file source asli untuk Worker, API, sinkronisasi, mode usaha, dan modul pendukung.
- 319 file tampilan, aset, data perpindahan halaman, service worker, dan aturan header.
- Bukti perbandingan 347 URL publik. Seluruh 190 file pada salinan awal cocok dengan versi live saat pemeriksaan.

## Isi folder

- `runtime/`: Worker hasil deploy beserta source map-nya. Ini entry yang digunakan untuk preview.
- `recovered-source/`: source asli yang berhasil dipulihkan dari source map. Tidak digunakan untuk mengganti hasil build secara diam-diam.
- `public/`: berkas web yang sudah dipublikasikan.
- `evidence/`: identitas versi, checksum, dan hasil pemeriksaan.
- `wrangler.jsonc`: konfigurasi **lokal**, dengan database/bucket lokal dan tanpa rute produksi.

`.gitattributes` mempertahankan byte asli berkas, termasuk jenis akhir baris, supaya checksum tetap cocok setelah clone di Windows maupun sistem lain.

Tidak ada isi database toko, secret, token akun Cloudflare, atau data browser pengguna dalam salinan ini. Nama secret yang dibutuhkan tersedia dalam bukti konfigurasi, tanpa nilainya.

## Jalankan lokal

```sh
npm ci
npm run verify
npm run dev
```

`npm run check` memeriksa checksum dan paket Worker melalui dry-run. Tidak ada perintah deploy produksi dalam scripts proyek ini.

Saat pemulihan, dry-run Wrangler 4.155.0 lulus dan source Worker/API yang dipulihkan berhasil dikompilasi. Seluruh 347 respons publik pada preview lokal cocok dengan hasil pengambilan dari live. Tujuh halaman anonim juga cocok dari sisi status, judul, dan teks yang tampil, tanpa error JavaScript atau kegagalan pemuatan berkas. Lihat `evidence/validation-summary.json` dan laporan rinci di folder yang sama.

Preview tidak membawa aktivasi atau database browser produksi. Lisensi, login, pembayaran, dan sinkronisasi membutuhkan konfigurasi serta data uji tersendiri; keberhasilan membuka halaman bukan bukti semua transaksi sudah diuji.

## Lanjut mengerjakan

Bagian server yang source-nya sudah pulih bisa ditinjau dari sini. Untuk perubahan tampilan, gunakan source asli dari PC asal jika sudah tersedia. Jika perlu membangun ulang tampilan dari hasil build, perlakukan sebagai implementasi baru yang perlu dibandingkan dan diuji; jangan menganggapnya source asli yang pulih otomatis.

Jangan menimpa `main` atau deploy snapshot ini ke produksi untuk menggantikan source proyek yang belum tersinkron. Commit ini menyimpan keadaan live agar tidak hilang sambil menunggu penyatuan dengan source asli.

Versi Cloudflare: `ce14b39c-d2ac-4248-8c1a-b3c5f56c7acf`.
Deployment: `6b1e9d95-a123-4ed5-9e44-354437ae826b`.
