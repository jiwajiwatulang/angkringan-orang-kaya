import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker';
import { createD1NodeAdapter, initD1Tables, insertLicenseD1, getLicenseD1 } from '../src/lib/server/d1';
import { signDeviceActivation, verifyDeviceActivationToken } from '../src/lib/server/sakunotaServer';
import { signOfflineLicense } from '../src/lib/server/licenseSigning';
import { LICENSE_PUBLIC_KEY, publicKeyIdentity } from '../src/lib/licenseProtocol';
import { verifyOfflineLicense } from '../src/lib/offlineLicense';
import { generateReceiptHtml, generateZReportHtml, executePrintDocument, generateEscPosReceipt } from '../src/lib/receipt';
import { db } from '../src/lib/dexie';
import { deviceKeyIdentity } from '../src/lib/deviceIdentity';
import { checkCashierAccess } from '../src/lib/licenseGuard';
import { createOrder, clearAllMenus, resetDemoSandbox, exportAllData, importAllData, recordPayment } from '../src/lib/api';
import { submitWaiterOrder } from '../src/lib/waiter';
import { createAdminSession } from '../src/lib/session';
import { isDemoMode, demoSessionValid, DEMO_DURATION_MS } from '../src/lib/demoMode';
import { testDeviceProof, testSigningJwk, testPublicJwk } from './securityFixtures';

function environment() { return { DB:createD1NodeAdapter(':memory:'), ASSETS:{fetch:async()=>new Response('asset')},SAKUNOTA_SERVER_SECRET:'test-only-old-secret',SAKUNOTA_OWNER_USERNAME:'owner-test',SAKUNOTA_OWNER_PASSWORD:'test-only-password',SAKUNOTA_OWNER_SALT:'test-only-salt',SAKUNOTA_LICENSE_PRIVATE_JWK:JSON.stringify(testSigningJwk) }; }
async function request(env:ReturnType<typeof environment>,path:string,method:string,body?:object,token?:string) {
  const response=await worker.fetch(new Request('https://local.invalid'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},body:body?JSON.stringify(body):undefined}),env,{});
  return {status:response.status,body:await response.json() as any};
}
async function license(env:ReturnType<typeof environment>, key:string, boundDeviceId?:string) {
  await initD1Tables(env.DB);
  await insertLicenseD1(env.DB,{licenseKey:key,orderId:'ORDER-'+key,businessName:'Test shop',issuedAt:new Date().toISOString(),signature:'test',boundDeviceId});
}

test('Owner: every method rejects forged tokens before reading, issuing or revoking; valid sync and logout work',async()=>{
  const env=environment();await initD1Tables(env.DB);
  const login=await request(env,'/api/owner/login','POST',{username:env.SAKUNOTA_OWNER_USERNAME,password:env.SAKUNOTA_OWNER_PASSWORD});
  assert.equal(login.status,200);
  const forged=Buffer.from('owner-test:known-session:9999999999999:forged').toString('base64url');
  for(const [path,method,body] of [
    ['/api/owner/orders','PUT',{action:'sync_midtrans',orderId:'ORDER'}],
    ['/api/owner/logout','POST',{}],['/api/owner/orders','GET',undefined],
    ['/api/owner/licenses','PUT',{action:'revoke',licenseKey:'KEY'}],
    ['/api/owner/beta','POST',{action:'convert',registrationId:'REG'}],
    ['/api/owner/tester-license','POST',{recipientName:'Test',durationDays:0}],
    ['/api/owner/secrets','GET',undefined],['/api/owner/metrics','GET',undefined],
  ] as const) {
    const r=await request(env,path,method,body,forged);assert.equal(r.status,401,path);assert.equal(r.body.order,undefined);
  }
  assert.equal((await request(env,'/api/owner/metrics','GET',undefined,login.body.token)).status,200,'forged logout did not revoke genuine session');
  await request(env,'/api/owner/logout','POST',{},login.body.token);
  assert.equal((await request(env,'/api/owner/metrics','GET',undefined,login.body.token)).status,401);
});

test('Device activation: atomic first claim, proof required, copied ID rejected, signed data cannot be changed',async()=>{
  const env=environment(),key='SN-SECURE-ONE';await license(env,key);
  const missing=await request(env,'/api/license/activate','POST',{licenseKey:key,deviceId:'A'});assert.equal(missing.status,400);
  const results=await Promise.all(['A','B'].map(id=>request(env,'/api/license/activate','POST',{licenseKey:key,deviceId:id,deviceProof:testDeviceProof('activate',key,id)})));
  assert.equal(results.filter(r=>r.status===200).length,1);
  const index=results.findIndex(r=>r.status===200),id=['A','B'][index],token=results[index].body.activationToken;
  const proof=testDeviceProof('verify',key,id,token);
  const original={...LICENSE_PUBLIC_KEY};Object.assign(LICENSE_PUBLIC_KEY,testPublicJwk);
  try {
    assert.ok(await verifyOfflineLicense(token,key,id,publicKeyIdentity(proof.publicKey)));
    const parts=token.split('.');const claims=JSON.parse(Buffer.from(parts[1],'base64url').toString());claims.expiresAt='2099-01-01';parts[1]=Buffer.from(JSON.stringify(claims)).toString('base64url');
    assert.equal(await verifyOfflineLicense(parts.join('.'),key,id,publicKeyIdentity(proof.publicKey)),null);
    assert.equal(await verifyOfflineLicense(token,key,id,'another-device-key'),null);
  } finally {Object.assign(LICENSE_PUBLIC_KEY,original);}
  assert.equal((await request(env,'/api/license/verify','POST',{licenseKey:key,deviceId:'',token,deviceProof:proof})).status,400);
  const stolen=await request(env,'/api/license/verify','POST',{licenseKey:key,deviceId:id,token,deviceProof:testDeviceProof('verify',key,id,token,'attacker')});assert.equal(stolen.body.valid,false);
  const valid=await request(env,'/api/license/verify','POST',{licenseKey:key,deviceId:id,token,deviceProof:proof});assert.equal(valid.body.valid,true);
  assert.equal((await getLicenseD1(env.DB,key))?.boundDeviceId,id);
});

test('Legacy migration: cryptographic old token required, ISO trial tokens parse, no merchant data is involved',async()=>{
  const env=environment(),key='SN-LEGACY';await license(env,key,'LEGACY-DEVICE');
  process.env.SAKUNOTA_SERVER_SECRET=env.SAKUNOTA_SERVER_SECRET;
  const expiry=new Date(Date.now()+86400000).toISOString();
  assert.equal(verifyDeviceActivationToken(signDeviceActivation(key,'LEGACY-DEVICE','trial',expiry)).valid,true);
  const token=signDeviceActivation(key,'LEGACY-DEVICE','berbayar',null);
  const bad=await request(env,'/api/license/verify','POST',{licenseKey:key,deviceId:'LEGACY-DEVICE',token:'fake',deviceProof:testDeviceProof('verify',key,'LEGACY-DEVICE','fake')});assert.equal(bad.body.valid,false);
  const migrated=await request(env,'/api/license/verify','POST',{licenseKey:key,deviceId:'LEGACY-DEVICE',token,deviceProof:testDeviceProof('verify',key,'LEGACY-DEVICE',token)});
  assert.equal(migrated.body.valid,true);assert.match(migrated.body.activationToken,/^SN2\./);
  const retry=await request(env,'/api/license/verify','POST',{licenseKey:key,deviceId:'LEGACY-DEVICE',token,deviceProof:testDeviceProof('verify',key,'LEGACY-DEVICE',token)});
  assert.equal(retry.body.valid,true,'lost migration response can be retried using genuine old token plus device key');
});

test('Offline entitlement: valid paid survives network failure; unsigned cache and expired trial cannot record sales',async()=>{
  await db.delete();await db.open();
  const values=new Map<string,string>(),session=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(k:string,v:string)=>{values.set(k,v)},removeItem:(k:string)=>values.delete(k)};
  const previous=['window','navigator','localStorage','sessionStorage'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)] as const);
  const fetch=globalThis.fetch, original={...LICENSE_PUBLIC_KEY};Object.assign(LICENSE_PUBLIC_KEY,testPublicJwk);
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{location:{search:''},localStorage:storage}});
    Object.defineProperty(globalThis,'localStorage',{configurable:true,value:storage});
    Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>session.get(k)??null,setItem:(k:string,v:string)=>session.set(k,v)}});
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
    values.set('sakunota_license_key','SN-OFFLINE');values.set('sakunota_device_id','OFFLINE');
    process.env.SAKUNOTA_LICENSE_PRIVATE_JWK=JSON.stringify(testSigningJwk);
    const claims={v:2 as const,licenseKey:'SN-OFFLINE',deviceId:'OFFLINE',deviceKey:await deviceKeyIdentity(),licenseType:'berbayar' as const,expiresAt:null,businessName:'Test',issuedAt:Date.now()};
    values.set('sakunota_activation_token',signOfflineLicense(claims));assert.equal((await checkCashierAccess()).isValid,true);
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:true}});globalThis.fetch=async()=>{throw Error('network down')};
    assert.equal((await checkCashierAccess(true)).isValid,true,'genuine offline permit survives network failure');
    const keys=(await db.table('settings').get('license_device_keys_v2')).value as CryptoKeyPair;
    assert.equal(keys.privateKey.extractable,false);
    await assert.rejects(()=>crypto.subtle.exportKey('jwk',keys.privateKey));
    await db.table('menuItems').put({id:88,nama:'Waiter test',harga:1000,kategori:'Retail',urutan:0,isSoldOut:false});
    await db.table('tables').put({id:1,nomor:'1',status:'kosong'});
    await db.table('shifts').put({id:1,status:'open',operatorName:'Cashier',startTime:new Date().toISOString(),startingCash:0});
    await db.table('settings').put({key:'pos_store_settings',value:{serviceMode:'resto',adminPin:'1234'}});
    await db.table('settings').put({key:'waiter_floor_session',value:{name:'Waiter',tableIds:[1],startedAt:new Date().toISOString()}});
    await assert.rejects(()=>createOrder({total:1000,status:'paid',tableId:1,items:[{id:88,nama:'Test',qty:1,harga:1000}]}),/pelayan/);
    const draft=await submitWaiterOrder(1,[{menuItemId:88,qty:1,choices:{}}],'','browser-scope');
    assert.ok(draft.id,'waiter draft works inside nested transaction with cryptographic checks');
    await assert.rejects(()=>recordPayment({orderId:Number(draft.id),amount:1000,paymentMethod:'Cash',splitType:'full',operatorName:'Waiter'}),/Waiter Floor/);
    await db.table('settings').delete('waiter_floor_session');
    await createOrder({total:1000,items:[{id:1,nama:'Test',qty:1,harga:1000}]});
    await createAdminSession();
    const snapshot=await exportAllData();
    assert.ok(!JSON.stringify(snapshot).includes('privateKey'));
    assert.ok(!JSON.stringify(snapshot).includes('license_device_keys_v2'));
    await importAllData(snapshot);
    assert.ok(await db.table('settings').get('license_device_keys_v2'),'restore preserves this device key');
    assert.equal((await checkCashierAccess()).isValid,true,'restoring merchant data does not break the licensed device');
    values.set('sakunota_activation_token','UNSIGNED');values.set('sakunota_license_type','berbayar');assert.equal((await checkCashierAccess()).isValid,false);
    await assert.rejects(()=>createOrder({total:1000,items:[{id:1,nama:'Test',qty:1,harga:1000}]}));
    values.set('sakunota_activation_token',signOfflineLicense({...claims,licenseType:'trial',expiresAt:'2000-01-01T00:00:00Z'}));values.set('sakunota_trial_expires_at','2099-01-01T00:00:00Z');
    assert.equal((await checkCashierAccess()).status,'trial_expired');
    await assert.rejects(()=>createOrder({total:1000,items:[{id:1,nama:'Test',qty:1,harga:1000}]}));
    assert.equal(await db.table('orders').count(),2,'rejected transactions did not change original sale and waiter draft');
    session.delete('sakunota_admin_session_token');
    await assert.rejects(()=>clearAllMenus(),/Admin/);
    values.set('sakunota_license_key','SN-OFFLINE');values.set('sakunota_activation_token',signOfflineLicense(claims));
    globalThis.fetch=async()=>Response.json({valid:false,status:'revoked'});
    assert.equal((await checkCashierAccess(true)).isValid,false);
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{onLine:false}});
    assert.equal((await checkCashierAccess()).isValid,false,'known revocation does not turn into valid offline fallback');
  } finally {
    globalThis.fetch=fetch;Object.assign(LICENSE_PUBLIC_KEY,original);
    for(const [key,d] of previous){if(d)Object.defineProperty(globalThis,key,d);else delete (globalThis as any)[key];}
  }
});

test('Public rate limits: rejected request does not create an order or affect payment webhook processing',async()=>{
  const env={...environment(),PUBLIC_RATE_LIMITER:{limit:async()=>({success:false})}};
  const limited=await request(env,'/api/orders/create','POST',{buyerName:'Test',businessName:'Test',whatsapp:'08123456789'});
  assert.equal(limited.status,429);
  await initD1Tables(env.DB);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM CustomerOrders').first<{n:number}>())?.n,0);
  const callback=await request(env,'/api/payment/midtrans','POST',{});
  assert.notEqual(callback.status,429,'gateway notifications are not throttled by customer request limit');
});

test('Print: all user strings escaped, external logo removed, iframe disables scripts while printing remains callable',async()=>{
  const payload='<script>parent.audit=true</script><img src=x onerror=alert(1)>';
  const config={storeName:payload,storeAddress:payload,storePhone:payload,storeLogo:'https://external.invalid/track',receiptFooter:payload,paperWidth:'58mm',enableWatermark:true} as any;
  const html=generateReceiptHtml({customerName:payload,notes:payload,operatorName:payload,items:[{nama:payload,qty:1,harga:1000,notes:payload,selectedModifiers:[{optionName:payload,harga:0}]}],total:1000},'all',config);
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img src=x'));assert.ok(!html.includes('external.invalid'));assert.ok(html.includes('&lt;script&gt;'));
  const report=generateZReportHtml({operatorName:payload,notes:payload},config);assert.ok(!report.includes('<script>'));
  const thermal=generateEscPosReceipt({customerName:'Audit\x1bXYZ',items:[],total:0},'all',config);
  assert.ok(!thermal.includes('Audit\x1bXYZ'),'user text cannot inject ESC/POS control characters');assert.ok(thermal.includes('AuditXYZ'));
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldDoc=Object.getOwnPropertyDescriptor(globalThis,'document');
  const attributes:Record<string,string>={};let printed=0,written='';
  const frame={style:{},setAttribute:(key:string,value:string)=>{attributes[key]=value},contentDocument:{open(){},write(s:string){written=s},close(){}},contentWindow:{focus(){},print(){printed++}}};
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
    Object.defineProperty(globalThis,'document',{configurable:true,value:{getElementById:()=>null,createElement:()=>frame,body:{appendChild(){}}}});
    assert.equal((await executePrintDocument({title:'Test',escposText:'Test',htmlContent:html})).success,true);
    assert.ok(!attributes.sandbox.includes('allow-scripts'));assert.equal(printed,1);assert.equal(written,html);
  } finally {for(const [key,d] of [['window',oldWindow],['document',oldDoc]] as const){if(d)Object.defineProperty(globalThis,key,d);else delete (globalThis as any)[key];}}
});

test('Demo: exact query parsing, expires without clearing merchant records; real database cannot be reset as demo',async()=>{
  await db.table('menuItems').put({id:999,nama:'Merchant original',harga:5000,kategori:'Retail'});
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldSession=Object.getOwnPropertyDescriptor(globalThis,'sessionStorage');
  const state=new Map<string,string>();const location={search:'?notdemo=true'};
  try {
    Object.defineProperty(globalThis,'window',{configurable:true,value:{location}});
    Object.defineProperty(globalThis,'sessionStorage',{configurable:true,value:{getItem:(k:string)=>state.get(k)??null,setItem:(k:string,v:string)=>state.set(k,v)}});
    assert.equal(isDemoMode(),false);location.search='?demo=true';assert.equal(isDemoMode(),true);assert.equal(demoSessionValid(),true);
    state.set('sakunota_demo_started_at',String(Date.now()-DEMO_DURATION_MS-100));assert.equal(demoSessionValid(),false);
    await assert.rejects(()=>resetDemoSandbox(),/database demo/);
    assert.equal((await db.table('menuItems').get(999)).nama,'Merchant original');
  } finally {for(const [key,d] of [['window',oldWindow],['sessionStorage',oldSession]] as const){if(d)Object.defineProperty(globalThis,key,d);else delete (globalThis as any)[key];}}
});

test('Beta privacy: phone lookup disabled; registration receipt never exports trial key or device identifier',async()=>{
  const env=environment();const registration=await request(env,'/api/beta/register','POST',{ownerName:'Test',businessName:'Private shop',whatsapp:'08123456789'});
  const id=registration.body.registration.registrationId;assert.match(id,/^REG-[A-F0-9]{48}$/);
  const phone=await request(env,'/api/beta/status?q=08123456789','GET');assert.equal(phone.status,400);
  const status=await request(env,'/api/beta/status?q='+id,'GET');assert.equal(status.status,200);
  assert.equal(status.body.registration.trialLicenseKey,undefined);assert.equal(status.body.registration.boundDeviceId,undefined);assert.equal(status.body.registration.businessName,undefined);
});
