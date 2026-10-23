import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {environment,owner} from './multideviceFixtures';
import {submitEvent,pullEntities} from '../src/lib/server/multideviceSync';
import type {AccessClaims,StoreEvent} from '../src/lib/multidevice/protocol';
export const event=(c:AccessClaims,kind:StoreEvent['kind'],entityId:string,data:Record<string,unknown>):StoreEvent=>({id:crypto.randomUUID(),storeId:c.storeId,deviceId:c.deviceId,operatorId:c.employeeId||c.deviceId,kind,entityId,data});

test('catalog versions use server ordering and old price/cost versions stay immutable',async()=>{
  const env=await environment(),o=await owner(env),p=crypto.randomUUID();
  const first=event(o.claims,'catalog.put',p,{expectedVersion:0,name:'Beras',price:18000,cost:12000,unit:'g',priceBasis:1000,active:true});
  await submitEvent(env.DB,o.claims,first);
  await submitEvent(env.DB,o.claims,event(o.claims,'catalog.put',p,{...first.data,expectedVersion:1,price:20000,cost:14000}));
  await assert.rejects(()=>submitEvent(env.DB,o.claims,event(o.claims,'catalog.put',p,first.data)),/berubah/);
  const result=await pullEntities(env.DB,o.claims,0),old=result.entities.find(e=>e.kind==='catalogVersion'&&e.id===`${p}_1`)!;
  assert.equal(old.value.price,18000);assert.equal(old.value.cost,12000);
  const b=await owner(env);assert.equal((await pullEntities(env.DB,b.claims,0)).entities.length,0);
  await assert.rejects(()=>submitEvent(env.DB,b.claims,first));
});
test('repeated delivery and content mismatch never overwrite an accepted event',async()=>{
  const env=await environment(),o=await owner(env),first=event(o.claims,'catalog.put',crypto.randomUUID(),{expectedVersion:0,name:'Teh',price:5000,cost:null,unit:'pcs',priceBasis:1,active:true});
  const results=await Promise.all(Array.from({length:10},()=>submitEvent(env.DB,o.claims,first)));
  assert.equal(new Set(results.map(r=>r.sequence)).size,1);
  assert.equal(await env.DB.prepare('SELECT count(*) n FROM MdEvents').first<number>('n'),1);
  await assert.rejects(()=>submitEvent(env.DB,o.claims,{...first,data:{...first.data,price:100}}),/berbeda/);
});
