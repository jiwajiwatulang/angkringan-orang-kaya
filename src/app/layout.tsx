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
  title: "SakuNota - Aplikasi Kasir POS & Cetak Struk UMKM",
  description: "Aplikasi kasir offline pintar untuk UMKM, kafe, warung makan, dan ritel.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      // SakuNota Dark Blue Pro is a dark-only design system.
      className={`dark ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-app text-fg font-sans">{children}</body>
    </html>
  );
}
