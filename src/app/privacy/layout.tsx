import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kebijakan Privasi — SakuNota",
  description:
    "Kebijakan privasi SakuNota. Data transaksi dan keuangan usaha tersimpan mandiri di perangkat lokal Anda tanpa pengumpulan ke server pusat.",
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
