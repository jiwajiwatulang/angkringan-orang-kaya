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
  list?(options?: {
    prefix?: string;
    limit?: number;
    include?: Array<'httpMetadata' | 'customMetadata'>;
  }): Promise<{ objects: Array<{ key: string; customMetadata?: Record<string, string> }> }>;
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

/** Prefix for all versioned transfers of a specific photo */
export function relayTransferPrefix(storeId: string, photoId: string): string {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `relay/${storeId}/transfers/${photoId}/`;
}

/** Unique transfer-versioned object key */
export function relayTransferKey(storeId: string, photoId: string, transferToken: string): string {
  if (!transferToken || !/^[a-f0-9]{64}$/i.test(transferToken)) {
    throw new AccessError('Token transfer tidak valid.', 400);
  }
  return `${relayTransferPrefix(storeId, photoId)}${transferToken}.json`;
}

/**
 * Object key helper with transferToken support and prefix fallback.
 */
export function relayObjectKey(storeId: string, photoId: string, transferToken?: string): string {
  if (transferToken) {
    return relayTransferKey(storeId, photoId, transferToken);
  }
  return `relay/${storeId}/transfers/${photoId}/`;
}

export function reuploadRequestKey(storeId: string, photoId: string): string {
  if (!storeId || !photoId || /[^a-zA-Z0-9_-]/.test(photoId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `requests/${storeId}/${photoId}.json`;
}

export function ownerKeyObjectKey(storeId: string): string {
  if (!storeId || /[^a-zA-Z0-9_-]/.test(storeId)) {
    throw new AccessError('Parameter tidak valid.', 400);
  }
  return `keys/${storeId}/owner-e2ee-key.json`;
}

/**
 * Legacy passthrough helper retained for backward compatibility.
 * Concurrency safety is now enforced natively by transfer-versioned R2 keys,
 * eliminating all in-memory lock state across multi-isolate environments.
 */
export async function withPhotoLock<T>(_storeId: string, _photoId: string, fn: () => Promise<T>): Promise<T> {
  return fn();
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
 * Computes deterministic transfer token from storeId, photoId, and canonical envelope hash.
 * Exact same payload produces the exact same transfer token.
 * Any re-encryption or payload difference produces a distinct transfer token.
 */
export async function computeTransferToken(storeId: string, photoId: string, envelopeHash: string): Promise<string> {
  const parts = `${storeId}::${photoId}::${envelopeHash}`;
  return sha256HexStr(new TextEncoder().encode(parts));
}

/**
 * Pushes an encrypted attendance photo to temporary R2 transit storage.
 * Uses transfer-versioned immutable keys (relay/${storeId}/transfers/${photoId}/${transferToken}.json).
 * Enforces employee ownership, size limits, full-envelope idempotency, and atomic overwrite prevention
 * without relying on single-isolate in-memory locks.
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

  const envelopeHash = await computePacketEnvelopeHash(packet);
  const transferToken = await computeTransferToken(claims.storeId, packet.photoId, envelopeHash);
  const targetKey = relayTransferKey(claims.storeId, packet.photoId, transferToken);
  const prefix = relayTransferPrefix(claims.storeId, packet.photoId);
  const reqKey = reuploadRequestKey(claims.storeId, packet.photoId);
  const now = Date.now();
  const expiresAt = Math.min(now + MAX_RELAY_TTL_MS, packet.expiresAt || now + MAX_RELAY_TTL_MS);

  // Check if Owner explicitly requested a re-upload for this photo
  const reuploadReqObj = await bucket.get(reqKey);
  const hasReuploadRequest = !!reuploadReqObj;

  // 4. Check existing transfers under this photoId before write
  if (typeof bucket.list === 'function') {
    const listRes = await bucket.list({ prefix, limit: 10, include: ['customMetadata'] });
    const existingTransfers = listRes.objects || [];

    for (const obj of existingTransfers) {
      if (obj.key === targetKey) {
        // True idempotent retry: exact same transfer version already in transit
        return {
          success: true,
          photoId: packet.photoId,
          expiresAt,
          transferToken,
          idempotent: true,
        };
      }

      // Existing transfer with a different token/envelope
      if (!hasReuploadRequest) {
        const expMeta = obj.customMetadata?.expiresAt;
        const isExpired = expMeta ? Number(expMeta) < now : false;
        if (!isExpired) {
          // Reject overwrite: different ciphertext/envelope without explicit Owner reupload request
          throw new AccessError('Foto bukti dengan ID ini sudah ada dan tidak dapat diganti.', 409, 'photo_exists');
        }
      }
    }
  } else {
    const directObj = await bucket.get(targetKey);
    if (directObj) {
      return {
        success: true,
        photoId: packet.photoId,
        expiresAt,
        transferToken,
        idempotent: true,
      };
    }
  }

  // 5. Atomic conditional put: write this transfer version first before pruning old versions
  const payloadWithExpiry = { ...packet, storeId: claims.storeId, expiresAt, envelopeHash, transferToken };
  const putResult = await bucket.put(targetKey, JSON.stringify(payloadWithExpiry), {
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

  if (putResult === null) {
    // Conditional write blocked because targetKey already exists -> idempotent
    return {
      success: true,
      photoId: packet.photoId,
      expiresAt,
      transferToken,
      idempotent: true,
    };
  }

  // 6. Post-write deterministic convergence across isolated Workers:
  // Ensure only one canonical active transfer version remains under prefix.
  let finalToken = transferToken;
  if (typeof bucket.list === 'function') {
    const postList = await bucket.list({ prefix, limit: 10, include: ['customMetadata'] });
    const activeObjects = (postList.objects || []).filter(obj => {
      const expMeta = obj.customMetadata?.expiresAt;
      const isExpired = expMeta ? Number(expMeta) < now : false;
      if (isExpired && obj.key !== targetKey) {
        bucket.delete(obj.key).catch(() => {});
        return false;
      }
      return true;
    });

    if (activeObjects.length > 1) {
      if (!hasReuploadRequest) {
        // Concurrent initial uploads without reupload request: canonical first writer wins (uploadedAt ASC, key ASC)
        activeObjects.sort((a, b) => {
          const timeA = Number(a.customMetadata?.uploadedAt || 0);
          const timeB = Number(b.customMetadata?.uploadedAt || 0);
          if (timeA !== timeB) return timeA - timeB;
          return a.key.localeCompare(b.key);
        });
        const winner = activeObjects[0];
        if (winner.key !== targetKey) {
          await bucket.delete(targetKey).catch(() => {});
          throw new AccessError('Foto bukti dengan ID ini sudah ada dan tidak dapat diganti.', 409, 'photo_exists');
        }
        for (const loser of activeObjects.slice(1)) {
          await bucket.delete(loser.key).catch(() => {});
        }
      } else {
        // Concurrent reuploads: canonical latest transfer wins deterministically (uploadedAt DESC, key DESC)
        activeObjects.sort((a, b) => {
          const timeA = Number(a.customMetadata?.uploadedAt || 0);
          const timeB = Number(b.customMetadata?.uploadedAt || 0);
          if (timeB !== timeA) return timeB - timeA;
          return b.key.localeCompare(a.key);
        });
        const winner = activeObjects[0];
        const keyToken = winner.key.slice(prefix.length).replace(/\.json$/, '');
        finalToken = winner.customMetadata?.transferToken || keyToken || transferToken;
        for (const loser of activeObjects.slice(1)) {
          await bucket.delete(loser.key).catch(() => {});
        }
      }
    }
  }

  // 7. Clean up fulfilled reupload request
  if (hasReuploadRequest) {
    await bucket.delete(reqKey).catch(() => {});
  }

  return { success: true, photoId: packet.photoId, expiresAt, transferToken: finalToken };
}

/**
 * Pulls the latest encrypted attendance photo from R2 transit storage.
 * Requires Owner role, selects the newest active transfer, and performs programmatic TTL verification.
 */
export async function pullPhotoFromRelayR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims,
  photoId: string
): Promise<{ found: boolean; expired?: boolean; packet?: E2eePhotoPacket; transferToken?: string; envelopeHash?: string }> {
  requireOwner(claims);
  const prefix = relayTransferPrefix(claims.storeId, photoId);

  let targetKey: string | null = null;
  let targetMeta: Record<string, string> | undefined;

  if (typeof bucket.list === 'function') {
    const listRes = await bucket.list({ prefix, limit: 10, include: ['customMetadata'] });
    const objects = listRes.objects || [];
    if (objects.length === 0) {
      return { found: false };
    }
    // Pick the latest transfer deterministically by (uploadedAt DESC, key DESC)
    objects.sort((a, b) => {
      const timeA = Number(a.customMetadata?.uploadedAt || 0);
      const timeB = Number(b.customMetadata?.uploadedAt || 0);
      if (timeB !== timeA) return timeB - timeA;
      return b.key.localeCompare(a.key);
    });
    targetKey = objects[0].key;
    targetMeta = objects[0].customMetadata;
  } else {
    return { found: false };
  }

  const obj = await bucket.get(targetKey);
  if (!obj) {
    return { found: false };
  }

  const content = await obj.text();
  let packet: E2eePhotoPacket;
  try {
    packet = JSON.parse(content);
  } catch {
    await bucket.delete(targetKey).catch(() => {});
    return { found: false };
  }

  // Programmatic TTL expiration check (do not rely solely on delayed R2 background lifecycle)
  if (Date.now() > packet.expiresAt) {
    await bucket.delete(targetKey).catch(() => {});
    return { found: false, expired: true };
  }

  const transferToken = obj.customMetadata?.transferToken || targetMeta?.transferToken;
  const envelopeHash = obj.customMetadata?.envelopeHash || targetMeta?.envelopeHash;

  return { found: true, packet, transferToken, envelopeHash };
}

/**
 * Idempotently deletes an encrypted attendance photo from R2 after Owner verifies checksum and integrity.
 * Strictly targets relay/${storeId}/transfers/${photoId}/${transferToken}.json.
 * Deleting an older transfer version can NEVER delete a newer concurrent re-upload,
 * ensuring complete safety across separate Worker isolates without memory locks.
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
  if (!data.transferToken || typeof data.transferToken !== 'string' || !/^[a-f0-9]{64}$/i.test(data.transferToken)) {
    throw new AccessError('Token transfer wajib disertakan untuk konfirmasi penerimaan foto.', 400);
  }

  const targetKey = relayTransferKey(claims.storeId, data.photoId, data.transferToken);
  const prefix = relayTransferPrefix(claims.storeId, data.photoId);

  const existing = await bucket.get(targetKey);
  if (!existing) {
    // If the specific transfer does not exist, check if another transfer currently exists under this photoId
    if (typeof bucket.list === 'function') {
      const listRes = await bucket.list({ prefix, limit: 10 });
      const currentTransfers = listRes.objects || [];
      if (currentTransfers.length > 0) {
        // A transfer exists, but not with this token! Owner is attempting to ACK a stale or replaced transfer
        throw new AccessError('Token transfer foto sudah kedaluwarsa atau digantikan transfer baru.', 409, 'stale_transfer');
      }
    }
    // No transfers exist -> already deleted or expired
    return { success: true, deleted: true, alreadyDeleted: true };
  }

  const content = await existing.text();
  try {
    const existingToken = existing.customMetadata?.transferToken;
    if (existingToken && data.transferToken !== existingToken) {
      throw new AccessError('Token transfer foto sudah kedaluwarsa atau digantikan transfer baru.', 409, 'stale_transfer');
    }

    if (data.envelopeHash && existing.customMetadata?.envelopeHash && data.envelopeHash !== existing.customMetadata.envelopeHash) {
      throw new AccessError('Hash paket foto tidak sesuai dengan transfer yang sedang aktif.', 409, 'stale_transfer');
    }

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
  } catch (e) {
    if (e instanceof AccessError) throw e;
  }

  // Delete ONLY this specific transfer version
  await bucket.delete(targetKey);
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

  // 1. Clear any stale transfers under this photoId so fresh re-upload is unblocked
  const prefix = relayTransferPrefix(claims.storeId, data.photoId);
  if (typeof bucket.list === 'function') {
    const listRes = await bucket.list({ prefix, limit: 10 });
    for (const obj of listRes.objects || []) {
      await bucket.delete(obj.key).catch(() => {});
    }
  }

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
 * Lists all active re-upload requests targeted for the calling employee.
 * Uses prefix listing if supported by the R2 bucket.
 */
export async function listPendingReuploadRequestsR2(
  bucket: RelayR2Bucket,
  claims: AccessClaims
): Promise<{ success: boolean; requests: PhotoReuploadRequest[] }> {
  if (!claims.storeId || !claims.employeeId) {
    throw new AccessError('Akses tidak sah.', 401);
  }

  const prefix = `requests/${claims.storeId}/`;
  const requests: PhotoReuploadRequest[] = [];

  if (typeof bucket.list === 'function') {
    const listRes = await bucket.list({ prefix, limit: 100 });
    for (const item of listRes.objects || []) {
      const obj = await bucket.get(item.key);
      if (obj) {
        try {
          const req = JSON.parse(await obj.text()) as PhotoReuploadRequest;
          if (req.employeeId === claims.employeeId) {
            requests.push(req);
          }
        } catch {}
      }
    }
  }

  return { success: true, requests };
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
): Promise<{ success: boolean; fingerprint: string; keyEpoch: number; rotatedAt: number; idempotent?: boolean }> {
  requireOwner(claims);
  if (!data.publicKeyJwk || typeof data.publicKeyJwk !== 'object') {
    throw new AccessError('Kunci publik tidak valid.', 400);
  }
  if (data.publicKeyJwk.kty !== 'EC' || data.publicKeyJwk.crv !== 'P-256') {
    throw new AccessError('Format kunci ECDH P-256 tidak sesuai.', 400);
  }

  // Compute SHA-256 fingerprint of canonical JWK
  const canonicalJwkStr = JSON.stringify({
    crv: data.publicKeyJwk.crv,
    kty: data.publicKeyJwk.kty,
    x: data.publicKeyJwk.x,
    y: data.publicKeyJwk.y,
  });
  const fingerprint = await sha256HexStr(new TextEncoder().encode(canonicalJwkStr));

  const key = ownerKeyObjectKey(claims.storeId);
  const existing = await bucket.get(key);
  let currentEpoch = 0;
  let existingDeviceEpoch = 0;

  if (existing) {
    let existingData: OwnerE2eeIdentity | null = null;
    try {
      existingData = JSON.parse(await existing.text()) as OwnerE2eeIdentity;
      if (typeof existingData.keyEpoch === 'number') {
        currentEpoch = existingData.keyEpoch;
      }
      if (typeof existingData.deviceEpoch === 'number') {
        existingDeviceEpoch = existingData.deviceEpoch;
      }
    } catch {}

    // 1. Idempotent re-registration: exact same key! Do NOT increment keyEpoch
    if (existingData && existingData.fingerprint === fingerprint) {
      return {
        success: true,
        fingerprint: existingData.fingerprint,
        keyEpoch: existingData.keyEpoch,
        rotatedAt: existingData.rotatedAt,
        idempotent: true,
      };
    }

    // 2. Genuine key rotation: client specified expectedCurrentEpoch must match
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
