import { db, type AttendancePhotoRecord } from './dexie';

export const MAX_PHOTO_BYTES = 250 * 1024; // 250 KB target cap
export const DEFAULT_RETENTION_DAYS = 30;

/** Computes hex-encoded SHA-256 checksum for byte integrity validation. */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data as ArrayBuffer);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compresses an image element or video frame to JPEG using HTML5 Canvas.
 * Caps the maximum dimension to maxDim (default 1080px) and applies quality compression.
 */
export async function compressAttendancePhoto(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  maxDim = 1080,
  quality = 0.75
): Promise<{ blob: Blob; dataUrl: string; checksum: string; width: number; height: number; sizeBytes: number }> {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    throw new Error('Dimensi gambar tidak valid.');
  }

  let targetWidth = sourceWidth;
  let targetHeight = sourceHeight;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
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
      quality
    );
  });

  const arrayBuffer = await blob.arrayBuffer();
  const checksum = await sha256Hex(arrayBuffer);

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Gagal membaca data foto.'));
    reader.readAsDataURL(blob);
  });

  return {
    blob,
    dataUrl,
    checksum,
    width: targetWidth,
    height: targetHeight,
    sizeBytes: blob.size,
  };
}

/**
 * Saves or updates an attendance photo record in local IndexedDB.
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
