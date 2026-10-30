import React from 'react';

const names: Record<string, string> = {
  cashier: 'icon-kasir-pos', devices: 'icon-kasir-pos', tables: 'icon-kelola-meja', table: 'icon-meja',
  receipt: 'icon-transaksi', shift: 'icon-shift-kas', catalog: 'icon-katalog-stok',
  stock: 'icon-katalog-stok', settings: 'icon-pengaturan', chart: 'icon-dashboard',
  store: 'icon-toko', home: 'icon-home', printer: 'icon-printer', bluetooth: 'icon-bluetooth',
  lock: 'icon-gembok-lock', pin: 'icon-kunci-pin', security: 'icon-keamanan',
  tax: 'icon-pajak-diskon', backup: 'btn-simpan-backup', info: 'status-tips',
  import: 'btn-import', export: 'btn-export', camera: 'btn-kamera', search: 'btn-cari',
  add: 'btn-tambah', edit: 'btn-edit', delete: 'btn-hapus', copy: 'btn-salin',
  attachment: 'btn-lampiran', guide: 'icon-panduan', cash: 'icon-tunai-cash',
  card: 'icon-kartu-debit', qris: 'icon-ewallet-qris', split: 'icon-split-bill',
  success: 'status-sukses', error: 'status-gagal', warning: 'status-peringatan',
  waiting: 'status-menunggu', available: 'status-tersedia', soldout: 'status-habis',
  license: 'icon-lisensi-resmi', tester: 'icon-lisensi-tester', demo: 'icon-sandbox-demo',
  logout: 'icon-logout', sync: 'icon-sync-reset', lightning: 'icon-kilat',
  food: 'cat-makanan-utama', drink: 'cat-minuman', skewers: 'cat-sate-sundukan',
  snack: 'cat-snack-gorengan', bread: 'cat-roti-bakar', takeaway: 'cat-takeaway',
  bundle: 'cat-paket-hemat',
};

export default function LineIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  const id = names[name] || names.info;
  return <svg aria-hidden="true"focusable="false"className={`sakunota-icon ${className}`} viewBox="0 0 24 24"><use href={`/icons/sakunota-icons.svg#${id}`} /></svg>;
}
