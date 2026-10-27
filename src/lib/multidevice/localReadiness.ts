import type Dexie from 'dexie';
import {AccessError} from './protocol';
import {sha256} from './offlineAccess';

export async function rememberAccessRejection(local:Dexie,access:string){
  await local.table('settings').put({key:'multi_device_rejected',value:await sha256(access)});
}
export async function wasAccessRejected(local:Dexie,access:string){
  return (await local.table('settings').get('multi_device_rejected'))?.value===await sha256(access);
}

// Only skip the first download after a complete pull has succeeded. Local rows
// alone can be a partial import; they are not a readiness or authorization grant.
export async function prepareLocalSession(local:Dexie,synchronize:()=>Promise<void>,loadSettings:()=>Promise<unknown>,online=navigator.onLine){
  const ready=Number((await local.table('posMeta').get('lastUpdated'))?.value)>0;
  if(!ready){
    if(!online)throw new AccessError('Sambungkan internet untuk menyiapkan kasir pertama kali.',503);
    await synchronize();
  }
  await loadSettings();
}
