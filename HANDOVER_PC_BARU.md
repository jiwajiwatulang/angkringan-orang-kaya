# 📦 DOKUMEN HANDOVER: SETUP PC BARU & HISTORI UPDATE
**Proyek:** Angkringan Orang Kaya POS  
**Status:** 100% Offline (IndexedDB) & Static Export

---

## 1. PANDUAN PINDAH KE PC BARU
Untuk memindahkan ruang kerja (development) ke PC baru, bos hanya perlu mengunduh kode dari repositori GitHub.

**Persyaratan di PC Baru:**
- Install [Node.js](https://nodejs.org/) (Sangat disarankan versi 22)
- Install [Git](https://git-scm.com/)

**Langkah-langkah (Jalankan di Terminal/CMD):**
```bash
# 1. Download kode dari GitHub
git clone https://github.com/jiwajiwatulang/angkringan-orang-kaya.git

# 2. Masuk ke folder proyek
cd angkringan-orang-kaya

# 3. Install semua kebutuhan aplikasi
npm install

# 4. Jalankan aplikasi untuk ngetes di PC baru
npm run dev
```

---

## 2. PENGATURAN & API TOKEN (PENTING!)
Aplikasi ini sudah dirombak dari sistem *online database* (Cloudflare D1) menjadi sistem **100% Offline (Local Storage)** agar lebih cepat dan mandiri sebagai mesin kasir. 

Karena itu, aturannya adalah:
* **API Token Database:** **KOSONG / TIDAK ADA.** Aplikasi tidak lagi memerlukan API token database eksternal di dalam kodenya. Semua data (menu & penjualan) disimpan secara aman di dalam perangkat masing-masing menggunakan teknologi `IndexedDB`.
* **Data Menu Bawaan:** Data ke-55 menu awal sudah ditanam permanen di dalam file `src/lib/initialData.json`. Jadi PC atau HP baru mana pun yang menginstall APK ini akan otomatis mendapatkan menu yang lengkap tanpa perlu menarik API dari server.

### Pengaturan Deployment (Cloudflare & GitHub)
Meskipun kodenya offline, sistem distribusinya (Web & APK) sudah otomatis:
* **Cloudflare (Web):** Pengaturannya murni menggunakan file `wrangler.jsonc`. Cloudflare diatur untuk membaca folder `out` sebagai *static file*. Autentikasi Cloudflare langsung terhubung ke akun GitHub bos secara otomatis (tidak butuh token manual di PC).
* **GitHub Actions (APK):** Konfigurasi perakit APK ada di `.github/workflows/android.yml`. Memakai Java 21 dan Node 22.

---

## 3. HISTORI UPDATE TERAKHIR (LOG PERUBAHAN)
Berikut adalah riwayat perbaikan dan penambahan fitur terakhir yang sudah tertanam di GitHub sebelum pindah PC:

* **✨ UI/UX Rombak Total:** (Update Terbaru) Merombak tampilan keranjang di HP/Tablet menjadi model *Bottom Sheet* (Laci geser bawah) bergaya Gojek/McD agar mata kasir tidak sakit dan *layout* tidak berantakan saat layar dimiringkan (landscape).
* **🐛 Fix Bug Kategori:** Memperbaiki sistem *Rules Keyword* agar menu minuman seperti "Es Teh", "Milkshake", dan "Matcha" muncul di tombol Cetak Minuman, serta memperbaiki masalah ukuran tombol yang kekecilan di HP.
* **🖨️ Integrasi Mesin Bluetooth (Tanpa RawBT):** Membangun sistem *Direct Bluetooth Serial* agar aplikasi bisa langsung mencari, menembak, dan mencetak ke printer Panda tanpa harus melewati jendela "Simpan PDF" atau butuh aplikasi pihak ketiga (RawBT).
* **🖨️ Fix Print Native:** Menghapus intent RawBT lama yang sering memblokir layar print di Android, dan menggantinya dengan Capacitor Printer untuk *fallback*.
* **🤖 Build APK Otomatis (GitHub Actions):** Mengubah sistem perakitan Android ke sistem *Cloud* GitHub (Node 22 & Java 21) sehingga bos hanya perlu *push* kode, dan APK akan dirakit otomatis.
* **🌐 Fix Cloudflare Auto-Deploy:** Mengunci *deployment* Cloudflare hanya ke folder statis (`out`) dengan `wrangler.jsonc` agar web tidak tiba-tiba kosong/blank setelah *push*.
* **📊 Update Format Laporan:** Memperbaiki format *Export CSV* laporan penjualan di panel Admin agar lebih rapih saat dibuka di Excel.

---

## 4. PERINGATAN DATA PENJUALAN (WAJIB DIBACA SEBELUM RESET PC LAMA)
Jika di **PC LAMA** ini bos atau kasir sudah pernah mencatat pesanan *real* (asli) lewat browser PC dan ingin menyimpannya:
1. Buka aplikasi di PC lama ini.
2. Masuk ke halaman **Admin**.
3. Cari tombol **"Export CSV"** di tabel laporan pesanan.
4. Simpan file Excel-nya dan pindahkan pakai Flashdisk/Google Drive.
*(Jika pesanan dicatat lewat Tablet/HP Android, aman. Data tersebut tetap ada di dalam Tablet/HP dan tidak ikut pindah atau terhapus saat bos ganti PC development).*
