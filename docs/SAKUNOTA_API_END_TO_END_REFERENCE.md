# SAKUNOTA POS - DOKUMENTASI LENGKAP END-TO-END API

Dokumen ini memuat spesifikasi teknis lengkap seluruh antarmuka pemrograman aplikasi (API) SakuNota POS, mencakup:
1. Endpoint Publik (Pemesanan, Pengecekan, Pembayaran, Aktivasi Lisensi, Validasi Promo, Pendaftaran Beta)
2. Gateway Pembayaran Midtrans (Snap, Notifikasi Webhook, Sinkronisasi Otomatis)
3. Protokol Kriptografi Lisensi & Pengikatan Perangkat (Ed25519 & HMAC-SHA256)
4. Telemetri Perangkat & Kehadiran Kasir (Device Model, Lokasi Cloudflare, Last Seen)
5. Endpoint Khusus Owner / Administrator (Autentikasi Sesi, Lisensi Komersial, Lisensi Tester, Voucher Promo, Audit Log)
6. Skema Basis Data D1 (SQLite Edge) & Dexie IndexedDB (Offline Storage)

---

## 1. Informasi Umum & Dasar URL

- **URL Produksi Utama**: `https://sakunota.my.id`
- **URL Alternatif Worker**: `https://angkringan-orang-kaya.ranutarde.workers.dev`
- **Protokol**: HTTPS / HTTP/2 / HTTP/3
- **Format Pertukaran Data**: `application/json`
- **Zona Waktu Standar**: UTC (ISO-8601) / Format Tampilan Lokal Indonesia (WIB)
- **Model Harga**: Sekali bayar Rp 50.000 (*Termasuk PPN 11%*: DPP Rp 45.045 + PPN Rp 4.955)

---

## 2. Ringkasan Endpoint

| No | Metode | Path Endpoint | Akses | Fungsi |
|---|---|---|---|---|
| 1 | `POST` | `/api/orders/create` | Publik | Membuat pesanan baru lisensi SakuNota |
| 2 | `POST` | `/api/orders/check` | Publik | Memeriksa status pesanan & mengambil lisensi |
| 3 | `POST` | `/api/orders/upload-proof` | Publik | Mengunggah foto bukti transfer bank manual |
| 4 | `GET` | `/api/payment/config` | Publik | Mengambil konfigurasi client Midtrans & bank tujuan |
| 5 | `POST` | `/api/payment/snap` | Publik | Menghasilkan token Snap & URL pembayaran Midtrans |
| 6 | `POST` | `/api/payment/midtrans` | Webhook | Menerima callback notifikasi pembayaran Midtrans |
| 7 | `GET` | `/api/payment/midtrans` | Publik | Healthcheck endpoint webhook pembayaran |
| 8 | `POST` | `/api/license/activate` | Publik | Mengikat kode lisensi ke perangkat fisik |
| 9 | `POST` | `/api/license/verify` | Publik | Memvalidasi lisensi online & mencatat telemetri |
| 10 | `POST` | `/api/promo/check` | Publik | Memvalidasi kode kupon promo / voucher diskon |
| 11 | `POST` | `/api/beta/register` | Publik | Pendaftaran program uji coba tertutup |
| 12 | `GET` | `/api/beta/status` | Publik | Pengecekan status pendaftaran beta |
| 13 | `POST` | `/api/beta/status` | Publik | Pengecekan status beta dengan kredensial |
| 14 | `POST` | `/api/owner/login` | Publik (Lockout) | Autentikasi akun owner dengan proteksi brute-force |
| 15 | `POST` | `/api/owner/logout` | Owner (Bearer) | Menghapus sesi owner secara permanen |
| 16 | `POST` | `/api/owner/verify` | Owner (Bearer) | Memverifikasi keabsahan sesi token owner |
| 17 | `GET` | `/api/owner/metrics` | Owner (Bearer) | Statistik ringkas penjualan, lisensi, & antrean |
| 18 | `GET` | `/api/owner/orders` | Owner (Bearer) | Menampilkan seluruh data pesanan & telemetri perangkat |
| 19 | `PUT` | `/api/owner/orders` | Owner (Bearer) | Sinkronisasi Midtrans, verifikasi manual, batal, arsip |
| 20 | `DELETE` | `/api/owner/orders` | Owner (Bearer) | Menghapus data pengujian dengan audit log |
| 21 | `GET` | `/api/owner/licenses` | Owner (Bearer) | Menampilkan seluruh lisensi komersial & status perangkat |
| 22 | `PUT` | `/api/owner/licenses` | Owner (Bearer) | Melepas ikatan perangkat (unbind) atau mencabut lisensi |
| 23 | `GET` | `/api/owner/tester-license` | Owner (Bearer) | Menampilkan daftar lisensi tester |
| 24 | `POST` | `/api/owner/tester-license` | Owner (Bearer) | Menerbitkan kode lisensi tester baru (7-30 hari) |
| 25 | `PUT` | `/api/owner/tester-license` | Owner (Bearer) | Melepas ikatan perangkat atau mencabut lisensi tester |
| 26 | `GET` | `/api/owner/beta` | Owner (Bearer) | Menampilkan pendaftar uji coba tertutup |
| 27 | `POST` | `/api/owner/beta` | Owner (Bearer) | Persetujuan, penolakan, perpanjangan, atau konversi beta |
| 28 | `GET` | `/api/owner/promos` | Owner (Bearer) | Menampilkan seluruh kode promo & kuota pemakaian |
| 29 | `POST` | `/api/owner/promos` | Owner (Bearer) | Membuat promo baru, toggle status, atau hapus promo |
| 30 | `GET` | `/api/owner/secrets` | Owner (Bearer) | Audit kelengkapan environment variable server |

---

## 3. Spesifikasi Detail Endpoint Publik

### 3.1. Buat Pesanan Baru (`POST /api/orders/create`)
Mendaftarkan calon pembeli ke basis data D1 dan menerbitkan `orderId` unik serta `accessCode` rahasia.

**Headers**:
```http
Content-Type: application/json
```

**Request Body**:
```json
{
  "buyerName": "Ahmad Subagio",
  "businessName": "Kopi Saku Nusantara",
  "whatsapp": "081234567890",
  "email": "ahmad@example.com",
  "npwp": "125383232617000",
  "promoCode": "DISKON15"
}
```

**Field Description**:
- `buyerName` (string, wajib): Nama lengkap pemilik usaha.
- `businessName` (string, wajib): Nama warung / toko / cafe.
- `whatsapp` (string, wajib): Nomor WhatsApp aktif pembeli (minimal 9 digit).
- `email` (string, opsional): Alamat email pembeli untuk arsip.
- `npwp` (string, opsional): Nomor Pokok Wajib Pajak pembeli untuk keperluan faktur pajak.
- `promoCode` (string, opsional): Kode voucher promo yang masih berlaku.

**Response 201 Created**:
```json
{
  "success": true,
  "order": {
    "orderId": "SN-2026-T8R4",
    "accessCode": "KOD-7C2A9B",
    "buyerName": "Ahmad Subagio",
    "businessName": "Kopi Saku Nusantara",
    "whatsapp": "081234567890",
    "email": "ahmad@example.com",
    "npwp": "125383232617000",
    "amount": 50000,
    "originalAmount": 50000,
    "discountAmount": 0,
    "promoCode": null,
    "paymentMethod": "Transfer Bank BCA",
    "bankAccount": "2582118451 a.n. REZA RESTU RENGGA HARDIANTO",
    "status": "menunggu_verifikasi",
    "createdAt": "2026-10-21T01:15:00.000Z"
  }
}
```

---

### 3.2. Cek Status Pesanan (`POST /api/orders/check`)
Memeriksa status pembayaran dan mengambil kode lisensi jika sudah lunas.

**Request Body**:
```json
{
  "orderId": "SN-2026-T8R4",
  "accessCode": "KOD-7C2A9B"
}
```
*Catatan*: `accessCode` dapat berupa kode akses rahasia (`KOD-XXXX`) atau nomor WhatsApp yang didaftarkan saat memesan.

**Response 200 (Lunas / Lisensi Terbit)**:
```json
{
  "success": true,
  "order": {
    "orderId": "SN-2026-T8R4",
    "accessCode": "KOD-7C2A9B",
    "businessName": "Kopi Saku Nusantara",
    "buyerName": "Ahmad Subagio",
    "whatsapp": "081234567890",
    "status": "lunas_lisensi_terbit",
    "licenseKey": "SN-2026-7A9B-8F4C",
    "boundDeviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
    "deviceName": "HP Kasir Utama",
    "amount": 50000,
    "createdAt": "2026-10-21T01:15:00.000Z",
    "verifiedAt": "2026-10-21T01:18:30.000Z"
  }
}
```

---

### 3.3. Unggah Bukti Transfer Bank (`POST /api/orders/upload-proof`)
Melampirkan foto struk / screenshot m-Banking untuk pesanan transfer BCA manual.

**Request Body**:
```json
{
  "orderId": "SN-2026-T8R4",
  "accessCode": "KOD-7C2A9B",
  "fileName": "bukti_transfer_bca.jpg",
  "fileData": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..."
}
```

**Response 200**:
```json
{
  "success": true,
  "order": {
    "orderId": "SN-2026-T8R4",
    "transferProofName": "bukti_transfer_bca.jpg",
    "status": "menunggu_verifikasi"
  }
}
```

---

### 3.4. Dapatkan Konfigurasi Pembayaran (`GET /api/payment/config`)
Menyediakan Client Key Midtrans publik dan nomor rekening pembayaran resmi.

**Response 200**:
```json
{
  "success": true,
  "clientKey": "SB-Mid-client-XXXXXX",
  "isProduction": false,
  "bankName": "Bank BCA",
  "accountNumber": "2582118451",
  "accountName": "REZA RESTU RENGGA HARDIANTO"
}
```

---

### 3.5. Buat Sesi Pembayaran Midtrans Snap (`POST /api/payment/snap`)
Membuat transaksi di gerbang Midtrans untuk pembayaran instan via QRIS (GoPay, OVO, ShopeePay, DANA) atau Virtual Account.

**Request Body**:
```json
{
  "orderId": "SN-2026-T8R4",
  "accessCode": "KOD-7C2A9B"
}
```

**Response 200**:
```json
{
  "success": true,
  "token": "d748f228-4032-4752-9599-XXXXXXXXXXXX",
  "redirectUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/d748f228-4032-4752-9599-XXXXXXXXXXXX"
}
```

---

### 3.6. Webhook Callback Midtrans (`POST /api/payment/midtrans`)
Dipanggil secara asinkron oleh server Midtrans saat status transaksi berubah (`settlement`, `capture`, `cancel`, `expire`, `deny`).

**Keamanan**:
- Memeriksa SHA512 signature hash: `SHA512(order_id + status_code + gross_amount + ServerKey)`
- Pemrosesan idempotensi: Pesanan yang sudah lunas tidak diproses ulang.
- Penerbitan lisensi dan pencatatan riwayat dilakukan secara atomik di Cloudflare D1.

**Payload Masuk (Midtrans Standard)**:
```json
{
  "order_id": "SN-2026-T8R4",
  "status_code": "200",
  "gross_amount": "50000.00",
  "signature_key": "abc123def456...",
  "transaction_status": "settlement",
  "payment_type": "qris"
}
```

**Response 200**:
```json
{
  "status": "OK"
}
```

---

## 4. Protokol Lisensi, Telemetri, & Validasi Perangkat

### 4.1. Aktivasi Lisensi di Perangkat Kasir (`POST /api/license/activate`)
Mengikat lisensi ke perangkat kasir secara kriptografis menggunakan pasangan kunci Ed25519 dan mencatat telemetri perangkat.

**Request Body**:
```json
{
  "licenseKey": "SN-2026-7A9B-8F4C",
  "deviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
  "deviceName": "HP Kasir Utama",
  "deviceModel": "Samsung Galaxy A54 5G (Android 14) • Chrome [412x915]",
  "deviceProof": {
    "action": "activate",
    "licenseKey": "SN-2026-7A9B-8F4C",
    "deviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
    "timestamp": 1792489000000,
    "publicKey": {
      "crv": "Ed25519",
      "kty": "OKP",
      "x": "..."
    },
    "signature": "..."
  }
}
```

**Response 200**:
```json
{
  "success": true,
  "activationToken": "SN2.eyJs...",
  "businessName": "Kopi Saku Nusantara",
  "deviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
  "licenseKey": "SN-2026-7A9B-8F4C"
}
```

**Karakteristik Keamanan**:
- **Atomic First Claim**: Hanya perangkat pertama yang menyerahkan bukti kepemilikan yang dapat mengikat lisensi.
- **Token SN2**: Ditandatangani dengan kunci privat Ed25519 server. Perangkat kasir menyimpan token ini di IndexedDB untuk bekerja 100% offline tanpa batas waktu.

---

### 4.2. Validasi Lisensi & Sinkronisasi Kehadiran (`POST /api/license/verify`)
Dijalankan secara berkala saat kasir terhubung ke internet untuk memperbarui timestamp terakhir aktif dan lokasi. Jika internet mati, verifikasi otomatis *fallback* ke tanda tangan kriptografi lokal dalam 4 detik tanpa mengganggu transaksi.

**Request Body**:
```json
{
  "licenseKey": "SN-2026-7A9B-8F4C",
  "deviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
  "token": "SN2.eyJs...",
  "deviceModel": "Samsung Galaxy A54 5G (Android 14) • Chrome [412x915]",
  "deviceProof": { ... }
}
```

**Response 200**:
```json
{
  "valid": true,
  "licenseKey": "SN-2026-7A9B-8F4C",
  "deviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
  "businessName": "Kopi Saku Nusantara",
  "licenseType": "berbayar",
  "status": "active"
}
```

---

### 4.3. Cek Kode Kupon Promo (`POST /api/promo/check`)
Memvalidasi keabsahan kupon diskon dan menghitung potongan nominal secara langsung.

**Request Body**:
```json
{
  "code": "DISKON15"
}
```

**Response 200**:
```json
{
  "valid": true,
  "code": "DISKON15",
  "discountType": "nominal",
  "discountValue": 15000,
  "discountAmount": 15000,
  "finalAmount": 35000,
  "description": "Potongan Rp 15.000 Peluncuran Perdana"
}
```

---

### 4.4. Pendaftaran Uji Coba Beta (`POST /api/beta/register`)
Mendaftarkan calon pedagang untuk mendapatkan masa uji coba gratis 7-30 hari.

**Request Body**:
```json
{
  "ownerName": "Bambang Wijaya",
  "businessName": "Warung Makan Berkah",
  "whatsapp": "081987654321",
  "email": "bambang@example.com"
}
```

**Response 201**:
```json
{
  "success": true,
  "registration": {
    "registrationId": "REG-A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4E5F60718",
    "status": "pending",
    "durationDays": 7,
    "registeredAt": "2026-10-21T01:20:00.000Z"
  }
}
```

---

## 5. Antarmuka Pemrograman Owner (Bearer Token Protected)

Seluruh rute pada bagian ini mewajibkan header:
```http
Authorization: Bearer <owner_session_token>
```

### 5.1. Login Akun Owner (`POST /api/owner/login`)
Autentikasi dengan proteksi kunci otomatis (*brute-force lockout*) selama 30 detik setelah 5 kegagalan berturut-turut.

**Request Body**:
```json
{
  "username": "<SAKUNOTA_OWNER_USERNAME>",
  "password": "<SAKUNOTA_OWNER_PASSWORD>"
}
```

**Response 200**:
```json
{
  "success": true,
  "token": "owner:a1b2c3d4...:1792576000000:signature"
}
```

---

### 5.2. Ringkasan Metrik Dashboard (`GET /api/owner/metrics`)
Menampilkan ringkasan metrik waktu-nyata dari D1.

**Response 200**:
```json
{
  "success": true,
  "totalPembeli": 42,
  "pembayaranBerhasil": 38,
  "lisensiAktif": 38,
  "penggunaAktif": 31,
  "menungguVerifikasi": 3,
  "menungguPembayaran": 1
}
```

---

### 5.3. Kelola Pesanan (`GET / PUT / DELETE /api/owner/orders`)

#### GET: Daftar Seluruh Pesanan & Telemetri
Menghasilkan daftar pesanan lengkap dengan informasi perangkat, IP, lokasi, dan status online.

**Response 200**:
```json
{
  "success": true,
  "orders": [
    {
      "orderId": "SN-2026-T8R4",
      "accessCode": "KOD-7C2A9B",
      "buyerName": "Ahmad Subagio",
      "businessName": "Kopi Saku Nusantara",
      "whatsapp": "081234567890",
      "email": "ahmad@example.com",
      "npwp": "125383232617000",
      "amount": 50000,
      "originalAmount": 50000,
      "status": "lunas_lisensi_terbit",
      "licenseKey": "SN-2026-7A9B-8F4C",
      "boundDeviceId": "SN-DEV-96810D8D-5D59-418B-9547-E46F6BBBB028",
      "deviceName": "HP Kasir Utama",
      "deviceModel": "Samsung Galaxy A54 5G (Android 14) • Chrome [412x915]",
      "deviceLocation": "Surabaya, Jawa Timur, Indonesia",
      "deviceIp": "180.252.XX.XX",
      "lastConnectedAt": "2026-10-21T01:25:00.000Z",
      "createdAt": "2026-10-21T01:15:00.000Z"
    }
  ]
}
```

#### PUT: Tindakan Terhadap Pesanan
**Actions**:
- `action: "sync_midtrans"`: Cek status mutasi ke server Midtrans.
- `action: "verify_payment"`: Verifikasi penerimaan uang manual & terbitkan lisensi resmi.
- `action: "cancel"`: Batalkan pesanan unpaid.
- `action: "archive"`: Sembunyikan pesanan pengujian ke arsip.

**Contoh Body (Verifikasi & Terbitkan Lisensi)**:
```json
{
  "action": "verify_payment",
  "orderId": "SN-2026-T8R4"
}
```

#### DELETE: Pembersihan Pesanan Pengujian (Audit Log)
Menghapus data pesanan test dengan konfirmasi sandi owner dan catatan audit yang tidak dapat dihapus.

**Request Body**:
```json
{
  "orderId": "SN-2026-TEST99",
  "auditNote": "Pembersihan data pengujian QA otomatis",
  "passwordConfirm": "<SAKUNOTA_OWNER_PASSWORD>"
}
```

---

### 5.4. Kelola Lisensi Komersial (`GET / PUT /api/owner/licenses`)

#### GET: Daftar Lisensi
Menampilkan seluruh lisensi resmi yang beredar.

#### PUT: Unbind / Revoke Lisensi
- `action: "unbind"`: Melepas ikatan perangkat agar pembeli dapat mengaktifkan lisensinya di HP kasir baru.
- `action: "revoke"`: Menonaktifkan lisensi secara permanen.

**Contoh Body (Lepas Perangkat / Unbind)**:
```json
{
  "action": "unbind",
  "licenseKey": "SN-2026-7A9B-8F4C"
}
```

---

### 5.5. Kelola Lisensi Tester (`GET / POST / PUT /api/owner/tester-license`)

#### POST: Terbitkan Lisensi Tester
Menerbitkan lisensi pengujian dengan batas kedaluwarsa 7 hingga 30 hari.

**Request Body**:
```json
{
  "recipientName": "Marliyane",
  "whatsapp": "081354132135",
  "durationDays": 30,
  "notes": "Pengujian kasir warung mie ayam"
}
```

**Response 201**:
```json
{
  "success": true,
  "license": {
    "licenseKey": "SN-TEST-HTR5-PG6M",
    "recipientName": "Marliyane",
    "whatsapp": "081354132135",
    "durationDays": 30,
    "expiresAt": "2026-11-20T01:30:00.000Z",
    "notes": "Pengujian kasir warung mie ayam"
  }
}
```

---

### 5.6. Kelola Kode Kupon Promo (`GET / POST /api/owner/promos`)

#### POST: Buat / Kelola Kode Promo
- `action: "create"`: Mendaftarkan kupon baru.
- `action: "toggle"`: Mengaktifkan/menonaktifkan kupon.
- `action: "delete"`: Menghapus kupon.

**Contoh Body (Buat Promo)**:
```json
{
  "action": "create",
  "code": "DISKON20",
  "discountType": "nominal",
  "discountValue": 20000,
  "maxUsage": 50,
  "description": "Voucher Diskon Rp 20.000 Event UMKM"
}
```

---

### 5.7. Audit Kelengkapan Secrets Server (`GET /api/owner/secrets`)
Memeriksa kesiapan konfigurasi tanpa membocorkan isi teks rahasia ke klien.

**Response 200**:
```json
{
  "success": true,
  "secrets": {
    "MIDTRANS_SERVER_KEY": true,
    "MIDTRANS_CLIENT_KEY": true,
    "MIDTRANS_MERCHANT_ID": true,
    "SAKUNOTA_OWNER_USERNAME": true,
    "SAKUNOTA_OWNER_PASSWORD": true,
    "SAKUNOTA_OWNER_SALT": true,
    "SAKUNOTA_SERVER_SECRET": true,
    "SAKUNOTA_LICENSE_PRIVATE_JWK": true
  }
}
```

---

## 6. Skema Basis Data Lengkap

### 6.1. Cloudflare D1 (SQLite Edge)

```sql
-- Kunci publik kriptografi per perangkat terdaftar
CREATE TABLE IF NOT EXISTS LicenseDeviceKeys (
  licenseKey TEXT PRIMARY KEY,
  deviceId TEXT NOT NULL,
  publicKey TEXT NOT NULL
);

-- Riwayat telemetri perangkat dan IP koneksi
CREATE TABLE IF NOT EXISTS DeviceTelemetry (
  licenseKey TEXT PRIMARY KEY,
  deviceId TEXT,
  deviceModel TEXT,
  location TEXT,
  ipAddress TEXT,
  lastSeenAt TEXT
);

-- Data pesanan pelanggan
CREATE TABLE IF NOT EXISTS CustomerOrders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  orderId TEXT UNIQUE NOT NULL,
  accessCode TEXT NOT NULL,
  buyerName TEXT NOT NULL,
  businessName TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  npwp TEXT,
  amount INTEGER NOT NULL DEFAULT 50000,
  paymentMethod TEXT NOT NULL DEFAULT 'Transfer Bank BCA',
  bankAccount TEXT NOT NULL DEFAULT '2582118451 a.n. REZA RESTU RENGGA HARDIANTO',
  transferProofName TEXT,
  transferProofData TEXT,
  paymentLink TEXT,
  status TEXT NOT NULL DEFAULT 'menunggu_verifikasi',
  licenseKey TEXT,
  boundDeviceId TEXT,
  createdAt TEXT NOT NULL,
  verifiedAt TEXT,
  lastSeenAt TEXT,
  promoCode TEXT,
  discountAmount INTEGER DEFAULT 0,
  originalAmount INTEGER DEFAULT 50000
);

-- Data lisensi resmi komersial
CREATE TABLE IF NOT EXISTS Licenses (
  licenseKey TEXT PRIMARY KEY,
  orderId TEXT NOT NULL,
  businessName TEXT NOT NULL,
  boundDeviceId TEXT,
  deviceName TEXT,
  issuedAt TEXT NOT NULL,
  activatedAt TEXT,
  lastConnectedAt TEXT,
  signature TEXT NOT NULL,
  appVersion TEXT DEFAULT 'v2.6.7',
  activeDays INTEGER DEFAULT 1,
  licenseType TEXT DEFAULT 'berbayar',
  revoked INTEGER NOT NULL DEFAULT 0
);

-- Sesi terautentikasi portal Owner
CREATE TABLE IF NOT EXISTS OwnerSessions (
  sessionId TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  expiresAt INTEGER NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0
);

-- Proteksi percobaan login gagal (Anti Brute-force)
CREATE TABLE IF NOT EXISTS OwnerAuthAttempts (
  ip TEXT PRIMARY KEY,
  failedAttempts INTEGER NOT NULL DEFAULT 0,
  lockedUntil INTEGER NOT NULL DEFAULT 0
);

-- Lisensi masa pengujian tester
CREATE TABLE IF NOT EXISTS TesterLicenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  licenseKey TEXT UNIQUE NOT NULL,
  recipientName TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  durationDays INTEGER NOT NULL,
  expiresAt TEXT,
  notes TEXT,
  boundDeviceId TEXT,
  deviceName TEXT,
  createdAt TEXT NOT NULL,
  activatedAt TEXT,
  revoked INTEGER NOT NULL DEFAULT 0
);

-- Pendaftaran program uji coba tertutup
CREATE TABLE IF NOT EXISTS BetaRegistrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registrationId TEXT UNIQUE NOT NULL,
  trialLicenseKey TEXT UNIQUE,
  ownerName TEXT NOT NULL,
  businessName TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  boundDeviceId TEXT,
  deviceName TEXT,
  registeredAt TEXT NOT NULL,
  approvedAt TEXT,
  activatedAt TEXT,
  expiresAt TEXT,
  lastConnectedAt TEXT,
  durationDays INTEGER NOT NULL DEFAULT 7,
  rejectionReason TEXT,
  auditLog TEXT
);

-- Master kupon promo & voucher diskon
CREATE TABLE IF NOT EXISTS PromoCodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  discountType TEXT NOT NULL DEFAULT 'nominal',
  discountValue INTEGER NOT NULL,
  description TEXT,
  maxUsage INTEGER DEFAULT 0,
  usageCount INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL
);
```

### 6.2. Skema Dexie IndexedDB Lokal (Kasir Offline)

Di dalam browser perangkat kasir fisik, data disimpan secara lokal pada IndexedDB `SakunotaPOSDB` (versi 9):

```typescript
db.version(9).stores({
  orders: '++id, uuid, orderNumber, createdAt, status, total, paymentMethod, tableId, isSynced',
  menuItems: '++id, nama, harga, kategori, isSoldOut, urutan',
  categories: '++id, nama, urutan',
  tables: '++id, nomor, status',
  shifts: '++id, status, operatorName, startTime, endTime',
  stockMovements: '++id, menuItemId, delta, reason, createdAt',
  discounts: '++id, nama, tipe, nilai, aktif',
  promos: '++id, kode, tipe, nilai, aktif',
  settings: 'key'
});
```

---

## 7. Format Faktur / Invoice Resmi (Perpajakan Indonesia)

- **Penerbit**: PT Pemuda Gaya Bebas
- **NPWP Penerbit**: 125383232617000
- **Website**: https://sakunota.my.id
- **Ketentuan PPN**: Nilai tagihan menganut asas **Termasuk Pajak (*Tax-Inclusive*)**:
  $$\text{DPP} = \left\lfloor \frac{\text{Total Tagihan}}{1.11} \right\rceil = \text{Rp } 45.045$$
  $$\text{PPN } 11\% = \text{Total Tagihan} - \text{DPP} = \text{Rp } 4.955$$
  $$\text{Total Pembayaran} = \text{Rp } 50.000$$
- **NPWP Pembeli**: Dicantumkan otomatis jika diisi saat checkout, atau tercatat sebagai konsumen akhir non-PKP jika dikosongkan.
- **Legalitas**: Diterbitkan secara elektronik dan sah tanpa tanda tangan basah.
