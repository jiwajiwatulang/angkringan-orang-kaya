# Arsitektur dan flow SakuNota

## Pemisahan penyimpanan

| Komponen | Lokasi | Isi |
|---|---|---|
| Kasir dan Admin toko | IndexedDB perangkat: `AngkringanDB`, schema 9 | Produk, meja, nota, pembayaran, bukti, shift, kas, stok dan ledger |
| Demo kasir | IndexedDB perangkat: `SakuNotaDemoDB` | Simulasi yang terpisah dari data toko |
| Cache aplikasi | Service worker / CacheStorage | HTML, JavaScript, CSS, font dan ikon; bukan respons API |
| Metadata perangkat | localStorage / sessionStorage | Cache pengaturan, aktivasi dan sesi sesuai fungsi; bukan database transaksi utama |
| Portal Owner SakuNota | Cloudflare Worker + D1 binding `DB` | Pesanan lisensi, lisensi, sesi owner, percobaan login, beta dan tester |
| Midtrans | Layanan pembayaran eksternal | Pembayaran pembelian lisensi SakuNota |

Portal Owner memerlukan internet. Admin toko membaca data lokal, bukan rekap semua pedagang di D1.

## Struktur sistem

```mermaid
flowchart TB
  subgraph Perangkat[Perangkat toko]
    POS[Kasir POS]
    ADMIN[Admin toko dan dashboard]
    LOCAL[(IndexedDB AngkringanDB)]
    DEMO[(SakuNotaDemoDB)]
    SW[Service worker dan cache aset]
    POS --> LOCAL
    ADMIN --> LOCAL
    SW --> POS
    LATIHAN[Mode demo] --> DEMO
  end
  subgraph Cloud[Cloudflare]
    WORKER[Worker API]
    D1[(D1 lisensi dan pembelian)]
    OWNER[Portal Owner SakuNota]
    OWNER --> WORKER
    WORKER --> D1
  end
  POS -->|Aktivasi dan verifikasi saat online| WORKER
  PEMBELI[Pembeli lisensi] --> WORKER
  WORKER --> MIDTRANS[Midtrans]
  MIDTRANS -->|Webhook bertanda tangan| WORKER
```

## Flow toko harian

```mermaid
flowchart TD
  MULAI[Buka aplikasi] --> AKTIF{Lisensi atau trial aktif?}
  AKTIF -->|Belum| INTERNET[Aktivasi melalui API Cloudflare]
  INTERNET --> AKTIF
  AKTIF -->|Ya| SHIFT[Buka shift dan isi kas awal]
  SHIFT --> ITEM[Pilih produk atau scan barcode]
  ITEM --> SIMPAN{Stok cukup?}
  SIMPAN -->|Tidak| KOREKSI[Kurangi jumlah atau periksa stok]
  KOREKSI --> ITEM
  SIMPAN -->|Ya| ATOM[Simpan nota, item dan perubahan stok secara atomik]
  ATOM --> BAYAR[Catat pembayaran penuh atau sebagian]
  BAYAR --> STRUK[Cetak struk bila tersedia]
  STRUK --> LANJUT{Masih berjualan?}
  LANJUT -->|Ya| ITEM
  LANJUT -->|Tidak| FISIK[Hitung uang fisik dan simpan tutup shift]
  FISIK --> LAPORAN[Tampilkan selisih dan Z-Report]
  LAPORAN --> BACKUP[Unduh backup toko]
```

## Flow pembelian lisensi

```mermaid
sequenceDiagram
  actor Pembeli
  participant Web as Website SakuNota
  participant API as Worker API
  participant DB as Cloudflare D1
  participant M as Midtrans
  Pembeli->>Web: Isi data pembelian
  Web->>API: POST /api/orders/create
  API->>DB: Simpan pesanan Rp50.000
  Web->>API: POST /api/payment/snap
  API->>M: Buat sesi pembayaran
  M-->>Web: Token Snap
  Pembeli->>M: Melakukan pembayaran
  M->>API: POST /api/payment/midtrans
  API->>API: Periksa tanda tangan dan nominal
  API->>DB: Catat lunas dan terbitkan lisensi
  Web->>API: POST /api/orders/check
  API-->>Web: Status terverifikasi dan lisensi
  Pembeli->>API: POST /api/license/activate
  API->>DB: Ikat lisensi pada perangkat
  API-->>Web: Token, jenis lisensi, masa berlaku
```

Callback sukses dari popup bukan bukti akhir. Website memeriksa status pesanan server; bila belum terkonfirmasi, tampilkan status menunggu. Transfer manual diverifikasi pengelola melalui portal Owner.

## Flow stok dan opname

```mermaid
flowchart TD
  PRODUK[Produk katalog] --> AWAL[Hitung dan aktifkan saldo awal]
  AWAL --> MUTASI{Sumber perubahan}
  MUTASI -->|Pesanan| RESERVASI[Kurangi stok saat nota disimpan]
  MUTASI -->|Pemasok atau retur layak jual| MASUK[Tambah stok dan alasan]
  MUTASI -->|Rusak atau hilang| KELUAR[Kurangi stok dan alasan]
  MUTASI -->|Opname| HITUNG[Input jumlah fisik]
  HITUNG --> CEK{Saldo berubah selama hitung?}
  CEK -->|Ya| ULANG[Muat ulang dan hitung ulang]
  ULANG --> HITUNG
  CEK -->|Tidak| SELISIH[Simpan selisih penyesuaian]
  RESERVASI --> LEDGER[(Saldo produk dan ledger lokal)]
  MASUK --> LEDGER
  KELUAR --> LEDGER
  SELISIH --> LEDGER
  LEDGER --> CADANGAN[Backup JSON termasuk stok]
```

Pembayaran lanjutan tidak mengurangi stok kedua kali. Pembatalan nota belum dibayar mengembalikan stok. Refund uang dan retur barang diperlakukan terpisah.

## Endpoint penting

Metode mengikuti kode, bukan daftar lama: pengecekan pesanan mendukung POST; `/api/owner/verify` adalah POST untuk memverifikasi pesanan manual dan menerbitkan lisensi, bukan GET pemeriksaan sesi. Portal memeriksa sesi melalui endpoint Owner yang terautentikasi seperti metrics. `/api/owner/secrets` sekarang hanya mengembalikan status boolean konfigurasi tanpa nilai secret.
