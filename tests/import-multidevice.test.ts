import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {environment,owner} from './multideviceFixtures';
import {setPosScope} from '../src/lib/multidevice/posWire';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';

test('catalog import syncs once; historical imports are atomic, owner-only, safe, and sync without altering stock or active shifts',{timeout:30000},async()=>{
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

    const movementsBefore=await db.table('inventoryMovements').count();
    const row={receiptNumber:'OLD-1',createdAt:'2025-01-01T12:00:00Z',total:12000,paymentMethod:'Cash' as const,items:[{nama:'Nota Lama',qty:1,harga:12000}]};

    // 1. Cashier is rejected
    setPosScope({claims:{...o.claims,role:'cashier',employeeId:'emp-1'},access:o.access,operatorName:'Kasir'});
    await assert.rejects(api.importHistoricalTransactions([row]),/akses pemilik/);

    // 2. Owner imports successfully
    setPosScope({claims:o.claims,access:o.access,operatorName:'Pemilik'});
    const importRes=await api.importHistoricalTransactions([row]);
    assert.equal(importRes.importedCount,1);
    assert.equal(importRes.skippedCount,0);
    assert.equal(await db.table('orders').count(),1);
    assert.equal(await db.table('payments').count(),1);
    assert.equal(await db.table('orderItems').count(),1);

    // 3. PosOutbox receives event and syncs to server cleanly
    assert.ok((await db.table('posOutbox').count())>0);
    await flush();
    assert.equal(await db.table('posOutbox').count(),0);

    // 4. Server projected entities are correct and complete
    const entities=(await pullEntities(env.DB,o.claims,0)).entities;
    const orders=entities.filter(e=>e.kind==='pos_orders');
    const payments=entities.filter(e=>e.kind==='pos_payments');
    assert.equal(orders.length,1);
    assert.equal(payments.length,1);
    assert.equal(orders[0].value.total,12000);
    assert.equal(orders[0].value.paidAmount,12000);
    assert.equal(orders[0].value.isHistorical,true);
    // Stock is completely untouched
    assert.equal(entities.find(e=>e.kind==='pos_menuItems')?.value.stockQty,20);
    assert.equal(await db.table('inventoryMovements').count(),movementsBefore);
    assert.equal(await db.table('shifts').count(),0);

    // 5. Retry is idempotent, skips duplicate without error or duplicate write
    const retryRes=await api.importHistoricalTransactions([row]);
    assert.equal(retryRes.importedCount,0);
    assert.equal(retryRes.skippedCount,1);
    assert.equal(await db.table('orders').count(),1);
    assert.equal(await db.table('payments').count(),1);

    // 6. Conflicting transaction with different total fails with rollback
    await assert.rejects(api.importHistoricalTransactions([{...row,total:99000,items:[{nama:'Nota Lama',qty:1,harga:99000}]}]),/sudah ada dengan isi berbeda/);
    assert.equal(await db.table('orders').count(),1);
  }finally{setPosScope(undefined);await db.delete();}
});
