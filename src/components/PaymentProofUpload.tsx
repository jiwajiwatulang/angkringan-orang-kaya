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
    <div className="mt-3 p-3.5 bg-gray-50 dark:bg-gray-900/80 rounded-2xl border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">🧾</span>
          <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
            Bukti Pembayaran ({paymentMethod})
          </label>
        </div>
        <span
          className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
            proof
              ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              : "bg-gray-200 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
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
          <p className="text-xs text-gray-500 font-semibold animate-pulse">
            Mengompresi gambar bukti bayar...
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="mb-2 p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs rounded-xl border border-rose-200 dark:border-rose-800">
          ⚠️ {errorMessage}
        </div>
      )}

      {!isCompressing && proof ? (
        /* Preview Card */
        <div className="flex items-center gap-3 p-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          {/* Thumbnail dengan tombol Zoom */}
          <div
            onClick={() => setIsZoomOpen(true)}
            className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 cursor-pointer border border-gray-200 dark:border-gray-600 group"
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
            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
              {proof.fileName}
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">
              Ukuran: {formatBytes(proof.fileSize)}
            </p>
            <span className="inline-block text-[9px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
              ✓ Siap Disimpan
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-300 transition-colors"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={() => onChange(null)}
              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition-colors"
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
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span className="text-base">📷</span>
              <span>Ambil Foto</span>
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              disabled={disabled}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <span className="text-base">🖼️</span>
              <span>Dari Galeri</span>
            </button>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
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
            className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-800 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-black text-gray-800 dark:text-white truncate">
                {proof.fileName} ({formatBytes(proof.fileSize)})
              </h4>
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <div className="p-3 max-h-[70vh] overflow-auto flex items-center justify-center bg-gray-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proof.imageData}
                alt={proof.fileName}
                className="max-w-full max-h-[65vh] object-contain rounded-lg"
              />
            </div>
            <div className="p-3 text-center border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setIsZoomOpen(false)}
                className="px-6 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white text-xs font-bold"
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
