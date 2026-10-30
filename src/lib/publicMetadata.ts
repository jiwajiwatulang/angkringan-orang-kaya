import type { Metadata } from 'next';

export const siteDescription = 'Kasir offline untuk retail, warung, kafe, dan restoran. Scan barcode, kelola stok, dan catat penjualan. Sekali bayar Rp50.000 untuk satu toko (maksimal dua perangkat), tanpa biaya bulanan.';

export const SITE_URL = 'https://sakunota.my.id';
export const SITE_NAME = 'SakuNota';

// Menu publik yang boleh ditampilkan mesin pencari sebagai tautan di bawah hasil utama.
export const siteNavigation = [
  { name: 'Panduan Penggunaan', path: '/panduan' },
  { name: 'Harga', path: '/#harga' },
  { name: 'Fitur', path: '/#fitur' },
  { name: 'Tentang Kami', path: '/tentang' },
  { name: 'Syarat & Ketentuan', path: '/terms' },
  { name: 'Kebijakan Privasi', path: '/privacy' },
] as const;

// Data terstruktur seluruh situs: nama situs, pemilik merek, aplikasi, dan menu utama.
export function siteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        name: SITE_NAME,
        alternateName: ['SakuNota Kasir', 'SakuNota POS', 'sakunota.my.id'],
        url: `${SITE_URL}/`,
        inLanguage: 'id-ID',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/icon-512.png`,
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${SITE_URL}/#app`,
        name: SITE_NAME,
        operatingSystem: 'Web, Android, iOS',
        applicationCategory: 'BusinessApplication',
        description: siteDescription,
        url: `${SITE_URL}/`,
        image: `${SITE_URL}/logo-sakunota.png`,
        publisher: { '@id': `${SITE_URL}/#organization` },
        offers: {
          '@type': 'Offer',
          price: '50000',
          priceCurrency: 'IDR',
          availability: 'https://schema.org/InStock',
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${SITE_URL}/#navigation`,
        name: 'Menu utama SakuNota',
        itemListElement: siteNavigation.map((item, index) => ({
          '@type': 'SiteNavigationElement',
          position: index + 1,
          name: item.name,
          url: `${SITE_URL}${item.path}`,
        })),
      },
    ],
  };
}

// Jejak halaman (Beranda > Halaman) untuk tampilan alamat yang rapi di hasil pencarian.
export function breadcrumbJsonLd(name: string, path: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  };
}

// JSON-LD aman disisipkan ke HTML: karakter "<" di-escape agar tidak menutup tag script.
export function jsonLdHtml(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

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
