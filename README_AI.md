# Panduan Kode (AI & Developer Handoff): AngkringanPOS

Dokumen ini menjelaskan struktur kode dan konsep dasar dari aplikasi AngkringanPOS yang saat ini berada di fase MVP (Minimum Viable Product). Gunakan dokumen ini sebagai konteks saat Anda meminta AI lain untuk melanjutkan pengembangan.

## 1. Teknologi yang Digunakan (Tech Stack)
* **Framework:** Next.js 15 (App Router)
* **Styling:** Tailwind CSS v4
* **Bahasa:** TypeScript
* **State Management:** React `useState` (Local State)

## 2. Struktur File Utama
Saat ini, seluruh logika dan UI masih digabungkan ke dalam satu file utama untuk mempercepat iterasi, yaitu:
**`src/app/page.tsx`**

File pendukung bawaan Next.js:
* `src/app/layout.tsx` - Layout utama HTML.
* `src/app/globals.css` - Konfigurasi Tailwind dasar.

## 3. Penjelasan Logika di `src/app/page.tsx`

File `page.tsx` bertindak sebagai *Client Component* (`"use client"`) yang mengelola seluruh *state* aplikasi. Berikut adalah *state* utama yang perlu dipahami:

### A. Tipe Data (TypeScript Interfaces)
* `Table`: Memiliki `id`, `nomor`, dan `status` (`"kosong"` atau `"terisi"`).
* `MenuItem`: Memiliki `id`, `nama`, `harga`, dan `kategori`.
* `CartItem`: Sama dengan `MenuItem` ditambah properti `qty` (kuantitas).

### B. State Management
Aplikasi menggunakan beberapa *hook* `useState`:
1. `tables`: Menyimpan daftar 15 meja dan statusnya (kosong/terisi).
2. `activeTab`: Mengatur tampilan panel kiri (bisa bernilai `"meja"` atau `"menu"`).
3. `activeTableId`: Menyimpan ID meja yang saat ini sedang dipilih oleh kasir.
4. `orders`: Ini adalah state paling penting. Bentuk datanya adalah Object/Record, di mana **Key** (kunci) adalah `tableId` dan **Value** (isinya) adalah array dari `CartItem`.
   * *Contoh:* `{ 1: [{ id: 3, nama: "Sate Usus", qty: 2 }], 2: [...] }`
   * Pendekatan ini memungkinkan aplikasi menyimpan pesanan dari banyak meja sekaligus tanpa saling tertukar (*Open Bill*).

### C. Alur Penggunaan (User Flow)
1. **Memilih Meja:** Kasir mengklik meja di tab "Area Meja". State `activeTableId` berubah, status meja menjadi "terisi", lalu tab otomatis berpindah ke "Katalog Menu".
2. **Memasukkan Pesanan:** Saat kasir mengklik item menu, fungsi `addToCart` akan mencari apakah meja tersebut sudah punya array pesanan di state `orders`. Jika sudah ada item yang sama, `qty` ditambah. Jika belum, item baru ditambahkan.
3. **Mengedit Keranjang:** Di panel kanan (Keranjang), kasir bisa memanggil fungsi `updateQty` lewat tombol +/- untuk mengubah jumlah pesanan.
4. **Checkout:** Fungsi `handleCheckout` akan memunculkan alert, menghapus pesanan meja tersebut dari state `orders`, mengembalikan status meja menjadi "kosong", dan me-reset layar.

## 4. Ide Pengembangan Selanjutnya (Untuk AI Berikutnya)

Jika Anda ingin meminta AI lain untuk melanjutkan proyek ini, Anda bisa memberikan prompt berikut berdasarkan arsitektur di atas:

**Refactoring (Pemisahan Komponen):**
> "Tolong pisahkan `src/app/page.tsx` menjadi beberapa komponen terpisah di folder `src/components`: `TableGrid`, `MenuList`, `CartPane`, dan pindahkan *state management* ke React Context atau Zustand agar lebih rapi."

**Integrasi Database (Backend):**
> "Tolong ubah *dummy data* `initialTables` dan `menuData` agar datanya diambil (fetch) dari Supabase. Buat file `supabaseClient.ts` dan ubah fungsi `handleCheckout` agar memasukkan data transaksi ke tabel `orders` di Supabase."

**Pencetakan Struk:**
> "Tolong tambahkan *library* `react-to-print` dan buat komponen `Receipt.tsx` yang tersembunyi (hidden). Saat fungsi `handleCheckout` dijalankan, cetak komponen `Receipt` tersebut secara otomatis."
