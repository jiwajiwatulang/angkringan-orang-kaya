export const DEMO_DURATION_MS = 30 * 60 * 1000;
export const DEMO_ORDER_LIMIT = 50;
import {isDemoRequested} from './demoRequest';
export function isDemoMode(): boolean {
  return isDemoRequested();
}
export function demoSessionValid(): boolean {
  if (!isDemoMode()) return false;
  const value = sessionStorage.getItem('sakunota_demo_started_at');
  if (value === null) sessionStorage.setItem('sakunota_demo_started_at', String(Date.now()));
  const start = Number(value ?? Date.now());
  return Number.isFinite(start) && start > 0 && Date.now() >= start && Date.now() - start < DEMO_DURATION_MS;
}
export function preserveDemoUrl(): void {
  if (!isDemoMode()) return;
  sessionStorage.setItem('sakunota_demo_mode', 'true');
  const url = new URL(window.location.href);
  if (url.searchParams.get('demo') !== 'true') {
    url.searchParams.set('demo', 'true');
    window.history.replaceState(window.history.state, '', url.toString());
  }
}

export function restartDemoSession(): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem('sakunota_demo_mode', 'true');
    sessionStorage.setItem('sakunota_demo_started_at', String(Date.now()));
  }
}
