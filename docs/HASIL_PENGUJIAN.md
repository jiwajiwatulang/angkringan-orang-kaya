# Hasil pemeriksaan SakuNota

Tanggal: 18 Oktober 2026. Perubahan berada pada branch lokal `codex/stability-retail-dashboard`, berdasarkan `main` commit `4acf2fd`. Belum di-push atau di-deploy ke produksi.

## Lingkungan

- Regresi kasir: fake-indexeddb di proses Node, bukan database browser toko.
- Uji HTTP: handler Worker dengan adapter SQLite lokal dalam memori sebagai pengganti binding D1.
- Uji Midtrans: respons pembuatan token disimulasikan. Webhook menggunakan server key khusus pengujian dan SHA-512 yang dihitung saat tes. Tidak ada settlement uang nyata.
- Preview UI: `http://localhost:4370`; data Owner di memori sementara, data demo di `SakuNotaDemoDB` origin localhost.
- Cloudflare produksi hanya diperiksa akses baca sebelumnya; database dan secret produksi tidak dimutasi selama pekerjaan ini.

## Pemeriksaan otomatis

| Pemeriksaan | Hasil | Bukti / perintah |
|---|---|---|
| Regresi bawaan | 198 pemeriksaan lulus | `npm test`; `audit-output/regression-tests.log` |
| Regresi tambahan | 9 skenario lulus | `npm run test:stability`; `audit-output/stability-tests.log` |
| TypeScript | Lulus | `npm run typecheck`; `audit-output/typecheck.log` |
| Build statis | Lulus; 24 halaman termasuk route stok baru | `npm run build`; `audit-output/build.log` |
| Manifest offline | 138 URL pada build yang diuji merujuk file nyata | `npm run test:offline`; `audit-output/offline-tests.log` |
| Lint seluruh proyek | Belum lulus: 546 error pada pemeriksaan penuh, banyak terkait `any` dan aturan kode lama | `npm run lint -- --quiet`; `audit-output/lint.log` |

Jumlah URL manifest dapat berubah saat kode/build berubah; angka pada log final adalah acuan. Kelulusan tes tidak membuktikan seluruh kemungkinan perangkat, data lama, dan jaringan sudah bebas bug. Lint tidak dinonaktifkan agar hasil tetap terlihat.

## Cakupan sembilan skenario tambahan

1. Instalasi service worker yang gagal mengambil aset tidak mengaktifkan build baru dan mempertahankan cache sebelumnya.
2. Navigasi offline mempertahankan identitas halaman; respons API tidak masuk cache aplikasi.
3. Stok awal, reservasi open bill, idempotensi klik ganda, perubahan pesanan, pembatalan, pencegahan oversell bersamaan, opname kedaluwarsa, dan backup/restore stok.
4. Dashboard mencakup penjualan dini hari dan malam, rentang bulan yang benar, serta hanya nota lunas yang sesuai.
5. Migrasi IndexedDB schema 8 ke 9 mempertahankan produk dan transaksi tanpa memaksa stok lama menjadi nol.
6. Refund kas dihitung satu kali, refund pada shift berikutnya tidak mengubah laci shift sebelumnya, serta penolakan buka/tutup shift bersamaan dan nominal NaN.
7. Scanner HID mempertahankan angka nol awal dan tidak mengambil alih Enter pada formulir biasa.
8. Aktivasi browser menyimpan metadata trial; trial offline kedaluwarsa, tanggal invalid, atau metadata tidak lengkap ditolak.
9. Login/logout Owner, penolakan permintaan Owner tanpa token, status konfigurasi tanpa kebocoran secret, checkout Rp50.000, respons Snap simulasi, penolakan tanda tangan palsu/nominal tidak cocok, webhook bersamaan menghasilkan satu lisensi, notifikasi terlambat tidak membatalkan lunas, aktivasi satu perangkat, dan trial tujuh hari.

## Pemeriksaan UI yang dilakukan

- Demo dibuka, keluar ke beranda, lalu masuk kembali.
- Halaman stok: pencarian produk, saldo awal 20, opname fisik 18, ledger −2 dan saldo akhir 18 terlihat pada antarmuka.
- Dashboard desktop 1440×900 dan mobile 390×844 diperiksa. Data contoh tujuh hari menampilkan grafik naik/turun. Semua angka tersebut adalah data simulasi, bukan omzet pelanggan.
- Server preview kemudian dimatikan dan ketidaktersediaannya dikonfirmasi lewat request jaringan terpisah. Reload dashboard, navigasi stok, buka shift, dan pembayaran tunai demo tetap berhasil. Pembelian Air mineral Rp6.000 dengan tunai Rp10.000 menampilkan kembalian Rp4.000; saldo stok turun dari 18 ke 17 dengan satu ledger penjualan −1.
- Login portal Owner lokal berhasil dan metrik server dimuat.
- Form beta lokal berhasil dikirim dan disetujui dari portal Owner. Pemeriksaan ini menemukan tampilan `Invalid Date`; penyimpanan tanggal baru diubah ke ISO dan tampilan data lama diberi fallback.
- Aktivasi trial diuji melalui API dan klien otomatis. Alur klik aktivasi UI penuh belum dinyatakan lulus; kontrol browser mengalami timeout selama pemeriksaan.

Bukti tampilan tersedia di `audit-output/ui-dashboard-desktop.jpg`, `ui-dashboard-mobile.jpg`, dan `ui-stock-desktop.jpg`. Screenshot adalah hasil preview lokal.

## Perbaikan penting

- Jalur HTTP Owner menolak header autentikasi yang tidak ada sebelum mencapai fungsi internal.
- Secret tidak diekspor ke browser; sandi alternatif tertanam di kode dihapus.
- Penerbitan kunci lisensi deterministik per pesanan dan insert tidak mengganti ikatan perangkat ketika terjadi retry.
- Respons aktivasi menyertakan jenis lisensi dan kedaluwarsa; metadata lokal konsisten.
- Produk bernama sama tidak dihapus ketika katalog dibaca.
- Saldo kas dan selisih penutupan tidak ditampilkan di kasir sebelum penutupan disimpan.
- Perhitungan refund tidak mengurangi uang laci dua kali.
- Pelunasan open bill membuat rekaman pembayaran; uang tunai diterima dan kembalian ikut disimpan. Tombol bayar memiliki penjagaan proses dan kunci idempotensi yang konsisten.
- Demo memakai database dan cache pengaturan tersendiri, dengan navigasi penuh saat masuk agar modul lama tidak memakai database toko.
- Service worker tidak mengaktifkan build yang asetnya belum lengkap.

## Yang masih diperlukan sebelum produksi

- Sandbox Midtrans nyata dengan konfigurasi terpisah, termasuk Snap UI, webhook pengiriman ulang, pending, gagal, dan settlement.
- Uji fisik Bluetooth thermal, scanner HID, kamera, dan cetak PDF pada perangkat sasaran. Kode tidak membuktikan kompatibilitas semua model hardware.
- Uji ulang offline setelah restart browser/perangkat sasaran dan instalasi APK Android. Tes lokal mencakup server dimatikan, harness service worker, dan pemeriksaan build; belum membuktikan semua model perangkat.
- Penuntasan lint dan pemeriksaan kode lanjutan; jangan menyebut hasil ini sebagai sertifikasi zero bug.
- Backup produksi, rencana rotasi secret yang sudah dibagikan, staging, dan smoke test setelah deployment.
- Rollback bundle harus tetap mengenal schema IndexedDB 9; jangan langsung menurunkan ke bundle schema 8 setelah perangkat bermigrasi.

## Menjalankan ulang

```powershell
npm ci
npx prisma generate
npm run typecheck
npm test
npm run test:stability
npm run build
npm run test:offline
npm run preview:local
```

Preview Owner menggunakan akun dummy `preview-owner` dengan sandi `Preview-Local-Only!`. Akun ini hanya milik server preview lokal. Tidak ada kunci Midtrans di preview; pembayaran gateway nyata sengaja tidak tersedia. Data Owner preview hilang ketika server dimulai ulang.

## Pembaruan demo dan Waiter Floor

- Panduan awal hanya untuk lisensi/trial/tester yang aktif; demo tidak membuka wizard meskipun diberi query onboarding.
- Pengujian stabilitas bertambah menjadi 12 skenario: pembatasan onboarding, meja tugas pelayan, varian wajib, kuantitas, shift aktif, harga/biaya dari katalog, stok dan idempotency, tanpa pembayaran, serta PIN keluar dengan cooldown.
- Uji UI lokal ukuran HP: tombol panduan awal tidak muncul pada demo; shift dibuka; pelayan ditugaskan Meja 1; pesanan Air mineral dengan varian dan catatan berhasil masuk sebagai pesanan #8. URL /pos dan /admin dialihkan ke /waiter saat sesi aktif. PIN salah ditolak; PIN demo yang benar kembali ke kasir.
- Waiter Floor versi ini berbagi database/browser dengan kasir. Akun staf cloud dan HP pelayan terpisah belum tersedia. Lihat WAITER_FLOOR.md untuk batas operasional.
- API key hanya berupa rencana; tidak ada key atau endpoint integrasi baru yang diaktifkan.

## Katalog dan persediaan terpadu

- Produk dan Persediaan & Opname berbagi halaman /admin/menu. Tautan /admin/stok lama tetap mengarah ke tab persediaan, termasuk query demo.
- Uji UI lokal: perpindahan kedua tab berhasil, Waiter Floor berada tepat di bawah Shift, dan menu stok terpisah tidak muncul.
- Server pratinjau port 4373 dihentikan setelah prosesnya diverifikasi; probe HTTP memastikan server tidak tersedia. Perpindahan Produk ke Persediaan & Opname tetap berhasil tanpa jaringan.
- Ikon lock menggunakan gambar nomor 35 dari aset pengguna, dioptimalkan menjadi WebP 128px (sekitar 2 KB). Gambar sumber tidak diubah.
- Perubahan akses karyawan dan API key masih berupa rencana; tidak ada hak akses baru atau endpoint integrasi yang diaktifkan.
