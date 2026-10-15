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
  themeColor: "#0B0F17",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: "SakuNota POS - Kasir Pintar & Cetak Struk UMKM",
  description: "Aplikasi kasir offline pintar untuk UMKM, kafe, warung makan, dan ritel.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SakuNota POS",
  },
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`dark ${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('sakunota_theme')||localStorage.getItem('theme');if(t==='light'){document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');document.documentElement.style.colorScheme='light';}else{document.documentElement.classList.add('dark');document.documentElement.classList.remove('light');document.documentElement.style.colorScheme='dark';}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-app text-fg font-sans">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[SakuNota] Service Worker registered, scope:', reg.scope);
                  }).catch(function(err) {
                    console.warn('[SakuNota] SW registration error:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
