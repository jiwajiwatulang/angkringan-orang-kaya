import { publicPageMetadata } from '@/lib/publicMetadata';

export const metadata = publicPageMetadata(
  'Kebijakan Privasi',
  'Pelajari kebijakan privasi SakuNota, penyimpanan data transaksi lokal di perangkat, serta penggunaan data untuk pembelian dan aktivasi lisensi.',
  '/privacy',
);

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
