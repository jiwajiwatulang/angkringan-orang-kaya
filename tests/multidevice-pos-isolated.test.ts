import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import crypto from 'node:crypto';
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
    await a.call('createOrder',{status:'paid',total:6000,items:[{id:product,nama:'Teh',harga:6000,qty:1}]});
    const pending=await a.send('queue');assert.equal(pending.length,1);
    await submitEvent(env.DB,o.claims,pending[0].event); // Lost response before replacement.
    const replacement=await owner(env,o.key,true);
    await recoverEvent(env.DB,replacement.claims,pending[0].event);await recoverEvent(env.DB,replacement.claims,pending[0].event);
    await assert.rejects(()=>submitEvent(env.DB,o.claims,pending[0].event));
    assert.equal((await env.DB.prepare("SELECT count(*) n FROM MdEntities WHERE kind='pos_payments'").first<number>('n')),3);
  }finally{a.close();b.close();}
});
