import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import {
  generateOwnerE2eeKeyPair,
  exportPublicKeyJwk,
  importOwnerPublicKey,
  encryptPhotoForOwner,
  decryptPhotoAsOwner,
  computeSha256Hex,
} from '../src/lib/crypto/e2eePhoto';
import {
  pushPhotoToRelayR2,
  pullPhotoFromRelayR2,
  ackPhotoFromRelayR2,
  requestPhotoReuploadR2,
  type RelayR2Bucket,
  MAX_PHOTO_CIPHERTEXT_BYTES,
} from '../src/lib/server/photoRelayR2';
import type { AccessClaims } from '../src/lib/multidevice/protocol';
import {
  recordAttendanceWithPhotoAtomic,
  getAttendancePhoto,
  saveAttendancePhoto,
} from '../src/lib/attendancePhoto';

/** In-memory mock implementing RelayR2Bucket for isolated unit tests */
class MockR2Bucket implements RelayR2Bucket {
  private storage = new Map<string, { value: string; customMetadata?: Record<string, string> }>();

  async get(key: string) {
    const item = this.storage.get(key);
    if (!item) return null;
    return {
      text: async () => item.value,
      customMetadata: item.customMetadata,
    };
  }

  async put(key: string, value: string | ArrayBuffer | Uint8Array, options?: { customMetadata?: Record<string, string> }) {
    const strVal = typeof value === 'string' ? value : new TextDecoder().decode(value as ArrayBuffer);
    this.storage.set(key, { value: strVal, customMetadata: options?.customMetadata });
  }

  async delete(keys: string | string[]) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) this.storage.delete(k);
  }

  size() {
    return this.storage.size;
  }
}

function mockClaims(role: 'owner' | 'cashier', storeId = 'store-test-12345678'): AccessClaims {
  return {
    version: 1,
    storeId,
    deviceId: role === 'owner' ? 'dev-owner-001' : 'dev-cashier-001',
    deviceKey: 'key-test-device-001',
    role,
    deviceEpoch: 1,
    employeeId: role === 'cashier' ? 'emp-kasir-001' : undefined,
    issuedAt: Date.now() - 1000,
    expiresAt: Date.now() + 3600000,
  };
}

test('E2EE: photo encrypted with Owner public key is successfully decrypted only by Owner private key', async () => {
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPublicJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  const importedOwnerPub = await importOwnerPublicKey(ownerPublicJwk);

  const rawBytes = new TextEncoder().encode('PHOTO_BYTE_DATA_MOCK_JPEG_12345');
  const packet = await encryptPhotoForOwner(rawBytes, importedOwnerPub, {
    photoId: 'photo-001',
    operationId: 'op-001',
    employeeId: 'emp-001',
  });

  assert.equal(packet.photoId, 'photo-001');
  assert.equal(packet.checksum, await computeSha256Hex(rawBytes));
  assert.ok(packet.ciphertext.length > 0);
  assert.ok(packet.iv.length > 0);

  // Decrypt using Owner private key
  const decrypted = await decryptPhotoAsOwner(packet, ownerPair.privateKey);
  assert.equal(new TextDecoder().decode(decrypted.photoBytes), 'PHOTO_BYTE_DATA_MOCK_JPEG_12345');
  assert.equal(decrypted.checksum, packet.checksum);
});

test('E2EE: tampering with ciphertext or wrong owner key fails decryption', async () => {
  const ownerA = await generateOwnerE2eeKeyPair();
  const ownerB = await generateOwnerE2eeKeyPair();
  const ownerAPub = await importOwnerPublicKey(await exportPublicKeyJwk(ownerA.publicKey));

  const rawBytes = new TextEncoder().encode('SECRET_EVIDENCE_PHOTO');
  const packet = await encryptPhotoForOwner(rawBytes, ownerAPub, {
    photoId: 'photo-tamper',
    operationId: 'op-tamper',
    employeeId: 'emp-tamper',
  });

  // 1. Owner B cannot decrypt photo encrypted for Owner A
  await assert.rejects(
    async () => {
      await decryptPhotoAsOwner(packet, ownerB.privateKey);
    },
    /operation|cipher|tag|decrypt/i
  );

  // 2. Tampered ciphertext fails authentication tag check
  const tamperedPacket = {
    ...packet,
    ciphertext: packet.ciphertext.slice(0, -4) + 'AAAA',
  };
  await assert.rejects(
    async () => {
      await decryptPhotoAsOwner(tamperedPacket, ownerA.privateKey);
    },
    /operation|cipher|tag|decrypt/i
  );
});

test('R2 Relay: push, size limit enforcement, cross-tenant isolation', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-alpha-12345678');
  const cashierClaims = mockClaims('cashier', 'store-alpha-12345678');
  const foreignOwnerClaims = mockClaims('owner', 'store-beta-99999999');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('MOCK_PHOTO_STORE_ALPHA'),
    ownerPair.publicKey,
    { photoId: 'photo-alpha-001', operationId: 'op-alpha-001', employeeId: 'emp-alpha' }
  );

  // 1. Push photo to relay
  const pushRes = await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(pushRes.success, true);
  assert.equal(pushRes.photoId, 'photo-alpha-001');

  // 2. Reject payload exceeding MAX_PHOTO_CIPHERTEXT_BYTES (512 KB)
  const oversizedPacket = {
    ...packet,
    photoId: 'photo-oversized',
    ciphertext: 'X'.repeat(MAX_PHOTO_CIPHERTEXT_BYTES + 100),
  };
  await assert.rejects(
    async () => {
      await pushPhotoToRelayR2(bucket, cashierClaims, oversizedPacket);
    },
    /413|melebihi batas/i
  );

  // 3. Foreign store owner cannot pull photo from Store Alpha
  const foreignPull = await pullPhotoFromRelayR2(bucket, foreignOwnerClaims, 'photo-alpha-001');
  assert.equal(foreignPull.found, false);

  // 4. Cashier cannot pull photos (requires Owner)
  await assert.rejects(
    async () => {
      await pullPhotoFromRelayR2(bucket, cashierClaims, 'photo-alpha-001');
    },
    /pemilik|akses/i
  );

  // 5. Authentic store owner successfully pulls photo
  const authenticPull = await pullPhotoFromRelayR2(bucket, ownerClaims, 'photo-alpha-001');
  assert.equal(authenticPull.found, true);
  assert.equal(authenticPull.packet?.photoId, 'photo-alpha-001');
});

test('R2 Relay: programmatic TTL expiry (24h) auto-deletes expired objects', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner');
  const cashierClaims = mockClaims('cashier');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('MOCK_PHOTO_EXPIRE'),
    ownerPair.publicKey,
    { photoId: 'photo-expired-01', operationId: 'op-exp', employeeId: 'emp-exp', ttlMs: -1000 } // already expired
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  // Pulling an expired object returns expired: true and deletes the object
  const pullRes = await pullPhotoFromRelayR2(bucket, ownerClaims, 'photo-expired-01');
  assert.equal(pullRes.found, false);
  assert.equal(pullRes.expired, true);
  assert.equal(bucket.size(), 0); // cleanly deleted from R2
});

test('R2 Relay: Owner ACK deletes object immediately and is idempotent', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner');
  const cashierClaims = mockClaims('cashier');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('MOCK_PHOTO_FOR_ACK'),
    ownerPair.publicKey,
    { photoId: 'photo-ack-01', operationId: 'op-ack', employeeId: 'emp-ack' }
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  // Owner ACK with matching checksum
  const ack1 = await ackPhotoFromRelayR2(bucket, ownerClaims, 'photo-ack-01', packet.checksum);
  assert.equal(ack1.success, true);
  assert.equal(ack1.deleted, true);
  assert.equal(bucket.size(), 0); // physically purged from R2

  // Subsequent duplicate ACK is idempotent
  const ack2 = await ackPhotoFromRelayR2(bucket, ownerClaims, 'photo-ack-01', packet.checksum);
  assert.equal(ack2.success, true);
  assert.equal(ack2.deleted, true);
});

test('Owner Device Replacement / Key Rotation and re-upload request', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner');
  const cashierClaims = mockClaims('cashier');

  const oldOwnerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('PHOTO_BEFORE_OWNER_LOST_DEVICE'),
    oldOwnerPair.publicKey,
    { photoId: 'photo-lost-owner', operationId: 'op-lost', employeeId: 'emp-1' }
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  // Owner replaces device -> registers new key -> requests re-upload for stale photo
  const reupload = await requestPhotoReuploadR2(
    bucket,
    ownerClaims,
    'photo-lost-owner',
    'Owner device replaced with new key'
  );
  assert.equal(reupload.success, true);
  assert.equal(reupload.requested, true);
  assert.equal(bucket.size(), 0); // stale buffer purged to unblock fresh upload
});

test('Atomicity & Rollback: failure during attendance operation rolls back local photo', async () => {
  const photoId = 'photo-atomic-fail-001';

  let operationAttempted = false;
  const failingSaveOp = async () => {
    operationAttempted = true;
    throw new Error('Simulasi kegagalan database operasional');
  };

  await assert.rejects(
    async () => {
      await recordAttendanceWithPhotoAtomic(failingSaveOp, {
        kind: 'attendance.in',
        employeeId: 'emp-atomic',
        employeeName: 'Budi Atomic',
        photo: {
          photoId,
          dataUrl: 'data:image/jpeg;base64,mock',
          checksum: 'mock-checksum',
        },
      });
    },
    /Simulasi kegagalan database operasional/
  );

  assert.equal(operationAttempted, true);

  // Verify local photo was rolled back from IndexedDB (no dangling photo)
  const savedPhoto = await getAttendancePhoto(photoId);
  assert.equal(savedPhoto, undefined);
});
