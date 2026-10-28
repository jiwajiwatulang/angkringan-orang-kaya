import React from 'react';

export function BusyLabel({children}:{children:React.ReactNode}){
  return <span className="inline-flex items-center justify-center gap-2"><span aria-hidden="true" className="sn-spinner"/>{children}</span>;
}

export default function LoadingState({label='Menyiapkan kasir',compact=false}:{label?:string;compact?:boolean}){
  return <div role="status" aria-label={label} className={`w-full space-y-4 ${compact?'':'rounded-2xl border border-line bg-surface p-5'}`}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="space-y-4">
      <div className="sn-skeleton h-5 w-2/5 rounded-lg"/>
      <div className="sn-skeleton h-12 w-full rounded-xl"/>
      <div className="sn-skeleton h-12 w-full rounded-xl"/>
      {!compact&&<div className="grid grid-cols-2 gap-3"><div className="sn-skeleton h-24 rounded-xl"/><div className="sn-skeleton h-24 rounded-xl"/></div>}
    </div>
  </div>;
}
