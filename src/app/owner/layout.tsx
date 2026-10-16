import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Owner Portal — SakuNota",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
