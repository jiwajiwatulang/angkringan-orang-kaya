import crypto from 'node:crypto';
import { proofMessage, publicKeyIdentity, type DeviceProof, type LicenseClaims } from '../licenseProtocol';

export function verifyDeviceProof(action: string, licenseKey: string, deviceId: string, token: string, proof?: DeviceProof, onReason?: (reason: string) => void): string | null {
  try {
    if (!proof) { onReason?.('missing_proof'); return null; }
    if (!Number.isFinite(proof.timestamp)) { onReason?.('invalid_timestamp'); return null; }
    if (Math.abs(Date.now() - proof.timestamp) > 1800000) { onReason?.(`skew:${Date.now()}-${proof.timestamp}`); return null; }
    if (!/^[\w-]{20,80}$/.test(proof.nonce)) { onReason?.('invalid_nonce'); return null; }
    if (!/^[\w-]{80,100}$/.test(proof.signature)) { onReason?.(`invalid_sig_len:${proof.signature?.length}`); return null; }
    const identity = publicKeyIdentity(proof.publicKey);
    const publicKey = crypto.createPublicKey({ key: JSON.parse(identity), format: 'jwk' });
    const pem = publicKey.export({ type: 'spki', format: 'pem' });
    const message = proofMessage(action, licenseKey, deviceId, token, proof.timestamp, proof.nonce);
    const ok = crypto.verify('sha256', Buffer.from(message), { key: pem, dsaEncoding: 'ieee-p1363' }, Buffer.from(proof.signature, 'base64url'));
    if (!ok) onReason?.('crypto_verify_false');
    return ok ? identity : null;
  } catch (err: any) {
    onReason?.(`exception:${err?.message || err}`);
    return null;
  }
}
export function signOfflineLicense(claims: LicenseClaims): string {
  const rawKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
  if (!rawKey) throw new Error('Konfigurasi penandatangan lisensi belum tersedia.');
  const privateKey = crypto.createPrivateKey({ key: JSON.parse(rawKey), format: 'jwk' });
  const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.sign('sha256', Buffer.from(payload), { key: pem, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  return `SN2.${payload}.${signature}`;
}
export function readSignedLicense(token: string): LicenseClaims | null {
  try {
    const [version, payload, signature, extra] = token.split('.');
    if (version !== 'SN2' || !payload || !signature || extra || token.length > 8192) return null;
    const rawKey = process.env.SAKUNOTA_LICENSE_PRIVATE_JWK;
    if (!rawKey) return null;
    const privateKey = crypto.createPrivateKey({ key: JSON.parse(rawKey), format: 'jwk' });
    const publicKey = crypto.createPublicKey(privateKey);
    const pem = publicKey.export({ type: 'spki', format: 'pem' });
    if (!crypto.verify('sha256', Buffer.from(payload), { key: pem, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'))) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString()) as LicenseClaims;
    return claims.v === 2 ? claims : null;
  } catch { return null; }
}
