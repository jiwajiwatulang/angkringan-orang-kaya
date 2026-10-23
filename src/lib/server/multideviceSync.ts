import crypto from 'node:crypto';
import type {D1Database} from './d1';
import {digest} from './multideviceCrypto';
import {AccessError,validateEnvelope,type AccessClaims,type StoreEvent} from '../multidevice/protocol';
import {project,visibleEntity,type Entity} from '../multidevice/projection';

// The mutation marker is request-local. A failed CAS must never borrow another request's revision.
const LIVE=`EXISTS(SELECT 1 FROM MdDevices d WHERE d.storeId=MdStores.id AND d.id=? AND d.epoch=? AND d.role=? AND d.publicKey=? AND d.revoked=0)
 AND (? IS NULL OR EXISTS(SELECT 1 FROM MdEmployees e WHERE e.storeId=MdStores.id AND e.id=? AND e.epoch=? AND e.active=1))`;
function liveValues(c:AccessClaims){return [c.deviceId,c.deviceEpoch,c.role,c.deviceKey,c.employeeId||null,c.employeeId||null,c.employeeEpoch||null];}
async function ensureLive(db:D1Database,c:AccessClaims){
  if(c.expiresAt<=Date.now()) throw new AccessError('Silakan masuk lagi.',401);
  if(!await db.prepare(`SELECT id FROM MdStores WHERE id=? AND ${LIVE}`).bind(c.storeId,...liveValues(c)).first()) throw new AccessError('Akses sudah berakhir.');
}
export async function submitEvent(db:D1Database,claims:AccessClaims,event:StoreEvent) {
  validateEnvelope(event,claims);await ensureLive(db,claims);
  const payload=JSON.stringify(event),hash=digest(payload);
  if(payload.length>150000) throw new AccessError('Nota terlalu besar.',413);
  for(let attempt=0;attempt<8;attempt++){
    const duplicate=await db.prepare('SELECT digest,sequence,deviceId,operatorId FROM MdEvents WHERE storeId=? AND id=?').bind(claims.storeId,event.id).first<{digest:string;sequence:number;deviceId:string;operatorId:string}>();
    if(duplicate){
      if(duplicate.digest!==hash || duplicate.deviceId!==claims.deviceId || duplicate.operatorId!==event.operatorId) throw new AccessError('Nota berbeda memakai nomor yang sama.',409);
      return {id:event.id,sequence:duplicate.sequence,duplicate:true};
    }
    const state=await db.prepare('SELECT revision FROM MdStores WHERE id=?').bind(claims.storeId).first<{revision:number}>();
    if(!state) throw new AccessError();
    const changes=await project(event,claims,async(kind,id)=>{
      const row=await db.prepare('SELECT payload FROM MdEntities WHERE storeId=? AND kind=? AND id=?').bind(claims.storeId,kind,id).first<{payload:string}>();
      return row?JSON.parse(row.payload):undefined;
    });
    const mutation=crypto.randomUUID(),revision=state.revision+1;
    const guard='EXISTS(SELECT 1 FROM MdStores WHERE id=? AND mutation=?)';
    const statements=[
      db.prepare(`UPDATE MdStores SET revision=revision+1,mutation=? WHERE id=? AND revision=? AND ${LIVE}`).bind(mutation,claims.storeId,state.revision,...liveValues(claims)),
      db.prepare(`INSERT INTO MdEvents(storeId,id,deviceId,operatorId,kind,entityId,payload,digest,receivedAt)
        SELECT ?,?,?,?,?,?,?,?,? WHERE ${guard}`).bind(claims.storeId,event.id,claims.deviceId,event.operatorId,event.kind,event.entityId,payload,hash,Date.now(),claims.storeId,mutation),
      ...changes.map(entity=>db.prepare(`INSERT INTO MdEntities(storeId,kind,id,revision,payload) SELECT ?,?,?,?,? WHERE ${guard}
        ON CONFLICT(storeId,kind,id) DO UPDATE SET revision=excluded.revision,payload=excluded.payload`).bind(claims.storeId,entity.kind,entity.id,revision,JSON.stringify(entity.value),claims.storeId,mutation)),
    ];
    try {await db.batch(statements);} catch(error){
      // Concurrent same-ID retries may race; the next loop verifies equality before acknowledging.
      const saved=await db.prepare('SELECT id FROM MdEvents WHERE storeId=? AND id=?').bind(claims.storeId,event.id).first();
      if(!saved) throw error;
    }
    const stored=await db.prepare('SELECT sequence,digest FROM MdEvents WHERE storeId=? AND id=?').bind(claims.storeId,event.id).first<{sequence:number;digest:string}>();
    if(stored){if(stored.digest!==hash) throw new AccessError('Nota berbeda memakai nomor yang sama.',409);return {id:event.id,sequence:stored.sequence,duplicate:false};}
    await ensureLive(db,claims);
  }
  throw new AccessError('Data sedang diperbarui. Coba lagi.',409);
}
export async function pullEntities(db:D1Database,claims:AccessClaims,cursor:number) {
  await ensureLive(db,claims);
  if(!Number.isSafeInteger(cursor)||cursor<0) throw new AccessError('Perbarui data lagi.',400);
  const page=await db.prepare('SELECT revision FROM MdEntities WHERE storeId=? AND revision>? ORDER BY revision LIMIT 200').bind(claims.storeId,cursor).all<{revision:number}>();
  if(!page.results.length) return {cursor,entities:[] as Entity[],hasMore:false};
  const upper=page.results[page.results.length-1].revision;
  const rows=await db.prepare('SELECT kind,id,payload FROM MdEntities WHERE storeId=? AND revision>? AND revision<=? ORDER BY revision,kind,id').bind(claims.storeId,cursor,upper).all<{kind:string;id:string;payload:string}>();
  const entities=rows.results.map(row=>visibleEntity({kind:row.kind,id:row.id,value:JSON.parse(row.payload)},claims)).filter((row):row is Entity=>!!row);
  const more=await db.prepare('SELECT id FROM MdEntities WHERE storeId=? AND revision>? LIMIT 1').bind(claims.storeId,upper).first();
  return {cursor:upper,entities,hasMore:!!more};
}
