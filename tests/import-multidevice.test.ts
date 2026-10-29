import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {environment,owner} from './multideviceFixtures';
import {setPosScope} from '../src/lib/multidevice/posWire';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';

test('catalog import syncs once; oversized and unsupported historical imports preserve records and outbox',{timeout:30000},async()=>{
  const env=await environment(),o=await owner(env);process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
  const values=new Map([['sakunota_pos_partition',JSON.stringify({storeId:o.claims.storeId,deviceId:o.id})]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value),removeItem:(key:string)=>values.delete(key)}});
  const {db}=await import('../src/lib/dexie'),api=await import('../src/lib/api');
  setPosScope({claims:o.claims,access:o.access,operatorName:'Pemilik'});
  const flush=async()=>{for(const row of await db.table('posOutbox').orderBy('ordinal').toArray()){await submitEvent(env.DB,o.claims,row.event);assert.equal((await submitEvent(env.DB,o.claims,row.event)).duplicate,true);await db.table('posOutbox').delete(row.id);}};
  try{
    await api.bulkImportMenus([{sku:'001234',nama:'Kopi',harga:12000,trackStock:true,stockQty:20}],{mode:'upsert'});await flush();
    const before=JSON.stringify(await Promise.all(['menuItems','inventoryMovements','auditLogs','posOutbox'].map(name=>db.table(name).toArray())));
    await assert.rejects(api.bulkImportMenus(Array.from({length:601},(_,i)=>({sku:'BIG-'+i,nama:'Produk '+i,harga:1000})),{mode:'upsert'}),/Terlalu banyak/);
    assert.equal(JSON.stringify(await Promise.all(['menuItems','inventoryMovements','auditLogs','posOutbox'].map(name=>db.table(name).toArray()))),before,'oversized atomic capture rolled back including pending events');
    const row={receiptNumber:'OLD-1',createdAt:'2025-01-01T12:00:00Z',total:12000,paymentMethod:'Cash' as const,items:[{nama:'Nota Lama',qty:1,harga:12000}]};
    const historyBefore=JSON.stringify(await Promise.all(['orders','orderItems','payments','auditLogs','posOutbox'].map(name=>db.table(name).toArray())));
    await assert.rejects(api.importHistoricalTransactions([row]),/belum tersedia saat dua perangkat/);
    assert.equal(JSON.stringify(await Promise.all(['orders','orderItems','payments','auditLogs','posOutbox'].map(name=>db.table(name).toArray()))),historyBefore);
    const entities=(await pullEntities(env.DB,o.claims,0)).entities;
    assert.equal(entities.filter(e=>e.kind==='pos_orders').length,0);
    assert.equal(entities.filter(e=>e.kind==='pos_payments').length,0);
    assert.equal(entities.find(e=>e.kind==='pos_menuItems')?.value.stockQty,20);
    assert.equal(await db.table('posOutbox').count(),0);
  }finally{setPosScope(undefined);await db.delete();}
});
