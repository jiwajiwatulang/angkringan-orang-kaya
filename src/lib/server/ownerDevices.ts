import type {D1Database} from './d1';

// Metadata only: never select event bodies, employee PINs or device keys.
export async function listOwnerStores(db:D1Database,after='') {
  const stores=await db.prepare('SELECT id,licenseKey FROM MdStores WHERE id>? ORDER BY id LIMIT 21').bind(after).all<{id:string;licenseKey:string}>();
  const page=stores.results.slice(0,20);
  const items=await Promise.all(page.map(async store=>{
    const devices=await db.prepare(`SELECT d.id,d.name,d.role,
      (SELECT MAX(e.receivedAt) FROM MdEvents e WHERE e.storeId=d.storeId AND e.deviceId=d.id) AS lastReceivedAt
      FROM MdDevices d WHERE d.storeId=? AND d.revoked=0 ORDER BY d.role DESC,d.id`).bind(store.id).all<{id:string;name:string;role:string;lastReceivedAt:number|null}>();
    return {licenseKey:store.licenseKey,devices:devices.results};
  }));
  return {items,next:stores.results.length>20?page[page.length-1].id:null};
}
