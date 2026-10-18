import { db } from './dexie';

export const WAITER_SESSION_KEY = 'waiter_floor_session';
export interface WaiterSession {
  name: string;
  tableIds: number[];
  startedAt: string;
  failedAttempts?: number;
  lockedUntil?: number;
}
export async function getWaiterSession(): Promise<WaiterSession | null> {
  return (await db.table('settings').get(WAITER_SESSION_KEY))?.value || null;
}
