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
  listPendingReuploadRequestsR2,
  withPhotoLock,
  relayObjectKey,
  relayTransferPrefix,
  setOwnerE2eeKeyR2,
  getOwnerE2eeKeyR2,
  type RelayR2Bucket,
  type RelayR2PutOptions,
  MAX_PHOTO_CIPHERTEXT_BYTES,
} from '../src/lib/server/photoRelayR2';
import type { AccessClaims } from '../src/lib/multidevice/protocol';
import {
  recordAttendanceWithPhotoAtomic,
  getAttendancePhoto,
  reconcileAttendanceConsistency,
  sha256Hex,
  syncPendingAttendancePhotos,
  pullAndPersistAttendancePhoto,
} from '../src/lib/attendancePhoto';
import { saveOperation } from '../src/lib/operationsApi';

/** In-memory mock implementing RelayR2Bucket with conditional operations support */
class MockR2Bucket implements RelayR2Bucket {
  private storage = new Map<string, { value: string; etag: string; customMetadata?: Record<string, string> }>();
  private etagCounter = 1;

  async get(key: string) {
    const item = this.storage.get(key);
    if (!item) return null;
    return {
      etag: item.etag,
      text: async () => item.value,
      customMetadata: item.customMetadata,
    };
  }

  async put(key: string, value: string | ArrayBuffer | Uint8Array, options?: RelayR2PutOptions) {
    const existing = this.storage.get(key);

    if (options?.onlyIf) {
      if (options.onlyIf.etagDoesNotMatch === '*' && existing) {
        return null; // Conditional write failed: object already exists
      }
      if (options.onlyIf.etagMatches && (!existing || existing.etag !== options.onlyIf.etagMatches)) {
        return null; // Conditional write failed: etag mismatch
      }
    }

    const strVal = typeof value === 'string' ? value : new TextDecoder().decode(value as ArrayBuffer);
    const newEtag = `etag-${this.etagCounter++}`;
    this.storage.set(key, { value: strVal, etag: newEtag, customMetadata: options?.customMetadata });
    return { etag: newEtag };
  }

  async delete(keys: string | string[]) {
    const list = Array.isArray(keys) ? keys : [keys];
    for (const k of list) this.storage.delete(k);
  }

  async list(options?: { prefix?: string; limit?: number }) {
    const prefix = options?.prefix || '';
    const objects: Array<{ key: string; customMetadata?: Record<string, string> }> = [];
    for (const [key, val] of this.storage.entries()) {
      if (key.startsWith(prefix)) {
        objects.push({ key, customMetadata: val.customMetadata });
      }
    }
    return { objects };
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
    employeeId: undefined,
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

test('R2 Relay: prevents photo overwrite and enforces idempotency comparing entire envelope (ciphertext, iv, ephemeral key)', async () => {
  const bucket = new MockR2Bucket();
  const cashierClaims = mockClaims('cashier', 'store-12345678', 'emp-101');
  const ownerPair = await generateOwnerE2eeKeyPair();

  const rawBytes = new TextEncoder().encode('ORIGINAL_PHOTO_EXACT');
  const packet1 = await encryptPhotoForOwner(rawBytes, ownerPair.publicKey, {
    photoId: 'photo-immutable-001',
    operationId: 'op-imm-001',
    employeeId: 'emp-101',
  });

  // 1. Initial push succeeds
  const res1 = await pushPhotoToRelayR2(bucket, cashierClaims, packet1);
  assert.equal(res1.success, true);
  assert.ok(res1.transferToken);

  // 2. Exact same upload again succeeds idempotently
  const resRetry = await pushPhotoToRelayR2(bucket, cashierClaims, packet1);
  assert.equal(resRetry.success, true);
  assert.equal(resRetry.idempotent, true);
  assert.equal(resRetry.transferToken, res1.transferToken);

  // 3. Re-encrypting the SAME photo produces different IV, different ephemeral key, and different ciphertext.
  // Must be REJECTED as an unauthorized overwrite attempt despite matching unencrypted checksum!
  const packetDifferentCiphertext = await encryptPhotoForOwner(rawBytes, ownerPair.publicKey, {
    photoId: 'photo-immutable-001',
    operationId: 'op-imm-001',
    employeeId: 'emp-101',
  });

  assert.equal(packetDifferentCiphertext.checksum, packet1.checksum); // Same photo raw bytes
  assert.notEqual(packetDifferentCiphertext.ciphertext, packet1.ciphertext); // Different ciphertext!

  await assert.rejects(
    async () => {
      await pushPhotoToRelayR2(bucket, cashierClaims, packetDifferentCiphertext);
    },
    /sudah ada dan tidak dapat diganti/i
  );
});

test('R2 Relay: Owner ACK deletes object immediately, protects against fake/mismatched/stale ACK', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-12345678');
  const cashierClaims = mockClaims('cashier', 'store-12345678', 'emp-ack');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const packet = await encryptPhotoForOwner(
    new TextEncoder().encode('PHOTO_FOR_STRICT_ACK'),
    ownerPair.publicKey,
    { photoId: 'photo-strict-ack-01', operationId: 'op-ack-01', employeeId: 'emp-ack' }
  );

  const pushRes = await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  // 1. Fake ACK with mismatched checksum is rejected
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(bucket, ownerClaims, {
        photoId: 'photo-strict-ack-01',
        checksum: '0000000000000000000000000000000000000000000000000000000000000000',
        transferToken: pushRes.transferToken,
      });
    },
    /Checksum foto tidak sesuai konfirmasi/i
  );

  // 2a. Missing transferToken is strictly rejected (400)
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(bucket, ownerClaims, {
        photoId: 'photo-strict-ack-01',
        checksum: packet.checksum,
      } as any);
    },
    /Token transfer wajib disertakan/i
  );

  // 2b. Mismatched transferToken (stale transfer ACK) is rejected (409)
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(bucket, ownerClaims, {
        photoId: 'photo-strict-ack-01',
        checksum: packet.checksum,
        transferToken: '0000000000000000000000000000000000000000000000000000000000000000',
      });
    },
    /Token transfer foto sudah kedaluwarsa/i
  );

  // 3. Mismatched operationId in ACK is rejected
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(bucket, ownerClaims, {
        photoId: 'photo-strict-ack-01',
        checksum: packet.checksum,
        transferToken: pushRes.transferToken,
        operationId: 'op-wrong-id',
        employeeId: 'emp-ack',
      });
    },
    /ID operasi tidak sesuai konfirmasi/i
  );

  // 4. Non-owner cannot ACK
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(bucket, cashierClaims, {
        photoId: 'photo-strict-ack-01',
        checksum: packet.checksum,
        transferToken: pushRes.transferToken,
      });
    },
    /memerlukan akses pemilik/i
  );

  // 5. Authentic Owner ACK deletes object
  const ack = await ackPhotoFromRelayR2(bucket, ownerClaims, {
    photoId: 'photo-strict-ack-01',
    checksum: packet.checksum,
    transferToken: pushRes.transferToken,
    operationId: 'op-ack-01',
    employeeId: 'emp-ack',
  });
  assert.equal(ack.success, true);
  assert.equal(ack.deleted, true);
  assert.equal(bucket.size(), 0);

  // 6. Subsequent duplicate ACK is idempotent
  const dupAck = await ackPhotoFromRelayR2(bucket, ownerClaims, {
    photoId: 'photo-strict-ack-01',
    checksum: packet.checksum,
    transferToken: pushRes.transferToken,
  });
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
    { photoId: 'photo-expired-01', operationId: 'op-exp-01', employeeId: 'emp-kasir-001', ttlMs: -1000 }
  );

  await pushPhotoToRelayR2(bucket, cashierClaims, packet);
  assert.equal(bucket.size(), 1);

  const pullRes = await pullPhotoFromRelayR2(bucket, ownerClaims, 'photo-expired-01');
  assert.equal(pullRes.found, false);
  assert.equal(pullRes.expired, true);
  assert.equal(bucket.size(), 0);
});

test('Owner E2EE Public Key: concurrent rotation CAS epoch protection and device binding', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-rot-1234');
  const cashierClaims = mockClaims('cashier', 'store-rot-1234');

  const keypair1 = await generateOwnerE2eeKeyPair();
  const pubJwk1 = await exportPublicKeyJwk(keypair1.publicKey);

  // 1. Initial key registration (epoch 1)
  const setRes1 = await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: pubJwk1 });
  assert.equal(setRes1.success, true);
  assert.equal(setRes1.keyEpoch, 1);

  // 2. Concurrent rotation attempt with stale expectedCurrentEpoch = 0 -> rejected
  const keypair2 = await generateOwnerE2eeKeyPair();
  const pubJwk2 = await exportPublicKeyJwk(keypair2.publicKey);

  await assert.rejects(
    async () => {
      await setOwnerE2eeKeyR2(bucket, ownerClaims, {
        publicKeyJwk: pubJwk2,
        expectedCurrentEpoch: 0, // Stale! Current is 1
      });
    },
    /epoch_conflict|sudah berubah/i
  );

  // 3. Proper rotation specifying expectedCurrentEpoch = 1 -> succeeds
  const setRes2 = await setOwnerE2eeKeyR2(bucket, ownerClaims, {
    publicKeyJwk: pubJwk2,
    expectedCurrentEpoch: 1,
  });
  assert.equal(setRes2.success, true);
  assert.equal(setRes2.keyEpoch, 2);

  // 4. Cashier fetches updated key
  const getRes = await getOwnerE2eeKeyR2(bucket, cashierClaims);
  assert.equal(getRes.identity?.keyEpoch, 2);
  assert.equal(getRes.identity?.fingerprint, setRes2.fingerprint);
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

test('Real Integration: recordAttendanceWithPhotoAtomic using real saveOperation', async () => {
  const photoId = 'photo-real-saveop-001';
  const rawBytes = new TextEncoder().encode('PHOTO_RAW_DATA_REAL');
  const photoBlob = new Blob([rawBytes], { type: 'image/jpeg' });
  const checksum = await sha256Hex(photoBlob);
  const employeeId = 'emp-real-integration-1';
  const employeeName = 'Kasir Real Integrasi';

  // 1. Perform actual attendance.in with photo using saveOperation
  const opId = await recordAttendanceWithPhotoAtomic(saveOperation, {
    kind: 'attendance.in',
    employeeId,
    employeeName,
    photo: {
      photoId,
      blob: photoBlob,
      checksum,
    },
  });

  assert.ok(opId);

  // 2. Verify both photo and operation were persisted in Dexie
  const photoRecord = await getAttendancePhoto(photoId);
  assert.ok(photoRecord);
  assert.equal(photoRecord?.id, photoId);
  assert.equal(photoRecord?.employeeId, employeeId);
  assert.ok(photoRecord?.blob instanceof Blob);

  const opRecord = await db.table('operations').where('employeeId').equals(employeeId).first();
  assert.ok(opRecord);
  assert.equal(opRecord?.kind, 'attendance.in');
  assert.equal(opRecord?.photoId, photoId);

  // 3. Attempting duplicate attendance.in for same employee MUST fail validation and roll back atomically
  const dupPhotoId = 'photo-dup-fail-002';
  await assert.rejects(
    async () => {
      await recordAttendanceWithPhotoAtomic(saveOperation, {
        kind: 'attendance.in',
        employeeId, // Same employee already clocked in!
        employeeName,
        photo: {
          photoId: dupPhotoId,
          blob: photoBlob,
          checksum,
        },
      });
    },
    /sudah absen masuk/i
  );

  // 4. Verify that due to atomic rollback, dupPhotoId was NOT saved
  const dupPhotoRecord = await getAttendancePhoto(dupPhotoId);
  assert.equal(dupPhotoRecord, undefined);

  // 5. Now perform attendance.out with photo -> succeeds and closes session
  const outPhotoId = 'photo-out-success-003';
  const outOpId = await recordAttendanceWithPhotoAtomic(saveOperation, {
    kind: 'attendance.out',
    employeeId,
    employeeName,
    sessionId: opRecord?.sessionId,
    photo: {
      photoId: outPhotoId,
      blob: photoBlob,
      checksum,
    },
  });
  assert.ok(outOpId);

  const outPhotoRecord = await getAttendancePhoto(outPhotoId);
  assert.ok(outPhotoRecord);
  assert.equal(outPhotoRecord?.id, outPhotoId);
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

test('Owner E2EE Public Key: re-registering identical key is idempotent and does not bump keyEpoch', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-idem-key-123');

  const keypair = await generateOwnerE2eeKeyPair();
  const pubJwk = await exportPublicKeyJwk(keypair.publicKey);

  // Initial registration
  const first = await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: pubJwk });
  assert.equal(first.success, true);
  assert.equal(first.keyEpoch, 1);
  assert.equal(first.idempotent, undefined);

  // Subsequent re-registrations with identical public key (e.g. repeated page visits)
  for (let i = 0; i < 5; i++) {
    const repeat = await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: pubJwk });
    assert.equal(repeat.success, true);
    assert.equal(repeat.idempotent, true);
    assert.equal(repeat.keyEpoch, 1, 'keyEpoch must remain 1 on identical key re-registration');
    assert.equal(repeat.fingerprint, first.fingerprint);
  }

  // When key actually changes (genuine rotation), keyEpoch advances
  const newPair = await generateOwnerE2eeKeyPair();
  const newPubJwk = await exportPublicKeyJwk(newPair.publicKey);
  const rotated = await setOwnerE2eeKeyR2(bucket, ownerClaims, {
    publicKeyJwk: newPubJwk,
    expectedCurrentEpoch: 1,
  });
  assert.equal(rotated.success, true);
  assert.equal(rotated.keyEpoch, 2);
  assert.notEqual(rotated.fingerprint, first.fingerprint);
});

test('R2 Relay Concurrency: stale transfer ACK cannot delete new re-upload transfer', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-race-123');
  const cashierClaims = mockClaims('cashier', 'store-race-123', 'emp-race-1');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const photoId = 'photo-concurrent-race-01';

  // 1. Initial upload: Transfer A
  const packetA = await encryptPhotoForOwner(
    new TextEncoder().encode('PHOTO_TRANSFER_A'),
    ownerPair.publicKey,
    { photoId, operationId: 'op-race-01', employeeId: 'emp-race-1' }
  );
  const pushA = await pushPhotoToRelayR2(bucket, cashierClaims, packetA);
  assert.equal(pushA.success, true);
  const tokenA = pushA.transferToken;
  assert.ok(tokenA);

  // 2. Owner downloads Transfer A and saves tokenA...
  // But before Owner ACK arrives, Owner requested reupload (or transfer expired and reuploaded)
  await requestPhotoReuploadR2(bucket, ownerClaims, {
    photoId,
    employeeId: 'emp-race-1',
    operationId: 'op-race-01',
    reason: 'Owner needs reupload',
  });

  // Cashier re-uploads with Transfer B (new ephemeral key, new IV, new tokenB)
  const packetB = await encryptPhotoForOwner(
    new TextEncoder().encode('PHOTO_TRANSFER_B'),
    ownerPair.publicKey,
    { photoId, operationId: 'op-race-01', employeeId: 'emp-race-1' }
  );
  const pushB = await pushPhotoToRelayR2(bucket, cashierClaims, packetB);
  assert.equal(pushB.success, true);
  const tokenB = pushB.transferToken;
  assert.notEqual(tokenA, tokenB);

  // 3. Delayed ACK from Transfer A (carrying tokenA) arrives now!
  // Must be strictly rejected with 409 stale_transfer and MUST NOT delete Transfer B!
  await assert.rejects(
    async () => {
      await ackPhotoFromRelayR2(bucket, ownerClaims, {
        photoId,
        checksum: packetA.checksum,
        transferToken: tokenA, // Stale token!
        operationId: 'op-race-01',
        employeeId: 'emp-race-1',
      });
    },
    /Token transfer foto sudah kedaluwarsa atau digantikan transfer baru/i
  );

  // Verify Transfer B is still safe and intact in R2 transit
  const checkTransitB = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(checkTransitB.found, true);
  assert.equal(checkTransitB.transferToken, tokenB);

  // 4. Valid ACK for Transfer B succeeds and purges the object
  const ackB = await ackPhotoFromRelayR2(bucket, ownerClaims, {
    photoId,
    checksum: packetB.checksum,
    transferToken: tokenB,
    operationId: 'op-race-01',
    employeeId: 'emp-race-1',
  });
  assert.equal(ackB.success, true);
  assert.equal(ackB.deleted, true);

  const checkFinal = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(checkFinal.found, false);
});

test('Disaster Recovery: loss of Owner private key -> key rotation -> reupload -> zero photo loss', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-disaster-123');
  const cashierClaims = mockClaims('cashier', 'store-disaster-123', 'emp-survivor');

  // 1. Initial state: Owner Key 1 (Epoch 1)
  const oldOwnerPair = await generateOwnerE2eeKeyPair();
  const oldOwnerPubJwk = await exportPublicKeyJwk(oldOwnerPair.publicKey);
  await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: oldOwnerPubJwk });

  // 2. Cashier takes attendance photo offline
  const rawBytes = new TextEncoder().encode('IRREPLACEABLE_ATTENDANCE_EVIDENCE_PHOTO');
  const photoBlob = new Blob([rawBytes], { type: 'image/jpeg' });
  const photoChecksum = await sha256Hex(photoBlob);
  const photoId = 'photo-disaster-proof-01';
  const operationId = 'op-disaster-01';

  // Cashier stores photo in local IndexedDB
  await db.table('attendancePhotos').put({
    id: photoId,
    operationId,
    employeeId: 'emp-survivor',
    employeeName: 'Kasir Survivor',
    blob: photoBlob,
    checksum: photoChecksum,
    createdAt: new Date().toISOString(),
    status: 'lokal',
  });

  // Cashier syncs to R2 relay using initial key
  const oldOwnerPub = await importOwnerPublicKey(oldOwnerPubJwk);
  const packet1 = await encryptPhotoForOwner(photoBlob, oldOwnerPub, {
    storeId: 'store-disaster-123',
    photoId,
    operationId,
    employeeId: 'emp-survivor',
  });
  await pushPhotoToRelayR2(bucket, cashierClaims, packet1);
  await db.table('attendancePhotos').update(photoId, { status: 'siap_diambil' });

  // 3. Disaster Strikes:
  // - Owner loses their device / private key! (oldOwnerPair.privateKey is lost)
  // - R2 object transit expires or cannot be decrypted by new device.
  // Owner sets up a NEW device with a NEW keypair:
  const newOwnerPair = await generateOwnerE2eeKeyPair();
  const newOwnerPubJwk = await exportPublicKeyJwk(newOwnerPair.publicKey);

  // Owner rotates public key to Epoch 2
  const rotRes = await setOwnerE2eeKeyR2(bucket, ownerClaims, {
    publicKeyJwk: newOwnerPubJwk,
    expectedCurrentEpoch: 1,
  });
  assert.equal(rotRes.keyEpoch, 2);

  // Owner requests reupload for this specific attendance photo
  await requestPhotoReuploadR2(bucket, ownerClaims, {
    photoId,
    employeeId: 'emp-survivor',
    operationId,
    reason: 'Owner device lost - key rotated to epoch 2',
    ownerPublicKeyJwk: newOwnerPubJwk,
  });

  // 4. Employee device queries reupload request
  const reuploadCheck = await checkPhotoReuploadR2(bucket, cashierClaims, photoId);
  assert.equal(reuploadCheck.hasRequest, true);
  assert.ok(reuploadCheck.request?.ownerPublicKeyJwk);

  // Employee retrieves the intact original photo Blob from local IndexedDB
  const localPhoto = await db.table('attendancePhotos').get(photoId);
  assert.ok(localPhoto?.blob instanceof Blob);

  // Employee re-encrypts the original Blob with Owner NEW public key
  const newOwnerPub = await importOwnerPublicKey(reuploadCheck.request!.ownerPublicKeyJwk!);
  const reuploadPacket = await encryptPhotoForOwner(localPhoto!.blob as Blob, newOwnerPub, {
    storeId: 'store-disaster-123',
    photoId,
    operationId,
    employeeId: 'emp-survivor',
  });

  const reuploadPush = await pushPhotoToRelayR2(bucket, cashierClaims, reuploadPacket);
  assert.equal(reuploadPush.success, true);

  // 5. Owner receives photo on new device, decrypts with NEW private key, verifies checksum, saves to Owner Dexie as Blob, and ACKs
  const pulled = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(pulled.found, true);
  assert.ok(pulled.packet);

  const { photoBytes: recoveredBytes, checksum: recoveredChecksum } = await decryptPhotoAsOwner(
    pulled.packet!,
    newOwnerPair.privateKey
  );
  assert.equal(recoveredChecksum, photoChecksum);
  assert.deepEqual(recoveredBytes, rawBytes);

  // Owner ACKs
  const ackRes = await ackPhotoFromRelayR2(bucket, ownerClaims, {
    photoId,
    checksum: recoveredChecksum,
    transferToken: pulled.transferToken!,
    operationId,
    employeeId: 'emp-survivor',
  });
  assert.equal(ackRes.success, true);

  // 6. Zero photo loss confirmed: both devices have the intact photo Blob and identical checksum!
  assert.equal(bucket.size(), 1); // R2 buffer purged, only owner key remains
});

test('Zero Request Guarantee: syncPendingAttendancePhotos produces 0 network requests when no pending photos exist', async () => {
  // Clear any leftover local attendance photos
  await db.table('attendancePhotos').where('status').equals('lokal').delete();

  let networkCallCount = 0;
  const mockClient = {
    call: async () => {
      networkCallCount++;
      return { found: true };
    },
  } as any;

  const result = await syncPendingAttendancePhotos(mockClient, 'store-zero-test', 'emp-zero');
  assert.equal(result.pushed, 0);
  assert.equal(result.reuploaded, 0);
  assert.equal(networkCallCount, 0, 'Must produce exactly zero network calls when no pending photos exist');
});

test('Two-Device Isolated Workflow: Cashier offline -> takes attendance -> online -> sync -> Owner opens at later time -> pull -> decrypt -> IndexedDB Blob -> ACK -> R2 purged', async () => {
  const bucket = new MockR2Bucket();
  const storeId = 'store-two-device-e2e';
  const ownerClaims = mockClaims('owner', storeId);
  const cashierClaims = mockClaims('cashier', storeId, 'emp-isolated-cashier');

  // Setup Owner key in R2
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPubJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: ownerPubJwk });

  // Mock clients for Cashier and Owner that route to our MockR2Bucket
  const cashierClient = {
    call: async (action: string, data?: any) => {
      if (action === 'photo.relay.owner_key.get') return getOwnerE2eeKeyR2(bucket, cashierClaims);
      if (action === 'photo.relay.push') return pushPhotoToRelayR2(bucket, cashierClaims, data.packet);
      if (action === 'photo.relay.reupload_check') return checkPhotoReuploadR2(bucket, cashierClaims, data.photoId);
      throw new Error(`Unhandled cashier action: ${action}`);
    },
  } as any;

  const ownerClient = {
    call: async (action: string, data?: any) => {
      if (action === 'photo.relay.pull') return pullPhotoFromRelayR2(bucket, ownerClaims, data.photoId);
      if (action === 'photo.relay.ack') return ackPhotoFromRelayR2(bucket, ownerClaims, data);
      throw new Error(`Unhandled owner action: ${action}`);
    },
  } as any;

  // 1. Cashier device is OFFLINE
  const originalBytes = new TextEncoder().encode('ISOLATED_DEVICE_ATTENDANCE_PHOTO');
  const originalBlob = new Blob([originalBytes], { type: 'image/jpeg' });
  const originalChecksum = await sha256Hex(originalBlob);
  const photoId = 'photo-iso-device-001';

  // Cashier records attendance offline with real saveOperation
  const opId = await recordAttendanceWithPhotoAtomic(saveOperation, {
    kind: 'attendance.in',
    employeeId: 'emp-isolated-cashier',
    employeeName: 'Kasir Terisolasi',
    photo: {
      photoId,
      blob: originalBlob,
      checksum: originalChecksum,
    },
  });
  assert.ok(opId);

  // Cashier verifies photo stored locally in Dexie as Blob with status 'lokal'
  const cashierLocalPhoto = await getAttendancePhoto(photoId);
  assert.ok(cashierLocalPhoto);
  assert.equal(cashierLocalPhoto?.status, 'lokal');
  assert.ok(cashierLocalPhoto?.blob instanceof Blob);

  // R2 transit currently has 0 photos
  assert.equal(bucket.size(), 1); // Only owner key

  // 2. Cashier comes ONLINE -> triggers background sync
  const syncResult = await syncPendingAttendancePhotos(cashierClient, storeId, 'emp-isolated-cashier');
  assert.equal(syncResult.pushed, 1);

  // Cashier local record updated to 'siap_diambil'
  const cashierUpdatedPhoto = await getAttendancePhoto(photoId);
  assert.equal(cashierUpdatedPhoto?.status, 'siap_diambil');
  assert.equal(bucket.size(), 2); // 1 owner key + 1 transit photo

  // 3. Owner opens app at a LATER time on separate device
  // Owner calls pullAndPersistAttendancePhoto
  const pulledRecord = await pullAndPersistAttendancePhoto(ownerClient, photoId, ownerPair.privateKey, db);
  assert.ok(pulledRecord);
  assert.equal(pulledRecord?.id, photoId);
  assert.equal(pulledRecord?.checksum, originalChecksum);
  assert.equal(pulledRecord?.status, 'tersimpan');
  assert.ok(pulledRecord?.blob instanceof Blob);

  // 4. Verify R2 transit buffer was completely purged after Owner ACK
  assert.equal(bucket.size(), 1); // Only owner key remains
  const checkPurged = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(checkPurged.found, false);
});


test('R2 Relay Concurrency: atomic coordination ensures ACK never deletes a concurrent or subsequent reupload', async () => {
  const bucket = new MockR2Bucket();
  const ownerClaims = mockClaims('owner', 'store-race-atomic');
  const cashierClaims = mockClaims('cashier', 'store-race-atomic', 'emp-race-atomic');

  const ownerPair = await generateOwnerE2eeKeyPair();
  const photoId = 'photo-concurrency-atomic-01';

  // 1. Initial upload: Transfer A
  const packetA = await encryptPhotoForOwner(
    new TextEncoder().encode('TRANSFER_A_BYTES'),
    ownerPair.publicKey,
    { photoId, operationId: 'op-atomic-1', employeeId: 'emp-race-atomic' }
  );
  const pushA = await pushPhotoToRelayR2(bucket, cashierClaims, packetA);
  assert.equal(pushA.success, true);
  const tokenA = pushA.transferToken;

  // 2. Re-upload request created
  await requestPhotoReuploadR2(bucket, ownerClaims, {
    photoId,
    employeeId: 'emp-race-atomic',
    operationId: 'op-atomic-1',
    reason: 'Concurrent race test',
  });

  // Prepare Transfer B (new token, new envelope)
  const packetB = await encryptPhotoForOwner(
    new TextEncoder().encode('TRANSFER_B_BYTES'),
    ownerPair.publicKey,
    { photoId, operationId: 'op-atomic-1', employeeId: 'emp-race-atomic' }
  );

  // 3. Launch concurrent execution: ACK for Transfer A while Transfer B is pushed
  // Due to per-photoId serialization and pre-delete verification,
  // either ACK runs before B (and deletes stale object, then B writes fresh),
  // OR B writes first (and ACK for A detects stale token and rejects with 409).
  // In NEITHER case can Transfer B be deleted!
  const pushBPromise = pushPhotoToRelayR2(bucket, cashierClaims, packetB);
  const staleAckPromise = ackPhotoFromRelayR2(bucket, ownerClaims, {
    photoId,
    checksum: packetA.checksum,
    transferToken: tokenA,
    operationId: 'op-atomic-1',
    employeeId: 'emp-race-atomic',
  }).catch((err: any) => ({ error: err }));

  const [pushBResult, ackResult] = await Promise.all([pushBPromise, staleAckPromise]);
  assert.equal(pushBResult.success, true);
  const tokenB = pushBResult.transferToken;
  assert.notEqual(tokenA, tokenB);

  // If ACK ran after pushB, it was rejected with 409
  // In all cases, verify Transfer B is safe, alive and intact in R2 transit
  const checkR2 = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(checkR2.found, true);
  assert.equal(checkR2.transferToken, tokenB);

  // 4. Valid ACK with tokenB succeeds and purges
  const validAck = await ackPhotoFromRelayR2(bucket, ownerClaims, {
    photoId,
    checksum: packetB.checksum,
    transferToken: tokenB,
    operationId: 'op-atomic-1',
    employeeId: 'emp-race-atomic',
  });
  assert.equal(validAck.success, true);
  assert.equal(bucket.size(), 0);
});

test('R2 Relay TTL Expiry & Re-upload: 24h expired photo triggers Owner reupload request and cashier re-syncs seamlessly', async () => {
  const bucket = new MockR2Bucket();
  const storeId = 'store-ttl-expire-test';
  const ownerClaims = mockClaims('owner', storeId);
  const cashierClaims = mockClaims('cashier', storeId, 'emp-ttl-cashier');

  // Setup Owner key in R2
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPubJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: ownerPubJwk });

  const rawBytes = new TextEncoder().encode('IRREPLACEABLE_PHOTO_FOR_TTL_TEST');
  const photoBlob = new Blob([rawBytes], { type: 'image/jpeg' });
  const photoChecksum = await sha256Hex(photoBlob);
  const photoId = 'photo-ttl-24h-001';
  const operationId = 'op-ttl-001';

  // 1. Cashier took attendance, stored in local Dexie, and pushed to R2 -> marked 'siap_diambil'
  await db.table('attendancePhotos').put({
    id: photoId,
    operationId,
    employeeId: 'emp-ttl-cashier',
    employeeName: 'Kasir TTL',
    blob: photoBlob,
    checksum: photoChecksum,
    createdAt: new Date().toISOString(),
    status: 'siap_diambil',
  });

  const ownerPub = await importOwnerPublicKey(ownerPubJwk);
  const initialPacket = await encryptPhotoForOwner(photoBlob, ownerPub, {
    storeId,
    photoId,
    operationId,
    employeeId: 'emp-ttl-cashier',
  });
  await pushPhotoToRelayR2(bucket, cashierClaims, initialPacket);
  assert.equal(bucket.size(), 2); // 1 key + 1 transit photo

  // 2. 24 hours pass: photo in R2 expires and is purged by R2 lifecycle
  const listTransfers = await bucket.list({ prefix: relayTransferPrefix(storeId, photoId) });
  for (const obj of listTransfers.objects) await bucket.delete(obj.key);
  assert.equal(bucket.size(), 1); // Only owner key remains

  // 3. Owner opens employee operations, sees photo is missing from local Dexie and expired from R2 transit
  const checkPull = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(checkPull.found, false);

  // Owner clicks "Minta Kirim Ulang Foto" in the UI
  const reuploadReq = await requestPhotoReuploadR2(bucket, ownerClaims, {
    photoId,
    employeeId: 'emp-ttl-cashier',
    operationId,
    reason: 'Buffer transit R2 telah kedaluwarsa 24 jam',
    ownerPublicKeyJwk: ownerPubJwk,
  });
  assert.equal(reuploadReq.success, true);

  // 4. Cashier reconnects (app opened, online restored, or session resumed)
  const cashierClient = {
    call: async (action: string, data?: any) => {
      if (action === 'photo.relay.owner_key.get') return getOwnerE2eeKeyR2(bucket, cashierClaims);
      if (action === 'photo.relay.push') return pushPhotoToRelayR2(bucket, cashierClaims, data.packet);
      if (action === 'photo.relay.reupload_pending') return listPendingReuploadRequestsR2(bucket, cashierClaims);
      if (action === 'photo.relay.reupload_check') return checkPhotoReuploadR2(bucket, cashierClaims, data.photoId);
      throw new Error(`Unhandled action ${action}`);
    },
  } as any;

  // Background sync runs with checkReuploads enabled
  const syncRes = await syncPendingAttendancePhotos(cashierClient, storeId, 'emp-ttl-cashier');
  assert.equal(syncRes.reuploaded, 1, 'Must successfully re-upload the expired photo from local Blob');

  // 5. Owner device pulls the newly re-uploaded photo from R2 transit
  const ownerClient = {
    call: async (action: string, data?: any) => {
      if (action === 'photo.relay.pull') return pullPhotoFromRelayR2(bucket, ownerClaims, data.photoId);
      if (action === 'photo.relay.ack') return ackPhotoFromRelayR2(bucket, ownerClaims, data);
      throw new Error(`Unhandled action ${action}`);
    },
  } as any;

  const pullRes = await pullAndPersistAttendancePhoto(ownerClient, photoId, ownerPair.privateKey, db);
  assert.ok(pullRes);
  assert.equal(pullRes?.id, photoId);
  assert.equal(pullRes?.checksum, photoChecksum);
  assert.equal(pullRes?.status, 'tersimpan');
  assert.ok(pullRes?.blob instanceof Blob);

  // 6. R2 buffer is purged after Owner ACK
  assert.equal(bucket.size(), 1); // Only owner key remains
});

test('Realistic Mobile Browser POS E2E: Cashier offline mobile UI -> capture photo -> restore online -> background sync -> Owner device pulls -> ACKs', async () => {
  const bucket = new MockR2Bucket();
  const storeId = 'store-mobile-e2e';
  const ownerClaims = mockClaims('owner', storeId);
  const cashierClaims = mockClaims('cashier', storeId, 'emp-mobile-kasir');

  // Owner registers E2EE key
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPubJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: ownerPubJwk });

  const cashierClient = {
    call: async (action: string, data?: any) => {
      if (action === 'photo.relay.owner_key.get') return getOwnerE2eeKeyR2(bucket, cashierClaims);
      if (action === 'photo.relay.push') return pushPhotoToRelayR2(bucket, cashierClaims, data.packet);
      if (action === 'photo.relay.reupload_pending') return listPendingReuploadRequestsR2(bucket, cashierClaims);
      if (action === 'photo.relay.reupload_check') return checkPhotoReuploadR2(bucket, cashierClaims, data.photoId);
      throw new Error(`Unhandled action: ${action}`);
    },
  } as any;

  const ownerClient = {
    call: async (action: string, data?: any) => {
      if (action === 'photo.relay.pull') return pullPhotoFromRelayR2(bucket, ownerClaims, data.photoId);
      if (action === 'photo.relay.ack') return ackPhotoFromRelayR2(bucket, ownerClaims, data);
      throw new Error(`Unhandled action: ${action}`);
    },
  } as any;

  // 1. Simulate mobile cashier taking attendance photo offline
  const mobilePhotoBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x10, 0x20, 0x30, 0x40]);
  const photoBlob = new Blob([mobilePhotoBytes], { type: 'image/jpeg' });
  const photoChecksum = await sha256Hex(photoBlob);
  const photoId = 'photo-mobile-sim-001';

  const opId = await recordAttendanceWithPhotoAtomic(saveOperation, {
    kind: 'attendance.in',
    employeeId: 'emp-mobile-kasir',
    employeeName: 'Kasir Mobile',
    photo: {
      photoId,
      blob: photoBlob,
      checksum: photoChecksum,
    },
  });
  assert.ok(opId);

  // Cashier local verification
  const localRecord = await getAttendancePhoto(photoId);
  assert.ok(localRecord);
  assert.equal(localRecord?.status, 'lokal');
  assert.ok(localRecord?.blob instanceof Blob);

  // 2. Connectivity restored: trigger background sync
  const syncResult = await syncPendingAttendancePhotos(cashierClient, storeId, 'emp-mobile-kasir');
  assert.equal(syncResult.pushed, 1);

  // Verify cashier record updated to siap_diambil
  const updatedLocal = await getAttendancePhoto(photoId);
  assert.equal(updatedLocal?.status, 'siap_diambil');

  // 3. Owner device retrieves from R2
  const pulled = await pullAndPersistAttendancePhoto(ownerClient, photoId, ownerPair.privateKey, db);
  assert.ok(pulled);
  assert.equal(pulled?.id, photoId);
  assert.equal(pulled?.checksum, photoChecksum);
  assert.equal(pulled?.status, 'tersimpan');
  assert.ok(pulled?.blob instanceof Blob);

  // Buffer purged
  assert.equal(bucket.size(), 1);
});

test('Multi-Isolate Concurrency: two independent server instances without shared memory safely handle interleaved ACK and reupload', async () => {
  const bucket = new MockR2Bucket();
  const storeId = 'store-multi-isolate-test';
  const photoId = 'photo-iso-concurrency-01';
  const ownerClaims = mockClaims('owner', storeId);
  const cashierClaims = mockClaims('cashier', storeId, 'emp-iso-cashier');

  // Register Owner E2EE Key
  const ownerPair = await generateOwnerE2eeKeyPair();
  const ownerPubJwk = await exportPublicKeyJwk(ownerPair.publicKey);
  await setOwnerE2eeKeyR2(bucket, ownerClaims, { publicKeyJwk: ownerPubJwk });

  // Simulate two completely separate Cloudflare Worker isolates:
  // Isolate 1 (e.g. edge worker in Singapore handling cashier upload)
  // Isolate 2 (e.g. edge worker in Tokyo handling owner ACK)
  // Neither shares any JavaScript memory, locks, or variables. They share ONLY Cloudflare R2 bucket.
  const isolate1PushHandler = async (packet: E2eePhotoPacket) => {
    return pushPhotoToRelayR2(bucket, cashierClaims, packet);
  };

  const isolate2AckHandler = async (data: { photoId: string; checksum: string; transferToken: string; operationId?: string; employeeId?: string }) => {
    return ackPhotoFromRelayR2(bucket, ownerClaims, data);
  };

  // 1. Initial upload via Isolate 1: Transfer A
  const photoBytesA = new TextEncoder().encode('PHOTO_ISOLATE_TRANSFER_A');
  const packetA = await encryptPhotoForOwner(photoBytesA, ownerPair.publicKey, {
    storeId,
    photoId,
    operationId: 'op-iso-1',
    employeeId: 'emp-iso-cashier',
  });
  const pushARes = await isolate1PushHandler(packetA);
  assert.equal(pushARes.success, true);
  const tokenA = pushARes.transferToken;

  // 2. Owner requests re-upload (e.g. device replacement or buffer recovery)
  await requestPhotoReuploadR2(bucket, ownerClaims, {
    photoId,
    employeeId: 'emp-iso-cashier',
    operationId: 'op-iso-1',
    reason: 'Multi-isolate reupload test',
  });

  // Prepare Transfer B (new ephemeral key, new IV, new ciphertext, new deterministic transfer token)
  const photoBytesB = new TextEncoder().encode('PHOTO_ISOLATE_TRANSFER_B');
  const packetB = await encryptPhotoForOwner(photoBytesB, ownerPair.publicKey, {
    storeId,
    photoId,
    operationId: 'op-iso-1',
    employeeId: 'emp-iso-cashier',
  });

  // 3. Concurrent race across isolates:
  // Isolate 1 executes Re-upload (Transfer B)
  // Isolate 2 executes ACK for Transfer A (tokenA)
  // In the real world, these run in separate isolates at the exact same millisecond.
  // Because Transfer A and Transfer B use transfer-versioned R2 keys,
  // Isolate 2's deletion of tokenA CANNOT delete Transfer B!
  const [resB, resStaleAck] = await Promise.all([
    isolate1PushHandler(packetB),
    isolate2AckHandler({
      photoId,
      checksum: packetA.checksum,
      transferToken: tokenA,
      operationId: 'op-iso-1',
      employeeId: 'emp-iso-cashier',
    }).catch(err => ({ error: err })),
  ]);

  assert.equal(resB.success, true);
  const tokenB = resB.transferToken;
  assert.notEqual(tokenA, tokenB);

  // 4. Verify Transfer B is 100% intact, alive, and readable in R2
  const pullRes = await pullPhotoFromRelayR2(bucket, ownerClaims, photoId);
  assert.equal(pullRes.found, true);
  assert.equal(pullRes.transferToken, tokenB);

  // Decrypt Transfer B and verify bytes
  const { photoBytes: decryptedB, checksum: checksumB } = await decryptPhotoAsOwner(pullRes.packet!, ownerPair.privateKey);
  assert.equal(checksumB, packetB.checksum);
  assert.deepEqual(decryptedB, photoBytesB);

  // 5. Valid ACK for tokenB via Isolate 2 cleanly purges R2 buffer
  const validAck = await isolate2AckHandler({
    photoId,
    checksum: packetB.checksum,
    transferToken: tokenB,
    operationId: 'op-iso-1',
    employeeId: 'emp-iso-cashier',
  });
  assert.equal(validAck.success, true);
  assert.equal(bucket.size(), 1); // Only owner key remains
});
