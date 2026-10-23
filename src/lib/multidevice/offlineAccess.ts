import {fromBase64Url,LICENSE_PUBLIC_KEY,publicKeyIdentity} from '../licenseProtocol';
import {AccessError,validClaims,type AccessClaims} from './protocol';
export async function sha256(value:string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),n=>n.toString(16).padStart(2,'0')).join('');
}
export async function verifyAccess(access:string,deviceId:string,identity:string,publicJwk=LICENSE_PUBLIC_KEY):Promise<AccessClaims> {
  try {
    if(access.length>4096) throw new Error();
    const [prefix,payload,signature,extra]=access.split('.');
    if(prefix!=='SNMD1'||!payload||!signature||extra) throw new Error();
    const key=await crypto.subtle.importKey('jwk',publicJwk,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
    if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,fromBase64Url(signature),new TextEncoder().encode(`${prefix}.${payload}`))) throw new Error();
    const claims=JSON.parse(new TextDecoder().decode(fromBase64Url(payload))) as AccessClaims;
    if(!validClaims(claims)||claims.deviceId!==deviceId||claims.deviceKey!==identity) throw new Error();
    return claims;
  } catch {throw new AccessError('Silakan masuk lagi.',401);}
}
export async function verifyOfflinePin(pin:string,verifier:string,claims:AccessClaims):Promise<boolean> {
  if(!claims.employeeId || !/^\d{6,12}$/.test(pin) || await sha256(verifier)!==claims.pinDigest) return false;
  try {
    const value=JSON.parse(verifier);
    if(value.v!==1||value.iterations!==210000||typeof value.salt!=='string'||value.salt.length>64) return false;
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(pin),'PBKDF2',false,['deriveBits']);
    const bits=new Uint8Array(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(value.salt),iterations:value.iterations},key,256));
    const expected=fromBase64Url(value.hash);if(expected.length!==bits.length) return false;
    let difference=0;for(let i=0;i<bits.length;i++) difference|=bits[i]^expected[i];return difference===0;
  } catch {return false;}
}
export async function keyIdentity(keys:CryptoKeyPair){return publicKeyIdentity(await crypto.subtle.exportKey('jwk',keys.publicKey));}
