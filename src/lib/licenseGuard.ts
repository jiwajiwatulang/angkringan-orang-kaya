// SakuNota License & Closed Beta Trial Guard
// Handles offline verification, monotonic clock tampering detection, and 7-day trial expiry

import { getLocalDeviceId, verifyLicenseServer } from "./ordersClient";
import { deviceKeyIdentity } from './deviceIdentity';
import { verifyOfflineLicense } from './offlineLicense';
import { isDemoMode, demoSessionValid } from './demoMode';
import {getPosScope} from './multidevice/posWire';
import {posPartition} from './multidevice/posPartition';
let lastOnlineCheck = 0;
let verification: Promise<Awaited<ReturnType<typeof verifyLicenseServer>>> | undefined;

export interface CashierAccessStatus {
  isValid: boolean;
  isDemo: boolean;
  status: "unregistered" | "pending_approval" | "trial_active" | "trial_expired" | "demo_expired" | "paid_active" | "tester_active" | "tester_expired" | "revoked";
  licenseKey?: string;
  licenseType?: "berbayar" | "trial" | "tester";
  businessName?: string;
  expiresAt?: string | null;
  daysRemaining?: number;
  hoursRemaining?: number;
  isClockTampered?: boolean;
  error?: string;
}

export function detectClockTampering(): boolean {
  const storage = typeof window !== "undefined" ? window.localStorage : (typeof globalThis !== "undefined" && (globalThis as any).localStorage ? (globalThis as any).localStorage : null);
  if (!storage) return false;
  try {
    const now = Date.now();
    const lastSeenStr = storage.getItem("sakunota_clock_watermark");
    if (lastSeenStr) {
      const lastSeen = Number(lastSeenStr);
      // If system clock was turned back by more than 1 minute (60,000 ms)
      if (now < lastSeen - 60000) {
        return true;
      }
    }
    // Update watermark
    storage.setItem("sakunota_clock_watermark", String(now));
  } catch (_) {}
  return false;
}

export async function checkCashierAccess(forceOnlineCheck: boolean = false): Promise<CashierAccessStatus> {
  const denied = (error: string): CashierAccessStatus => ({ isValid:false, isDemo:false, status:'unregistered', error });
  if (typeof window === 'undefined') return denied('Perangkat belum tersedia.');
  if(posPartition()){
    const scope=getPosScope();if(!scope||scope.claims.expiresAt<=Date.now())return denied('Silakan masuk kasir.');
    return {isValid:true,isDemo:false,status:'paid_active',businessName:'SakuNota'};
  }
  if (isDemoMode()) {
    const valid = demoSessionValid();
    return {isValid:valid,isDemo:true,status:valid?'trial_active':'demo_expired',businessName:'Demo SakuNota',error:valid?undefined:'Sesi simulasi demo 30 menit telah berakhir. Anda dapat mengulang demo kapan saja secara gratis atau aktifkan lisensi resmi.'};
  }
  const licenseKey = localStorage.getItem('sakunota_license_key') || '';
  let token = localStorage.getItem('sakunota_activation_token') || '';
  if (!licenseKey || !token) return denied('Aktifkan lisensi atau trial pada perangkat ini terlebih dahulu.');
  const deviceId = getLocalDeviceId();
  let identity: string;
  try { identity = await deviceKeyIdentity(); }
  catch { return denied('Kunci perangkat tidak dapat dibaca. Periksa izin penyimpanan browser.'); }
  let claims = await verifyOfflineLicense(token,licenseKey,deviceId,identity);
  // A definitive online rejection is sticky until a successful online activation/verification.
  const rejected = localStorage.getItem('sakunota_license_rejected') === licenseKey;
  const shouldCheck = navigator.onLine && (forceOnlineCheck || !claims || Date.now()-lastOnlineCheck > 15*60*1000 || rejected);
  if (shouldCheck) {
    try {
      if (!verification) verification = verifyLicenseServer(licenseKey,deviceId,token).finally(()=>{ verification=undefined; });
      const result = await verification;
      lastOnlineCheck = Date.now();
      if (!result.valid) {
        localStorage.setItem('sakunota_license_rejected',licenseKey);
        return {isValid:false,isDemo:false,status:result.status || 'unregistered',error:result.error || 'Lisensi tidak aktif.'};
      }
      if (result.activationToken) {
        const checked = await verifyOfflineLicense(result.activationToken,licenseKey,deviceId,identity);
        if (!checked) return denied('Bukti aktivasi server tidak dapat diverifikasi.');
        token = result.activationToken; claims = checked;
        localStorage.setItem('sakunota_activation_token',token);
      }
      localStorage.removeItem('sakunota_license_rejected');
      localStorage.setItem('sakunota_clock_watermark', String(Date.now()));
    } catch {
      // Network/5xx failure never upgrades an unsigned legacy cache into a license.
      if (rejected) return denied('Lisensi sebelumnya ditolak. Sambungkan internet untuk verifikasi kembali.');
    }
  } else if (rejected) return denied('Lisensi sebelumnya ditolak. Sambungkan internet untuk verifikasi kembali.');
  if (!claims) return denied('Pembaruan keamanan lisensi memerlukan internet satu kali di perangkat asal. Data toko tetap tersimpan; tidak perlu membeli ulang.');
  const expiry = claims.expiresAt ? Date.parse(claims.expiresAt) : null;
  const tampered = detectClockTampering();
  if (expiry !== null && (tampered || Date.now() >= expiry)) return {isValid:false,isDemo:false,status:claims.licenseType==='tester'?'tester_expired':'trial_expired',isClockTampered:tampered,error:tampered?'Waktu perangkat berubah. Sambungkan internet dan sesuaikan jam perangkat.':'Masa trial atau tester sudah berakhir.'};
  const status = claims.licenseType === 'berbayar' ? 'paid_active' : claims.licenseType === 'tester' ? 'tester_active' : 'trial_active';
  return {isValid:true,isDemo:false,status,licenseKey:claims.licenseKey,licenseType:claims.licenseType,businessName:claims.businessName,expiresAt:claims.expiresAt,daysRemaining:expiry===null?undefined:Math.max(0,Math.floor((expiry-Date.now())/86400000)),hoursRemaining:expiry===null?undefined:Math.max(0,Math.floor((expiry-Date.now())/3600000))};
}

export async function requireCashierWriteAccess(allowWaiterDraft = false): Promise<void> {
  if (typeof window === 'undefined') return;
  const { db } = await import('./dexie');
  if ((db.name === 'SakuNotaDemoDB') !== isDemoMode()) throw new Error('Mode database berubah. Muat ulang halaman sebelum melanjutkan.');
  if (!allowWaiterDraft && (await db.table('settings').get('waiter_floor_session'))?.value) throw new Error('Waiter Floor hanya dapat mencatat pesanan meja, tanpa pembayaran atau pengaturan shift.');
  const access = await checkCashierAccess();
  if (!access.isValid) throw new Error(access.error || 'Lisensi kasir tidak aktif.');
}
