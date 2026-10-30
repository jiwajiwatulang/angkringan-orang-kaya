'use client';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/dexie';
import {kitchenItemStage,kitchenLabels,kitchenStages,supportsKitchen,type OperationRecord} from '@/lib/operations';

export default function KitchenOrderStatus({orderId,businessType}:{orderId?:number;businessType?:string}){
  const progress=useLiveQuery(async()=>{
    if(!orderId||!supportsKitchen(businessType))return null;
    const order=await db.table('orders').get(orderId);
    if(!order||order.status==='void'||order.isHistorical)return null;
    const [items,records]=await Promise.all([db.table('orderItems').where('orderId').equals(orderId).toArray(),db.table('operations').where('orderId').equals(orderId).toArray()]);
    const active=items.filter(item=>!item.mdDeleted);
    if(!active.length)return null;
    const stages=active.map(item=>kitchenItemStage(item,records as OperationRecord[]));
    const present=kitchenStages.filter(stage=>stages.includes(stage));
    return {ready:stages.every(stage=>stage==='ready'||stage==='served'),label:present.length===1?kitchenLabels[present[0]]:present.map(stage=>`${stages.filter(value=>value===stage).length} ${kitchenLabels[stage]}`).join(' · ')};
  },[orderId,businessType]);
  if(!progress)return null;
  return <p role="status" className={`rounded-lg border px-3 py-2 text-xs font-semibold ${progress.ready?'border-emerald-200 bg-emerald-50 text-emerald-800':'border-line bg-surface text-muted'}`}>Dapur: {progress.label}</p>;
}
