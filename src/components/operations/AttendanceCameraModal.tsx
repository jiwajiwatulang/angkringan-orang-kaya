'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { closeOwnDialog } from '@/lib/dialogCancel';
import { compressAttendancePhoto } from '@/lib/attendancePhoto';
import { BusyLabel } from '@/components/LoadingState';

const FALLBACK_REASONS = [
  'Izin kamera tidak diizinkan di browser',
  'Kamera perangkat rusak atau bermasalah',
  'Perangkat kasir tidak memiliki kamera',
  'Koneksi darurat / keperluan mendesak',
];

interface AttendanceCameraModalProps {
  employeeName: string;
  kind: 'in' | 'out';
  onConfirmPhoto: (result: { photoId: string; blob: Blob; dataUrl?: string; checksum: string }) => void | Promise<void>;
  onConfirmWithoutPhoto: (reason: string) => void | Promise<void>;
  onClose: () => void;
}

export default function AttendanceCameraModal({
  employeeName,
  kind,
  onConfirmPhoto,
  onConfirmWithoutPhoto,
  onClose,
}: AttendanceCameraModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(false);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isMirrored, setIsMirrored] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [captured, setCaptured] = useState<{ blob: Blob; dataUrl: string; checksum: string } | null>(null);

  // Fallback without photo state
  const [showFallback, setShowFallback] = useState(false);
  const [selectedReason, setSelectedReason] = useState(FALLBACK_REASONS[0]);
  const [customReason, setCustomReason] = useState('');

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    stopCamera();
    setReady(false);
    setError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('unsupported');
      }
      const acquired = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1280 },
          height: { ideal: 960 },
        },
      });
      if (!mountedRef.current || !videoRef.current) {
        acquired.getTracks().forEach(t => t.stop());
        return;
      }
      streamRef.current = acquired;
      videoRef.current.srcObject = acquired;
      await videoRef.current.play();
    } catch (err) {
      if (!mountedRef.current) return;
      stopCamera();
      const name = err instanceof Error ? err.name : '';
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setError('Izin kamera ditolak di browser. Aktifkan izin kamera atau pilih Absen Tanpa Foto.');
      } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
        setError('Kamera tidak ditemukan pada perangkat ini.');
      } else {
        setError('Kamera belum dapat dibuka. Periksa izin kamera atau pilih Absen Tanpa Foto.');
      }
      // Proactively suggest fallback when camera is unavailable
      setShowFallback(true);
    }
  }, [stopCamera]);

  useEffect(() => {
    mountedRef.current = true;
    dialogRef.current?.showModal();
    void startCamera(facingMode);
    return () => {
      mountedRef.current = false;
      stopCamera();
    };
  }, [facingMode, startCamera, stopCamera]);

  const flipCamera = () => {
    if (busy) return;
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  const snapPhoto = async () => {
    const video = videoRef.current;
    if (!ready || busy || !video?.videoWidth || !video.videoHeight) return;
    setBusy(true);
    setError('');
    try {
      const mirrorPhoto = isMirrored && facingMode === 'user';
      const result = await compressAttendancePhoto(video, video.videoWidth, video.videoHeight, 1080, 0.75, mirrorPhoto);
      stopCamera();
      setCaptured({ blob: result.blob, dataUrl: result.dataUrl, checksum: result.checksum });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil foto. Coba lagi.');
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  };

  const retakePhoto = () => {
    setCaptured(null);
    void startCamera(facingMode);
  };

  const confirmCaptured = async () => {
    if (!captured || busy) return;
    setBusy(true);
    setError('');
    try {
      const photoId = crypto.randomUUID();
      await onConfirmPhoto({ photoId, blob: captured.blob, dataUrl: captured.dataUrl, checksum: captured.checksum });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan absensi foto.');
      setBusy(false);
    }
  };

  const confirmWithout = async () => {
    if (busy) return;
    const finalReason = selectedReason === 'Lainnya' ? customReason.trim() : selectedReason;
    if (!finalReason) {
      setError('Pilih atau tuliskan alasan absen tanpa foto.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      stopCamera();
      await onConfirmWithoutPhoto(finalReason);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan absensi.');
      setBusy(false);
    }
  };

  const titleText = kind === 'in' ? 'Absen Masuk' : 'Absen Pulang';

  return (
    <dialog
      ref={dialogRef}
      onCancel={event => closeOwnDialog(event, onClose)}
      aria-labelledby="attendance-camera-title"
      className="m-auto w-[calc(100%-1.5rem)] max-w-md max-h-[94dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-fg shadow-xl backdrop:bg-slate-950/60"
    >
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <h2 id="attendance-camera-title" className="text-base font-bold text-fg">
            Foto Bukti {titleText}
          </h2>
          <p className="text-xs text-muted">{employeeName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Tutup Kamera"
          className="min-h-11 min-w-11 rounded-xl text-2xl font-bold text-muted hover:text-fg disabled:opacity-50"
        >
          &times;
        </button>
      </header>

      <div className="space-y-3 p-4">
        {showFallback ? (
          /* Fallback Dialog: Absen Tanpa Foto */
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              <p className="font-semibold">Absensi Tanpa Foto</p>
              <p className="mt-1">
                Catatan absensi tetap tersimpan dan shift kasir tetap dapat berjalan. Alasan ini akan terlihat oleh Pemilik.
              </p>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-fg">Pilih Alasan:</legend>
              {FALLBACK_REASONS.map(r => (
                <label key={r} className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-2.5 text-xs text-fg hover:bg-card">
                  <input
                    type="radio"
                    name="fallback-reason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={() => setSelectedReason(r)}
                    className="mt-0.5"
                  />
                  <span>{r}</span>
                </label>
              ))}
              <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-line p-2.5 text-xs text-fg hover:bg-card">
                <input
                  type="radio"
                  name="fallback-reason"
                  value="Lainnya"
                  checked={selectedReason === 'Lainnya'}
                  onChange={() => setSelectedReason('Lainnya')}
                  className="mt-0.5"
                />
                <span>Alasan lainnya</span>
              </label>
              {selectedReason === 'Lainnya' && (
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Tulis alasan singkat..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full rounded-xl border border-line bg-card px-3 py-2 text-xs text-fg"
                />
              )}
            </fieldset>

            {error && <p role="alert" className="text-xs font-medium text-red-700">{error}</p>}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => void confirmWithout()}
                disabled={busy}
                className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? <BusyLabel>Menyimpan...</BusyLabel> : 'Lanjutkan Absen Tanpa Foto'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFallback(false);
                  setError('');
                  void startCamera(facingMode);
                }}
                disabled={busy}
                className="min-h-11 rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg"
              >
                Coba Kamera Lagi
              </button>
            </div>
          </div>
        ) : captured ? (
          /* Confirmation Preview: Foto Berhasil Diambil */
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-line bg-slate-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={captured.dataUrl}
                alt="Pratinjau foto absensi"
                className="max-h-[50dvh] w-full object-contain"
              />
            </div>
            <p className="text-center text-xs text-muted">
              Pastikan wajah terlihat jelas sebelum menyimpan.
            </p>

            {error && <p role="alert" className="text-xs font-medium text-red-700">{error}</p>}

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={retakePhoto}
                disabled={busy}
                className="min-h-11 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-fg disabled:opacity-50"
              >
                Foto Ulang
              </button>
              <button
                type="button"
                onClick={() => void confirmCaptured()}
                disabled={busy}
                className="min-h-11 rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {busy ? <BusyLabel>Menyimpan...</BusyLabel> : 'Gunakan Foto'}
              </button>
            </div>
          </div>
        ) : (
          /* Live Camera Viewfinder */
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl bg-slate-950">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                onLoadedData={() => setReady(true)}
                aria-label="Pratinjau kamera absensi"
                className={`max-h-[50dvh] w-full object-contain ${error ? 'hidden' : ''} ${isMirrored && facingMode === 'user' ? '-scale-x-100' : ''}`}
              />
              {ready && (
                <div className="absolute right-3 top-3 flex items-center gap-1.5">
                  {facingMode === 'user' && (
                    <button
                      type="button"
                      onClick={() => setIsMirrored(prev => !prev)}
                      disabled={busy}
                      aria-label="Mode Cermin"
                      className="rounded-full bg-slate-900/80 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur hover:bg-slate-800"
                    >
                      {isMirrored ? 'Cermin: Aktif' : 'Cermin: Nonaktif'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <p role="status" className="text-xs text-muted text-center">
              {error || (!ready ? 'Menyiapkan kamera...' : 'Arahkan kamera ke wajah karyawan.')}
            </p>

            {error && (
              <button
                type="button"
                onClick={() => void startCamera(facingMode)}
                className="min-h-11 w-full rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg"
              >
                Coba Buka Kamera Lagi
              </button>
            )}

            {error ? (
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => void startCamera(facingMode)}
                  className="min-h-11 w-full rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg"
                >
                  Coba Buka Kamera Lagi
                </button>
                <button
                  type="button"
                  onClick={() => setShowFallback(true)}
                  className="min-h-11 w-full rounded-xl bg-amber-600 hover:bg-amber-700 px-3 py-2 text-xs font-bold text-white shadow-sm"
                >
                  Absen Tanpa Foto (Kamera Bermasalah)
                </button>
              </div>
            ) : (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => void snapPhoto()}
                  disabled={!ready || busy || Boolean(error)}
                  className="min-h-11 w-full rounded-xl bg-blue-600 hover:bg-blue-700 px-3 py-2 text-xs font-bold text-white disabled:opacity-50 shadow-sm transition-all active:scale-[0.99]"
                >
                  {busy ? <BusyLabel>Memproses Foto...</BusyLabel> : 'Ambil Foto Wajah'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </dialog>
  );
}
