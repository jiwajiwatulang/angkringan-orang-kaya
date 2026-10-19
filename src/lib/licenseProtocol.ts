export const LICENSE_PUBLIC_KEY: JsonWebKey = {
  kty: 'EC', crv: 'P-256',
  x: '5EqqGBhb13-O40LUSwvkMBInUK8HFfgJ2cyZrroNVdI',
  y: 'aA8luj8KI0X6hf1msyD-yk-4z3vaC50JtdHAweo7pTg',
};
export interface DeviceProof {
  publicKey: JsonWebKey;
  timestamp: number;
  nonce: string;
  signature: string;
}
export interface LicenseClaims {
  v: 2;
  licenseKey: string;
  deviceId: string;
  deviceKey: string;
  licenseType: 'berbayar' | 'trial' | 'tester';
  expiresAt: string | null;
  businessName: string;
  issuedAt: number;
}
export function proofMessage(action: string, key: string, deviceId: string, token: string, timestamp: number, nonce: string): string {
  return JSON.stringify([action, key.trim().toUpperCase(), deviceId.trim(), token, timestamp, nonce]);
}
export function publicKeyIdentity(jwk: JsonWebKey): string {
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !/^[A-Za-z0-9_-]{43}$/.test(jwk.x || '') || !/^[A-Za-z0-9_-]{43}$/.test(jwk.y || '') || jwk.d) throw new Error('Kunci perangkat tidak valid.');
  return JSON.stringify({ kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y });
}
export function toBase64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, b => String.fromCharCode(b)).join('')).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error('Format token tidak valid.');
  return Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
}
