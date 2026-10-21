"use client";
import { useState } from 'react';
import type { StoreSettings } from '@/lib/settings';
import { printSavedOrderLabels } from '@/lib/orderLabelPrinting';
export default function OrderLabelButton({ orderId, settings }: { orderId?: number; settings: StoreSettings }) {
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  if (!settings.orderLabel?.enabled || !orderId) return null;
  return <div><button type="button" disabled={busy} onClick={async () => {
    setBusy(true); setMessage('');
    try { setMessage(await printSavedOrderLabels(orderId, settings)); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Cetak label gagal.'); }
    finally { setBusy(false); }
  }} className="w-full py-2.5 rounded-xl border border-line text-sm font-bold disabled:opacity-50">{busy ? 'Menyiapkan Label...' : 'Cetak Label Pesanan'}</button>{message && <p role="status" className="text-xs mt-1">{message}</p>}</div>;
}
