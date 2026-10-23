export type DeviceRole = 'owner' | 'cashier';
export const OFFLINE_ACCESS_MS = 24 * 60 * 60 * 1000;
export const PAIRING_MS = 5 * 60 * 1000;
export interface AccessClaims {
  version: 1; storeId: string; deviceId: string; deviceKey: string;
  role: DeviceRole; deviceEpoch: number; employeeId?: string; employeeEpoch?: number; pinDigest?: string;
  issuedAt: number; expiresAt: number;
}
export class AccessError extends Error {
  constructor(message = 'Akses tidak diizinkan.', public status = 403) { super(message); }
}
export function requireOwner(claims: AccessClaims) {
  if (claims.role !== 'owner' || claims.employeeId) throw new AccessError('Tindakan ini memerlukan akses pemilik.');
}
export function assertId(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(value)) throw new AccessError('Data tidak valid.', 400);
}
export function integer(value: unknown, positive = false): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < (positive ? 1 : 0)) throw new AccessError('Jumlah tidak valid.', 400);
  return value;
}
export function text(value: unknown, max = 100): string {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new AccessError('Lengkapi data dengan benar.', 400);
  return value.trim();
}
export function validClaims(claims: AccessClaims, now = Date.now()): boolean {
  return claims.version === 1 && ['owner', 'cashier'].includes(claims.role) &&
    Number.isSafeInteger(claims.deviceEpoch) && claims.deviceEpoch > 0 &&
    Number.isSafeInteger(claims.issuedAt) && Number.isSafeInteger(claims.expiresAt) &&
    now >= claims.issuedAt - 60000 && now < claims.expiresAt &&
    claims.expiresAt - claims.issuedAt <= OFFLINE_ACCESS_MS && claims.expiresAt > claims.issuedAt &&
    (claims.role !== 'owner' || !claims.employeeId) &&
    (!claims.employeeId || (Number.isSafeInteger(claims.employeeEpoch) && claims.employeeEpoch! > 0 && /^[a-f0-9]{64}$/.test(claims.pinDigest || '')));
}
export interface CatalogProduct {
  id: string; version: number; name: string; price: number; cost: number | null;
  unit: 'pcs' | 'g'; priceBasis: number; active: boolean;
}
export interface SaleLine {
  productId: string; catalogVersion: number; name: string; quantity: number;
  unit: 'pcs' | 'g'; price: number; priceBasis: number;
}
export type StoreEvent = {
  id: string; storeId: string; deviceId: string; operatorId: string;
  kind: 'catalog.put' | 'settings.put' | 'shift.open' | 'shift.close' | 'order.create' | 'payment.record' | 'refund.record' | 'stock.adjust' | 'pos.commit';
  entityId: string; data: Record<string, unknown>;
};
export function validateEnvelope(event: StoreEvent, claims: AccessClaims) {
  for (const id of [event.id, event.entityId, event.storeId, event.deviceId, event.operatorId]) assertId(id);
  if (event.storeId !== claims.storeId || event.deviceId !== claims.deviceId || event.operatorId !== (claims.employeeId || claims.deviceId)) throw new AccessError();
  if (!event.data || typeof event.data !== 'object' || Array.isArray(event.data)) throw new AccessError('Data tidak valid.', 400);
  if (!['catalog.put','settings.put','shift.open','shift.close','order.create','payment.record','refund.record','stock.adjust','pos.commit'].includes(event.kind)) throw new AccessError('Tindakan tidak tersedia.',400);
  if (['catalog.put','settings.put','refund.record','stock.adjust'].includes(event.kind)) requireOwner(claims);
  if (claims.role === 'cashier' && !claims.employeeId) throw new AccessError('Silakan masuk kasir.');
}
export function lineAmount(quantity: number, price: number, basis: number): number {
  integer(quantity, true); integer(price); integer(basis, true);
  const result = (BigInt(quantity) * BigInt(price) + BigInt(basis) / BigInt(2)) / BigInt(basis);
  if (result > BigInt(Number.MAX_SAFE_INTEGER)) throw new AccessError('Jumlah terlalu besar.',400);
  return Number(result);
}
export function cashierProduct(product: CatalogProduct): Omit<CatalogProduct, 'cost'> {
  const {cost: _cost, ...safe} = product; return safe;
}
