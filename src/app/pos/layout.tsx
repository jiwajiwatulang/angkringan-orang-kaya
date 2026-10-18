import type { Metadata } from "next";
import WaiterModeGuard from "@/components/WaiterModeGuard";

export const metadata: Metadata = {
  title: "Kasir SakuNota - Jalan Tanpa Internet",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <WaiterModeGuard>{children}</WaiterModeGuard>;
}
