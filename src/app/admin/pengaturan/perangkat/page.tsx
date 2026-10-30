"use client";
import React, { useEffect, useState } from 'react';
import DevicesPanel from '@/components/DevicesPanel';
import { enrollOwnerClient, type DeviceClient } from '@/lib/multidevice/client';
import { requireMerchantAdmin } from '@/lib/merchantAccess';
import { isDemoMode } from '@/lib/demoMode';
import { db } from '@/lib/dexie';
import { posPartition } from '@/lib/multidevice/posPartition';
import { activatePosPartition } from '@/lib/multidevice/posActivation';
import { currentPosRuntime } from '@/lib/multidevice/posRuntime';
import { BusyLabel } from '@/components/LoadingState';

export default function DevicesPage() {
  const [client, setClient] = useState<DeviceClient | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const openDevices = async () => {
    setBusy(true);
    setError('');
    try {
      if (isDemoMode()) throw new Error('Gunakan lisensi toko untuk menghubungkan perangkat.');
      await requireMerchantAdmin();
      const runtime = currentPosRuntime();
      const enrolled = runtime?.scope?.claims.role === 'owner' && runtime.scope.claims.expiresAt > Date.now()
        ? runtime.client
        : await enrollOwnerClient();
      if (!posPartition()) {
        const session = enrolled.snapshot();
        await activatePosPartition(db, session.access, session.claims);
        location.reload();
        return;
      }
      setClient(enrolled);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Perangkat belum dapat dibuka.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    let active = true;
    const tryAutoOpen = async () => {
      try {
        if (isDemoMode()) return;
        const runtime = currentPosRuntime();
        if (runtime?.scope?.claims.role === 'owner' && runtime.scope.claims.expiresAt > Date.now()) {
          if (active) setClient(runtime.client);
          return;
        }
        if (posPartition()) {
          const enrolled = await enrollOwnerClient();
          if (active) setClient(enrolled);
        }
      } catch (_) {}
    };
    void tryAutoOpen();
    return () => { active = false; };
  }, []);

  if (client) return <DevicesPanel client={client} />;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold text-fg">Perangkat &amp; Karyawan</h1>
      <p className="text-sm text-muted">
        Kelola perangkat kasir tambahan dan PIN akses karyawan untuk operasional toko.
      </p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={busy}
        className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50"
        onClick={() => void openDevices()}
      >
        {busy ? <BusyLabel>Membuka</BusyLabel> : 'Buka Perangkat & Karyawan'}
      </button>
    </div>
  );
}
