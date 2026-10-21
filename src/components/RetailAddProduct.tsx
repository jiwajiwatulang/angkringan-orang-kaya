'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CameraCapture from './CameraCapture';
import { compressPaymentProof } from '@/lib/imageUtils';
import { MAX_PRODUCT_PHOTO_BYTES } from '@/lib/productPhoto';
import { validateRetailDraft, type RetailDraftProduct } from '@/lib/retailDraft';
import { photoRecognitionReady, recognizeProductPhoto } from '@/lib/retailPhotoRecognition';

export default function RetailAddProduct({ onClose, onAdd }: { onClose: () => void; onAdd: (product: RetailDraftProduct, qty: number) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const attempt = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [status, setStatus] = useState<'idle' | 'reading' | 'found' | 'failed' | 'unavailable'>('idle');
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
    return () => attempt.current?.abort();
  }, []);
  const manual = () => { attempt.current?.abort(); setProcessing(false); setStatus('idle'); nameInput.current?.focus(); };
  const readPhoto = async (file?: File) => {
    if (!file) return;
    attempt.current?.abort();
    const controller = new AbortController(); attempt.current = controller;
    setProcessing(true); setError(''); setPhoto(null); setName(''); setStatus('reading');
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Foto terlalu besar. Pilih foto di bawah 20 MB.');
      const result = await compressPaymentProof(file, file.name, { maxDim: 1200, maxBytes: MAX_PRODUCT_PHOTO_BYTES });
      if (controller.signal.aborted) return;
      setPhoto(result.imageData);
      const ready = await photoRecognitionReady();
      if (controller.signal.aborted) return;
      if (!ready) { setStatus('unavailable'); return; }
      try {
        const suggestion = await recognizeProductPhoto(result.imageData, controller.signal);
        if (!controller.signal.aborted) { setName(suggestion); setStatus('found'); }
      } catch {
        if (!controller.signal.aborted) setStatus('failed');
      }
    } catch {
      if (!controller.signal.aborted) { setStatus('failed'); setError(''); }
    } finally { if (!controller.signal.aborted) setProcessing(false); }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const product = validateRetailDraft({ nama: name, harga: Number(price), imageData: photo });
      const amount = Number(qty);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 9999) throw new Error('Isi jumlah antara 1 dan 9.999.');
      onAdd(product, amount); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Barang belum dapat ditambahkan.'); }
  };
  const field = 'w-full min-h-11 rounded-xl border border-line bg-card px-3 py-2.5 text-base text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';
  return <dialog ref={dialog} onCancel={onClose} aria-labelledby="retail-add-title" className="m-auto w-[calc(100%-1.5rem)] max-w-md max-lg:landscape:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-slate-950/40">
    {cameraOpen && <CameraCapture onClose={() => setCameraOpen(false)} onCapture={file => { setCameraOpen(false); void readPhoto(file); }} onChooseGallery={() => { setCameraOpen(false); galleryInput.current?.click(); }} />}
    <form onSubmit={submit} className="flex flex-col">
      <header className="flex items-center justify-between border-b border-line px-5 py-4 max-lg:landscape:py-2">
        <h2 id="retail-add-title" className="text-xl font-bold">Tambah Barang</h2>
        <button type="button" onClick={onClose} aria-label="Tutup Tambah Barang" className="min-h-11 min-w-11 rounded-xl text-2xl hover:bg-card">×</button>
      </header>
      <div className="grid gap-4 p-5 max-lg:landscape:grid-cols-[0.8fr_1.2fr] max-lg:landscape:p-3">
        <div className="space-y-3">
        <div className="overflow-hidden rounded-xl border border-line bg-card">
          {photo && <Image unoptimized width={600} height={400} src={photo} alt="Foto barang yang akan ditambahkan" className="h-36 w-full object-contain p-2 sm:h-44 max-lg:landscape:h-24" />}
          <div className="grid grid-cols-2 gap-2 p-2">
            <button type="button" onClick={() => setCameraOpen(true)} className="min-h-11 rounded-xl px-3 py-2 font-semibold text-accent-text">{photo ? 'Foto Ulang' : 'Foto Produk'}</button>
            <button type="button" onClick={() => galleryInput.current?.click()} className="min-h-11 rounded-xl px-3 py-2 text-sm font-semibold text-muted">Dari Galeri</button>
            <input ref={galleryInput} aria-label="Pilih Foto Produk dari Galeri" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={event => { void readPhoto(event.target.files?.[0]); event.target.value = ''; }} />
          </div>
        </div>
        <div aria-live="polite" className="text-sm">
          {status === 'reading' && <p className="text-muted">Mengenali produk…</p>}
          {status === 'found' && <p className="font-semibold text-emerald-700">Produk ditemukan</p>}
          {status === 'failed' && <p className="text-amber-800">Foto belum terbaca</p>}
          {status === 'unavailable' && <p className="text-muted">Pengenalan foto belum tersedia di perangkat ini.</p>}
          {(status !== 'found') && <button type="button" onClick={manual} className="mt-1 min-h-11 font-semibold text-accent-text">Isi Manual</button>}
        </div>
        </div>
        <div className="space-y-4">
        <label className="block space-y-1.5 text-sm font-semibold">Nama Barang<input ref={nameInput} disabled={processing} required maxLength={120} value={name} onChange={e => setName(e.target.value)} className={field} autoComplete="off" /></label>
        <div className="grid grid-cols-[1.4fr_1fr] gap-3">
          <label className="block space-y-1.5 text-sm font-semibold">Harga Jual<input required type="number" inputMode="numeric" min="1" step="1" placeholder="Rp" value={price} onChange={e => setPrice(e.target.value)} className={field} /></label>
          <label className="block space-y-1.5 text-sm font-semibold">Jumlah<input required type="number" inputMode="numeric" min="1" max="9999" step="1" value={qty} onChange={e => setQty(e.target.value)} className={field} /></label>
        </div>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        </div>
      </div>
      <footer className="sticky bottom-0 border-t border-line bg-surface p-4 max-lg:landscape:p-2">
        <button disabled={processing} type="submit" className="min-h-12 w-full rounded-xl bg-accent px-4 py-3 font-bold text-white hover:bg-accent-hover disabled:opacity-50">Tambah ke Keranjang</button>
      </footer>
    </form>
  </dialog>;
}
