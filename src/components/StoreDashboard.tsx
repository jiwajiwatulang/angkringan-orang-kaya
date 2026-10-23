"use client";
import React,{useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/dexie';
import {getOrders} from '@/lib/api';
import {posDashboard} from '@/lib/multidevice/posDashboard';
import type {DashboardRange} from '@/lib/dashboardMetrics';

const rupiah=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
export default function StoreDashboard(){
  const [range,setRange]=useState<DashboardRange>('7days');
  const data=useLiveQuery(async()=>{await db.table('payments').count();return getOrders();},[]);
  if(!data)return <p role="status">Memuat laporan…</p>;
  const report=posDashboard(data,range),max=Math.max(1,...report.days.map(day=>Math.abs(day.net)));
  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold text-fg">Dashboard Usaha</h1><select aria-label="Periode laporan" value={range} onChange={e=>setRange(e.target.value as DashboardRange)} className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm"><option value="today">Hari Ini</option><option value="yesterday">Kemarin</option><option value="7days">7 Hari</option><option value="30days">30 Hari</option><option value="thisMonth">Bulan Ini</option></select></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[
      ['Penjualan Bersih',rupiah(report.net)],['Pembayaran Diterima',rupiah(report.received)],['Pengembalian',rupiah(report.refunded)],['Nota Dibayar',`${report.count} nota`],
    ].map(([label,value])=><section key={label} className="rounded-2xl border border-line bg-surface p-4"><h2 className="text-xs font-semibold text-muted">{label}</h2><p className="mt-2 break-words text-xl font-bold tabular-nums text-fg">{value}</p></section>)}</div>
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="mb-5 font-bold text-fg">Tren Penjualan Bersih</h2><div className="space-y-3">{report.days.map(day=><div key={day.key} className="grid grid-cols-[60px_1fr_100px] items-center gap-2 text-xs sm:text-sm"><span className="text-muted">{day.label}</span><div className="h-5 rounded bg-card"><div className={`h-full min-w-px rounded ${day.net<0?'bg-rose-500':'bg-blue-600'}`} style={{width:`${Math.abs(day.net)/max*100}%`}}/></div><span className="text-right font-semibold tabular-nums text-fg">{rupiah(day.net)}</span></div>)}</div></section>
  </div>;
}
