import Dexie from 'dexie';
import {DeviceClient} from './client';
import {POS_TABLES,FOREIGN_KEYS,type PosTable,type PosCommit} from './posWire';
import {markPosImport} from './posCapture';
import type {Entity} from './projection';
import {AccessError,type AccessClaims} from './protocol';

export async function importPosEntities(db:Dexie,entities:Entity[],cursor:number){
  let profileChanged=false;
  await db.transaction('rw',[...POS_TABLES,'posOutbox','posMeta','posIds','settings'],async()=>{
    if(await db.table('posOutbox').count())return;
    markPosImport(Dexie.currentTransaction!.idbtrans);
    const localId=async(table:PosTable,globalId:string):Promise<number>=>{
      const key=`${table}:${globalId}`,saved=await db.table('posIds').get(key);if(saved)return saved.value;
      const last=await db.table(table).orderBy(':id').last(),counter=await db.table('posMeta').get(`counter:${table}`),id=Math.max(Number(last?.id||0),Number(counter?.value||0))+1;
      await db.table('posMeta').put({key:`counter:${table}`,value:id});await db.table('posIds').put({key,value:id});return id;
    };
    for(const entity of entities){
      const table=entity.kind.slice(4) as PosTable;if(!entity.kind.startsWith('pos_')||!POS_TABLES.includes(table))continue;
      await localId(table,entity.id);
    }
    for(const entity of entities){
      const table=entity.kind.slice(4) as PosTable;if(!entity.kind.startsWith('pos_')||!POS_TABLES.includes(table))continue;
      const value:Record<string,any>={...entity.value,id:await localId(table,entity.id)};
      for(const [field,parent] of Object.entries(FOREIGN_KEYS[table]||{})){if(value[field])value[field]=await localId(parent,value[field]);}
      if(table==='payments'&&Array.isArray(value.itemsPaid)){
        value.itemsPaid=await Promise.all(value.itemsPaid.map(async(item:Record<string,any>)=>{const copy={...item};if(copy.menuItemId)copy.menuItemId=await localId('menuItems',copy.menuItemId);if(copy.orderItemId)copy.orderItemId=await localId('orderItems',copy.orderItemId);return copy;}));
      }
      if(value.mdDeleted)await db.table(table).delete(value.id);else await db.table(table).put(value);
    }
    for(const entity of entities)if(entity.kind==='settings'&&entity.value.profile){
      profileChanged=true;
      const existing=await db.table('settings').get('pos_store_settings');
      await db.table('settings').put({key:'pos_store_settings',value:{...existing?.value,...entity.value.profile,onboardingCompleted:true}});
      await db.table('posMeta').put({key:'profileVersion',value:entity.value.version});
    }
    await db.table('posMeta').put({key:'cursor',value:cursor});
  });
  if(profileChanged&&typeof window!=='undefined'){
    const {loadStoreSettingsAsync}=await import('../settings');
    window.dispatchEvent(new CustomEvent('sakunota:settings_updated',{detail:await loadStoreSettingsAsync()}));
  }
}
export class PosSynchronizer {
  private running:Promise<void>|undefined;
  constructor(readonly db:Dexie,readonly client:DeviceClient){}
  synchronize(){if(!this.running)this.running=this.run().finally(()=>{this.running=undefined;});return this.running;}
  private async run(){
    const pending=await this.db.table('posOutbox').orderBy('ordinal').toArray();
    for(const row of pending){
      const client=row.claims.deviceId===this.client.claims.deviceId&&row.claims.employeeId===this.client.claims.employeeId?this.client:new DeviceClient(row.access,row.claims);
      try{
        const ack=await client.send(row.event as PosCommit);
        if(ack.id!==row.id)throw new AccessError('Pengiriman belum dikonfirmasi.',409);
        await this.db.table('posOutbox').delete(row.id);
      }catch(error){await this.db.table('posOutbox').update(row.id,{attempts:row.attempts+1,error:'Pengiriman belum berhasil.'});throw error;}
    }
    let cursor=Number((await this.db.table('posMeta').get('cursor'))?.value||0);
    for(let page=0;page<1000;page++){
      const result=await this.client.pull(cursor);
      if(result.cursor<cursor||result.hasMore&&result.cursor===cursor)throw new AccessError('Data belum dapat diperbarui.',409);
      await importPosEntities(this.db,result.entities,result.cursor);
      if(await this.db.table('posOutbox').count())return;
      cursor=result.cursor;if(!result.hasMore)break;
    }
    await this.db.table('posMeta').put({key:'lastUpdated',value:Date.now()});
    if(typeof window!=='undefined')window.dispatchEvent(new Event('sakunota-pos-updated'));
  }
  async backup(){
    const claims=this.client.claims;if(claims.expiresAt<=Date.now()||claims.role==='cashier'&&!claims.employeeId)throw new AccessError();
    const outbox=(await this.db.table('posOutbox').orderBy('ordinal').toArray()).filter(row=>claims.role==='owner'||row.event.operatorId===claims.employeeId).map(({id,event,ordinal})=>({id,event,ordinal,attempts:0}));
    return {version:1,storeId:this.client.claims.storeId,deviceId:this.client.claims.deviceId,outbox};
  }
}
