export const MERCHANT_LOGIN_URL = '/pos?login=true';
const demoKeys = ['sakunota_demo_mode', 'sakunota_demo_initialized', 'sakunota_demo_started_at'];

export function clearDemoForLogin(storage: Pick<Storage, 'removeItem' | 'getItem'>): void {
  for (const key of demoKeys) storage.removeItem(key);
  if (storage.getItem('sakunota_demo_mode') === 'true') throw new Error('Mode demo belum dapat ditutup. Izinkan penyimpanan browser, lalu coba Login kembali.');
}

export function isMerchantLoginRequest(search: string): boolean {
  return new URLSearchParams(search).get('login') === 'true';
}

export function openMerchantCashier(): void {
  clearDemoForLogin(window.sessionStorage);
  // Reload the document: the database is selected when its module first loads.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Switching demo/merchant databases requires a document reload.
  window.location.assign(MERCHANT_LOGIN_URL);
}
