import crypto from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createD1NodeAdapter,initD1Tables} from '../src/lib/server/d1';
import {enrollOwner,authorize,type MultiDeviceEnv} from '../src/lib/server/multideviceAccess';
import {digest} from '../src/lib/server/multideviceCrypto';
import {publicKeyIdentity} from '../src/lib/licenseProtocol';
import {testSigningJwk,testDeviceProof} from './securityFixtures';
import type {AccessClaims} from '../src/lib/multidevice/protocol';

export async function environment() {
  const env:MultiDeviceEnv={DB:createD1NodeAdapter(':memory:'),SAKUNOTA_MULTI_DEVICE:'enabled',SAKUNOTA_LICENSE_PRIVATE_JWK:JSON.stringify(testSigningJwk)};
  await initD1Tables(env.DB);
  await env.DB.exec(readFileSync('migrations/0003_multidevice.sql','utf8'));
  return env;
}
export async function owner(env:MultiDeviceEnv,key=`SN-MD-${crypto.randomUUID()}`) {
  const id=crypto.randomUUID();
  const proof=testDeviceProof('multi.enroll',key,id);
  const identity=publicKeyIdentity(proof.publicKey);
  await env.DB.prepare('INSERT INTO Licenses(licenseKey,orderId,businessName,issuedAt,signature,boundDeviceId) VALUES (?,?,?,?,?,?)').bind(key,'test-order','Test Shop',new Date().toISOString(),'test',id).run();
  await env.DB.prepare('INSERT INTO LicenseDeviceKeys(licenseKey,deviceId,publicKey) VALUES (?,?,?)').bind(key,id,identity).run();
  const claims={v:2,licenseKey:key,deviceId:id,deviceKey:identity,licenseType:'berbayar',expiresAt:null,businessName:'Test Shop',issuedAt:Date.now()};
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const activation=`SN2.${payload}.${crypto.sign('sha256',Buffer.from(payload),{key:crypto.createPrivateKey({key:testSigningJwk,format:'jwk'}),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
  const result=await enrollOwner(env,{activation,deviceName:'HP Pemilik',proof:testDeviceProof('multi.enroll',key,id,activation)});
  return {...result,key,id};
}
export function requestProof(action:string,claims:AccessClaims,access:string,body:unknown) {
  return testDeviceProof(`multi.${action}.${digest(JSON.stringify(body))}`,claims.storeId,claims.deviceId,access);
}
export async function auth(env:MultiDeviceEnv,session:{claims:AccessClaims;access:string},action:string,body:unknown={}) {
  return authorize(env,session.access,action,body,requestProof(action,session.claims,session.access,body));
}
