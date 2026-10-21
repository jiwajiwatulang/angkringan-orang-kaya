'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { GuideProgress, GuideStep, readGuideProgress, reconcileGuideStep, saveGuideProgress } from '@/lib/firstRunGuide';

type Props = {
  ready: boolean; demo: boolean; hasShift: boolean; hasItems: boolean;
  paymentOpen: boolean; savedReceipt: boolean; hasMenus: boolean; labelsEnabled: boolean;
  restartToken: number; onNavigate: (step: GuideStep) => void;
};

const copy: Record<GuideStep, [string, string]> = {
  welcome: ['Kenali kasir SakuNota', 'Ikuti langkah singkat dari buka shift sampai struk. Anda bisa melewati panduan kapan saja.'],
  shift: ['1. Buka shift', 'Isi nama kasir dan modal kas, lalu simpan. Panduan lanjut setelah shift berhasil dibuka.'],
  catalog: ['2. Pilih produk', 'Ketuk produk yang tersedia. Pilih varian atau tambahan jika diminta, lalu masukkan ke keranjang.'],
  cart: ['3. Periksa keranjang', 'Periksa jumlah, pilihan produk, dan total. Setelah sesuai, buka pembayaran.'],
  payment: ['4. Periksa pembayaran', 'Pilih metode pembayaran. Untuk tunai, isi uang diterima atau pilih Uang Pas. Konfirmasikan hanya jika sudah sesuai.'],
  receipt: ['5. Struk pesanan', 'Pesanan berhasil disimpan. Periksa struk; mencetaknya tidak wajib untuk menyelesaikan panduan.'],
  done: ['Siap menggunakan SakuNota', 'Riwayat transaksi, laporan, dan pengaturan tersedia di menu Admin. Panduan ini bisa dibuka ulang dari Kasir.'],
};

export default function FirstRunGuide(props: Props) {
  const [progress, setProgress] = useState<GuideProgress | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [movePanel, setMovePanel] = useState(false);
  const [rect, setRect] = useState<{ step: GuideStep; top: number; left: number; width: number; height: number } | null>(null);
  const panel = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const lastRestart = useRef(0);
  const navigate = useRef(props.onNavigate);
  useEffect(() => { navigate.current = props.onNavigate; }, [props.onNavigate]);

  function update(next: GuideProgress) {
    setProgress(next);
    let saved = false;
    try { saved = saveGuideProgress(window.localStorage, next); } catch { /* Blocked storage. */ }
    setStorageError(!saved);
  }

  useEffect(() => {
    if (!props.ready) return;
    const timer = window.setTimeout(() => {
      try { setProgress(readGuideProgress(window.localStorage)); }
      catch { setProgress({ status: 'active', step: 'welcome' }); setStorageError(true); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [props.ready]);

  useEffect(() => {
    if (!props.ready || props.restartToken === lastRestart.current) return;
    lastRestart.current = props.restartToken;
    const timer = window.setTimeout(() => update({ status: 'active', step: 'welcome' }), 0);
    return () => window.clearTimeout(timer);
  }, [props.ready, props.restartToken]);

  const active = props.ready && progress?.status === 'active';
  const step = progress?.step || 'welcome';
  useEffect(() => {
    if (!active) return;
    const next = reconcileGuideStep(step, { hasShift: props.hasShift, hasItems: props.hasItems, paymentOpen: props.paymentOpen, savedReceipt: props.savedReceipt });
    if (next !== step) {
      const timer = window.setTimeout(() => update({ status: 'active', step: next }), 0);
      return () => window.clearTimeout(timer);
    }
  }, [active, step, props.hasShift, props.hasItems, props.paymentOpen, props.savedReceipt]);

  useEffect(() => {
    if (!active) return;
    previousFocus.current = document.activeElement as HTMLElement;
    panel.current?.focus({ preventScroll: true });
    return () => { if (previousFocus.current?.isConnected) previousFocus.current.focus({ preventScroll: true }); };
  }, [active]);

  useEffect(() => {
    if (!active || step === 'welcome' || step === 'done') return;
    navigate.current(step);
    const measure = () => {
      const targets = [...document.querySelectorAll<HTMLElement>(`[data-guide="${step}"]`)];
      const target = targets.find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if (!target) { setRect(null); return; }
      const r = target.getBoundingClientRect();
      setRect({ step, top: Math.max(0, r.top), left: Math.max(0, r.left), width: Math.min(r.width, window.innerWidth), height: Math.min(r.height, window.innerHeight) });
    };
    const observer = new MutationObserver(measure);
    // Observe structure only: the highlight's style changes must not trigger another measure.
    observer.observe(document.getElementById('main-app-container') || document.body, { childList: true, subtree: true });
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    const frame = requestAnimationFrame(measure);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); cancelAnimationFrame(frame); };
  }, [active, step]);

  if (!active) return storageError ? <p role="status" className="fixed bottom-24 left-3 right-3 z-[100] rounded-xl bg-card border border-line p-3 text-xs text-fg">Preferensi panduan tidak dapat disimpan. Izinkan penyimpanan browser agar panduan tidak muncul lagi.</p> : null;
  const intro = step === 'welcome';
  const finish = () => update({ status: 'completed', step: 'done' });
  const title = copy[step][0];
  return (
    <>
      {intro && <div className="fixed inset-0 z-[90] bg-black/50" />}
      {rect && rect.step === step && <div aria-hidden="true" className="fixed z-[85] pointer-events-none rounded-xl border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}
      <div ref={panel} tabIndex={-1} role={intro ? 'dialog' : 'region'} aria-modal={intro || undefined} aria-labelledby="first-run-title"
        onKeyDown={event => {
          if (event.key === 'Escape') { event.stopPropagation(); update({ status: 'skipped', step }); }
          if (intro && event.key === 'Tab') {
            const controls = panel.current?.querySelectorAll<HTMLElement>('button, a[href]');
            if (!controls?.length) return;
            const first = controls[0], last = controls[controls.length - 1];
            if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
          }
        }}
        className={`fixed z-[100] rounded-2xl border border-line bg-card text-fg p-4 shadow-xl w-[calc(100%-24px)] max-w-sm max-h-[45dvh] overflow-y-auto outline-none ${intro ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2' : ['shift', 'cart', 'payment', 'receipt'].includes(step) !== movePanel ? 'top-2 right-3' : 'bottom-24 right-3'}`}>
        <div className="flex items-start justify-between gap-3">
          <h2 id="first-run-title" className="font-black text-sm">{title}</h2>
          <button type="button" className="shrink-0 text-xs font-bold underline" onClick={() => update({ status: 'skipped', step })}>Lewati</button>
        </div>
        <p className="text-xs text-muted mt-2 leading-relaxed" aria-live="polite">{copy[step][1]}</p>
        {(intro || step === 'payment') && <p className="text-xs mt-2 font-bold">{props.demo ? 'Mode demo: transaksi hanya simulasi.' : 'Mode toko: pembayaran yang dikonfirmasi dicatat sebagai transaksi usaha.'}</p>}
        {step === 'receipt' && props.labelsEnabled && <p className="text-xs text-muted mt-2">Tombol Label Pesanan tersedia pada struk. Cetak memerlukan printer yang sudah diatur.</p>}
        {storageError && <p role="alert" className="text-xs text-rose-700 mt-2">Browser menolak penyimpanan. Pilihan Lewati hanya berlaku selama halaman ini terbuka.</p>}
        <div className="flex flex-wrap gap-2 mt-3 text-xs font-bold">
          {!intro && <button type="button" className="underline" onClick={() => setMovePanel(value => !value)}>Pindahkan Petunjuk</button>}
          {intro && <button type="button" className="rounded-xl bg-accent text-white px-4 py-2" onClick={() => update({ status: 'active', step: props.hasShift ? 'catalog' : 'shift' })}>Mulai Panduan</button>}
          {step === 'shift' && <button type="button" className="rounded-xl bg-accent text-white px-4 py-2" onClick={() => navigate.current('shift')}>Buka Form Shift</button>}
          {step === 'catalog' && !props.hasMenus && <Link className="underline" href={`/admin/menu${props.demo ? '?demo=true' : ''}`}>Siapkan produk di Katalog</Link>}
          {step === 'cart' && <button type="button" className="rounded-xl bg-accent text-white px-4 py-2" onClick={() => navigate.current('payment')}>Buka Pembayaran</button>}
          {step === 'payment' && <button type="button" className="underline" onClick={finish}>Akhiri panduan tanpa transaksi</button>}
          {step === 'receipt' && <button type="button" className="rounded-xl bg-accent text-white px-4 py-2" onClick={() => update({ status: 'active', step: 'done' })}>Lanjut</button>}
          {step === 'done' && <><button type="button" className="rounded-xl bg-accent text-white px-4 py-2" onClick={finish}>Selesai</button><Link className="px-3 py-2 underline" href={`/admin${props.demo ? '?demo=true' : ''}`} onClick={finish}>Buka Dashboard</Link></>}
        </div>
      </div>
    </>
  );
}
