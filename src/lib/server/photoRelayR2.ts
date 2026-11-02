import type { AccessClaims } from '../multidevice/protocol';
import { AccessError, requireOwner } from '../multidevice/protocol';
import type { E2eePhotoPacket } from '../crypto/e2eePhoto';

export const MAX_PHOTO_CIPHERTEXT_BYTES = 512 * 1024; // 512 KB cap per transit photo
export const MAX_RELAY_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour transit limit

/** Minimal interface representing Cloudflare R2Bucket */
export interface RelayR2Bucket {
  get(key: string): Promise<{
    text(): Promise<string>;
    customMetadata?: Record<string, string>;
  } | null>;
  put(
    key: string,
    value: string | ArrayBuffer | Uint8Array,
    options?: { customMetadata?: Record<string, string> }
  ): Promise<unknown>;
  delete(key: string | string[]): Promise<void>;
}

export function relayObjectKey(storeId: string, photoId: string): string {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `relay/${storeId}/${photoId}.json`;
}

/**
 * Pushes an encrypted attendance photo to temporary R2 transit storage.
 * Enforces size limits and sets 24-hour expiration metadata.
 */
export async function pushPhotoToRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  packet: E2eePhotoPacket
): Promise<{ success: boolean; photoId: string; expiresAt: number }> {
  if (!claims.storeId) throw new AccessError('Akses tidak sah.', 401);
  if (!packet.photoId || !packet.ciphertext || !packet.checksum || !packet.iv) {
    throw new AccessError('Data foto tidak lengkap.', 400);
  }

  // Size limit check
  if (packet.ciphertext.length > MAX_PHOTO_CIPHERTEXT_BYTES) {
    throw new AccessError('Ukuran data foto melebihi batas maksimal 512 KB.', 413);
  }

  const now = Date.now();
  const expiresAt = Math.min(now + MAX_RELAY_TTL_MS, packet.expiresAt || (now + MAX_RELAY_TTL_MS));
  const payloadWithExpiry = { ...packet, expiresAt };
  const key = relayObjectKey(claims.storeId, packet.photoId);

  await bucket.put(key, JSON.stringify(payloadWithExpiry), {
    customMetadata: {
      storeId: claims.storeId,
      employeeId: packet.employeeId,
      checksum: packet.checksum,
      expiresAt: String(expiresAt),
      uploadedAt: String(now),
    },
  });

  return { success: true, photoId: packet.photoId, expiresAt };
}

/**
 * Pulls an encrypted attendance photo from R2 transit storage.
 * Requires Owner role and performs programmatic TTL verification.
 */
export async function pullPhotoFromRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  photoId: string
): Promise<{ found: boolean; expired?: boolean; packet?: E2eePhotoPacket }> {
  requireOwner(claims);
  const key = relayObjectKey(claims.storeId, photoId);
  const obj = await bucket.get(key);
  if (!obj) {
    return { found: false };
  }

  const content = await obj.text();
  let packet: E2eePhotoPacket;
  try {
    packet = JSON.parse(content);
  } catch {
    await bucket.delete(key);
    return { found: false };
  }

  // Programmatic TTL expiration check (do not rely solely on delayed R2 background lifecycle)
  if (Date.now() > packet.expiresAt) {
    await bucket.delete(key);
    return { found: false, expired: true };
  }

  return { found: true, packet };
}

/**
 * Idempotently deletes an encrypted attendance photo from R2 after Owner verifies checksum.
 * Requires Owner role.
 */
export async function ackPhotoFromRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  photoId: string,
  checksum: string
): Promise<{ success: boolean; deleted: boolean }> {
  requireOwner(claims);
  const key = relayObjectKey(claims.storeId, photoId);
  const existing = await bucket.get(key);
  if (!existing) {
    // Idempotent: already deleted or expired
    return { success: true, deleted: true };
  }

  const content = await existing.text();
  try {
    const packet = JSON.parse(content);
    if (packet.checksum && packet.checksum !== checksum) {
      throw new AccessError('Checksum foto tidak sesuai konfirmasi.', 400);
    }
  } catch (e) {
    if (e instanceof AccessError) throw e;
  }

  await bucket.delete(key);
  return { success: true, deleted: true };
}

/**
 * Allows the Owner to request a re-upload for an uncollected attendance photo
 * (e.g. after Owner device replacement or key rotation).
 */
export async function requestPhotoReuploadR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  photoId: string,
  reason: string
): Promise<{ success: boolean; requested: boolean }> {
  requireOwner(claims);
  const key = relayObjectKey(claims.storeId, photoId);
  // Remove stale buffer if present so fresh upload is unblocked
  await bucket.delete(key);
  return { success: true, requested: true };
}
