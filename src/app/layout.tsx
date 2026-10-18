import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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
    default: "SakuNota - Kasir Jalan Tanpa Internet.",
    template: "%s | SakuNota",
  },
  description: "Aplikasi kasir offline pintar untuk usaha kuliner (kafe, restoran, angkringan, warung makan, kedai kopi). Catat pesanan, kelola meja, cetak struk Bluetooth fisik, dan pantau omzet tanpa kuota internet.",
  keywords: [
    "aplikasi kasir offline",
    "kasir tanpa internet",
    "pos offline",
    "sakunota",
    "aplikasi kasir umkm",
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
    title: "SakuNota - Kasir Jalan Tanpa Internet.",
    description: "Aplikasi kasir offline pintar untuk UMKM kuliner. Catat pesanan, kelola meja, cetak struk Bluetooth tanpa kuota internet.",
    siteName: "SakuNota",
    images: [
      {
        url: "/logo-sakunota.png",
        width: 720,
        height: 208,
        alt: "SakuNota - Kasir Jalan Tanpa Internet.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SakuNota - Kasir Jalan Tanpa Internet.",
    description: "Aplikasi kasir offline pintar untuk usaha kuliner. Sekali bayar Rp50.000 aktif selamanya.",
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
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "SakuNota",
              "operatingSystem": "Web, Android, iOS",
              "applicationCategory": "BusinessApplication",
              "description": "Aplikasi kasir offline pintar untuk usaha kuliner (kafe, restoran, angkringan, warung makan, kedai kopi). Berjalan tanpa kuota internet.",
              "url": "https://sakunota.my.id",
              "image": "https://sakunota.my.id/logo-sakunota.png",
              "offers": {
                "@type": "Offer",
                "price": "50000",
                "priceCurrency": "IDR",
                "availability": "https://schema.org/InStock",
              },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{localStorage.setItem('sakunota_theme','light');localStorage.setItem('theme','light');document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-app text-fg font-sans">
        {children}
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
