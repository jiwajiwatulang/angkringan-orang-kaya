import Dexie from 'dexie';
import {LICENSE_PUBLIC_KEY,publicKeyIdentity} from './licenseProtocol';
import {verifyAccess,sha256} from './multidevice/offlineAccess';

export interface SavedStore {name:string;storeName:string;products:number;receipts:number;storeId:string;deviceId:string}
const partition=/^SakuNotaPOS-([a-f0-9]{64})-([\w-]{16,80})$/;

// Discovery stays inside the current origin/profile. It never copies device keys
// between browsers and never grants access on the strength of a database name.
export async function findSavedStores(publicKey=LICENSE_PUBLIC_KEY):Promise<SavedStore[]>{
  const names=await Dexie.getDatabaseNames(),found:SavedStore[]=[];
  // Once a profile has a paired store, never offer a legacy-mode downgrade that
  // could step around a known device rejection or reopen the pre-pairing copy.
  const hasPairedStore=names.some(name=>partition.test(name));
  for(const name of names.filter(name=>name==='AngkringanDB'&&!hasPairedStore||partition.test(name)).slice(0,50)){
    const local=new Dexie(name);
    try{
      await local.open();
      if(name==='AngkringanDB'){
        const products=await local.table('menuItems').count(),receipts=await local.table('orders').count();
        const settings=(await local.table('settings').get('pos_store_settings'))?.value;
        if(products||receipts)found.push({name,storeId:'',deviceId:'',storeName:String(settings?.storeName||'Data dari browser').slice(0,100),products,receipts});
        continue;
      }
      const match=name.match(partition)!;
      const saved=(await local.table('settings').get('multi_device_access'))?.value;
      const keys=(await local.table('settings').get('license_device_keys_v2'))?.value;
      if(!saved?.access||keys?.privateKey?.type!=='private'||!keys.publicKey)continue;
      const challenge=crypto.getRandomValues(new Uint8Array(32));
      const signature=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},keys.privateKey,challenge);
      if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},keys.publicKey,signature,challenge))continue;
      const identity=publicKeyIdentity(await crypto.subtle.exportKey('jwk',keys.publicKey));
      const claims=await verifyAccess(saved.access,match[2],identity,publicKey);
      if(claims.storeId!==match[1])continue;
      const blocked=(await local.table('settings').get('multi_device_blocked'))?.value;
      if(blocked?.storeId===claims.storeId&&blocked.deviceId===claims.deviceId&&blocked.epoch===claims.deviceEpoch)continue;
      if((await local.table('settings').get('multi_device_rejected'))?.value===await sha256(saved.access))continue;
      const settings=(await local.table('settings').get('pos_store_settings'))?.value;
      found.push({name,storeId:claims.storeId,deviceId:claims.deviceId,storeName:String(settings?.storeName||'Toko tersimpan').slice(0,100),products:await local.table('menuItems').count(),receipts:await local.table('orders').count()});
    }catch{/* A missing, expired, or unverifiable session requires normal online login. */}
    finally{local.close();}
  }
  return found;
}

export async function reopenSavedStore(name:string,storage:Pick<Storage,'setItem'|'removeItem'>=localStorage,publicKey=LICENSE_PUBLIC_KEY){
  // Revalidate at click time. Never trust a stale UI selection or supplied IDs.
  const store=(await findSavedStores(publicKey)).find(store=>store.name===name);
  if(!store)throw new Error('Masuk kembali dengan internet untuk membuka toko ini.');
  if(store.name==='AngkringanDB')storage.removeItem('sakunota_pos_partition');
  else{
    storage.setItem('sakunota_device_id',store.deviceId);
    storage.setItem('sakunota_pos_partition',JSON.stringify({storeId:store.storeId,deviceId:store.deviceId}));
  }
  storage.removeItem('sakunota_demo_mode');
}
