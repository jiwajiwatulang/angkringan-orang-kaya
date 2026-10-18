import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import worker from '../src/worker';
import { createD1NodeAdapter } from '../src/lib/server/d1';

// Isolated preview: no production database, no real payment credentials.
const root = path.resolve('out');
const port = Number(process.env.PORT || 4370);
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webp': 'image/webp', '.txt': 'text/plain' };
const env = {
  DB: createD1NodeAdapter(':memory:'),
  SAKUNOTA_OWNER_USERNAME: 'preview-owner', SAKUNOTA_OWNER_PASSWORD: 'Preview-Local-Only!',
  SAKUNOTA_OWNER_SALT: 'preview-only-salt', SAKUNOTA_SERVER_SECRET: 'preview-only-license-secret', SAKUNOTA_OWNER_JWT_SECRET: 'preview-only-session-secret',
  ASSETS: { fetch: async (request: Request | string) => {
    const pathname = decodeURIComponent(new URL(typeof request === 'string' ? request : request.url).pathname);
    for (const relative of [pathname, pathname === '/' ? '/index.html' : pathname+'.html', pathname+'/index.html']) {
      const target = path.resolve(root, '.'+relative);
      if (!target.startsWith(root+path.sep)) continue;
      if (fs.existsSync(target) && fs.statSync(target).isFile()) return new Response(fs.readFileSync(target), { headers: { 'Content-Type': mime[path.extname(target)] || 'application/octet-stream', 'Service-Worker-Allowed': '/', 'Cache-Control': 'no-cache' } });
    }
    return new Response('Not found', { status: 404 });
  } }
};

http.createServer(async (req, res) => {
  try {
    const chunks: Buffer[] = []; for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, ...(body.length ? { body } : {}) });
    const response = await worker.fetch(request, env, {});
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) { console.error(error); res.writeHead(500); res.end('Local preview error'); }
}).listen(port, '127.0.0.1', () => {
  console.log(`SakuNota local preview: http://localhost:${port}`);
  console.log('Owner test login: preview-owner / Preview-Local-Only!');
  console.log('Payments disabled: no Midtrans key. All owner data lives in local memory.');
});
