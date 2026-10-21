'use client';
import { closeOwnDialog } from '@/lib/dialogCancel';

import { useCallback, useEffect, useRef, useState } from 'react';

export default function CameraCapture({ onCapture, onClose, onChooseGallery }: {
  onCapture: (file: File) => void | Promise<void>;
  onClose: () => void;
  onChooseGallery: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const mounted = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stop = useCallback(() => {
    stream.current?.getTracks().forEach(track => track.stop());
    stream.current = null;
    if (video.current) video.current.srcObject = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    dialog.current?.showModal();
    let active = true;
    const start = async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        const acquired = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1600 }, height: { ideal: 1200 } } });
        if (!active || !video.current) { acquired.getTracks().forEach(track => track.stop()); return; }
        stream.current = acquired;
        video.current.srcObject = acquired;
        await video.current.play();
      } catch (cause) {
        if (!active) return;
        stop();
        const name = cause instanceof Error ? cause.name : '';
        setError(name === 'NotAllowedError' || name === 'SecurityError'
          ? 'Izinkan akses kamera di browser, lalu coba lagi.'
          : name === 'NotFoundError' || name === 'DevicesNotFoundError'
            ? 'Kamera tidak ditemukan. Sambungkan kamera atau pilih Dari Galeri.'
            : 'Kamera belum dapat dibuka. Coba lagi atau pilih Dari Galeri.');
      }
    };
    void start();
    return () => { active = false; mounted.current = false; stop(); };
  }, [attempt, stop]);

  const capture = async () => {
    const source = video.current;
    if (!ready || busy || !source?.videoWidth || !source.videoHeight) return;
    setBusy(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = source.videoWidth; canvas.height = source.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('unavailable');
      context.drawImage(source, 0, 0);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('unavailable')), 'image/jpeg', 0.9));
      if (!mounted.current) return;
      stop();
      await onCapture(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      onClose();
    } catch {
      stop();
      if (mounted.current) { setBusy(false); setError('Foto belum tersimpan. Coba ambil foto lagi.'); }
    }
  };

  return <dialog ref={dialog} onCancel={event => closeOwnDialog(event, onClose)} aria-labelledby="capture-camera-title" className="m-auto w-[calc(100%-1.5rem)] max-w-lg max-h-[94dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-slate-950/60">
    <header className="flex items-center justify-between border-b border-line px-4 py-2">
      <h2 id="capture-camera-title" className="text-lg font-bold">Ambil Foto</h2>
      <button type="button" onClick={onClose} aria-label="Tutup Kamera" className="min-h-11 min-w-11 rounded-xl text-2xl">×</button>
    </header>
    <div className="space-y-3 p-4">
      <video ref={video} muted playsInline autoPlay onLoadedData={() => setReady(true)} aria-label="Pratinjau kamera" className={`max-h-[50dvh] w-full rounded-xl bg-slate-950 object-contain ${error ? 'hidden' : ''}`} />
      <p role="status" className="text-sm text-muted">{error || (!ready ? 'Membuka kamera…' : 'Pastikan foto terlihat jelas.')}</p>
      {error && <button type="button" onClick={() => { setError(''); setReady(false); setBusy(false); setAttempt(value => value + 1); }} className="min-h-11 rounded-xl border border-line px-4 py-2 font-semibold">Coba Lagi</button>}
    </div>
    <footer className="sticky bottom-0 grid grid-cols-2 gap-2 border-t border-line bg-surface p-3">
      <button type="button" disabled={busy} onClick={onChooseGallery} className="min-h-11 rounded-xl border border-line px-3 py-2 font-semibold disabled:opacity-50">Dari Galeri</button>
      <button type="button" onClick={() => void capture()} disabled={!ready || busy || Boolean(error)} className="min-h-11 rounded-xl bg-accent px-3 py-2 font-bold text-white disabled:opacity-50">{busy ? 'Menyimpan…' : 'Ambil Foto'}</button>
    </footer>
  </dialog>;
}
