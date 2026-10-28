import {createDeviceProof,deviceKeyIdentity} from '../deviceIdentity';
import {getLocalDeviceId} from '../ordersClient';
import {sha256,verifyAccess} from './offlineAccess';
import type {AccessClaims,StoreEvent} from './protocol';
import type {Entity} from './projection';
import {db} from '../dexie';
import {AccessError} from './protocol';
import {isDemoMode} from '../demoMode';
import {LocalReplica,replicaDatabase} from './replica';
import {LICENSE_PUBLIC_KEY} from '../licenseProtocol';

export interface AccessList {devices?:{id:string;name:string;role:string;revoked:number}[];employees:{id:string;name:string;active:number;epoch?:number}[];pairings?:{id:string;candidateName:string;expiresAt:number}[]}
export class DeviceClient {
  private currentClaims:AccessClaims;
  constructor(private access:string,claims:AccessClaims,private publicKey:JsonWebKey=LICENSE_PUBLIC_KEY){this.currentClaims=claims;}
  get claims(){return this.currentClaims;}
  snapshot(){return {access:this.access,claims:this.claims};}
  async renew(){
    if(this.claims.role!=='cashier'||this.claims.employeeId)throw new AccessError();
    const result=await this.call<{access:string}>('refresh');
    const claims=await verifyAccess(result.access,this.claims.deviceId,this.claims.deviceKey,this.publicKey);
    if(claims.storeId!==this.claims.storeId||claims.role!=='cashier'||claims.employeeId)throw new AccessError();
    this.access=result.access;this.currentClaims=claims;
    return {access:this.access,claims};
  }
  async openReplica(){
    const verified=await verifyAccess(this.access,this.claims.deviceId,this.claims.deviceKey,this.publicKey);
    if(verified.storeId!==this.claims.storeId)throw new AccessError();
    const replica=new LocalReplica(replicaDatabase(verified.storeId,verified.deviceId),verified.storeId,verified.deviceId,verified.deviceKey,this.publicKey);
    await replica.useAccess(this.access);return replica;
  }
  async call<T>(action:string,data:Record<string,unknown>={}):Promise<T>{
    const claims=this.claims,access=this.access;
    const proof=await createDeviceProof(`multi.${action}.${await sha256(JSON.stringify(data))}`,claims.storeId,claims.deviceId,access);
    return call<T>({action,data,access,proof});
  }
  list(){return this.call<AccessList>('list');}
  send(event:StoreEvent){return this.call<{id:string;sequence:number}>('send',{event});}
  recover(event:StoreEvent){return this.call<{id:string;sequence:number}>('recover',{event});}
  pull(cursor:number){return this.call<{cursor:number;entities:Entity[];hasMore:boolean}>('pull',{cursor});}
}
async function call<T>(body:unknown):Promise<T>{
  try{
    const response=await fetch('/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(8000),cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new AccessError(typeof data.error==='string'?data.error:'Data belum dapat diperbarui.',response.status,typeof data.code==='string'?data.code:undefined,Number.isSafeInteger(data.retryAt)?data.retryAt:undefined);return data as T;
  }catch(error){
    if(error instanceof AccessError)throw error;
    throw new AccessError('Koneksi belum tersedia. Coba lagi.',503);
  }
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
    if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE==='enabled'){
      const {activatePosPartition}=await import('./posActivation');
      await activatePosPartition(db,result.access,claims);location.assign('/pos');
    }
  }
  return result;
}
