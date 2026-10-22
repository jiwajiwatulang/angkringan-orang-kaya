export const DEMO_DURATION_MS = 30 * 60 * 1000;
export const DEMO_ORDER_LIMIT = 50;
/** A stored activation always takes precedence over a demo URL, even if it needs renewal. */
export function hasSavedLicense(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const storage = window.localStorage ?? (typeof localStorage !== 'undefined' ? localStorage : undefined);
    return Boolean(storage?.getItem('sakunota_license_key')?.trim() || storage?.getItem('sakunota_activation_token')?.trim());
  } catch { return true; }
}
export function isDemoMode(): boolean {
  return typeof window !== 'undefined' && !hasSavedLicense() && (new URLSearchParams(window.location?.search || '').get('demo') === 'true' || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sakunota_demo_mode') === 'true'));
}
export function workspaceHref(path: string, demo = isDemoMode()): string {
  return demo && !hasSavedLicense() ? `${path}${path.includes('?') ? '&' : '?'}demo=true` : path;
}
export function normalizeWorkspaceMode(): void {
  if (typeof window === 'undefined' || !hasSavedLicense()) return;
  try {
    for (const key of ['sakunota_demo_mode', 'sakunota_demo_started_at', 'sakunota_demo_initialized']) sessionStorage.removeItem(key);
    const url = new URL(window.location.href);
    if (url.searchParams.has('demo')) { url.searchParams.delete('demo'); window.history.replaceState(window.history.state, '', url.toString()); }
  } catch { /* Access checks still select the merchant store when URL storage is unavailable. */ }
}
export function demoSessionValid(): boolean {
  if (!isDemoMode()) return false;
  const value = sessionStorage.getItem('sakunota_demo_started_at');
  if (value === null) sessionStorage.setItem('sakunota_demo_started_at', String(Date.now()));
  const start = Number(value ?? Date.now());
  return Number.isFinite(start) && start > 0 && Date.now() >= start && Date.now() - start < DEMO_DURATION_MS;
}
export function preserveDemoUrl(): void {
  normalizeWorkspaceMode();
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
