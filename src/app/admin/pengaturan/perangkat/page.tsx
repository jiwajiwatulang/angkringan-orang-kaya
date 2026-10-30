"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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

  const isMultiDeviceEnabled = process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE === 'enabled';

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
    if (!isMultiDeviceEnabled) return;
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
  }, [isMultiDeviceEnabled]);

  if (!isMultiDeviceEnabled) {
    return (
      <div className="max-w-2xl space-y-5">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Nama &amp; PIN Karyawan</h1>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 text-sm leading-relaxed text-blue-950 space-y-2.5">
          <p className="font-semibold text-blue-900">Pengelolaan Karyawan &amp; Kasir SakuNota</p>
          <p>
            Untuk toko dengan satu perangkat utama, nama kasir/karyawan otomatis tercatat di sistem saat Anda membuka <strong>Shift Kasir</strong>.
          </p>
          <p className="text-xs text-blue-800">
            PIN otorisasi kasir dan keamanan menu dilindungi melalui <strong>PIN Admin</strong> yang dapat dikonfigurasi pada menu Keamanan.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            href="/admin/shift"
            className="min-h-11 inline-flex items-center rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all"
          >
            Buka Shift Kasir
          </Link>
          <Link
            href="/admin/pengaturan/keamanan"
            className="min-h-11 inline-flex items-center rounded-xl border border-line bg-surface hover:bg-card px-4 py-2.5 text-sm font-semibold text-fg shadow-2xs transition-all"
          >
            Pengaturan PIN Admin
          </Link>
        </div>
      </div>
    );
  }

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
