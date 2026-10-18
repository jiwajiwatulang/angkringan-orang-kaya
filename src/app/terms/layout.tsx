import { publicPageMetadata } from '@/lib/publicMetadata';

export const metadata = publicPageMetadata(
  'Syarat dan Ketentuan',
  'Syarat dan ketentuan SakuNota: lisensi kasir sekali bayar tanpa biaya bulanan, satu perangkat satu lisensi, serta kebijakan pengembalian dana.',
  '/terms',
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
