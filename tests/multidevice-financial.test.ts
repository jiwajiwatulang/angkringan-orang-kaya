import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {environment,owner} from './multideviceFixtures';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';
import type {AccessClaims,StoreEvent} from '../src/lib/multidevice/protocol';

function event(c:AccessClaims,kind:StoreEvent['kind'],entityId:string,data:Record<string,unknown>):StoreEvent{return {id:crypto.randomUUID(),storeId:c.storeId,deviceId:c.deviceId,operatorId:c.employeeId||c.deviceId,kind,entityId,data};}
test('offline old-price sale, payments, cross-shift refund and stock reconcile without altering the closed shift',async()=>{
  const env=await environment(),o=await owner(env),c=o.claims,product=crypto.randomUUID(),shift=crypto.randomUUID(),order=crypto.randomUUID(),payment=crypto.randomUUID();
  const send=(kind:StoreEvent['kind'],id:string,data:Record<string,unknown>)=>submitEvent(env.DB,c,event(c,kind,id,data));
  await send('catalog.put',product,{expectedVersion:0,name:'Beras',price:18000,cost:12000,unit:'g',priceBasis:1000,active:true});
  await send('stock.adjust',product,{delta:1000,reason:'Stok awal'});
  await send('shift.open',shift,{startingCash:100000});
  await send('catalog.put',product,{expectedVersion:1,name:'Beras',price:20000,cost:14000,unit:'g',priceBasis:1000,active:true});
  const sale=event(c,'order.create',order,{shiftId:shift,lines:[{productId:product,catalogVersion:1,name:'Beras',quantity:250,unit:'g',price:18000,priceBasis:1000}]});
  for(let i=0;i<10;i++) await submitEvent(env.DB,c,sale);
  const pay=event(c,'payment.record',payment,{orderId:order,shiftId:shift,amount:4500,method:'Cash'});
  for(let i=0;i<10;i++) await submitEvent(env.DB,c,pay);
  await assert.rejects(()=>send('payment.record',crypto.randomUUID(),pay.data),/melebihi/);
  await send('shift.close',shift,{actualCash:104500});
  const closed=(await pullEntities(env.DB,c,0)).entities.find(e=>e.kind==='shift'&&e.id===shift)!;
  const next=crypto.randomUUID();await send('shift.open',next,{startingCash:0});
  const refund=event(c,'refund.record',crypto.randomUUID(),{paymentId:payment,shiftId:next,amount:1800,reason:'Kembali 100 g',returns:[{line:0,quantity:100}]});
  for(let i=0;i<10;i++) await submitEvent(env.DB,c,refund);
  const entities=(await pullEntities(env.DB,c,0)).entities,get=(kind:string,id:string)=>entities.find(e=>e.kind===kind&&e.id===id)!.value;
  assert.deepEqual(get('shift',shift),closed.value);
  assert.equal(get('shift',next).cashRefunds,1800);
  assert.equal(get('stock',product).quantity,850);
  const note=get('order',order);assert.equal(note.total,4500);assert.equal(note.paid,4500);assert.equal(note.refunded,1800);
  assert.equal((note.lines as {cost:number}[])[0].cost,12000);
  await assert.rejects(()=>send('refund.record',crypto.randomUUID(),{...refund.data,amount:9999}),/melebihi/);
  await assert.rejects(()=>send('payment.record',crypto.randomUUID(),{...pay.data,shiftId:shift,amount:1}),/shift/);
});
test('concurrent writes do not lose a stock movement, and negative stock marks review instead of cancelling a sale',async()=>{
  const env=await environment(),o=await owner(env),c=o.claims,p=crypto.randomUUID();
  await submitEvent(env.DB,c,event(c,'catalog.put',p,{expectedVersion:0,name:'Teh',price:5000,cost:null,unit:'pcs',priceBasis:1,active:true}));
  await Promise.all(Array.from({length:6},()=>submitEvent(env.DB,c,event(c,'stock.adjust',p,{delta:1,reason:'Masuk'}))));
  const shift=crypto.randomUUID();await submitEvent(env.DB,c,event(c,'shift.open',shift,{startingCash:0}));
  await submitEvent(env.DB,c,event(c,'order.create',crypto.randomUUID(),{shiftId:shift,lines:[{productId:p,catalogVersion:1,name:'Teh',quantity:7,unit:'pcs',price:5000,priceBasis:1}]}));
  const stock=(await pullEntities(env.DB,c,0)).entities.find(e=>e.kind==='stock')!.value;
  assert.equal(stock.quantity,-1);assert.equal(stock.needsReview,true);
});
