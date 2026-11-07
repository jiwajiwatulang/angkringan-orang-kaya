import { extractBearerToken, getD1, verifyOwnerSession } from '../../../src/lib/server/sakunotaServer';
import { toBase64Url } from '../../../src/lib/licenseProtocol';

interface BackupEnv {
  DB: Parameters<typeof getD1>[0];
  SAKUNOTA_RECOVERY_KEY?: string;
}

export async function onRequestPost({ request, env }: { request: Request; env: BackupEnv }) {
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
  try {
    const db = getD1(env.DB);
    const auth = await verifyOwnerSession(db, extractBearerToken(request.headers.get('Authorization') || ''));
    if (!auth.valid) return reply({ error: 'Silakan login kembali.' }, 401);

    const body = await request.json().catch(() => null) as { licenseKey?: unknown } | null;
    if (typeof body?.licenseKey !== 'string' || !/^SN-[A-Z0-9-]{3,100}$/i.test(body.licenseKey)) {
      return reply({ error: 'Pilih lisensi toko yang valid.' }, 400);
    }
    const recoveryKey = env.SAKUNOTA_RECOVERY_KEY;
    if (!recoveryKey || !/^[a-f0-9]{64}$/i.test(recoveryKey)) {
      return reply({ error: 'Kunci cadangan belum disiapkan.' }, 503);
    }

    const licenseKey = body.licenseKey.toUpperCase();
    const store = await db.prepare('SELECT id FROM MdStores WHERE licenseKey = ?').bind(licenseKey).first<{ id: string }>();
    if (!store) return reply({ error: 'Toko ini belum memiliki data yang tersinkron.' }, 404);
    const results = await db.batch([
      db.prepare('SELECT id, revision FROM MdStores WHERE id = ?').bind(store.id),
      db.prepare('SELECT * FROM MdEntities WHERE storeId = ? ORDER BY kind, id').bind(store.id),
      db.prepare('SELECT * FROM MdEvents WHERE storeId = ? ORDER BY sequence').bind(store.id),
      db.prepare('SELECT * FROM MdPayloadChunks WHERE storeId = ? ORDER BY kind, id, part').bind(store.id),
      db.prepare('SELECT id, storeId, name, epoch, active FROM MdEmployees WHERE storeId = ? ORDER BY id').bind(store.id),
    ]);
    const [stores, entities, events, payloadChunks, employees] = results.map(result => result.results);
    if (!stores[0] || results.some(result => !result.success)) return reply({ error: 'Data toko belum dapat dibaca.' }, 503);
    if (!entities.length && !events.length) return reply({ error: 'Toko ini belum memiliki data yang tersinkron.' }, 404);

    const capturedAt = new Date().toISOString();
    const rawKey = Uint8Array.from(recoveryKey.match(/../g)!, pair => parseInt(pair, 16));
    const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const archive = new TextEncoder().encode(JSON.stringify({ version: 1, capturedAt, store: stores[0], entities, events, payloadChunks, employees }));
    const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, archive));
    const file = JSON.stringify({
      format: 'sakunota-d1-backup-v1',
      algorithm: 'aes-256-gcm',
      iv: toBase64Url(iv),
      tag: toBase64Url(encrypted.subarray(-16)),
      ciphertext: Array.from({ length: Math.ceil((encrypted.length - 16) / 24576) }, (_, i) =>
        toBase64Url(encrypted.subarray(i * 24576, Math.min((i + 1) * 24576, encrypted.length - 16)))).join(''),
    });

    if (file.length > 5_000_000) return reply({ error: 'Data terlalu besar untuk dicadangkan dengan cara ini.' }, 413);

    const name = 'SakuNota-' + store.id.slice(0, 12) + '-' + capturedAt.replace(/[:.]/g, '-') + '.encrypted.json';
    return new Response(file, { headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="' + name + '"',
      'Cache-Control': 'no-store',
    } });
  } catch {
    return reply({ error: 'Cadangan belum berhasil dibuat. Coba lagi.' }, 503);
  }
}
