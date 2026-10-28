import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {test} from 'node:test';
import assert from 'node:assert/strict';

test('upgrading an existing paired store retains receipts, pending deliveries, identifiers and cursor',async()=>{
  process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
  const storeId="a".repeat(64),deviceId=crypto.randomUUID(),name=`SakuNotaPOS-${storeId}-${deviceId}`;
  Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>k==='sakunota_pos_partition'?JSON.stringify({storeId,deviceId}):null},configurable:true});
  const old=new Dexie(name);
  old.version(12).stores({menuItems:'++id,sku,nama,kategori,isSoldOut,urutan',tables:'++id,nomor,status',orders:'++id,shiftId,idempotencyKey,tableId,status,verificationStatus,createdAt',orderItems:'++id,orderId,menuItemId',payments:'++id,orderId,shiftId,paymentMethod,status,proofStatus,paidAt',paymentProofs:'++id,paymentId,orderId,status,uploadedAt',auditLogs:'++id,orderId,action,timestamp',shifts:'++id,status,startTime,operatorName',cashMovements:'++id,shiftId,type,timestamp',inventoryMovements:'++id,menuItemId,orderId,type,timestamp',settings:'key',posOutbox:'id,ordinal',posMeta:'key',posIds:'key'});
  const pending={id:'keep-pending',ordinal:5,event:{id:'keep-pending',data:{rows:[]}}};
  await old.table('orders').put({id:7,total:12345,status:'paid'});await old.table('posOutbox').put(pending);await old.table('posMeta').put({key:'cursor',value:42});await old.table('posIds').put({key:'orders:receipt',value:7});old.close();
  const {db}=await import('../src/lib/dexie');
  try{assert.equal(await db.table('operations').count(),0);assert.deepEqual(await db.table('posOutbox').get(pending.id),pending);assert.equal((await db.table('orders').get(7)).total,12345);assert.equal((await db.table('posMeta').get('cursor')).value,42);assert.equal((await db.table('posIds').get('orders:receipt')).value,7);}finally{await db.delete();}
});
