"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TentangRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/panduan");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
      <h1 className="text-base font-black text-slate-800">Mengarahkan ke Panduan &amp; Tentang SakuNota...</h1>
      <p className="text-xs text-slate-500 mt-1">
        Jika tidak otomatis dialihkan,{" "}
        <a href="/panduan" className="text-blue-600 underline font-bold">
          klik di sini
        </a>
        .
      </p>
    </div>
  );
}
