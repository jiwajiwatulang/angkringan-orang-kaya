"use client";
import React,{useEffect,useRef,useState} from 'react';
import type {EmployeeSessions} from '@/lib/multidevice/employeeSession';

export default function EmployeeLogin({sessions,onSuccess}:{sessions:EmployeeSessions;onSuccess:(session:Awaited<ReturnType<EmployeeSessions['login']>>)=>Promise<void>}){
  const [employees,setEmployees]=useState<{id:string;name:string;active:number}[]>([]),[selected,setSelected]=useState(''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
  const loading=useRef(false),[online,setOnline]=useState(true);
  const reload=useRef<()=>void>(()=>{});
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{
      if(loading.current)return;loading.current=true;
      const connected=navigator.onLine;setOnline(connected);
      try{const rows=(await sessions.employees(connected)).filter(row=>row.active);if(!cancelled){setEmployees(rows);setSelected(current=>rows.some(row=>row.id===current)?current:'');setLoaded(true);setError('');}}
      catch(e){if(!cancelled){setLoaded(true);setEmployees([]);setSelected('');setError(e instanceof Error?e.message:'Nama karyawan belum dapat dimuat.');}}
      finally{loading.current=false;}
    };
    reload.current=()=>void load();void load();
    const timer=setInterval(()=>{if(document.visibilityState==='visible')void load();},10000);
    window.addEventListener('online',load);window.addEventListener('offline',load);window.addEventListener('focus',load);
    return()=>{cancelled=true;clearInterval(timer);window.removeEventListener('online',load);window.removeEventListener('offline',load);window.removeEventListener('focus',load);};
  },[sessions]);
  return <section className="mx-auto w-full max-w-sm space-y-5 rounded-2xl border border-line bg-surface p-5 text-fg">
    <h1 className="text-xl font-bold">Masuk Kasir</h1>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loaded?<p role="status" className="text-sm text-muted">Memuat nama…</p>:employees.length===0?<div className="space-y-3">
      {!error&&<><p className="text-sm font-semibold">{online?'Belum ada karyawan aktif':'Belum ada akun yang bisa masuk tanpa internet'}</p><p className="text-sm text-muted">{online?'Tambahkan nama dan PIN melalui Perangkat & Karyawan di perangkat Pemilik.':'Sambungkan internet untuk masuk pertama kali.'}</p></>}
      <button type="button" className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold" onClick={()=>reload.current()}>Perbarui Daftar</button>
    </div>:<form className="space-y-4" onSubmit={event=>{event.preventDefault();setBusy(true);setError('');const entered=pin;setPin('');void (async()=>{try{const session=await sessions.login(selected,entered,navigator.onLine);await onSuccess(session);}catch(e){await sessions.logout();setError(e instanceof Error?e.message:'Belum dapat masuk.');}finally{setBusy(false);}})();}}>
      <label className="block text-sm font-medium">Pilih Nama<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5" value={selected} required disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">Pilih Nama</option>{employees.filter(row=>row.active).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label className="block text-sm font-medium">PIN (6–12 angka)<input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,12}" minLength={6} maxLength={12} value={pin} required disabled={busy} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/></label>
      <button type="submit" disabled={busy||!selected||pin.length<6} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy?'Memeriksa…':'Masuk'}</button>
    </form>}
  </section>;
}
