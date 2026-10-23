"use client";
import React,{useEffect,useState} from 'react';
import type {EmployeeSessions} from '@/lib/multidevice/employeeSession';

export default function EmployeeLogin({sessions,onSuccess}:{sessions:EmployeeSessions;onSuccess:(session:Awaited<ReturnType<EmployeeSessions['login']>>)=>Promise<void>}){
  const [employees,setEmployees]=useState<{id:string;name:string;active:number}[]>([]),[selected,setSelected]=useState(''),[pin,setPin]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
  useEffect(()=>{
    let cancelled=false;
    const load=async()=>{try{const rows=await sessions.employees(navigator.onLine);if(!cancelled){setEmployees(rows);setLoaded(true);setError('');}}catch(e){if(!cancelled){setLoaded(true);setError(e instanceof Error?e.message:'Nama karyawan belum dapat dimuat.');}}};
    void load();window.addEventListener('online',load);window.addEventListener('offline',load);
    return()=>{cancelled=true;window.removeEventListener('online',load);window.removeEventListener('offline',load);};
  },[sessions]);
  return <section className="mx-auto w-full max-w-sm space-y-5 rounded-2xl border border-line bg-surface p-5 text-fg">
    <h1 className="text-xl font-bold">Masuk Kasir</h1>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loaded?<p role="status" className="text-sm text-muted">Memuat nama…</p>:<form className="space-y-4" onSubmit={event=>{event.preventDefault();setBusy(true);setError('');const entered=pin;setPin('');void (async()=>{try{const session=await sessions.login(selected,entered,navigator.onLine);await onSuccess(session);}catch(e){await sessions.logout();setError(e instanceof Error?e.message:'Belum dapat masuk.');}finally{setBusy(false);}})();}}>
      <label className="block text-sm font-medium">Pilih Nama<select className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5" value={selected} required disabled={busy} onChange={e=>setSelected(e.target.value)}><option value="">Pilih Nama</option>{employees.filter(row=>row.active).map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      <label className="block text-sm font-medium">PIN<input className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5" type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6,12}" minLength={6} maxLength={12} value={pin} required disabled={busy} onChange={e=>setPin(e.target.value.replace(/\D/g,''))}/></label>
      <button type="submit" disabled={busy||!employees.length} className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy?'Memeriksa…':'Masuk'}</button>
    </form>}
  </section>;
}
