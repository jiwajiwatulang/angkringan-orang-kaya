import { db, type AttendancePhotoRecord } from './dexie';

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
  initialQuality = 0.75
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
 * Executes both photo staging and operation saving inside a single native Dexie transaction.
 * If anything fails or crashes, IndexedDB aborts the entire transaction atomically.
 */
export async function recordAttendanceWithPhotoAtomic(
  saveOpFn: (params: {
    kind: 'attendance.in' | 'attendance.out';
    employeeId: string;
    employeeName: string;
    sessionId?: string;
    photoId?: string;
    photoStatus?: 'lokal' | 'tanpa_foto';
    photoChecksum?: string;
    photoReason?: string;
  }) => Promise<unknown>,
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
  return db.transaction(
    'rw',
    ['operations', 'orders', 'orderItems', 'shifts', 'cashMovements', 'auditLogs', 'attendancePhotos'],
    async () => {
      if (params.photo) {
        const photoRecord: AttendancePhotoRecord = {
          id: params.photo.photoId,
          operationId: params.sessionId || params.photo.photoId,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          blob: params.photo.blob, // Native Blob stored in IndexedDB
          checksum: params.photo.checksum,
          createdAt: new Date().toISOString(),
          status: 'lokal',
        };
        await db.table<AttendancePhotoRecord>('attendancePhotos').put(photoRecord);

        return await saveOpFn({
          kind: params.kind,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          sessionId: params.sessionId,
          photoId: params.photo.photoId,
          photoStatus: 'lokal',
          photoChecksum: params.photo.checksum,
        });
      } else {
        return await saveOpFn({
          kind: params.kind,
          employeeId: params.employeeId,
          employeeName: params.employeeName,
          sessionId: params.sessionId,
          photoStatus: 'tanpa_foto',
          photoReason: params.withoutPhoto?.reason || 'Tanpa keterangan',
        });
      }
    }
  );
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
      return (now - Date.parse(p.createdAt)) > 10 * 60 * 1000;
    });

    if (orphans.length > 0) {
      await dexieDb.table('attendancePhotos').bulkDelete(orphans.map(o => o.id));
    }
    return { cleanedPhotos: orphans.length };
  } catch {
    return { cleanedPhotos: 0 };
  }
}
