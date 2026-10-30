import { publicPageMetadata, breadcrumbJsonLd, jsonLdHtml } from '@/lib/publicMetadata';

export const metadata = publicPageMetadata(
  'Syarat dan Ketentuan',
  'Syarat dan ketentuan SakuNota: lisensi kasir sekali bayar tanpa biaya bulanan, satu toko maksimal dua perangkat (Pemilik dan Kasir), serta kebijakan pengembalian dana.',
  '/terms',
);

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdHtml(breadcrumbJsonLd('Syarat & Ketentuan', '/terms')) }}
      />
      {children}
    </>
  );
}
