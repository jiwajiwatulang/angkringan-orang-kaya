import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resumeEmployeeSession,type PosRuntime} from '../src/lib/multidevice/posRuntime';
import {AccessError} from '../src/lib/multidevice/protocol';
import {getPosScope,setPosScope} from '../src/lib/multidevice/posWire';
test('a rejected cached operator returns to login without touching pending deliveries',async()=>{
  for(const status of [401,403]){
    let logouts=0;const pending=['pending-sale'];
    const scope={claims:{role:'cashier'}};
    const runtime={scope,employees:{logout:async()=>{logouts++;}},synchronizer:{pending}} as unknown as PosRuntime;
    setPosScope(scope as any);
    const result=await resumeEmployeeSession(runtime,async()=>{throw new AccessError('Akses berakhir',status);});
    assert.equal(result.scope,undefined);assert.equal(getPosScope(),undefined);assert.equal(logouts,1);assert.deepEqual(pending,['pending-sale']);
  }
});
test('unexpected restore failures remain visible instead of opening a workspace',async()=>{
  const runtime={} as PosRuntime;
  await assert.rejects(()=>resumeEmployeeSession(runtime,async()=>{throw new Error('storage failure');}),/storage failure/);
});
