import Dexie,{type DBCoreTransaction,type DBCore,type DBCoreMutateRequest} from 'dexie';
import {AccessError,assertId} from './protocol';
import {POS_TABLES,FOREIGN_KEYS,type PosRow,type PosTable,type PosScope,type PosCommit} from './posWire';
import {publicPosProfile} from './posProfile';

const captured=new WeakMap<DBCoreTransaction,{event:PosCommit;rows:Map<string,PosRow>;chain:Promise<unknown>}>();
const imported=new WeakSet<DBCoreTransaction>();
export function markPosImport(transaction:DBCoreTransaction){imported.add(transaction);}
export function installPosCapture(db:Dexie,getScope:()=>PosScope|undefined){
  db.use({stack:'dbcore',name:'SakuNotaPosDelivery',level:0,create:(down:DBCore)=>({
    ...down,
    transaction(stores,mode,options){
      const active=getScope();
      const names=active&&mode==='readwrite'&&stores.some(name=>POS_TABLES.includes(name as PosTable)||name==='settings')?[...new Set([...stores,...POS_TABLES,'settings','posOutbox','posMeta','posIds'])]:stores;
      return down.transaction(names,mode,options);
    },
    table(name){
      const table=down.table(name);
      if(name==='settings')return {...table,async mutate(request){
        const current=getScope();if(!current||imported.has(request.trans)||!('values' in request))return table.mutate(request);
        const config=request.values.find((row:any)=>row.key==='pos_store_settings');if(!config)return table.mutate(request);
        if(current.claims.role!=='owner')throw new AccessError('Pengaturan hanya dapat diubah pemilik.');
        const previous=await down.table('posMeta').get({trans:request.trans,key:'profileVersion'}),version=Number(previous?.value||0),id=crypto.randomUUID(),profile=publicPosProfile(config.value);
        const event={id,entityId:current.claims.storeId,storeId:current.claims.storeId,deviceId:current.claims.deviceId,operatorId:current.claims.deviceId,kind:'settings.put',data:{expectedVersion:version,storeName:profile.storeName||'Usaha Saya',receiptFooter:profile.receiptFooter||'',profile}};
        const result=await table.mutate(request);if(result.numFailures){request.trans.abort();return result;}
        const counter=await down.table('posMeta').get({trans:request.trans,key:'ordinal'}),ordinal=Number(counter?.value||0)+1;
        await down.table('posMeta').mutate({type:'put',trans:request.trans,values:[{key:'ordinal',value:ordinal},{key:'profileVersion',value:version+1}]});
        await down.table('posOutbox').mutate({type:'add',trans:request.trans,values:[{id,event,ordinal,attempts:0,access:current.access,claims:current.claims}]});return result;
      }};
      if(!POS_TABLES.includes(name as PosTable))return table;
      return {...table,async mutate(request:DBCoreMutateRequest){
        const current=getScope();if(imported.has(request.trans))return table.mutate(request);
        if(!current){if(db.name.startsWith('SakuNotaPOS-'))throw new AccessError('Silakan masuk kasir.',401);return table.mutate(request);}
        if(current.claims.expiresAt<=Date.now())throw new AccessError('Silakan masuk lagi.',401);
        if(request.type==='deleteRange')throw new AccessError('Gunakan pembatalan atau pengembalian untuk mengubah transaksi.');
        if(request.type==='delete'){
          if(!['orderItems','menuItems','tables'].includes(name))throw new AccessError('Gunakan pembatalan atau pengembalian untuk mengubah transaksi.');
          const records=(await Promise.all(request.keys.map(key=>table.get({trans:request.trans,key})))).filter(Boolean);
          if(records.length)await this.mutate({type:'put',trans:request.trans,values:records.map(row=>({...row,mdDeleted:true}))});
          return table.mutate(request);
        }
        let batch=captured.get(request.trans);
        if(!batch){
          const id=crypto.randomUUID();batch={event:{id,entityId:id,storeId:current.claims.storeId,deviceId:current.claims.deviceId,operatorId:current.claims.employeeId||current.claims.deviceId,kind:'pos.commit',data:{rows:[],bootstrap:!!current.importingLegacy}},rows:new Map(),chain:Promise.resolve()};captured.set(request.trans,batch);
        }
        const values:Record<string,any>[]=[];
        for(const raw of request.values){
          const prior=raw.id===undefined?undefined:await table.get({trans:request.trans,key:raw.id});
          const id=prior?.mdId||raw.mdId||crypto.randomUUID();assertId(id);
          if(prior?.mdId&&raw.mdId&&raw.mdId!==prior.mdId)throw new AccessError('Nomor barang sudah berubah.');
          const key=`${name}:${id}`,existing=batch.rows.get(key);
          if(current.claims.role==='cashier' && !['menuItems','tables'].includes(name) && prior && (prior.mdDeviceId!==current.claims.deviceId||prior.mdOperatorId!==current.claims.employeeId))throw new AccessError('Transaksi ini milik kasir lain.');
          const value:Record<string,any>={...raw,mdId:id,mdStoreId:current.claims.storeId,mdDeviceId:prior?.mdDeviceId||current.claims.deviceId,mdOperatorId:prior?.mdOperatorId||batch.event.operatorId,mdVersion:(existing?.expectedVersion??prior?.mdVersion??0)+1};
          if(name==='menuItems'){
            const stable=(row:Record<string,any>)=>JSON.stringify(Object.fromEntries(Object.entries(row).filter(([key])=>!['id','stockQty',...(row.trackStock?['isSoldOut']:[]),'stockNeedsReview','mdVersion','mdCatalogVersion','mdId','mdStoreId','mdDeviceId','mdOperatorId'].includes(key))));
            value.mdCatalogVersion=prior?(prior.mdCatalogVersion||1)+(stable(prior)!==stable(value)?1:0):1;
          }
          if(name==='orderItems'&&value.menuItemId){
            const product=await down.table('menuItems').get({trans:request.trans,key:value.menuItemId});value.mdCatalogVersion=raw.mdCatalogVersion||product?.mdCatalogVersion||0;
          }
          if(name==='orders'&&!prior)value.mdSettingsVersion=Number((await down.table('posMeta').get({trans:request.trans,key:'profileVersion'}))?.value||0);
          values.push(value);
          // Reserve the version once per record per atomic POS transaction.
          if(!existing)batch.rows.set(key,{table:name as PosTable,id,expectedVersion:prior?.mdVersion||0,value:{}});
        }
        const result=await table.mutate({...request,values});if(result.numFailures){request.trans.abort();return result;}
        for(let index=0;index<values.length;index++){
          const value:Record<string,any>={...values[index],id:result.results?.[index]??values[index].id},wire:Record<string,any>={...value};delete wire.id;
          for(const [field,parent] of Object.entries(FOREIGN_KEYS[name as PosTable]||{})){
            if(!wire[field])continue;const record=await down.table(parent).get({trans:request.trans,key:wire[field]});
            if(!record?.mdId){if(name==='orderItems'&&field==='menuItemId'&&(wire.pendingRetailProduct||current.importingLegacy)){wire[field]=null;continue;}throw new AccessError('Perbarui data sebelum melanjutkan.');}wire[field]=record.mdId;
          }
          if(name==='payments'&&Array.isArray(wire.itemsPaid)){
            wire.itemsPaid=await Promise.all(wire.itemsPaid.map(async(item:Record<string,any>)=>{
              const copy={...item};
              if(copy.orderItemId){
                const line=await down.table('orderItems').get({trans:request.trans,key:copy.orderItemId});
                // A retail draft has no catalog ID until final settlement. The receipt line remains authoritative.
                if(line?.pendingRetailProduct)copy.menuItemId=null;
                else if(line)copy.menuItemId=line.menuItemId;
              }
              for(const [field,parent] of [['menuItemId','menuItems'],['orderItemId','orderItems']] as const){if(!copy[field])continue;const record=await down.table(parent).get({trans:request.trans,key:copy[field]});if(!record?.mdId){if(current.importingLegacy){copy[field]=null;continue;}throw new AccessError('Barang pembayaran tidak ditemukan.');}copy[field]=record.mdId;}return copy;
            }));
          }
          const row=batch.rows.get(`${name}:${value.mdId}`)!;row.value=wire;
          await down.table('posIds').mutate({type:'put',trans:request.trans,values:[{key:`${name}:${value.mdId}`,value:value.id}]});
        }
        const event={...batch.event,data:{...batch.event.data,rows:Array.from(batch.rows.values()).map(row=>({...row,value:{...row.value}}))}};
        const outbox=down.table('posOutbox'),meta=down.table('posMeta');
        const work=async()=>{
          const clock=await meta.get({trans:request.trans,key:'clock'}),now=Date.now();if(clock?.value>now+60000)throw new AccessError('Sesuaikan waktu perangkat.');
          await meta.mutate({type:'put',trans:request.trans,values:[{key:'clock',value:Math.max(now,clock?.value||0)}]});
          const saved=await outbox.get({trans:request.trans,key:event.id});
          const ordinal=saved?.ordinal||Number((await meta.get({trans:request.trans,key:'ordinal'}))?.value||0)+1;
          const size=new TextEncoder().encode(JSON.stringify(event)).length;if(size>8*1024*1024)throw new AccessError('Ukuran transaksi terlalu besar. Perkecil foto bukti.');
          if(event.data.rows.length>600)throw new AccessError('Terlalu banyak data untuk sekali simpan. Pisahkan file atau pilihan menjadi beberapa bagian.',413);
          await meta.mutate({type:'put',trans:request.trans,values:[{key:'ordinal',value:ordinal}]});
          await outbox.mutate({type:'put',trans:request.trans,values:[{id:event.id,event,ordinal,attempts:0,access:current.access,claims:current.claims}]});
        };
        batch.chain=batch.chain.then(work);await batch.chain;return result;
      }};
    },
  })});
}
