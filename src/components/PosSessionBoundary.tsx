"use client";
import React,{useEffect,useState} from 'react';
import {usePathname} from 'next/navigation';
import {posPartition} from '@/lib/multidevice/posPartition';
import {initializePosRuntime,enterEmployee,leaveEmployee,type PosRuntime} from '@/lib/multidevice/posRuntime';
import EmployeeLogin from './EmployeeLogin';
import {db} from '@/lib/dexie';
export default function PosSessionBoundary({children}:{children:React.ReactNode}){
  const pathname=usePathname(),workspace=pathname==='/pos'||pathname.startsWith('/admin');
  const [enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[runtime,setRuntime]=useState<PosRuntime>(),[error,setError]=useState(''),[pending,setPending]=useState(0),[online,setOnline]=useState(true),[failed,setFailed]=useState(false);
  const initialize=async()=>{try{setError('');const active=await initializePosRuntime();setRuntime({...active});setReady(true);}catch(e){setError(e instanceof Error?e.message:'Data belum dapat dibuka.');}};
  const backup=async()=>{
    try{if(!runtime)return;const data=await runtime.synchronizer.backup(),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`sakunota-pengiriman-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Cadangan belum dapat disimpan.');}
  };
  useEffect(()=>{const selected=workspace&&!!posPartition();setEnabled(selected);setReady(!selected);if(selected)void initialize();},[pathname]);
  useEffect(()=>{
    if(!enabled||!runtime?.scope)return;
    let stopped=false,running=false;
    const update=async()=>{if(stopped||running)return;running=true;try{setOnline(navigator.onLine);if(navigator.onLine)await runtime.synchronizer.synchronize();if(!stopped){setFailed(false);setPending(await db.table('posOutbox').count());}}catch(e){if(!stopped){setFailed(true);setPending(await db.table('posOutbox').count());if((e as {status?:number}).status===401||(e as {status?:number}).status===403){await leaveEmployee();setError(e instanceof Error?e.message:'Silakan masuk lagi.');setReady(false);}}}finally{running=false;}};
    const timer=setInterval(()=>void update(),3000);window.addEventListener('online',update);window.addEventListener('offline',update);void update();
    return()=>{stopped=true;clearInterval(timer);window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[enabled,runtime]);
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')return <>{children}</>;
  if(!workspace||!posPartition())return <>{children}</>;
  if(!enabled||!ready)return <main className="mx-auto w-full max-w-md space-y-4 p-6"><p role={error?'alert':'status'}>{error||'Memuat data…'}</p>{error&&<button className="min-h-11 rounded-xl bg-blue-600 px-4 text-white" onClick={()=>void initialize()}>Coba Lagi</button>}</main>;
  if(runtime?.employees&&!runtime.scope)return <main className="flex min-h-dvh items-center justify-center p-4"><EmployeeLogin sessions={runtime.employees} onSuccess={async session=>{const next=await enterEmployee(session);setRuntime({...next});}}/></main>;
  if(runtime?.scope?.claims.role==='cashier'&&typeof location!=='undefined'&&location.pathname!=='/pos'){location.replace('/pos');return null;}
  const cashierPage=typeof location!=='undefined'&&location.pathname==='/pos';
  return <div style={cashierPage?{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden'}:undefined}><div style={{flexShrink:0}} className="flex min-h-10 flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2 text-sm"><span role="status">{failed?'Pengiriman Belum Berhasil':!online?'Tidak Tersambung':pending?`${pending} Data Belum Terkirim`:'Data Terakhir Diterima'}</span><div className="flex flex-wrap gap-2">{pending>0&&<button className="min-h-11 rounded-xl border border-line px-3 font-semibold" onClick={()=>void backup()}>Simpan Cadangan</button>}{runtime?.employees&&<button className="min-h-11 rounded-xl border border-line px-3 font-semibold" onClick={()=>void leaveEmployee().then(()=>setRuntime(runtime?{...runtime,scope:undefined}:undefined))}>Ganti Karyawan</button>}</div></div>{error&&<p role="alert" className="px-4 py-2 text-sm text-red-700">{error}</p>}<div style={cashierPage?{flex:1,minHeight:0,overflow:'auto'}:undefined}>{children}</div></div>;
}
