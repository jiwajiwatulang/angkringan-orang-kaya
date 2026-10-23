import Dexie from 'dexie';
import {AccessError,assertId,type AccessClaims,type StoreEvent} from './protocol';
import {project,type Entity} from './projection';
import {verifyAccess,verifyOfflinePin} from './offlineAccess';
import {LICENSE_PUBLIC_KEY} from '../licenseProtocol';

export interface OutboxRow {id:string;event:StoreEvent;attempts:number;ordinal:number;lastError?:string}
export interface Transport {
  send(event:StoreEvent):Promise<{id:string;sequence:number}>;
  pull(cursor:number):Promise<{cursor:number;entities:Entity[];hasMore:boolean}>;
}
// Separate store/device partitions; no mutation or upgrade of the existing merchant/demo database.
export function replicaDatabase(storeId:string,deviceId:string) {
  assertId(storeId);assertId(deviceId);
  const database=new Dexie(`SakuNotaStoreReplica-${storeId}-${deviceId}`);
  database.version(1).stores({entities:'[kind+id],kind',outbox:'id,ordinal',settings:'key',credentials:'id'});
  return database;
}
export class LocalReplica {
  private access='';private syncing:Promise<void>|undefined;
  private listeners=new Set<()=>void>();
  constructor(readonly db:Dexie,readonly storeId:string,readonly deviceId:string,private identity:string,private publicKey:JsonWebKey=LICENSE_PUBLIC_KEY){
    assertId(storeId);assertId(deviceId);
    if(db.name!==`SakuNotaStoreReplica-${storeId}-${deviceId}`)throw new AccessError('Gunakan perangkat toko yang terhubung.');
  }
  async useAccess(access:string) {
    if((await this.db.table('settings').get('accessBlocked'))?.value)throw new AccessError('Masuk dengan internet terlebih dahulu.',401);
    const claims=await verifyAccess(access,this.deviceId,this.identity,this.publicKey);
    if(claims.storeId!==this.storeId) throw new AccessError();
    this.access=access;return claims;
  }
  private async claims() {
    if((await this.db.table('settings').get('accessBlocked'))?.value)throw new AccessError('Masuk dengan internet terlebih dahulu.',401);
    const claims=await verifyAccess(this.access,this.deviceId,this.identity,this.publicKey);
    if(claims.storeId!==this.storeId) throw new AccessError();return claims;
  }
  async rememberEmployee(data:{id:string;access:string;verifier:string;name:string}) {
    const claims=await verifyAccess(data.access,this.deviceId,this.identity,this.publicKey);
    if(claims.storeId!==this.storeId||claims.employeeId!==data.id||!claims.pinDigest) throw new AccessError();
    await this.db.transaction('rw',[this.db.table('credentials'),this.db.table('settings')],async()=>{
      await this.db.table('credentials').put(data);
      await this.db.table('settings').put({key:'accessBlocked',value:false});
    });
  }
  async loginOffline(id:string,pin:string) {
    if((await this.db.table('settings').get('accessBlocked'))?.value) throw new AccessError('Masuk dengan internet terlebih dahulu.',401);
    const data=await this.db.table('credentials').get(id);
    if(!data) throw new AccessError('Masuk dengan internet terlebih dahulu.',401);
    const claims=await verifyAccess(data.access,this.deviceId,this.identity,this.publicKey);
    if(claims.storeId!==this.storeId||claims.employeeId!==id) throw new AccessError();
    const now=Date.now(),key=`attempts:${id}`;
    await this.db.transaction('rw',this.db.table('settings'),async()=>{
      const watermark=await this.db.table('settings').get('clock');
      if(watermark?.value>now+60000) throw new AccessError('Sesuaikan waktu perangkat.');
      await this.db.table('settings').put({key:'clock',value:Math.max(now,watermark?.value||0)});
      const prior=await this.db.table('settings').get(key);
      if(prior?.lockedUntil>now) throw new AccessError('Coba lagi dalam 5 menit.',429);
      const attempts=prior?.lockedUntil ? 1 : (prior?.attempts||0)+1;
      await this.db.table('settings').put({key,attempts,lockedUntil:attempts>=5?now+300000:0});
    });
    if(!await verifyOfflinePin(pin,data.verifier,claims)) throw new AccessError('PIN tidak sesuai.',401);
    const attempts=await this.db.table('settings').get(key);
    if(attempts?.attempts>=5) throw new AccessError('Coba lagi dalam 5 menit.',429);
    await this.db.table('settings').delete(key);this.access=data.access;return claims;
  }
  logout(){this.access='';}
  onPending(listener:()=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
  async enqueue(kind:StoreEvent['kind'],entityId:string,data:Record<string,unknown>,requestId=crypto.randomUUID()) {
    const claims=await this.claims();
    const event:StoreEvent={id:requestId,storeId:this.storeId,deviceId:this.deviceId,operatorId:claims.employeeId||this.deviceId,kind,entityId,data};
    // All IDs precede the write; projection and delivery intent either both commit or neither does.
    await this.db.transaction('rw',[this.db.table('entities'),this.db.table('outbox'),this.db.table('settings')],async()=>{
      const now=Date.now(),clock=await this.db.table('settings').get('clock');
      if(clock?.value>now+60000) throw new AccessError('Sesuaikan waktu perangkat.');
      await this.db.table('settings').put({key:'clock',value:Math.max(now,clock?.value||0)});
      const saved=await this.db.table('settings').get(`event:${requestId}`);
      if(saved){if(saved.value!==JSON.stringify(event)) throw new AccessError('Nota berbeda memakai nomor yang sama.',409);return;}
      const changes=await project(event,claims,async(kind,id)=>(await this.db.table('entities').get([kind,id]))?.value);
      await this.db.table('entities').bulkPut(changes);
      const ordinal=Number((await this.db.table('settings').get('ordinal'))?.value||0)+1;
      await this.db.table('settings').put({key:'ordinal',value:ordinal});
      await this.db.table('outbox').add({id:event.id,event,attempts:0,ordinal});
      // Tombstone remains after acknowledgment and through restores to prevent replay.
      await this.db.table('settings').put({key:`event:${requestId}`,value:JSON.stringify(event)});
    });
    for(const listener of this.listeners){try{listener();}catch{/* A status subscriber cannot undo a committed sale. */}}
    return event;
  }
  synchronize(transport:Transport):Promise<void> {
    if(!this.syncing) this.syncing=this.runSync(transport).finally(()=>{this.syncing=undefined;});return this.syncing;
  }
  private async runSync(transport:Transport) {
    await this.claims();
    // Preserve insertion/dependency order; random event IDs are never used for sorting.
    const pending=await this.db.table('outbox').orderBy('ordinal').toArray() as OutboxRow[];
    for(const row of pending){
      try {
        const ack=await transport.send(row.event);
        if(ack.id!==row.id||!Number.isSafeInteger(ack.sequence)||ack.sequence<1) throw new Error('Pengiriman belum dikonfirmasi.');
        await this.db.table('outbox').delete(row.id);
      } catch(error){
        await this.db.table('outbox').update(row.id,{attempts:row.attempts+1,lastError:'Pengiriman belum berhasil.'});
        if(error instanceof AccessError && [401,403].includes(error.status)){
          this.access='';
          await this.db.transaction('rw',[this.db.table('credentials'),this.db.table('settings')],async()=>{
            await this.db.table('credentials').clear();await this.db.table('settings').put({key:'accessBlocked',value:true});
          });
        }
        throw error; // Never send a dependent payment before its failed order.
      }
    }
    // Pull only after pending writes have acknowledgments. Otherwise a server projection could erase a local sale.
    let cursor=Number((await this.db.table('settings').get('cursor'))?.value||0);
    for(let page=0;page<100;page++){
      const result=await transport.pull(cursor);
      if(!Number.isSafeInteger(result.cursor)||result.cursor<cursor||(result.hasMore&&result.cursor===cursor)) throw new Error('Data belum dapat diperbarui.');
      const applied=await this.db.transaction('rw',[this.db.table('entities'),this.db.table('settings'),this.db.table('outbox')],async()=>{
        if(await this.db.table('outbox').count()) return false;
        await this.db.table('entities').bulkPut(result.entities);
        await this.db.table('settings').put({key:'cursor',value:result.cursor});
        return true;
      });
      if(!applied) return;
      cursor=result.cursor;if(!result.hasMore)break;
    }
    await this.db.table('settings').put({key:'lastUpdated',value:Date.now()});
  }
  async status() {
    return {pending:await this.db.table('outbox').count(),lastUpdated:(await this.db.table('settings').get('lastUpdated'))?.value as number|undefined};
  }
  async exportData() {
    const claims=await this.claims();if(claims.role!=='owner') throw new AccessError();
    return this.db.transaction('r',[this.db.table('entities'),this.db.table('outbox'),this.db.table('settings')],async()=>({version:1,storeId:this.storeId,deviceId:this.deviceId,entities:await this.db.table('entities').toArray(),outbox:await this.db.table('outbox').toArray(),markers:await this.db.table('settings').filter(row=>row.key.startsWith('event:')).toArray()}));
  }
}
