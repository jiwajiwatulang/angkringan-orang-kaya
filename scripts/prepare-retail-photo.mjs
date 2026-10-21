import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(import.meta.url);
const output = path.resolve('public/retail-photo/v1');
await mkdir(output, { recursive: true });
const files = [
  ['tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['tesseract.js-core/tesseract-core-lstm.wasm', 'tesseract-core-lstm.wasm'],
  ['@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz', 'eng.traineddata.gz'],
];
const assets = [];
for (const [source, name] of files) {
  await copyFile(require.resolve(source), path.join(output, name));
  const bytes = await readFile(path.join(output, name));
  assets.push({ url: `/retail-photo/v1/${name}`, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
const notices = [
  ['Tesseract.js (Apache-2.0)', 'tesseract.js/LICENSE.md'],
  ['Tesseract.js bundled dependencies', 'tesseract.js/dist/worker.min.js.LICENSE.txt'],
  ['Tesseract.js Core (Apache-2.0)', 'tesseract.js-core/LICENSE'],
];
let noticeText = '@tesseract.js-data/eng 1.0.0: MIT, author Balearica; contributor Jerome Wu.\nSource: https://github.com/naptha/tessdata\n';
for (const [title, source] of notices) noticeText += `\n${title}\n${await readFile(require.resolve(source), 'utf8')}\n`;
await writeFile(path.join(output, 'THIRD_PARTY_LICENSES.txt'), noticeText);
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ version: 1, assets }));
console.log('Product photo recognition assets prepared locally.');
