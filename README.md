# SakuNota - Kasir Jalan Tanpa Internet

**SakuNota** adalah aplikasi kasir (*Point of Sale*) berbasis perangkat lokal (*Offline-First*) untuk usaha kuliner dan F&B di Indonesia (Warung Makan, Rumah Makan, Restoran, Kafe, Kedai Kopi, Booth Jajanan, dan Street Food).

- **Website Resmi**: [https://sakunota.my.id](https://sakunota.my.id)
- **Pusat Panduan Pengguna**: [https://sakunota.my.id/panduan](https://sakunota.my.id/panduan)
- **Tentang Kami**: [https://sakunota.my.id/tentang](https://sakunota.my.id/tentang)

---

## Keunggulan Utama SakuNota

1. **100% Jalan Tanpa Internet (*Offline-First*)**
   Seluruh proses pencatatan pesanan, pengelolaan meja, pembagian tagihan (*split bill*), hingga pencetakan struk Bluetooth berjalan langsung di memori perangkat HP/tablet menggunakan penyimpanan lokal (*IndexedDB / Dexie*). Saat sinyal hilang atau mati lampu, operasional kasir tidak berhenti.
2. **Sekali Bayar untuk Selamanya (Tanpa Biaya Bulanan)**
   Harga promo peluncuran **Rp50.000** untuk satu toko (maksimal dua perangkat) aktif selamanya. Tanpa biaya langganan bulanan dan 0% potongan komisi penjualan.
3. **Mode Kasir Fleksibel & Denah Meja**
   Mendukung mode transaksi cepat (*Takeaway* / bayar langsung) maupun sistem nomor meja (*Dine-in*), simpan tagihan berjalan (*Open Bill*), varian rasa, level pedas, dan *split bill*.
4. **Cetak Struk Bluetooth Thermal (58mm & 80mm)**
   Terhubung langsung ke berbagai merek printer thermal Bluetooth tanpa memerlukan jaringan Wi-Fi atau kabel tambahan.
5. **Audit Kas Laci (*Blind Close Shift*) & Laporan WhatsApp**
   Rekonsiliasi uang tunai fisik di laci saat pergantian shift kasir (*Z-Report*) dan pengiriman rekap laporan penjualan harian langsung ke WhatsApp pemilik usaha.
6. **Kedaulatan Data Penuh di Tangan Pemilik Usaha**
   Seluruh data menu, transaksi, dan rekap shift tersimpan privat di perangkat pemilik toko dan dapat dicadangkan (*Export JSON*) serta dipulihkan (*Restore*) kapan saja saat berganti HP baru.

---

## Struktur Halaman Utama

| Rute Halaman | Fungsi Utama |
| :--- | :--- |
| `/` | Halaman Beranda, Simulasi Kasir Interaktif, Pembelian Lisensi, & Aktivasi Kode |
| `/pos` | Layar Kasir Utama (Menu, Keranjang, Denah Meja, Pembayaran, Buka/Tutup Shift) |
| `/pos?demo=true` | Mode Demo Sandbox Kasir (Simulasi aman tanpa lisensi) |
| `/admin` | Ringkasan Penjualan, Grafik Tren 7 Hari, & Kirim Laporan ke WhatsApp |
| `/admin/menu` | Pengelolaan Katalog Makanan, Minuman, Varian, & Status Stok Habis |
| `/admin/pengaturan` | Pengaturan Identitas Toko, Pajak/Layanan, Printer Bluetooth, & Cadangan Data |
| `/panduan` | Pusat Panduan Pengguna Lengkap Beserta Peta Arah Penggunaan |
| `/tentang` | Profil Resmi & Filosofi Aplikasi SakuNota |
| `/owner` | Portal Manajemen Lisensi, Verifikasi Pesanan, & Database Cloud (Cloudflare D1) |

---

## Cara Aktivasi Lisensi (Resmi / Tester / Trial)

1. **Jika Sudah Memiliki Kode Lisensi (`SN-XXXX-XXXX-XXXX`, `SN-TEST-XXXX`, atau `SN-TRIAL-XXXX`)**:
   - Buka [https://sakunota.my.id](https://sakunota.my.id) lalu klik tombol **🔑 Aktivasi Lisensi** di bagian atas halaman (atau langsung buka `/pos`).
   - Pilih tab **🔑 Pakai Kode Lisensi**, masukkan kode lisensi Anda (tidak memerlukan Nomor Pesanan atau Kode Akses Rahasia), lalu klik **Aktifkan Lisensi**.
2. **Jika Baru Selesai Transfer Pembelian**:
   - Buka menu **🔑 Aktivasi Lisensi** lalu pilih tab **🧾 Cek Nomor Pesanan**.
   - Masukkan **Nomor Pesanan (`SN-2026-XXXX`)** beserta **Kode Akses Rahasia Pembeli (`KOD-XXXX`)** untuk melihat dan mengaktifkan lisensi Anda.

---

## Arsitektur Teknis

- **Frontend & UI**: Next.js (Static Export) + React 19 + Tailwind CSS v4 (100% High-Contrast Light Blue & White Theme)
- **Database Kasir Lokal**: Dexie.js (IndexedDB) + Service Worker Offline Manifest
- **Backend Lisensi & Pembayaran**: Cloudflare Workers + Cloudflare D1 SQLite Database + Midtrans Snap Gateway
- **Cetak Struk**: Web Bluetooth API + ESC/POS Thermal Command Generator (58mm / 80mm)

---

## Menjalankan Proyek Secara Lokal

```bash
# 1. Instal dependensi
npm install

# 2. Jalankan server pengembangan
npm run dev

# 3. Jalankan pengujian otomatis (Unit & Integrasi)
npm test

# 4. Bangun paket produksi & manifest offline
npm run build

# 5. Deploy ke Cloudflare Workers (sakunota.my.id)
npx wrangler deploy
```

---

## Hak Cipta & Perusahaan

© 2026 **SakuNota**, PT Pemuda Gaya Bebas

## Tambah Barang Retail dari Kasir

Khusus jenis usaha **Retail**, kasir dapat memilih **Tambah Barang**, memotret
kemasan atau mengisi nama secara manual, mengisi harga jual dan jumlah, lalu
menambahkan barang ke keranjang. Produk baru masuk katalog dalam transaksi yang
sama dengan pelunasan nota. Kasbon dan pembayaran sebagian belum membuat produk
katalog; pembatalan dan kegagalan transaksi tidak menyisakan produk baru.
Barcode dan pengelolaan katalog yang sudah ada tetap tersedia.

Persiapan pengenalan foto berada di **Admin → Pengaturan → Foto Produk Retail**.
Unduhan opsional sekitar 10 MB hanya dilakukan dari Pengaturan. Pemrosesan foto
berjalan lokal dengan Tesseract.js 7 dan data bahasa Inggris untuk tulisan Latin;
hasilnya merupakan saran nama yang wajib diperiksa pengguna, bukan identifikasi
merek/produk atau penentuan harga otomatis. Foto tidak dikirim ke server.
Perangkat membutuhkan konteks aman, Web Worker, WebAssembly, Cache Storage, dan
service worker aktif. **Isi Manual** tetap dapat digunakan bila tidak didukung.

`npm ci`, `npm run dev`, dan `npm run build` menyiapkan aset dari paket npm yang
terkunci melalui `scripts/prepare-retail-photo.mjs`. Aset hasil generasi berada di
`public/retail-photo/v1` (diabaikan Git), ikut ekspor produksi, tetapi dikecualikan
dari unduhan offline dasar. Pengaturan memverifikasi SHA-256 seluruh aset dan
menguji pengenalan lokal sebelum menandai fitur siap. Versi aset/cache perlu
dinaikkan bersamaan jika engine atau data pengenalan diganti. Penghapusan data
situs mengharuskan persiapan ulang. Data pengenalan bukan bagian dari backup toko;
foto katalog dan foto barang pada kasbon tetap ikut backup.

Panduan pengguna dan panduan singkat Retail tersedia di `/panduan`.
