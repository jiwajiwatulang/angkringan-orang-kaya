import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {environment,owner,auth} from './multideviceFixtures';
import {testDeviceProof,testPublicJwk} from './securityFixtures';
import {createPairing,requestPairing,approvePairing,saveEmployee,employeeLogin,revokeDevice} from '../src/lib/server/multideviceAccess';
import {LocalReplica,replicaDatabase,type Transport} from '../src/lib/multidevice/replica';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';
import type {AccessClaims} from '../src/lib/multidevice/protocol';

async function setup(){
  const env=await environment(),o=await owner(env),pair=await createPairing(env,o.claims),deviceId=crypto.randomUUID(),employee=crypto.randomUUID();
  const request=()=>({code:pair.code,deviceId,deviceName:'Tablet Kasir',proof:testDeviceProof('multi.pair',pair.code,deviceId)});
  await requestPairing(env,request());await approvePairing(env,o.claims,pair.id);
  const cashier=await requestPairing(env,request());if(cashier.pending)throw new Error();
  await saveEmployee(env,o.claims,{id:employee,name:'Kasir Pagi',pin:'482953',active:true});
  const e=await employeeLogin(env,cashier.claims,{id:employee,pin:'482953'});
  const ownerDb=replicaDatabase(o.claims.storeId,o.id),cashierDb=replicaDatabase(o.claims.storeId,deviceId);
  const a=new LocalReplica(ownerDb,o.claims.storeId,o.id,o.claims.deviceKey,testPublicJwk),b=new LocalReplica(cashierDb,o.claims.storeId,deviceId,e.claims.deviceKey,testPublicJwk);
  await a.useAccess(o.access);await b.rememberEmployee({id:employee,access:e.access,verifier:e.offlineVerifier,name:e.name});await b.loginOffline(employee,'482953');
  const transport=(claims:AccessClaims):Transport=>({send:event=>submitEvent(env.DB,claims,event),pull:cursor=>pullEntities(env.DB,claims,cursor)});
  return {env,o,e,a,b,employee,transport,cashier};
}
test('two isolated local stores sell concurrently, owner may stay offline, cashier cost data and owner actions stay private',async()=>{
  const {env,o,e,a,b,transport}=await setup(),product=crypto.randomUUID();
  try{
    assert.notEqual(a.db.name,b.db.name);
    await a.enqueue('catalog.put',product,{expectedVersion:0,name:'Teh',price:5000,cost:2000,unit:'pcs',priceBasis:1,active:true});
    await a.enqueue('stock.adjust',product,{delta:10,reason:'Stok awal'});await a.synchronize(transport(o.claims));await b.synchronize(transport(e.claims));
    assert.equal((await b.db.table('entities').get(['catalog',product])).value.cost,undefined);
    const shifts=[crypto.randomUUID(),crypto.randomUUID()],orders=[crypto.randomUUID(),crypto.randomUUID()];
    await Promise.all([a.enqueue('shift.open',shifts[0],{startingCash:0}),b.enqueue('shift.open',shifts[1],{startingCash:0})]);
    const line={productId:product,catalogVersion:1,name:'Teh',quantity:1,unit:'pcs',price:5000,priceBasis:1};
    await Promise.all([a.enqueue('order.create',orders[0],{shiftId:shifts[0],lines:[line]}),b.enqueue('order.create',orders[1],{shiftId:shifts[1],lines:[line]})]);
    await Promise.all([a.enqueue('payment.record',crypto.randomUUID(),{orderId:orders[0],shiftId:shifts[0],amount:5000,method:'Cash'}),b.enqueue('payment.record',crypto.randomUUID(),{orderId:orders[1],shiftId:shifts[1],amount:5000,method:'Cash'})]);
    // Cashier sends while the owner's pending sale remains entirely local.
    await b.synchronize(transport(e.claims));assert.equal((await a.status()).pending,3);
    await a.synchronize(transport(o.claims));await b.synchronize(transport(e.claims));
    const final=(await pullEntities(env.DB,o.claims,0)).entities;
    assert.equal(final.filter(r=>r.kind==='order').length,2);
    assert.equal(final.filter(r=>r.kind==='payment').reduce((sum,r)=>sum+Number(r.value.amount),0),10000);
    assert.equal(final.find(r=>r.kind==='stock'&&r.id===product)!.value.quantity,8);
    const cashier=await pullEntities(env.DB,e.claims,0);
    assert.equal(cashier.entities.filter(r=>r.kind==='order').length,1);
    assert.equal(JSON.stringify(cashier).includes('"cost"'),false);
    await assert.rejects(()=>b.enqueue('stock.adjust',product,{delta:1,reason:'Tidak boleh'}));
    await assert.rejects(()=>b.enqueue('catalog.put',product,{expectedVersion:1,name:'Teh',price:1,cost:0,unit:'pcs',priceBasis:1,active:true}));
    await assert.rejects(()=>b.exportData());
    await revokeDevice(env,o.claims,b.deviceId);await assert.rejects(()=>submitEvent(env.DB,e.claims,{id:crypto.randomUUID(),storeId:e.claims.storeId,deviceId:e.claims.deviceId,operatorId:e.claims.employeeId!,kind:'order.create',entityId:crypto.randomUUID(),data:{shiftId:shifts[1],lines:[line]}}));
  }finally{await a.db.delete();await b.db.delete();}
});
test('offline PIN cannot be rewritten, guessed repeatedly or used on another device',async()=>{
  const {a,b,e,employee}=await setup();
  try{
    b.logout();
    const credential=await b.db.table('credentials').get(employee);
    await b.db.table('credentials').put({...credential,verifier:'{"v":1,"hash":"changed"}'});
    await assert.rejects(()=>b.loginOffline(employee,'482953'));
    await b.db.table('credentials').put(credential);
    assert.ok(await b.loginOffline(employee,'482953'));
    b.logout();for(let i=0;i<5;i++) await assert.rejects(()=>b.loginOffline(employee,'000000'));
    await assert.rejects(()=>b.loginOffline(employee,'482953'),/5 menit/);
    await assert.rejects(()=>a.useAccess(e.access));
  }finally{await a.db.delete();await b.db.delete();}
});
test('unbinding the original license closes old multi-device access',async()=>{
  const {env,o,e,a,b}=await setup();
  try{
    await env.DB.prepare('DELETE FROM LicenseDeviceKeys WHERE licenseKey=?').bind(o.key).run();
    await assert.rejects(()=>auth(env,o,'list'));
    await assert.rejects(()=>auth(env,e,'list'));
    await assert.rejects(()=>pullEntities(env.DB,e.claims,0));
  }finally{await a.db.delete();await b.db.delete();}
});
