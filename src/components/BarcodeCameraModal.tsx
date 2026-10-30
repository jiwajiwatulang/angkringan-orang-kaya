"use client";

import React, { useEffect, useRef, useState } from 'react';
import { playScannerBeep } from '@/lib/barcodeScanner';
import { cameraErrorMessage, createCameraBarcodeReader } from '@/lib/cameraBarcode';
import { closeOwnDialog } from '@/lib/dialogCancel';

interface BarcodeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  purpose?: 'product' | 'pairing';
}

export default function BarcodeCameraModal(props: BarcodeCameraModalProps) {
  return props.isOpen ? <CameraScanner {...props} /> : null;
}

function CameraScanner({ onClose, onScan, title = 'Pindai Barcode Produk', purpose = 'product' }: BarcodeCameraModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const handlers = useRef({ onClose, onScan });
  const completed = useRef(false);
  const backdropPressed = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(true);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [torchOn, setTorchOn] = useState(false);
  const [canTorch, setCanTorch] = useState(false);

  useEffect(() => { handlers.current = { onClose, onScan }; }, [onClose, onScan]);
  useEffect(() => {
    const update = () => { setVisible(!document.hidden); if (document.hidden) { setReady(false); setCanTorch(false); setTorchOn(false); } };
    document.addEventListener('visibilitychange', update);
    update();
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    dialog.current?.showModal();
    closeButton.current?.focus({ preventScroll: true });
  }, []);

  const finish = (value: string) => {
    if (completed.current || !value.trim()) return;
    completed.current = true;
    stream.current?.getTracks().forEach(track => track.stop());
    playScannerBeep('success');
    handlers.current.onScan(value.trim());
    handlers.current.onClose();
  };
  const finishRef = useRef(finish);
  useEffect(() => { finishRef.current = finish; });

  useEffect(() => {
    if (!visible) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let acquired: MediaStream | null = null;
    let track: MediaStreamTrack | undefined;
    const disconnected = () => {
      if (active && !completed.current) { stop(); setReady(false); setError('Kamera terputus. Tekan Coba Lagi untuk membukanya kembali.'); }
    };
    const stop = () => {
      if (timer) clearTimeout(timer);
      if (startupTimer) clearTimeout(startupTimer);
      track?.removeEventListener('ended', disconnected);
      acquired?.getTracks().forEach(item => item.stop());
      if (stream.current === acquired) stream.current = null;
      if (video.current?.srcObject === acquired) video.current.srcObject = null;
    };
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable');
        acquired = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
        if (!active) { stop(); return; }
        stream.current = acquired;
        track = acquired.getVideoTracks()[0];
        track?.addEventListener('ended', disconnected);
        setCanTorch(Boolean((track?.getCapabilities?.() as MediaTrackCapabilities & { torch?: boolean })?.torch));
        if (!video.current) { stop(); return; }
        video.current.srcObject = acquired;
        await video.current.play();
        if (!active) { stop(); return; }
        const read = await createCameraBarcodeReader();
        if (!active) { stop(); return; }
        if (startupTimer) clearTimeout(startupTimer);
        setReady(true);
        const scan = async () => {
          if (!active || completed.current) return;
          try {
            const element = video.current;
            if (element && element.readyState >= 2) {
              const value = await read(element);
              if (!active || completed.current) return;
              if (value) { stop(); finishRef.current(value); return; }
            }
          } catch {
            if (active) { stop(); setReady(false); setError(purpose === 'pairing' ? 'Pemindai belum siap. Coba lagi atau tempel tautan penghubung.' : 'Pemindai belum siap. Coba lagi atau masukkan kode barang.'); }
            return;
          }
          if (active && !completed.current) timer = setTimeout(() => { void scan(); }, 200);
        };
        void scan();
      } catch (cause) {
        stop();
        if (active && !completed.current) { setReady(false); setError(purpose === 'pairing' ? cameraErrorMessage(cause).replace('masukkan kode barang', 'tempel tautan penghubung') : cameraErrorMessage(cause)); }
      }
    };
    const startupTimer = setTimeout(() => {
      if (!active) return;
      active = false;
      stop(); setReady(false);
      setError('Kamera belum merespons. Periksa izin kamera untuk SakuNota, lalu coba lagi.');
    }, 20000);
    void start();
    return () => { active = false; stop(); };
  }, [visible, attempt, purpose]);

  const toggleTorch = async () => {
    const track = stream.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as MediaTrackConstraintSet] });
      setTorchOn(!torchOn);
    } catch { setCanTorch(false); }
  };
  const outside = (event: React.PointerEvent<HTMLDialogElement> | React.MouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
  };
  return <dialog ref={dialog} onCancel={event => closeOwnDialog(event, onClose)} aria-labelledby="barcode-camera-title"
    onPointerDown={event => { backdropPressed.current = outside(event); }}
    onClick={event => { if (backdropPressed.current && outside(event)) onClose(); backdropPressed.current = false; }}
    className="m-auto w-[calc(100%-1rem)] max-w-md max-lg:landscape:max-w-2xl max-h-[94dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-slate-950/60">
    <header className="border-b border-line px-4 py-3">
      <h2 id="barcode-camera-title" className="text-base font-bold">{title}</h2>
      <p className="mt-1 text-xs text-muted">{purpose === 'pairing' ? 'Arahkan kamera ke QR di perangkat Pemilik.' : 'Arahkan kamera ke barcode atau kode QR.'}</p>
    </header>
    <div className="max-lg:landscape:grid max-lg:landscape:grid-cols-2">
      <div className="relative aspect-[4/3] min-h-44 overflow-hidden bg-neutral-950">
        <video ref={video} playsInline muted autoPlay aria-label="Kamera pemindai" className="h-full w-full object-cover" />
        {!error && ready && <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6"><div className="h-32 w-60 max-w-full rounded-xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.3)]" /></div>}
        {!error && !ready && <p role="status" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-white">Membuka kamera…</p>}
        {error && <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-5 text-center text-sm text-fg">
          <p>{error}</p>
          <button type="button" onClick={() => { setError(''); setReady(false); setCanTorch(false); setTorchOn(false); setAttempt(value => value + 1); }} className="min-h-11 rounded-xl bg-accent px-4 py-2 font-semibold text-white">Coba Lagi</button>
        </div>}
        {canTorch && ready && !error && <button type="button" onClick={() => void toggleTorch()} className="absolute bottom-2 right-2 min-h-11 rounded-xl bg-black/80 px-3 py-2 text-sm font-semibold text-white">{torchOn ? 'Matikan Lampu' : 'Nyalakan Lampu'}</button>}
      </div>
      <form onSubmit={event => { event.preventDefault(); finish(manualCode); }} className="space-y-3 p-4">
        <label className="block space-y-2 text-sm font-semibold">Kode Barang
          <input value={manualCode} onChange={event => setManualCode(event.target.value)} placeholder={purpose === 'pairing' ? 'Tempel tautan penghubung' : 'Masukkan kode barang'} autoComplete="off" className="min-h-11 w-full rounded-xl border border-line bg-card px-3 py-2 text-base text-fg" />
        </label>
        <button type="submit" disabled={!manualCode.trim()} className="min-h-11 w-full rounded-xl bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">Masukkan</button>
      </form>
    </div>
    <footer className="sticky bottom-0 border-t border-line bg-surface p-3">
      <button ref={closeButton} type="button" onClick={onClose} className="min-h-11 w-full rounded-xl border border-line px-4 py-2 text-sm font-semibold">Tutup Pemindai</button>
    </footer>
  </dialog>;
}
