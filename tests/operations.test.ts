import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {attendanceSummary,estimateFinalTax,priceSimulation,validateOperation,kitchenSignature,commissionBalance,supportsKitchen} from '../src/lib/operations';
import {storeReports} from '../src/lib/storeReports';
import {csvCell} from '../src/lib/reportExport';
import {environment,owner} from './multideviceFixtures';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';
import {setPosScope} from '../src/lib/multidevice/posWire';
import {projectPosCommit,visiblePosEntity} from '../src/lib/multidevice/posProjection';
import type {AccessClaims} from '../src/lib/multidevice/protocol';

test('server refuses forged employee money, other employee attendance and overwriting history',async()=>{
  const c:AccessClaims={version:1,storeId:'store',deviceId:'device',deviceKey:'key',deviceEpoch:1,role:'cashier',employeeId:'employee',issuedAt:Date.now(),expiresAt:Date.now()+60000};
  const value={kind:'loan',employeeId:'employee',employeeName:'Ani',amount:10,source:'rekening',at:new Date().toISOString(),mdId:'operation-00000001',mdStoreId:'store',mdDeviceId:'device',mdOperatorId:'employee',mdVersion:1};
  const event:any={id:'event',entityId:'event',storeId:'store',deviceId:'device',operatorId:'employee',kind:'pos.commit',data:{rows:[{table:'operations',id:'operation-00000001',expectedVersion:0,value}]}};
  await assert.rejects(()=>projectPosCommit(event,c,async()=>undefined),/pemilik/);
  value.kind='attendance.in';Object.assign(value,{employeeId:'other',sessionId:'a'});
  await assert.rejects(()=>projectPosCommit(event,c,async()=>undefined),/pemilik/);
  value.employeeId='employee';await projectPosCommit(event,c,async()=>undefined);
  await assert.rejects(()=>projectPosCommit(event,c,async(kind)=>kind==='pos_operations'?value:undefined),/berubah|diganti/);
  const hidden=visiblePosEntity({kind:'pos_operations',id:'owner-loan',value:{...value,kind:'loan',mdDeviceId:'owner',mdOperatorId:'owner'}},c);
  assert.equal(hidden,undefined);
  assert.ok(visiblePosEntity({kind:'pos_operations',id:'attendance',value:{...value,mdDeviceId:'owner',mdOperatorId:'owner'}},c));
});
test('server rejects repayments above the authoritative balance even if local data is stale',async()=>{
  const c:AccessClaims={version:1,storeId:'store',deviceId:'owner',deviceKey:'key',deviceEpoch:1,role:'owner',issuedAt:Date.now(),expiresAt:Date.now()+60000};
  const event:any={id:'event',entityId:'event',storeId:'store',deviceId:'owner',operatorId:'owner',kind:'pos.commit',data:{rows:[{table:'operations',id:'repayment-00000001',expectedVersion:0,value:{kind:'repayment',employeeId:'employee',employeeName:'Ani',amount:101,source:'rekening',at:new Date().toISOString(),mdId:'repayment-00000001',mdStoreId:'store',mdDeviceId:'owner',mdOperatorId:'owner',mdVersion:1}}]}};
  const lookup=async(kind:string,id:string)=>kind==='pos_employeeState'&&id==='employee'?{loanBalance:100,earned:0,paid:0}:undefined;
  await assert.rejects(()=>projectPosCommit(event,c,lookup),/melebihi/);
  event.data.rows[0].value.amount=100;await projectPosCommit(event,c,lookup);
});
test('concurrent offline attendance coalesces without blocking the delivery queue',async()=>{
  const c:AccessClaims={version:1,storeId:'store',deviceId:'owner',deviceKey:'key',deviceEpoch:1,role:'owner',issuedAt:Date.now(),expiresAt:Date.now()+60000};
  const original={kind:'attendance.in',employeeId:'employee',employeeName:'Ani',sessionId:'original-session',at:new Date(Date.now()-60000).toISOString()};
  const records=new Map<string,Record<string,any>>([['pos_operations:attendance-000001',original],['pos_employeeState:employee',{loanBalance:0,earned:0,paid:0,activeSession:{sessionId:original.sessionId,at:original.at}}]]);
  const lookup=async(kind:string,id:string)=>records.get(`${kind}:${id}`);
  const event=(id:string,kind:string)=>({id,entityId:id,storeId:'store',deviceId:'owner',operatorId:'owner',kind:'pos.commit',data:{rows:[{table:'operations',id,expectedVersion:0,value:{kind,employeeId:'employee',employeeName:'Ani',sessionId:'offline-session',at:new Date().toISOString(),mdId:id,mdStoreId:'store',mdDeviceId:'owner',mdOperatorId:'owner',mdVersion:1}}]}} as any);
  const accepted=await projectPosCommit(event('attendance-000002','attendance.in'),c,lookup);
  const duplicate=accepted.find(e=>e.kind==='pos_operations')!;
  assert.equal(duplicate.value.ignored,true);for(const entity of accepted)records.set(`${entity.kind}:${entity.id}`,entity.value);
  const closed=await projectPosCommit(event('attendance-000003','attendance.out'),c,lookup);
  const close=closed.find(e=>e.kind==='pos_operations')!;
  assert.equal(close.value.sessionId,'original-session');for(const entity of closed)records.set(`${entity.kind}:${entity.id}`,entity.value);
  const rows=[...records.entries()].filter(([key])=>key.startsWith('pos_operations:')).map(([,value])=>value);
  assert.equal(attendanceSummary(rows as any).length,1);assert.notEqual(attendanceSummary(rows as any)[0].end,undefined);
});
test('attendance pairs sessions across midnight without inventing cash shifts',()=>{
  const rows:any[]=[{kind:'attendance.in',sessionId:'a',employeeId:'a',employeeName:'Ani',at:'2026-10-20T23:00:00+08:00'},{kind:'attendance.out',sessionId:'a',employeeId:'a',at:'2026-10-21T01:00:00+08:00'},{kind:'attendance.in',sessionId:'b',employeeId:'b',employeeName:'Budi',at:'2026-10-21T01:00:00+08:00'}];
  assert.equal(attendanceSummary(rows)[0].minutes,120);assert.equal(attendanceSummary(rows)[1].minutes,null);
});
test('money and price lab reject invalid values; no rounding drift',()=>{
  assert.deepEqual(priceSimulation(18000,14000,250),{revenue:4500000,cost:3500000,profit:1000000,margin:4000/18000*100});
  for(const value of [NaN,Infinity,-1,.5,Number.MAX_SAFE_INTEGER])assert.throws(()=>priceSimulation(value,1,1));
  assert.throws(()=>validateOperation({kind:'loan',employeeId:'a',employeeName:'A',at:new Date().toISOString(),source:'laci',amount:.5}));
});
test('tax estimate requires eligibility; individual allowance never applies to companies',()=>{
  assert.equal(estimateFinalTax(500000000,'individual',true)?.tax,0);
  assert.equal(estimateFinalTax(600000000,'individual',true)?.tax,500000);
  assert.equal(estimateFinalTax(600000000,'single_company',true)?.tax,3000000);
  assert.equal(estimateFinalTax(1,'individual',false),null);
  assert.equal(estimateFinalTax(4800000001,'individual',true),null);
  assert.equal(estimateFinalTax(100,'other',true),null);
});
test('weekly report uses completed weeks and withholds unsupported grades',()=>{
  const now=new Date(2026,9,28,12),report=storeReports([],[],now);
  assert.equal(report.weekly.start.getDay(),1);assert.equal(report.weekly.end.getDay(),1);assert.equal(report.weekly.grade,null);
  const order={id:1,total:10000,status:'paid',createdAt:new Date(2026,9,26,9).toISOString(),payments:[{amount:4000,status:'completed',paidAt:new Date(2026,9,26,9).toISOString()},{amount:6000,status:'completed',paidAt:new Date(2026,9,26,9).toISOString()}]};
  const hours=storeReports([order],[],now).hours;assert.equal(hours[9].count,1);assert.equal(hours[9].net,10000);
  const weeks=Array.from({length:10},(_,i)=>({id:i+1,total:10000,status:'paid',createdAt:new Date(2026,9,i<5?13:20,9).toISOString()}));
  const graded=storeReports(weeks,[{status:'closed',endTime:new Date(2026,9,21,20).toISOString(),cashDifference:0}],now).weekly;
  assert.equal(graded.grade,'A');assert.equal(graded.score,100);
});
test('CSV neutralizes formulas and preserves commas, quotes and linebreaks',()=>{
  assert.equal(csvCell('=1+1'),'"\'=1+1"');assert.equal(csvCell('a,"b"\nc'),'"a,""b""\nc"');assert.equal(csvCell('00123'),'"00123"');
});
test('refunded services reverse available commission without rewriting payouts',()=>{
  const records:any[]=[{kind:'commission',employeeId:'a',orderId:1,amount:1000},{kind:'commission.paid',employeeId:'a',amount:700}];
  assert.equal(commissionBalance(records,'a',[{id:1,status:'paid'}]),300);
  assert.equal(commissionBalance(records,'a',[{id:1,status:'unpaid',total:10000,paidAmount:8000}]),100);
  assert.equal(commissionBalance(records,'a',[{id:1,status:'void',isRefunded:true}]),-700);
});

test('actual offline POS operational records sync exactly once with cash, commission and kitchen guards',{timeout:30000},async()=>{
  const env=await environment(),o=await owner(env);process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE='enabled';
  const storage=new Map([['sakunota_pos_partition',JSON.stringify({storeId:o.claims.storeId,deviceId:o.id})]]);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>storage.get(key)||null,setItem:(k:string,v:string)=>storage.set(k,v),removeItem:(k:string)=>storage.delete(k)}});
  const {db}=await import('../src/lib/dexie'),api=await import('../src/lib/api'),{saveOperation}=await import('../src/lib/operationsApi');
  setPosScope({claims:o.claims,access:o.access,operatorName:'Pemilik'});
  const flush=async()=>{for(const row of await db.table('posOutbox').orderBy('ordinal').toArray()){await submitEvent(env.DB,o.claims,row.event);const retry=await submitEvent(env.DB,o.claims,row.event);assert.equal(retry.duplicate,true);await db.table('posOutbox').delete(row.id);}};
  const person={employeeId:'employee-a',employeeName:'Ani'};
  try{
    await db.table('settings').put({key:'pos_store_settings',value:{storeName:'Uji',enableTax:false,enableService:false}});
    const product=await api.createMenu({nama:'Layanan',harga:10000,kategori:'Layanan'});
    const shift=await api.openShift({operatorName:'Pemilik',startingCash:50000});await flush();
    const active=await api.getActiveShift();
    await saveOperation({...person,kind:'attendance.in',sessionId:'session-a'});
    await assert.rejects(()=>saveOperation({...person,kind:'attendance.in'}),/sudah absen/);
    await saveOperation({...person,kind:'attendance.out',sessionId:'session-a'});
    await assert.rejects(()=>saveOperation({...person,kind:'attendance.out',sessionId:'session-a'}),/belum tersedia/);
    await saveOperation({...person,kind:'loan',amount:12000,source:'laci',shiftId:active.id});
    await saveOperation({...person,kind:'repayment',amount:2000,source:'laci',shiftId:active.id});
    await assert.rejects(()=>saveOperation({...person,kind:'repayment',amount:10001,source:'rekening'}),/melebihi/);
    assert.equal((await api.getShiftLiveStats(active.id)).expectedCash,40000);
    await flush();
    const note=await api.createOrder({status:'paid',paymentMethod:'Cash',total:10000,subtotal:10000,items:[{id:Number(product),nama:'Layanan',harga:10000,qty:1}]});await flush();
    const item=await db.table('orderItems').where('orderId').equals(note.id!).first();
    await saveOperation({...person,kind:'commission',orderId:note.id,orderItemId:item.id,basisAmount:10000,rate:1000,amount:1000});
    await assert.rejects(()=>saveOperation({...person,kind:'commission',orderId:note.id,orderItemId:item.id,basisAmount:10000,rate:1000,amount:1000}),/sudah tercatat/);
    await saveOperation({...person,kind:'commission.paid',amount:1000,source:'laci',shiftId:active.id});
    await assert.rejects(()=>saveOperation({...person,kind:'commission.paid',amount:1,source:'rekening'}),/melebihi/);
    await flush();
    await saveOperation({...person,kind:'kitchen',orderId:note.id,orderItemId:item.id,stage:'preparing',lineSignature:kitchenSignature(item)});await flush();
    const first=await db.table('operations').where('kind').equals('kitchen').first();
    await assert.rejects(()=>saveOperation({...person,kind:'kitchen',orderId:note.id,orderItemId:item.id,stage:'served',previousId:first.mdId,lineSignature:kitchenSignature(item)}),/Status pesanan/);
    await saveOperation({...person,kind:'kitchen',orderId:note.id,orderItemId:item.id,stage:'ready',previousId:first.mdId,lineSignature:kitchenSignature(item)});await flush();
    const entities=(await pullEntities(env.DB,o.claims,0)).entities;
    assert.equal(entities.filter(e=>e.kind==='pos_operations').length,8);
    assert.equal((await api.exportAllData()).operations.length,8);
    const payment=await db.table('payments').where('orderId').equals(note.id!).first();
    await api.refundPartialPayment(payment.id,{reason:'Layanan dikembalikan',operator:'Pemilik'});await flush();
    const payroll=(await pullEntities(env.DB,o.claims,0)).entities.find(e=>e.kind==='pos_employeeState'&&e.id===person.employeeId)!.value;
    assert.equal(payroll.earned,0);assert.equal(payroll.paid,1000);
    await assert.rejects(()=>saveOperation({...person,kind:'commission.paid',amount:1,source:'rekening'}),/melebihi/);
    await api.closeShift(active.id,{actualCash:39000});await flush();
    assert.equal((await api.getShiftLiveStats(active.id)).expectedCash,39000);
    const queuedBefore=await db.table('posOutbox').count();
    await assert.rejects(()=>saveOperation({...person,kind:'loan',amount:1,source:'laci',shiftId:active.id}),/Buka shift/);
    assert.equal(await db.table('posOutbox').count(),queuedBefore);
    await assert.rejects(async()=>api.deleteCashMovement((await db.table('cashMovements').toArray())[0].id),/terhubung/);
  }finally{setPosScope(undefined);await db.delete();}
});

test('kitchen statuses are private to the receipt cashier and never expose payroll values',()=>{
  for(const type of ['warung','restoran','kafe'])assert.equal(supportsKitchen(type),true);
  for(const type of ['retail','rental'])assert.equal(supportsKitchen(type),false);
  const claims:AccessClaims={version:1,storeId:'s',deviceId:'cashier',deviceKey:'key',deviceEpoch:1,role:'cashier',employeeId:'a',issuedAt:Date.now(),expiresAt:Date.now()+60000};
  const entity={kind:'pos_operations',id:'kitchen-status',value:{kind:'kitchen',stage:'ready',mdDeviceId:'owner',mdOperatorId:'owner',mdTargetDeviceId:'cashier',mdTargetOperatorId:'a',amount:100000,note:'private payroll',costPrice:3000}};
  const visible=visiblePosEntity(entity,claims)!;
  assert.equal(visible.value.stage,'ready');assert.equal(visible.value.amount,undefined);assert.equal(visible.value.note,undefined);assert.equal(visible.value.costPrice,undefined);
  assert.equal(visiblePosEntity(entity,{...claims,employeeId:'b'}),undefined);
  assert.equal(visiblePosEntity(entity,{...claims,deviceId:'other'}),undefined);
});
