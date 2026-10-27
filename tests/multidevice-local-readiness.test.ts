import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {prepareLocalSession,rememberAccessRejection,wasAccessRejected} from '../src/lib/multidevice/localReadiness';
import {readDeviceList,rememberDeviceList} from '../src/lib/multidevice/deviceListCache';
import type {AccessClaims} from '../src/lib/multidevice/protocol';
import {AccessError} from '../src/lib/multidevice/protocol';

test('a completed local pull opens offline or on slow internet without starting another download',{timeout:2000},async()=>{
  const local=new Dexie(`ready-${crypto.randomUUID()}`);local.version(1).stores({posMeta:'key'});
  try{
    await local.table('posMeta').put({key:'lastUpdated',value:Date.now()});
    for(const online of [true,false]){
      let calls=0,settings=0;
      await prepareLocalSession(local,async()=>{calls++;await new Promise(()=>{});},async()=>{settings++;},online);
      assert.equal(calls,0);assert.equal(settings,1);
    }
  }finally{await local.delete();}
});

test('a known access rejection survives reload without storing the credential again or clearing pending sales',async()=>{
  const local=new Dexie(`denied-${crypto.randomUUID()}`);local.version(1).stores({settings:'key',posOutbox:'id'});
  try{
    await local.table('posOutbox').put({id:'pending-sale'});
    await rememberAccessRejection(local,'old-signed-grant');
    assert.equal(await wasAccessRejected(local,'old-signed-grant'),true);
    assert.equal(await wasAccessRejected(local,'fresh-signed-grant'),false);
    assert.equal(JSON.stringify(await local.table('settings').toArray()).includes('old-signed-grant'),false);
    assert.equal(await local.table('posOutbox').count(),1);
  }finally{await local.delete();}
});

test('first use waits for a successful pull and cannot masquerade as ready after a network or access failure',async()=>{
  const local=new Dexie(`first-${crypto.randomUUID()}`);local.version(1).stores({posMeta:'key'});
  try{
    const calls:string[]=[];
    await assert.rejects(()=>prepareLocalSession(local,async()=>{calls.push('pull');},async()=>{calls.push('settings');},false),/pertama kali/);
    assert.equal(calls.length,0);
    for(const status of [401,403,503])await assert.rejects(()=>prepareLocalSession(local,async()=>{throw new AccessError('denied',status);},async()=>{throw new Error('must not open');},true),(error:unknown)=>error instanceof AccessError&&error.status===status);
    await prepareLocalSession(local,async()=>{calls.push('pull');},async()=>{calls.push('settings');},true);
    assert.deepEqual(calls,['pull','settings']);
  }finally{await local.delete();}
});

test('device list copy is display only, scoped to store/device/epoch, with no pairing or credential secrets',async()=>{
  const local=new Dexie(`list-${crypto.randomUUID()}`);local.version(1).stores({settings:'key'});
  const claims={role:'owner',storeId:'shop',deviceId:'owner',deviceEpoch:1} as AccessClaims;
  try{
    await rememberDeviceList(local,claims,{devices:[{id:'owner',name:'Pemilik',role:'owner',revoked:0}],employees:[{id:'operator',name:'Pagi',active:1,pin:'do-not-cache',access:'do-not-cache'} as any],pairings:[{id:'request',candidateName:'private-request',expiresAt:100}]});
    const cached=await readDeviceList(local,claims);assert.ok(cached?.savedAt);assert.equal(cached?.list.employees[0].name,'Pagi');assert.deepEqual(cached?.list.pairings,[]);
    assert.equal(/do-not-cache|private-request/.test(JSON.stringify(await local.table('settings').toArray())),false);
    for(const other of [{storeId:'other'},{deviceId:'other'},{deviceEpoch:2}])assert.equal(await readDeviceList(local,{...claims,...other}),null);
    await assert.rejects(()=>readDeviceList(local,{...claims,role:'cashier'}),AccessError);
  }finally{await local.delete();}
});
