'use client';
import React,{useEffect,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/dexie';
import {saveOperation} from '@/lib/operationsApi';
import {supportsKitchen,kitchenStages,kitchenLabels,kitchenSignature,type KitchenStage,type OperationRecord} from '@/lib/operations';
import {getPosScope} from '@/lib/multidevice/posWire';
import {useAdmin} from '../AdminContext';
import {Tabs,PageHeading,OperationIcon,primary,secondary,date} from '@/components/operations/Shared';
import LoadingState,{BusyLabel} from '@/components/LoadingState';

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
  if(!supportsKitchen(storeSettings.businessType))return <main className="p-6 text-fg"><h1 className="text-2xl font-bold">Pesanan Dapur</h1><p className="mt-4 text-sm text-muted">Tersedia untuk usaha makanan dan minuman.</p></main>;
  const lines=data?.orders.flatMap(order=>data.items.filter(i=>i.orderId===order.id&&(station==='all'||(i.kategoriMenu||'Lainnya')===station)).map(item=>{
    const previous=data.records.filter(r=>r.kind==='kitchen'&&r.orderItemId===item.id).at(-1);
    const changed=!!previous&&previous.lineSignature!==kitchenSignature(item);
    const stage:KitchenStage=changed?'waiting':previous?.stage||'waiting';
    return {order,item,previous,changed,stage};
  })).filter(row=>showServed||row.stage!=='served')||[];
  const stageStyles:Record<KitchenStage,React.CSSProperties>={
    waiting:{'--stage-color':'#b45309','--stage-wash':'rgb(245 158 11 / 10%)'} as React.CSSProperties,
    preparing:{'--stage-color':'#2563eb','--stage-wash':'rgb(37 99 235 / 8%)'} as React.CSSProperties,
    ready:{'--stage-color':'#047857','--stage-wash':'rgb(16 185 129 / 9%)'} as React.CSSProperties,
    served:{'--stage-color':'#64748b','--stage-wash':'rgb(100 116 139 / 7%)'} as React.CSSProperties,
  };
  return <main className="sn-operations mx-auto max-w-7xl space-y-5 text-fg sm:space-y-6">
    <PageHeading title="Pesanan Dapur" icon="food">
      <button type="button" className={secondary} aria-pressed={showServed} onClick={()=>setShowServed(!showServed)}>{showServed?'Sembunyikan Selesai':'Lihat Selesai'}</button>
    </PageHeading>
    {data&&<div className="sn-kitchen-summary" aria-label="Ringkasan antrean">
      {(['waiting','preparing','ready'] as const).map(stage=><div className="sn-queue-count" style={stageStyles[stage]} key={stage}><p>{kitchenLabels[stage]}</p><strong>{lines.filter(line=>line.stage===stage).length}</strong></div>)}
    </div>}
    <Tabs value={station} onChange={setStation} items={[{id:'all',label:'Semua'},...categories.map(c=>({id:c,label:c}))]}/>
    {error&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {!data?<LoadingState label="Menyiapkan pesanan dapur"/>:!lines.length?
      <section className="sn-kitchen-empty"><span><OperationIcon name="food" className="h-7 w-7"/></span><h2 className="text-lg font-bold">Antrean sudah selesai</h2><p className="text-sm text-muted">Belum ada pesanan yang perlu disiapkan.</p></section>:
      <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">{lines.map(({order,item,previous,stage,changed})=>{
        const next=kitchenStages[kitchenStages.indexOf(stage)+1],elapsed=Math.max(0,Math.floor((now-Date.parse(order.createdAt))/60000));
        const destination=order.tableId?data.tables.find(t=>t.id===order.tableId)?.nomor||`Meja ${order.tableId}`:order.orderType?.toLowerCase()==='takeaway'?'Bawa Pulang':order.customerName||'Pesanan Kasir';
        return <article key={item.id} className="sn-kitchen-ticket flex flex-col" style={stageStyles[stage]}>
          <header className="sn-ticket-top">
            <div className="mb-4 flex items-center justify-between gap-3"><span className="sn-stage-pill"><span className="sn-stage-dot"/>{kitchenLabels[stage]}</span><span className="sn-ticket-time"><OperationIcon name="clock" className="h-4 w-4"/>{elapsed} mnt</span></div>
            <div className="flex items-end justify-between gap-3"><div className="min-w-0"><h2 className="break-words text-lg font-bold tracking-tight">{destination}</h2>{order.tableId&&order.customerName&&<p className="mt-1 text-xs text-muted">{order.customerName}</p>}<p className="mt-1 text-xs text-muted">{date(order.createdAt)}</p></div><span className="shrink-0 text-sm font-semibold tabular-nums text-muted">#{String(order.id).padStart(3,'0')}</span></div>
          </header>
          <div className="sn-ticket-body">
            <div className="flex items-start gap-3"><span className="sn-ticket-qty">{item.qty}</span><div className="min-w-0 pt-1"><h3 className="break-words text-lg font-bold leading-snug tracking-tight">{item.namaMenu}</h3>{item.selectedModifiers?.map((m:any,index:number)=><p className="mt-1.5 text-sm text-muted" key={index}>{m.optionName}</p>)}</div></div>
            {order.notes&&<p className="sn-ticket-note">{order.notes}</p>}
            {changed&&<p className="rounded-lg bg-amber-50 p-3 text-sm font-medium text-amber-800">Pesanan berubah. Periksa kembali.</p>}
            <div className="sn-ticket-progress" aria-hidden="true">{kitchenStages.map((step,index)=><span key={step} data-complete={index<=kitchenStages.indexOf(stage)}/>)}</div>
            <div className="flex items-center justify-between gap-3"><span className="text-xs text-muted">{item.kategoriMenu||'Lainnya'}</span><span className="sn-payment-state" data-paid={order.status==='paid'}>{order.status==='paid'&&<OperationIcon name="check" className="h-3.5 w-3.5"/>}{order.status==='paid'?'Lunas':'Belum Lunas'}</span></div>
            {next&&<button type="button" className={`${primary} w-full`} disabled={busy!==null} onClick={()=>{
              setBusy(item.id);setError('');
              void saveOperation({kind:'kitchen',employeeId:scope?.claims.deviceId||'local:owner',employeeName:'Pemilik',orderId:order.id,orderItemId:item.id,stage:next,previousId:previous?.mdId||previous?.sessionId,lineSignature:kitchenSignature(item)})
                .catch(e=>setError(e instanceof Error?e.message:'Status belum tersimpan')).finally(()=>setBusy(null));
            }}>{busy===item.id?<BusyLabel>Menyimpan</BusyLabel>:<>{next==='preparing'?'Mulai Siapkan':next==='ready'?'Tandai Siap':'Sudah Disajikan'}<OperationIcon name="arrow" className="h-4 w-4"/></>}</button>}
          </div>
        </article>;
      })}</div>}
  </main>;
}
