import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
// Check the shipped artifact, not merely the source feature switch.
const config=JSON.parse(fs.readFileSync('wrangler.jsonc','utf8').replace(/^\s*\/\/.*$/gm,''));
assert.equal(config.vars?.SAKUNOTA_MULTI_DEVICE,'enabled','Production device access must remain enabled after deployment.');
const chunks=path.resolve('out/_next/static/chunks');
const scripts=fs.readdirSync(chunks).filter(file=>file.endsWith('.js')).map(file=>fs.readFileSync(path.join(chunks,file),'utf8'));
const settings=scripts.find(script=>script.includes('Pusat Pengaturan SakuNota'));
assert.ok(settings,'Built settings page must exist.');
assert.ok(settings.includes('/admin/pengaturan/perangkat'),'Built settings page must contain the devices link.');
assert.ok(settings.includes('Perangkat & Karyawan'),'Built settings page must show the devices label.');
assert.ok(fs.existsSync('out/admin/pengaturan/perangkat.html'),'Devices page must be exported.');
console.log('PASS: the production build includes the visible devices menu and the server release configuration enables access.');
