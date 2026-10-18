'use client';

import React, { useEffect, useState } from 'react';
import { getTables } from '@/lib/api';
import { useAdmin } from '../AdminContext';
import { startWaiterSession } from '@/lib/waiter';
import type { Table } from '@/lib/dexie';

export default function WaiterSetupPage() {
  const { storeSettings } = useAdmin();
  const [tables, setTables] = useState<Table[]>([]);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { getTables().then(setTables).catch(() => setError('Gagal memuat meja.')); }, []);
  async function start(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('');
    try { await startWaiterSession(name, selected); window.location.assign('/waiter'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Gagal membuka mode pelayan.'); setBusy(false); }
  }
  return <main className="max-w-3xl space-y-5">
    <h1 className="text-2xl font-bold">Waiter Floor</h1>
    <p className="text-sm text-muted">Tentukan pelayan dan meja tugas pada perangkat ini. Selama mode pelayan aktif, kasir dan admin terkunci sampai PIN Admin dimasukkan.</p>
    {storeSettings.serviceMode !== 'resto' ? <p className="rounded-xl bg-blue-50 p-4 text-blue-800">Aktifkan mode meja di Pengaturan Profil Usaha terlebih dahulu.</p> : <form onSubmit={start} className="space-y-5 rounded-2xl border border-line bg-white p-5">
      <label className="block text-sm font-semibold">Nama pelayan<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-line p-3" /></label>
      <fieldset><legend className="mb-3 text-sm font-semibold">Meja tugas</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{tables.map(t => <label key={t.id} className="flex gap-2 rounded-xl border border-line p-3 text-sm"><input type="checkbox" checked={selected.includes(t.id!)} onChange={e => setSelected(ids => e.target.checked ? [...ids, t.id!] : ids.filter(id => id !== t.id))} />{t.nomor}</label>)}</div></fieldset>
      <p className="text-sm text-muted">Buka shift kasir sebelum mencatat pesanan. Pesanan pelayan masuk sebagai tagihan belum dibayar; pembayaran dilakukan oleh kasir.</p>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button disabled={busy || !selected.length || !name.trim()} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Menyiapkan…' : 'Mulai Mode Pelayan'}</button>
    </form>}
  </main>;
}
