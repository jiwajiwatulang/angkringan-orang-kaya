import type { Metadata } from "next";
import AdminClientLayout from "./AdminClientLayout";
import WaiterModeGuard from "@/components/WaiterModeGuard";

export const metadata: Metadata = {
  title: "Admin Kasir - SakuNota",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <WaiterModeGuard><AdminClientLayout>{children}</AdminClientLayout></WaiterModeGuard>;
}
