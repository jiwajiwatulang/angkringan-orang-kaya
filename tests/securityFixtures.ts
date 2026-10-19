import crypto from 'node:crypto';
import { proofMessage, type DeviceProof } from '../src/lib/licenseProtocol';

const signer = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
export const testSigningJwk = signer.privateKey.export({format:'jwk'});
export const testPublicJwk = signer.publicKey.export({format:'jwk'});
const devices = new Map<string, ReturnType<typeof crypto.generateKeyPairSync>>();
export function testDeviceProof(action: string, key: string, id: string, token = '', identity = id): DeviceProof {
  if (!devices.has(identity)) devices.set(identity, crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'}));
  const pair = devices.get(identity)!;
  const timestamp = Date.now(), nonce = crypto.randomUUID();
  return {publicKey:pair.publicKey.export({format:'jwk'}) as JsonWebKey,timestamp,nonce,signature:crypto.sign('sha256',Buffer.from(proofMessage(action,key,id,token,timestamp,nonce)),{key:pair.privateKey,dsaEncoding:'ieee-p1363'}).toString('base64url')};
}
