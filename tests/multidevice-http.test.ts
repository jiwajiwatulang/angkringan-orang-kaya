import {test} from 'node:test';
import assert from 'node:assert/strict';
import {environment,owner,requestProof} from './multideviceFixtures';
import {handleMultiDevice} from '../src/lib/server/multideviceHttp';
import worker from '../src/worker';
import {MAX_DELIVERY_BYTES} from '../src/lib/multidevice/limits';

test('the existing Worker does not expose store operations while the feature is off',async()=>{
  const env=await environment();env.SAKUNOTA_MULTI_DEVICE=undefined;
  const response=await worker.fetch(new Request('https://test/api/store',{method:'POST',body:'{}'}),{...env,ASSETS:{fetch:async()=>new Response()}},{});
  assert.equal(response.status,404);assert.deepEqual(await response.json(),{error:'Halaman tidak tersedia.'});
});
test('HTTP verifies proof before dispatch and refuses unbounded or malformed bodies',async()=>{
  const env=await environment(),o=await owner(env),data={},proof=requestProof('list',o.claims,o.access,data);
  const request=(body:unknown)=>new Request('https://test/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const response=await handleMultiDevice(request({action:'list',data,access:o.access,proof}),env);
  assert.equal(response.status,200);const body=await response.text();assert.equal(/verifier|publicKey|licenseKey|SN2\./.test(body),false);
  assert.equal((await handleMultiDevice(request({action:'list',data,access:o.access}),env)).status,400);
  assert.equal((await handleMultiDevice(request({action:'list',data:{injected:true},access:o.access,proof}),env)).status,401);
  assert.equal((await handleMultiDevice(request({data:'x'.repeat(MAX_DELIVERY_BYTES+20000)}),env)).status,413);
});
test('two-device polling has a separate budget while account entry keeps its stricter limit',async()=>{
  const env=await environment(),o=await owner(env);let syncCalls=0,authCalls=0;
  const limits={...env,MULTI_DEVICE_RATE_LIMITER:{limit:async()=>({success:++syncCalls<=120})},PUBLIC_RATE_LIMITER:{limit:async()=>({success:++authCalls<=30})}};
  const call=async(action:string,data:Record<string,unknown>)=>handleMultiDevice(new Request('https://test/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,access:o.access,proof:requestProof(action,o.claims,o.access,data)})}),limits);
  for(let i=0;i<40;i++)assert.equal((await call('pull',{cursor:0})).status,200);
  assert.equal(authCalls,0);
  for(let i=0;i<30;i++)assert.equal((await call('list',{})).status,200);
  assert.equal((await call('list',{})).status,429);assert.equal(authCalls,31);
});
