"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { playScannerBeep } from "@/lib/barcodeScanner";

interface BarcodeCameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export default function BarcodeCameraModal({
  isOpen,
  onClose,
  onScan,
  title = "Pindai Barcode Produk",
}: BarcodeCameraModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const [hasCamera, setHasCamera] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [isDetectorSupported, setIsDetectorSupported] = useState(true);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [canTorch, setCanTorch] = useState(false);

  // Stop video stream & loop
  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsTorchOn(false);
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    playScannerBeep("success");
    onScan(clean);
    setManualCode("");
    onClose();
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && typeof (track as any).applyConstraints === "function") {
      try {
        const nextState = !isTorchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }],
        });
        setIsTorchOn(nextState);
      } catch (_) {}
    }
  };

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    let isSubscribed = true;
    setErrorMessage(null);

    const initCamera = async () => {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setHasCamera(false);
        setErrorMessage("Perangkat ini tidak mendukung akses kamera langsung.");
        return;
      }

      // Check BarcodeDetector API support
      const supported =
        typeof window !== "undefined" &&
        "BarcodeDetector" in window &&
        typeof (window as any).BarcodeDetector === "function";

      setIsDetectorSupported(supported);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (!isSubscribed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        // Check if torch/flashlight is supported
        const track = stream.getVideoTracks()[0];
        const capabilities = (track as any)?.getCapabilities?.();
        if (capabilities && "torch" in capabilities) {
          setCanTorch(true);
        }

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        // Initialize barcode detection loop if API exists
        if (supported) {
          const barcodeDetector = new (window as any).BarcodeDetector({
            formats: [
              "ean_13",
              "ean_8",
              "code_128",
              "code_39",
              "upc_a",
              "upc_e",
              "qr_code",
              "data_matrix",
            ],
          });

          let isScanning = true;
          let scanCooldown = false;

          const scanFrame = async () => {
            if (!isSubscribed || !isScanning) return;

            if (
              videoRef.current &&
              videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA &&
              !scanCooldown
            ) {
              try {
                const barcodes = await barcodeDetector.detect(videoRef.current);
                if (barcodes && barcodes.length > 0) {
                  const detectedValue = barcodes[0].rawValue;
                  if (detectedValue) {
                    scanCooldown = true;
                    playScannerBeep("success");
                    onScan(detectedValue);
                    stopCamera();
                    onClose();
                    return;
                  }
                }
              } catch (_) {}
            }

            if (isSubscribed) {
              scanLoopRef.current = requestAnimationFrame(scanFrame);
            }
          };

          scanLoopRef.current = requestAnimationFrame(scanFrame);
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        setHasCamera(false);
        setErrorMessage(
          err.name === "NotAllowedError"
            ? "Izin akses kamera ditolak. Silakan izinkan kamera di browser atau gunakan input manual."
            : "Kamera tidak dapat diakses atau sedang digunakan oleh aplikasi lain."
        );
      }
    };

    initCamera();

    return () => {
      isSubscribed = false;
      stopCamera();
    };
  }, [isOpen, onClose, onScan, stopCamera]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Floating Exit Button: ALWAYS VISIBLE even on tiny screens or landscape */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup Pemindai"
        title="Tutup Pemindai Barcode"
        className="fixed top-2.5 right-2.5 z-[60] w-10 h-10 rounded-full bg-slate-800/95 hover:bg-slate-700 text-white border border-slate-700 shadow-2xl flex items-center justify-center text-base font-black transition-all active:scale-95 cursor-pointer backdrop-blur-md"
      >
        ✕
      </button>

      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md landscape:max-w-2xl w-full overflow-hidden shadow-2xl flex flex-col text-white max-h-[96dvh] landscape:max-h-[94dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Hidden or compact in landscape to save vertical space) */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-black text-sm text-white">{title}</h3>
            <p className="text-[11px] text-slate-400">
              Arahkan kamera ke barcode produk atau ketik SKU manual.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
          >
            ×
          </button>
        </div>

        {/* Content Container (Split 2-columns in landscape) */}
        <div className="flex-1 flex flex-col landscape:grid landscape:grid-cols-2 overflow-y-auto">
          {/* Viewfinder Video Area */}
          <div className="relative aspect-4/3 landscape:aspect-auto landscape:h-full w-full bg-black overflow-hidden flex items-center justify-center min-h-[180px]">
            {hasCamera && !errorMessage ? (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder Overlay Frame */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-4 sm:p-8">
                  <div className="relative w-52 sm:w-64 h-32 sm:h-40 rounded-2xl border-2 border-blue-500/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    {/* Laser Scan line animation */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />

                    {/* Corner accents */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br" />
                  </div>
                </div>

                {/* Torch Button */}
                {canTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className="absolute bottom-2.5 right-2.5 px-3 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[11px] font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {isTorchOn ? "Matikan Lampu" : "Nyalakan Lampu"}
                  </button>
                )}
              </>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 space-y-2">
                <p className="font-bold text-slate-200">
                  {errorMessage || "Kamera tidak aktif"}
                </p>
                <p className="text-[11px]">
                  Silakan ketik kode barcode produk secara manual di samping.
                </p>
              </div>
            )}

            {!isDetectorSupported && hasCamera && !errorMessage && (
              <div className="absolute top-2 left-2 right-2 bg-amber-500/90 text-slate-950 font-bold text-[10px] p-1.5 sm:p-2 rounded-xl text-center">
                Browser ini belum auto-deteksi. Ketik kode manual di samping atau gunakan Barcode Scanner fisik.
              </div>
            )}
          </div>

          {/* Manual Input Fallback & Action Buttons */}
          <div className="p-3 sm:p-4 bg-slate-900 border-t landscape:border-t-0 landscape:border-l border-slate-800 flex flex-col justify-between space-y-3">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Input Kode Manual / Barcode Gun:
              </span>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ketik / tembak kode barcode..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-xs transition-all shrink-0 shadow-sm cursor-pointer"
                >
                  Masukkan
                </button>
              </form>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-400">Tekan ESC atau tombol Tutup untuk kembali</span>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Tutup Pemindai
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
