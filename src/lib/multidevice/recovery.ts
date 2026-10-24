import type Dexie from 'dexie';
import {AccessError,assertId,integer,type AccessClaims,type StoreEvent} from './protocol';
import {POS_TABLES} from './posWire';
import type {OutboxRow} from './replica';

export interface RecoveryArchive {version:1;storeId:string;deviceId:string;outbox:OutboxRow[]}
export function validateArchive(value:unknown,storeId:string):RecoveryArchive {
  if(!value||typeof value!=='object')throw new AccessError('Cadangan tidak valid.',400);
  const data=value as Record<string,unknown>;
  if(data.version!==1||data.storeId!==storeId||!Array.isArray(data.outbox)||data.outbox.length>10000)throw new AccessError('Cadangan tidak sesuai toko ini.',400);
  assertId(data.deviceId);const seen=new Set<string>();let ordinal=0;
  const outbox=(data.outbox as OutboxRow[]).slice().sort((a,b)=>a.ordinal-b.ordinal).map(row=>{
    if(!row||!row.event||row.event.storeId!==storeId||row.event.deviceId!==data.deviceId||row.id!==row.event.id||!Number.isSafeInteger(row.ordinal)||row.ordinal<=ordinal||seen.has(row.id))throw new AccessError('Cadangan tidak valid.',400);
    assertId(row.id);assertId(row.event.entityId);assertId(row.event.operatorId);
    if(!row.event.data||typeof row.event.data!=='object'||Array.isArray(row.event.data)||new TextEncoder().encode(JSON.stringify(row.event)).length>8*1024*1024)throw new AccessError('Cadangan tidak valid.',400);
    if(!['catalog.put','settings.put','shift.open','shift.close','order.create','payment.record','refund.record','stock.adjust','pos.commit'].includes(row.event.kind))throw new AccessError('Cadangan tidak valid.',400);
    if(row.event.kind==='pos.commit'){
      const rows=row.event.data.rows;
      if(!Array.isArray(rows)||!rows.length||rows.length>600)throw new AccessError('Transaksi dalam cadangan tidak valid.',400);
      const rowsSeen=new Set<string>();
      for(const item of rows){
        if(!item||!POS_TABLES.includes(item.table)||!item.value||typeof item.value!=='object'||Array.isArray(item.value))throw new AccessError('Transaksi dalam cadangan tidak valid.',400);
        assertId(item.id);integer(item.expectedVersion);
        const key=`${item.table}:${item.id}`;
        if(rowsSeen.has(key)||item.value.mdId!==item.id||item.value.mdStoreId!==storeId||item.value.mdVersion!==item.expectedVersion+1)throw new AccessError('Transaksi dalam cadangan tidak valid.',400);
        rowsSeen.add(key);
      }
    }
    seen.add(row.id);ordinal=row.ordinal;return {id:row.id,ordinal:row.ordinal,attempts:0,event:row.event};
  });
  return {version:1,storeId,deviceId:data.deviceId,outbox};
}
export async function stageRecovery(db:Dexie,claims:AccessClaims,value:unknown){
  if(claims.role!=='owner'||claims.expiresAt<=Date.now())throw new AccessError();
  const archive=validateArchive(value,claims.storeId);
  await db.transaction('rw',db.table('settings'),async()=>{
    if((await db.table('settings').get('recoveryJob'))?.value)throw new AccessError('Selesaikan pemulihan sebelumnya.',409);
    // Business data only. Never import keys, access grants, employee verifiers or arbitrary settings.
    await db.table('settings').put({key:'recoveryJob',value:{id:crypto.randomUUID(),archive,index:0}});
  });
  return archive.outbox.length;
}
/** Retain the original archive locally before unblocking a replacement recovery. */
export async function cancelRecovery(db:Dexie,claims:AccessClaims){
  if(claims.role!=='owner'||claims.expiresAt<=Date.now())throw new AccessError();
  return db.transaction('rw',db.table('settings'),async()=>{
    const job=(await db.table('settings').get('recoveryJob'))?.value;
    if(!job)return;
    // Keep even an old malformed archive available; cancellation must not require it to be replayable.
    const key=`recoveryCancelled:${crypto.randomUUID()}`;
    await db.table('settings').put({key,value:{...job,cancelledAt:Date.now()}});
    await db.table('settings').delete('recoveryJob');
    return job.archive as RecoveryArchive;
  });
}
export async function resumeRecovery(db:Dexie,claims:AccessClaims,recover:(event:StoreEvent)=>Promise<{id:string;sequence:number}>){
  if(claims.role!=='owner'||claims.expiresAt<=Date.now())throw new AccessError();
  const job=await db.transaction('rw',db.table('settings'),async()=>{
    const saved=(await db.table('settings').get('recoveryJob'))?.value;if(!saved)return;
    if(saved.id)return saved;
    const upgraded={...saved,id:crypto.randomUUID()};
    await db.table('settings').put({key:'recoveryJob',value:upgraded});return upgraded;
  });
  if(!job)return;
  const archive=validateArchive(job.archive,claims.storeId);
  if(!Number.isSafeInteger(job.index)||job.index<0||job.index>archive.outbox.length)throw new AccessError('Cadangan tidak valid.');
  const active=async()=>{
    const saved=(await db.table('settings').get('recoveryJob'))?.value;
    if(saved?.id!==job.id)throw new AccessError('Pemulihan ini sudah dihentikan.',409);
  };
  for(let index=job.index;index<archive.outbox.length;index++){
    await active();
    const event=archive.outbox[index].event,ack=await recover(event);
    if(ack.id!==event.id||!Number.isSafeInteger(ack.sequence)||ack.sequence<1)throw new AccessError('Pemulihan belum dikonfirmasi.',409);
    const hasOutbox=db.tables.some(table=>table.name==='posOutbox');
    await db.transaction('rw',[db.table('settings'),...(hasOutbox?[db.table('posOutbox')]:[])],async()=>{
      await active();
      if(hasOutbox){
        const local=await db.table('posOutbox').get(event.id);
        if(local&&JSON.stringify(local.event)===JSON.stringify(event))await db.table('posOutbox').delete(event.id);
      }
      // A crash before this write safely resends the original immutable event.
      await db.table('settings').put({key:'recoveryJob',value:{...job,index:index+1}});
    });
  }
  await db.transaction('rw',db.table('settings'),async()=>{await active();await db.table('settings').delete('recoveryJob');});
}
