"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { GUIDE_TOPICS } from "@/lib/guideTopics";
import { SUPPORT_WHATSAPP } from "@/lib/config";

// --- Types & Data Interfaces ---
interface GuideArticle {
  title: string;
  summary: string;
  steps: string[];
  tips?: string;
  targetHref?: string;
  targetLabel?: string;
}

interface GuideTopic {
  id: string;
  title: string;
  shortDesc: string;
  iconType: string;
  articles: GuideArticle[];
}

// --- Topic Catalog matching SakuNota Features & Sentrik POS Reference Layout ---
const TOPICS: GuideTopic[] = GUIDE_TOPICS;

// --- Custom Crisp Stroke Icon Component ---
function TopicIcon({ type }: { type: string }) {
  const commonProps = {
    className: "w-5 h-5",
    fill: "none",
    stroke: "currentColor",
    viewBox: "0 0 24 24",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (type) {
    case "rocket":
      return (
        <svg {...commonProps}>
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4.5c1.62-1.63 5-2.5 5-2.5" />
          <path d="M15 15v5s3.03-.55 4.5-2c1.63-1.62 2.5-5 2.5-5" />
        </svg>
      );
    case "settings":
      return (
        <svg {...commonProps}>
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "cart":
      return (
        <svg {...commonProps}>
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
      );
    case "package":
      return (
        <svg {...commonProps}>
          <path d="m7.5 4.27 9 5.15" />
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      );
    case "layers":
      return (
        <svg {...commonProps}>
          <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
          <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
          <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
        </svg>
      );
    case "users":
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "utensils":
      return (
        <svg {...commonProps}>
          <path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2" />
          <path d="M15 11v11" />
          <path d="M5 2v10a3 3 0 0 0 3 3h1v7h2v-7h1a3 3 0 0 0 3-3V2" />
        </svg>
      );
    case "globe":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
      );
    case "bar-chart":
      return (
        <svg {...commonProps}>
          <line x1="12" x2="12" y1="20" y2="10" />
          <line x1="18" x2="18" y1="20" y2="4" />
          <line x1="6" x2="6" y1="20" y2="16" />
        </svg>
      );
    case "credit-card":
      return (
        <svg {...commonProps}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      );
    case "plug":
      return (
        <svg {...commonProps}>
          <path d="M12 22v-5" />
          <path d="M9 8V2" />
          <path d="M15 2v6" />
          <path d="M18 8v5a6 6 0 0 1-12 0V8c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2Z" />
        </svg>
      );
    case "printer":
      return (
        <svg {...commonProps}>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6" />
          <rect x="6" y="14" width="12" height="8" rx="1" />
        </svg>
      );
    case "file-text":
      return (
        <svg {...commonProps}>
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
          <path d="M10 9H8" />
          <path d="M16 13H8" />
          <path d="M16 17H8" />
        </svg>
      );
    case "shield":
      return (
        <svg {...commonProps}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "wifi-off":
      return (
        <svg {...commonProps}>
          <line x1="2" x2="22" y1="2" y2="22" />
          <path d="M8.5 16.5a5 5 0 0 1 7 0" />
          <path d="M2 8.82a15 15 0 0 1 4.17-2.65" />
          <path d="M10.66 5c4.01-.36 8.14.9 11.34 3.76" />
          <path d="M16.85 11.25a10 10 0 0 1 2.22 1.68" />
          <path d="M5 13a10 10 0 0 1 5.24-2.76" />
          <line x1="12" x2="12.01" y1="20" y2="20" />
        </svg>
      );
    case "banknote":
      return (
        <svg {...commonProps}>
          <rect width="20" height="12" x="2" y="6" rx="2" />
          <circle cx="12" cy="12" r="2" />
          <path d="M6 12h.01M18 12h.01" />
        </svg>
      );
    case "percent":
      return (
        <svg {...commonProps}>
          <line x1="19" x2="5" y1="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      );
    case "help-circle":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
      );
    case "lock":
      return (
        <svg {...commonProps}>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      );
    default:
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="12" x2="12" y1="8" y2="12" />
          <line x1="12" x2="12.01" y1="16" y2="16" />
        </svg>
      );
  }
}

export default function PanduanPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<GuideTopic | null>(null);

  // Filter topics based on search input
  const filteredTopics = useMemo(() => {
    if (!searchQuery.trim()) return TOPICS;
    const q = searchQuery.toLowerCase();
    return TOPICS.filter(
      (topic) =>
        topic.title.toLowerCase().includes(q) ||
        topic.shortDesc.toLowerCase().includes(q) ||
        topic.articles.some(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.summary.toLowerCase().includes(q) ||
            a.steps.some((s) => s.toLowerCase().includes(q))
        )
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white antialiased">
      {/* 1. Header / Navbar (Clean White + Subtle Border) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2.5 group" title="SakuNota - Beranda">
            <img
              src="/logo-sakunota.png"
              alt="SakuNota"
              className="h-8 sm:h-9 w-auto object-contain group-hover:scale-105 transition-transform"
            />
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Fitur
            </Link>
            <Link href="/tentang" className="hover:text-blue-600 transition-colors">
              Tentang
            </Link>
            <Link href="/?beli=true" className="hover:text-blue-600 transition-colors">
              Harga
            </Link>
            <Link href="/panduan" className="text-blue-600 font-bold transition-colors">
              Panduan
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2">
            <a
              href="/pos?demo=true"
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 border border-slate-200 transition-all"
            >
              Coba Demo Kasir
            </a>
            <Link
              href="/?beli=true"
              className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/20 transition-all"
            >
              Beli Rp50.000
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Main Hero Title & Search */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 pt-10 sm:pt-14 pb-16 sm:pb-24">
        {/* Title Section matching Sentrik POS layout */}
        <div className="max-w-3xl mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Panduan
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Jelajahi panduan penggunaan fitur SakuNota dan temukan solusi operasional kasir Anda.
          </p>

          {/* Search Box */}
          <div className="mt-6 max-w-xl">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari topik atau panduan (contoh: printer, meja, shift, lisensi)..."
                className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 focus:border-blue-600 rounded-2xl pl-11 pr-10 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none shadow-2xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
            {searchQuery && (
              <p className="mt-2 text-xs text-slate-500">
                Menampilkan hasil untuk: &quot;<strong>{searchQuery}</strong>&quot; ({filteredTopics.length} topik ditemukan)
              </p>
            )}
          </div>
        </div>

        {/* 3. Cards Grid: 3 Columns Desktop, 2 Tablet, 1 Mobile (Exact Sentrik POS Reference Pattern) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {filteredTopics.map((topic) => (
            <div
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  setSelectedTopic(topic);
                }
              }}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Icon Badge & Arrow */}
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-lime-50 text-lime-700 border border-lime-200/60 flex items-center justify-center group-hover:scale-105 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                    <TopicIcon type={topic.iconType} />
                  </div>
                  <span className="text-slate-300 text-sm font-semibold group-hover:text-blue-600 group-hover:translate-x-1 transition-all">
                    →
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                  {topic.title}
                </h2>

                {/* Short Description */}
                <p className="mt-1.5 text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {topic.shortDesc}
                </p>
              </div>

              {/* Bottom: Article Count */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {topic.articles.length} PANDUAN
                </span>
                <span className="text-xs font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  Buka Pelajari →
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State when search has no match */}
        {filteredTopics.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200 p-8 space-y-3">
            <h3 className="text-base font-bold text-slate-900">
              Tidak ada topik yang sesuai dengan &quot;{searchQuery}&quot;
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Coba gunakan kata kunci lain seperti &quot;printer&quot;, &quot;meja&quot;, &quot;lisensi&quot;, atau &quot;stok&quot;.
            </p>
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="mt-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
            >
              Tampilkan Semua Topik
            </button>
          </div>
        )}
      </main>

      {/* 4. Interactive Article Modal / Drawer */}
      {selectedTopic && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
          onClick={() => setSelectedTopic(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-lime-50 text-lime-700 border border-lime-200/60 flex items-center justify-center">
                  <TopicIcon type={selectedTopic.iconType} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    {selectedTopic.title}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    {selectedTopic.articles.length} PANDUAN LANGKAH DEMI LANGKAH
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTopic(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold transition-colors"
                title="Tutup"
              >
                ×
              </button>
            </div>

            {/* Modal Body: List of Articles */}
            <div className="p-6 overflow-y-auto space-y-6 divide-y divide-slate-100">
              {selectedTopic.articles.map((article, idx) => (
                <div key={idx} className={idx > 0 ? "pt-6" : ""}>
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-base font-bold text-slate-900">
                      {idx + 1}. {article.title}
                    </h4>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    {article.summary}
                  </p>

                  {/* Steps */}
                  <div className="mt-3.5 bg-slate-50 rounded-2xl p-4 border border-slate-200/70 space-y-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-700 block">
                      Langkah Pengerjaan:
                    </span>
                    <ol className="space-y-1.5 text-xs text-slate-700">
                      {article.steps.map((st, sIdx) => (
                        <li key={sIdx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span className="leading-relaxed">{st}</span>
                        </li>
                      ))}
                    </ol>

                    {article.tips && (
                      <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-start gap-2 text-[11px] text-emerald-800">
                        <span className="font-bold"> Tips:</span>
                        <span>{article.tips}</span>
                      </div>
                    )}
                  </div>

                  {/* Direct Link Button */}
                  {article.targetHref && (
                    <div className="mt-3 flex items-center justify-end">
                      <Link
                        href={article.targetHref}
                        onClick={event => { if (article.targetHref?.includes('demo=true')) { event.preventDefault(); window.location.assign(article.targetHref); } }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all"
                      >
                        <span>{article.targetLabel || "Buka Halaman Terkait"}</span>
                        <span>→</span>
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Butuh panduan langsung?
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:text-blue-600 text-xs font-bold transition-all"
                >
                  Tanya WhatsApp
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedTopic(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. Modern Dark Footer (Matching Reference Screenshot) */}
      <footer className="mt-auto bg-black text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-14 pb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 sm:gap-10">
            {/* Col 1: Brand Info (Spans 2 columns on lg) */}
            <div className="lg:col-span-2 space-y-4">
              <Link href="/" className="flex items-center gap-2 group">
                <img
                  src="/logo-sakunota.png"
                  alt="SakuNota"
                  className="h-8 w-auto object-contain brightness-0 invert"
                />
              </Link>
              <p className="text-xs text-neutral-300 leading-relaxed max-w-sm">
                Aplikasi kasir modern untuk UMKM, angkringan, kafe, dan retail. 100% jalan offline tanpa biaya langganan bulanan.
              </p>
              <div className="pt-1">
                <a
                  href="https://www.instagram.com/sakunota/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center text-neutral-300 hover:text-white transition-colors"
                  title="Instagram @sakunota"
                  aria-label="Instagram SakuNota"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Produk
              </h3>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li>
                  <Link href="/pos" className="hover:text-white transition-colors">
                    Kasir POS
                  </Link>
                </li>
                <li>
                  <Link href="/admin/menu" className="hover:text-white transition-colors">
                    Kelola Menu
                  </Link>
                </li>
                <li>
                  <Link href="/admin/meja" className="hover:text-white transition-colors">
                    Manajemen Meja
                  </Link>
                </li>
                <li>
                  <Link href="/admin/pengaturan/printer" className="hover:text-white transition-colors">
                    Printer Bluetooth
                  </Link>
                </li>
                <li>
                  <a href="/pos?demo=true" className="hover:text-white transition-colors">
                    Coba Demo Kasir
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 3: Company */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Perusahaan
              </h3>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li>
                  <Link href="/tentang" className="hover:text-white transition-colors">
                    Tentang Kami
                  </Link>
                </li>
                <li>
                  <Link href="/tentang#cerita" className="hover:text-white transition-colors">
                    Cerita Kami
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Support */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Bantuan
              </h3>
              <ul className="space-y-2 text-xs text-neutral-300">
                <li>
                  <Link href="/panduan" className="hover:text-white transition-colors">
                    Pusat Panduan
                  </Link>
                </li>
                <li>
                  <Link href="/?aktivasi=true" className="hover:text-white transition-colors">
                    Aktivasi Lisensi
                  </Link>
                </li>
                <li>
                  <a
                    href={`https://wa.me/${SUPPORT_WHATSAPP}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-white transition-colors"
                  >
                    Kontak Bantuan
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright & Legal Links */}
          <div className="mt-12 pt-6 border-t border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-400">
            <div>
              © 2026 SakuNota, PT Pemuda Gaya Bebas
            </div>
            <div className="flex items-center gap-6">
              <Link href="/privacy" className="text-neutral-400 hover:text-white transition-colors">
                Privasi
              </Link>
              <Link href="/terms" className="text-neutral-400 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
