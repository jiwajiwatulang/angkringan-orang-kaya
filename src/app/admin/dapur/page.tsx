'use client';
import React,{useEffect,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/dexie';
import {saveOperation} from '@/lib/operationsApi';
import {kitchenStages,kitchenLabels,kitchenSignature,type KitchenStage,type OperationRecord} from '@/lib/operations';
import {getPosScope} from '@/lib/multidevice/posWire';
import {useAdmin} from '../AdminContext';
import {Tabs,primary,secondary,date} from '@/components/operations/Shared';
import LoadingState from '@/components/LoadingState';

export default function Kitchen(){
  const {storeSettings}=useAdmin();
  const [station,setStation]=useState('all'),[showServed,setShowServed]=useState(false),[busy,setBusy]=useState<number|null>(null),[error,setError]=useState(''),[now,setNow]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
  const data=useLiveQuery(async()=>{
    const [orders,items,records,tables]=await Promise.all(['orders','orderItems','operations','tables'].map(t=>db.table(t).toArray()));
    const midnight=new Date();midnight.setHours(0,0,0,0);
    return {orders:orders.filter(o=>o.status!=='void'&&!o.isHistorical&&(o.status==='unpaid'||new Date(o.createdAt)>=midnight)),items,records:records as OperationRecord[],tables};
  },[]);
  const categories=[...new Set(data?.items.map(i=>i.kategoriMenu||'Lainnya')||[])];
  const scope=getPosScope();
  if(storeSettings.businessType==='retail')return <main className="p-6 text-fg"><h1 className="text-2xl font-bold">Pesanan Dapur</h1><p className="mt-4 text-sm text-muted">Tersedia untuk usaha makanan dan minuman.</p></main>;
  const lines=data?.orders.flatMap(order=>data.items.filter(i=>i.orderId===order.id&&(station==='all'||(i.kategoriMenu||'Lainnya')===station)).map(item=>{
    const previous=data.records.filter(r=>r.kind==='kitchen'&&r.orderItemId===item.id).at(-1);
    const changed=!!previous&&previous.lineSignature!==kitchenSignature(item);
    const stage:KitchenStage=changed?'waiting':previous?.stage||'waiting';
    return {order,item,previous,changed,stage};
  })).filter(row=>showServed||row.stage!=='served')||[];
  return <main className="mx-auto max-w-7xl space-y-5 p-4 text-fg sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Pesanan Dapur</h1><button className={secondary} onClick={()=>setShowServed(!showServed)}>{showServed?'Sembunyikan Selesai':'Lihat Selesai'}</button></div>
    <Tabs value={station} onChange={setStation} items={[{id:'all',label:'Semua'},...categories.map(c=>({id:c,label:c}))]}/>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!data?<LoadingState label="Menyiapkan pesanan dapur"/>:!lines.length?<p className="rounded-2xl border border-line bg-surface p-6 text-sm text-muted">Belum ada pesanan yang perlu disiapkan.</p>:<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{lines.map(({order,item,previous,stage,changed})=>{
      const next=kitchenStages[kitchenStages.indexOf(stage)+1];
      return <article key={item.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{order.tableId?data.tables.find(t=>t.id===order.tableId)?.nomor||`Meja ${order.tableId}`:order.customerName||'Bawa Pulang'}</h2><p className="mt-1 text-xs text-muted">Nota #{order.id} · {date(order.createdAt)}</p></div><span className="text-sm font-semibold tabular-nums">{Math.max(0,Math.floor((now-Date.parse(order.createdAt))/60000))} mnt</span></div><div className="flex-1"><p className="text-lg font-bold">{item.qty} × {item.namaMenu}</p>{item.selectedModifiers?.map((m:any,index:number)=><p className="mt-1 text-sm text-muted" key={index}>{m.optionName}</p>)}{order.notes&&<p className="mt-3 rounded-lg bg-app p-2 text-sm">{order.notes}</p>}</div><div className="flex flex-wrap justify-between gap-2 text-sm"><strong className="text-blue-700">{kitchenLabels[stage]}</strong><span className="text-muted">{order.status==='paid'?'Lunas':'Belum Lunas'}</span></div>{changed&&<p className="text-sm text-amber-800">Pesanan berubah. Periksa kembali.</p>}{next&&<button className={primary} disabled={busy!==null} onClick={()=>{setBusy(item.id);setError('');void saveOperation({kind:'kitchen',employeeId:scope?.claims.deviceId||'local:owner',employeeName:'Pemilik',orderId:order.id,orderItemId:item.id,stage:next,previousId:previous?.mdId||previous?.sessionId,lineSignature:kitchenSignature(item)}).catch(e=>setError(e instanceof Error?e.message:'Status belum tersimpan')).finally(()=>setBusy(null));}}>{next==='preparing'?'Mulai Siapkan':next==='ready'?'Tandai Siap':'Sudah Disajikan'}</button>}</article>;
    })}</div>}
  </main>;
}
