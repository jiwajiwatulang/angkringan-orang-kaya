# Rencana API key SakuNota — belum diimplementasikan

API key adalah izin aplikasi lain untuk memakai API SakuNota dengan lingkup tertentu. API key bukan lisensi kasir, PIN Admin, ataupun kunci Midtrans. Menerbitkan key saja tidak membuat database IndexedDB bisa diakses dari internet.

## Pilihan fitur

| Integrasi | Contoh | Kebutuhan tambahan |
|---|---|---|
| Laporan baca saja | Owner mengambil ringkasan penjualan ke spreadsheet atau dashboard sendiri | POS mengirim snapshot dengan persetujuan owner ke penyimpanan cloud opsional |
| Pesanan masuk | Toko online mengirim pesanan, lalu kasir menerima pesanan tersebut | Antrean cloud, validasi harga/stok di POS, pencegahan pesanan ganda |
| Waiter dari HP lain | Pelayan mengirim pesanan ke kasir | Koneksi antarperangkat atau relay, pairing, role pelayan dan sinkronisasi saat terputus |

Saran awal: bila ada kebutuhan integrasi nyata, mulai dengan laporan baca saja. Semua transaksi tetap di perangkat; snapshot cloud merupakan fitur tambahan yang dinyalakan sendiri oleh owner. Biaya penyimpanan dan request perlu dihitung, sehingga fitur ini tidak ikut dijanjikan berbiaya server Rp0.

## Rancangan akses

- Owner membuat key dari portal terautentikasi; tentukan toko, scope seperti `reports:read`, masa berlaku dan batas request.
- Key acak berawalan `sn_live_`; tampilkan nilai lengkap hanya saat dibuat. Simpan hash di server, nama/prefix serta waktu penggunaan terakhir untuk pengelolaan.
- Kirim melalui header Authorization lewat HTTPS. Jangan taruh di URL, repositori, atau kode frontend publik.
- Sediakan pencabutan, rotasi, audit penggunaan, rate limit dan pemisahan data tiap toko. Akses pembayaran, refund, dan penerbitan lisensi tidak diberikan kepada key laporan.
- Webhook memerlukan secret dan tanda tangan terpisah, serta retry/idempotency.

## Batas saat ini

Belum ada endpoint penerbitan key, key aktif, unggahan data merchant, atau sinkronisasi antarperangkat. Owner tetap menggunakan Cloudflare/D1 untuk bisnis lisensi. Waiter Floor versi awal berbagi IndexedDB dengan kasir pada perangkat/browser yang sama.

## Gambaran konkret: laporan ke spreadsheet

Contoh halaman yang direncanakan pada integrasi opsional pemilik toko:

```text
Integrasi → Buat akses aplikasi
Nama: Spreadsheet Omzet Toko
Izin: Baca ringkasan penjualan saja
Masa berlaku: 30 hari
[Buat API key]

Key: sn_live_CONTOH_SAJA
[Salin]  [Cabut akses]
```

Contoh alur: kasir mencatat transaksi lokal → owner menyetujui pengiriman ringkasan harian → snapshot disimpan pada layanan integrasi → spreadsheet mengambil ringkasan memakai key tersebut. Key laporan tidak bisa menambah produk, mengubah stok, menerima pembayaran atau membaca data toko lain.

Contoh respons yang direncanakan: tanggal, jumlah transaksi, omzet, serta waktu sinkronisasi terakhir. Jika kasir offline, laporan cloud tetap menampilkan snapshot terakhir beserta waktu pembaruannya, bukan mengaku sebagai data langsung.

Pemilik toko perlu identitas cloud/otorisasi kepemilikan yang diverifikasi untuk membuat dan mencabut key. PIN Admin lokal saja tidak cukup sebagai autentikasi API internet. Akun integrasi merchant ini berbeda dari portal `/owner` milik pengelola SakuNota.

Alternatif paling ringan bila hanya perlu laporan berkala: ekspor CSV/Excel tanpa API key. API key baru berguna jika aplikasi lain memang perlu mengambil data secara otomatis.
