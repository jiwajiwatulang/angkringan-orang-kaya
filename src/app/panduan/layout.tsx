import { publicPageMetadata } from '@/lib/publicMetadata';

export const metadata = publicPageMetadata(
  'Panduan Penggunaan',
  'Panduan SakuNota: aktivasi lisensi, kasir dan shift, scan barcode, foto produk, stok/opname, printer Bluetooth, serta ekspor, impor, dan backup JSON.',
  '/panduan',
);

export default function PanduanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
