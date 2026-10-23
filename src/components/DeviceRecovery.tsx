"use client";
import React,{useEffect,useState} from 'react';
import type {DeviceClient} from '@/lib/multidevice/client';
import {stageRecovery,resumeRecovery} from '@/lib/multidevice/recovery';
import {currentPosRuntime} from '@/lib/multidevice/posRuntime';

export default function DeviceRecovery({client}:{client:DeviceClient}){
  const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[failed,setFailed]=useState(false),[pending,setPending]=useState(false);
  const recoveryDb=async()=>currentPosRuntime()?.synchronizer.db||(await client.openReplica()).db;
  useEffect(()=>{let cancelled=false;void (async()=>{const db=await recoveryDb();if(!cancelled)setPending(!!(await db.table('settings').get('recoveryJob'))?.value);})().catch(()=>{});return()=>{cancelled=true;};},[client]);
  const perform=async(task:()=>Promise<void>)=>{setBusy(true);setFailed(false);setMessage('');try{await task();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:'Data belum dapat dipulihkan.');}finally{setBusy(false);}};
  const resume=async()=>{
    const db=await recoveryDb();
    await resumeRecovery(db,client.claims,event=>client.recover(event));
    const runtime=currentPosRuntime();if(runtime)await runtime.synchronizer.synchronize();else await (await client.openReplica()).synchronize(client);setPending(false);setMessage('Data berhasil dipulihkan.');
  };
  return <section className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
    <h2 className="text-lg font-bold text-fg">Pemulihan Data</h2>
    <div className="flex flex-wrap gap-3">
      <button type="button" disabled={busy} className="min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50" onClick={()=>void perform(async()=>{
        const runtime=currentPosRuntime(),data=runtime?await runtime.synchronizer.backup():await (await client.openReplica()).exportData();
        const url=URL.createObjectURL(new Blob([JSON.stringify(data)],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download=`sakunota-perangkat-${new Date().toISOString().slice(0,10)}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Cadangan disimpan.');
      })}>Simpan Cadangan</button>
      <label className={`relative inline-flex min-h-11 items-center rounded-xl border border-line px-4 py-2.5 text-sm font-semibold ${busy||pending?'opacity-50':'cursor-pointer'}`}>Pilih Cadangan<input aria-label="Pilih Cadangan" type="file" accept=".json,application/json" disabled={busy||pending} className="absolute inset-0 cursor-pointer opacity-0" onChange={event=>{
        const file=event.target.files?.[0];event.target.value='';if(!file)return;
        void perform(async()=>{
          if(file.size>100*1024*1024)throw new Error('Ukuran cadangan terlalu besar.');
          let data:unknown;try{data=JSON.parse(await file.text());}catch{throw new Error('Cadangan tidak valid.');}
          await stageRecovery(await recoveryDb(),client.claims,data);setPending(true);await resume();
        });
      }}/></label>
      {pending&&<button type="button" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>void perform(resume)}>Lanjutkan Pemulihan</button>}
    </div>
    <p className="text-sm text-muted">Cadangan menyimpan data yang belum terkirim. Simpan sebelum mengganti perangkat.</p>
    {message&&<p role={failed?'alert':'status'} className={`text-sm ${failed?'text-red-700':'text-blue-700'}`}>{message}</p>}
  </section>;
}
