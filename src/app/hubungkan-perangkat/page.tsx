"use client";
import React,{useEffect,useState} from 'react';
import {requestPairingClient} from '@/lib/multidevice/client';

export default function PairDevicePage(){
  const [code,setCode]=useState(''),[name,setName]=useState(''),[waiting,setWaiting]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    const value=new URLSearchParams(location.hash.slice(1)).get('code')||'';
    history.replaceState(null,'',location.pathname);setCode(value);
  },[]);
  useEffect(()=>{
    if(!waiting||done)return;let cancelled=false,timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{try{const result=await requestPairingClient(code,name);if(cancelled)return;if(!result.pending){setDone(true);setWaiting(false);}else timer=setTimeout(()=>void poll(),5000);}catch(e){if(!cancelled){setWaiting(false);setError(e instanceof Error?e.message:'Perangkat belum terhubung.');}}};
    void poll();return()=>{cancelled=true;clearTimeout(timer);};
  },[waiting,done,code,name]);
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')return <main className="p-6 text-sm">Halaman tidak tersedia.</main>;
  return <main className="flex min-h-dvh items-center justify-center bg-slate-50 p-4 text-slate-900"><div className="w-full max-w-sm space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h1 className="text-xl font-bold">{done?'Perangkat Terhubung':'Hubungkan Perangkat'}</h1>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    {done?<p role="status" className="text-sm text-blue-700">Disetujui Pemilik</p>:waiting?<p role="status" className="text-sm text-slate-600">Menunggu Persetujuan</p>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();setError('');if(!/^[\w-]{43}$/.test(code)){setError('Pindai kode penghubung dari perangkat pemilik.');return;}setWaiting(true);}}>
      <label className="block text-sm font-medium">Nama Perangkat<input value={name} onChange={e=>setName(e.target.value)} maxLength={100} required autoComplete="off" className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 px-3 py-2.5"/></label>
      <button type="submit" className="min-h-11 w-full rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white">Hubungkan</button>
    </form>}
  </div></main>;
}
