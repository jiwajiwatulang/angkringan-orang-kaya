# Perapian dashboard mobile — 24 Oktober 2026

Dashboard yang ada dipertahankan. Perubahan hanya pada tampilan dan interaksi; fungsi keuangan serta sinkronisasi tidak diubah.

- Navigasi Admin bawah dirender langsung ke body melalui portal, sehingga tidak mengikuti wadah halaman. Padding konten dan navigasi memperhitungkan safe area perangkat.
- Rincian grafik menjadi panel ringkas di dalam batas kartu dengan tombol tutup. Sentuh titik terdekat untuk membuka/menutup; klik area luar, scroll, pergantian periode/jenis grafik, resize, dan Escape membersihkan pilihan. Desktop mendukung hover dan keyboard.
- Lebar gambar grafik mengikuti kartu melalui ResizeObserver. Label tanggal ditampilkan secukupnya pada layar kecil, tanpa pengulangan hari/tanggal panjang.
- Skala memakai rb/jt dengan format Indonesia. Angka negatif tetap didukung. Judul Rata-rata per Nota menggantikan singkatan AOV; banner demo lebih ringkas pada HP.

Validasi: build produksi dan TypeScript lulus; 44 tes multi-device lulus; manifest 164 aset offline valid. Browser lokal menguji menu bawah terhadap batas viewport sebelum/sesudah scroll, tap rincian, tutup, pergantian periode, dan menu Lainnya. Pemeriksaan lebar 320, 390, 844, dan 1365 piksel tidak menunjukkan overflow horizontal. Pemeriksaan desktop mencakup hover dan penutupan saat pointer keluar kartu.

Pengujian memakai Chromium lokal dan data demo. Pengujian pada perangkat fisik iOS/Android dan pengaturan ukuran teks sistem berbeda tetap berguna; hasil ini tidak menjamin perilaku identik pada semua versi browser. Screenshot panjang dapat merekam menu fixed pada posisi viewport saat gambar disusun, sehingga posisi menu diuji terhadap viewport saat scroll, bukan hanya dari gambar panjang.

Status rilis: disiapkan untuk deployment.
