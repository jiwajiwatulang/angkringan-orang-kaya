import type { AccessClaims } from '../multidevice/protocol';
import { AccessError, requireOwner } from '../multidevice/protocol';
import type { E2eePhotoPacket } from '../crypto/e2eePhoto';

export const MAX_PHOTO_CIPHERTEXT_BYTES = 512 * 1024; // 512 KB cap per transit photo
export const MAX_RELAY_TTL_MS = 24 * 60 * 60 * 1000; // 24-hour transit limit

/** Minimal interface representing Cloudflare R2Bucket with conditional operation support */
export interface RelayR2PutOptions {
  customMetadata?: Record<string, string>;
  onlyIf?: {
    etagMatches?: string;
    etagDoesNotMatch?: string;
  };
}

export interface RelayR2Object {
  etag?: string;
  text(): Promise<string>;
  customMetadata?: Record<string, string>;
}

export interface RelayR2Bucket {
  get(key: string): Promise<RelayR2Object | null>;
  put(
    key: string,
    value: string | ArrayBuffer | Uint8Array,
    options?: RelayR2PutOptions
  ): Promise<RelayR2Object | null | unknown>;
  delete(key: string | string[]): Promise<void>;
}

export interface PhotoReuploadRequest {
  storeId: string;
  photoId: string;
  employeeId: string;
  operationId: string;
  reason: string;
  requestedAt: number;
  ownerPublicKeyJwk?: JsonWebKey;
}

export interface OwnerE2eeIdentity {
  storeId: string;
  deviceId: string;
  deviceEpoch: number;
  publicKeyJwk: JsonWebKey;
  fingerprint: string;
  keyEpoch: number;
  rotatedAt: number;
}

export function relayObjectKey(storeId: string, photoId: string): string {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `relay/${storeId}/${photoId}.json`;
}

export function reuploadRequestKey(storeId: string, photoId: string): string {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `relay/${storeId}/requests/${photoId}.json`;
}

export function ownerKeyObjectKey(storeId: string): string {
  if (!storeId || /[^a-zA-Z0-9_-]/.test(storeId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `relay/${storeId}/owner-e2ee-key.json`;
}

/** Computes hex SHA-256 string from Uint8Array */
async function sha256HexStr(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Computes a canonical cryptographic hash representing the ENTIRE encrypted packet envelope.
 * Any difference in ciphertext, IV, ephemeral public key, unencrypted checksum,
 * employee ID, or operation ID produces a different envelope hash.
 */
export async function computePacketEnvelopeHash(packet: E2eePhotoPacket): Promise<string> {
  const canonicalPubKey = packet.ephemeralPublicKeyJwk
    ? JSON.stringify({
        crv: packet.ephemeralPublicKeyJwk.crv,
        kty: packet.ephemeralPublicKeyJwk.kty,
        x: packet.ephemeralPublicKeyJwk.x,
        y: packet.ephemeralPublicKeyJwk.y,
      })
    : '';

  const parts = [
    packet.photoId,
    packet.operationId,
    packet.employeeId,
    packet.checksum.toLowerCase(),
    packet.iv,
    packet.ciphertext,
    canonicalPubKey,
  ].join('::');

  return sha256HexStr(new TextEncoder().encode(parts));
}

/**
 * Pushes an encrypted attendance photo to temporary R2 transit storage.
 * Enforces employee ownership, size limits, full-envelope idempotency, and atomic overwrite prevention.
 */
export async function pushPhotoToRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  packet: E2eePhotoPacket
): Promise<{ success: boolean; photoId: string; expiresAt: number; transferToken: string; idempotent?: boolean }> {
  if (!claims.storeId) throw new AccessError('Akses tidak sah.', 401);

  // 1. Employee ownership check: must be active cashier session and match employeeId
  if (claims.role !== 'cashier' || !claims.employeeId) {
    throw new AccessError('Unggah foto hanya diizinkan untuk sesi kasir karyawan aktif.', 403);
  }
  if (!packet.employeeId || packet.employeeId !== claims.employeeId) {
    throw new AccessError('Foto hanya dapat diunggah untuk absensi milik sendiri.', 403);
  }
  if (packet.storeId && packet.storeId !== claims.storeId) {
    throw new AccessError('storeId tidak sesuai.', 403);
  }

  // 2. Strict format validation
  if (!packet.photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(packet.photoId)) {
    throw new AccessError('ID foto tidak valid.', 400);
  }
  if (!packet.operationId || !/^[a-zA-Z0-9_-]{4,80}$/.test(packet.operationId)) {
    throw new AccessError('ID operasi tidak valid.', 400);
  }
  if (!packet.checksum || !/^[a-f0-9]{64}$/i.test(packet.checksum)) {
    throw new AccessError('Checksum foto tidak valid.', 400);
  }
  if (!packet.ciphertext || typeof packet.ciphertext !== 'string' || !packet.iv) {
    throw new AccessError('Data enkripsi foto tidak lengkap.', 400);
  }
  if (!packet.ephemeralPublicKeyJwk || typeof packet.ephemeralPublicKeyJwk !== 'object') {
    throw new AccessError('Kunci publik sementara tidak valid.', 400);
  }

  // 3. Size limit check
  if (packet.ciphertext.length > MAX_PHOTO_CIPHERTEXT_BYTES) {
    throw new AccessError('Ukuran data foto melebihi batas maksimal 512 KB.', 413);
  }

  const key = relayObjectKey(claims.storeId, packet.photoId);
  const envelopeHash = await computePacketEnvelopeHash(packet);
  const now = Date.now();
  const expiresAt = Math.min(now + MAX_RELAY_TTL_MS, packet.expiresAt || now + MAX_RELAY_TTL_MS);
  const transferToken = await sha256HexStr(
    new TextEncoder().encode(`${key}::${envelopeHash}::${expiresAt}::${now}`)
  );

  // 4. Check existing object for true full-envelope idempotency
  const existing = await bucket.get(key);
  if (existing) {
    const existingMetaHash = existing.customMetadata?.envelopeHash;
    let existingEnvelopeHash = existingMetaHash;
    if (!existingEnvelopeHash) {
      try {
        const parsed = JSON.parse(await existing.text()) as E2eePhotoPacket;
        existingEnvelopeHash = await computePacketEnvelopeHash(parsed);
      } catch {}
    }

    if (existingEnvelopeHash === envelopeHash) {
      // True idempotent retry: whole envelope (ciphertext, IV, ephemeral key, checksum) is identical
      return {
        success: true,
        photoId: packet.photoId,
        expiresAt,
        transferToken: existing.customMetadata?.transferToken || transferToken,
        idempotent: true,
      };
    }

    // Different ciphertext, IV, ephemeral key, or checksum: reject overwrite!
    throw new AccessError('Foto bukti dengan ID ini sudah ada dan tidak dapat diganti.', 409, 'photo_exists');
  }

  // 5. Atomic conditional put: only write if object does not exist (prevents concurrent race conditions)
  const payloadWithExpiry = { ...packet, storeId: claims.storeId, expiresAt, envelopeHash, transferToken };
  const putResult = await bucket.put(key, JSON.stringify(payloadWithExpiry), {
    onlyIf: { etagDoesNotMatch: '*' },
    customMetadata: {
      storeId: claims.storeId,
      employeeId: packet.employeeId,
      operationId: packet.operationId,
      checksum: packet.checksum,
      envelopeHash,
      transferToken,
      expiresAt: String(expiresAt),
      uploadedAt: String(now),
    },
  });

  // If conditional write was blocked by a concurrent upload that raced between get() and put()
  if (putResult === null) {
    const postRace = await bucket.get(key);
    if (postRace) {
      const raceHash = postRace.customMetadata?.envelopeHash;
      if (raceHash === envelopeHash) {
        return {
          success: true,
          photoId: packet.photoId,
          expiresAt,
          transferToken: postRace.customMetadata?.transferToken || transferToken,
          idempotent: true,
        };
      }
    }
    throw new AccessError('Foto bukti dengan ID ini sudah ada dan tidak dapat diganti.', 409, 'photo_exists');
  }

  // 6. Clean up pending reupload request if this upload fulfills one
  const reqKey = reuploadRequestKey(claims.storeId, packet.photoId);
  await bucket.delete(reqKey).catch(() => {});

  return { success: true, photoId: packet.photoId, expiresAt, transferToken };
}

/**
 * Pulls an encrypted attendance photo from R2 transit storage.
 * Requires Owner role, performs programmatic TTL verification, and returns the transferToken.
 */
export async function pullPhotoFromRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  photoId: string
): Promise<{ found: boolean; expired?: boolean; packet?: E2eePhotoPacket; transferToken?: string; envelopeHash?: string }> {
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

  const transferToken = obj.customMetadata?.transferToken;
  const envelopeHash = obj.customMetadata?.envelopeHash;

  return { found: true, packet, transferToken, envelopeHash };
}

/**
 * Idempotently deletes an encrypted attendance photo from R2 after Owner verifies checksum and integrity.
 * Enforces transferToken binding so that stale transfers or in-flight newer uploads are never deleted.
 */
export async function ackPhotoFromRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  data: {
    photoId: string;
    checksum: string;
    transferToken?: string;
    envelopeHash?: string;
    operationId?: string;
    employeeId?: string;
  }
): Promise<{ success: boolean; deleted: boolean; alreadyDeleted?: boolean }> {
  requireOwner(claims);
  if (!data.photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(data.photoId)) {
    throw new AccessError('ID foto tidak valid.', 400);
  }
  if (!data.checksum || !/^[a-f0-9]{64}$/i.test(data.checksum)) {
    throw new AccessError('Checksum tidak valid.', 400);
  }

  const key = relayObjectKey(claims.storeId, data.photoId);
  const existing = await bucket.get(key);
  if (!existing) {
    // Idempotent: already deleted or expired
    return { success: true, deleted: true, alreadyDeleted: true };
  }

  const content = await existing.text();
  try {
    const packet = JSON.parse(content) as E2eePhotoPacket;
    if (packet.checksum && packet.checksum.toLowerCase() !== data.checksum.toLowerCase()) {
      throw new AccessError('Checksum foto tidak sesuai konfirmasi.', 400);
    }
    if (data.operationId && packet.operationId && packet.operationId !== data.operationId) {
      throw new AccessError('ID operasi tidak sesuai konfirmasi transfer.', 400);
    }
    if (data.employeeId && packet.employeeId && packet.employeeId !== data.employeeId) {
      throw new AccessError('ID karyawan tidak sesuai konfirmasi transfer.', 400);
    }

    // Transfer token protection: if provided, must match existing metadata (prevents deleting newer in-flight transfer)
    const existingToken = existing.customMetadata?.transferToken;
    if (data.transferToken && existingToken && data.transferToken !== existingToken) {
      throw new AccessError('Token transfer foto sudah kedaluwarsa atau digantikan transfer baru.', 409, 'stale_transfer');
    }
  } catch (e) {
    if (e instanceof AccessError) throw e;
  }

  await bucket.delete(key);
  await bucket.delete(reuploadRequestKey(claims.storeId, data.photoId)).catch(() => {});
  return { success: true, deleted: true };
}

/**
 * Allows the Owner to request a re-upload for an uncollected attendance photo
 * (e.g. after Owner device replacement or key rotation).
 */
export async function requestPhotoReuploadR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  data: {
    photoId: string;
    employeeId: string;
    operationId: string;
    reason?: string;
    ownerPublicKeyJwk?: JsonWebKey;
  }
): Promise<{ success: boolean; requested: boolean; photoId: string }> {
  requireOwner(claims);
  if (!data.photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(data.photoId)) {
    throw new AccessError('ID foto tidak valid.', 400);
  }
  if (!data.employeeId || !/^[a-zA-Z0-9_-]{4,80}$/.test(data.employeeId)) {
    throw new AccessError('ID karyawan tidak valid.', 400);
  }

  // 1. Remove stale buffer if present so fresh upload is unblocked
  const key = relayObjectKey(claims.storeId, data.photoId);
  await bucket.delete(key);

  // 2. Persist explicit reupload request in R2
  const reqKey = reuploadRequestKey(claims.storeId, data.photoId);
  const payload: PhotoReuploadRequest = {
    storeId: claims.storeId,
    photoId: data.photoId,
    employeeId: data.employeeId,
    operationId: data.operationId,
    reason: data.reason || 'Pemilik toko meminta unggah ulang bukti foto absensi',
    requestedAt: Date.now(),
    ownerPublicKeyJwk: data.ownerPublicKeyJwk,
  };

  await bucket.put(reqKey, JSON.stringify(payload), {
    customMetadata: {
      storeId: claims.storeId,
      employeeId: data.employeeId,
      photoId: data.photoId,
      requestedAt: String(Date.now()),
    },
  });

  return { success: true, requested: true, photoId: data.photoId };
}

/**
 * Checks if a re-upload was requested for a specific photo.
 * Only the targeted employee can check their own reupload request.
 */
export async function checkPhotoReuploadR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  photoId: string
): Promise<{ hasRequest: boolean; request?: PhotoReuploadRequest }> {
  if (!claims.storeId || !claims.employeeId) {
    throw new AccessError('Akses tidak sah.', 401);
  }
  if (!photoId || !/^[a-zA-Z0-9_-]{4,80}$/.test(photoId)) {
    throw new AccessError('ID foto tidak valid.', 400);
  }

  const reqKey = reuploadRequestKey(claims.storeId, photoId);
  const obj = await bucket.get(reqKey);
  if (!obj) return { hasRequest: false };

  try {
    const text = await obj.text();
    const req = JSON.parse(text) as PhotoReuploadRequest;
    if (req.employeeId !== claims.employeeId) {
      return { hasRequest: false };
    }
    return { hasRequest: true, request: req };
  } catch {
    return { hasRequest: false };
  }
}

/**
 * Registers or rotates the Owner's E2EE public key.
 * Only the authentic Owner can set the public key.
 * Protects against concurrent rotation via CAS (Compare-And-Swap) epoch checking
 * and conditional R2 write.
 */
export async function setOwnerE2eeKeyR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  data: {
    publicKeyJwk: JsonWebKey;
    keyEpoch?: number;
    expectedCurrentEpoch?: number;
  }
): Promise<{ success: boolean; fingerprint: string; keyEpoch: number; rotatedAt: number }> {
  requireOwner(claims);
  if (!data.publicKeyJwk || typeof data.publicKeyJwk !== 'object') {
    throw new AccessError('Kunci publik tidak valid.', 400);
  }
  if (data.publicKeyJwk.kty !== 'EC' || data.publicKeyJwk.crv !== 'P-256') {
    throw new AccessError('Format kunci ECDH P-256 tidak sesuai.', 400);
  }

  const key = ownerKeyObjectKey(claims.storeId);
  const existing = await bucket.get(key);
  let currentEpoch = 0;
  let existingDeviceEpoch = 0;

  if (existing) {
    try {
      const existingData = JSON.parse(await existing.text()) as OwnerE2eeIdentity;
      if (typeof existingData.keyEpoch === 'number') {
        currentEpoch = existingData.keyEpoch;
      }
      if (typeof existingData.deviceEpoch === 'number') {
        existingDeviceEpoch = existingData.deviceEpoch;
      }
    } catch {}

    // Concurrent rotation protection: client specified expectedCurrentEpoch must match
    if (
      typeof data.expectedCurrentEpoch === 'number' &&
      data.expectedCurrentEpoch !== currentEpoch
    ) {
      throw new AccessError('Versi kunci toko sudah berubah. Muat ulang dan coba lagi.', 409, 'epoch_conflict');
    }
  }

  const nextEpoch = (typeof data.keyEpoch === 'number' && data.keyEpoch > currentEpoch)
    ? data.keyEpoch
    : currentEpoch + 1;

  // Compute SHA-256 fingerprint of canonical JWK
  const canonicalJwkStr = JSON.stringify({
    crv: data.publicKeyJwk.crv,
    kty: data.publicKeyJwk.kty,
    x: data.publicKeyJwk.x,
    y: data.publicKeyJwk.y,
  });
  const fingerprint = await sha256HexStr(new TextEncoder().encode(canonicalJwkStr));

  const now = Date.now();
  const identity: OwnerE2eeIdentity = {
    storeId: claims.storeId,
    deviceId: claims.deviceId,
    deviceEpoch: claims.deviceEpoch,
    publicKeyJwk: data.publicKeyJwk,
    fingerprint,
    keyEpoch: nextEpoch,
    rotatedAt: now,
  };

  // Atomic conditional write: etagMatches if existing, or etagDoesNotMatch if initial
  const putResult = await bucket.put(key, JSON.stringify(identity), {
    onlyIf: existing?.etag
      ? { etagMatches: existing.etag }
      : { etagDoesNotMatch: '*' },
    customMetadata: {
      storeId: claims.storeId,
      deviceId: claims.deviceId,
      deviceEpoch: String(claims.deviceEpoch),
      fingerprint,
      keyEpoch: String(nextEpoch),
      rotatedAt: String(now),
    },
  });

  if (putResult === null) {
    throw new AccessError('Terjadi konflik perubahan kunci bersamaan. Coba lagi.', 409, 'epoch_conflict');
  }

  return { success: true, fingerprint, keyEpoch: nextEpoch, rotatedAt: now };
}

/**
 * Retrieves the store Owner's active E2EE public key.
 * Accessible to any authorized device in the store.
 */
export async function getOwnerE2eeKeyR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims
): Promise<{ found: boolean; identity?: OwnerE2eeIdentity }> {
  if (!claims.storeId) throw new AccessError('Akses tidak sah.', 401);
  const key = ownerKeyObjectKey(claims.storeId);
  const obj = await bucket.get(key);
  if (!obj) return { found: false };

  try {
    const text = await obj.text();
    const identity = JSON.parse(text) as OwnerE2eeIdentity;
    if (identity.storeId !== claims.storeId) return { found: false };
    return { found: true, identity };
  } catch {
    return { found: false };
  }
}
