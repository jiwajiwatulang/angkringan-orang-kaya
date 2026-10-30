"use client";
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {requestPairingClient} from '@/lib/multidevice/client';
import {PAIRING_MS} from '@/lib/multidevice/protocol';
import {pairingCode,readPairingIntent,PAIRING_INTENT_KEY} from '@/lib/multidevice/pairingIntent';
import {OperationIcon,primary,secondary,field} from '@/components/operations/Shared';
import BarcodeCameraModal from '@/components/BarcodeCameraModal';
import {BusyLabel} from '@/components/LoadingState';

export default function PairDevicePage(){
  const [code,setCode]=useState(''),[name,setName]=useState(''),[waiting,setWaiting]=useState(false),[done,setDone]=useState(false),[error,setError]=useState('');
  const [input,setInput]=useState(''),[camera,setCamera]=useState(false),[expiresAt,setExpiresAt]=useState(0),[ready,setReady]=useState(false);
  useEffect(()=>{
    const incoming=new URLSearchParams(location.hash.slice(1)).get('code')||'';
    let saved=null;try{saved=readPairingIntent(sessionStorage.getItem(PAIRING_INTENT_KEY));}catch{}
    if(/^[\w-]{43}$/.test(incoming)){setCode(incoming);setExpiresAt(Date.now()+PAIRING_MS);}
    else if(saved){setCode(saved.code);setName(saved.name);setWaiting(saved.waiting);setExpiresAt(saved.expiresAt);}
    if(location.hash)history.replaceState(null,'',location.pathname);
    setReady(true);
  },[]);
  useEffect(()=>{
    if(!ready)return;
    try{if(code&&!done)sessionStorage.setItem(PAIRING_INTENT_KEY,JSON.stringify({code,name,waiting,expiresAt}));else sessionStorage.removeItem(PAIRING_INTENT_KEY);}catch{}
  },[code,name,waiting,expiresAt,done,ready]);
  useEffect(()=>{
    if(!waiting||done)return;let cancelled=false,timer:ReturnType<typeof setTimeout>;
    const poll=async()=>{
      try{const result=await requestPairingClient(code,name);if(cancelled)return;if(!result.pending){setDone(true);setWaiting(false);}else timer=setTimeout(()=>void poll(),5000);}
      catch(e){if(!cancelled){setWaiting(false);const status=(e as {status?:number}).status;if(status===410||status===409){setCode('');setInput('');setError('Kode sudah tidak berlaku. Minta kode baru dari Pemilik.');}else setError(e instanceof Error?e.message:'Perangkat belum terhubung. Coba lagi.');}}
    };
    void poll();return()=>{cancelled=true;clearTimeout(timer);};
  },[waiting,done,code,name]);
  const accept=(value:string)=>{
    const parsed=pairingCode(value,location.origin);
    if(!parsed){setError('Tautan penghubung tidak sesuai. Salin dari perangkat Pemilik.');return;}
    setCode(parsed);setExpiresAt(Date.now()+PAIRING_MS);setError('');setInput('');setCamera(false);
  };
  const step=done?3:waiting?2:code?1:0;
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')return <main className="p-6 text-sm">Halaman tidak tersedia.</main>;
  return <main className="sn-operations flex min-h-dvh items-center justify-center bg-app p-4 text-fg"><section className="sn-card w-full max-w-md space-y-6 rounded-3xl border border-line bg-surface p-5 sm:p-8">
    <div className="flex items-center gap-3"><span className="sn-heading-icon"><OperationIcon name={done?'check':'devices'} className="h-6 w-6"/></span><h1 className="text-2xl font-bold tracking-tight">{done?'Perangkat Terhubung':'Hubungkan Perangkat'}</h1></div>
    <ol className="grid grid-cols-3 gap-2" aria-label="Langkah menghubungkan perangkat">{['Pindai QR','Nama Perangkat','Persetujuan'].map((label,index)=><li key={label} aria-current={step===index?'step':undefined} className="space-y-2"><div className={`h-1 rounded-full ${step>=index?'bg-blue-600':'bg-line'}`}/><span className={`text-xs font-semibold ${step>=index?'text-blue-700':'text-muted'}`}>{index+1}. {label}</span></li>)}</ol>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!ready?<BusyLabel>Menyiapkan</BusyLabel>:done?<div className="space-y-4"><p role="status" className="font-semibold text-blue-700">Disetujui Pemilik</p><Link className={`${primary} w-full`} href="/pos">Masuk Kasir</Link></div>:waiting?<div className="space-y-5"><div className="rounded-2xl bg-blue-50 p-5"><p role="status" className="font-semibold text-blue-900"><BusyLabel>Menunggu persetujuan Pemilik</BusyLabel></p><p className="mt-3 text-sm leading-relaxed text-blue-900">Di perangkat Pemilik, buka Karyawan &amp; Shift → Perangkat Kasir lalu pilih <strong>Setujui Perangkat</strong> untuk {name}.</p></div><p className="text-sm text-muted">Setelah disetujui, halaman kasir terbuka otomatis.</p><button type="button" className={`${secondary} w-full`} onClick={()=>{setWaiting(false);setError('');}}>Kembali</button></div>:!code?<div className="space-y-4">
      <div className="rounded-2xl border border-line bg-app p-4"><h2 className="text-sm font-bold">Siapkan kode di perangkat Pemilik</h2><p className="mt-2 text-sm leading-relaxed text-muted">Admin → Karyawan &amp; Shift → Perangkat Kasir → <strong>Tampilkan QR Kasir</strong>.</p></div>
      <button type="button" className={`${primary} w-full`} onClick={()=>{setError('');setCamera(true);}}>Pindai QR Pemilik</button>
      <form className="space-y-3" onSubmit={e=>{e.preventDefault();accept(input);}}><label className="block text-sm font-medium">Atau tempel tautan penghubung<input className={field} type="text" inputMode="url" autoComplete="off" spellCheck={false} value={input} onChange={e=>setInput(e.target.value)} placeholder="Tautan dari perangkat Pemilik" required/></label><button className={`${secondary} w-full`} disabled={!input.trim()}>Gunakan Tautan</button></form>
      <p className="text-xs leading-relaxed text-muted">Kamu juga bisa memindai QR dengan kamera HP, lalu membuka tautannya.</p>
    </div>:<form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!name.trim())return;if(Date.now()>=expiresAt){setCode('');setError('Kode sudah kedaluwarsa. Minta kode baru dari Pemilik.');return;}setName(name.trim());setError('');setWaiting(true);}}>
      <p className="flex items-center gap-2 rounded-xl bg-blue-50 p-3 text-sm font-semibold text-blue-800"><OperationIcon name="check"/>Kode penghubung diterima</p>
      <label className="block text-sm font-medium">Nama Perangkat<input className={field} value={name} onChange={e=>setName(e.target.value)} maxLength={100} required autoComplete="off" placeholder="Contoh: Kasir Depan"/></label>
      <button className={`${primary} w-full`}>Minta Persetujuan Pemilik</button>
      <button type="button" className={`${secondary} w-full`} onClick={()=>{setCode('');setError('');}}>Gunakan Kode Lain</button>
    </form>}
    {!waiting&&!done&&<div className="border-t border-line pt-4 text-center"><Link className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-700" href="/pos">Sudah terhubung? Masuk Kasir</Link></div>}
    <BarcodeCameraModal isOpen={camera} onClose={()=>setCamera(false)} onScan={accept} title="Pindai QR Pemilik" purpose="pairing"/>
  </section></main>;
}
