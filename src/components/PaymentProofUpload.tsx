"use client";

import React, { useRef, useState } from "react";
import { compressPaymentProof, formatBytes } from "@/lib/imageUtils";

interface PaymentProofUploadProps {
  proof: { imageData: string; fileName: string; fileSize: number; mimeType: string } | null;
  onChange: (proof: { imageData: string; fileName: string; fileSize: number; mimeType: string } | null) => void;
  paymentMethod: string;
  disabled?: boolean;
}

export default function PaymentProofUpload({
  proof,
  onChange,
  paymentMethod,
  disabled = false,
}: PaymentProofUploadProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setErrorMessage(null);

    try {
      const processed = await compressPaymentProof(file);
      onChange(processed);
    } catch (err: any) {
      console.error("Gagal memproses gambar:", err);
      setErrorMessage(err.message || "Gagal mengompresi gambar.");
    } finally {
      setIsCompressing(false);
      // Reset input value agar dapat memilih file yang sama jika diinginkan
      e.target.value = "";
    }
  };

  return (
    <div className="mt-3 p-3.5 bg-surface/80 rounded-2xl border border-line">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🧾</span>
          <label className="text-xs font-bold text-slate-300">
            Bukti Pembayaran ({paymentMethod})
          </label>
        </div>
        <span
          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            proof
              ? " bg-amber-950/60 text-amber-300 border border-amber-800"
              : " bg-card text-muted"
          }`}
        >
          {proof ? "Menunggu Verifikasi" : "Menunggu Bukti"}
        </span>
      </div>

      {/* Hidden inputs untuk Kamera dan Galeri */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isCompressing}
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isCompressing}
      />

      {isCompressing && (
        <div className="py-4 text-center">
          <div className="inline-block animate-spin text-lg mb-1">⏳</div>
          <p className="text-xs text-muted font-semibold animate-pulse">
            Mengompresi gambar bukti bayar...
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-2 p-2 bg-rose-950/40 text-rose-400 text-xs rounded-xl border border-rose-800">
          ⚠️ {errorMessage}
        </div>
      )}

      {!isCompressing && proof ? (
        /* Preview Card */
        <div className="flex items-center gap-3 p-2 bg-card rounded-xl border border-line">
          {/* Thumbnail dengan tombol Zoom */}
          <div
            onClick={() => setIsZoomOpen(true)}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-line flex-shrink-0 cursor-pointer border border-line group"
            title="Klik untuk memperbesar"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proof.imageData}
              alt={proof.fileName}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs">
              🔍
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-fg truncate">
              {proof.fileName}
            </p>
            <p className="text-[10px] text-muted">
              Ukuran: {formatBytes(proof.fileSize)}
            </p>
            <span className="inline-block text-[9px] font-black text-accent-text mt-0.5">
              ✓ Siap Disimpan
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-line hover:bg-line text-slate-300 transition-colors"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-500/15 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      ) : !isCompressing ? (
        /* Empty State: Tombol Pilih Kamera & Galeri */
        <div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-card border border-line text-slate-300 hover:bg-line text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span className="text-base">📷</span>
              <span>Ambil Foto</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-card border border-line text-slate-300 hover:bg-line text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span className="text-base">🖼️</span>
              <span>Dari Galeri</span>
            </button>
          </div>
          <p className="text-[10px] text-muted mt-2 text-center">
            Bukti bayar dapat diunggah belakangan lewat Riwayat Transaksi jika saat ini belum tersedia.
          </p>
        </div>
      ) : null}

      {/* Modal Zoom Foto Bukti */}
      {isZoomOpen && proof && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsZoomOpen(false)}
        >
          <div
            className=" bg-surface rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-line animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-line">
              <h4 className="text-xs font-black text-fg truncate">
                {proof.fileName} ({formatBytes(proof.fileSize)})
              </h4>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="w-7 h-7 rounded-full bg-card text-slate-300 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-app">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proof.imageData}
                alt={proof.fileName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 text-center border-t border-line">
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="px-6 py-2 rounded-xl bg-card text-fg text-xs font-bold"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
