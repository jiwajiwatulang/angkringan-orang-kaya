import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import Dexie from 'dexie';
import {environment,owner,requestProof} from './multideviceFixtures';
import {testDeviceProof,testPublicJwk} from './securityFixtures';
import {DeviceClient} from '../src/lib/multidevice/client';
import {EmployeeSessions} from '../src/lib/multidevice/employeeSession';
import {createPairing,requestPairing,approvePairing,saveEmployee} from '../src/lib/server/multideviceAccess';
import {handleMultiDevice} from '../src/lib/server/multideviceHttp';
import {AccessError} from '../src/lib/multidevice/protocol';

test('operator switches revoke the previous local session; only previously validated employees may sign in offline',async()=>{
  const env=await environment(),o=await owner(env),pair=await createPairing(env,o.claims),id=crypto.randomUUID();
  const request=()=>({code:pair.code,deviceId:id,deviceName:'Tablet',proof:testDeviceProof('multi.pair',pair.code,id)});
  await requestPairing(env,request());await approvePairing(env,o.claims,pair.id);const device=await requestPairing(env,request());if(device.pending)throw new Error();
  class TestClient extends DeviceClient {
    async call<T>(action:string,data:Record<string,unknown>={}):Promise<T>{
      if(device.pending)throw new Error();
      const response=await handleMultiDevice(new Request('http://local/api/store',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,data,access:device.access,proof:requestProof(action,device.claims,device.access,data)})}),env);
      const result=await response.json() as {error?:string};if(!response.ok)throw new AccessError(result.error,response.status);return result as T;
    }
  }
  const first=crypto.randomUUID(),second=crypto.randomUUID();
  await saveEmployee(env,o.claims,{id:first,name:'Pagi',pin:'482953',active:true});await saveEmployee(env,o.claims,{id:second,name:'Sore',pin:'958274',active:true});
  const local=new Dexie(`employee-session-${id}`);local.version(1).stores({settings:'key'});
  const sessions=new EmployeeSessions(new TestClient(device.access,device.claims),local,id,device.claims.deviceKey,testPublicJwk);
  try{
    assert.deepEqual(await sessions.employees(false),[]);
    await assert.rejects(()=>sessions.login(first,'482953',false),/internet/);
    assert.equal((await sessions.login(first,'482953',true)).claims.employeeId,first);
    assert.equal((await sessions.current())?.claims.employeeId,first);
    assert.equal((await sessions.employees(false)).length,1);
    await sessions.logout();assert.equal(await sessions.current(),null);
    assert.equal((await sessions.login(first,'482953',false)).claims.employeeId,first);
    await assert.rejects(()=>sessions.login(second,'000000',true));assert.equal(await sessions.current(),null);
    assert.equal((await sessions.login(second,'958274',true)).claims.employeeId,second);
    await saveEmployee(env,o.claims,{id:second,name:'Sore',active:false});
    await assert.rejects(()=>sessions.login(second,'958274',true));assert.equal(await sessions.current(),null);
    await assert.rejects(()=>sessions.login(second,'958274',false));
    const persisted=JSON.stringify(await local.table('settings').toArray());assert.equal(/482953|958274|offlineVerifier/.test(persisted),false);
  }finally{await sessions.replica.db.delete();await local.delete();}
});
