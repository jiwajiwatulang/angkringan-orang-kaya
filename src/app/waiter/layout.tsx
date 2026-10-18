import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Waiter Floor - SakuNota',
  robots: { index: false, follow: false },
};
export default function WaiterLayout({ children }: { children: ReactNode }) { return <>{children}</>; }
