import type Dexie from 'dexie';
import {AccessError,assertId,type AccessClaims,type StoreEvent} from './protocol';
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
    if(!row.event.data||typeof row.event.data!=='object'||JSON.stringify(row.event).length>150000)throw new AccessError('Cadangan tidak valid.',400);
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
    await db.table('settings').put({key:'recoveryJob',value:{archive,index:0}});
  });
  return archive.outbox.length;
}
export async function resumeRecovery(db:Dexie,claims:AccessClaims,recover:(event:StoreEvent)=>Promise<{id:string;sequence:number}>){
  if(claims.role!=='owner'||claims.expiresAt<=Date.now())throw new AccessError();
  const job=(await db.table('settings').get('recoveryJob'))?.value;if(!job)return;
  const archive=validateArchive(job.archive,claims.storeId);
  if(!Number.isSafeInteger(job.index)||job.index<0||job.index>archive.outbox.length)throw new AccessError('Cadangan tidak valid.');
  for(let index=job.index;index<archive.outbox.length;index++){
    const event=archive.outbox[index].event,ack=await recover(event);
    if(ack.id!==event.id||!Number.isSafeInteger(ack.sequence)||ack.sequence<1)throw new AccessError('Pemulihan belum dikonfirmasi.',409);
    // A crash before this write resends the same event and cannot create another sale.
    await db.table('settings').put({key:'recoveryJob',value:{archive,index:index+1}});
  }
  await db.table('settings').delete('recoveryJob');
}
