'use client';
import { closeOwnDialog } from '@/lib/dialogCancel';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import CameraCapture from './CameraCapture';
import { compressPaymentProof } from '@/lib/imageUtils';
import { MAX_PRODUCT_PHOTO_BYTES } from '@/lib/productPhoto';
import { validateRetailDraft, type RetailDraftProduct } from '@/lib/retailDraft';
import { productNameFromText } from '@/lib/retailDraft';
import { barcodeFromPhoto, loadProductReferences, referenceByBarcode, referenceSuggestions, referenceDisplayName, validGtin, type ProductReference } from '@/lib/productReference';
import { photoRecognitionReady, recognizeProductPhoto, setupPhotoRecognition, supportsPhotoRecognition } from '@/lib/retailPhotoRecognition';

export default function RetailAddProduct({ onClose, onAdd, initialBarcode }: { onClose: () => void; onAdd: (product: RetailDraftProduct, qty: number) => void; initialBarcode?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);
  const attempt = useRef<AbortController | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [qty, setQty] = useState('1');
  const [status, setStatus] = useState<'idle' | 'reading' | 'found' | 'failed' | 'unprepared' | 'unsupported'>('idle');
  const [preparation, setPreparation] = useState<number | null>(null);
  const [recognitionReady, setRecognitionReady] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [suggestions, setSuggestions] = useState<ProductReference[]>([]);
  const [sku, setSku] = useState<string | undefined>(initialBarcode && validGtin(initialBarcode) ? initialBarcode : undefined);
  const [referenceMatched, setReferenceMatched] = useState(false);
  const backdropPressed = useRef(false);
  useEffect(() => {
    dialog.current?.showModal();
    let active = true;
    if (initialBarcode) void loadProductReferences().then(pack => {
      const product = referenceByBarcode(pack.products, initialBarcode);
      if (active && product) { setName(referenceDisplayName(product)); setSku(product.code); setReferenceMatched(true); setStatus('found'); }
    }).catch(() => {});
    void photoRecognitionReady().then(ready => { if (active) { setRecognitionReady(ready); if (!ready) setStatus(current => current === 'found' ? current : supportsPhotoRecognition() ? 'unprepared' : 'unsupported'); } }).catch(() => { if (active) setStatus(current => current === 'found' ? current : 'unsupported'); });
    return () => { active = false; attempt.current?.abort(); };
  }, [initialBarcode]);
  const manual = () => { attempt.current?.abort(); setProcessing(false); setPreparation(null); setStatus('idle'); setSuggestions([]); setReferenceMatched(false); nameInput.current?.focus(); };
  const applyText = async (text: string, signal: AbortSignal) => {
    const pack = await loadProductReferences().catch(() => null);
    if (signal.aborted) return;
    setName(productNameFromText(text)); setStatus('found'); setReferenceMatched(false);
    setSuggestions(pack ? referenceSuggestions(pack.products, text) : []);
  };
  const readPhoto = async (file?: File) => {
    if (!file) return;
    attempt.current?.abort();
    const controller = new AbortController(); attempt.current = controller;
    setProcessing(true); setPreparation(null); setError(''); setPhoto(null); setName(''); setSuggestions([]); setSku(undefined); setReferenceMatched(false); setStatus('reading');
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Foto terlalu besar. Pilih foto di bawah 20 MB.');
      const result = await compressPaymentProof(file, file.name, { maxDim: 1200, maxBytes: MAX_PRODUCT_PHOTO_BYTES });
      if (controller.signal.aborted) return;
      setPhoto(result.imageData);
      const barcode = await barcodeFromPhoto(result.imageData);
      if (controller.signal.aborted) return;
      if (barcode) {
        setSku(barcode);
        const pack = await loadProductReferences().catch(() => null);
        const match = pack && referenceByBarcode(pack.products, barcode);
        if (controller.signal.aborted) return;
        if (match) { setName(referenceDisplayName(match)); setReferenceMatched(true); setStatus('found'); return; }
      }
      const ready = await photoRecognitionReady();
      if (controller.signal.aborted) return;
      if (!ready) { setStatus(supportsPhotoRecognition() ? 'unprepared' : 'unsupported'); return; }
      try {
        const text = await recognizeProductPhoto(result.imageData, controller.signal, false, true);
        await applyText(text, controller.signal);
      } catch {
        if (!controller.signal.aborted) setStatus('failed');
      }
    } catch (cause) {
      if (!controller.signal.aborted) { setStatus('failed'); setError(cause instanceof Error ? cause.message : 'Foto belum dapat diproses. Coba foto lain atau Isi Manual.'); }
    } finally { if (!controller.signal.aborted) setProcessing(false); }
  };
  const prepare = async () => {
    attempt.current?.abort();
    const controller = new AbortController(); attempt.current = controller;
    setProcessing(true); setPreparation(0); setError('');
    try {
      await setupPhotoRecognition(setPreparation, controller.signal);
      if (controller.signal.aborted) return;
      setRecognitionReady(true); setStatus('idle');
      if (photo) {
        setStatus('reading');
        try { const text = await recognizeProductPhoto(photo, controller.signal, false, true); await applyText(text, controller.signal); }
        catch { if (!controller.signal.aborted) setStatus('failed'); }
      }
    } catch (cause) {
      if (!controller.signal.aborted) { setStatus('unprepared'); setError(cause instanceof Error && /^(Persiapan|Unduhan|Pengenalan foto)/.test(cause.message) ? cause.message : 'Persiapan belum berhasil. Periksa koneksi dan ruang penyimpanan, lalu coba lagi.'); }
    } finally { if (!controller.signal.aborted) { setProcessing(false); setPreparation(null); } }
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const product = validateRetailDraft({ nama: name, harga: Number(price), imageData: photo, ...(sku ? { sku } : {}) });
      const amount = Number(qty);
      if (!Number.isSafeInteger(amount) || amount < 1 || amount > 9999) throw new Error('Isi jumlah antara 1 dan 9.999.');
      onAdd(product, amount); onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Barang belum dapat ditambahkan.'); }
  };
  const field = 'w-full min-h-11 rounded-xl border border-line bg-card px-3 py-2.5 text-base text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/20';
  return <dialog ref={dialog} onCancel={event => closeOwnDialog(event, onClose)} onPointerDown={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    backdropPressed.current = !cameraOpen && event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  }} onClick={event => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const outside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (!cameraOpen && backdropPressed.current && event.target === event.currentTarget && outside) onClose();
    backdropPressed.current = false;
  }} aria-labelledby="retail-add-title" className="m-auto w-[calc(100%-1.5rem)] max-w-md max-lg:landscape:max-w-2xl max-h-[92dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-slate-950/40">
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
          {status === 'found' && <p className="font-semibold text-emerald-700">Periksa nama barang sebelum ditambahkan.</p>}
          {suggestions.length > 0 && <div className="mt-2 space-y-2"><p className="text-muted">Pilih produk yang sesuai kemasan:</p>{suggestions.map(product => <button key={product.code} type="button" onClick={() => { setName(referenceDisplayName(product)); setSku(undefined); setSuggestions([]); setReferenceMatched(false); }} className="min-h-11 w-full rounded-xl border border-line bg-card px-3 py-2 text-left font-semibold">{referenceDisplayName(product)}</button>)}</div>}
          {sku && <p className="mt-1 text-xs text-muted">Barcode: {sku}</p>}
          {status === 'failed' && <p className="text-amber-800">Nama barang belum terbaca. Coba foto lain atau isi nama sendiri.</p>}
          {!recognitionReady && !referenceMatched && status !== 'unsupported' && <p className="text-muted">Aktifkan pengenalan foto sekali saat terhubung internet. Setelah itu bisa digunakan tanpa internet.</p>}
          {status === 'unsupported' && <p className="text-muted">Pengenalan foto belum tersedia. Tambahkan foto dan isi nama barang sendiri.</p>}
          {!recognitionReady && !referenceMatched && status !== 'unsupported' && <button type="button" disabled={processing} onClick={() => void prepare()} className="mt-2 min-h-11 rounded-xl bg-accent px-3 py-2 font-semibold text-white disabled:opacity-50">{preparation !== null ? `Menyiapkan… ${preparation}%` : 'Aktifkan Pengenalan Foto'}</button>}
          {recognitionReady && status === 'idle' && <p className="text-muted">Pengenalan foto siap digunakan.</p>}
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
