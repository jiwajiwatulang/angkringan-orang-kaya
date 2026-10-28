import Dexie from 'dexie';
import type {AccessClaims} from './protocol';
import {POS_TABLES,type PosTable} from './posWire';
import {DeviceClient} from './client';

export async function activatePosPartition(source:Dexie,access:string,claims:AccessClaims){
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')throw new Error('Halaman tidak tersedia.');
  if(source.name==='SakuNotaDemoDB')throw new Error('Keluar dari demo terlebih dahulu.');
  const target=new Dexie(`SakuNotaPOS-${claims.storeId}-${claims.deviceId}`);
  const client=new DeviceClient(access,claims);let cursor=0,cloudHasPos=false;
  for(let page=0;page<1000;page++){
    const result=await client.pull(cursor);cloudHasPos=result.entities.some(entity=>entity.kind.startsWith('pos_'));
    if(cloudHasPos||!result.hasMore)break;
    if(result.cursor<=cursor)throw new Error('Data belum dapat diperiksa. Coba lagi.');cursor=result.cursor;
    if(page===999)throw new Error('Data belum dapat diperiksa. Coba lagi.');
  }
  target.version(14).stores(Object.fromEntries([...POS_TABLES.map(name=>[name,name==='operations'?'++id,kind,employeeId,at,orderId,orderItemId,sessionId':name==='menuItems'?'++id,sku,nama,kategori,isSoldOut,urutan':name==='orders'?'++id,shiftId,idempotencyKey,tableId,status,verificationStatus,createdAt':name==='orderItems'?'++id,orderId,menuItemId':name==='payments'?'++id,orderId,shiftId,paymentMethod,status,proofStatus,paidAt':name==='shifts'?'++id,status,startTime,operatorName':name==='cashMovements'?'++id,shiftId,type,timestamp':name==='paymentProofs'?'++id,paymentId,orderId,status,uploadedAt':name==='inventoryMovements'?'++id,menuItemId,orderId,type,timestamp':name==='auditLogs'?'++id,orderId,action,timestamp':'++id,nomor,status']),['settings','key'],['posOutbox','id,ordinal'],['posMeta','key'],['posIds','key']]));
  try{
    const initialized=await target.table('posMeta').get('initialized');
    if(!initialized){
      const keys=(await source.table('settings').get('license_device_keys_v2'))?.value;
      const settings=(await source.table('settings').get('pos_store_settings'))?.value;
      const snapshot:Partial<Record<PosTable,Record<string,any>[]>>={};
      if(claims.role==='owner'&&!cloudHasPos)for(const table of POS_TABLES)snapshot[table]=source.tables.some(t=>t.name===table)?await source.table(table).toArray():[];
      const mappings=new Map<string,string>();
      for(const table of POS_TABLES)for(const row of snapshot[table]||[])mappings.set(`${table}:${row.id}`,row.mdId||crypto.randomUUID());
      await target.transaction('rw',target.tables,async()=>{
        if(keys)await target.table('settings').put({key:'license_device_keys_v2',value:keys});
        if(settings&&claims.role==='owner')await target.table('settings').put({key:'pos_store_settings',value:settings});
        for(const table of POS_TABLES)for(const row of snapshot[table]||[]){
          const value={...row,mdId:mappings.get(`${table}:${row.id}`),mdStoreId:claims.storeId,mdDeviceId:claims.deviceId,mdOperatorId:claims.deviceId,mdVersion:0,mdCatalogVersion:table==='menuItems'?1:row.mdCatalogVersion};
          await target.table(table).put(value);
          await target.table('posIds').put({key:`${table}:${value.mdId}`,value:row.id});
        }
        await target.table('settings').put({key:'multi_device_access',value:{access,claims}});
        await target.table('posMeta').put({key:'initialized',value:true});
        await target.table('posMeta').put({key:'bootstrapRequired',value:claims.role==='owner'&&!cloudHasPos});
      });
    }else await target.table('settings').put({key:'multi_device_access',value:{access,claims}});
    localStorage.setItem('sakunota_pos_partition',JSON.stringify({storeId:claims.storeId,deviceId:claims.deviceId}));
    sessionStorage.removeItem('sakunota_demo_mode');
  }finally{target.close();}
}
