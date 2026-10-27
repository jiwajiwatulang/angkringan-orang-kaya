import type Dexie from 'dexie';
import type {AccessList} from './client';
import type {AccessClaims} from './protocol';
import {AccessError} from './protocol';

function cacheKey(claims:AccessClaims){
  if(claims.role!=='owner'||claims.employeeId)throw new AccessError();
  return `device_list:${claims.storeId}:${claims.deviceId}:${claims.deviceEpoch}`;
}
export async function readDeviceList(local:Dexie,claims:AccessClaims):Promise<{list:AccessList;savedAt:number}|null>{
  const value=(await local.table('settings').get(cacheKey(claims)))?.value;
  return value&&Array.isArray(value.list?.employees)&&Array.isArray(value.list?.devices)?value:null;
}
export async function rememberDeviceList(local:Dexie,claims:AccessClaims,list:AccessList){
  // Display-only data. Never cache pairing approvals, PINs, or access credentials here.
  const value={savedAt:Date.now(),list:{devices:(list.devices||[]).map(({id,name,role,revoked})=>({id,name,role,revoked})),employees:list.employees.map(({id,name,active})=>({id,name,active})),pairings:[]}};
  await local.table('settings').put({key:cacheKey(claims),value});return value;
}
