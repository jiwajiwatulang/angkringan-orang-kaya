import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Dexie from 'dexie';
import {LocalReplica,replicaDatabase,type Transport} from '../src/lib/multidevice/replica';
import {environment,owner} from './multideviceFixtures';
import {testPublicJwk} from './securityFixtures';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';
import {startStoreUpdates} from '../src/lib/multidevice/automaticUpdates';

test('pending writes survive reopening, retain dependency order, and a lost acknowledgment never duplicates data',async()=>{
  const env=await environment(),o=await owner(env),p=crypto.randomUUID();
  const open=async()=>{const db=replicaDatabase(o.claims.storeId,o.id);const replica=new LocalReplica(db,o.claims.storeId,o.id,o.claims.deviceKey,testPublicJwk);await replica.useAccess(o.access);return replica;};
  let r=await open();
  await r.enqueue('catalog.put',p,{expectedVersion:0,name:'Teh',price:5000,cost:2000,unit:'pcs',priceBasis:1,active:true});
  const shift=crypto.randomUUID(),order=crypto.randomUUID(),payment=crypto.randomUUID();
  await r.enqueue('shift.open',shift,{startingCash:0});
  await r.enqueue('order.create',order,{shiftId:shift,lines:[{productId:p,catalogVersion:1,name:'Teh',quantity:1,unit:'pcs',price:5000,priceBasis:1}]});
  await r.enqueue('payment.record',payment,{orderId:order,shiftId:shift,amount:5000,method:'Cash'});
  assert.equal((await r.status()).pending,4);r.db.close();r=await open();
  let loseResponse=true;
  const transport:Transport={send:async e=>{const ack=await submitEvent(env.DB,o.claims,e);if(loseResponse){loseResponse=false;throw new Error('connection lost after commit');}return ack;},pull:cursor=>pullEntities(env.DB,o.claims,cursor)};
  await assert.rejects(()=>r.synchronize(transport));assert.equal((await r.status()).pending,4);
  await r.synchronize(transport);assert.equal((await r.status()).pending,0);
  assert.equal(await env.DB.prepare('SELECT count(*) n FROM MdEvents').first<number>('n'),4);
  assert.equal((await r.db.table('entities').get(['order',order])).value.paid,5000);
  const backup=JSON.stringify(await r.exportData());assert.equal(/privateKey|verifier|SNMD1|pinDigest/.test(backup),false);
  await r.db.delete();
});
test('failed local operation commits neither changes nor a delivery intent',async()=>{
  const env=await environment(),o=await owner(env),db=replicaDatabase(o.claims.storeId,o.id),r=new LocalReplica(db,o.claims.storeId,o.id,o.claims.deviceKey,testPublicJwk);await r.useAccess(o.access);
  await assert.rejects(()=>r.enqueue('payment.record',crypto.randomUUID(),{orderId:crypto.randomUUID(),shiftId:crypto.randomUUID(),amount:5000,method:'Cash'}));
  assert.equal((await r.status()).pending,0);assert.equal(await db.table('entities').count(),0);await db.delete();
});
test('late pull cannot overwrite a sale queued while data is downloading',async()=>{
  const env=await environment(),o=await owner(env),db=replicaDatabase(o.claims.storeId,o.id),r=new LocalReplica(db,o.claims.storeId,o.id,o.claims.deviceKey,testPublicJwk);await r.useAccess(o.access);
  const id=crypto.randomUUID();
  await r.synchronize({send:async()=>{throw new Error();},pull:async()=>{
    await r.enqueue('catalog.put',id,{expectedVersion:0,name:'Lokal',price:5000,cost:null,unit:'pcs',priceBasis:1,active:true});
    return {cursor:2,hasMore:false,entities:[{kind:'catalog',id,value:{name:'Lama'}}]};
  }});
  assert.equal((await db.table('entities').get(['catalog',id])).value.name,'Lokal');assert.equal((await r.status()).pending,1);await db.delete();
});
test('a demo database cannot be attached to merchant replication',async()=>{
  const env=await environment(),o=await owner(env);
  assert.throws(()=>new LocalReplica(new Dexie('SakuNotaDemoDB'),o.claims.storeId,o.id,o.claims.deviceKey,testPublicJwk));
});
test('automatic updates resume pending data when connectivity returns',async()=>{
  const env=await environment(),o=await owner(env),db=replicaDatabase(o.claims.storeId,o.id),r=new LocalReplica(db,o.claims.storeId,o.id,o.claims.deviceKey,testPublicJwk);await r.useAccess(o.access);
  let online=false,listener=()=>{},ready=()=>{},finished=()=>{};
  const initial=new Promise<void>(resolve=>{ready=resolve;}),complete=new Promise<void>(resolve=>{finished=resolve;});
  const stop=startStoreUpdates(r,{send:event=>submitEvent(env.DB,o.claims,event),pull:cursor=>pullEntities(env.DB,o.claims,cursor)},status=>{if(!status.online)ready();if(status.online&&status.pending===0&&!status.failed)finished();},{online:()=>online,subscribe:callback=>{listener=callback;return()=>{listener=()=>{};};}});
  let timeout:ReturnType<typeof setTimeout>|undefined;
  try{
    await initial;await r.enqueue('catalog.put',crypto.randomUUID(),{expectedVersion:0,name:'Teh',price:5000,cost:null,unit:'pcs',priceBasis:1,active:true});
    assert.equal((await r.status()).pending,1);online=true;listener();
    await Promise.race([complete,new Promise<void>((_,reject)=>{timeout=setTimeout(()=>reject(new Error('automatic update did not finish')),3000);})]);
    assert.equal((await r.status()).pending,0);assert.equal(await env.DB.prepare('SELECT count(*) n FROM MdEvents').first<number>('n'),1);
  }finally{if(timeout)clearTimeout(timeout);stop();await db.delete();}
});
