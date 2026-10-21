'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { chartPointAtPointer, chartTooltipPosition } from '@/lib/chartInteraction';

export type SalesTrendPoint = { label: string; sublabel: string; omzet: number; count: number };
export default function SalesTrendChart({ points, type }: { points: SalesTrendPoint[]; type: 'line' | 'bar' }) {
  const [selected, setSelected] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 800, height: 280 });
  const container = useRef<HTMLDivElement>(null);
  const gradient = useId().replaceAll(':', '');
  const width = 800, height = 280, left = 24, right = 24, top = 20, bottom = 36;
  const plotW = width - left - right, plotH = height - top - bottom;
  const minimum = Math.min(0, ...points.map(point => point.omzet * 1.15));
  const maximum = Math.max(50000, ...points.map(point => point.omzet * 1.15));
  const toY = (value: number) => top + (maximum - value) / (maximum - minimum) * plotH;
  const zero = toY(0);
  const coords = points.map((point, index) => ({ ...point, x: left + index / Math.max(1, points.length - 1) * plotW, y: toY(point.omzet) }));
  const active = selected === null ? null : coords[selected];
  const tooltip = active ? chartTooltipPosition(56 + active.x / width * (size.width - 56), active.y / height * size.height, size.width, size.height) : null;
  let path = coords.length ? `M ${coords[0].x} ${coords[0].y}` : '';
  for (let i = 1; i < coords.length; i++) {
    const a = coords[i - 1], b = coords[i], middle = (a.x + b.x) / 2;
    path += ` C ${middle} ${a.y}, ${middle} ${b.y}, ${b.x} ${b.y}`;
  }
  const labels = new Set(Array.from({ length: Math.min(5, points.length) }, (_, index) => Math.round(index / Math.max(1, Math.min(5, points.length) - 1) * (points.length - 1))));
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const measure = () => { const box = element.getBoundingClientRect(); if (box.width > 0) setSize({ width: box.width, height: box.height }); };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const select = (clientX: number, bounds: DOMRect) => setSelected(chartPointAtPointer(clientX, bounds.left, bounds.width, points.length, left / width, 1 - right / width));
  return (
    <div>
      <div ref={container} className="relative w-full h-[248px] sm:h-[280px]" data-sales-chart>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute top-0 h-full outline-offset-4" style={{ left: 56, width: 'calc(100% - 56px)' }} tabIndex={0} role="group"
          aria-label="Tren penjualan. Arahkan kursor atau sentuh grafik. Gunakan panah kiri dan kanan untuk memilih tanggal."
          onPointerMove={event => select(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerDown={event => select(event.clientX, event.currentTarget.getBoundingClientRect())}
          onPointerLeave={event => { if (event.pointerType !== 'touch') setSelected(null); }}
          onPointerCancel={() => setSelected(null)} onFocus={() => setSelected(current => current ?? 0)} onBlur={() => setSelected(null)}
          onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return;
            event.preventDefault();
            if (event.key === 'Escape') { setSelected(null); return; }
            const key = event.key;
            setSelected(current => key === 'Home' ? 0 : key === 'End' ? points.length - 1 : Math.max(0, Math.min(points.length - 1, (current ?? 0) + (key === 'ArrowRight' ? 1 : -1))));
          }}>
          <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#2563eb" stopOpacity="0.2" /><stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" /></linearGradient></defs>
          <rect width={width} height={height} fill="transparent" pointerEvents="all" />
          {[0, .25, .5, .75, 1].map(value => <line key={value} x1={left} x2={width - right} y1={top + value * plotH} y2={top + value * plotH} stroke="#cbd5e1" strokeDasharray="4 4" />)}
          <line x1={left} x2={width - right} y1={zero} y2={zero} stroke="#94a3b8" />
          {type === 'line' ? <>
            {coords.length > 0 && <path d={`${path} L ${coords[coords.length - 1].x} ${zero} L ${coords[0].x} ${zero} Z`} fill={`url(#${gradient})`} pointerEvents="none" />}
            <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            {coords.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={index === selected ? 6 : 4} fill="white" stroke="#1d4ed8" strokeWidth="2" vectorEffect="non-scaling-stroke" pointerEvents="none" />)}
          </> : coords.map((point, index) => {
            const barWidth = Math.min(42, plotW / Math.max(1, points.length) * .7);
            return <rect key={index} x={point.x - barWidth / 2} y={Math.min(point.y, zero)} width={barWidth} height={Math.max(2, Math.abs(zero - point.y))} rx="3" fill={index === selected ? '#1e40af' : '#2563eb'} pointerEvents="none" />;
          })}
          {active && <line x1={active.x} x2={active.x} y1={top} y2={height - bottom} stroke="#1e40af" strokeDasharray="4 3" pointerEvents="none" />}
        </svg>
        {[0, .25, .5, .75, 1].map(value => <span key={value} aria-hidden="true" className="absolute left-0 w-11 text-right text-[11px] sm:text-xs font-semibold text-slate-700 pointer-events-none -translate-y-1/2" style={{ top: `${(top + value * plotH) / height * 100}%` }}>{new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(maximum - value * (maximum - minimum))}</span>)}
        {coords.map((point, index) => labels.has(index) && <span key={index} aria-hidden="true" className="absolute bottom-0 -translate-x-1/2 text-xs font-semibold text-slate-700 pointer-events-none whitespace-nowrap" style={{ left: `${(56 + point.x / width * (size.width - 56)) / size.width * 100}%` }}>{point.label}</span>)}
        {active && tooltip && <div role="status" data-chart-tooltip className="absolute z-10 pointer-events-none rounded-xl border border-slate-300 !bg-white !text-slate-900 px-3 py-2 shadow-lg" style={tooltip}>
          <p className="text-xs sm:text-sm font-semibold !text-slate-700 leading-snug">{active.sublabel}</p>
          <p className="text-base sm:text-lg font-black !text-slate-950 tabular-nums leading-snug">Rp {active.omzet.toLocaleString('id-ID')}</p>
          <p className="text-xs !text-slate-700">{active.count} transaksi selesai</p>
        </div>}
      </div>
      <p className="text-xs text-muted mt-3">Nilai dalam rupiah. Arahkan kursor atau sentuh grafik untuk melihat rincian.</p>
    </div>
  );
}
