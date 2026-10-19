import { activateLicenseOnDevice, verifyDeviceLicense, verifyDeviceActivationToken } from './sakunotaServer';
import { getLicenseD1, getTesterLicenseD1, getBetaRegistrationByLicenseKeyD1, type D1Database } from './d1';
import { readSignedLicense, signOfflineLicense, verifyDeviceProof } from './licenseSigning';
import type { DeviceProof } from '../licenseProtocol';

interface DeviceRequest { licenseKey: string; deviceId: string; deviceName?: string; token?: string; deviceProof?: DeviceProof }
async function binding(db: D1Database, key: string) {
  return db.prepare('SELECT * FROM LicenseDeviceKeys WHERE licenseKey = ?').bind(key).first<{deviceId:string; publicKey:string}>();
}
async function claim(db: D1Database, key: string, deviceId: string, publicKey: string) {
  await db.prepare('INSERT OR IGNORE INTO LicenseDeviceKeys (licenseKey, deviceId, publicKey) VALUES (?, ?, ?)').bind(key, deviceId, publicKey).run();
  const current = await binding(db, key);
  return current?.deviceId === deviceId && current?.publicKey === publicKey;
}
async function currentRecord(db: D1Database, key: string) {
  return await getLicenseD1(db,key) || await getTesterLicenseD1(db,key) || await getBetaRegistrationByLicenseKeyD1(db,key);
}
async function authorized(db: D1Database, data: DeviceRequest, action: string): Promise<string | null> {
  const key = data.licenseKey.trim().toUpperCase();
  const deviceId = data.deviceId.trim();
  const identity = verifyDeviceProof(action, key, deviceId, data.token || '', data.deviceProof);
  if (!identity) return null;
  const record = await currentRecord(db,key);
  if (!record) return null;
  const saved = await binding(db,key);
  if (saved) return saved.deviceId === deviceId && saved.publicKey === identity ? identity : null;
  // A pre-upgrade installation must prove its old activation, not just copy a device ID.
  if (record.boundDeviceId) {
    const legacy = verifyDeviceActivationToken(data.token || '');
    if (!legacy.valid || legacy.licenseKey !== key || legacy.deviceId !== deviceId || record.boundDeviceId !== deviceId) return null;
    return identity;
  }
  return action === 'activate' ? identity : null;
}
export async function activateSecureDevice(db: D1Database, data: DeviceRequest) {
  const identity = await authorized(db,data,'activate');
  if (!identity) return { success:false, status:403, error:'Bukti perangkat atau aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan.' };
  const result = await activateLicenseOnDevice(db,data);
  if (!result.success) return result;
  const key = data.licenseKey.trim().toUpperCase();
  if (!(await claim(db,key,data.deviceId,identity))) return {success:false,status:409,error:'Lisensi sudah terikat pada kunci perangkat lain.'};
  return {...result,activationToken:signOfflineLicense({v:2,licenseKey:key,deviceId:data.deviceId,deviceKey:identity,licenseType:result.licenseType as 'berbayar'|'trial'|'tester',expiresAt:result.expiresAt || null,businessName:result.businessName || 'Usaha Saya',issuedAt:Date.now()})};
}
export async function verifySecureDevice(db: D1Database, data: DeviceRequest) {
  const identity = await authorized(db,data,'verify');
  if (!identity) return {valid:false,status:'unregistered' as const,error:'Bukti lisensi atau perangkat tidak sah. Sambungkan dari perangkat yang diaktifkan.'};
  const key = data.licenseKey.trim().toUpperCase();
  const current = await binding(db,key);
  if (current) {
    const token = readSignedLicense(data.token || '');
    const legacy = token ? null : verifyDeviceActivationToken(data.token || '');
    const signedMatches = token?.licenseKey === key && token.deviceId === data.deviceId && token.deviceKey === identity;
    const legacyMatches = legacy?.valid && legacy.licenseKey === key && legacy.deviceId === data.deviceId;
    // Retrying a migration after a lost response must not strand a genuine buyer.
    if (!signedMatches && !legacyMatches) return {valid:false,status:'unregistered' as const,error:'Token aktivasi tidak sah.'};
  }
  const result = await verifyDeviceLicense(db,data);
  if (!result.valid) return result;
  if (!(await claim(db,key,data.deviceId,identity))) return {valid:false,status:'revoked' as const,error:'Lisensi terikat pada perangkat lain.'};
  return {...result,activationToken:signOfflineLicense({v:2,licenseKey:key,deviceId:data.deviceId,deviceKey:identity,licenseType:result.licenseType!,expiresAt:result.expiresAt || null,businessName:result.businessName || 'Usaha Saya',issuedAt:Date.now()})};
}
