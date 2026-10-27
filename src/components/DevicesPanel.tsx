"use client";
import React,{useEffect,useRef,useState} from 'react';
import QRCode from 'qrcode';
import type {DeviceClient,AccessList} from '@/lib/multidevice/client';
import DeviceRecovery from './DeviceRecovery';

const button='min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50';
const secondary='min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-fg disabled:opacity-50';
const input='min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-fg';
export default function DevicesPanel({client}:{client:DeviceClient}){
  const [list,setList]=useState<AccessList|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const [pair,setPair]=useState<{image:string;expiresAt:number}|null>(null),[now,setNow]=useState(Date.now());
  const [editing,setEditing]=useState<{id:string;name:string;pin:string;active:boolean}|null>(null);
  const mounted=useRef(true),loading=useRef(false);
  const refresh=async()=>{
    if(loading.current)return;loading.current=true;
    try{const next=await client.list();if(mounted.current){setList(next);setError('');}}
    catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Data belum dapat diperbarui.');}
    finally{loading.current=false;}
  };
  useEffect(()=>{
    mounted.current=true;void refresh();const interval=setInterval(()=>{setNow(Date.now());void refresh();},5000);
    return()=>{mounted.current=false;clearInterval(interval);};
  // The client instance is stable for the enrolled owner session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[client]);
  const perform=async(work:()=>Promise<unknown>)=>{
    setBusy(true);setError('');try{await work();await refresh();}catch(e){setError(e instanceof Error?e.message:'Perubahan belum tersimpan.');}finally{setBusy(false);}
  };
  return <div className="mx-auto w-full max-w-3xl space-y-5 text-fg">
    <h1 className="text-2xl font-bold tracking-tight">Perangkat &amp; Karyawan</h1>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!list?<p role="status" className="py-6 text-sm text-muted">Memuat perangkat…</p>:<>
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Perangkat</h2><span className="text-sm tabular-nums text-muted">{list.devices?.length||0} / 2</span></div>
        <ul className="divide-y divide-line">{list.devices?.map(device=><li key={device.id} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0">
          <div className="min-w-0"><h3 className="break-words font-semibold">{device.name}</h3><p className="mt-1 text-sm text-muted">{device.role==='owner'?'Akses penuh':'Kasir'}</p></div>
          <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-blue-700">{device.role==='owner'?'Aktif':'Terhubung'}</span>{device.role==='cashier'&&<button type="button" className={secondary} disabled={busy} onClick={()=>void perform(()=>client.call('device.revoke',{id:device.id}))}>Lepas Perangkat</button>}</div>
        </li>)}</ul>
        {(list.devices?.length||0)<2&&<button type="button" className={button} disabled={busy} onClick={()=>void perform(async()=>{
          const result=await client.call<{code:string;expiresAt:number}>('pair.create');
          const url=new URL('/hubungkan-perangkat',location.origin);url.hash=new URLSearchParams({code:result.code}).toString();
          const image=await QRCode.toDataURL(url.toString(),{width:240,margin:4,errorCorrectionLevel:'M'});setPair({image,expiresAt:result.expiresAt});
        })}>Tambah Perangkat</button>}
        {pair&&pair.expiresAt>now&&(list.devices?.length||0)<2&&<div className="mt-4 flex flex-col items-center rounded-xl border border-line p-3">
          {/* Local generated image: no QR contents are sent to an image service. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pair.image} alt="Hubungkan perangkat kasir" width={240} height={240} className="h-auto max-w-full"/>
          <p className="text-sm text-muted">Berlaku sampai {new Date(pair.expiresAt).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</p>
        </div>}
        {list.pairings?.map(request=><div key={request.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"><span className="break-words font-medium">{request.candidateName}</span><button type="button" className={button} disabled={busy} onClick={()=>void perform(async()=>{await client.call('pair.approve',{id:request.id});setPair(null);})}>Setujui Perangkat</button></div>)}
      </section>
      <section className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-bold">Karyawan</h2><button type="button" className={secondary} disabled={busy} onClick={()=>setEditing({id:crypto.randomUUID(),name:'',pin:'',active:true})}>Tambah Karyawan</button></div>
        {!list.employees.some(employee=>employee.active)&&<p role="status" className="mb-3 text-sm text-muted">Tambahkan karyawan aktif beserta PIN agar perangkat Kasir bisa masuk.</p>}
        <ul className="divide-y divide-line">{list.employees.map(employee=><li key={employee.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
          <div className="min-w-0"><h3 className="break-words font-semibold">{employee.name}</h3><p className="mt-1 text-sm text-muted">{employee.active?'Aktif':'Nonaktif'}</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} className={secondary} onClick={()=>setEditing({...employee,active:!!employee.active,pin:''})}>Ubah PIN</button><button type="button" disabled={busy} className={secondary} onClick={()=>void perform(()=>client.call('employee.save',{id:employee.id,name:employee.name,active:!employee.active}))}>{employee.active?'Nonaktifkan':'Aktifkan'}</button></div>
        </li>)}</ul>
        {editing&&<form className="mt-4 space-y-3 rounded-xl border border-line p-4" onSubmit={event=>{event.preventDefault();void perform(async()=>{await client.call('employee.save',{...editing,pin:editing.pin||undefined});setEditing(null);});}}>
          <label className="block text-sm font-medium">Nama<input className={`${input} mt-1`} value={editing.name} maxLength={100} required autoComplete="off" onChange={e=>setEditing({...editing,name:e.target.value})}/></label>
          <label className="block text-sm font-medium">PIN<input className={`${input} mt-1`} type="password" inputMode="numeric" pattern="[0-9]{6,12}" minLength={6} maxLength={12} autoComplete="new-password" required value={editing.pin} onChange={e=>setEditing({...editing,pin:e.target.value.replace(/\D/g,'')})}/></label>
          <div className="flex gap-2"><button type="submit" disabled={busy} className={button}>Simpan</button><button type="button" disabled={busy} className={secondary} onClick={()=>setEditing(null)}>Batal</button></div>
        </form>}
      </section>
      <DeviceRecovery client={client}/>
    </>}
  </div>;
}
