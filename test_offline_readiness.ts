import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

// Validate the actual exported build, rather than matching source-code phrases.
const root = path.resolve('out');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'offline-manifest.json'), 'utf8'));
assert.equal(manifest.totalFiles, manifest.allUrls.length);
assert.equal(new Set(manifest.allUrls).size, manifest.allUrls.length, 'manifest URLs must be unique');
for (const route of ['/pos', '/admin', '/admin/stok', '/admin/menu', '/admin/pengaturan/data', '/panduan']) assert.ok(manifest.routes.includes(route), `${route} must be available offline`);
for (const url of manifest.allUrls) {
  assert.ok(url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/api/'), `invalid cache target ${url}`);
  assert.ok(!/\.env|\.sql|\.db(?:$|\.)/.test(url), 'private files must not be cached');
  const relative = url === '/' ? '/index.html' : url;
  const candidates = [relative, relative+'.html', relative+'/index.html'].map(p => path.resolve(root, '.'+p));
  assert.ok(candidates.some(p => p.startsWith(root+path.sep) && fs.existsSync(p) && fs.statSync(p).isFile()), `Missing offline build file: ${url}`);
}
const worker = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
assert.ok(worker.includes(manifest.version), 'service worker and manifest build versions must match');
console.log(`PASS: ${manifest.totalFiles} offline URLs resolve to real build files; POS, inventory, backup, and guide included. API and private files excluded.`);
