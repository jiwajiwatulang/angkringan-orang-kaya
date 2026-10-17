import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Buku Panduan Kasir - SakuNota",
  description:
    "Panduan lengkap penggunaan aplikasi kasir SakuNota. Mulai dari instalasi di Android, pengaturan menu, meja, cetak struk Bluetooth fisik, hingga rekap omzet harian.",
};

export default function PanduanLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
