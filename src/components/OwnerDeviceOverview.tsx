'use client';
import React,{useEffect,useState} from 'react';
import LoadingState,{BusyLabel} from './LoadingState';

export interface OwnerDevicePage {enabled:boolean;items:{licenseKey:string;devices:{id:string;name:string;role:string;lastReceivedAt:number|null}[]}[];next:string|null}
export function OwnerDeviceRows({data}:{data:OwnerDevicePage}) {
  return <div className="divide-y divide-line">{data.items.length===0?<p className="py-4 text-sm text-muted">Belum ada toko yang menghubungkan dua perangkat.</p>:data.items.map(store=><div key={store.licenseKey} className="space-y-3 py-4">
    <div className="flex flex-wrap justify-between gap-2"><strong className="break-all text-sm">{store.licenseKey}</strong><span className="text-sm text-muted">{store.devices.length} / 2 perangkat</span></div>
    {store.devices.map(device=><div key={device.id} className="rounded-xl border border-line p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong className="break-words">{device.name}</strong><span>{device.role==='owner'?'Pemilik':'Kasir'}</span></div><p className="mt-1 text-muted">{device.lastReceivedAt?`Data diterima ${new Date(device.lastReceivedAt).toLocaleString('id-ID')}`:'Belum ada data diterima'}</p></div>)}
  </div>)}</div>;
}
export default function OwnerDeviceOverview({token}:{token:string}) {
  const [data,setData]=useState<OwnerDevicePage|null>(null),[after,setAfter]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[refresh,setRefresh]=useState(0);
  useEffect(()=>{const controller=new AbortController();setBusy(true);setError('');setData(null);
    const deadline=setTimeout(()=>{controller.abort();setBusy(false);setError('Koneksi belum tersedia. Coba lagi.');},8000);
    void fetch(`/api/owner/devices?after=${encodeURIComponent(after)}`,{headers:{Authorization:`Bearer ${token}`},cache:'no-store',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();return response.json() as Promise<OwnerDevicePage>;}).then(value=>{if(!controller.signal.aborted)setData(value);}).catch(()=>{if(!controller.signal.aborted)setError('Daftar perangkat belum dapat dimuat.');}).finally(()=>{clearTimeout(deadline);if(!controller.signal.aborted)setBusy(false);});
    return()=>{clearTimeout(deadline);controller.abort();};
  },[token,after,refresh]);
  if(data&&!data.enabled)return null;
  return <section className="rounded-2xl border border-line p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">Perangkat Toko</h3><button type="button" disabled={busy} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold disabled:opacity-50" onClick={()=>setRefresh(value=>value+1)}>{busy?<BusyLabel>Memperbarui</BusyLabel>:'Perbarui'}</button></div>
    {busy&&<div className="py-4"><LoadingState compact label="Memuat perangkat toko"/></div>}{error&&<p role="alert" className="py-4 text-sm text-red-600">{error}</p>}{data&&<OwnerDeviceRows data={data}/>}
    <div className="flex flex-wrap gap-3">{after&&<button className="min-h-11 px-3 text-sm text-blue-600" onClick={()=>setAfter('')}>Halaman Pertama</button>}{data?.next&&<button className="min-h-11 px-3 text-sm text-blue-600" onClick={()=>setAfter(data.next!)}>Berikutnya</button>}</div>
  </section>;
}
