import {createDeviceProof,deviceKeyIdentity} from '../deviceIdentity';
import {getLocalDeviceId} from '../ordersClient';
import {sha256,verifyAccess} from './offlineAccess';
import type {AccessClaims,StoreEvent} from './protocol';
import type {Entity} from './projection';
import {db} from '../dexie';
import {AccessError} from './protocol';
import {isDemoMode} from '../demoMode';

export interface AccessList {devices?:{id:string;name:string;role:string;revoked:number}[];employees:{id:string;name:string;active:number}[];pairings?:{id:string;candidateName:string;expiresAt:number}[]}
export class DeviceClient {
  constructor(private access:string,readonly claims:AccessClaims){}
  async call<T>(action:string,data:Record<string,unknown>={}):Promise<T>{
    const proof=await createDeviceProof(`multi.${action}.${await sha256(JSON.stringify(data))}`,this.claims.storeId,this.claims.deviceId,this.access);
    return call<T>({action,data,access:this.access,proof});
  }
  list(){return this.call<AccessList>('list');}
  send(event:StoreEvent){return this.call<{id:string;sequence:number}>('send',{event});}
  recover(event:StoreEvent){return this.call<{id:string;sequence:number}>('recover',{event});}
  pull(cursor:number){return this.call<{cursor:number;entities:Entity[];hasMore:boolean}>('pull',{cursor});}
}
async function call<T>(body:unknown):Promise<T>{
  const response=await fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000),cache:'no-store'});
  const data=await response.json();
  if(!response.ok)throw new AccessError(typeof data.error==='string'?data.error:'Data belum dapat diperbarui.',response.status);return data as T;
}
export async function enrollOwnerClient(){
  if(isDemoMode()||db.name==='SakuNotaDemoDB')throw new Error('Keluar dari demo terlebih dahulu.');
  const activation=localStorage.getItem('sakunota_activation_token')||'',licenseKey=localStorage.getItem('sakunota_license_key')||'',deviceId=getLocalDeviceId();
  const proof=await createDeviceProof('multi.enroll',licenseKey,deviceId,activation);
  const result=await call<{access:string;claims:AccessClaims}>({action:'enroll',data:{activation,deviceName:'Perangkat Pemilik'},proof});
  const claims=await verifyAccess(result.access,deviceId,await deviceKeyIdentity());
  return new DeviceClient(result.access,claims);
}
export async function requestPairingClient(code:string,deviceName:string){
  if(isDemoMode()||db.name==='SakuNotaDemoDB')throw new Error('Keluar dari demo terlebih dahulu.');
  const deviceId=getLocalDeviceId(),proof=await createDeviceProof('multi.pair',code,deviceId,'');
  const result=await call<{pending:true}|{pending:false;access:string;claims:AccessClaims}>({action:'pair.request',data:{code,deviceId,deviceName},proof});
  if(!result.pending){
    const claims=await verifyAccess(result.access,deviceId,await deviceKeyIdentity());
    if(claims.role!=='cashier'||claims.employeeId)throw new Error('Perangkat belum dapat dihubungkan.');
    await db.table('settings').put({key:'multi_device_access',value:{access:result.access,storeId:claims.storeId,deviceId}});
  }
  return result;
}
