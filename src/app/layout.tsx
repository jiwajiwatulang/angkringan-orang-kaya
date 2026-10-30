import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteDescription, siteJsonLd, jsonLdHtml } from "@/lib/publicMetadata";

// Kode verifikasi Google Search Console. Diisi lewat variabel build, bukan disimpan di Git.
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
import PosSessionBoundary from '@/components/PosSessionBoundary';

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#2563eb",
  colorScheme: "light",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sakunota.my.id"),
  title: {
    default: "SakuNota - Kasir Jalan Tanpa Internet",
    template: "%s | SakuNota",
  },
  description: siteDescription,
  keywords: [
    "aplikasi kasir offline",
    "kasir tanpa internet",
    "pos offline",
    "sakunota",
    "aplikasi kasir umkm",
    "kasir retail",
    "scan barcode",
    "stok opname",
    "kasir restoran",
    "kasir warung makan",
    "kasir kedai kopi",
    "cetak struk bluetooth",
    "kasir sekali bayar",
  ],
  authors: [{ name: "SakuNota" }],
  creator: "SakuNota",
  publisher: "SakuNota",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "id_ID",
    url: "https://sakunota.my.id",
    title: "SakuNota - Kasir Jalan Tanpa Internet",
    description: siteDescription,
    siteName: "SakuNota",
    images: [
      {
        url: "/logo-sakunota.png",
        width: 720,
        height: 208,
        alt: "SakuNota - Kasir Jalan Tanpa Internet",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SakuNota - Kasir Jalan Tanpa Internet",
    description: siteDescription,
    images: ["/logo-sakunota.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(googleSiteVerification ? { verification: { google: googleSiteVerification } } : {}),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SakuNota",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`light ${inter.variable} h-full antialiased`}
    >
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdHtml(siteJsonLd()) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.setItem('sakunota_theme','light');localStorage.setItem('theme','light');document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-app text-fg font-sans">
        <PosSessionBoundary>{children}</PosSessionBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').then(function(reg) {
                  console.log('[SakuNota] Service Worker registered, scope:', reg.scope);
                }).catch(function(err) {
                  console.warn('[SakuNota] SW registration error:', err);
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
