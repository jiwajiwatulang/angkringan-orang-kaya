import crypto from 'node:crypto';
import type { D1Database } from './d1';
import { getLicenseD1, getTesterLicenseD1, getBetaRegistrationByLicenseKeyD1 } from './d1';
import { verifyDeviceProof } from './licenseSigning';
import type { DeviceProof, LicenseClaims } from '../licenseProtocol';
import { AccessError, OFFLINE_ACCESS_MS, PAIRING_MS, assertId, requireOwner, text, type AccessClaims } from '../multidevice/protocol';
import { digest, randomCode, pinVerifier, verifyPin, readAccess, signAccess } from './multideviceCrypto';

export interface MultiDeviceEnv { DB: D1Database; SAKUNOTA_MULTI_DEVICE?: string; SAKUNOTA_LICENSE_PRIVATE_JWK?: string }
interface DeviceRow { id: string; storeId: string; role:'owner'|'cashier'; publicKey:string; name:string; epoch:number; revoked:number }
interface PairRow { id:string; storeId:string; expiresAt:number; candidateId:string|null; candidateKey:string|null; candidateName:string|null; approved:number; consumed:number }
export interface EmployeeRow {id:string;storeId:string;name:string;verifier:string;epoch:number;active:number;attempts:number;lockedUntil:number}
export function signingKey(env: MultiDeviceEnv) {
  if (env.SAKUNOTA_MULTI_DEVICE !== 'enabled' || !env.SAKUNOTA_LICENSE_PRIVATE_JWK) throw new AccessError('Halaman tidak tersedia.',404);
  return env.SAKUNOTA_LICENSE_PRIVATE_JWK;
}
export async function activeLicense(db:D1Database, licenseKey:string) {
  const record = await getLicenseD1(db,licenseKey) || await getTesterLicenseD1(db,licenseKey) || await getBetaRegistrationByLicenseKeyD1(db,licenseKey);
  if (!record || ('revoked' in record && record.revoked) || ('status' in record && !['disetujui','dikonversi_berbayar'].includes(record.status))) throw new AccessError('Lisensi tidak aktif.');
  if ('expiresAt' in record && record.expiresAt && (!Number.isFinite(Date.parse(record.expiresAt)) || Date.now() >= Date.parse(record.expiresAt))) throw new AccessError('Masa akses berakhir.');
  return record;
}
function originalClaims(token:string, key:string):LicenseClaims {
  try {
    const [v,p,s,extra] = token.split('.');
    if (v!=='SN2' || !p || !s || extra || token.length>8192) throw new Error();
    const publicKey=crypto.createPublicKey(crypto.createPrivateKey({key:JSON.parse(key),format:'jwk'}));
    if (!crypto.verify('sha256',Buffer.from(p),{key:publicKey,dsaEncoding:'ieee-p1363'},Buffer.from(s,'base64url'))) throw new Error();
    const claims=JSON.parse(Buffer.from(p,'base64url').toString()) as LicenseClaims;
    if(claims.v!==2 || (claims.expiresAt && (!Number.isFinite(Date.parse(claims.expiresAt)) || Date.now()>=Date.parse(claims.expiresAt)))) throw new Error();
    return claims;
  } catch { throw new AccessError('Aktifkan lisensi pada perangkat pemilik.',401); }
}
async function grant(env:MultiDeviceEnv, device:DeviceRow, employee?:EmployeeRow) {
  const store=await env.DB.prepare('SELECT licenseKey FROM MdStores WHERE id=?').bind(device.storeId).first<{licenseKey:string}>();
  if(!store) throw new AccessError();
  const license=await activeLicense(env.DB,store.licenseKey);
  const issuedAt=Date.now();
  const claims:AccessClaims={version:1,storeId:device.storeId,deviceId:device.id,deviceKey:device.publicKey,role:device.role,deviceEpoch:device.epoch,issuedAt,expiresAt:issuedAt+OFFLINE_ACCESS_MS};
  if ('expiresAt' in license && license.expiresAt) claims.expiresAt=Math.min(claims.expiresAt,Date.parse(license.expiresAt));
  if(employee){claims.employeeId=employee.id;claims.employeeEpoch=employee.epoch;claims.pinDigest=digest(employee.verifier);}
  return {access:signAccess(claims,signingKey(env)),claims};
}
export async function enrollOwner(env:MultiDeviceEnv,data:{activation:string;deviceName:string;proof:DeviceProof}) {
  const claims=originalClaims(data.activation,signingKey(env));
  const identity=verifyDeviceProof('multi.enroll',claims.licenseKey,claims.deviceId,data.activation,data.proof);
  if(!identity || identity!==claims.deviceKey) throw new AccessError();
  await activeLicense(env.DB,claims.licenseKey);
  const binding=await env.DB.prepare('SELECT deviceId,publicKey FROM LicenseDeviceKeys WHERE licenseKey=?').bind(claims.licenseKey).first<{deviceId:string;publicKey:string}>();
  if(binding?.deviceId!==claims.deviceId || binding.publicKey!==identity) throw new AccessError('Gunakan perangkat pemilik yang sudah aktif.');
  assertId(claims.deviceId);
  const storeId=digest(`SakuNota/store/v1/${claims.licenseKey}`);
  const currentBinding='EXISTS(SELECT 1 FROM LicenseDeviceKeys k WHERE k.licenseKey=? AND k.deviceId=? AND k.publicKey=?)';
  const bindingValues=[claims.licenseKey,claims.deviceId,identity];
  await env.DB.batch([
    env.DB.prepare('INSERT INTO MdStores(id,licenseKey) VALUES (?,?) ON CONFLICT(id) DO NOTHING').bind(storeId,claims.licenseKey),
    // LicenseDeviceKeys was checked against the newly activated original-device proof.
    // Rotate the owner slot without replacing the store or any business records.
    env.DB.prepare(`UPDATE MdDevices SET revoked=1,epoch=epoch+1 WHERE storeId=? AND role='owner' AND revoked=0 AND (id<>? OR publicKey<>?) AND ${currentBinding}`).bind(storeId,claims.deviceId,identity,...bindingValues),
    env.DB.prepare(`INSERT INTO MdDevices(id,storeId,role,publicKey,name) SELECT ?,?,'owner',?,? WHERE ${currentBinding}
      ON CONFLICT(storeId,id) DO UPDATE SET publicKey=excluded.publicKey,name=excluded.name,revoked=0,
      epoch=CASE WHEN MdDevices.revoked=1 OR MdDevices.publicKey<>excluded.publicKey THEN MdDevices.epoch+1 ELSE MdDevices.epoch END
      WHERE MdDevices.role='owner'`).bind(claims.deviceId,storeId,identity,text(data.deviceName),...bindingValues),
  ]);
  const device=await env.DB.prepare(`SELECT * FROM MdDevices WHERE storeId=? AND id=? AND role='owner' AND revoked=0 AND ${currentBinding}`).bind(storeId,claims.deviceId,...bindingValues).first<DeviceRow>();
  if(!device || device.publicKey!==identity) throw new AccessError('Perangkat pemilik perlu diperiksa.');
  return grant(env,device);
}
export async function authorize(env:MultiDeviceEnv,access:string,action:string,body:unknown,proof:DeviceProof):Promise<AccessClaims> {
  const claims=readAccess(access,signingKey(env),Date.now(),action==='refresh');
  const identity=verifyDeviceProof(`multi.${action}.${digest(JSON.stringify(body))}`,claims.storeId,claims.deviceId,access,proof);
  if(identity!==claims.deviceKey) throw new AccessError('Silakan masuk lagi.',401);
  const device=await env.DB.prepare('SELECT * FROM MdDevices WHERE storeId=? AND id=? AND revoked=0').bind(claims.storeId,claims.deviceId).first<DeviceRow>();
  if(!device || device.epoch!==claims.deviceEpoch || device.publicKey!==identity || device.role!==claims.role) throw new AccessError('Perangkat sudah dilepas.');
  const store=await env.DB.prepare('SELECT licenseKey FROM MdStores WHERE id=?').bind(claims.storeId).first<{licenseKey:string}>();
  if(!store) throw new AccessError();
  await activeLicense(env.DB,store.licenseKey);
  const ownerBinding=await env.DB.prepare(`SELECT d.id FROM MdDevices d JOIN LicenseDeviceKeys k ON k.deviceId=d.id AND k.publicKey=d.publicKey
    WHERE d.storeId=? AND d.role='owner' AND d.revoked=0 AND k.licenseKey=?`).bind(claims.storeId,store.licenseKey).first();
  if(!ownerBinding) throw new AccessError('Perangkat toko perlu dihubungkan kembali.');
  if(claims.employeeId){
    const employee=await env.DB.prepare('SELECT epoch,active FROM MdEmployees WHERE storeId=? AND id=?').bind(claims.storeId,claims.employeeId).first<{epoch:number;active:number}>();
    if(!employee?.active || employee.epoch!==claims.employeeEpoch) throw new AccessError('Akses karyawan berakhir.');
  }
  // Proofs bind method + payload + access + nonce. A retry uses a fresh proof and the same event ID.
  try {
    await env.DB.batch([
      env.DB.prepare('DELETE FROM MdNonces WHERE expiresAt<?').bind(Date.now()),
      env.DB.prepare('INSERT INTO MdNonces(storeId,deviceId,nonce,expiresAt) VALUES (?,?,?,?)').bind(claims.storeId,claims.deviceId,proof.nonce,Date.now()+3600000),
    ]);
  } catch {throw new AccessError('Permintaan sudah digunakan.',409);}
  return claims;
}
export async function createPairing(env:MultiDeviceEnv,owner:AccessClaims) {
  requireOwner(owner);
  const slot=await env.DB.prepare("SELECT id FROM MdDevices WHERE storeId=? AND role='cashier' AND revoked=0").bind(owner.storeId).first();
  if(slot) throw new AccessError('Lepas perangkat kasir terlebih dahulu.',409);
  const id=crypto.randomUUID(),code=randomCode(),expiresAt=Date.now()+PAIRING_MS;
  await env.DB.prepare('INSERT INTO MdPairings(id,storeId,codeHash,expiresAt) VALUES (?,?,?,?)').bind(id,owner.storeId,digest(code),expiresAt).run();
  return {id,code,expiresAt};
}
export async function requestPairing(env:MultiDeviceEnv,data:{code:string;deviceId:string;deviceName:string;proof:DeviceProof}) {
  signingKey(env); assertId(data.deviceId);
  if(!/^[\w-]{43}$/.test(data.code)) throw new AccessError('Kode penghubung tidak berlaku.',400);
  const identity=verifyDeviceProof('multi.pair',data.code,data.deviceId,'',data.proof);
  if(!identity) throw new AccessError();
  const pair=await env.DB.prepare('SELECT * FROM MdPairings WHERE codeHash=? AND expiresAt>?').bind(digest(data.code),Date.now()).first<PairRow>();
  if(!pair) throw new AccessError('Kode penghubung tidak berlaku.',410);
  if(pair.candidateId && (pair.candidateId!==data.deviceId || pair.candidateKey!==identity)) throw new AccessError('Kode penghubung sudah digunakan.',409);
  await env.DB.prepare('UPDATE MdPairings SET candidateId=?,candidateKey=?,candidateName=? WHERE id=? AND candidateId IS NULL AND consumed=0 AND expiresAt>?').bind(data.deviceId,identity,text(data.deviceName),pair.id,Date.now()).run();
  const current=await env.DB.prepare('SELECT * FROM MdPairings WHERE id=?').bind(pair.id).first<PairRow>();
  if(current?.candidateId!==data.deviceId || current.candidateKey!==identity) throw new AccessError('Kode penghubung sudah digunakan.',409);
  if(!current.approved) return {pending:true as const};
  const device=await env.DB.prepare("SELECT * FROM MdDevices WHERE storeId=? AND id=? AND role='cashier' AND revoked=0").bind(pair.storeId,data.deviceId).first<DeviceRow>();
  if(!device || device.publicKey!==identity) throw new AccessError('Perangkat sudah dilepas.');
  return {pending:false as const,...await grant(env,device)};
}
export async function approvePairing(env:MultiDeviceEnv,owner:AccessClaims,id:string) {
  requireOwner(owner); assertId(id);
  // Unique live-slot index arbitrates simultaneous approvals. Conditional INSERT and consume share one transaction.
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO MdDevices(id,storeId,role,publicKey,name)
      SELECT candidateId,storeId,'cashier',candidateKey,candidateName FROM MdPairings
      WHERE id=? AND storeId=? AND expiresAt>? AND consumed=0 AND candidateId IS NOT NULL
      ON CONFLICT(storeId,id) DO UPDATE SET publicKey=excluded.publicKey,name=excluded.name,epoch=MdDevices.epoch+1,revoked=0 WHERE MdDevices.revoked=1 AND MdDevices.role='cashier'`).bind(id,owner.storeId,Date.now()),
    env.DB.prepare(`UPDATE MdPairings SET approved=1,consumed=1 WHERE id=? AND storeId=? AND expiresAt>?
      AND EXISTS(SELECT 1 FROM MdDevices d WHERE d.storeId=MdPairings.storeId AND d.id=MdPairings.candidateId AND d.publicKey=MdPairings.candidateKey AND d.revoked=0)`).bind(id,owner.storeId,Date.now()),
  ]);
  const row=await env.DB.prepare('SELECT approved FROM MdPairings WHERE id=? AND storeId=?').bind(id,owner.storeId).first<{approved:number}>();
  if(!row?.approved) throw new AccessError('Permintaan tidak berlaku.',409);
  return {success:true};
}
export async function revokeDevice(env:MultiDeviceEnv,owner:AccessClaims,id:string) {
  requireOwner(owner);assertId(id);
  await env.DB.batch([
    env.DB.prepare("UPDATE MdDevices SET revoked=1,epoch=epoch+1 WHERE storeId=? AND id=? AND role='cashier' AND revoked=0").bind(owner.storeId,id),
    env.DB.prepare('UPDATE MdPairings SET expiresAt=0 WHERE storeId=?').bind(owner.storeId),
  ]);
  return {success:true};
}
export async function saveEmployee(env:MultiDeviceEnv,owner:AccessClaims,data:{id:string;name:string;pin?:string;active:boolean}) {
  requireOwner(owner);assertId(data.id);const name=text(data.name);
  if(typeof data.active!=='boolean') throw new AccessError('Data tidak valid.',400);
  const existing=await env.DB.prepare('SELECT id FROM MdEmployees WHERE storeId=? AND id=?').bind(owner.storeId,data.id).first();
  const verifier=data.pin ? pinVerifier(data.pin) : undefined;
  if(!existing && !verifier) throw new AccessError('Masukkan PIN karyawan.',400);
  if(!existing) await env.DB.prepare('INSERT INTO MdEmployees(id,storeId,name,verifier,active) VALUES (?,?,?,?,?)').bind(data.id,owner.storeId,name,verifier!,Number(data.active)).run();
  else if(verifier) await env.DB.prepare('UPDATE MdEmployees SET name=?,verifier=?,active=?,epoch=epoch+1,attempts=0,lockedUntil=0 WHERE storeId=? AND id=?').bind(name,verifier,Number(data.active),owner.storeId,data.id).run();
  else await env.DB.prepare('UPDATE MdEmployees SET name=?,active=?,epoch=epoch+1 WHERE storeId=? AND id=?').bind(name,Number(data.active),owner.storeId,data.id).run();
  return {success:true};
}
export async function employeeLogin(env:MultiDeviceEnv,deviceClaims:AccessClaims,data:{id:string;pin:string}) {
  if(deviceClaims.role!=='cashier') throw new AccessError();assertId(data.id);
  // Reserve an attempt in SQL before hashing, including concurrent requests.
  await env.DB.prepare('UPDATE MdEmployees SET attempts=CASE WHEN lockedUntil>0 AND lockedUntil<=? THEN 1 ELSE attempts+1 END, lockedUntil=CASE WHEN lockedUntil<=? THEN 0 ELSE lockedUntil END WHERE storeId=? AND id=? AND active=1 AND lockedUntil<=? AND (attempts<5 OR lockedUntil>0)').bind(Date.now(),Date.now(),deviceClaims.storeId,data.id,Date.now()).run();
  const employee=await env.DB.prepare('SELECT * FROM MdEmployees WHERE storeId=? AND id=? AND active=1').bind(deviceClaims.storeId,data.id).first<EmployeeRow>();
  if(!employee || employee.lockedUntil>Date.now() || employee.attempts>5) throw new AccessError('Coba lagi dalam 5 menit.',429);
  if(employee.attempts>=5 || !verifyPin(data.pin,employee.verifier)) {
    await env.DB.prepare('UPDATE MdEmployees SET lockedUntil=CASE WHEN attempts>=5 THEN ? ELSE lockedUntil END WHERE storeId=? AND id=?').bind(Date.now()+300000,deviceClaims.storeId,data.id).run();
    throw new AccessError('PIN tidak sesuai.',401);
  }
  await env.DB.prepare('UPDATE MdEmployees SET attempts=0,lockedUntil=0 WHERE storeId=? AND id=? AND epoch=? AND active=1').bind(deviceClaims.storeId,data.id,employee.epoch).run();
  const device=await env.DB.prepare('SELECT * FROM MdDevices WHERE storeId=? AND id=? AND revoked=0 AND epoch=?').bind(deviceClaims.storeId,deviceClaims.deviceId,deviceClaims.deviceEpoch).first<DeviceRow>();
  if(!device) throw new AccessError('Perangkat sudah dilepas.');
  return {...await grant(env,device,employee),offlineVerifier:employee.verifier,name:employee.name};
}
export async function listAccess(env:MultiDeviceEnv,claims:AccessClaims) {
  const employees=await env.DB.prepare(`SELECT id,name,active FROM MdEmployees WHERE storeId=? ${claims.role==='cashier'?'AND active=1':''} ORDER BY name`).bind(claims.storeId).all();
  if(claims.role==='cashier') return {employees:employees.results};
  const devices=await env.DB.prepare('SELECT id,name,role,revoked FROM MdDevices WHERE storeId=? AND revoked=0 ORDER BY role DESC').bind(claims.storeId).all();
  const pairings=await env.DB.prepare('SELECT id,candidateName,expiresAt FROM MdPairings WHERE storeId=? AND candidateId IS NOT NULL AND consumed=0 AND expiresAt>?').bind(claims.storeId,Date.now()).all();
  return {employees:employees.results,devices:devices.results,pairings:pairings.results};
}
export async function renewCashierDevice(env:MultiDeviceEnv,claims:AccessClaims) {
  if(claims.role!=='cashier'||claims.employeeId) throw new AccessError();
  const device=await env.DB.prepare('SELECT * FROM MdDevices WHERE storeId=? AND id=? AND epoch=? AND revoked=0').bind(claims.storeId,claims.deviceId,claims.deviceEpoch).first<DeviceRow>();
  if(!device) throw new AccessError('Perangkat sudah dilepas.');
  return grant(env,device);
}
