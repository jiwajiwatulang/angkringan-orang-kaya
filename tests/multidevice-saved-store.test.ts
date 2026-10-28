import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {findSavedStores,reopenSavedStore} from '../src/lib/savedStoreRecovery';
import {signAccess} from '../src/lib/server/multideviceCrypto';
import {publicKeyIdentity} from '../src/lib/licenseProtocol';
import {testSigningJwk,testPublicJwk} from './securityFixtures';
import type {AccessClaims} from '../src/lib/multidevice/protocol';
import {sha256} from '../src/lib/multidevice/offlineAccess';

async function saved(){
  const storeId='b'.repeat(64),deviceId=crypto.randomUUID(),name=`SakuNotaPOS-${storeId}-${deviceId}`;
  const local=new Dexie(name);local.version(1).stores({settings:'key',menuItems:'id',orders:'id',posOutbox:'id'});
  const privateKey=await crypto.subtle.importKey('jwk',testSigningJwk,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const publicKey=await crypto.subtle.importKey('jwk',testPublicJwk,{name:'ECDSA',namedCurve:'P-256'},true,['verify']);
  const claims:AccessClaims={version:1,storeId,deviceId,deviceKey:publicKeyIdentity(testPublicJwk),role:'owner',deviceEpoch:1,issuedAt:Date.now(),expiresAt:Date.now()+3600000};
  const access=signAccess(claims,JSON.stringify(testSigningJwk));
  await local.table('settings').bulkPut([{key:'multi_device_access',value:{access}},{key:'license_device_keys_v2',value:{privateKey,publicKey}},{key:'pos_store_settings',value:{storeName:'Toko Lama'}}]);
  await local.table('menuItems').put({id:1,nama:'Produk'});await local.table('orders').put({id:1});await local.table('posOutbox').put({id:'pending'});
  return {local,name,claims};
}
test('same-profile recovery locates original data after navigation metadata is missing and does not copy credentials',async()=>{
  const f=await saved();try{
    const found=await findSavedStores(testPublicJwk);assert.equal(found.find(s=>s.name===f.name)?.receipts,1);
    const storage=new Map<string,string>();
    await reopenSavedStore(f.name,{setItem:(k,v)=>{storage.set(k,v);},removeItem:k=>{storage.delete(k);}},testPublicJwk);
    assert.equal(storage.get('sakunota_device_id'),f.claims.deviceId);
    assert.deepEqual(JSON.parse(storage.get('sakunota_pos_partition')!),{storeId:f.claims.storeId,deviceId:f.claims.deviceId});
    assert.equal([...storage.keys()].some(k=>/access|activation|private|pin/.test(k)),false);
    assert.equal(await f.local.table('posOutbox').count(),1);assert.equal(await f.local.table('orders').count(),1);
  }finally{await f.local.delete();}
});
test('expired, forged and mismatched store selections cannot set an active partition',async()=>{
  const f=await saved();try{
    let changes=0;const storage={setItem:()=>{changes++;},removeItem:()=>{changes++;}};
    for(const claims of [{...f.claims,issuedAt:Date.now()-7200000,expiresAt:Date.now()-1000},{...f.claims,storeId:'c'.repeat(64)}]){
      await f.local.table('settings').put({key:'multi_device_access',value:{access:signAccess(claims,JSON.stringify(testSigningJwk))}});
      assert.equal((await findSavedStores(testPublicJwk)).some(s=>s.name===f.name),false);
      await assert.rejects(()=>reopenSavedStore(f.name,storage,testPublicJwk));assert.equal(changes,0);
    }
    await f.local.table('settings').put({key:'multi_device_access',value:{access:'SNMD1.invalid.invalid'}});
    await assert.rejects(()=>reopenSavedStore(f.name,storage,testPublicJwk));assert.equal(changes,0);
  }finally{await f.local.delete();}
});
test('a genuinely separate storage context is not represented as having imported browser data',async()=>{
  const f=await saved();await f.local.delete();
  assert.equal((await findSavedStores(testPublicJwk)).some(s=>s.name===f.name),false);
});
test('a saved public identity without the matching private key cannot be reopened',async()=>{
  const f=await saved();try{
    const other=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},false,['sign','verify']);
    const current=(await f.local.table('settings').get('license_device_keys_v2')).value;
    await f.local.table('settings').put({key:'license_device_keys_v2',value:{...current,privateKey:other.privateKey}});
    assert.equal((await findSavedStores(testPublicJwk)).some(s=>s.name===f.name),false);
  }finally{await f.local.delete();}
});
test('legacy browser data can be selected without altering the license or copying business records',async()=>{
  const local=new Dexie('AngkringanDB');local.version(1).stores({settings:'key',menuItems:'id',orders:'id'});
  try{
    await local.table('menuItems').put({id:1});
    const storage=new Map([['sakunota_activation_token','existing-license'],['sakunota_device_id','existing-device'],['sakunota_pos_partition','other']]);
    await reopenSavedStore(local.name,{setItem:(k,v)=>{storage.set(k,v);},removeItem:k=>{storage.delete(k);}},testPublicJwk);
    assert.equal(storage.has('sakunota_pos_partition'),false);assert.equal(storage.get('sakunota_activation_token'),'existing-license');assert.equal(storage.get('sakunota_device_id'),'existing-device');
    assert.equal(await local.table('menuItems').count(),1);
  }finally{await local.delete();}
});
test('known access rejection is never offered as a saved-store shortcut',async()=>{
  const f=await saved();const legacy=new Dexie('AngkringanDB');legacy.version(1).stores({settings:'key',menuItems:'id',orders:'id'});try{
    await legacy.table('menuItems').put({id:1});
    await f.local.table('settings').put({key:'multi_device_blocked',value:{storeId:f.claims.storeId,deviceId:f.claims.deviceId,epoch:f.claims.deviceEpoch}});
    assert.equal((await findSavedStores(testPublicJwk)).some(s=>s.name===f.name),false);
    assert.equal((await findSavedStores(testPublicJwk)).some(s=>s.name==='AngkringanDB'),false);
    await f.local.table('settings').delete('multi_device_blocked');
    const access=(await f.local.table('settings').get('multi_device_access')).value.access;
    await f.local.table('settings').put({key:'multi_device_rejected',value:await sha256(access)});
    await assert.rejects(()=>reopenSavedStore(f.name,{setItem:()=>assert.fail('must not reopen'),removeItem:()=>assert.fail('must not reopen')},testPublicJwk));
    assert.equal(await f.local.table('orders').count(),1);
  }finally{await f.local.delete();await legacy.delete();}
});
