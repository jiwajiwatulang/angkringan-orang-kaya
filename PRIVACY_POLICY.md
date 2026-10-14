# Kebijakan Privasi (Privacy Policy)
**Aplikasi:** POS Kasir Pintar UMKM  
**Terakhir Diperbarui:** 14 Oktober 2026  

Aplikasi POS Kasir Pintar UMKM ("Aplikasi") dibangun sebagai aplikasi kasir offline mandiri. Kebijakan ini menjelaskan bagaimana data dan izin perangkat Anda digunakan.

---

### 1. Penyimpanan Data Pengguna (100% Offline)
Aplikasi ini beroperasi **sepenuhnya secara lokal (offline)** pada perangkat Anda.
* Seluruh data menu, harga, nomor meja, nama pelanggan, dan riwayat transaksi penjualan disimpan secara lokal di dalam memori perangkat Anda menggunakan database lokal (`IndexedDB` / `LocalStorage`).
* Pengembang tidak memiliki server eksternal untuk mengumpulkan, melihat, mentransfer, atau menjual data transaksi atau data keuangan usaha Anda ke pihak mana pun.

---

### 2. Izin Perangkat (Permissions) yang Digunakan
Untuk menjalankan fungsinya dengan baik, Aplikasi meminta izin tertentu pada sistem Android:
* **BLUETOOTH & BLUETOOTH_CONNECT / BLUETOOTH_SCAN:**  
  Digunakan semata-mata untuk memindai, menghubungkan, dan mengirimkan data teks struk ke mesin printer thermal Bluetooth portabel (seperti Panda, Eppos, dan sejenisnya). Aplikasi tidak mengakses informasi pribadi lain melalui koneksi Bluetooth.
* **PENYIMPANAN / DOWNLOAD (Storage):**  
  Digunakan saat pengguna memilih untuk mengekspor laporan keuangan (format CSV) atau mengunduh file cadangan data (Backup JSON) ke penyimpanan perangkat.

---

### 3. Cadangan Data & Tanggung Jawab Pengguna
Karena Aplikasi bersifat offline tanpa database cloud:
* Pengguna bertanggung jawab penuh atas keamanan fisik perangkat mereka.
* Pengguna sangat disarankan untuk secara berkala menggunakan fitur **"Cadangkan Data (Backup JSON)"** di menu Pengaturan untuk menyimpan salinan data usaha Anda.

---

### 4. Perubahan Kebijakan
Kebijakan privasi ini dapat diperbarui sewaktu-waktu seiring dengan pembaruan fitur Aplikasi. Perubahan akan segera berlaku setelah dipublikasikan pada halaman ini.

---

### 5. Kontak
Jika Anda memiliki pertanyaan mengenai kebijakan privasi ini atau penggunaan Aplikasi, silakan hubungi pengembang melalui halaman dukungan Google Play Store.
