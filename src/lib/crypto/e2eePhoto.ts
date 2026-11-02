/**
 * End-to-End Encryption (E2EE) for SakuNota Attendance Photos.
 * Uses Web Crypto API: ECDH (P-256) for key agreement + AES-GCM (256-bit) for payload encryption.
 * The Cloudflare Worker / R2 relay only holds ciphertext and cannot decrypt photo bytes.
 */

import type { AccessClaims } from '../multidevice/protocol';
import {
  pullPhotoFromRelayR2,
  ackPhotoFromRelayR2,
  type RelayR2Bucket,
} from '../server/photoRelayR2';

export interface E2eePhotoPacket {
  version: 1;
  storeId?: string;
  photoId: string;
  operationId: string;
  employeeId: string;
  ephemeralPublicKeyJwk: JsonWebKey;
  iv: string; // Base64 12-byte IV
  ciphertext: string; // Base64 AES-GCM ciphertext
  checksum: string; // Hex SHA-256 of unencrypted photo bytes
  capturedAt: number;
  expiresAt: number;
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function fromBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Generates a dedicated ECDH P-256 keypair for the Owner device. */
export async function generateOwnerE2eeKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // exportable for local device storage
    ['deriveKey', 'deriveBits']
  );
}

export async function exportPublicKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function exportPrivateKeyJwk(key: CryptoKey): Promise<JsonWebKey> {
  return crypto.subtle.exportKey('jwk', key);
}

export async function importOwnerPublicKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

export async function importOwnerPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

/**
 * Computes SHA-256 checksum for byte integrity validation.
 */
export async function computeSha256Hex(bytes: Uint8Array | ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Encrypts an attendance photo on the employee's device using the Owner's public key.
 * 1. Generates an ephemeral ECDH keypair.
 * 2. Derives an AES-GCM 256-bit key using ECDH key agreement.
 * 3. Encrypts photo bytes with AES-GCM using a random 12-byte IV.
 * 4. Computes SHA-256 of unencrypted bytes.
 */
export async function encryptPhotoForOwner(
  photoInput: Uint8Array | ArrayBuffer | Blob,
  ownerPublicKey: CryptoKey,
  metadata: { storeId?: string; photoId: string; operationId: string; employeeId: string; ttlMs?: number }
): Promise<E2eePhotoPacket> {
  let photoBytes: Uint8Array;
  if ('arrayBuffer' in photoInput && typeof (photoInput as Blob).arrayBuffer === 'function') {
    photoBytes = new Uint8Array(await (photoInput as Blob).arrayBuffer());
  } else if (photoInput instanceof ArrayBuffer) {
    photoBytes = new Uint8Array(photoInput);
  } else {
    photoBytes = photoInput as Uint8Array;
  }

  const checksum = await computeSha256Hex(photoBytes);
  const ephemeralPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey']
  );

  const sharedAesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ownerPublicKey },
    ephemeralPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    sharedAesKey,
    photoBytes as BufferSource
  );

  const ephemeralPublicKeyJwk = await crypto.subtle.exportKey('jwk', ephemeralPair.publicKey);
  const now = Date.now();
  const ttl = metadata.ttlMs || 24 * 60 * 60 * 1000;

  return {
    version: 1,
    storeId: metadata.storeId,
    photoId: metadata.photoId,
    operationId: metadata.operationId,
    employeeId: metadata.employeeId,
    ephemeralPublicKeyJwk,
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(encryptedBuffer)),
    checksum,
    capturedAt: now,
    expiresAt: now + ttl,
  };
}

/**
 * Decrypts an attendance photo packet on the Owner's device using the Owner's private key.
 * 1. Imports ephemeral public key from packet.
 * 2. Derives matching AES-GCM 256-bit key using ECDH key agreement.
 * 3. Decrypts ciphertext and verifies SHA-256 checksum.
 */
export async function decryptPhotoAsOwner(
  packet: E2eePhotoPacket,
  ownerPrivateKey: CryptoKey
): Promise<{ photoBytes: Uint8Array; checksum: string }> {
  const ephemeralPublicKey = await crypto.subtle.importKey(
    'jwk',
    packet.ephemeralPublicKeyJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedAesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPublicKey },
    ownerPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  const iv = fromBase64(packet.iv);
  const ciphertextBytes = fromBase64(packet.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    sharedAesKey,
    ciphertextBytes as BufferSource
  );

  const photoBytes = new Uint8Array(decryptedBuffer);
  const computedChecksum = await computeSha256Hex(photoBytes);

  if (computedChecksum.toLowerCase() !== packet.checksum.toLowerCase()) {
    throw new Error('Integritas foto tidak valid: checksum tidak cocok.');
  }

  return { photoBytes, checksum: computedChecksum };
}

/**
 * Helper for Owner device: pulls, decrypts, validates integrity, persists to local IndexedDB as Blob,
 * and ONLY sends ACK after IndexedDB save succeeds.
 */
export async function processAndAckIncomingPhoto(
  bucket: RelayR2Bucket,
  ownerClaims: AccessClaims,
  photoId: string,
  ownerPrivateKey: CryptoKey,
  dexieDb?: any
): Promise<{ success: boolean; photoId?: string; checksum?: string; reason?: string }> {
  // 1. Pull from R2
  const pull = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  if (!pull.found || !pull.packet) {
    return { success: false, reason: pull.expired ? 'expired' : 'not_found' };
  }

  // 2. Decrypt and verify integrity
  const { photoBytes, checksum } = await decryptPhotoAsOwner(pull.packet, ownerPrivateKey);

  // 3. Save to local IndexedDB as native Blob
  if (dexieDb) {
    const blob = new Blob([photoBytes as unknown as BlobPart], { type: 'image/jpeg' });
    await dexieDb.table('attendancePhotos').put({
      id: pull.packet.photoId,
      operationId: pull.packet.operationId,
      employeeId: pull.packet.employeeId,
      employeeName: '',
      blob,
      checksum,
      createdAt: new Date(pull.packet.capturedAt).toISOString(),
      status: 'tersimpan',
    });
  }

  // 4. Send ACK ONLY after local save succeeds
  await ackPhotoFromRelayR2(
    bucket,
    ownerClaims,
    pull.packet.photoId,
    checksum,
    pull.packet.operationId,
    pull.packet.employeeId
  );

  return { success: true, photoId: pull.packet.photoId, checksum };
}
