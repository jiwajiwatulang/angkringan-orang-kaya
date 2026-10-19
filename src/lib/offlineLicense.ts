import { LICENSE_PUBLIC_KEY, fromBase64Url, type LicenseClaims } from './licenseProtocol';

export async function verifyOfflineLicense(token: string, licenseKey: string, deviceId: string, deviceKey: string): Promise<LicenseClaims | null> {
  try {
    const [prefix, payload, signature, extra] = token.split('.');
    if (prefix !== 'SN2' || !payload || !signature || extra || token.length > 8192) return null;
    const key = await crypto.subtle.importKey('jwk', LICENSE_PUBLIC_KEY, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    if (!(await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, fromBase64Url(signature), new TextEncoder().encode(payload)))) return null;
    const claims = JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as LicenseClaims;
    if (claims.v !== 2 || claims.licenseKey !== licenseKey.trim().toUpperCase() || claims.deviceId !== deviceId || claims.deviceKey !== deviceKey || !['berbayar', 'trial', 'tester'].includes(claims.licenseType)) return null;
    if (!Number.isFinite(claims.issuedAt) || typeof claims.businessName !== 'string') return null;
    if (claims.expiresAt !== null && (typeof claims.expiresAt !== 'string' || !Number.isFinite(Date.parse(claims.expiresAt)))) return null;
    if (claims.licenseType === 'trial' && !claims.expiresAt) return null;
    return claims;
  } catch { return null; }
}
