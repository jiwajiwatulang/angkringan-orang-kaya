import {test} from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {pinVerifier,verifyPin,digest} from '../src/lib/server/multideviceCrypto';
import {verifyOfflinePin} from '../src/lib/multidevice/offlineAccess';
import type {AccessClaims} from '../src/lib/multidevice/protocol';
test('PIN verification stays within the hosted Workers per-call cap and matches offline derivation',async t=>{
  const derive=crypto.pbkdf2Sync;const iterations:number[]=[];
  t.mock.method(crypto,'pbkdf2Sync',((pin:any,salt:any,count:number,length:number,algorithm:string)=>{
    assert.ok(count<=100000,'hosted Workers PBKDF2 cap');iterations.push(count);return derive(pin,salt,count,length,algorithm);
  }) as typeof derive);
  const verifier=pinVerifier('482953');
  assert.equal(iterations.reduce((sum,n)=>sum+n,0),210000);
  assert.ok(verifyPin('482953',verifier));assert.equal(verifyPin('482954',verifier),false);
  const claims={employeeId:'employee-test',pinDigest:digest(verifier)} as AccessClaims;
  assert.ok(await verifyOfflinePin('482953',verifier,claims));assert.equal(await verifyOfflinePin('482954',verifier,claims),false);
  const changed=JSON.stringify({...JSON.parse(verifier),rounds:1});assert.equal(verifyPin('482953',changed),false);
});
test('existing version-one verifier remains readable without rewriting credentials',async()=>{
  const pin='482953',salt='legacy-test-salt';
  const verifier=JSON.stringify({v:1,salt,iterations:210000,hash:crypto.pbkdf2Sync(pin,salt,210000,32,'sha256').toString('base64url')});
  assert.ok(verifyPin(pin,verifier));assert.ok(await verifyOfflinePin(pin,verifier,{employeeId:'legacy-test',pinDigest:digest(verifier)} as AccessClaims));
});
