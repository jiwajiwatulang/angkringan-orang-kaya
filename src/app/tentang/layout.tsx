import { publicPageMetadata } from '@/lib/publicMetadata';

export const metadata = publicPageMetadata(
  'Tentang Kami',
  'Kenali SakuNota, aplikasi kasir offline untuk UMKM retail, warung, kafe, dan restoran. Pelajari cerita, prinsip, serta kontak resmi SakuNota.',
  '/tentang',
);

export default function TentangLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
