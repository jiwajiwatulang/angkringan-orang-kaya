import { activateLicenseOnDevice, verifyDeviceLicense, verifyDeviceActivationToken } from './sakunotaServer';
import { getLicenseD1, getTesterLicenseD1, getBetaRegistrationByLicenseKeyD1, upsertDeviceTelemetryD1, type D1Database } from './d1';
import { readSignedLicense, signOfflineLicense, verifyDeviceProof } from './licenseSigning';
import type { DeviceProof } from '../licenseProtocol';

interface DeviceRequest { licenseKey: string; deviceId: string; deviceName?: string; deviceModel?: string; location?: string; ipAddress?: string; token?: string; deviceProof?: DeviceProof }
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
async function authorized(db: D1Database, data: DeviceRequest, action: string): Promise<{ identity: string | null; error?: string; status?: number }> {
  const key = data.licenseKey.trim().toUpperCase();
  const deviceId = data.deviceId.trim();
  const identity = verifyDeviceProof(action, key, deviceId, data.token || '', data.deviceProof);
  if (!identity) return { identity: null, error: 'Bukti perangkat atau aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan.', status: 403 };
  const record = await currentRecord(db, key);
  if (!record) return { identity: null, error: 'Nomor lisensi tidak ditemukan di sistem. Periksa kembali penulisan kode lisensi Anda.', status: 404 };
  if ((record as any).revoked) return { identity: null, error: 'Lisensi ini telah dicabut atau dinonaktifkan.', status: 403 };
  const saved = await binding(db, key);
  if (saved) {
    if (saved.deviceId !== deviceId || saved.publicKey !== identity) {
      return { identity: null, error: 'Lisensi ini sudah terikat pada perangkat lain. Jika Anda berganti HP, silakan lepas ikatan perangkat pada Portal Owner.', status: 403 };
    }
    return { identity };
  }
  // A pre-upgrade installation must prove its old activation, not just copy a device ID.
  if (record.boundDeviceId) {
    if (record.boundDeviceId !== deviceId) {
      return { identity: null, error: `Lisensi ini sudah terikat pada perangkat lain (${record.deviceName || record.boundDeviceId}). Silakan lepas ikatan perangkat pada Portal Owner jika Anda berganti HP.`, status: 403 };
    }
    const legacy = verifyDeviceActivationToken(data.token || '');
    if (!legacy.valid || legacy.licenseKey !== key || legacy.deviceId !== deviceId) {
      return { identity: null, error: 'Bukti aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan.', status: 403 };
    }
    return { identity };
  }
  return action === 'activate' ? { identity } : { identity: null, error: 'Aksi verifikasi tidak diizinkan sebelum lisensi diaktifkan.', status: 403 };
}
export async function activateSecureDevice(db: D1Database, data: DeviceRequest) {
  const auth = await authorized(db, data, 'activate');
  if (!auth.identity) return { success: false, status: auth.status || 403, error: auth.error || 'Bukti perangkat atau aktivasi lama tidak sah. Gunakan perangkat asal atau hubungi dukungan.' };
  const identity = auth.identity;
  const result = await activateLicenseOnDevice(db, data);
  if (!result.success) return result;
  const key = data.licenseKey.trim().toUpperCase();
  if (!(await claim(db, key, data.deviceId, identity))) return { success: false, status: 409, error: 'Lisensi sudah terikat pada kunci perangkat lain.' };
  await upsertDeviceTelemetryD1(db, {
    licenseKey: key,
    deviceId: data.deviceId,
    deviceModel: data.deviceModel || null,
    location: data.location || null,
    ipAddress: data.ipAddress || null,
  });
  return { ...result, activationToken: signOfflineLicense({ v: 2, licenseKey: key, deviceId: data.deviceId, deviceKey: identity, licenseType: result.licenseType as 'berbayar' | 'trial' | 'tester', expiresAt: result.expiresAt || null, businessName: result.businessName || 'Usaha Saya', issuedAt: Date.now() }) };
}
export async function verifySecureDevice(db: D1Database, data: DeviceRequest) {
  const auth = await authorized(db, data, 'verify');
  if (!auth.identity) return { valid: false, status: 'unregistered' as const, error: auth.error || 'Bukti lisensi atau perangkat tidak sah. Sambungkan dari perangkat yang diaktifkan.' };
  const identity = auth.identity;
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
  await upsertDeviceTelemetryD1(db, {
    licenseKey: key,
    deviceId: data.deviceId,
    deviceModel: data.deviceModel || null,
    location: data.location || null,
    ipAddress: data.ipAddress || null,
  });
  return {...result,activationToken:signOfflineLicense({v:2,licenseKey:key,deviceId:data.deviceId,deviceKey:identity,licenseType:result.licenseType!,expiresAt:result.expiresAt || null,businessName:result.businessName || 'Usaha Saya',issuedAt:Date.now()})};
}
