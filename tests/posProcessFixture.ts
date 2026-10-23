import 'fake-indexeddb/auto';
import {createInterface} from 'node:readline';
import type Dexie from 'dexie';
let db:Dexie,api:Record<string,any>,inventory:Record<string,any>;
createInterface({input:process.stdin}).on('line',line=>{void (async()=>{
  const {id,action,data}=JSON.parse(line);
  try{
    let value:unknown;
    if(action==='init'){
      process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
      const selected=JSON.stringify({storeId:data.claims.storeId,deviceId:data.claims.deviceId});
      Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>key==='sakunota_pos_partition'?selected:null}});
      db=(await import('../src/lib/dexie')).db;api=await import('../src/lib/api');inventory=await import('../src/lib/inventory');
      (await import('../src/lib/multidevice/posWire')).setPosScope({claims:data.claims,access:data.access,operatorName:data.name});
    }else if(action==='call')value=await (api[data.name]||inventory[data.name])(...data.args);
    else if(action==='queue')value=await db.table('posOutbox').orderBy('ordinal').toArray();
    else if(action==='ack')await db.table('posOutbox').delete(data.id);
    else if(action==='pull')await (await import('../src/lib/multidevice/posSync')).importPosEntities(db,data.entities,data.cursor);
    else if(action==='records')value=await db.table(data.table).toArray();
    else if(action==='reopen'){db.close();await db.open();}
    else throw new Error('Unknown fixture action');
    process.stdout.write(JSON.stringify({id,value})+'\n');
  }catch(error){process.stdout.write(JSON.stringify({id,error:error instanceof Error?error.message:String(error)})+'\n');}
})();});
