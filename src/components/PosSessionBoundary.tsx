"use client";
import React,{useEffect,useState,useRef} from 'react';
import {usePathname} from 'next/navigation';
import {posPartition} from '@/lib/multidevice/posPartition';
import {initializePosRuntime,enterEmployee,leaveEmployee,rejectRuntimeAccess,type PosRuntime} from '@/lib/multidevice/posRuntime';
import {useLiveQuery} from 'dexie-react-hooks';
import {StoreSyncProvider} from './StoreSyncNotice';
import {PosSyncFailure,syncFailureMessage,type SyncPhase} from '@/lib/multidevice/syncFailure';
import StoreDataStatus from './StoreDataStatus';
import EmployeeLogin from './EmployeeLogin';
import {db} from '@/lib/dexie';
import LoadingState from './LoadingState';
import {SyncScheduler,watchPosCommits} from '@/lib/multidevice/syncScheduler';
export default function PosSessionBoundary({children}:{children:React.ReactNode}){
  const pathname=usePathname(),workspace=pathname==='/pos'||pathname.startsWith('/admin');
  const [enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[runtime,setRuntime]=useState<PosRuntime>(),[error,setError]=useState(''),[pending,setPending]=useState(0),[online,setOnline]=useState(true),[failed,setFailed]=useState(false);
  const [failure,setFailure]=useState<{phase:SyncPhase;message:string}>(),[busy,setBusy]=useState(false);
  const retry=useRef<()=>Promise<void>>(async()=>{});
  const scheduler=useRef<SyncScheduler|null>(null);
  useEffect(()=>{scheduler.current?.activity();},[pathname]);
  const review=useLiveQuery(async()=>{
    if(!enabled)return;
    const [products,queued]=await Promise.all([db.table('menuItems').toArray(),db.table('posOutbox').toArray()]);
    return {stock:products.some(row=>row.stockNeedsReview),recovery:queued.some(row=>row.needsRecovery),pending:queued.length,reason:queued.find(row=>row.errorDetail)?.errorDetail};
  },[enabled]);
  const initialize=async()=>{try{setError('');const active=await initializePosRuntime();setRuntime({...active});setReady(true);}catch(e){setError(e instanceof Error?e.message:'Data belum dapat dibuka.');}};
  const backup=async()=>{
    try{if(!runtime)return;const data=await runtime.synchronizer.backup(),url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`sakunota-pengiriman-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch{setError('Cadangan belum dapat disimpan.');}
  };
  // Navigation inside the workspace must not restart access checks and data loading.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(()=>{const selected=workspace&&!!posPartition();setEnabled(selected);setReady(!selected);if(selected)void initialize();},[workspace]);
  useEffect(()=>{
    if(!enabled||!runtime?.scope)return;
    let stopped=false,hasPending=false;
    const update=async()=>{
      setBusy(true);
      try{
        const before=Number((await db.table('posMeta').get('cursor'))?.value||0);
        await runtime.synchronizer.synchronize();
        const remaining=await db.table('posOutbox').count(),after=Number((await db.table('posMeta').get('cursor'))?.value||0);
        if(!stopped){setFailed(false);setFailure(undefined);setPending(remaining);}
        return {changed:before!==after,pending:remaining>0};
      }catch(e){
        if(!stopped){setFailed(true);const phase=e instanceof PosSyncFailure?e.phase:'pull';setFailure({phase,message:syncFailureMessage(e,phase)});setPending(await db.table('posOutbox').count());if((e as {status?:number}).status===401||(e as {status?:number}).status===403){setReady(false);await rejectRuntimeAccess(runtime,e);setRuntime({...runtime});setError(e instanceof Error?e.message:'Silakan masuk lagi.');setReady(!!runtime.employees);}}
        throw e;
      }finally{if(!stopped)setBusy(false);}
    };
    const loop=new SyncScheduler({sync:update,online:()=>navigator.onLine,visible:()=>document.visibilityState==='visible',mode:()=>location.pathname==='/admin/dapur'?'kitchen':runtime.scope?.claims.role==='owner'?'owner':'cashier'});
    scheduler.current=loop;retry.current=async()=>{loop.wake();};
    const subscription=watchPosCommits(db,(pending,changed)=>{hasPending=pending;if(changed)loop.localChange();});
    const connectivity=()=>{setOnline(navigator.onLine);if(navigator.onLine&&hasPending)loop.localChange();else loop.wake();};
    const visibility=()=>loop.visibilityChanged(),activity=()=>loop.activity();
    setOnline(navigator.onLine);loop.start();
    window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',activity);
    return()=>{stopped=true;subscription.unsubscribe();loop.stop();if(scheduler.current===loop)scheduler.current=null;window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
  },[enabled,runtime]);
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')return <>{children}</>;
  if(!workspace||!posPartition())return <>{children}</>;
  if(!enabled||!ready)return <main className="mx-auto w-full max-w-md space-y-4 p-6">{error?<><p role="alert">{error}</p><button className="min-h-11 rounded-xl bg-blue-600 px-4 text-white" onClick={()=>void initialize()}>Coba Lagi</button></>:<LoadingState label="Memuat data kasir"/>}</main>;
  if(runtime?.employees&&!runtime.scope)return <main className="flex min-h-dvh items-center justify-center p-4"><EmployeeLogin sessions={runtime.employees} onSuccess={async session=>{const next=await enterEmployee(session);setRuntime({...next});}}/></main>;
  if(runtime?.scope?.claims.role==='cashier'&&typeof location!=='undefined'&&location.pathname!=='/pos'){location.replace('/pos');return null;}
  const cashierPage=typeof location!=='undefined'&&location.pathname==='/pos';
  const pendingCount=review?.pending??pending;
  const showStatus=failed||!online||pendingCount>0||!!review?.stock||!!review?.recovery;
  const changeEmployee=()=>void leaveEmployee().then(()=>setRuntime(runtime?{...runtime,scope:undefined}:undefined));
  const notice=<>{showStatus&&<aside aria-label="Status data kasir" className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
    <div className="min-w-0 space-y-1"><StoreDataStatus pending={pendingCount} online={online} failed={failed} failurePhase={failure?.phase} needsReview={review?.stock}/>
      {pendingCount>0&&<p className="text-xs">Data tetap tersimpan di perangkat ini.</p>}
      {review?.recovery&&<p role="status" className="text-sm">Transaksi kasir sebelumnya perlu dipulihkan oleh pemilik.</p>}
      {online&&(failure?.message||review?.reason)&&<details className="text-xs"><summary className="min-h-8 cursor-pointer py-1 font-semibold">Lihat kendala</summary><p className="max-w-xl break-words py-1">{failure?.message||review?.reason}</p></details>}
    </div>
    <div className="flex flex-wrap gap-2">{online&&(failed||pendingCount>0)&&<button disabled={busy} className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 font-semibold disabled:opacity-50" onClick={()=>void retry.current()}>{busy?'Mencoba…':'Coba Lagi'}</button>}
      {pendingCount>0&&<button className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 font-semibold" onClick={()=>void backup()}>Simpan Cadangan</button>}
      {runtime?.employees&&<button className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 font-semibold" onClick={changeEmployee}>Ganti Karyawan</button>}
    </div></aside>}{!showStatus&&runtime?.employees&&<div className="flex shrink-0 justify-end px-3 py-2"><button className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-fg" onClick={changeEmployee}>Ganti Karyawan</button></div>}{error&&<p role="alert" className="px-4 py-2 text-sm text-red-700">{error}</p>}</>;
  return <StoreSyncProvider value={notice}><div style={cashierPage?{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden'}:undefined}>{cashierPage&&notice}<div style={cashierPage?{flex:1,minHeight:0,overflow:'auto'}:undefined}>{children}</div></div></StoreSyncProvider>;
}
