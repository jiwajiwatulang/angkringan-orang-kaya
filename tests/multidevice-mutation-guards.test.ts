import 'fake-indexeddb/auto';
import {test} from 'node:test';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {environment,owner,auth,requestProof} from './multideviceFixtures';
import {testDeviceProof} from './securityFixtures';
import {createPairing,requestPairing,approvePairing,saveEmployee,employeeLogin} from '../src/lib/server/multideviceAccess';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';
import type {AccessClaims} from '../src/lib/multidevice/protocol';
import {setPosScope} from '../src/lib/multidevice/posWire';

test('HTTP cashier mutations cannot forge collections, stock, verification or deletion; legitimate owner workflows survive',async()=>{
 const env=await environment(),o=await owner(env);
 process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
 const selected=JSON.stringify({storeId:o.claims.storeId,deviceId:o.id});
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>key==='sakunota_pos_partition'?selected:null}});
 const {db}=await import('../src/lib/dexie');
 const {importPosEntities}=await import('../src/lib/multidevice/posSync');
 const {handleMultiDevice}=await import('../src/lib/server/multideviceHttp');
 const api=await import('../src/lib/api');
 const inventory=await import('../src/lib/inventory');
 const flush=async()=>{for(const row of await db.table('posOutbox').orderBy('ordinal').toArray()){await submitEvent(env.DB,row.claims,row.event);await db.table('posOutbox').delete(row.id);}};
 const all=async()=>(await pullEntities(env.DB,o.claims,0)).entities;
 try{
  setPosScope({claims:o.claims,access:o.access,operatorName:'Pemilik'});
  await db.table('settings').put({key:'pos_store_settings',value:{storeName:'Isolated Audit',businessType:'retail',enableTax:false,enableService:false}});
  const product=Number(await api.createMenu({nama:'Barang Uji',harga:10000,kategori:'Retail',modifiers:[]}));
  const tracked=Number(await api.createMenu({nama:'Stok Terpisah',harga:5000,kategori:'Retail',modifiers:[]}));
  await inventory.configureStock(tracked,10);await flush();
  const pair=await createPairing(env,o.claims),deviceId=randomUUID(),employeeId=randomUUID();
  const request=()=>({code:pair.code,deviceId,deviceName:'Kasir Uji',proof:testDeviceProof('multi.pair',pair.code,deviceId)});
  await requestPairing(env,request());await approvePairing(env,o.claims,pair.id);const joined=await requestPairing(env,request());if(joined.pending)throw new Error('Pairing failed');
  await saveEmployee(env,o.claims,{id:employeeId,name:'Karyawan Uji',pin:'482953',active:true});
  const c=await employeeLogin(env,joined.claims,{id:employeeId,pin:'482953'});
  await auth(env,c,'pull',{cursor:0});
  setPosScope({claims:c.claims,access:c.access,operatorName:'Karyawan Uji'});
  const shiftLocal=await api.openShift({operatorName:'Karyawan Uji',startingCash:0});await flush();
  const paidLocal=await api.createOrder({status:'paid',paymentMethod:'QRIS',total:10000,items:[{id:product,nama:'Barang Uji',harga:10000,qty:1}]});await flush();
  const unpaidLocal=await api.createOrder({status:'unpaid',total:10000,items:[{id:product,nama:'Barang Uji',harga:10000,qty:1}]});await flush();
  const paidRow=await db.table('orders').get(Number(paidLocal.id)),unpaidRow=await db.table('orders').get(Number(unpaidLocal.id)),shift=await db.table('shifts').get(Number(shiftLocal.id??shiftLocal)),stock=await db.table('menuItems').get(tracked);
  const common={mdStoreId:c.claims.storeId,mdDeviceId:c.claims.deviceId,mdOperatorId:employeeId};
  const row=(table:string,id:string,value:any,expectedVersion=0)=>({table,id,expectedVersion,value:{...common,mdId:id,mdVersion:expectedVersion+1,...value}});
  const post=async(rows:any[],session:{claims:AccessClaims;access:string}=c)=>{
    const id=randomUUID(),event:any={id,entityId:id,storeId:session.claims.storeId,deviceId:session.claims.deviceId,operatorId:session.claims.employeeId||session.claims.deviceId,kind:'pos.commit',data:{rows}};
    const data={event},response=await handleMultiDevice(new Request('https://test.invalid/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send',data,access:session.access,proof:requestProof('send',session.claims,session.access,data)})}),env);
    return {status:response.status,data:await response.json()};
  };
  const eventCount=async()=>env.DB.prepare('SELECT count(*) n FROM MdEvents').first<number>('n');
  const baseline=await eventCount();
  const fakePayment=randomUUID();
  assert.equal((await post([row('payments',fakePayment,{orderId:unpaidRow.mdId,shiftId:shift.mdId,status:'refunded',amount:10000,paymentMethod:'QRIS',mdRefundAmount:0,paidAt:new Date().toISOString()})])).status,403);
  assert.equal((await post([row('inventoryMovements',randomUUID(),{orderId:unpaidRow.mdId,menuItemId:stock.mdId,type:'return',delta:100,balance:110,timestamp:new Date().toISOString()})])).status,409);
  assert.equal((await post([
    row('inventoryMovements',randomUUID(),{orderId:unpaidRow.mdId,menuItemId:stock.mdId,type:'return',delta:100}),
    row('inventoryMovements',randomUUID(),{orderId:unpaidRow.mdId,menuItemId:stock.mdId,type:'sale',delta:-100})
  ])).status,409);
  const unpaidCanonical=(await all()).find(e=>e.kind==='pos_orders'&&e.id===unpaidRow.mdId)!.value;
  assert.equal((await post([row('orders',String(unpaidCanonical.mdId),{...unpaidCanonical,isHistorical:true,mdVersion:Number(unpaidCanonical.mdVersion)+1},Number(unpaidCanonical.mdVersion))])).status,403);
  let entities=await all();
  const payment=entities.find(e=>e.kind==='pos_payments'&&e.value.orderId===paidRow.mdId)!.value;
  assert.equal((await post([row('payments',String(payment.mdId),{...payment,proofStatus:'terverifikasi',mdVersion:Number(payment.mdVersion)+1},Number(payment.mdVersion))])).status,403);
  // Both cashier and owner must use reversals rather than erasing accepted financial history.
  for(const entity of entities.filter(e=>['pos_orders','pos_payments','pos_shifts','pos_inventoryMovements','pos_auditLogs'].includes(e.kind))){
    const value=entity.value,mutation=row(entity.kind.slice(4),entity.id,{...value,mdDeleted:true,mdVersion:Number(value.mdVersion)+1},Number(value.mdVersion));
    assert.equal((await post([mutation])).status,403);
    assert.equal((await post([mutation],o)).status,403);
  }
  assert.equal(await eventCount(),baseline);
  entities=await all();
  assert.equal(entities.find(e=>e.kind==='pos_menuItems'&&e.id===stock.mdId)!.value.stockQty,10);
  assert.equal(entities.filter(e=>e.kind==='pos_payments').length,1);
  assert.equal(entities.find(e=>e.kind==='pos_payments'&&e.id===payment.mdId)!.value.proofStatus,'menunggu_bukti');
  assert.equal(entities.filter(e=>e.kind==='pos_orders'&&!e.value.mdDeleted).length,2);
  // A forged aggregate is ignored; verification comes from accepted payment state.
  const canonical=entities.find(e=>e.kind==='pos_orders'&&e.id===paidRow.mdId)!.value;
  assert.equal((await post([row('orders',String(canonical.mdId),{...canonical,verificationStatus:'terverifikasi',mdVersion:Number(canonical.mdVersion)+1},Number(canonical.mdVersion))])).status,200);
  assert.equal((await all()).find(e=>e.kind==='pos_orders'&&e.id===canonical.mdId)!.value.verificationStatus,'menunggu_bukti');
  await importPosEntities(db,await all(),0);
  // An ordinary unpaid quantity correction returns exactly one tracked unit.
  const trackedNote=await api.createOrder({status:'unpaid',total:10000,items:[{id:tracked,nama:'Stok Terpisah',harga:5000,qty:2}]});await flush();
  await api.updateOrder(Number(trackedNote.id),{status:'unpaid',total:5000,subtotal:5000,items:[{id:tracked,nama:'Stok Terpisah',harga:5000,qty:1}]});await flush();
  assert.equal((await all()).find(e=>e.kind==='pos_menuItems'&&e.id===stock.mdId)!.value.stockQty,9);
  // Cashier uploads proof, owner confirms it, and only the owner refunds the original payment.
  const uploaded=await api.uploadPaymentProof({paymentId:Number((await db.table('payments').toArray())[0].id),orderId:Number(paidLocal.id),imageData:'data:image/png;base64,AAAA',fileName:'proof.png',fileSize:3,mimeType:'image/png',operator:'Kasir'});await flush();
  setPosScope({claims:o.claims,access:o.access,operatorName:'Pemilik'});
  await api.verifyPaymentProof(uploaded.proofId,{operator:'Pemilik'});await flush();
  assert.equal((await all()).find(e=>e.kind==='pos_payments'&&e.id===payment.mdId)!.value.proofStatus,'terverifikasi');
  await api.openShift({operatorName:'Pemilik',startingCash:0});await flush();
  await api.refundPartialPayment(Number((await db.table('payments').toArray())[0].id),{reason:'Koreksi oleh pemilik',operator:'Pemilik'});await flush();
  const refunded=(await all()).find(e=>e.kind==='pos_payments'&&e.id===payment.mdId)!.value;
  assert.equal(refunded.status,'refunded');assert.equal(refunded.mdRefundAmount,10000);
  await api.voidOrder(Number(trackedNote.id),'Batal pesanan belum dibayar');await flush();
  assert.equal((await all()).find(e=>e.kind==='pos_menuItems'&&e.id===stock.mdId)!.value.stockQty,10);
 }finally{setPosScope(undefined);await db.delete();delete (globalThis as any).localStorage;}
});
