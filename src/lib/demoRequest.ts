/** Explicit demo context must never select a paired business database. */
export function isDemoRequested(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location?.search || '').get('demo') === 'true') return true;
  try { return sessionStorage.getItem('sakunota_demo_mode') === 'true'; } catch { return false; }
}
