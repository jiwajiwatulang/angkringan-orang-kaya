import type { CashierAccessStatus } from './licenseGuard';

export function canOpenStoreOnboarding(access: CashierAccessStatus): boolean {
  return access.isValid && !access.isDemo && ['paid_active', 'tester_active', 'trial_active'].includes(access.status);
}
