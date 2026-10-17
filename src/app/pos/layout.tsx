import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kasir SakuNota - Jalan Tanpa Internet",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
