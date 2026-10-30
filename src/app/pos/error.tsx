"use client";
import LineIcon from "@/components/LineIcon";

import { useEffect } from "react";
import Link from "next/link";

export default function PosError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SakuNota POS Error]:", error);
  }, [error]);

  const handleStartDemo = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("sakunota_demo_mode", "true");
        window.location.href = "/pos?demo=true";
      }
    } catch (_) {
      window.location.href = "/pos?demo=true";
    }
  };

  const handleResetCache = () => {
    try {
      if (typeof window !== "undefined") {
        sessionStorage.clear();
        localStorage.removeItem("pos_store_settings");
        localStorage.removeItem("sakunota_clock_watermark");
        window.location.reload();
      }
    } catch (_) {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between p-4 sm:p-6 md:p-8">
      <div className="max-w-md w-full mx-auto my-auto py-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-500/20 text-rose-700 border border-rose-500/30 mb-4 shadow-lg text-3xl"><LineIcon name="info" /></div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
          Halaman Kasir Mengalami Kendala
        </h1>
        <p className="text-xs sm:text-sm text-slate-300 mb-6 leading-relaxed">
          Terjadi kesalahan saat memuat tampilan kasir di perangkat ini. Data offline Anda tetap aman di IndexedDB perangkat.
        </p>

        {error?.message && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-left mb-6 font-mono text-[11px] text-rose-700 break-words max-h-32 overflow-y-auto">
            {error.message}
          </div>
        )}

        <div className="space-y-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            Muat Ulang Kasir
          </button>

          <Link
            href="/?beta=register"
            className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            Daftar Uji Coba Beta (7 Hari)
          </Link>

          <button
            type="button"
            onClick={handleResetCache}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all border border-slate-700 active:scale-95"
          >
            Bersihkan Cache Sementara & Muat Ulang
          </button>

          <Link
            href="/"
            className="block w-full py-2.5 text-center text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Kembali ke Beranda Utama
          </Link>
        </div>
      </div>

      <div className="text-center text-[11px] text-slate-500 py-2">
        SakuNota • Kasir Offline
      </div>
    </div>
  );
}
