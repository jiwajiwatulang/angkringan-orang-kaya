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
import {syncPendingAttendancePhotos} from '@/lib/attendancePhoto';
export default function PosSessionBoundary({children}:{children:React.ReactNode}){
  const pathname=usePathname(),workspace=pathname==='/pos'||pathname.startsWith('/admin');
  const [enabled,setEnabled]=useState(false),[ready,setReady]=useState(false),[runtime,setRuntime]=useState<PosRuntime>(),[error,setError]=useState(''),[pending,setPending]=useState(0),[online,setOnline]=useState(true),[failed,setFailed]=useState(false);
  const [failure,setFailure]=useState<{phase:SyncPhase;message:string}>(),[busy,setBusy]=useState(false);
  const [hasLocalLicense,setHasLocalLicense]=useState(false);
  useEffect(()=>{
    try{
      if(typeof localStorage!=='undefined'&&(localStorage.getItem('sakunota_license_key')||localStorage.getItem('sakunota_activation_token'))){
        setHasLocalLicense(true);
      }
    }catch{}
  },[]);
  const openStandalone=()=>{
    try{localStorage.removeItem('sakunota_pos_partition');}catch{}
    window.location.reload();
  };
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
        if(!stopped){setFailed(false);setFailure(undefined);setPending(remaining);if(runtime.scope?.claims.role==='cashier'&&runtime.scope.claims.storeId)void syncPendingAttendancePhotos(runtime.client,runtime.scope.claims.storeId,runtime.scope.claims.employeeId).catch(()=>{});}
        return {changed:before!==after,pending:remaining>0};
      }catch(e){
        if(!stopped){setFailed(true);const phase=e instanceof PosSyncFailure?e.phase:'pull';setFailure({phase,message:syncFailureMessage(e,phase)});setPending(await db.table('posOutbox').count());if((e as {status?:number}).status===401||(e as {status?:number}).status===403){setReady(false);await rejectRuntimeAccess(runtime,e);setRuntime({...runtime});setError(e instanceof Error?e.message:'Silakan masuk lagi.');setReady(!!runtime.employees);}}
        throw e;
      }finally{if(!stopped)setBusy(false);}
    };
    const loop=new SyncScheduler({sync:update,online:()=>navigator.onLine,visible:()=>document.visibilityState==='visible',mode:()=>location.pathname==='/admin/dapur'||location.pathname==='/pos'?'kitchen':runtime.scope?.claims.role==='owner'?'owner':'cashier'});
    scheduler.current=loop;retry.current=async()=>{loop.wake();};
    const subscription=watchPosCommits(db,(pending,changed)=>{hasPending=pending;if(changed)loop.localChange();});
    const connectivity=()=>{setOnline(navigator.onLine);if(navigator.onLine&&hasPending)loop.localChange();else loop.wake();};
    const visibility=()=>loop.visibilityChanged(),activity=()=>loop.activity();
    setOnline(navigator.onLine);loop.start();
    window.addEventListener('online',connectivity);window.addEventListener('offline',connectivity);
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',activity);
    return()=>{stopped=true;subscription.unsubscribe();loop.stop();if(scheduler.current===loop)scheduler.current=null;window.removeEventListener('online',connectivity);window.removeEventListener('offline',connectivity);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
  },[enabled,runtime]);
  const changeEmployee=()=>{void leaveEmployee().then(()=>setRuntime(prev=>prev?{...prev,scope:undefined}:undefined));};
  useEffect(()=>{const onEvt=()=>changeEmployee();window.addEventListener('sakunota:change-employee',onEvt);return()=>window.removeEventListener('sakunota:change-employee',onEvt);},[]);
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')return <>{children}</>;
  if(!workspace||!posPartition())return <>{children}</>;
  if(!enabled||!ready)return <main className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center p-6">{error?<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="mb-4 flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div><div className="min-w-0 flex-1"><h2 className="font-semibold text-slate-900">Akses Kasir Terhubung</h2><p role="alert" className="mt-0.5 text-sm text-slate-600 leading-relaxed">{error}</p></div></div>{hasLocalLicense&&<div className="mb-5 rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-900 leading-relaxed"><span className="font-semibold block mb-0.5">Lisensi Toko Terdeteksi</span>Perangkat ini memiliki lisensi toko aktif di penyimpanan lokal. Anda dapat membuka kasir utama langsung menggunakan lisensi toko Anda.</div>}<div className="flex flex-col gap-2.5">{hasLocalLicense?<><button type="button" className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition" onClick={openStandalone}>Buka Kasir dengan Lisensi Toko</button><button type="button" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" onClick={()=>void initialize()}>Coba Hubungkan Lagi</button></>:<><button type="button" className="min-h-11 w-full rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-[0.99] transition" onClick={()=>void initialize()}>Coba Lagi</button><button type="button" className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 transition" onClick={openStandalone}>Buka Kasir Standalone</button></>}<a href="/hubungkan-perangkat" className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-600 hover:bg-slate-100 transition">Hubungkan Ulang Perangkat</a></div></div>:<LoadingState label="Memuat data kasir"/>}</main>;
  if(runtime?.employees&&!runtime.scope)return <main className="flex min-h-dvh items-center justify-center p-4"><EmployeeLogin sessions={runtime.employees} onSuccess={async session=>{const next=await enterEmployee(session);setRuntime({...next});}}/></main>;
  if(runtime?.scope?.claims.role==='cashier'&&typeof location!=='undefined'&&location.pathname!=='/pos'){location.replace('/pos');return null;}
  const cashierPage=typeof location!=='undefined'&&location.pathname==='/pos';
  const pendingCount=review?.pending??pending;
  const showStatus=failed||!online||pendingCount>0||!!review?.stock||!!review?.recovery;

  const notice=<>{showStatus&&<aside aria-label="Status data kasir" className="mb-5 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
    <div className="min-w-0 space-y-1"><StoreDataStatus pending={pendingCount} online={online} failed={failed} failurePhase={failure?.phase} needsReview={review?.stock}/>
      {pendingCount>0&&<p className="text-xs">Data tetap tersimpan di perangkat ini.</p>}
      {review?.recovery&&<p role="status" className="text-sm">Transaksi kasir sebelumnya perlu dipulihkan oleh pemilik.</p>}
      {online&&(failure?.message||review?.reason)&&<details className="text-xs"><summary className="min-h-8 cursor-pointer py-1 font-semibold">Lihat kendala</summary><p className="max-w-xl break-words py-1">{failure?.message||review?.reason}</p></details>}
    </div>
    <div className="flex flex-wrap gap-2">{online&&(failed||pendingCount>0)&&<button disabled={busy} className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 font-semibold disabled:opacity-50" onClick={()=>void retry.current()}>{busy?'Mencoba…':'Coba Lagi'}</button>}
      {pendingCount>0&&<button className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 font-semibold" onClick={()=>void backup()}>Simpan Cadangan</button>}
      {runtime?.employees&&<button className="min-h-11 rounded-xl border border-amber-300 bg-white px-3 font-semibold" onClick={changeEmployee}>Ganti Karyawan</button>}
    </div></aside>}{error&&<p role="alert" className="px-4 py-2 text-sm text-red-700">{error}</p>}</>;
  return <StoreSyncProvider value={notice}><div style={cashierPage?{height:'100dvh',display:'flex',flexDirection:'column',overflow:'hidden'}:undefined}>{cashierPage&&notice}<div style={cashierPage?{flex:1,minHeight:0,overflow:'auto'}:undefined}>{children}</div></div></StoreSyncProvider>;
}
