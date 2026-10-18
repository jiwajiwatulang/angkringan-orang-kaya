# Katalog Aset Ikon SakuNota (Pengganti Emotikon Bawaan)

Dokumen ini berisi daftar lengkap seluruh emotikon bawaan yang saat ini masih digunakan di dalam aplikasi SakuNota, lengkap dengan rekomendasi nama file, ukuran kanvas, serta letak penggunaannya di antarmuka kasir dan admin.

---

## Panduan Teknis Pembuatan Ikon

- **Format File**: PNG transparan (`.png`) atau SVG (`.svg`).
- **Gaya Desain**: Minimalis, garis bersih (*line-art* atau *duotone*), serasi dengan warna merek SakuNota (**Royal Blue `#2563EB`**, **Sky Blue `#38BDF8`**, dan **Dark Navy `#0F172A`**).
- **Folder Penyimpanan**: Letakkan file ikon baru Anda di folder:
  `public/icons/`
  *(contoh: `public/icons/icon-logout.png`)*

---

## 1. Navigasi & Menu Utama Admin Backoffice
*Ukuran yang disarankan: **24 x 24 px** atau **32 x 32 px** (1:1 Square)*

| Emotikon Saat Ini | Rekomendasi Nama File | Ukuran | Lokasi Kode / Halaman | Fungsi & Keterangan Tampilan |
| :---: | :--- | :---: | :--- | :--- |
| 🚪 | `icon-logout.png` | 24x24 px | `AdminClientLayout.tsx` | Tombol **Keluar Admin** di sidebar desktop dan menu bawah HP |
| 🍽️ | `icon-menu-plate.png` | 24x24 px | `AdminClientLayout.tsx`, `menu/page.tsx` | Tab navigasi **Katalog Menu & Produk** |
| 📊 | `icon-analytics-chart.png` | 24x24 px | `AdminClientLayout.tsx`, `admin/page.tsx` | Tab navigasi **Dashboard Omzet & Traffic** |
| 🧾 | `icon-receipt-bill.png` | 24x24 px | `AdminClientLayout.tsx`, `transaksi/page.tsx` | Tab navigasi **Riwayat Transaksi & Nota** |
| 🪑 | `icon-table-chair.png` | 24x24 px | `AdminClientLayout.tsx`, `meja/page.tsx` | Menu pengaturan **Kelola Meja & Status Dine-in** |
| 💼 | `icon-cash-drawer.png` | 24x24 px | `AdminClientLayout.tsx`, `shift/page.tsx` | Menu **Shift Kasir & Kas Laci (Z-Report)** |
| ⚙️ | `icon-settings-gear.png` | 24x24 px | `AdminClientLayout.tsx`, `pengaturan/page.tsx` | Menu **Pusat Pengaturan POS** |

---

## 2. Aksi Tombol Kasir & Formulir
*Ukuran yang disarankan: **20 x 20 px** atau **24 x 24 px***

| Emotikon Saat Ini | Rekomendasi Nama File | Ukuran | Lokasi Kode / Halaman | Fungsi & Keterangan Tampilan |
| :---: | :--- | :---: | :--- | :--- |
| 🛒 | `icon-cart.png` | 24x24 px | `pos/page.tsx`, `MobileFloatingCartBar.tsx` | Keranjang belanja pesanan pelanggan |
| 🔍 | `icon-search.png` | 20x20 px | `pos/page.tsx`, `menu/page.tsx` | Kotak pencarian menu & nomor nota |
| 🗑️ | `icon-trash.png` | 20x20 px | `pos/page.tsx`, `MobileCartSheet.tsx` | Tombol hapus item keranjang / hapus menu |
| ✏️ | `icon-edit.png` | 20x20 px | `meja/page.tsx`, `menu/page.tsx` | Tombol ubah nama meja & ubah harga menu |
| 💾 | `icon-save-disk.png` | 20x20 px | `data/page.tsx`, `pos/page.tsx` | Tombol cadangkan / simpan data ke memori |
| 🔄 | `icon-sync-refresh.png` | 20x20 px | `pos/page.tsx`, `admin/page.tsx` | Tombol refresh data transaksi & shift |
| 📥 | `icon-import-excel.png` | 20x20 px | `menu/page.tsx`, `data/page.tsx` | Tombol impor massal menu dari Excel |
| 📤 | `icon-export-excel.png` | 20x20 px | `transaksi/page.tsx`, `data/page.tsx` | Tombol ekspor laporan keuangan ke Excel |

---

## 3. Finansial & Metode Pembayaran
*Ukuran yang disarankan: **24 x 24 px** atau **32 x 32 px***

| Emotikon Saat Ini | Rekomendasi Nama File | Ukuran | Lokasi Kode / Halaman | Fungsi & Keterangan Tampilan |
| :---: | :--- | :---: | :--- | :--- |
| 💵 | `icon-pay-cash.png` | 24x24 px | `pos/page.tsx`, `admin/page.tsx` | Pilihan pembayaran **Tunai / Uang Pas** |
| 📱 | `icon-pay-qris.png` | 24x24 px | `pos/page.tsx`, `admin/page.tsx` | Pilihan pembayaran **QRIS Dinamis / Statis** |
| 💳 | `icon-pay-transfer.png` | 24x24 px | `pos/page.tsx`, `admin/page.tsx` | Pilihan pembayaran **Transfer Bank / EDC** |
| 💰 | `icon-revenue.png` | 24x24 px | `admin/page.tsx` | Indikator kartu metrik total omzet harian |
| ↩️ | `icon-refund.png` | 24x24 px | `admin/page.tsx`, `pos/page.tsx` | Indikator transaksi void / pembatalan nota |
| 🔒 | `icon-security-lock.png` | 20x20 px | `keamanan/page.tsx`, `AdminClientLayout.tsx` | Indikator keamanan PIN pemilik toko |

---

## 4. Kategori Menu Makanan & Minuman (Tab Kasir)
*Ukuran yang disarankan: **32 x 32 px** atau **48 x 48 px***

| Emotikon Saat Ini | Rekomendasi Nama File | Ukuran | Lokasi Kode / Halaman | Kategori Produk |
| :---: | :--- | :---: | :--- | :--- |
| 🍢 | `icon-cat-satay.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Sate-satean & Angkringan |
| ☕ | `icon-cat-coffee.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Kopi & Minuman Panas |
| 🥤 | `icon-cat-cold-drink.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Es, Jus, & Minuman Dingin |
| 🍚 | `icon-cat-rice.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Nasi & Makanan Berat |
| 🥟 | `icon-cat-snack.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Gorengan, Dimsum, & Camilan |
| 🍞 | `icon-cat-bakery.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Roti, Toast, & Pastry |
| 🛍️ | `icon-cat-retail.png` | 32x32 px | `pos/page.tsx`, `menu/page.tsx` | Sembako & Barang Retail Toko |

---

## 5. Perangkat Keras & Komunikasi
*Ukuran yang disarankan: **24 x 24 px***

| Emotikon Saat Ini | Rekomendasi Nama File | Ukuran | Lokasi Kode / Halaman | Fungsi & Keterangan Tampilan |
| :---: | :--- | :---: | :--- | :--- |
| 🖨️ | `icon-printer-thermal.png` | 24x24 px | `printer/page.tsx` | Status koneksi Printer Bluetooth |
| 💬 | `icon-whatsapp.png` | 24x24 px | `admin/page.tsx`, `tentang/page.tsx` | Tombol kirim laporan ke WhatsApp |
| 📖 | `icon-guide-book.png` | 24x24 px | `panduan/page.tsx` | Navigasi buku panduan kasir |

---

*Catatan: Setelah file gambar ikon siap, Anda cukup menyimpannya ke dalam folder `public/icons/`. Sistem akan langsung menghubungkannya secara otomatis.*
