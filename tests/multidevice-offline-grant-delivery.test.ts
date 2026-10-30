import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import Dexie from 'dexie';
import {DeviceClient} from '../src/lib/multidevice/client';
import {PosSyncFailure} from '../src/lib/multidevice/syncFailure';
import {PosSynchronizer} from '../src/lib/multidevice/posSync';
import {POS_TABLES} from '../src/lib/multidevice/posWire';
import {AccessError,type AccessClaims} from '../src/lib/multidevice/protocol';

test('queued cashier work keeps its original valid grant after login renewal; denial preserves the queue',async t=>{
  const db=new Dexie('grant-test-'+crypto.randomUUID());
  db.version(1).stores({...Object.fromEntries(POS_TABLES.map(name=>[name,'++id'])),posOutbox:'id,ordinal',posMeta:'key',posIds:'key',settings:'key'});
  const now=Date.now(),old:AccessClaims={version:1,storeId:'store',deviceId:'device',deviceKey:'key',role:'cashier',deviceEpoch:1,employeeId:'employee',employeeEpoch:1,issuedAt:now-10000,expiresAt:now+10000};
  const current={...old,issuedAt:now},client=new DeviceClient('renewed',current),used:string[]=[];
  t.mock.method(DeviceClient.prototype,'send',async function(this:DeviceClient,event:any){used.push(this.snapshot().access);return {id:event.id,sequence:1};});
  t.mock.method(DeviceClient.prototype,'pull',async()=>({cursor:0,entities:[],hasMore:false}));
  try{
    const row={id:'queued',ordinal:1,event:{id:'queued'},claims:old,access:'original',attempts:0};
    await db.table('posOutbox').put(row);
    await new PosSynchronizer(db,client).synchronize();
    assert.deepEqual(used,['original']);assert.equal(await db.table('posOutbox').count(),0);
    await db.table('posOutbox').put(row);
    t.mock.method(DeviceClient.prototype,'send',async()=>{throw new AccessError('Akses berakhir.',403);});
    await assert.rejects(new PosSynchronizer(db,client).synchronize(),/Akses berakhir/);
    assert.equal(await db.table('posOutbox').count(),1,'denied work remains recoverable');
    assert.equal((await db.table('posOutbox').get('queued')).errorDetail,'Akses berakhir.');
    await assert.rejects(new PosSynchronizer(db,client).synchronize(),(error:unknown)=>error instanceof PosSyncFailure&&error.phase==='send'&&error.status===403);
    await db.table('posOutbox').clear();
    t.mock.method(DeviceClient.prototype,'pull',async()=>{throw new AccessError('Data belum lengkap.',503);});
    await assert.rejects(new PosSynchronizer(db,client).synchronize(),(error:unknown)=>error instanceof PosSyncFailure&&error.phase==='pull'&&error.status===503);
    assert.equal(await db.table('posOutbox').count(),0);
    t.mock.method(DeviceClient.prototype,'pull',async()=>{throw new Error('private internal stack');});
    await assert.rejects(new PosSynchronizer(db,client).synchronize(),(error:unknown)=>error instanceof PosSyncFailure&&!error.message.includes('private'));

  }finally{await db.delete();}
});
