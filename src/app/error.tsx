"use client";
import LineIcon from "@/components/LineIcon";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SakuNota App Error]:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full mx-auto my-auto py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 mb-4 shadow-lg text-3xl"><LineIcon name="warning" /></div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          Terjadi Kendala Memuat Halaman
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
          Aplikasi SakuNota mendeteksi gangguan saat memuat antarmuka. Anda dapat mencoba memuat ulang atau kembali ke beranda.
        </p>

        {error?.message && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left mb-6 font-mono text-[11px] text-amber-300 break-words max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            Muat Ulang Halaman
          </button>

          <Link
            href="/pos"
            className="block w-full py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all text-center"
          >
            Buka Layar Kasir
          </Link>

          <Link
            href="/"
            className="block w-full py-2.5 text-center text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Kembali ke Beranda SakuNota
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 py-2">
        SakuNota • Kasir Offline
      </div>
    </div>
  );
}
