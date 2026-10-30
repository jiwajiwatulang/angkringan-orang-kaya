import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {environment,owner} from './multideviceFixtures';
import {setPosScope} from '../src/lib/multidevice/posWire';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';

test('whole file aborts at receipt 105, stays invisible to concurrent sender, and commits as one event',{timeout:30000},async()=>{
  const env=await environment(),o=await owner(env);process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
  const values=new Map([['sakunota_pos_partition',JSON.stringify({storeId:o.claims.storeId,deviceId:o.id})]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
  const {db}=await import('../src/lib/dexie'),api=await import('../src/lib/api');
  setPosScope({claims:o.claims,access:o.access,operatorName:'Pemilik'});await db.open();
  const observer=new Dexie(db.name);await observer.open();
  const rows=Array.from({length:120},(_,i)=>({receiptNumber:`OLD-${i}`,createdAt:new Date(Date.UTC(2025,0,1,0,i)).toISOString(),total:30000,paymentMethod:'Cash' as const,items:[{nama:'Nota lama',qty:1,harga:30000}]}));
  const snapshot=()=>Promise.all(['orders','orderItems','payments','auditLogs','posOutbox','posIds','posMeta'].map(t=>db.table(t).toArray())).then(JSON.stringify);
  try{
    const before=await snapshot();let count=0,visible:Promise<unknown[]>|undefined;
    const fail=()=>{count++;if(count===100)visible=observer.table('posOutbox').toArray();if(count===105)throw new Error('Failure at receipt 105');};
    db.table('orders').hook('creating',fail);
    try{await assert.rejects(api.importHistoricalTransactions(rows),/Failure at receipt 105/);}
    finally{db.table('orders').hook('creating').unsubscribe(fail);}
    assert.equal(count,105);assert.deepEqual(await visible,[],'uncommitted deliveries cannot be sent');
    assert.equal(await snapshot(),before,'all merchant and delivery records abort together');
    await assert.rejects(api.importHistoricalTransactions(Array.from({length:200},(_,i)=>({...rows[i%120],receiptNumber:`BIG-${i}`}))),/Pisahkan nota/);
    assert.equal(await snapshot(),before,'oversized file rejected before writing');
    assert.equal((await api.importHistoricalTransactions(rows)).importedCount,120);
    const pending=await db.table('posOutbox').toArray();assert.equal(pending.length,1);assert.equal(pending[0].event.data.rows.length,361);
    const bad=structuredClone(pending[0].event);bad.data.rows.filter((r:any)=>r.table==='payments').at(-1)!.value.amount=30001;
    await assert.rejects(submitEvent(env.DB,o.claims,bad));
    assert.equal((await pullEntities(env.DB,o.claims,0)).entities.filter(e=>e.kind==='pos_orders').length,0,'server failure leaves no partial receipts');
    await submitEvent(env.DB,o.claims,pending[0].event);assert.equal((await submitEvent(env.DB,o.claims,pending[0].event)).duplicate,true);
    await db.table('posOutbox').delete(pending[0].id);
    const remote=(await pullEntities(env.DB,o.claims,0)).entities;
    assert.equal(remote.filter(e=>e.kind==='pos_orders').length,120);assert.equal(remote.filter(e=>e.kind==='pos_payments').length,120);
    assert.equal((await api.importHistoricalTransactions(rows)).skippedCount,120);assert.equal(await db.table('posOutbox').count(),0);
  }finally{observer.close();setPosScope(undefined);await db.delete();}
});
