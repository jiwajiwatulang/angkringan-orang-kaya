'use client';

import React, { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { getWaiterSession } from '@/lib/waiterSession';

export default function WaiterModeGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useLiveQuery(getWaiterSession);
  useEffect(() => {
    if (session) router.replace('/waiter');
  }, [session, router]);
  if (session === undefined || session) return <div className="p-6 text-sm text-muted" role="status">Menyiapkan akses…</div>;
  return <>{children}</>;
}
