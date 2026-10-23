import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {environment,owner,auth} from './multideviceFixtures';
import {testPublicJwk} from './securityFixtures';
import {LocalReplica,replicaDatabase} from '../src/lib/multidevice/replica';
import {submitEvent,recoverEvent,pullEntities} from '../src/lib/server/multideviceSync';
import {stageRecovery,resumeRecovery,validateArchive} from '../src/lib/multidevice/recovery';

test('replacement owner recovers original pending IDs without replaying accepted transactions or reviving the old device',async()=>{
  const env=await environment(),old=await owner(env),oldDb=replicaDatabase(old.claims.storeId,old.id),a=new LocalReplica(oldDb,old.claims.storeId,old.id,old.claims.deviceKey,testPublicJwk);await a.useAccess(old.access);
  const product=crypto.randomUUID(),shift=crypto.randomUUID(),orderId=crypto.randomUUID(),payment=crypto.randomUUID();
  const catalog=await a.enqueue('catalog.put',product,{expectedVersion:0,name:'Teh',price:5000,cost:2000,unit:'pcs',priceBasis:1,active:true});
  await a.enqueue('shift.open',shift,{startingCash:0});
  await a.enqueue('order.create',orderId,{shiftId:shift,lines:[{productId:product,catalogVersion:1,name:'Teh',quantity:1,unit:'pcs',price:5000,priceBasis:1}]});
  await a.enqueue('payment.record',payment,{orderId,shiftId:shift,amount:5000,method:'Cash'});
  await submitEvent(env.DB,old.claims,catalog); // Accepted before the old device lost the response.
  const backup=await a.exportData(),next=await owner(env,old.key,true);
  const newDb=replicaDatabase(next.claims.storeId,next.id);
  try{
    assert.equal(next.claims.storeId,old.claims.storeId);
    await assert.rejects(()=>auth(env,old,'list'));
    assert.equal(await stageRecovery(newDb,next.claims,{...backup,credentials:[{pin:'never-import'}],settings:[{privateKey:'never-import'}]}),4);
    let lost=false;
    const recover=async(event:typeof catalog)=>{
      const ack=await recoverEvent(env.DB,next.claims,event);
      if(event.kind==='order.create'&&!lost){lost=true;throw new Error('lost recovery response');}
      return ack;
    };
    await assert.rejects(()=>resumeRecovery(newDb,next.claims,recover));
    newDb.close();const reopened=replicaDatabase(next.claims.storeId,next.id);
    await resumeRecovery(reopened,next.claims,recover);
    assert.equal(await reopened.table('settings').get('recoveryJob'),undefined);
    assert.equal(await reopened.table('credentials').count(),0);
    assert.equal(await env.DB.prepare('SELECT count(*) n FROM MdEvents').first<number>('n'),4);
    assert.equal(await env.DB.prepare('SELECT count(*) n FROM MdDevices WHERE role=? AND revoked=0').bind('owner').first<number>('n'),1);
    const entities=(await pullEntities(env.DB,next.claims,0)).entities;
    assert.equal(entities.find(r=>r.kind==='order'&&r.id===orderId)!.value.paid,5000);
    const audits=await env.DB.prepare('SELECT authorizedBy FROM MdRecoveries').all<{authorizedBy:string}>();assert.equal(audits.results.length,3);assert.ok(audits.results.every(row=>row.authorizedBy===next.id));
    await assert.rejects(()=>submitEvent(env.DB,old.claims,{...catalog,id:crypto.randomUUID()}));
    await reopened.delete();
  }finally{await oldDb.delete();newDb.close();}
});
test('recovery rejects a different store, malformed order and cashier privilege escalation',async()=>{
  const env=await environment(),a=await owner(env),b=await owner(env),db=replicaDatabase(a.claims.storeId,a.id);
  try{
    assert.throws(()=>validateArchive({version:1,storeId:b.claims.storeId,deviceId:b.id,outbox:[]},a.claims.storeId));
    await assert.rejects(()=>stageRecovery(db,{...a.claims,role:'cashier'},{version:1,storeId:a.claims.storeId,deviceId:a.id,outbox:[]}));
    await assert.rejects(()=>recoverEvent(env.DB,{...a.claims,role:'cashier'},{} as never));
    assert.throws(()=>validateArchive({version:1,storeId:a.claims.storeId,deviceId:a.id,outbox:[{id:crypto.randomUUID(),ordinal:0,event:{}}]},a.claims.storeId));
  }finally{await db.delete();}
});
