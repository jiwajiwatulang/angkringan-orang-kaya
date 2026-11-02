import { db, type AttendancePhotoRecord } from './dexie';
import {
  generateOwnerE2eeKeyPair,
  exportPublicKeyJwk,
  exportPrivateKeyJwk,
  importOwnerPublicKey,
  importOwnerPrivateKey,
  encryptPhotoForOwner,
  decryptPhotoAsOwner,
  type E2eePhotoPacket,
} from './crypto/e2eePhoto';
import type { DeviceClient } from './multidevice/client';

export const MAX_PHOTO_BYTES = 250 * 1024; // 250 KB target cap
export const DEFAULT_RETENTION_DAYS = 30;

/** Computes hex-encoded SHA-256 checksum for byte integrity validation. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array | Blob): Promise<string> {
  let buffer: ArrayBuffer;
  if ('arrayBuffer' in data && typeof (data as Blob).arrayBuffer === 'function') {
    buffer = await (data as Blob).arrayBuffer();
  } else if (data instanceof Uint8Array) {
    buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
  } else {
    buffer = data as ArrayBuffer;
  }
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compresses an image element or video frame to JPEG using HTML5 Canvas.
 * Caps the maximum dimension and enforces MAX_PHOTO_BYTES (250 KB)
 * using an adaptive multi-pass fallback if the initial result is too large.
 */
export async function compressAttendancePhoto(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  initialMaxDim = 1080,
  initialQuality = 0.75,
  mirror = false
): Promise<{ blob: Blob; dataUrl: string; checksum: string; width: number; height: number; sizeBytes: number }> {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Dimensi gambar tidak valid.');
  }

  // Fallback stages if compressed image exceeds MAX_PHOTO_BYTES
  const stages = [
    { maxDim: initialMaxDim, quality: initialQuality },
    { maxDim: Math.min(initialMaxDim, 900), quality: 0.60 },
    { maxDim: Math.min(initialMaxDim, 720), quality: 0.45 },
    { maxDim: Math.min(initialMaxDim, 540), quality: 0.35 },
    { maxDim: Math.min(initialMaxDim, 400), quality: 0.25 },
  ];

  let bestBlob: Blob | null = null;
  let bestWidth = sourceWidth;
  let bestHeight = sourceHeight;

  for (const stage of stages) {
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > stage.maxDim || targetHeight > stage.maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * stage.maxDim) / targetWidth);
        targetWidth = stage.maxDim;
      } else {
        targetWidth = Math.round((targetWidth * stage.maxDim) / targetHeight);
        targetHeight = stage.maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context tidak tersedia.');

    if (mirror) {
      ctx.translate(targetWidth, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('Gagal mengompresi foto.'))),
        'image/jpeg',
        stage.quality
      );
    });

    bestBlob = blob;
    bestWidth = targetWidth;
    bestHeight = targetHeight;

    // Strict size cap enforcement
    if (blob.size <= MAX_PHOTO_BYTES) {
      break;
    }
  }

  if (!bestBlob) {
    throw new Error('Gagal memproses foto absensi.');
  }

  if (bestBlob.size > MAX_PHOTO_BYTES) {
    throw new Error(`Ukuran foto (${Math.round(bestBlob.size / 1024)} KB) melebihi batas maksimal 250 KB.`);
  }

  const checksum = await sha256Hex(bestBlob);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca data foto.'));
    reader.readAsDataURL(bestBlob);
  });

  return {
    blob: bestBlob,
    dataUrl,
    checksum,
    width: bestWidth,
    height: bestHeight,
    sizeBytes: bestBlob.size,
  };
}

/**
 * Creates an object URL for a photo blob or passes through existing URL string.
 */
export function createPhotoBlobUrl(blob?: Blob | string): string {
  if (!blob) return '';
  if (typeof blob === 'string') return blob;
  return URL.createObjectURL(blob);
}

/**
 * Safely revokes an object URL created via createPhotoBlobUrl.
 */
export function revokePhotoBlobUrl(url: string): void {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}

/**
 * Saves or updates an attendance photo record in local IndexedDB.
 * Stores raw Blob in record.blob.
 */
export async function saveAttendancePhoto(record: AttendancePhotoRecord): Promise<void> {
  if (!record.id || !record.operationId || !record.employeeId) {
    throw new Error('Data foto absensi tidak lengkap.');
  }
  await db.table<AttendancePhotoRecord>('attendancePhotos').put(record);
}

/**
 * Retrieves a photo record by its unique photo ID.
 */
export async function getAttendancePhoto(id: string): Promise<AttendancePhotoRecord | undefined> {
  if (!id) return undefined;
  return db.table<AttendancePhotoRecord>('attendancePhotos').get(id);
}

/**
 * Retrieves a photo record by operation/session ID.
 */
export async function getAttendancePhotoByOperation(operationId: string): Promise<AttendancePhotoRecord | undefined> {
  if (!operationId) return undefined;
  return db.table<AttendancePhotoRecord>('attendancePhotos').where('operationId').equals(operationId).first();
}

/**
 * Lists all local attendance photos sorted by creation date (newest first).
 */
export async function listAttendancePhotos(): Promise<AttendancePhotoRecord[]> {
  const items = await db.table<AttendancePhotoRecord>('attendancePhotos').toArray();
  return items.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

/**
 * Explicitly deletes an attendance photo from local IndexedDB.
 */
export async function deleteAttendancePhoto(id: string): Promise<void> {
  if (!id) return;
  await db.table<AttendancePhotoRecord>('attendancePhotos').delete(id);
}

/**
 * Prunes local attendance photos older than retentionDays (default 30 days).
 * Returns the count of deleted photos.
 */
export async function pruneExpiredAttendancePhotos(retentionDays = DEFAULT_RETENTION_DAYS): Promise<number> {
  const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  const all = await db.table<AttendancePhotoRecord>('attendancePhotos').toArray();
  const toDelete = all.filter(item => Date.parse(item.createdAt) < cutoffTime);
  if (!toDelete.length) return 0;

  await db.table<AttendancePhotoRecord>('attendancePhotos').bulkDelete(toDelete.map(item => item.id));
  return toDelete.length;
}

/**
 * Transactional atomic wrapper to record attendance and store local photo in IndexedDB.
 * Passes the photo directly to saveOpFn so access checks occur before opening the transaction,
 * avoiding transaction inactivity or async boundary drops.
 */
export async function recordAttendanceWithPhotoAtomic(
  saveOpFn: (
    operationInput: {
      kind: 'attendance.in' | 'attendance.out';
      employeeId: string;
      employeeName: string;
      sessionId?: string;
      photoId?: string;
      photoStatus?: 'lokal' | 'tanpa_foto';
      photoChecksum?: string;
      photoReason?: string;
    },
    photoInput?: {
      photoId: string;
      blob: Blob | string;
      checksum: string;
    }
  ) => Promise<unknown>,
  params: {
    kind: 'attendance.in' | 'attendance.out';
    employeeId: string;
    employeeName: string;
    sessionId?: string;
    photo?: {
      photoId: string;
      blob: Blob | string;
      checksum: string;
    };
    withoutPhoto?: {
      reason: string;
    };
  }
): Promise<unknown> {
  const photoInput = params.photo
    ? {
        photoId: params.photo.photoId,
        blob: params.photo.blob,
        checksum: params.photo.checksum,
      }
    : undefined;

  const operationInput = {
    kind: params.kind,
    employeeId: params.employeeId,
    employeeName: params.employeeName,
    sessionId: params.sessionId,
    ...(params.photo
      ? {
          photoId: params.photo.photoId,
          photoStatus: 'lokal' as const,
          photoChecksum: params.photo.checksum,
        }
      : {
          photoStatus: 'tanpa_foto' as const,
          photoReason: params.withoutPhoto?.reason || 'Tanpa keterangan',
        }),
  };

  return await saveOpFn(operationInput, photoInput);
}

/**
 * Reconciles local attendance photos and operation consistency.
 * Cleans up any orphaned photo records where the operation was interrupted or crashed.
 */
export async function reconcileAttendanceConsistency(dexieDb = db): Promise<{ cleanedPhotos: number }> {
  try {
    const photos = await dexieDb.table<AttendancePhotoRecord>('attendancePhotos').toArray();
    const operations = await dexieDb.table('operations').toArray();
    const opSessionIds = new Set(operations.map((o: any) => o.sessionId || o.id));
    const now = Date.now();

    const orphans = photos.filter(p => {
      if (!p.blob || p.status === 'tanpa_foto') return false;
      if (opSessionIds.has(p.operationId) || opSessionIds.has(p.id)) return false;
      // Older than 10 minutes without matching operation is considered an interrupted orphan
      return now - Date.parse(p.createdAt) > 10 * 60 * 1000;
    });

    if (orphans.length > 0) {
      await dexieDb.table('attendancePhotos').bulkDelete(orphans.map(o => o.id));
    }
    return { cleanedPhotos: orphans.length };
  } catch {
    return { cleanedPhotos: 0 };
  }
}

/**
 * Retrieves or lazily initializes the Owner device's E2EE keypair in local device storage.
 */
export async function getOrCreateOwnerE2eeKeyPair(storeId: string): Promise<CryptoKeyPair> {
  const privKeyKey = `sakunota_e2ee_priv_${storeId}`;
  const pubKeyKey = `sakunota_e2ee_pub_${storeId}`;

  const savedPrivJwk = typeof localStorage !== 'undefined' ? localStorage.getItem(privKeyKey) : null;
  const savedPubJwk = typeof localStorage !== 'undefined' ? localStorage.getItem(pubKeyKey) : null;

  if (savedPrivJwk && savedPubJwk) {
    try {
      const privateKey = await importOwnerPrivateKey(JSON.parse(savedPrivJwk));
      const publicKey = await importOwnerPublicKey(JSON.parse(savedPubJwk));
      return { privateKey, publicKey };
    } catch {}
  }

  // Generate new keypair
  const pair = await generateOwnerE2eeKeyPair();
  if (typeof localStorage !== 'undefined') {
    const privJwk = await exportPrivateKeyJwk(pair.privateKey);
    const pubJwk = await exportPublicKeyJwk(pair.publicKey);
    localStorage.setItem(privKeyKey, JSON.stringify(privJwk));
    localStorage.setItem(pubKeyKey, JSON.stringify(pubJwk));
  }
  return pair;
}

/**
 * Cashier device: syncs all pending local attendance photos to Cloudflare R2 relay.
 * Runs non-blocking in background when connectivity is active.
 */
export async function syncPendingAttendancePhotos(
  client: DeviceClient,
  storeId: string,
  employeeId?: string,
  options?: { checkReuploads?: boolean }
): Promise<{ pushed: number; reuploaded: number }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return { pushed: 0, reuploaded: 0 };
  }

  // 1. Check local pending photos FIRST.
  // If zero photos are pending upload or reupload check, produce ZERO network requests!
  const pending = await db
    .table<AttendancePhotoRecord>('attendancePhotos')
    .where('status')
    .equals('lokal')
    .toArray();

  const targetPending = employeeId
    ? pending.filter(record => record.employeeId === employeeId)
    : pending;

  const shouldCheckReuploads = options?.checkReuploads !== false;
  const readyPhotos = shouldCheckReuploads
    ? await db
        .table<AttendancePhotoRecord>('attendancePhotos')
        .where('status')
        .equals('siap_diambil')
        .toArray()
    : [];

  const targetReady = employeeId
    ? readyPhotos.filter(record => record.employeeId === employeeId)
    : readyPhotos;

  if (targetPending.length === 0 && targetReady.length === 0) {
    return { pushed: 0, reuploaded: 0 };
  }

  // 2. Fetch Owner's active public key only when there is work to do
  let ownerKeyInfo: { found: boolean; identity?: { publicKeyJwk: JsonWebKey } };
  try {
    ownerKeyInfo = await client.call<{ found: boolean; identity?: { publicKeyJwk: JsonWebKey } }>(
      'photo.relay.owner_key.get'
    );
  } catch {
    return { pushed: 0, reuploaded: 0 };
  }

  if (!ownerKeyInfo.found || !ownerKeyInfo.identity?.publicKeyJwk) {
    return { pushed: 0, reuploaded: 0 };
  }

  const ownerCryptoPub = await importOwnerPublicKey(ownerKeyInfo.identity.publicKeyJwk);

  let pushed = 0;
  let reuploaded = 0;

  for (const record of targetPending) {
    if (!record.blob || typeof record.blob === 'string') continue;

    try {
      const packet = await encryptPhotoForOwner(record.blob, ownerCryptoPub, {
        storeId,
        photoId: record.id,
        operationId: record.operationId,
        employeeId: record.employeeId,
      });

      const pushRes = await client.call<{ success: boolean; transferToken?: string }>(
        'photo.relay.push',
        { packet }
      );

      if (pushRes.success) {
        await db.table('attendancePhotos').update(record.id, { status: 'siap_diambil' });
        pushed++;
      }
    } catch {}
  }

  // 3. Process reupload requests if ready photos exist
  if (targetReady.length > 0) {
    let handledByBatch = false;
    try {
      const batchRes = await client.call<{ success: boolean; requests: Array<{ photoId: string; ownerPublicKeyJwk?: JsonWebKey }> }>(
        'photo.relay.reupload_pending'
      );
      if (batchRes && Array.isArray(batchRes.requests)) {
        handledByBatch = true;
        for (const req of batchRes.requests) {
          const match = targetReady.find(r => r.id === req.photoId);
          if (match && match.blob && typeof match.blob !== 'string') {
            try {
              const targetPub = req.ownerPublicKeyJwk
                ? await importOwnerPublicKey(req.ownerPublicKeyJwk)
                : ownerCryptoPub;

              const rePacket = await encryptPhotoForOwner(match.blob, targetPub, {
                storeId,
                photoId: match.id,
                operationId: match.operationId,
                employeeId: match.employeeId,
              });

              const rePush = await client.call<{ success: boolean }>('photo.relay.push', { packet: rePacket });
              if (rePush.success) reuploaded++;
            } catch {}
          }
        }
      }
    } catch {}

    // Fallback: per-photo query if batch endpoint was unavailable
    if (!handledByBatch) {
      for (const record of targetReady) {
        if (!record.blob || typeof record.blob === 'string') continue;

        try {
          const check = await client.call<{ hasRequest: boolean; request?: { ownerPublicKeyJwk?: JsonWebKey } }>(
            'photo.relay.reupload_check',
            { photoId: record.id }
          );

          if (check.hasRequest) {
            const targetPub = check.request?.ownerPublicKeyJwk
              ? await importOwnerPublicKey(check.request.ownerPublicKeyJwk)
              : ownerCryptoPub;

            const rePacket = await encryptPhotoForOwner(record.blob, targetPub, {
              storeId,
              photoId: record.id,
              operationId: record.operationId,
              employeeId: record.employeeId,
            });

            const rePush = await client.call<{ success: boolean }>('photo.relay.push', { packet: rePacket });
            if (rePush.success) reuploaded++;
          }
        } catch {}
      }
    }
  }

  return { pushed, reuploaded };
}

let photoListenersAttached = false;

/**
 * Attaches online and visibility listeners to trigger background retry
 * for any pending attendance photos without polling or blocking normal operation.
 */
export function setupAttendancePhotoSyncListeners(
  getClientInfo: () => { client: DeviceClient; storeId: string; employeeId?: string } | null | undefined
): void {
  if (typeof window === 'undefined' || photoListenersAttached) return;
  photoListenersAttached = true;

  const retryHandler = () => {
    try {
      const info = getClientInfo();
      if (info?.client && info.storeId) {
        syncPendingAttendancePhotos(info.client, info.storeId, info.employeeId).catch(() => {});
      }
    } catch {}
  };

  window.addEventListener('online', retryHandler);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      retryHandler();
    }
  });
}

/**
 * Owner device: pulls, decrypts, saves to local IndexedDB, and ACKs a photo from R2 relay.
 */
export async function pullAndPersistAttendancePhoto(
  client: DeviceClient,
  photoId: string,
  ownerPrivateKey: CryptoKey,
  dexieDb = db
): Promise<AttendancePhotoRecord | null> {
  try {
    const pull = await client.call<{
      found: boolean;
      expired?: boolean;
      packet?: E2eePhotoPacket;
      transferToken?: string;
      envelopeHash?: string;
    }>('photo.relay.pull', { photoId });

    if (!pull.found || !pull.packet) return null;

    const { photoBytes, checksum } = await decryptPhotoAsOwner(pull.packet, ownerPrivateKey);
    const blob = new Blob([photoBytes as unknown as BlobPart], { type: 'image/jpeg' });

    const record: AttendancePhotoRecord = {
      id: pull.packet.photoId,
      operationId: pull.packet.operationId,
      employeeId: pull.packet.employeeId,
      employeeName: '',
      blob,
      checksum,
      createdAt: new Date(pull.packet.capturedAt).toISOString(),
      status: 'tersimpan',
    };

    await dexieDb.table('attendancePhotos').put(record);

    // Send ACK only after local IndexedDB save succeeds
    await client.call('photo.relay.ack', {
      photoId: pull.packet.photoId,
      checksum,
      transferToken: pull.transferToken,
      envelopeHash: pull.envelopeHash,
      operationId: pull.packet.operationId,
      employeeId: pull.packet.employeeId,
    });

    return record;
  } catch {
    return null;
  }
}
