import crypto from 'node:crypto';
import { proofMessage, publicKeyIdentity, type DeviceProof, type LicenseClaims } from '../licenseProtocol';

export function verifyDeviceProof(action: string, licenseKey: string, deviceId: string, token: string, proof?: DeviceProof): string | null {
  try {
    if (!proof || !Number.isFinite(proof.timestamp) || Math.abs(Date.now() - proof.timestamp) > 300000 || !/^[\w-]{20,80}$/.test(proof.nonce) || !/^[\w-]{80,100}$/.test(proof.signature)) return null;
    const identity = publicKeyIdentity(proof.publicKey);
    const publicKey = crypto.createPublicKey({ key: JSON.parse(identity), format: 'jwk' });
    const message = proofMessage(action, licenseKey, deviceId, token, proof.timestamp, proof.nonce);
    return crypto.verify('sha256', Buffer.from(message), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(proof.signature, 'base64url')) ? identity : null;
  } catch { return null; }
}
export function signOfflineLicense(claims: LicenseClaims): string {
  const rawKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
  if (!rawKey) throw new Error('Konfigurasi penandatangan lisensi belum tersedia.');
  const key = crypto.createPrivateKey({ key: JSON.parse(rawKey), format: 'jwk' });
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.sign('sha256', Buffer.from(payload), { key, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `SN2.${payload}.${signature}`;
}
export function readSignedLicense(token: string): LicenseClaims | null {
  try {
    const [version, payload, signature, extra] = token.split('.');
    if (version !== 'SN2' || !payload || !signature || extra || token.length > 8192) return null;
    const rawKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
    if (!rawKey) return null;
    const publicKey = crypto.createPublicKey(crypto.createPrivateKey({ key: JSON.parse(rawKey), format: 'jwk' }));
    if (!crypto.verify('sha256', Buffer.from(payload), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as LicenseClaims;
    return claims.v === 2 ? claims : null;
  } catch { return null; }
}
