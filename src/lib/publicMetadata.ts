import type { Metadata } from 'next';

export const siteDescription = 'Kasir offline untuk retail, warung, kafe, dan restoran. Scan barcode, kelola stok, dan catat penjualan. Sekali bayar Rp50.000 per perangkat, tanpa biaya bulanan.';

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: 'id_ID',
      siteName: 'SakuNota',
      title: `${title} | SakuNota`,
      description,
      url: path,
      images: [{ url: '/logo-sakunota.png', width: 720, height: 208, alt: 'SakuNota' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | SakuNota`,
      description,
      images: ['/logo-sakunota.png'],
    },
  };
}
