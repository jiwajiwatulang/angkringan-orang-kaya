import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { db } from '../src/lib/dexie';
import {
  generateOwnerE2eeKeyPair,
  exportPublicKeyJwk,
  importOwnerPublicKey,
  encryptPhotoForOwner,
  decryptPhotoAsOwner,
  computeSha256Hex,
  processAndAckIncomingPhoto,
  type E2eePhotoPacket,
} from '../src/lib/crypto/e2eePhoto';
import {
  pushPhotoToRelayR2,
  pullPhotoFromRelayR2,
  ackPhotoFromRelayR2,
  requestPhotoReuploadR2,
  checkPhotoReuploadR2,
  setOwnerE2eeKeyR2,
  getOwnerE2eeKeyR2,
  type RelayR2Bucket,
  MAX_PHOTO_CIPHERTEXT_BYTES,
} from '../src/lib/server/photoRelayR2';
import type { AccessClaims } from '../src/lib/multidevice/protocol';
import {
  recordAttendanceWithPhotoAtomic,
  getAttendancePhoto,
  reconcileAttendanceConsistency,
  sha256Hex,
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

function mockClaims(role: 'owner' | 'cashier', storeId = 'store-test-12345678', employeeId = 'emp-kasir-001'): AccessClaims {
  return {
    version: 1,
    storeId,
    deviceId: role === 'owner' ? 'dev-owner-001' : 'dev-cashier-001',
    deviceKey: 'key-test-device-001',
    role,
    deviceEpoch: 1,
    employeeId: role === 'cashier' ? employeeId : undefined,
    issuedAt: Date.now() - 1000,
    expiresAt: Date.now() + 3600000,
  };
}

test('E2EE: photo encrypted with Owner public key is successfully decrypted only by Owner private key (Blob & Uint8Array)', async () => {
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPublicJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  const importedOwnerPub = await importOwnerPublicKey(ownerPublicJwk);

  const rawBytes = new TextEncoder().encode('PHOTO_BYTE_DATA_MOCK_JPEG_12345');
  const rawBlob = new Blob([rawBytes], { type: 'image/jpeg' });

  // Test with Blob input
  const packet = await encryptPhotoForOwner(rawBlob, importedOwnerPub, {
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
  const cashierClaims = mockClaims('cashier', 'store-alpha-12345678', 'emp-alpha');
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

test('R2 Relay: push enforces employee session and strictly forbids cross-employee upload', async () => {
  const bucket = new MockR2Bucket();
  const cashierAClaims = mockClaims('cashier', 'store-12345678', 'emp-kasir-A');
  const ownerClaims = mockClaims('owner', 'store-12345678');
  const cashierNoEmpClaims: AccessClaims = {
    version: 1,
    storeId: 'store-12345678',
    deviceId: 'dev-cashier-no-emp',
    deviceKey: 'key-no-emp',
    role: 'cashier',
    deviceEpoch: 1,
    employeeId: undefined, // No employee active session
    issuedAt: Date.now() - 1000,
    expiresAt: Date.now() + 3600000,
  };

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packetForEmpB = await encryptPhotoForOwner(
    new TextEncoder().encode('PHOTO_FOR_B'),
    ownerPair.publicKey,
    { photoId: 'photo-b-001', operationId: 'op-b-001', employeeId: 'emp-kasir-B' }
  );

  // 1. Cashier A attempts to upload photo for Cashier B -> strictly rejected
  await assert.rejects(
    async () => {
      await pushPhotoToRelayR2(bucket, cashierAClaims, packetForEmpB);
    },
    /absensi milik sendiri/i
  );

  // 2. Cashier device without active employee session -> strictly rejected
  await assert.rejects(
    async () => {
      await pushPhotoToRelayR2(bucket, cashierNoEmpClaims, packetForEmpB);
    },
    /sesi kasir karyawan aktif/i
  );

  // 3. Owner role cannot push cashier attendance photos
  await assert.rejects(
    async () => {
      await pushPhotoToRelayR2(bucket, ownerClaims, packetForEmpB);
    },
    /sesi kasir karyawan aktif/i
  );
});

test('R2 Relay: prevents photo overwrite and enforces idempotency', async () => {
  const bucket = new MockR2Bucket();
  const cashierClaims = mockClaims('cashier', 'store-12345678', 'emp-101');
  const ownerPair = await generateOwnerE2eeKeyPair();

  const rawBytes1 = new TextEncoder().encode('ORIGINAL_PHOTO_1');
  const packet1 = await encryptPhotoForOwner(rawBytes1, ownerPair.publicKey, {
    photoId: 'photo-immutable-001',
    operationId: 'op-imm-001',
    employeeId: 'emp-101',
  });

  // 1. Initial push succeeds
  const res1 = await pushPhotoToRelayR2(bucket, cashierClaims, packet1);
  assert.equal(res1.success, true);

  // 2. Exact same upload again succeeds idempotently
  const resRetry = await pushPhotoToRelayR2(bucket, cashierClaims, packet1);
  assert.equal(resRetry.success, true);
  assert.equal(resRetry.idempotent, true);

  // 3. Attempt to overwrite with different photo content/checksum is rejected with 409
  const rawBytes2 = new TextEncoder().encode('MODIFIED_PHOTO_2');
  const packetTampered: E2eePhotoPacket = {
    ...packet1,
    checksum: await computeSha256Hex(rawBytes2),
    ciphertext: 'DIFFERENT_CIPHERTEXT_BASE64',
  };

  await assert.rejects(
    async () => {
      await pushPhotoToRelayR2(bucket, cashierClaims, packetTampered);
    },
    /sudah ada dan tidak dapat diganti/i
  );
});

test('R2 Relay: Owner ACK deletes object immediately, protects against fake/mismatched ACK', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-12345678');
  const cashierClaims = mockClaims('cashier', 'store-12345678', 'emp-ack');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('PHOTO_FOR_STRICT_ACK'),
    ownerPair.publicKey,
    { photoId: 'photo-strict-ack-01', operationId: 'op-ack-01', employeeId: 'emp-ack' }
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  // 1. Fake ACK with mismatched checksum is rejected
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(
        bucket,
        ownerClaims,
        'photo-strict-ack-01',
        '0000000000000000000000000000000000000000000000000000000000000000'
      );
    },
    /Checksum foto tidak sesuai konfirmasi/i
  );

  // 2. Mismatched operationId in ACK is rejected
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(
        bucket,
        ownerClaims,
        'photo-strict-ack-01',
        packet.checksum,
        'op-wrong-id',
        'emp-ack'
      );
    },
    /ID operasi tidak sesuai konfirmasi/i
  );

  // 3. Mismatched employeeId in ACK is rejected
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(
        bucket,
        ownerClaims,
        'photo-strict-ack-01',
        packet.checksum,
        'op-ack-01',
        'emp-wrong-employee'
      );
    },
    /ID karyawan tidak sesuai konfirmasi/i
  );

  // 4. Non-owner cannot ACK
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(
        bucket,
        cashierClaims,
        'photo-strict-ack-01',
        packet.checksum
      );
    },
    /memerlukan akses pemilik/i
  );

  // 5. Authentic Owner ACK deletes object
  const ack = await ackPhotoFromRelayR2(
    bucket,
    ownerClaims,
    'photo-strict-ack-01',
    packet.checksum,
    'op-ack-01',
    'emp-ack'
  );
  assert.equal(ack.success, true);
  assert.equal(ack.deleted, true);
  assert.equal(bucket.size(), 0);

  // 6. Duplicate ACK is idempotent
  const dupAck = await ackPhotoFromRelayR2(
    bucket,
    ownerClaims,
    'photo-strict-ack-01',
    packet.checksum
  );
  assert.equal(dupAck.success, true);
});

test('R2 Relay: programmatic TTL expiry (24h) auto-deletes expired objects', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner');
  const cashierClaims = mockClaims('cashier');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('MOCK_PHOTO_EXPIRE'),
    ownerPair.publicKey,
    { photoId: 'photo-expired-01', operationId: 'op-exp', employeeId: 'emp-kasir-001', ttlMs: -1000 }
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  const pullRes = await pullPhotoFromRelayR2(bucket, ownerClaims, 'photo-expired-01');
  assert.equal(pullRes.found, false);
  assert.equal(pullRes.expired, true);
  assert.equal(bucket.size(), 0);
});

test('Owner E2EE Public Key: setting, fetching, rotation, and fingerprint verification', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-rot-1234');
  const cashierClaims = mockClaims('cashier', 'store-rot-1234');

  const keypair1 = await generateOwnerE2eeKeyPair();
  const pubJwk1 = await exportPublicKeyJwk(keypair1.publicKey);

  // 1. Non-owner cannot register owner key
  await assert.rejects(
    async () => {
      await setOwnerE2eeKeyR2(bucket, cashierClaims, { publicKeyJwk: pubJwk1 });
    },
    /memerlukan akses pemilik/i
  );

  // 2. Owner registers initial public key
  const setRes1 = await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: pubJwk1 });
  assert.equal(setRes1.success, true);
  assert.equal(setRes1.keyEpoch, 1);
  assert.equal(setRes1.fingerprint.length, 64);

  // 3. Cashier fetches registered key
  const getRes1 = await getOwnerE2eeKeyR2(bucket, cashierClaims);
  assert.equal(getRes1.found, true);
  assert.equal(getRes1.identity?.fingerprint, setRes1.fingerprint);
  assert.equal(getRes1.identity?.keyEpoch, 1);

  // 4. Owner rotates key (e.g. device replacement)
  const keypair2 = await generateOwnerE2eeKeyPair();
  const pubJwk2 = await exportPublicKeyJwk(keypair2.publicKey);
  const setRes2 = await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: pubJwk2 });
  assert.equal(setRes2.success, true);
  assert.equal(setRes2.keyEpoch, 2); // Automatically bumped epoch
  assert.notEqual(setRes2.fingerprint, setRes1.fingerprint);

  // 5. Cashier fetches updated rotated key
  const getRes2 = await getOwnerE2eeKeyR2(bucket, cashierClaims);
  assert.equal(getRes2.identity?.keyEpoch, 2);
  assert.equal(getRes2.identity?.fingerprint, setRes2.fingerprint);
});

test('Re-upload mechanism: Owner requests re-upload, employee queries request, re-uploads, request cleared', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-reup-1234');
  const cashierClaims = mockClaims('cashier', 'store-reup-1234', 'emp-target');
  const otherCashierClaims = mockClaims('cashier', 'store-reup-1234', 'emp-other');

  const oldOwnerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('STALE_PHOTO_NEEDS_REUPLOAD'),
    oldOwnerPair.publicKey,
    { photoId: 'photo-reup-001', operationId: 'op-reup-001', employeeId: 'emp-target' }
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);

  // 1. Owner requests re-upload with new key
  const newOwnerPair = await generateOwnerE2eeKeyPair();
  const newOwnerPubJwk = await exportPublicKeyJwk(newOwnerPair.publicKey);

  const reqRes = await requestPhotoReuploadR2(bucket, ownerClaims, {
    photoId: 'photo-reup-001',
    employeeId: 'emp-target',
    operationId: 'op-reup-001',
    reason: 'Owner device replaced',
    ownerPublicKeyJwk: newOwnerPubJwk,
  });
  assert.equal(reqRes.success, true);

  // 2. Unrelated employee cannot see target employee's reupload request
  const checkOther = await checkPhotoReuploadR2(bucket, otherCashierClaims, 'photo-reup-001');
  assert.equal(checkOther.hasRequest, false);

  // 3. Targeted employee device queries and receives re-upload request
  const checkTarget = await checkPhotoReuploadR2(bucket, cashierClaims, 'photo-reup-001');
  assert.equal(checkTarget.hasRequest, true);
  assert.equal(checkTarget.request?.reason, 'Owner device replaced');
  assert.ok(checkTarget.request?.ownerPublicKeyJwk);

  // 4. Employee re-encrypts with new owner key and uploads
  const newOwnerPub = await importOwnerPublicKey(checkTarget.request!.ownerPublicKeyJwk!);
  const reuploadPacket = await encryptPhotoForOwner(
    new TextEncoder().encode('STALE_PHOTO_NEEDS_REUPLOAD'),
    newOwnerPub,
    { photoId: 'photo-reup-001', operationId: 'op-reup-001', employeeId: 'emp-target' }
  );

  const reuploadPush = await pushPhotoToRelayR2(bucket, cashierClaims, reuploadPacket);
  assert.equal(reuploadPush.success, true);

  // 5. Reupload request was automatically cleaned up upon successful push
  const checkAfter = await checkPhotoReuploadR2(bucket, cashierClaims, 'photo-reup-001');
  assert.equal(checkAfter.hasRequest, false);
});

test('True Atomicity & IndexedDB Storage: transaction aborts completely on failure', async () => {
  const photoId = 'photo-atomic-strict-001';
  const rawBytes = new TextEncoder().encode('PHOTO_RAW_BYTES');
  const photoBlob = new Blob([rawBytes], { type: 'image/jpeg' });
  const checksum = await sha256Hex(photoBlob);

  const failingSaveOp = async () => {
    throw new Error('Database operational constraint failure simulation');
  };

  await assert.rejects(
    async () => {
      await recordAttendanceWithPhotoAtomic(failingSaveOp, {
        kind: 'attendance.in',
        employeeId: 'emp-atomic-1',
        employeeName: 'Budi Test',
        photo: {
          photoId,
          blob: photoBlob,
          checksum,
        },
      });
    },
    /Database operational constraint failure simulation/
  );

  // Verify that the native Dexie transaction aborted: neither photo nor operation was persisted
  const photoRecord = await getAttendancePhoto(photoId);
  assert.equal(photoRecord, undefined);
});

test('Crash & Interrupted Session: reconcileAttendanceConsistency cleans up orphaned photos', async () => {
  const orphanPhotoId = 'photo-orphan-from-crash';
  const now = Date.now();

  // Simulate an interrupted photo written > 15 minutes ago with no operation record
  await db.table('attendancePhotos').put({
    id: orphanPhotoId,
    operationId: 'missing-operation-id',
    employeeId: 'emp-crash',
    employeeName: 'Kasir Crash',
    blob: new Blob(['bytes'], { type: 'image/jpeg' }),
    checksum: 'mock-hash',
    createdAt: new Date(now - 15 * 60 * 1000).toISOString(),
    status: 'lokal',
  });

  const before = await getAttendancePhoto(orphanPhotoId);
  assert.ok(before);

  const res = await reconcileAttendanceConsistency(db);
  assert.equal(res.cleanedPhotos >= 1, true);

  const after = await getAttendancePhoto(orphanPhotoId);
  assert.equal(after, undefined);
});

test('End-to-End Lifecycle: Cashier photo -> E2EE encrypt -> R2 Push -> Owner pull -> Decrypt -> IndexedDB Blob -> ACK -> Purge', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-e2e-1234');
  const cashierClaims = mockClaims('cashier', 'store-e2e-1234', 'emp-e2e-kasir');

  // 1. Owner registers E2EE key
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPubJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: ownerPubJwk });

  // 2. Cashier captures photo as raw Blob
  const originalPhotoData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
  const originalBlob = new Blob([originalPhotoData], { type: 'image/jpeg' });
  const photoChecksum = await sha256Hex(originalBlob);
  const photoId = 'photo-e2e-cycle-001';
  const operationId = 'op-e2e-cycle-001';

  // 3. Cashier fetches Owner public key and encrypts photo
  const ownerKeyInfo = await getOwnerE2eeKeyR2(bucket, cashierClaims);
  assert.equal(ownerKeyInfo.found, true);
  const ownerCryptoPub = await importOwnerPublicKey(ownerKeyInfo.identity!.publicKeyJwk);

  const encryptedPacket = await encryptPhotoForOwner(originalBlob, ownerCryptoPub, {
    storeId: cashierClaims.storeId,
    photoId,
    operationId,
    employeeId: 'emp-e2e-kasir',
  });

  // 4. Cashier uploads encrypted packet to R2 transit
  const pushResult = await pushPhotoToRelayR2(bucket, cashierClaims, encryptedPacket);
  assert.equal(pushResult.success, true);
  assert.equal(bucket.size(), 2); // 1 owner key + 1 transit photo

  // 5. Owner processes incoming photo: pulls, decrypts, saves to Owner IndexedDB as Blob, and ACKs
  const processResult = await processAndAckIncomingPhoto(
    bucket,
    ownerClaims,
    photoId,
    ownerPair.privateKey,
    db
  );

  assert.equal(processResult.success, true);
  assert.equal(processResult.photoId, photoId);
  assert.equal(processResult.checksum, photoChecksum);

  // 6. Verify photo was persisted in Owner's IndexedDB as a native Blob
  const savedOwnerPhoto = await getAttendancePhoto(photoId);
  assert.ok(savedOwnerPhoto);
  assert.equal(savedOwnerPhoto?.id, photoId);
  assert.equal(savedOwnerPhoto?.status, 'tersimpan');
  assert.equal(savedOwnerPhoto?.checksum, photoChecksum);
  assert.ok(savedOwnerPhoto?.blob instanceof Blob);

  // 7. Verify buffer in R2 was completely purged (only owner-e2ee-key remains)
  assert.equal(bucket.size(), 1);
  const pullAfterAck = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(pullAfterAck.found, false);
});
