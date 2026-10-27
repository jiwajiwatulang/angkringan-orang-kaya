import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {build} from 'esbuild';
import {environment} from '../tests/multideviceFixtures';
import {testSigningJwk,testPublicJwk} from '../tests/securityFixtures';
import {publicKeyIdentity,type DeviceProof} from '../src/lib/licenseProtocol';
import {verifyDeviceProof} from '../src/lib/server/licenseSigning';
import {signAccess} from '../src/lib/server/multideviceCrypto';
import {OFFLINE_ACCESS_MS,type AccessClaims} from '../src/lib/multidevice/protocol';
import {handleMultiDevice} from '../src/lib/server/multideviceHttp';
import {createPairing,approvePairing,saveEmployee} from '../src/lib/server/multideviceAccess';

// Memory-only, loopback-only fixtures. Never load .env or contact production.
async function main(){
  const env=await environment(),output=path.resolve('../qa-multidevice'),port=Number(process.env.SAKUNOTA_QA_PORT||4374),licenseKey='SN-LOCAL-BROWSER-ONLY';
  const bundleOnly=process.argv.includes('--bundle-only');
  const browserPublicKey=bundleOnly?(await (await fetch(`http://localhost:${port}/fixture/config`)).json() as {publicKey:JsonWebKey}).publicKey:testPublicJwk;
  fs.mkdirSync(output,{recursive:true});
  await build({entryPoints:['tests/browser/multidevice.tsx'],bundle:true,platform:'browser',format:'esm',jsx:'automatic',outfile:path.join(output,'app.js'),define:{'process.env':'{}','process.env.NODE_ENV':'"development"','process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE':'"enabled"'},tsconfig:'tsconfig.json',plugins:[{name:'isolated-browser-fixtures',setup(build){
    build.onResolve({filter:/^next\/navigation$/},()=>({path:path.resolve('tests/browser/navigation.ts')}));
    build.onLoad({filter:/[\\/]licenseProtocol\.ts$/},async args=>({contents:fs.readFileSync(args.path,'utf8').replace(/export const LICENSE_PUBLIC_KEY: JsonWebKey = \{[\s\S]*?\};/,`export const LICENSE_PUBLIC_KEY: JsonWebKey = ${JSON.stringify(browserPublicKey)};`),loader:'ts'}));
  }}]});
  const currentStyles=fs.readdirSync('out/_next/static/chunks').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join('out/_next/static/chunks',name),'utf8')).join('\n');
  const fixtureAssets=`img[src="/icon.png"]{content:url("data:image/png;base64,${fs.readFileSync('public/icon.png').toString('base64')}")}`;
  fs.appendFileSync(path.join(output,'app.js'),`\nconst fixtureStyle=document.createElement('style');fixtureStyle.textContent=${JSON.stringify(currentStyles+fixtureAssets)};document.head.append(fixtureStyle);document.body.style.padding='0';\n`);
  if(bundleOnly)return;
  const styles=fs.readdirSync('out/_next/static/chunks').filter(name=>name.endsWith('.css')).map(name=>fs.readFileSync(path.join('out/_next/static/chunks',name),'utf8')).join('\n');
  let owner:AccessClaims|undefined,activePair:{id:string;code:string;expiresAt:number}|undefined;
  const storeId=crypto.createHash('sha256').update(`SakuNota/store/v1/${licenseKey}`).digest('hex');
  const handler=async(request:Request):Promise<Response>=>{
    const url=new URL(request.url);
    if(url.pathname==='/api/store')return handleMultiDevice(request,env);
    if(url.pathname==='/fixture/config')return Response.json({licenseKey,publicKey:testPublicJwk});
    if(url.pathname==='/fixture/owner'&&request.method==='POST'){
      const data=await request.json() as {deviceId:string;proof:DeviceProof};
      const identity=verifyDeviceProof('qa.owner',licenseKey,data.deviceId,'',data.proof);if(!identity)return Response.json({error:'Perangkat tidak sesuai.'},{status:403});
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO Licenses(licenseKey,orderId,businessName,issuedAt,signature,boundDeviceId) VALUES (?,?,?,?,?,?)').bind(licenseKey,'local-fixture','Toko Uji',new Date().toISOString(),'local-fixture',data.deviceId),
        env.DB.prepare('INSERT OR IGNORE INTO LicenseDeviceKeys(licenseKey,deviceId,publicKey) VALUES (?,?,?)').bind(licenseKey,data.deviceId,identity),
        env.DB.prepare('INSERT OR IGNORE INTO MdStores(id,licenseKey) VALUES (?,?)').bind(storeId,licenseKey),
        env.DB.prepare("INSERT OR IGNORE INTO MdDevices(id,storeId,role,publicKey,name) VALUES (?,?,'owner',?,'Perangkat Pemilik')").bind(data.deviceId,storeId,identity),
      ]);
      const saved=await env.DB.prepare("SELECT id,publicKey FROM MdDevices WHERE storeId=? AND role='owner' AND revoked=0").bind(storeId).first<{id:string;publicKey:string}>();
      if(saved?.id!==data.deviceId||saved.publicKey!==identity)return Response.json({error:'Gunakan halaman pemilik yang sama.'},{status:403});
      owner={version:1,storeId,deviceId:data.deviceId,deviceKey:identity,role:'owner',deviceEpoch:1,issuedAt:Date.now(),expiresAt:Date.now()+OFFLINE_ACCESS_MS};
      const employees=await env.DB.prepare('SELECT id FROM MdEmployees WHERE storeId=?').bind(storeId).all();
      if(!employees.results.length&&!process.argv.includes('--empty-employees')){await saveEmployee(env,owner,{id:crypto.randomUUID(),name:'Kasir Pagi',pin:'482953',active:true});await saveEmployee(env,owner,{id:crypto.randomUUID(),name:'Kasir Sore',pin:'958274',active:true});}
      return Response.json({claims:owner,access:signAccess(owner,JSON.stringify(testSigningJwk))});
    }
    if(url.pathname==='/fixture/pair'&&request.method==='POST'&&owner){activePair=await createPairing(env,owner);return Response.json(activePair);}
    if(url.pathname==='/fixture/approve'&&request.method==='POST'&&owner&&activePair){const data=await request.json() as {id:string};if(data.id!==activePair.id)return new Response('',{status:400});return Response.json(await approvePairing(env,owner,data.id));}
    if(url.pathname==='/app.js')return new Response(fs.readFileSync(path.join(output,'app.js')),{headers:{'Content-Type':'text/javascript'}});
    if(url.pathname==='/style.css')return new Response(styles,{headers:{'Content-Type':'text/css'}});
    if(!['/','/pos','/devices'].includes(url.pathname))return new Response('Not found',{status:404});
    return new Response('<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SakuNota — Uji Lokal</title><link rel="stylesheet" href="/style.css"></head><body style="background:#F8FAFC;color:#0F172A;padding:20px"><div id="root"></div><script type="module" src="/app.js"></script></body></html>',{headers:{'Content-Type':'text/html'}});
  };
  http.createServer(async(req,res)=>{
    try{
      if(![`localhost:${port}`,`127.0.0.1:${port}`].includes(req.headers.host||'')){res.writeHead(403);res.end();return;}
      const chunks:Buffer[]=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>8*1024*1024+16384){res.writeHead(413);res.end();return;}chunks.push(Buffer.from(chunk));}
      const body=Buffer.concat(chunks),request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers as Record<string,string>,...(body.length?{body}:{})});
      const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
    }catch{res.writeHead(500);res.end('Local fixture unavailable');}
  }).listen(port,'127.0.0.1',()=>console.log(`Local-only UI fixtures: http://localhost:${port} (owner); http://127.0.0.1:${port} (cashier). No production access.`));
}
void main().catch(()=>{console.error('Local fixture could not start.');process.exitCode=1;});
