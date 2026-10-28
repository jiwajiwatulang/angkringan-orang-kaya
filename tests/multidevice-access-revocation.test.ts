import 'fake-indexeddb/auto';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Dexie from 'dexie';
import {test} from 'node:test';
import {environment,owner,requestProof} from './multideviceFixtures';
import {testDeviceProof,testPublicJwk} from './securityFixtures';
import {DeviceClient} from '../src/lib/multidevice/client';
import {EmployeeSessions} from '../src/lib/multidevice/employeeSession';
import {createPairing,requestPairing,approvePairing,saveEmployee,revokeDevice} from '../src/lib/server/multideviceAccess';
import {handleMultiDevice} from '../src/lib/server/multideviceHttp';
import {AccessError} from '../src/lib/multidevice/protocol';
async function setup(){
 const env=await environment(),o=await owner(env),pair=await createPairing(env,o.claims),id=crypto.randomUUID();
 const request=()=>({code:pair.code,deviceId:id,deviceName:'Audit Fixture',proof:testDeviceProof('multi.pair',pair.code,id)});
 await requestPairing(env,request());await approvePairing(env,o.claims,pair.id);const device=await requestPairing(env,request());if(device.pending)throw Error('fixture');
 let forcedStatus=0;let forcedCode:string|undefined;let gate:{entered:()=>void;wait:Promise<void>}|undefined;
 class AuditClient extends DeviceClient {
  async call<T>(action:string,data:Record<string,unknown>={}):Promise<T>{
   if(forcedStatus)throw new AccessError('Temporary rate limit',forcedStatus,forcedCode);
   if(device.pending)throw Error('fixture');
   const response=await handleMultiDevice(new Request('http://local/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,access:device.access,proof:requestProof(action,device.claims,device.access,data)})}),env);
   const result=await response.json() as any;if(!response.ok)throw new AccessError(result.error,response.status,result.code,result.retryAt);if(action==='employee.login'&&gate){gate.entered();await gate.wait;}return result;
  }
 }
 const a=crypto.randomUUID(),b=crypto.randomUUID();
 await saveEmployee(env,o.claims,{id:a,name:'Audit A',pin:'482953',active:true});await saveEmployee(env,o.claims,{id:b,name:'Audit B',pin:'958274',active:true});
 const local=new Dexie(`audit-${id}`);local.version(1).stores({settings:'key',posOutbox:'id'});
 const sessions=new EmployeeSessions(new AuditClient(device.access,device.claims),local,id,device.claims.deviceKey,testPublicJwk);
 return {env,o,id,a,b,sessions,local,holdLogin:(value:typeof gate)=>{gate=value;},setStatus:(status:number,code?:string)=>{forcedStatus=status;forcedCode=code;},cleanup:async()=>{await sessions.replica.db.delete();await local.delete();}};
}

test('inactive and changed-PIN accounts cannot reopen offline after the authoritative list refresh',async()=>{
 const f=await setup();try{
  await f.sessions.login(f.a,'482953',true);
  await f.sessions.login(f.b,'958274',true);
  await saveEmployee(f.env,f.o.claims,{id:f.a,name:'Audit A',active:false});
  const online=await f.sessions.employees(true);assert.equal(online.some(e=>e.id===f.a),false);
  assert.equal((await f.sessions.employees(false)).some(e=>e.id===f.a),false);
  await assert.rejects(()=>f.sessions.login(f.a,'482953',false));
  await saveEmployee(f.env,f.o.claims,{id:f.b,name:'Audit B',pin:'123456',active:true});
  await f.sessions.employees(true);assert.equal(await f.sessions.current(),null);
  await assert.rejects(()=>f.sessions.login(f.b,'958274',false));
  await f.sessions.login(f.b,'123456',true);assert.equal((await f.sessions.employees(false)).length,1);
 }finally{await f.cleanup();}
});
test('known device denial blocks every cached operator across a fresh session instance and retains pending sales',async()=>{
 const f=await setup();try{
  await f.sessions.login(f.a,'482953',true);await f.sessions.login(f.b,'958274',true);
  await f.local.table('posOutbox').put({id:'pending-sale',value:1});
  await revokeDevice(f.env,f.o.claims,f.id);
  await assert.rejects(()=>f.sessions.employees(true),(e:any)=>e.status===403&&e.code==='device_revoked');
  assert.equal(await f.sessions.current(),null);
  await assert.rejects(()=>f.sessions.login(f.a,'482953',false));
  await assert.rejects(()=>f.sessions.login(f.b,'958274',false));
  await assert.rejects(()=>f.sessions.employees(false));
  const other=new EmployeeSessions((f.sessions as any).device,f.local,f.id,(f.sessions as any).identity,testPublicJwk);
  assert.equal(await other.current(),null);await assert.rejects(()=>other.login(f.a,'482953',false));other.replica.db.close();
  assert.equal(await f.local.table('posOutbox').count(),1);
 }finally{await f.cleanup();}
});
test('temporary traffic limits preserve offline access but account lockouts remain effective offline',async()=>{
 const f=await setup();try{
  await f.sessions.login(f.a,'482953',true);
  for(const code of ['rate_limited',undefined]){
   f.setStatus(429,code);await assert.rejects(()=>f.sessions.login(f.a,'482953',true),(e:any)=>e.status===429);
   assert.equal((await f.sessions.employees(false)).length,1);
   assert.equal((await f.sessions.login(f.a,'482953',false)).claims.employeeId,f.a);
  }
  f.setStatus(429,'account_locked');await assert.rejects(()=>f.sessions.login(f.a,'482953',true));
  await assert.rejects(()=>f.sessions.login(f.a,'482953',false),(e:any)=>e.status===429);
  f.setStatus(0);await f.sessions.login(f.a,'482953',true);
  assert.equal((await f.sessions.login(f.a,'482953',false)).claims.employeeId,f.a);
 }finally{await f.cleanup();}
});
test('employee-only rejection does not revoke other operators; transport failure does not erase accounts',async()=>{
 const f=await setup();try{
  await f.sessions.login(f.a,'482953',true);await f.sessions.login(f.b,'958274',true);
  await f.sessions.handleRejection(new AccessError('Ended',403,'employee_revoked'));
  assert.equal(await f.sessions.current(),null);assert.equal((await f.sessions.employees(false)).length,1);
  f.setStatus(503);assert.equal((await f.sessions.login(f.a,'482953',true)).claims.employeeId,f.a);
 }finally{await f.cleanup();}
});
test('server lockout includes an unambiguous reason and deadline',async()=>{
 const f=await setup();try{
  await f.sessions.login(f.a,'482953',true);
  const client=(f.sessions as any).device as DeviceClient;
  for(let i=0;i<4;i++)await assert.rejects(()=>client.call('employee.login',{id:f.a,pin:'000000'}));
  await assert.rejects(()=>client.call('employee.login',{id:f.a,pin:'000000'}),(e:any)=>e.status===429&&e.code==='account_locked'&&e.retryAt>Date.now());
 }finally{await f.cleanup();}
});
test('a conservative device block can only be lifted by successful online device authorization',async()=>{
 const f=await setup();try{
  await f.sessions.login(f.a,'482953',true);
  await f.sessions.handleRejection(new AccessError('Unknown authorization failure',403));
  await assert.rejects(()=>f.sessions.login(f.a,'482953',false));
  f.setStatus(503);await assert.rejects(()=>f.sessions.employees(true));
  await assert.rejects(()=>f.sessions.login(f.a,'482953',false));
  f.setStatus(0);await f.sessions.employees(true);await f.sessions.login(f.a,'482953',true);
  assert.equal((await f.sessions.login(f.a,'482953',false)).claims.employeeId,f.a);
 }finally{await f.cleanup();}
});

test('a late successful login response cannot revive access after a known device rejection',async()=>{
 const f=await setup();let release!:()=>void;try{
  let entered!:()=>void;const reached=new Promise<void>(resolve=>{entered=resolve;}),wait=new Promise<void>(resolve=>{release=resolve;});
  f.holdLogin({entered,wait});const pending=f.sessions.login(f.a,'482953',true);
  await reached;await f.sessions.handleRejection(new AccessError('Revoked',403,'device_revoked'));release();
  await assert.rejects(()=>pending);assert.equal(await f.sessions.current(),null);
  await assert.rejects(()=>f.sessions.login(f.a,'482953',false));
 }finally{release?.();await f.cleanup();}
});
