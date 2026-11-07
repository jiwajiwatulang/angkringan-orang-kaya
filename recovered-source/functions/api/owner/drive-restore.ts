import { extractBearerToken, getD1, verifyOwnerSession } from '../../../src/lib/server/sakunotaServer';
import { fromBase64Url } from '../../../src/lib/licenseProtocol';

type Row = { storeId: string; revision?: number; sequence?: number };
type Archive = {
  version: number;
  store: { id: string; revision: number };
  entities: Row[];
  events: Row[];
  payloadChunks: Row[];
};

const tables = [
  { name: 'MdEntities', field: 'entities', columns: ['kind', 'id', 'revision', 'payload'] },
  { name: 'MdEvents', field: 'events', columns: ['id', 'deviceId', 'operatorId', 'kind', 'entityId', 'payload', 'digest', 'receivedAt'] },
  { name: 'MdPayloadChunks', field: 'payloadChunks', columns: ['kind', 'id', 'part', 'payload'] },
] as const;

export async function onRequestPost({ request, env }: {
  request: Request; env: { DB: Parameters<typeof getD1>[0]; SAKUNOTA_DRIVE_BACKUP?: string; SAKUNOTA_RECOVERY_KEY?: string };
}) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    const db = getD1(env.DB);
    const auth = await verifyOwnerSession(db, extractBearerToken(request.headers.get('Authorization') || ''));
    if (!auth.valid) return reply({ error: 'Silakan login kembali.' }, 401);

    const recoveryKey = env.SAKUNOTA_RECOVERY_KEY || JSON.parse(env.SAKUNOTA_DRIVE_BACKUP || '{}').encryptionKey;
    if (!/^[a-f0-9]{64}$/i.test(recoveryKey || '')) return reply({ error: 'Kunci cadangan belum disiapkan.' }, 503);
    const body = await request.json().catch(() => null);
    if (typeof body?.licenseKey !== 'string' || !/^SN-[A-Z0-9-]{3,100}$/i.test(body.licenseKey)) {
      return reply({ error: 'Pilih lisensi toko yang valid.' }, 400);
    }
    const file = body.archive;
    if (file?.format !== 'sakunota-d1-backup-v1' || file.algorithm !== 'aes-256-gcm' ||
        typeof file.iv !== 'string' || typeof file.tag !== 'string' || typeof file.ciphertext !== 'string' ||
        file.iv.length > 24 || file.tag.length > 32 || file.ciphertext.length > 5_000_000) {
      return reply({ error: 'Pilih file cadangan SakuNota yang sesuai, maksimal 5 MB.' }, 400);
    }

    let archive: Archive;
    try {
      // Earlier archives use standard base64. Portal archives use base64url.
      const decode = (value: string) => fromBase64Url(value.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'));
      const ciphertext = decode(file.ciphertext);
      const tag = decode(file.tag);
      const iv = decode(file.iv);
      if (iv.length !== 12 || tag.length !== 16) throw new Error('Invalid archive');
      const encrypted = new Uint8Array(ciphertext.length + tag.length);
      encrypted.set(ciphertext);
      encrypted.set(tag, ciphertext.length);
      const bytes = Uint8Array.from((recoveryKey as string).match(/../g)!, pair => parseInt(pair, 16));
      const key = await crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['decrypt']);
      const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted);
      archive = JSON.parse(new TextDecoder().decode(plaintext));
    } catch {
      return reply({ error: 'Cadangan tidak bisa dibuka dengan kunci yang tersedia.' }, 400);
    }

    const store = await db.prepare('SELECT id, revision FROM MdStores WHERE licenseKey = ?')
      .bind(body.licenseKey.toUpperCase()).first<{ id: string; revision: number }>();
    if (!store || archive?.version !== 1 || archive.store?.id !== store.id) {
      return reply({ error: 'Cadangan ini tidak cocok dengan toko yang dipilih.' }, 409);
    }
    const revision = archive.store.revision;
    if (!Number.isSafeInteger(revision) || revision < 1 || !Number.isSafeInteger(store.revision + revision) ||
        tables.some(({ field }) => !Array.isArray(archive[field]) || archive[field].some(row => row?.storeId !== store.id)) ||
        !archive.entities.length || archive.entities.some(row => !Number.isSafeInteger(row.revision) || row.revision! < 1 || row.revision! > revision)) {
      return reply({ error: 'Isi cadangan belum lengkap.' }, 400);
    }

    const marker = crypto.randomUUID();
    // Only an empty store can accept an archive. Every insert shares the batch's claim.
    const statements = [db.prepare(`UPDATE MdStores SET revision = ?, mutation = ? WHERE id = ? AND revision = ?
      AND NOT EXISTS (SELECT 1 FROM MdEntities WHERE storeId = MdStores.id)
      AND NOT EXISTS (SELECT 1 FROM MdEvents WHERE storeId = MdStores.id)
      AND NOT EXISTS (SELECT 1 FROM MdPayloadChunks WHERE storeId = MdStores.id) RETURNING revision`)
      .bind(store.revision + revision, marker, store.id, store.revision)];
    const encoder = new TextEncoder();
    for (const { name, field, columns } of tables) {
      const rows = field === 'events' ? [...archive[field]].sort((a, b) => Number(a.sequence) - Number(b.sequence)) : archive[field];
      const fields = columns.map(column => column === 'revision'
        ? "json_extract(value, '$.revision') + " + store.revision
        : "json_extract(value, '$." + column + "')");
      const insert = db.prepare(`INSERT INTO ${name}(storeId, ${columns.join(', ')})
        SELECT ?, ${fields.join(', ')} FROM json_each(?)
        WHERE EXISTS (SELECT 1 FROM MdStores WHERE id = ? AND mutation = ?) ORDER BY CAST(key AS INTEGER)`);
      let lines: string[] = [];
      let size = 2;
      for (const row of rows) {
        const line = JSON.stringify(row);
        const length = encoder.encode(line).byteLength + 1;
        if (length > 90_000) return reply({ error: 'Ada bagian cadangan yang terlalu besar untuk dipulihkan.' }, 400);
        if (size + length > 90_000) {
          statements.push(insert.bind(store.id, '[' + lines.join(',') + ']', store.id, marker));
          lines = [];
          size = 2;
        }
        lines.push(line);
        size += length;
      }
      if (lines.length) statements.push(insert.bind(store.id, '[' + lines.join(',') + ']', store.id, marker));
    }
    if (statements.length > 90) return reply({ error: 'Cadangan terlalu besar untuk dipulihkan sekaligus.' }, 400);
    const results = await db.batch(statements);
    if (results.some(result => !result.success)) return reply({ error: 'Data belum berhasil dipulihkan.' }, 503);
    if (!results[0]?.results?.length) return reply({ error: 'Toko sudah berisi data. Pemulihan dihentikan agar transaksi tetap aman.' }, 409);
    return reply({ success: true });
  } catch {
    return reply({ error: 'Data belum berhasil dipulihkan. Coba lagi.' }, 503);
  }
}
