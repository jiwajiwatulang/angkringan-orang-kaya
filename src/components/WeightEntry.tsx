"use client";

import { useEffect, useRef, useState } from 'react';
import { lineTotal, parseWeight, priceSuffix, quantityLabel, type SaleMeasure } from '@/lib/weight';

export default function WeightEntry({ product, initialGrams, reservedGrams = 0, onConfirm, onClose }: {
  product: SaleMeasure & { nama: string; harga: number; trackStock?: boolean; stockQty?: number };
  initialGrams?: number;
  reservedGrams?: number;
  onConfirm: (grams: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [unit, setUnit] = useState<'g' | 'kg'>('g');
  const [text, setText] = useState(initialGrams ? String(initialGrams) : '');
  const [error, setError] = useState('');
  useEffect(() => { dialog.current?.showModal(); }, []);
  let grams = 0, total = 0;
  try { grams = parseWeight(text, unit); total = lineTotal({ ...product, qty: grams }); } catch { /* Validate on submit. */ }
  const available = Math.max(0, (product.stockQty ?? 0) - reservedGrams);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const value = parseWeight(text, unit);
      if (!product.harga) throw new Error('Harga belum tersedia');
      if (product.trackStock && value > available) throw new Error('Stok tidak mencukupi');
      onConfirm(value);
    } catch (e) { setError((e as Error).message); }
  }
  return <dialog ref={dialog} onCancel={e => { e.preventDefault(); onClose(); }} aria-labelledby="weight-title" className="m-auto w-[calc(100%_-_2rem)] max-w-sm rounded-2xl border border-line bg-surface p-5 text-fg shadow-xl backdrop:bg-black/40">
    <form onSubmit={submit} className="space-y-5">
      <div><h2 id="weight-title" className="text-lg font-bold break-words">{product.nama}</h2><p className="mt-1 text-sm text-muted">Harga Rp{product.harga.toLocaleString('id-ID')}{priceSuffix(product)}</p></div>
      <div><label htmlFor="sale-weight" className="mb-2 block text-sm font-semibold">Berat</label><div className="flex gap-2">
        <input id="sale-weight" autoFocus inputMode="decimal" autoComplete="off" placeholder="Masukkan berat" value={text} onChange={e => { setText(e.target.value); setError(''); }} className="min-w-0 flex-1 rounded-xl border border-line bg-card p-3 text-xl font-semibold outline-none focus:border-blue-600" aria-describedby={error ? 'weight-error' : undefined} />
        <select aria-label="Satuan" value={unit} onChange={e => { const next = e.target.value as 'g' | 'kg'; if (grams) setText(String(next === 'kg' ? grams / 1000 : grams).replace('.', ',')); setUnit(next); setError(''); }} className="rounded-xl border border-line bg-card px-3 text-base"><option value="g">g</option><option value="kg">kg</option></select>
      </div>{product.trackStock && <p className="mt-2 text-xs text-muted">Stok {quantityLabel(product, available)}</p>}</div>
      <div className="flex items-center justify-between border-t border-line pt-4"><span className="text-sm">Total</span><output aria-live="polite" className="text-2xl font-bold tabular-nums">Rp{total.toLocaleString('id-ID')}</output></div>
      {error && <p id="weight-error" role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2"><button type="button" onClick={onClose} className="min-h-12 rounded-xl border border-line px-4 font-semibold">Batal</button><button type="submit" className="min-h-12 flex-1 rounded-xl bg-[#2563EB] px-4 font-semibold text-white">{initialGrams ? 'Simpan Berat' : 'Tambah ke Keranjang'}</button></div>
    </form>
  </dialog>;
}
