'use client';
import { useEffect, useState } from 'react';
import { photoRecognitionReady, preparePhotoRecognition, confirmPhotoRecognitionReady, supportsPhotoRecognition } from '@/lib/retailPhotoRecognition';

export default function RetailPhotoSettings() {
  const [ready, setReady] = useState(false);
  const [supported, setSupported] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const inspect = async () => {
      const available = await photoRecognitionReady().catch(() => false);
      if (active) { setSupported(supportsPhotoRecognition()); setReady(available); }
    };
    void inspect();
    return () => { active = false; };
  }, []);
  const prepare = async () => {
    setError(''); setProgress(0);
    try {
      await preparePhotoRecognition(setProgress);
      // Ensure the local worker actually initializes, including on this device, before claiming readiness.
      const { recognizeProductPhoto } = await import('@/lib/retailPhotoRecognition');
      if (!navigator.serviceWorker.controller) throw new Error('Buka ulang aplikasi untuk menyelesaikan persiapan.');
      const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 80;
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Pengenalan foto belum tersedia di perangkat ini.');
      ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 300, 80); ctx.fillStyle = 'black'; ctx.font = '32px Arial'; ctx.fillText('KOPI ORIGINAL', 10, 50);
      await recognizeProductPhoto(canvas.toDataURL('image/png'), new AbortController().signal, true);
      await confirmPhotoRecognitionReady();
      setReady(true);
    } catch (cause) {
      setReady(false);
      const message = cause instanceof Error ? cause.message : '';
      setError(/^(Foto|Pengenalan foto|Persiapan|Unduhan|Buka ulang)/.test(message) ? message : 'Persiapan belum berhasil. Periksa koneksi lalu coba lagi.');
    }
    finally { setProgress(null); }
  };
  return <section className="space-y-3 rounded-2xl border border-line bg-surface p-5" aria-labelledby="retail-photo-settings">
    <h3 id="retail-photo-settings" className="text-base font-bold text-fg">Foto Produk Retail</h3>
    <p role="status" className="text-sm text-muted">{progress !== null ? `Menyiapkan pengenalan foto… ${progress}%` : ready ? 'Siap digunakan tanpa internet' : supported ? 'Siapkan sekali saat terhubung internet.' : 'Pengenalan foto belum tersedia di perangkat ini.'}</p>
    <p className="text-sm text-muted">Foto diproses di perangkat. Nama barang tetap dapat diperbaiki sebelum ditambahkan.</p>
    {!ready && supported && <button onClick={() => void prepare()} disabled={progress !== null} className="min-h-11 rounded-xl bg-accent px-4 py-2 font-semibold text-white disabled:opacity-50">{progress !== null ? 'Menyiapkan…' : 'Siapkan Pengenalan Foto'}</button>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
  </section>;
}
