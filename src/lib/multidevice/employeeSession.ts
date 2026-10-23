import type Dexie from 'dexie';
import {AccessError,type AccessClaims} from './protocol';
import {verifyAccess} from './offlineAccess';
import {LocalReplica,replicaDatabase} from './replica';
import type {DeviceClient} from './client';
import {LICENSE_PUBLIC_KEY} from '../licenseProtocol';

export class EmployeeSessions {
  readonly replica:LocalReplica;
  constructor(private device:DeviceClient,private local:Dexie,private deviceId:string,private identity:string,private publicKey:JsonWebKey=LICENSE_PUBLIC_KEY){
    if(device.claims.role!=='cashier'||device.claims.deviceId!==deviceId||device.claims.deviceKey!==identity||device.claims.employeeId)throw new AccessError();
    this.replica=new LocalReplica(replicaDatabase(device.claims.storeId,deviceId),device.claims.storeId,deviceId,identity,publicKey);
  }
  private async ensureDeviceAccess(){
    if(this.device.claims.expiresAt>Date.now()+60000)return;
    const result=await this.device.renew();
    await this.local.table('settings').put({key:'multi_device_access',value:{access:result.access,storeId:result.claims.storeId,deviceId:this.deviceId}});
  }
  async employees(online:boolean){
    if(online){
      await this.ensureDeviceAccess();
      const {employees}=await this.device.list();
      await this.local.table('settings').put({key:'multi_employee_names',value:employees.map(({id,name,active})=>({id,name,active}))});
      return employees;
    }
    const known=await this.replica.db.table('credentials').toArray();
    const allowed:{id:string;name:string;active:number}[]=[];
    for(const row of known){
      try{const claims=await verifyAccess(row.access,this.deviceId,this.identity,this.publicKey);if(claims.storeId===this.device.claims.storeId&&claims.employeeId===row.id)allowed.push({id:row.id,name:row.name,active:1});}catch{/* Expired offline authorizations are never shown as usable accounts. */}
    }
    return allowed;
  }
  async login(id:string,pin:string,online:boolean):Promise<{claims:AccessClaims;name:string;access:string}>{
    // Invalidate the previous operator before checking a new PIN, including a failed switch.
    await this.logout();
    if(online){
      await this.ensureDeviceAccess();
      // A definitive server rejection must not fall back to a cached offline PIN.
      let result:{access:string;claims:AccessClaims;offlineVerifier:string;name:string};
      try{result=await this.device.call('employee.login',{id,pin});}
      catch(error){if(error instanceof AccessError && error.status>=400 && error.status<500)await this.replica.db.table('credentials').delete(id);throw error;}
      const claims=await verifyAccess(result.access,this.deviceId,this.identity,this.publicKey);
      if(claims.storeId!==this.device.claims.storeId||claims.employeeId!==id||claims.role!=='cashier')throw new AccessError();
      await this.replica.rememberEmployee({id,access:result.access,verifier:result.offlineVerifier,name:result.name});
      await this.replica.useAccess(result.access);
      await this.local.table('settings').put({key:'multi_active_employee',value:{id,access:result.access,name:result.name}});
      return {claims,name:result.name,access:result.access};
    }
    const claims=await this.replica.loginOffline(id,pin),saved=await this.replica.db.table('credentials').get(id);
    await this.local.table('settings').put({key:'multi_active_employee',value:{id,access:saved.access,name:saved.name}});
    return {claims,name:saved.name,access:saved.access};
  }
  async current(){
    const row=(await this.local.table('settings').get('multi_active_employee'))?.value;
    if(!row)return null;
    try{
      const claims=await verifyAccess(row.access,this.deviceId,this.identity,this.publicKey);
      if(claims.storeId!==this.device.claims.storeId||claims.employeeId!==row.id||claims.role!=='cashier')throw new AccessError();
      await this.replica.useAccess(row.access);return {claims,name:String(row.name),access:String(row.access)};
    }catch{await this.logout();return null;}
  }
  async logout(){this.replica.logout();await this.local.table('settings').delete('multi_active_employee');}
}
