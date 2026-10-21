// Shared by demo and licensed mode: leaving demo must not reset this preference.
export const FIRST_RUN_GUIDE_KEY = 'sakunota_first_run_guide';
export type GuideStep = 'welcome' | 'shift' | 'catalog' | 'cart' | 'payment' | 'receipt' | 'done';
export type GuideProgress = { status: 'active' | 'skipped' | 'completed'; step: GuideStep };
const steps: GuideStep[] = ['welcome', 'shift', 'catalog', 'cart', 'payment', 'receipt', 'done'];
export interface GuideStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }

export function readGuideProgress(storage: GuideStorage): GuideProgress {
  try {
    const value = JSON.parse(storage.getItem(FIRST_RUN_GUIDE_KEY) || 'null');
    if (value && ['active', 'skipped', 'completed'].includes(value.status) && steps.includes(value.step)) return value;
  } catch { /* A new or unavailable storage starts at the welcome screen. */ }
  return { status: 'active', step: 'welcome' };
}

export function saveGuideProgress(storage: GuideStorage, progress: GuideProgress): boolean {
  try { storage.setItem(FIRST_RUN_GUIDE_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}

export function reconcileGuideStep(step: GuideStep, state: { hasShift: boolean; hasItems: boolean; paymentOpen: boolean; savedReceipt: boolean }): GuideStep {
  if (step === 'welcome' || step === 'done') return step;
  if (!state.hasShift) return 'shift';
  if (step === 'shift') return state.hasItems ? 'cart' : 'catalog';
  if (state.savedReceipt && ['cart', 'payment', 'receipt'].includes(step)) return 'receipt';
  if (step === 'receipt') return 'done';
  if (!state.hasItems) return 'catalog';
  if (step === 'catalog') return 'cart';
  return state.paymentOpen ? 'payment' : 'cart';
}
