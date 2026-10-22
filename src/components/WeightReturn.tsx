"use client";

import { useRef, useState } from 'react';
import { parseWeight, quantityLabel } from '@/lib/weight';
import { refundWeight, weightRefundAmount } from '@/lib/weightRefund';

export default function WeightReturn({ order, onSaved }: { order: any; onSaved: () => Promise<void> }) {
  const products = order.items.filter((i: any) => i.saleUnit === 'weight' && i.qty > (i.refundedQty ?? 0));
  const [selected, setSelected] = useState<number>(products[0]?.id);
  const [weight, setWeight] = useState('');
  const [unit, setUnit] = useState<'g' | 'kg'>('g');
  const [method, setMethod] = useState<'Cash' | 'Transfer' | 'QRIS'>('Cash');
  const [reason, setReason] = useState('');
  const [restock, setRestock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const attempt = useRef<{ signature: string; id: string } | null>(null);
  let amount = 0;
  try { amount = weightRefundAmount(order, order.items, selected, parseWeight(weight, unit)); } catch { /* Show validation when submitted. */ }
  if (!products.length || order.status !== 'paid' || order.isHistorical) return null;
  return <details className="rounded-xl border border-line p-3">
    <summary className="min-h-10 cursor-pointer text-sm font-semibold">Pengembalian Barang Timbang</summary>
    <form className="mt-2 space-y-3" onSubmit={async e => {
      e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
      try { const signature = JSON.stringify({ selected, weight, unit, method, reason, restock }); if (attempt.current?.signature !== signature) attempt.current = { signature, id: crypto.randomUUID() }; const returned = await refundWeight({ requestId: attempt.current.id, orderId: order.id, orderItemId: selected, grams: parseWeight(weight, unit), method, reason, restock }); setWeight(''); setMessage(`Pengembalian Rp${returned.toLocaleString('id-ID')} berhasil dicatat`); await onSaved(); }
      catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
    }}>
      <label className="block text-xs font-semibold">Barang<select disabled={busy} value={selected} onChange={e => { setSelected(Number(e.target.value)); setWeight(''); }} className="mt-1 w-full rounded-lg border border-line bg-card p-3">{products.map((i: any) => <option key={i.id} value={i.id}>{i.namaMenu || i.nama} · {quantityLabel(i, i.qty - (i.refundedQty ?? 0))}</option>)}</select></label>
      <label className="block text-xs font-semibold">Berat<div className="mt-1 flex gap-2"><input aria-label="Berat dikembalikan" disabled={busy} inputMode="decimal" value={weight} onChange={e => setWeight(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-line bg-card p-3" /><select aria-label="Satuan pengembalian" disabled={busy} value={unit} onChange={e => { setUnit(e.target.value as 'g' | 'kg'); setWeight(''); }} className="rounded-lg border border-line bg-card p-3"><option>g</option><option>kg</option></select></div></label>
      <label className="block text-xs font-semibold">Alasan<input disabled={busy} value={reason} onChange={e => setReason(e.target.value)} maxLength={240} required className="mt-1 w-full rounded-lg border border-line bg-card p-3" /></label>
      <label className="block text-xs font-semibold">Kembalikan melalui<select disabled={busy} value={method} onChange={e => setMethod(e.target.value as typeof method)} className="mt-1 w-full rounded-lg border border-line bg-card p-3"><option value="Cash">Tunai</option><option value="Transfer">Transfer</option><option value="QRIS">QRIS</option></select></label>
      <label className="flex min-h-10 items-center gap-2 text-sm"><input disabled={busy} type="checkbox" checked={restock} onChange={e => setRestock(e.target.checked)} />Kembalikan barang ke stok</label>
      <p className="flex justify-between text-sm">Total pengembalian <strong>Rp{amount.toLocaleString('id-ID')}</strong></p>
      {message && <p role="status" className="text-sm">{message}</p>}
      <button disabled={busy} className="min-h-12 w-full rounded-xl bg-[#2563EB] px-4 font-semibold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Simpan Pengembalian'}</button>
    </form>
  </details>;
}
