import type Dexie from 'dexie';
import {AccessError,type AccessClaims} from './protocol';
import {verifyAccess} from './offlineAccess';
import {LocalReplica,replicaDatabase} from './replica';
import type {DeviceClient} from './client';
import {LICENSE_PUBLIC_KEY} from '../licenseProtocol';
export function transportUnavailable(error:unknown){return error instanceof AccessError?error.status>=500:error instanceof TypeError||error instanceof DOMException&&['AbortError','TimeoutError'].includes(error.name);}

export class EmployeeSessions {
  readonly replica:LocalReplica;
  private rejectionVersion=0;
  constructor(private device:DeviceClient,private local:Dexie,private deviceId:string,private identity:string,private publicKey:JsonWebKey=LICENSE_PUBLIC_KEY){
    if(device.claims.role!=='cashier'||device.claims.deviceId!==deviceId||device.claims.deviceKey!==identity||device.claims.employeeId)throw new AccessError();
    this.replica=new LocalReplica(replicaDatabase(device.claims.storeId,deviceId),device.claims.storeId,deviceId,identity,publicKey);
  }
  private async ensureDeviceAccess(){
    if(this.device.claims.expiresAt<=Date.now()+60000){
      const result=await this.device.renew();
      await this.local.table('settings').put({key:'multi_device_access',value:{access:result.access,storeId:result.claims.storeId,deviceId:this.deviceId}});
    }
    if(await this.deviceBlocked()){
      // Only an authenticated device response can lift a persisted local block.
      await this.device.list();
      await this.local.table('settings').delete('multi_device_blocked');
    }
  }
  async employees(online:boolean):Promise<{id:string;name:string;active:number;expiresAt?:number}[]>{
    if(online){
      try{
      await this.ensureDeviceAccess();
      const {employees}=await this.device.list();
      if(!Array.isArray(employees)||employees.some(row=>typeof row.id!=='string'||typeof row.name!=='string'||![0,1].includes(row.active)))throw new AccessError('Daftar karyawan belum tersedia.',503);
      const active=new Map(employees.filter(row=>row.active).map(row=>[row.id,row]));
      const invalid:string[]=[];
      for(const row of await this.replica.db.table('credentials').toArray()){
        const person=active.get(row.id);
        try{const claims=await verifyAccess(row.access,this.deviceId,this.identity,this.publicKey);if(!person||person.epoch!==undefined&&claims.employeeEpoch!<person.epoch)invalid.push(row.id);}catch{invalid.push(row.id);}
      }
      if(invalid.length){
        this.rejectionVersion++;
        await this.replica.db.table('credentials').bulkDelete(invalid);
        const current=(await this.local.table('settings').get('multi_active_employee'))?.value;
        if(current&&invalid.includes(current.id))await this.logout();
      }
      await this.local.table('settings').put({key:'multi_employee_names',value:employees.map(({id,name,active})=>({id,name,active}))});
      return employees;
      }catch(error){await this.handleRejection(error);if(!transportUnavailable(error))throw error;const cached=await this.employees(false);if(cached.length)return cached;throw new AccessError('Nama karyawan belum dapat dimuat. Sambungkan internet lalu perbarui daftar.',503);}
    }
    if(await this.deviceBlocked())throw new AccessError('Akses perangkat perlu diperbarui. Sambungkan internet lalu periksa dengan Pemilik.',403,'device_revoked');
    const known=await this.replica.db.table('credentials').toArray();
    const allowed:{id:string;name:string;active:number;expiresAt?:number}[]=[];
    for(const row of known){
      try{const claims=await verifyAccess(row.access,this.deviceId,this.identity,this.publicKey);if(claims.storeId===this.device.claims.storeId&&claims.employeeId===row.id)allowed.push({id:row.id,name:row.name,active:1,expiresAt:claims.expiresAt});}catch{/* Expired offline authorizations are never shown as usable accounts. */}
    }
    return allowed;
  }
  async login(id:string,pin:string,online:boolean):Promise<{claims:AccessClaims;name:string;access:string}>{
    const rejectionVersion=this.rejectionVersion;
    const stillAllowed=async()=>{
      if(rejectionVersion!==this.rejectionVersion||await this.deviceBlocked()){
        await this.replica.db.table('credentials').delete(id);await this.logout();
        throw new AccessError('Akses berubah. Masuk kembali dengan internet.',403,'employee_revoked');
      }
    };
    // Invalidate the previous operator before checking a new PIN, including a failed switch.
    await this.logout();
    if(online){
      // A definitive server rejection must not fall back to a cached offline PIN.
      let result:{access:string;claims:AccessClaims;offlineVerifier:string;name:string};
      try{await this.ensureDeviceAccess();result=await this.device.call('employee.login',{id,pin});}
      catch(error){
        await this.handleRejection(error,id);
        if(error instanceof AccessError&&error.status===429&&error.code==='account_locked'){
          const until=Math.min(Date.now()+300000,Math.max(Date.now()+1000,error.retryAt||Date.now()+300000));
          await this.replica.db.table('settings').put({key:`attempts:${id}`,attempts:5,lockedUntil:until});
        }
        if(transportUnavailable(error))return this.login(id,pin,false);throw error;
      }
      const claims=await verifyAccess(result.access,this.deviceId,this.identity,this.publicKey);
      if(claims.storeId!==this.device.claims.storeId||claims.employeeId!==id||claims.role!=='cashier')throw new AccessError();
      await stillAllowed();
      await this.replica.rememberEmployee({id,access:result.access,verifier:result.offlineVerifier,name:result.name});
      await this.replica.db.table('settings').delete(`attempts:${id}`);
      await this.replica.useAccess(result.access);
      await this.local.table('settings').put({key:'multi_active_employee',value:{id,access:result.access,name:result.name}});
      await stillAllowed();
      return {claims,name:result.name,access:result.access};
    }
    if(await this.deviceBlocked())throw new AccessError('Akses perangkat perlu diperbarui. Sambungkan internet lalu periksa dengan Pemilik.',403,'device_revoked');
    const claims=await this.replica.loginOffline(id,pin),saved=await this.replica.db.table('credentials').get(id);
    if(!saved)throw new AccessError('Akses berubah. Masuk kembali dengan internet.',403,'employee_revoked');
    await this.local.table('settings').put({key:'multi_active_employee',value:{id,access:saved.access,name:saved.name}});
    await stillAllowed();
    return {claims,name:saved.name,access:saved.access};
  }
  async current(){
    const row=(await this.local.table('settings').get('multi_active_employee'))?.value;
    if(!row)return null;
    try{
      const credential=await this.replica.db.table('credentials').get(row.id);
      if(await this.deviceBlocked()||credential?.access!==row.access)throw new AccessError();
      const claims=await verifyAccess(row.access,this.deviceId,this.identity,this.publicKey);
      if(claims.storeId!==this.device.claims.storeId||claims.employeeId!==row.id||claims.role!=='cashier')throw new AccessError();
      await this.replica.useAccess(row.access);return {claims,name:String(row.name),access:String(row.access)};
    }catch{await this.logout();return null;}
  }
  async logout(){this.replica.logout();await this.local.table('settings').delete('multi_active_employee');}
  async rejectCurrent(){
    const row=(await this.local.table('settings').get('multi_active_employee'))?.value;
    if(row?.id)await this.replica.db.table('credentials').delete(row.id);
    await this.logout();
  }
  private async deviceBlocked(){
    const value=(await this.local.table('settings').get('multi_device_blocked'))?.value;
    const c=this.device.claims;
    return value?.storeId===c.storeId&&value.deviceId===c.deviceId&&value.epoch===c.deviceEpoch;
  }
  async handleRejection(error:unknown,id?:string){
    const e=error as {status?:number;code?:string};
    if(e.status===401||e.status===403)this.rejectionVersion++;
    if(e.code==='device_revoked'||e.code==='license_revoked'||e.status===403&&!e.code){
      const c=this.device.claims;
      await this.local.table('settings').put({key:'multi_device_blocked',value:{storeId:c.storeId,deviceId:c.deviceId,epoch:c.deviceEpoch}});
      await this.replica.db.transaction('rw',this.replica.db.table('credentials'),this.replica.db.table('settings'),async()=>{
        await this.replica.db.table('settings').put({key:'accessBlocked',value:true});
        await this.replica.db.table('credentials').clear();
      });
      await this.logout();
    }else if(e.status===401||e.code==='employee_revoked'){
      if(id)await this.replica.db.table('credentials').delete(id);
      else await this.rejectCurrent();
    }
  }
}
