import { db } from './dexie';
import { verifyAdminSession } from './session';
import { demoSessionValid, isDemoMode } from './demoMode';
import {getPosScope} from './multidevice/posWire';

export async function verifyMerchantPin(pin: string): Promise<boolean> {
  if(db.name.startsWith('SakuNotaPOS-')&&getPosScope()?.claims.role!=='owner')throw new Error('Tindakan ini memerlukan akses pemilik.');
  const state = await db.table('settings').get('admin_pin_attempts');
  if ((state?.value?.lockedUntil || 0) > Date.now()) throw new Error('PIN dikunci sementara. Coba lagi dalam 5 menit.');
  const config = await db.table('settings').get('pos_store_settings');
  const storedPin = config?.value?.adminPin;
  if (typeof storedPin !== 'string' || !storedPin || pin !== storedPin) {
    const attempts = (state?.value?.attempts || 0) + 1;
    await db.table('settings').put({ key: 'admin_pin_attempts', value: { attempts, lockedUntil: attempts >= 5 ? Date.now() + 300000 : 0 } });
    return false;
  }
  await db.table('settings').delete('admin_pin_attempts');
  return true;
}

export async function hasMerchantAdminAccess(): Promise<boolean> {
  if(db.name.startsWith('SakuNotaPOS-')&&getPosScope()?.claims.role!=='owner')return false;
  // Node callers are the local test/runtime layer, never a public API authorization path.
  if (typeof window === 'undefined') return true;
  if ((await db.table('settings').get('waiter_floor_session'))?.value) return false;
  if (db.name === 'SakuNotaDemoDB') return demoSessionValid();
  return verifyAdminSession();
}

export async function requireMerchantAdmin(pin?: string): Promise<void> {
  if(db.name.startsWith('SakuNotaPOS-')&&getPosScope()?.claims.role!=='owner')throw new Error('Tindakan ini memerlukan akses pemilik.');
  if (typeof window !== 'undefined' && (db.name === 'SakuNotaDemoDB') !== isDemoMode()) throw new Error('Mode database berubah. Muat ulang halaman sebelum membuka Admin.');
  if (typeof window !== 'undefined' && db.name === 'SakuNotaDemoDB' && !demoSessionValid()) throw new Error('Sesi demo sudah berakhir.');
  if (typeof window !== 'undefined' && (await db.table('settings').get('waiter_floor_session'))?.value) throw new Error('Keluar dari Waiter Floor dengan PIN Admin terlebih dahulu.');
  if (pin !== undefined) {
    if (await verifyMerchantPin(pin)) return; // One action; never creates an Admin session.
    throw new Error('PIN Admin salah. Tindakan dibatalkan.');
  }
  if (await hasMerchantAdminAccess()) return;
  throw new Error('Tindakan ini memerlukan PIN dan akses Admin toko.');
}
