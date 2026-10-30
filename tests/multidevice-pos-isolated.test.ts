import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import crypto from 'node:crypto';
import {kitchenSignature,kitchenItemStage,employeeAttendance,attendanceSummary} from '../src/lib/operations';
import {environment,owner} from './multideviceFixtures';
import {testDeviceProof} from './securityFixtures';
import {createPairing,requestPairing,approvePairing,saveEmployee,employeeLogin} from '../src/lib/server/multideviceAccess';
import {submitEvent,pullEntities,recoverEvent} from '../src/lib/server/multideviceSync';
function processPos(){
  const child=spawn(process.execPath,['--import','tsx','tests/posProcessFixture.ts'],{stdio:['pipe','pipe','pipe']});
  let counter=0;const waiting=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
  createInterface({input:child.stdout}).on('line',line=>{try{const result=JSON.parse(line),job=waiting.get(result.id);if(job){waiting.delete(result.id);if(result.error)job.reject(new Error(result.error));else job.resolve(result.value);}}catch{}});
  child.on('exit',()=>{for(const job of waiting.values())job.reject(new Error('POS fixture exited'));});
  const send=(action:string,data:unknown={})=>new Promise<any>((resolve,reject)=>{const id=++counter;waiting.set(id,{resolve,reject});child.stdin.write(JSON.stringify({id,action,data})+'\n');});
  return {send,call:(name:string,...args:unknown[])=>send('call',{name,args}),close:()=>child.kill()};
}
test('two isolated actual POS stores reconcile offline receipts, stock, owner price changes and lost acknowledgements',{timeout:30000},async()=>{
  const env=await environment(),o=await owner(env),pair=await createPairing(env,o.claims),deviceId=crypto.randomUUID();
  const request=()=>({code:pair.code,deviceId,deviceName:'Kasir',proof:testDeviceProof('multi.pair',pair.code,deviceId)});
  await requestPairing(env,request());await approvePairing(env,o.claims,pair.id);const device=await requestPairing(env,request());if(device.pending)throw new Error();
  const employeeId=crypto.randomUUID();await saveEmployee(env,o.claims,{id:employeeId,name:'Kasir Pagi',pin:'482953',active:true});const e=await employeeLogin(env,device.claims,{id:employeeId,pin:'482953'});
  const a=processPos(),b=processPos();
  const flush=async(pos:ReturnType<typeof processPos>,session:typeof o|typeof e,lost=false)=>{for(const row of await pos.send('queue')){await submitEvent(env.DB,session.claims,row.event);if(!lost)await pos.send('ack',{id:row.id});}};
  const pull=async(pos:ReturnType<typeof processPos>,session:typeof o|typeof e)=>{let cursor=0;for(;;){const result=await pullEntities(env.DB,session.claims,cursor);await pos.send('pull',result);if(!result.hasMore)break;cursor=result.cursor;}};
  try{
    await a.send('init',{...o,name:'Pemilik'});await b.send('init',{...e,name:'Kasir Pagi'});
    const product=await a.call('createMenu',{nama:'Teh',harga:5000,kategori:'Minuman'});await a.call('configureStock',product,10);await a.call('openShift',{operatorName:'Pemilik',startingCash:0});await flush(a,o);await pull(b,e);
    const p=(await b.send('records',{table:'menuItems'}))[0];assert.equal(p.harga,5000);assert.equal(p.costPrice,undefined);
    await b.call('openShift',{operatorName:'Kasir Pagi',startingCash:0});
    await b.call('createOrder',{status:'paid',total:10000,items:[{id:p.id,nama:'Teh',harga:5000,qty:2}]});
    await b.send('reopen');assert.equal((await b.send('queue')).length,2);
    await assert.rejects(()=>b.call('createMenu',{nama:'Tidak Boleh',harga:1,kategori:'Umum'}),/pemilik/);
    await a.call('updateMenu',product,{nama:'Teh',harga:6000,kategori:'Minuman'});
    await a.call('createOrder',{status:'paid',total:18000,items:[{id:product,nama:'Teh',harga:6000,qty:3}]});await flush(a,o);
    await flush(b,e,true);await flush(b,e);await pull(a,o);await pull(b,e);
    const products=await a.send('records',{table:'menuItems'});assert.equal(products[0].stockQty,5);assert.equal(products[0].harga,6000);
    const report=await a.call('getOrders');assert.equal(report.length,2);assert.equal(report.reduce((sum:number,row:any)=>sum+row.total,0),28000);
    const own=await b.call('getCashierOrders');assert.equal(own.length,1);assert.equal(own[0].total,10000);
    assert.equal((await b.send('records',{table:'menuItems'}))[0].stockQty,5);
    assert.equal((await env.DB.prepare("SELECT count(*) n FROM MdEntities WHERE kind='pos_payments'").first<number>('n')),2);
    // Attendance is queued offline, survives reopening and reaches the owner exactly once.
    await b.call('saveOperation',{kind:'attendance.in',employeeId,employeeName:'Kasir Pagi',sessionId:'local-attendance'});
    await b.send('reopen');await flush(b,e,true);await flush(b,e);await pull(a,o);
    assert.equal((await a.send('records',{table:'operations'})).length,1);
    await assert.rejects(()=>b.call('saveOperation',{kind:'loan',employeeId,employeeName:'Kasir Pagi',amount:1,source:'rekening'}),/pemilik/);
    await b.call('saveOperation',{kind:'attendance.out',employeeId,employeeName:'Kasir Pagi',sessionId:'local-attendance'});await flush(b,e);await pull(a,o);
    assert.equal((await a.send('records',{table:'operations'})).length,2);
    // Owner prepares the cashier's real receipt; delivery survives lost ACK and reopen.
    const receipt=(await b.call('getCashierOrders'))[0];
    const line=(await a.send('records',{table:'orderItems'})).find((item:any)=>item.mdId===receipt.items[0].mdId);
    const kitchen={kind:'kitchen',employeeId:o.id,employeeName:'Pemilik',orderId:line.orderId,orderItemId:line.id,lineSignature:kitchenSignature(line)};
    await a.call('saveOperation',{...kitchen,stage:'preparing'});await a.send('reopen');
    await flush(a,o,true);await flush(a,o);await pull(b,e);
    let statuses=(await b.send('records',{table:'operations'})).filter((row:any)=>row.kind==='kitchen');
    assert.equal(statuses.length,1);assert.equal(statuses[0].stage,'preparing');
    assert.equal(statuses[0].orderItemId,receipt.items[0].id);
    const first=(await a.send('records',{table:'operations'})).find((row:any)=>row.kind==='kitchen');
    await a.call('saveOperation',{...kitchen,stage:'ready',previousId:first.mdId});await flush(a,o);await pull(b,e);await b.send('reopen');
    statuses=(await b.send('records',{table:'operations'})).filter((row:any)=>row.kind==='kitchen');
    assert.equal(kitchenItemStage(receipt.items[0],statuses),'ready');
    assert.equal(kitchenItemStage({...receipt.items[0],qty:3},statuses),'waiting');
    await assert.rejects(()=>b.call('saveOperation',{...kitchen,stage:'served',employeeId}),/pemilik/);
    // Legacy records are routed from the authoritative receipt, not untrusted target metadata.
    await env.DB.prepare("UPDATE MdEntities SET payload=json_remove(payload,'$.mdTargetDeviceId','$.mdTargetOperatorId') WHERE kind='pos_operations' AND json_extract(payload,'$.kind')='kitchen'").run();
    const legacy=(await pullEntities(env.DB,e.claims,0)).entities.filter(row=>row.kind==='pos_operations'&&row.value.kind==='kitchen');
    assert.equal(legacy.length,2);assert.equal(legacy[1].value.stage,'ready');
    assert.equal(legacy[1].value.amount,undefined);
    await a.call('createOrder',{status:'paid',total:6000,items:[{id:product,nama:'Teh',harga:6000,qty:1}]});
    const pending=await a.send('queue');assert.equal(pending.length,1);
    await submitEvent(env.DB,o.claims,pending[0].event); // Lost response before replacement.
    const replacement=await owner(env,o.key,true);
    await recoverEvent(env.DB,replacement.claims,pending[0].event);await recoverEvent(env.DB,replacement.claims,pending[0].event);
    await assert.rejects(()=>submitEvent(env.DB,o.claims,pending[0].event));
    assert.equal((await env.DB.prepare("SELECT count(*) n FROM MdEntities WHERE kind='pos_payments'").first<number>('n')),3);
  }finally{a.close();b.close();}
});


test('attendance agrees across owner and cashier, survives offline retries and isolates employee switches',{timeout:30000},async()=>{
 const env=await environment(),o=await owner(env),pair=await createPairing(env,o.claims),deviceId=crypto.randomUUID();
 const request=()=>({code:pair.code,deviceId,deviceName:'Kasir Absensi',proof:testDeviceProof('multi.pair',pair.code,deviceId)});
 await requestPairing(env,request());await approvePairing(env,o.claims,pair.id);const device=await requestPairing(env,request());if(device.pending)throw new Error();
 const first={employeeId:crypto.randomUUID(),employeeName:'Kasir Pagi'},second={employeeId:crypto.randomUUID(),employeeName:'Kasir Sore'};
 for(const person of [first,second])await saveEmployee(env,o.claims,{id:person.employeeId,name:person.employeeName,pin:'482953',active:true});
 const e=await employeeLogin(env,device.claims,{id:first.employeeId,pin:'482953'}),a=processPos(),b=processPos();
 const flush=async(pos:ReturnType<typeof processPos>)=>{for(const row of await pos.send('queue')){await submitEvent(env.DB,row.claims,row.event);assert.equal((await submitEvent(env.DB,row.claims,row.event)).duplicate,true);await pos.send('ack',{id:row.id});}};
 const pull=async(pos:ReturnType<typeof processPos>,claims:typeof o.claims)=>{let cursor=0;for(;;){const page=await pullEntities(env.DB,claims,cursor);await pos.send('pull',page);if(!page.hasMore)break;cursor=page.cursor;}};
 try{
  await a.send('init',{...o,name:'Pemilik'});await b.send('init',{...e,name:first.employeeName});
  await a.call('saveOperation',{...first,kind:'attendance.in',sessionId:'owner-start'});await flush(a);await pull(b,e.claims);
  let current=employeeAttendance(await b.send('records',{table:'operations'}),first.employeeId);
  assert.equal(current.active?.id,'owner-start','owner attendance appears for the same cashier');
  await a.call('saveOperation',{...first,kind:'attendance.out',sessionId:current.active!.id});
  await b.call('saveOperation',{...first,kind:'attendance.out',sessionId:current.active!.id});
  await flush(b);await flush(a);await pull(a,o.claims);await pull(b,e.claims);
  assert.equal(attendanceSummary(await a.send('records',{table:'operations'})).length,1);
  assert.equal(employeeAttendance(await b.send('records',{table:'operations'}),first.employeeId).active,undefined);
  const attempts=await Promise.allSettled([b.call('saveOperation',{...first,kind:'attendance.in'}),b.call('saveOperation',{...first,kind:'attendance.in'})]);
  assert.equal(attempts.filter(row=>row.status==='fulfilled').length,1,'two rapid actions create one local check-in');
  await b.send('reopen');assert.equal((await b.send('queue')).length,1);
  const next=await employeeLogin(env,device.claims,{id:second.employeeId,pin:'482953'});
  await b.send('session',{...next,name:second.employeeName});
  const before=await b.send('records',{table:'operations'});
  assert.ok(employeeAttendance(before,first.employeeId).active);assert.equal(employeeAttendance(before,second.employeeId).latest,undefined);
  await assert.rejects(()=>b.call('saveOperation',{...first,kind:'attendance.out',sessionId:'owner-start'}),/akun kasir/);
  await b.call('saveOperation',{...second,kind:'attendance.in',sessionId:'second-start'});
  await flush(b);await pull(a,o.claims);await pull(b,next.claims);
  const ownerRows=await a.send('records',{table:'operations'});
  assert.ok(employeeAttendance(ownerRows,first.employeeId).active,'switching employees never clocks the first out automatically');
  assert.equal(employeeAttendance(ownerRows,second.employeeId).active?.id,'second-start');
  await b.call('saveOperation',{...second,kind:'attendance.out',sessionId:'second-start'});await flush(b);await pull(a,o.claims);
  assert.equal(employeeAttendance(await a.send('records',{table:'operations'}),second.employeeId).active,undefined);
  for(const table of ['shifts','cashMovements','orders','payments'])assert.equal((await a.send('records',{table})).length,0,'attendance must not open a cash shift or alter money');
 }finally{a.close();b.close();}
});
