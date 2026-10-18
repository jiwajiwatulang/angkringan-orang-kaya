# Hasil pemeriksaan ikon SakuNota

## Paket aktif — 18 Oktober 2026

Paket yang disetujui: `Pictures/SakuNota_53_Ikon/SakuNota_Icons_Per_Halaman`, 53 bentuk SVG versi `-hitam.svg`. Biru tidak digunakan. Bentuk asli dipertahankan; warna `#0F172A` dinormalisasi ke `currentColor` dalam satu sprite `public/icons/sakunota-icons.svg` agar menu aktif dan tombol berwarna dapat memakai putih. Gambar asli di folder pengguna tidak diubah.

- Admin dan POS memakai komponen `LineIcon` yang sama, termasuk navigasi mobile, perangkat, kategori produk, dan aksi yang sudah berikon.
- Gembok memakai `icon-gembok-lock`, bukan PNG nomor 35. Banner PIN menggunakan latar amber muda, teks amber gelap, gembok hitam, dan tombol biru.
- Waiter Floor tetap di bawah Shift; memakai `icon-meja`. Katalog dan persediaan/opname tetap satu menu.
- Emoji bawaan di UI, pesan aktivasi, notifikasi, panduan, data contoh, dan teks struk dihapus atau diganti ikon SVG. Nama/data yang dimasukkan pengguna tidak diubah.
- Logo, animasi partikel pasif, fitur transaksi, API, dan penyimpanan tidak diganti. Paket disertakan dalam manifest offline melalui proses build yang sudah ada.

## Arsip pemeriksaan paket lama

Sumber: folder Pictures/Ikon Website SakuNota, 48 PNG bernomor. Semua telah diperiksa melalui lembar kontak.

| Nomor | Bentuk | Penempatan yang cocok |
|---|---|---|
| 35 | Lock biru/navy | Keamanan, PIN dan blind closing; dipakai sekarang menggantikan emoji lock |
| 31 atau 45 | Mesin kasir | Kasir depan |
| 32 atau 47 | Nota | Pesanan dan riwayat transaksi |
| 34 | Tumpukan/lapisan | Katalog produk |
| 48 | Paket | Persediaan, barang masuk/keluar |
| 38 | Batang grafik | Laporan/omzet |
| 39 | Dompet/kartu | Pembayaran |
| 40 | Profil orang | Operator/karyawan |
| 42 | Cloud dengan panah | Backup/sinkronisasi opsional; jangan dipakai untuk mengesankan transaksi POS disimpan di cloud |
| 36 | Tanda tanya | Bantuan |
| 12 atau 13 | Meja layanan | Waiter Floor / denah meja |
| 37 | Label | SKU atau harga produk |

Nomor 1 berupa lembar kumpulan ikon, bukan ikon tunggal. Nomor 14–20, 29–30 dan 43–44 merupakan variasi identitas/logo. Tidak perlu menaruh semua variasi pada navigasi.

Pada pembaruan sebelumnya hanya nomor 35 diterapkan. Paket tersebut sekarang digantikan oleh paket aktif di atas.
