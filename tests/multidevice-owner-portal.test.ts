import {test} from 'node:test';
import assert from 'node:assert/strict';
import {environment,owner} from './multideviceFixtures';
import {listOwnerStores} from '../src/lib/server/ownerDevices';
import {onRequestGet} from '../functions/api/owner/devices';
import {createSessionD1,revokeSessionD1} from '../src/lib/server/d1';
import {signOwnerSession} from '../src/lib/server/sakunotaServer';

test('portal owner lists two active slots, preserves receipt time and excludes private data and revoked devices',async()=>{
  const env=await environment(),session=await owner(env);
  await env.DB.prepare("INSERT INTO MdDevices(id,storeId,role,publicKey,name) VALUES ('cashier-live',?,'cashier','private-key','Kasir Depan')").bind(session.claims.storeId).run();
  await env.DB.prepare("INSERT INTO MdDevices(id,storeId,role,publicKey,name,revoked) VALUES ('cashier-old',?,'cashier','private-key','Lama',1)").bind(session.claims.storeId).run();
  await env.DB.prepare("INSERT INTO MdEvents(storeId,id,deviceId,operatorId,kind,entityId,payload,digest,receivedAt) VALUES (?,'event','cashier-live','employee','pos.commit','entity','secret-finance','digest',123456)").bind(session.claims.storeId).run();
  const page=await listOwnerStores(env.DB);
  assert.equal(page.items[0].devices.length,2);assert.equal(page.items[0].devices[1].lastReceivedAt,123456);
  assert.equal(/secret-finance|private-key|cashier-old|operatorId|payload/.test(JSON.stringify(page)),false);
  for(let i=0;i<21;i++)await env.DB.prepare('INSERT INTO MdStores(id,licenseKey) VALUES (?,?)').bind(i.toString(16).padStart(64,'0'),`PAGE-${i}`).run();
  const first=await listOwnerStores(env.DB);assert.equal(first.items.length,20);assert.ok(first.next);
  const second=await listOwnerStores(env.DB,first.next!);assert.equal(second.items.length,2);
  assert.equal(new Set([...first.items,...second.items].map(item=>item.licenseKey)).size,22);
});

test('portal endpoint requires a live owner session, stays off without the flag and rejects invalid paging',async()=>{
  const env=await environment();const previous=process.env.SAKUNOTA_SERVER_SECRET;process.env.SAKUNOTA_SERVER_SECRET='local-test-owner-secret';
  try{
    const invoke=(token='',after='')=>onRequestGet({env,request:new Request(`https://example.test/api/owner/devices?after=${encodeURIComponent(after)}`,{headers:{Authorization:`Bearer ${token}`}})});
    assert.equal((await invoke()).status,401);
    await createSessionD1(env.DB,'portal-test','test-owner',Date.now()+60000);
    const token=signOwnerSession('test-owner','portal-test');
    const good=await invoke(token);assert.equal(good.status,200);assert.equal(good.headers.get('Cache-Control'),'no-store');
    assert.equal((await invoke(token,'invalid')).status,400);
    env.SAKUNOTA_MULTI_DEVICE=undefined;assert.equal((await (await invoke(token)).json()).enabled,false);
    await revokeSessionD1(env.DB,'portal-test');assert.equal((await invoke(token)).status,401);
  }finally{if(previous===undefined)delete process.env.SAKUNOTA_SERVER_SECRET;else process.env.SAKUNOTA_SERVER_SECRET=previous;}
});
