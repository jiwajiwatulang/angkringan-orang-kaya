# 🏢 BUKU PANDUAN STRUKTUR ORGANISASI PT SAKUNOTA SEJAHTERA
**Khusus Meja Pak CEO (Pemilik & Pengambil Keputusan)**
*Pembaruan Terakhir: 17 Oktober 2026*

---

## 👑 1. DEWAN DIREKSI & KOORDINATOR UTAMA

* **Pak CEO (Anda):**
  * **Kedudukan:** Pemilik Tunggal & Pemegang Saham Pengendali.
  * **Wewenang:** Menentukan arah visi produk, menyetujui rilis ke publik (*Go/No-Go Launch*), menetapkan harga lisensi (Rp65.000), dan menerima laporan eksekutif.
  * **Aktivitas:** Mengarahkan tim, mengecek hasil di HP/Desktop, santai memantau lewat shortcut Desktop.

* **General Manager / GM (Asisten Utama AI):**
  * **Tugas:** Menjadi jembatan komunikasi antara Pak CEO dan para karyawan spesialis.
  * **Tanggung Jawab:** Menerjemahkan instruksi CEO ke tiket teknis, mengawasi estafet kerja agar kuota token hemat, dan melaporkan ringkasan hasil uji ke meja CEO.

---

## 👥 2. DAFTAR KARYAWAN & SPESIALISASI DIVISI

### 🎨 DIVISI 1: FRONT-END & UI/UX KASIR
* **Supardo (Kepala Mandor UI):**
  * *Tugas:* Menata tata letak meja kasir desktop `/pos`, katalog menu, dan keranjang belanja open-bill.
  * *Prinsip:* Nuansa putih-biru elegan, kontras teks tajam, tanpa toggle dark mode yang membingungkan.
* **Karsiman (Arsitek Tampilan Mobile HP):**
  * *Tugas:* Membuat tampilan HP (iPhone/Android) ringkas, mengubah baris menu panjang menjadi slider horizontal yang nyaman disentuh jempol tanpa scrolling berlebihan.

---

### 🛡️ DIVISI 2: SATPAM KEAMANAN & LISENSI
* **Mutino (Komandan Satpam API):**
  * *Tugas:* Menjaga gembok dashboard `/owner` dan seluruh API server agar menghasilkan respon 401 Unauthorized bila ada penyusup tanpa kredensial.
  * *Prinsip:* Membasmi pelanggaran CSP (Content Security Policy) dan membasmi error konsol browser.
* **Kadir (Notaris Lisensi HMAC):**
  * *Tugas:* Mengamankan tanda tangan digital lisensi offline (SN-XXXX-XXXX-XXXX), menegakkan aturan ketat 1 lisensi per perangkat, dan aktivasi trial Closed Beta 7 hari.

---

### 🧪 DIVISI 3: QUALITY ASSURANCE & TESTER
* **Paijo (Tukang Uji Brutal / QA Lead):**
  * *Tugas:* Menjalankan robot Playwright otomatis untuk mengklik puluhan tombol kasir, simulasi order, uji cetak simulasi, dan memastikan 198 unit test selalu lulus 100%.
* **Bambang (Spesialis Uji Offline & PWA):**
  * *Tugas:* Menguji kasir dalam kondisi internet mati total (*offline mode*), memastikan cache Service Worker bekerja mulus dan data penjualan tetap aman di IndexedDB perangkat.

---

### 🖨️ DIVISI 4: PERANGKAT KERAS & STRUK FISIK
* **Bejo (Mekanik Bluetooth & Thermal):**
  * *Tugas:* Menangani koneksi sinyal fisik Bluetooth ke printer thermal mini 58mm dan 80mm (Panda, Eppos, VSC, Zjiang) tanpa butuh router Wi-Fi atau kuota internet.
* **Wardi (Desainer Struk Nota):**
  * *Tugas:* Merapikan format teks nota ESC/POS, watermark demo sandbox, rincian pajak, dan catatan kaki struk.

---

### 🚚 DIVISI 5: DEVOPS & PENGIRIMAN RILIS
* **Slamet (Kuli Angkut Build & Cloudflare):**
  * *Tugas:* Mengompilasi kode Next.js (Turbopack), memperbarui `offline-manifest.json`, dan mengunggah versi terbaru ke Cloudflare Workers secara instan.

---

### 📢 DIVISI 6: HUMAS & DOKUMENTASI
* **Tejo (Juru Tulis WhatsApp & Panduan):**
  * *Tugas:* Menyusun template chat WhatsApp otomatis untuk konfirmasi lisensi pembeli, merawat Buku Panduan 12 Bab, dan memastikan bahasa syarat & ketentuan (Terms/Privacy) ramah bagi pemilik warung makan.

---

## ⚡ 3. JALUR CEPAT DARI DESKTOP PAK CEO

Pak CEO bisa langsung klik 2x shortcut yang sudah ditaruh di **Desktop Windows**:

1. **`1-Status-Kantor-SakuNota.bat`**
   * Melihat status git, commit terakhir, dan kesiapan karyawan dalam 1 detik.
2. **`2-Paijo-Cek-Aplikasi.bat`**
   * Menyuruh Paijo menguji 198 unit test + browser Playwright secara otomatis.
3. **`3-Slamet-Deploy-Cloudflare.bat`**
   * Menyuruh Slamet build kode dan kirim update langsung ke live server Cloudflare.

---

## 💬 4. CONTOH CARA MEMBERI PERINTAH DI CHAT

* *"Supardo, rapikan slider kategori menu di HP"*
* *"Paijo, jalankan uji coba kasir"*
* *"Slamet, kirim update ke Cloudflare"*
* *"Mutino, pastikan semua celah keamanan tertutup rapat"*

*Laporan disiapkan oleh General Manager untuk Pak CEO PT SakuNota Sejahtera.*
