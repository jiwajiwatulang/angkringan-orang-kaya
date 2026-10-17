import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Syarat & Ketentuan Layanan - SakuNota",
  description:
    "Syarat dan ketentuan lisensi kasir SakuNota sekali bayar tanpa biaya bulanan, aturan 1 perangkat, dan kebijakan pengembalian dana.",
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
