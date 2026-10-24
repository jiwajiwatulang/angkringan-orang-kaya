import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {randomUUID} from 'node:crypto';
import {PosSynchronizer,importPosEntities} from '../src/lib/multidevice/posSync';
import {DeviceClient} from '../src/lib/multidevice/client';
import {AccessError,type AccessClaims} from '../src/lib/multidevice/protocol';
import {POS_TABLES} from '../src/lib/multidevice/posWire';
import {isDemoMode} from '../src/lib/demoMode';
import {posPartition,posDatabaseName} from '../src/lib/multidevice/posPartition';
import {orderItemsToCart} from '../src/lib/orderCart';
import {resumeRecovery,stageRecovery} from '../src/lib/multidevice/recovery';

function database(){
  const db=new Dexie(`regression-${randomUUID()}`);
  db.version(1).stores(Object.fromEntries([...POS_TABLES.map(name=>[name,'++id']),['settings','key'],['posOutbox','id,ordinal'],['posMeta','key'],['posIds','key']]));
  return db;
}
const claims:AccessClaims={version:1,storeId:'a'.repeat(64),deviceId:'cashier-device-12345',deviceKey:'test-key',role:'cashier',deviceEpoch:1,issuedAt:Date.now()-1000,expiresAt:Date.now()+3600000,employeeId:'employee-B-123456'};

test('explicit and retained demo context bypass a paired partition without removing its identity',()=>{
  const names=['window','localStorage','sessionStorage'] as const;
  const prior=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name));
  const flag=process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE;
  process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
  let search='?demo=true',retained=false;
  const saved=JSON.stringify({storeId:claims.storeId,deviceId:claims.deviceId});
  try{
    Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{get search(){return search;}}}});
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>saved}});
    Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:()=>retained?'true':null}});
    assert.equal(isDemoMode(),true);assert.equal(posPartition(),undefined);assert.equal(posDatabaseName(),undefined);
    search='';retained=true;assert.equal(isDemoMode(),true);assert.equal(posPartition(),undefined);
    retained=false;assert.equal(isDemoMode(),false);assert.equal(posPartition()?.storeId,claims.storeId);
    assert.equal(posDatabaseName(),`SakuNotaPOS-${claims.storeId}-${claims.deviceId}`);
  }finally{
    names.forEach((name,i)=>{if(prior[i])Object.defineProperty(globalThis,name,prior[i]!);else delete (globalThis as any)[name];});
    if(flag===undefined)delete process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE;else process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE=flag;
  }
});

test('an expired prior employee cannot block the current employee or overwrite retained offline work',async()=>{
  const db=database(),original=DeviceClient.prototype.send;
  const old={...claims,employeeId:'employee-A-123456',expiresAt:Date.now()-1000};
  const row=(id:string,ordinal:number,c:AccessClaims)=>({id,ordinal,attempts:0,access:'test-access',claims:c,event:{id,operatorId:c.employeeId}});
  const pending=[row('old-event-12345678',1,old),row('old-dependent-12345678',2,old),row('new-event-12345678',3,claims)];
  const sent:string[]=[];let pulls=0;
  try{
    await db.table('posOutbox').bulkAdd(pending);
    DeviceClient.prototype.send=async function(event:any){sent.push(event.id);if(this.claims.employeeId===old.employeeId)throw new AccessError('Expired employee',401);return {id:event.id,sequence:1};};
    const client=new DeviceClient('test-access',claims);client.pull=async()=>{pulls++;return {cursor:0,entities:[],hasMore:false};};
    await new PosSynchronizer(db,client).synchronize();
    assert.deepEqual(sent,[pending[0].id,pending[2].id]);assert.equal(pulls,1);assert.equal(await db.table('posMeta').get('cursor'),undefined);
    const retained=await db.table('posOutbox').orderBy('ordinal').toArray();
    assert.equal(retained.length,2);assert.equal(retained[0].needsRecovery,true);assert.deepEqual(retained.map(r=>r.event),pending.slice(0,2).map(r=>r.event));
    // Login as A again retries with A's fresh grant, never with B's identity.
    const fresh=new DeviceClient('fresh-access',{...old,expiresAt:Date.now()+3600000});
    DeviceClient.prototype.send=async function(event:any){assert.equal(this.snapshot().access,'fresh-access');return {id:event.id,sequence:1};};
    fresh.pull=client.pull;await new PosSynchronizer(db,fresh).synchronize();
    assert.equal(await db.table('posOutbox').count(),0);assert.equal(pulls,2);
    await db.table('posOutbox').put(pending[2]);
    DeviceClient.prototype.send=async()=>{throw new AccessError('Current access revoked',403);};
    await assert.rejects(()=>new PosSynchronizer(db,client).synchronize(),(e:any)=>e.status===403);
    assert.equal((await db.table('posOutbox').get(pending[2].id)).needsRecovery,false);
    await db.table('posOutbox').clear();await db.table('posOutbox').put(pending[0]);
    DeviceClient.prototype.send=async()=>{throw new AccessError('Old employee expired',401);};
    client.pull=async()=>{throw new AccessError('Current device revoked',403);};
    await assert.rejects(()=>new PosSynchronizer(db,client).synchronize(),(e:any)=>e.status===403);
    assert.equal(await db.table('posOutbox').count(),1);

  }finally{DeviceClient.prototype.send=original;await db.delete();}
});

test('imported unpaid Retail lines retain independent edits and their drafts when merged into a receipt',async()=>{
  const db=database();
  try{
    await importPosEntities(db,[{kind:'pos_orders',id:'order-draft-123456',value:{total:5000,status:'unpaid'}},...['Kopi','Teh'].map((nama,index)=>({kind:'pos_orderItems',id:`draft-line-${index}-123456`,value:{orderId:'order-draft-123456',menuItemId:null,namaMenu:nama,hargaSatuan:2000+index*1000,qty:1,pendingRetailProduct:{nama,harga:2000+index*1000}}}))],1);
    const items=await db.table('orderItems').toArray(),cart=orderItemsToCart(items,[]);
    assert.equal(new Set(cart.map(i=>i.itemKey)).size,2);assert.equal(new Set(cart.map(i=>i.id)).size,2);
    const edited=cart.map(item=>item.itemKey===cart[0].itemKey?{...item,qty:3}:item);
    assert.deepEqual(edited.map(i=>i.qty),[3,1]);assert.equal(edited.filter(i=>i.itemKey!==cart[0].itemKey)[0].nama,'Teh');
    assert.deepEqual(orderItemsToCart(items,[]),cart);assert.ok(cart.every(i=>i.pendingRetailProduct&&i.id<0));
  }finally{await db.delete();}
});

test('recovering a locally pending event clears only that acknowledged event and resumes safely after lost response',async()=>{
  const db=database(),c={...claims,role:'owner' as const},id=randomUUID();
  const event:any={id,entityId:id,kind:'pos.commit',storeId:c.storeId,deviceId:c.deviceId,operatorId:c.deviceId,data:{rows:[{table:'orders',id,expectedVersion:0,value:{mdId:id,mdStoreId:c.storeId,mdVersion:1,status:'unpaid',total:5000}}]}};
  const archive={version:1,storeId:c.storeId,deviceId:c.deviceId,outbox:[{id,ordinal:1,attempts:0,event}]};
  try{
    await db.table('orders').add({total:5000,status:'paid'});
    await db.table('posOutbox').put({...archive.outbox[0],access:'never-export',claims:c});
    await stageRecovery(db,c,archive);
    let calls=0;
    await assert.rejects(()=>resumeRecovery(db,c,async()=>{calls++;throw new Error('lost ack');}));
    assert.equal(await db.table('posOutbox').count(),1);
    await resumeRecovery(db,c,async value=>{calls++;return {id:value.id,sequence:1};});
    assert.equal(calls,2);assert.equal(await db.table('posOutbox').count(),0);assert.equal(await db.table('orders').count(),1);
    assert.equal(await db.table('settings').get('recoveryJob'),undefined);
  }finally{await db.delete();}
});
