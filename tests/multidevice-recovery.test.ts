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

test('invalid recovery structure is rejected before staging; cancellation retains pending data and permits a replacement',async()=>{
  const {cancelRecovery}=await import('../src/lib/multidevice/recovery');
  const env=await environment(),session=await owner(env),db=replicaDatabase(session.claims.storeId,session.id);
  try{
    const id=crypto.randomUUID(),event:any={id,entityId:id,kind:'pos.commit',storeId:session.claims.storeId,deviceId:session.id,operatorId:session.id,data:{rows:[]}};
    const archive={version:1,storeId:session.claims.storeId,deviceId:session.id,outbox:[{id,ordinal:1,attempts:0,event}]};
    await assert.rejects(()=>stageRecovery(db,session.claims,archive));
    assert.equal(await db.table('settings').get('recoveryJob'),undefined);
    // A legacy, permanently rejected job must remain cancellable after upgrade.
    await db.table('settings').put({key:'recoveryJob',value:{archive,index:0}});
    await assert.rejects(()=>cancelRecovery(db,{...session.claims,role:'cashier'}));
    const original=await cancelRecovery(db,session.claims);
    assert.deepEqual(original,archive);
    const retained=await db.table('settings').where('key').startsWith('recoveryCancelled:').toArray();
    assert.equal(retained.length,1);assert.deepEqual(retained[0].value.archive,archive);
    assert.equal(await db.table('settings').get('recoveryJob'),undefined);
    await stageRecovery(db,session.claims,{...archive,outbox:[]});
    await resumeRecovery(db,session.claims,async()=>{throw new Error('empty archive must not send');});
    assert.equal(await db.table('settings').get('recoveryJob'),undefined);
  }finally{await db.delete();}
});

test('an in-flight recovery cannot resurrect a cancelled job or erase its replacement',async()=>{
  const {cancelRecovery}=await import('../src/lib/multidevice/recovery');
  const env=await environment(),session=await owner(env),db=replicaDatabase(session.claims.storeId,session.id);
  try{
    const id=crypto.randomUUID(),event:any={id,entityId:id,kind:'shift.open',storeId:session.claims.storeId,deviceId:session.id,operatorId:session.id,data:{startingCash:0}};
    const archive={version:1,storeId:session.claims.storeId,deviceId:session.id,outbox:[{id,ordinal:1,attempts:0,event}]};
    await stageRecovery(db,session.claims,archive);
    let release!:(value:{id:string;sequence:number})=>void,started!:()=>void;
    const pending=new Promise<{id:string;sequence:number}>(resolve=>{release=resolve;}),sending=new Promise<void>(resolve=>{started=resolve;});
    const running=resumeRecovery(db,session.claims,async()=>{started();return pending;});
    const rejected=assert.rejects(()=>running,(e:any)=>e.status===409);
    await sending;await cancelRecovery(db,session.claims);
    await stageRecovery(db,session.claims,{...archive,outbox:[]});
    const next=(await db.table('settings').get('recoveryJob')).value;
    release({id,sequence:1});await rejected;
    assert.deepEqual((await db.table('settings').get('recoveryJob')).value,next);
    await resumeRecovery(db,session.claims,async()=>{throw new Error('replacement is empty');});
    assert.equal(await db.table('settings').get('recoveryJob'),undefined);
  }finally{await db.delete();}
});
