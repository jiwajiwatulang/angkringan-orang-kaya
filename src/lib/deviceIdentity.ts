import { db } from './dexie';
import { proofMessage, publicKeyIdentity, toBase64Url, type DeviceProof } from './licenseProtocol';

let keyPromise: Promise<CryptoKeyPair> | undefined;
async function deviceKeys(): Promise<CryptoKeyPair> {
  if (!keyPromise) keyPromise = (async () => {
    // Keep the private key non-exportable and out of merchant backups/localStorage.
    const generated = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    return db.transaction('rw', db.table('settings'), async () => {
      const existing = await db.table('settings').get('license_device_keys_v2');
      if (existing?.value?.privateKey && existing?.value?.publicKey) return existing.value as CryptoKeyPair;
      const keys = generated;
      await db.table('settings').put({ key: 'license_device_keys_v2', value: keys });
      return keys;
    });
  })().catch(error => { keyPromise = undefined; throw error; });
  return keyPromise;
}
export async function deviceKeyIdentity(): Promise<string> {
  return publicKeyIdentity(await crypto.subtle.exportKey('jwk', (await deviceKeys()).publicKey));
}
export async function createDeviceProof(action: string, key: string, deviceId: string, token: string): Promise<DeviceProof> {
  const keys = await deviceKeys();
  const timestamp = Date.now();
  const nonce = crypto.randomUUID();
  const message = new TextEncoder().encode(proofMessage(action, key, deviceId, token, timestamp, nonce));
  return { publicKey: await crypto.subtle.exportKey('jwk', keys.publicKey), timestamp, nonce,
    signature: toBase64Url(new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, keys.privateKey, message))) };
}
