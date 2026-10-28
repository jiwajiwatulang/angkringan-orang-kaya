import {db} from '../dexie';
import {deviceKeyIdentity} from '../deviceIdentity';
import {getLocalDeviceId} from '../ordersClient';
import {verifyAccess} from './offlineAccess';
import {DeviceClient} from './client';
import {PosSynchronizer} from './posSync';
import {EmployeeSessions,transportUnavailable} from './employeeSession';
import {POS_TABLES,setPosScope,type PosScope} from './posWire';
import {DEFAULT_SETTINGS,loadStoreSettingsAsync} from '../settings';
import {AccessError} from './protocol';
import {prepareLocalSession,rememberAccessRejection,wasAccessRejected} from './localReadiness';
export interface PosRuntime {client:DeviceClient;synchronizer:PosSynchronizer;scope?:PosScope;employees?:EmployeeSessions}
let current:PosRuntime|undefined;
export function currentPosRuntime(){return current;}
export async function initializePosRuntime():Promise<PosRuntime>{
  const saved=(await db.table('settings').get('multi_device_access'))?.value;
  if(!saved?.access)throw new AccessError('Hubungkan perangkat terlebih dahulu.',401);
  const deviceId=getLocalDeviceId(),identity=await deviceKeyIdentity();
  let access=String(saved.access),claims;
  try{claims=await verifyAccess(access,deviceId,identity);}catch(error){
    if(!navigator.onLine){claims=await verifyAccess(access,deviceId,identity,undefined,true);}
    else{
    const data=JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(access.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))));
    if(data.role==='cashier'){
      try{const client=new DeviceClient(access,data),renewed=await client.renew();access=renewed.access;claims=renewed.claims;}
      catch(error){if(!transportUnavailable(error))throw error;claims=await verifyAccess(access,deviceId,identity,undefined,true);}
    }else{
      const {enrollOwnerClient}=await import('./client');const fresh=(await enrollOwnerClient()).snapshot();access=fresh.access;claims=fresh.claims;
    }
    await db.table('settings').put({key:'multi_device_access',value:{access,claims}});
    }
  }
  // Once the server rejects an owner grant, cached data cannot reopen it, even offline.
  if(claims.role==='owner'&&await wasAccessRejected(db,access)){
    if(!navigator.onLine)throw new AccessError('Sambungkan internet untuk memperbarui akses perangkat.',401);
    const {enrollOwnerClient}=await import('./client');const renewed=(await enrollOwnerClient()).snapshot();
    access=renewed.access;claims=renewed.claims;
    await db.table('settings').put({key:'multi_device_access',value:{access,claims}});
  }
  const client=new DeviceClient(access,claims),synchronizer=new PosSynchronizer(db,client);
  current={client,synchronizer};
  if(claims.role==='cashier'){
    current.employees=new EmployeeSessions(client,db,deviceId,identity);
    const employee=await current.employees.current();
    if(!employee)return current;
    return resumeEmployeeSession(current,()=>enterEmployee(employee));
  }
  current.scope={claims,access,operatorName:'Pemilik'};setPosScope(current.scope);
  if((await db.table('posMeta').get('bootstrapRequired'))?.value){
    const scope={...current.scope,importingLegacy:true};setPosScope(scope);
    try{
      if(!Number((await db.table('posMeta').get('profileVersion'))?.value||0))await db.table('settings').put({key:'pos_store_settings',value:{...DEFAULT_SETTINGS,...(await db.table('settings').get('pos_store_settings'))?.value}});
      const pending=async(table:string)=>(await db.table(table).toArray()).filter(row=>!row.mdVersion);
      // Resume at whole receipt boundaries, keeping the original merchant store untouched.
      for(const table of ['menuItems','tables','shifts'])for(const row of await pending(table))await db.table(table).put(row);
      for(const order of await pending('orders'))await db.transaction('rw',[...POS_TABLES,'posMeta'],async()=>{
        await db.table('orders').put(order);
        for(const table of ['orderItems','payments','paymentProofs'])for(const row of (await db.table(table).where('orderId').equals(order.id).toArray()).filter(row=>!row.mdVersion))await db.table(table).put(row);
      });
      for(const table of ['inventoryMovements','cashMovements','auditLogs','operations'])for(const row of await pending(table))await db.table(table).put(row);
      await db.table('posMeta').put({key:'bootstrapRequired',value:false});
    }finally{setPosScope(current.scope);}
  }
  await prepareLocalSession(db,()=>synchronizer.synchronize(),loadStoreSettingsAsync);return current;
}
// An online rejection of a cached operator must return to login, not retry forever.
export async function resumeEmployeeSession(runtime:PosRuntime,resume:()=>Promise<PosRuntime>){
  try{return await resume();}catch(error){
    const status=(error as {status?:number})?.status;
    if(status!==401&&status!==403)throw error;
    runtime.scope=undefined;setPosScope(undefined);await runtime.employees?.logout();return runtime;
  }
}
export async function enterEmployee(employee:Awaited<ReturnType<EmployeeSessions['login']>>){
  if(!current?.employees)throw new AccessError();
  const {client}=current;
  const activeClient=new DeviceClient(employee.access,employee.claims);
  current.scope={claims:employee.claims,access:employee.access,operatorName:employee.name};setPosScope(current.scope);
  current.synchronizer=new PosSynchronizer(db,activeClient);
  await db.table('posMeta').put({key:'cursor',value:0});
  try{await prepareLocalSession(db,()=>current!.synchronizer.synchronize(),loadStoreSettingsAsync);return current;}
  catch(error){current.scope=undefined;setPosScope(undefined);await current.employees.logout();throw error;}
}
export async function leaveEmployee(){
  if(!current)return;await current.employees?.logout();setPosScope(undefined);current.scope=undefined;
}
export async function rejectRuntimeAccess(runtime:PosRuntime,error:unknown=new AccessError()){
  if(runtime.employees)await runtime.employees.handleRejection(error);
  else if(runtime.scope)await rememberAccessRejection(db,runtime.scope.access);
  runtime.scope=undefined;setPosScope(undefined);
}
