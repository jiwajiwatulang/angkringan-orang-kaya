import crypto from 'node:crypto';
import { AccessError, validClaims, type AccessClaims } from '../multidevice/protocol';

export const digest = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const randomCode = () => crypto.randomBytes(32).toString('base64url');
export function pinVerifier(pin: string): string {
  if (!/^\d{6,12}$/.test(pin)) throw new AccessError('Gunakan PIN 6–12 angka.', 400);
  const salt = crypto.randomBytes(24).toString('base64url');
  // Hosted Workers cap each PBKDF2 call at 100k; local workerd does not.
  // Sequential rounds keep 210k total work without exceeding that platform cap.
  let hash:Buffer=Buffer.from(pin);
  for(let round=0;round<3;round++)hash=crypto.pbkdf2Sync(hash,salt,70000,32,'sha256');
  return JSON.stringify({v:2,salt,iterations:70000,rounds:3,hash:hash.toString('base64url')});
}
export function verifyPin(pin: string, verifier: string): boolean {
  if (!/^\d{6,12}$/.test(pin)) return false;
  try {
    const saved = JSON.parse(verifier);
    const rounds=saved.v===2&&saved.iterations===70000&&saved.rounds===3?3:saved.v===1&&saved.iterations===210000?1:0;
    if (!rounds || typeof saved.salt !== 'string' || saved.salt.length>64) return false;
    let actual:Buffer=Buffer.from(pin);
    for(let round=0;round<rounds;round++)actual=crypto.pbkdf2Sync(actual,saved.salt,saved.iterations,32,'sha256');
    const expected = Buffer.from(saved.hash,'base64url');
    return expected.length === actual.length && crypto.timingSafeEqual(expected,actual);
  } catch { return false; }
}
// Explicit request-scoped signing key: never copy secrets into process.env.
export function signAccess(claims: AccessClaims, privateJwk: string): string {
  const key = crypto.createPrivateKey({key:JSON.parse(privateJwk),format:'jwk'});
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature = crypto.sign('sha256',Buffer.from(`SNMD1.${payload}`),{key:key.export({type:'pkcs8',format:'pem'}),dsaEncoding:'ieee-p1363'}).toString('base64url');
  return `SNMD1.${payload}.${signature}`;
}
export function readAccess(token: string, privateJwk: string, now = Date.now(), renewDevice = false): AccessClaims {
  try {
    if (token.length > 4096) throw new Error();
    const [prefix,payload,signature,extra] = token.split('.');
    if (prefix !== 'SNMD1' || !payload || !signature || extra) throw new Error();
    const key = crypto.createPublicKey(crypto.createPrivateKey({key:JSON.parse(privateJwk),format:'jwk'}));
    if (!crypto.verify('sha256',Buffer.from(`${prefix}.${payload}`),{key:key.export({type:'spki',format:'pem'}),dsaEncoding:'ieee-p1363'},Buffer.from(signature,'base64url'))) throw new Error();
    const claims = JSON.parse(Buffer.from(payload,'base64url').toString()) as AccessClaims;
    if (!validClaims(claims,renewDevice?claims.issuedAt+1:now)) throw new Error();
    if(renewDevice && (claims.role!=='cashier'||claims.employeeId)) throw new Error();
    return claims;
  } catch { throw new AccessError('Silakan masuk lagi.',401); }
}
