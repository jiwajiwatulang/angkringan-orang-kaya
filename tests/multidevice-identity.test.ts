import {test} from 'node:test';
import assert from 'node:assert/strict';
import {testSigningJwk} from './securityFixtures';
import {pinVerifier,verifyPin,readAccess,signAccess} from '../src/lib/server/multideviceCrypto';
import {OFFLINE_ACCESS_MS,requireOwner, type AccessClaims} from '../src/lib/multidevice/protocol';

const issuedAt=Date.now();
const claims:AccessClaims={version:1,storeId:'store-1234567890123456',deviceId:'device-1234567890123456',deviceKey:'public-key',deviceEpoch:1,role:'owner',issuedAt,expiresAt:issuedAt+OFFLINE_ACCESS_MS};
test('signed access rejects modification, expiry, future issue time and excessive offline duration',()=>{
  const key=JSON.stringify(testSigningJwk),token=signAccess(claims,key);
  assert.equal(readAccess(token,key).role,'owner');
  const p=token.split('.');p[1]=Buffer.from(JSON.stringify({...claims,role:'cashier'})).toString('base64url');
  assert.throws(()=>readAccess(p.join('.'),key));
  assert.throws(()=>readAccess(token,key,claims.expiresAt));
  assert.throws(()=>readAccess(token,key,claims.issuedAt-120000));
  assert.throws(()=>readAccess(signAccess({...claims,expiresAt:claims.expiresAt+1},key),key));
});
test('employee PIN uses salted adaptive hashes and fails closed',()=>{
  const a=pinVerifier('482953'),b=pinVerifier('482953');
  assert.notEqual(a,b);assert.equal(a.includes('482953'),false);
  assert.ok(verifyPin('482953',a));assert.equal(verifyPin('482954',a),false);
  assert.equal(verifyPin('482953','invalid'),false);assert.throws(()=>pinVerifier('1234'));
});
test('cashier cannot invoke an owner operation directly',()=>{
  assert.throws(()=>requireOwner({...claims,role:'cashier'}));
  assert.throws(()=>requireOwner({...claims,employeeId:'employee-1234567890'}));
  assert.doesNotThrow(()=>requireOwner(claims));
});


test('server-issued access stays within its permitted duration when the clock advances between reads',async t=>{
  const {environment,owner}=await import('./multideviceFixtures');
  const {OFFLINE_ACCESS_MS}=await import('../src/lib/multidevice/protocol');
  const env=await environment();let now=Date.now();
  t.mock.method(Date,'now',()=>now++);
  const session=await owner(env);
  assert.equal(session.claims.expiresAt-session.claims.issuedAt,OFFLINE_ACCESS_MS);
});
