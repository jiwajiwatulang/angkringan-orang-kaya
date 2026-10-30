import crypto from 'node:crypto';
import type {D1Database} from './d1';
import {digest} from './multideviceCrypto';
import {AccessError,requireOwner,validateEnvelope,type AccessClaims,type StoreEvent} from '../multidevice/protocol';
import {project,visibleEntity,type Entity} from '../multidevice/projection';
import {MAX_DELIVERY_BYTES,PAYLOAD_CHUNK_CHARS} from '../multidevice/limits';

function chunks(payload:string){return payload.length<=PAYLOAD_CHUNK_CHARS?[]:Array.from({length:Math.ceil(payload.length/PAYLOAD_CHUNK_CHARS)},(_,i)=>payload.slice(i*PAYLOAD_CHUNK_CHARS,(i+1)*PAYLOAD_CHUNK_CHARS));}
async function readPayload(db:D1Database,storeId:string,kind:string,id:string,payload:string){
  const marker=JSON.parse(payload);
  if(!marker||!Number.isSafeInteger(marker.mdPayloadParts))return marker;
  const parts=await db.prepare('SELECT payload FROM MdPayloadChunks WHERE storeId=? AND kind=? AND id=? ORDER BY part').bind(storeId,kind,id).all<{payload:string}>();
  if(parts.results.length!==marker.mdPayloadParts)throw new AccessError('Data belum lengkap.',503);
  return JSON.parse(parts.results.map(row=>row.payload).join(''));
}

// The mutation marker is request-local. A failed CAS must never borrow another request's revision.
const LIVE=`EXISTS(SELECT 1 FROM MdDevices d WHERE d.storeId=MdStores.id AND d.id=? AND d.epoch=? AND d.role=? AND d.publicKey=? AND d.revoked=0)
 AND (? IS NULL OR EXISTS(SELECT 1 FROM MdEmployees e WHERE e.storeId=MdStores.id AND e.id=? AND e.epoch=? AND e.active=1))
 AND EXISTS(SELECT 1 FROM MdDevices o JOIN LicenseDeviceKeys k ON k.deviceId=o.id AND k.publicKey=o.publicKey WHERE o.storeId=MdStores.id AND o.role='owner' AND o.revoked=0 AND (k.licenseKey=MdStores.licenseKey OR EXISTS(SELECT 1 FROM BetaRegistrations b JOIN Licenses l ON l.orderId=b.registrationId WHERE b.status='dikonversi_berbayar' AND ((b.trialLicenseKey=MdStores.licenseKey AND l.licenseKey=k.licenseKey) OR (l.licenseKey=MdStores.licenseKey AND b.trialLicenseKey=k.licenseKey)))))`;
function liveValues(c:AccessClaims){return [c.deviceId,c.deviceEpoch,c.role,c.deviceKey,c.employeeId||null,c.employeeId||null,c.employeeEpoch||null];}
async function ensureLive(db:D1Database,c:AccessClaims){
  if(c.expiresAt<=Date.now()) throw new AccessError('Silakan masuk lagi.',401);
  if(!await db.prepare(`SELECT id FROM MdStores WHERE id=? AND ${LIVE}`).bind(c.storeId,...liveValues(c)).first()) throw new AccessError('Akses sudah berakhir.');
}
export async function submitEvent(db:D1Database,claims:AccessClaims,event:StoreEvent) {
  return writeEvent(db,claims,claims,event);
}
async function writeEvent(db:D1Database,actor:AccessClaims,claims:AccessClaims,event:StoreEvent,recovering=false) {
  validateEnvelope(event,claims);await ensureLive(db,actor);
  const payload=JSON.stringify(event),hash=digest(payload);
  if(new TextEncoder().encode(payload).length>MAX_DELIVERY_BYTES) throw new AccessError('Nota terlalu besar.',413);
  for(let attempt=0;attempt<8;attempt++){
    const duplicate=await db.prepare('SELECT digest,sequence,deviceId,operatorId FROM MdEvents WHERE storeId=? AND id=?').bind(claims.storeId,event.id).first<{digest:string;sequence:number;deviceId:string;operatorId:string}>();
    if(duplicate){
      if(duplicate.digest!==hash || duplicate.deviceId!==claims.deviceId || duplicate.operatorId!==event.operatorId) throw new AccessError('Nota berbeda memakai nomor yang sama.',409);
      return {id:event.id,sequence:duplicate.sequence,duplicate:true};
    }
    const state=await db.prepare('SELECT revision FROM MdStores WHERE id=?').bind(claims.storeId).first<{revision:number}>();
    if(!state) throw new AccessError();
    let changes:Entity[];
    try {
      changes=await project(event,claims,async(kind,id)=>{
        const row=await db.prepare('SELECT payload FROM MdEntities WHERE storeId=? AND kind=? AND id=?').bind(claims.storeId,kind,id).first<{payload:string}>();
        return row?readPayload(db,claims.storeId,kind,id,row.payload):undefined;
      },{ownerRecovery:recovering});
    } catch(error){
      const latest=await db.prepare('SELECT revision FROM MdStores WHERE id=?').bind(claims.storeId).first<{revision:number}>();
      if(latest?.revision!==state.revision) continue;
      throw error;
    }
    const mutation=crypto.randomUUID(),revision=state.revision+1;
    const guard='EXISTS(SELECT 1 FROM MdStores WHERE id=? AND mutation=?)';
    const payloadWrites=(kind:string,id:string,value:string)=>{
      const parts=chunks(value);
      return {stored:parts.length?JSON.stringify({mdPayloadParts:parts.length}):value,statements:[
        db.prepare(`DELETE FROM MdPayloadChunks WHERE storeId=? AND kind=? AND id=? AND ${guard}`).bind(claims.storeId,kind,id,claims.storeId,mutation),
        ...parts.map((part,index)=>db.prepare(`INSERT INTO MdPayloadChunks(storeId,kind,id,part,payload) SELECT ?,?,?,?,? WHERE ${guard}`).bind(claims.storeId,kind,id,index,part,claims.storeId,mutation)),
      ]};
    };
    const storedEvent=payloadWrites('event',event.id,payload);
    const storedEntities=changes.map(entity=>({entity,...payloadWrites(entity.kind,entity.id,JSON.stringify(entity.value))}));
    const statements=[
      db.prepare(`UPDATE MdStores SET revision=revision+1,mutation=? WHERE id=? AND revision=? AND ${LIVE}`).bind(mutation,claims.storeId,state.revision,...liveValues(actor)),
      db.prepare(`INSERT INTO MdEvents(storeId,id,deviceId,operatorId,kind,entityId,payload,digest,receivedAt)
        SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(claims.storeId,event.id,claims.deviceId,event.operatorId,event.kind,event.entityId,storedEvent.stored,hash,Date.now(),claims.storeId,mutation),
      ...storedEvent.statements,
      ...storedEntities.flatMap(({entity,stored,statements})=>[db.prepare(`INSERT INTO MdEntities(storeId,kind,id,revision,payload) SELECT ?,?,?,?,? WHERE ${guard}
        ON CONFLICT(storeId,kind,id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload`).bind(claims.storeId,entity.kind,entity.id,revision,stored,claims.storeId,mutation),...statements]),
      ...(recovering?[db.prepare(`INSERT INTO MdRecoveries(storeId,eventId,authorizedBy,recoveredAt) SELECT ?,?,?,? WHERE ${guard}
        ON CONFLICT(storeId,eventId) DO NOTHING`).bind(claims.storeId,event.id,actor.deviceId,Date.now(),claims.storeId,mutation)]:[]),
    ];
    try {await db.batch(statements);} catch(error){
      // Concurrent same-ID retries may race; the next loop verifies equality before acknowledging.
      const saved=await db.prepare('SELECT id FROM MdEvents WHERE storeId=? AND id=?').bind(claims.storeId,event.id).first();
      if(!saved) throw error;
    }
    const stored=await db.prepare('SELECT sequence,digest FROM MdEvents WHERE storeId=? AND id=?').bind(claims.storeId,event.id).first<{sequence:number;digest:string}>();
    if(stored){if(stored.digest!==hash) throw new AccessError('Nota berbeda memakai nomor yang sama.',409);return {id:event.id,sequence:stored.sequence,duplicate:false};}
    await ensureLive(db,actor);
  }
  throw new AccessError('Data sedang diperbarui. Coba lagi.',409);
}
export async function recoverEvent(db:D1Database,owner:AccessClaims,event:StoreEvent){
  requireOwner(owner);await ensureLive(db,owner);
  if(!event || event.storeId!==owner.storeId)throw new AccessError('Cadangan berasal dari toko lain.');
  const device=await db.prepare('SELECT publicKey,role,epoch FROM MdDevices WHERE storeId=? AND id=?').bind(owner.storeId,event.deviceId).first<{publicKey:string;role:'owner'|'cashier';epoch:number}>();
  if(!device)throw new AccessError('Perangkat asal tidak dikenali.');
  const origin:AccessClaims={...owner,deviceId:event.deviceId,deviceKey:device.publicKey,role:device.role,deviceEpoch:device.epoch};
  if(device.role==='cashier'){
    const employee=await db.prepare('SELECT epoch FROM MdEmployees WHERE storeId=? AND id=?').bind(owner.storeId,event.operatorId).first<{epoch:number}>();
    if(!employee)throw new AccessError('Karyawan asal tidak dikenali.');
    origin.employeeId=event.operatorId;origin.employeeEpoch=employee.epoch;
  }else if(event.operatorId!==event.deviceId)throw new AccessError('Cadangan tidak sesuai.');
  // Only the live owner authorizes recovery. No old device or employee is reactivated.
  // Preserve the original event bytes/ID so an earlier accepted delivery remains the same event.
  const result=await writeEvent(db,owner,origin,event,true);
  return result;
}
export async function pullEntities(db:D1Database,claims:AccessClaims,cursor:number) {
  await ensureLive(db,claims);
  if(!Number.isSafeInteger(cursor)||cursor<0) throw new AccessError('Perbarui data lagi.',400);
  const page=await db.prepare('SELECT revision FROM MdEntities WHERE storeId=? AND revision>? ORDER BY revision LIMIT 200').bind(claims.storeId,cursor).all<{revision:number}>();
  if(!page.results.length) return {cursor,entities:[] as Entity[],hasMore:false};
  const upper=page.results[page.results.length-1].revision;
  const rows=await db.prepare(`SELECT e.kind,e.id,e.payload,receipt.payload AS kitchenOrderPayload
    FROM MdEntities e LEFT JOIN MdEntities receipt ON e.kind='pos_operations'
      AND json_extract(e.payload,'$.kind')='kitchen' AND receipt.storeId=e.storeId
      AND receipt.kind='pos_orders' AND receipt.id=json_extract(e.payload,'$.orderId')
    WHERE e.storeId=? AND e.revision>? AND e.revision<=? ORDER BY e.revision,e.kind,e.id`)
    .bind(claims.storeId,cursor,upper).all<{kind:string;id:string;payload:string;kitchenOrderPayload:string|null}>();
  const entities=(await Promise.all(rows.results.map(async row=>{
    const value=await readPayload(db,claims.storeId,row.kind,row.id,row.payload);
    if(claims.role==='cashier'&&row.kind==='pos_operations'&&value.kind==='kitchen'){
      // Also support existing kitchen records without rewriting production history.
      const order=row.kitchenOrderPayload?await readPayload(db,claims.storeId,'pos_orders',value.orderId,row.kitchenOrderPayload):undefined;
      value.mdTargetDeviceId=order?.mdDeviceId;value.mdTargetOperatorId=order?.mdOperatorId;
    }
    return visibleEntity({kind:row.kind,id:row.id,value},claims);
  }))).filter((row):row is Entity=>!!row);
  const more=await db.prepare('SELECT id FROM MdEntities WHERE storeId=? AND revision>? LIMIT 1').bind(claims.storeId,upper).first();
  return {cursor:upper,entities,hasMore:!!more};
}
