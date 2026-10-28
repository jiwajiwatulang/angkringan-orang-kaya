'use client';
import React from 'react';
export const field='mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-fg';
export const primary='min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';
export const secondary='min-h-11 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg disabled:opacity-50';
export const money=(value:number)=>new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);
export const date=(value:string)=>new Date(value).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export function Card({title,children}:{title:string;children:React.ReactNode}){return <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="text-lg font-bold">{title}</h2>{children}</section>;}
export function Stat({label,value}:{label:string;value:string|number}){return <div className="rounded-xl border border-line bg-surface p-4"><p className="text-sm text-muted">{label}</p><p className="mt-2 text-xl font-bold tabular-nums">{value}</p></div>;}
export function Tabs({items,value,onChange}:{items:{id:string;label:string}[];value:string;onChange:(id:string)=>void}){return <div className="flex gap-2 overflow-x-auto pb-1" role="tablist">{items.map(item=><button type="button" role="tab" aria-selected={value===item.id} key={item.id} onClick={()=>onChange(item.id)} className={`${value===item.id?primary:secondary} shrink-0`}>{item.label}</button>)}</div>;}
