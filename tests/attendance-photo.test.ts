import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { db, type AttendancePhotoRecord } from '../src/lib/dexie';
import {
  sha256Hex,
  saveAttendancePhoto,
  getAttendancePhoto,
  getAttendancePhotoByOperation,
  deleteAttendancePhoto,
  pruneExpiredAttendancePhotos,
} from '../src/lib/attendancePhoto';
import {
  validateOperation,
  attendanceSummary,
  type OperationRecord,
} from '../src/lib/operations';

test('sha256Hex generates consistent 64-char hex digest', async () => {
  const encoder = new TextEncoder();
  const data1 = encoder.encode('hello-sakunota-attendance');
  const data2 = encoder.encode('hello-sakunota-attendance');
  const data3 = encoder.encode('different-photo-payload');

  const hash1 = await sha256Hex(data1);
  const hash2 = await sha256Hex(data2);
  const hash3 = await sha256Hex(data3);

  assert.equal(hash1.length, 64);
  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
});

test('local attendance photo IndexedDB CRUD and retrieval by operation', async () => {
  const photoId = 'photo-uuid-12345';
  const operationId = 'op-session-67890';
  const record: AttendancePhotoRecord = {
    id: photoId,
    operationId,
    employeeId: 'emp-kasir-1',
    employeeName: 'Budi Santoso',
    blob: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    createdAt: new Date().toISOString(),
    status: 'lokal',
  };

  await saveAttendancePhoto(record);

  // Retrieve by ID
  const retrieved = await getAttendancePhoto(photoId);
  assert.ok(retrieved);
  assert.equal(retrieved?.id, photoId);
  assert.equal(retrieved?.employeeName, 'Budi Santoso');
  assert.equal(retrieved?.status, 'lokal');
  assert.equal(retrieved?.checksum, record.checksum);

  // Retrieve by Operation ID
  const byOp = await getAttendancePhotoByOperation(operationId);
  assert.ok(byOp);
  assert.equal(byOp?.id, photoId);

  // Delete
  await deleteAttendancePhoto(photoId);
  const afterDelete = await getAttendancePhoto(photoId);
  assert.equal(afterDelete, undefined);
});

test('pruneExpiredAttendancePhotos purges records older than 30 days while preserving recent ones', async () => {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const freshRecord: AttendancePhotoRecord = {
    id: 'photo-fresh',
    operationId: 'op-fresh',
    employeeId: 'emp-1',
    employeeName: 'Kasir Fresh',
    blob: 'data:image/jpeg;base64,fresh',
    checksum: 'hash-fresh',
    createdAt: new Date(now - 5 * dayMs).toISOString(), // 5 days old
    status: 'lokal',
  };

  const oldRecord: AttendancePhotoRecord = {
    id: 'photo-old',
    operationId: 'op-old',
    employeeId: 'emp-1',
    employeeName: 'Kasir Old',
    blob: 'data:image/jpeg;base64,old',
    checksum: 'hash-old',
    createdAt: new Date(now - 35 * dayMs).toISOString(), // 35 days old
    status: 'lokal',
  };

  await saveAttendancePhoto(freshRecord);
  await saveAttendancePhoto(oldRecord);

  const prunedCount = await pruneExpiredAttendancePhotos(30);
  assert.equal(prunedCount, 1);

  // Verify fresh still exists
  const checkFresh = await getAttendancePhoto('photo-fresh');
  assert.ok(checkFresh);

  // Verify old was purged
  const checkOld = await getAttendancePhoto('photo-old');
  assert.equal(checkOld, undefined);

  // Clean up
  await deleteAttendancePhoto('photo-fresh');
});

test('validateOperation passes records with photo metadata and preserves existing validation guards', () => {
  const validWithPhoto: OperationRecord = {
    kind: 'attendance.in',
    employeeId: 'emp-101',
    employeeName: 'Siti Rahma',
    at: new Date().toISOString(),
    sessionId: 'session-att-001',
    photoId: 'photo-001',
    photoStatus: 'lokal',
    photoChecksum: 'abc1234567890def',
  };

  // Must not throw
  assert.doesNotThrow(() => validateOperation(validWithPhoto));

  const validWithoutPhoto: OperationRecord = {
    kind: 'attendance.out',
    employeeId: 'emp-101',
    employeeName: 'Siti Rahma',
    at: new Date().toISOString(),
    sessionId: 'session-att-001',
    photoStatus: 'tanpa_foto',
    photoReason: 'Izin kamera ditolak di browser',
  };

  // Must not throw
  assert.doesNotThrow(() => validateOperation(validWithoutPhoto));

  // Invalid operation kinds still throw
  assert.throws(() => {
    validateOperation({
      kind: 'attendance.invalid' as any,
      employeeId: 'emp-101',
      employeeName: 'Siti Rahma',
      at: new Date().toISOString(),
      sessionId: 'session-att-001',
    });
  });
});

test('attendanceSummary preserves inPhoto and outPhoto metadata faithfully', () => {
  const now = Date.now();
  const rows: OperationRecord[] = [
    {
      id: 1,
      kind: 'attendance.in',
      employeeId: 'emp-1',
      employeeName: 'Budi',
      sessionId: 'session-budi-1',
      at: new Date(now - 4 * 3600 * 1000).toISOString(),
      photoId: 'photo-in-budi',
      photoStatus: 'lokal',
      photoChecksum: 'hash-in-budi',
    },
    {
      id: 2,
      kind: 'attendance.out',
      employeeId: 'emp-1',
      employeeName: 'Budi',
      sessionId: 'session-budi-1',
      at: new Date(now).toISOString(),
      photoStatus: 'tanpa_foto',
      photoReason: 'Kamera perangkat rusak',
    },
  ];

  const summary = attendanceSummary(rows);
  assert.equal(summary.length, 1);
  const session = summary[0];

  assert.equal(session.employeeId, 'emp-1');
  assert.equal(session.name, 'Budi');
  assert.equal(session.inPhotoId, 'photo-in-budi');
  assert.equal(session.inPhotoStatus, 'lokal');
  assert.equal(session.inPhotoChecksum, 'hash-in-budi');
  assert.equal(session.outPhotoStatus, 'tanpa_foto');
  assert.equal(session.outPhotoReason, 'Kamera perangkat rusak');
  assert.equal(session.minutes, 240); // 4 hours
});
