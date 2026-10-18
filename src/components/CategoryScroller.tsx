'use client';

import { useEffect, useRef, useState } from 'react';

export default function CategoryScroller({ categories, value, onChange }: { categories: string[]; value: string; onChange: (category: string) => void }) {
  const list = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const sync = () => { const el = list.current; if (el) setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 }); };
  useEffect(() => {
    const el = list.current; if (!el) return;
    const observer = new ResizeObserver(sync); observer.observe(el); sync();
    return () => observer.disconnect();
  }, [categories.join('|')]);
  useEffect(() => {
    const el = list.current, selected = el?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (el && selected) {
      if (selected.offsetLeft < el.scrollLeft) el.scrollTo({ left: selected.offsetLeft, behavior: 'smooth' });
      else if (selected.offsetLeft + selected.offsetWidth > el.scrollLeft + el.clientWidth) el.scrollTo({ left: selected.offsetLeft + selected.offsetWidth - el.clientWidth, behavior: 'smooth' });
    }
  }, [value]);
  const scroll = (direction: number) => list.current?.scrollBy({ left: direction * Math.max(160, list.current.clientWidth * 0.7), behavior: 'smooth' });
  return <div className="flex items-center gap-2 min-w-0 w-full" aria-label="Kategori produk">
    <button type="button" aria-label="Kategori sebelumnya" disabled={edges.start} onClick={() => scroll(-1)} className="shrink-0 w-9 h-9 border border-line rounded-full bg-card text-fg disabled:opacity-30">←</button>
    <div ref={list} onScroll={sync} onWheel={e => { if (e.deltaY && !e.deltaX && list.current) list.current.scrollLeft += e.deltaY; }} className="relative flex flex-1 min-w-0 gap-2 overflow-x-auto py-1" style={{ touchAction: 'pan-x', scrollbarWidth: 'thin' }}>
      {categories.map(category => <button key={category} type="button" aria-pressed={value === category} onClick={() => onChange(category)} className={`shrink-0 whitespace-nowrap px-4 py-2 rounded-full border text-xs sm:text-sm font-bold ${value === category ? 'bg-accent text-white border-accent' : 'bg-card text-fg border-line hover:border-accent'}`}>{category}</button>)}
    </div>
    <button type="button" aria-label="Kategori berikutnya" disabled={edges.end} onClick={() => scroll(1)} className="shrink-0 w-9 h-9 border border-line rounded-full bg-card text-fg disabled:opacity-30">→</button>
  </div>;
}
