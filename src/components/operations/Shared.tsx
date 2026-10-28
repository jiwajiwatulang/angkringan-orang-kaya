"use client";
import React from "react";
import "./operations.css";

export const field = "sn-field mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-fg";
export const primary = "sn-primary min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50";
export const secondary = "sn-secondary min-h-11 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg disabled:opacity-50";
export const money = (value: number) => new Intl.NumberFormat("id-ID", {style:"currency", currency:"IDR", maximumFractionDigits:0}).format(value);
export const date = (value: string) => new Date(value).toLocaleString("id-ID", {day:"numeric", month:"short", hour:"2-digit", minute:"2-digit"});

export function OperationIcon({name, className="h-5 w-5"}: {name:"clock"|"arrow"|"check"|"food"|"chart";className?:string}) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name==="clock"?<><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></>:name==="arrow"?<path d="M5 12h14m-5-5 5 5-5 5"/>:name==="check"?<path d="m5 12 4 4L19 6"/>:name==="chart"?<><path d="M4 4v16h16M8 15v-4m5 4V7m5 8v-6"/></>:<><path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M17 13V3c-3 2-3 7-3 10h6M20 3v18"/></>}
  </svg>;
}
export function PageHeading({title,icon="chart",children}:{title:string;icon?:"food"|"chart";children?:React.ReactNode}) {
  return <header className="sn-page-heading flex flex-wrap items-center justify-between gap-4"><div className="flex min-w-0 items-center gap-3"><span className="sn-heading-icon"><OperationIcon name={icon} className="h-6 w-6"/></span><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1></div>{children}</header>;
}
export function Card({title,children}:{title:string;children:React.ReactNode}) {
  return <section className="sn-card space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6"><h2 className="sn-card-title text-base font-bold sm:text-lg">{title}</h2>{children}</section>;
}
export function Stat({label,value}:{label:string;value:string|number}) {
  return <div className="sn-stat rounded-2xl border border-line bg-surface p-4 sm:p-5"><span className="sn-stat-mark" aria-hidden="true"/><p className="text-sm font-medium text-muted">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[28px]">{value}</p></div>;
}
export function Tabs({items,value,onChange}:{items:{id:string;label:string}[];value:string;onChange:(id:string)=>void}) {
  return <div className="sn-tabs flex gap-1 overflow-x-auto" role="tablist">{items.map(item=><button type="button" role="tab" aria-selected={value===item.id} key={item.id} onClick={()=>onChange(item.id)} className="sn-tab min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold">{item.label}</button>)}</div>;
}
