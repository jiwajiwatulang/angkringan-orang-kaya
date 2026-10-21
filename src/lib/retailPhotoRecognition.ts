import { productNameFromText } from './retailDraft';
export const PHOTO_CACHE = 'sakunota-retail-photo-v1';
const ROOT = '/retail-photo/v1';
const FILES = ['worker.min.js', 'tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm', 'eng.traineddata.gz'];
export function supportsPhotoRecognition() {
  return typeof window !== 'undefined' && window.isSecureContext && 'caches' in window && 'Worker' in window && 'WebAssembly' in window && 'serviceWorker' in navigator;
}
export async function photoRecognitionReady(assetsOnly = false) {
  if (!supportsPhotoRecognition()) return false;
  const cache = await caches.open(PHOTO_CACHE);
  if (!assetsOnly && !await cache.match(`${ROOT}/ready.json`)) return false;
  return (await Promise.all(FILES.map(name => cache.match(`${ROOT}/${name}`)))).every(Boolean);
}
export async function preparePhotoRecognition(progress: (percent: number) => void, signal?: AbortSignal) {
  if (!supportsPhotoRecognition()) throw new Error('Pengenalan foto belum tersedia di perangkat ini.');
  const response = await fetch(`${ROOT}/manifest.json`, { cache: 'no-store', signal });
  if (!response.ok) throw new Error('Persiapan belum berhasil. Periksa koneksi lalu coba lagi.');
  const manifest = await response.json();
  const assets: { url: string; sha256: string; bytes: number }[] = manifest.assets;
  if (!Array.isArray(assets) || assets.length !== FILES.length || FILES.some(name => !assets.some(a => a.url === `${ROOT}/${name}`))) throw new Error('Persiapan belum tersedia. Coba lagi nanti.');
  const cache = await caches.open(PHOTO_CACHE);
  // Commit only after every file passes its checksum; an interrupted first download is never ready.
  const responses: [string, Response][] = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const fetched = await fetch(asset.url, { cache: 'no-store', signal });
    if (!fetched.ok) throw new Error('Unduhan terputus. Coba lagi saat internet tersedia.');
    const bytes = await fetched.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== asset.bytes || hash !== asset.sha256) throw new Error('Unduhan belum lengkap. Coba lagi.');
    responses.push([asset.url, new Response(bytes, { headers: fetched.headers })]);
    progress(Math.round((i + 1) / assets.length * 100));
  }
  for (const [url, result] of responses) { signal?.throwIfAborted(); await cache.put(url, result); }
}
export async function setupPhotoRecognition(progress: (percent: number) => void, signal = new AbortController().signal) {
  if (!navigator.onLine) throw new Error('Persiapan memerlukan internet sekali. Foto tetap bisa disimpan dengan nama manual.');
  await preparePhotoRecognition(progress, signal);
  if (!navigator.serviceWorker.controller) await new Promise<void>((resolve, reject) => {
    const finish = (error?: Error) => {
      clearTimeout(timer); navigator.serviceWorker.removeEventListener('controllerchange', changed); signal.removeEventListener('abort', aborted);
      if (error) reject(error); else resolve();
    };
    const changed = () => { if (navigator.serviceWorker.controller) finish(); };
    const aborted = () => finish(new Error('Persiapan dibatalkan.'));
    const timer = setTimeout(() => finish(new Error('Persiapan offline belum selesai. Tunggu sebentar lalu coba lagi.')), 20000);
    navigator.serviceWorker.addEventListener('controllerchange', changed); signal.addEventListener('abort', aborted, { once: true });
    if (signal.aborted) aborted(); else changed();
  });
  signal.throwIfAborted();
  const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 80;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Pengenalan foto tidak didukung browser ini. Gunakan Isi Manual.');
  ctx.fillStyle = 'white'; ctx.fillRect(0, 0, 300, 80); ctx.fillStyle = 'black'; ctx.font = '32px Arial'; ctx.fillText('KOPI ORIGINAL', 10, 50);
  await recognizeProductPhoto(canvas.toDataURL('image/png'), signal, true);
  signal.throwIfAborted();
  await confirmPhotoRecognitionReady();
}
export async function recognizeProductPhoto(image: string, signal: AbortSignal, preparing = false, fullText = false): Promise<string> {
  if (!await photoRecognitionReady(preparing) || !navigator.serviceWorker.controller) throw new Error('Pengenalan foto belum tersedia di perangkat ini.');
  const { createWorker, OEM, PSM } = await import('tesseract.js');
  let worker: Awaited<ReturnType<typeof createWorker>> | undefined;
  let stopped = false;
  let rejectStopped: (reason: Error) => void = () => {};
  const interrupted = new Promise<never>((_, reject) => { rejectStopped = reject; });
  const stop = () => { stopped = true; void worker?.terminate(); rejectStopped(new Error('Foto belum terbaca')); };
  const timeout = setTimeout(stop, 45000);
  signal.addEventListener('abort', stop, { once: true });
  try {
    if (signal.aborted) throw new Error('Foto belum terbaca');
    const task = (async () => {
      worker = await createWorker('eng', OEM.LSTM_ONLY, { workerPath: `${ROOT}/worker.min.js`, corePath: `${ROOT}/tesseract-core-lstm.wasm.js`, langPath: ROOT, cacheMethod: 'none', workerBlobURL: false, gzip: true, errorHandler: () => stop() });
      if (stopped) { await worker.terminate(); throw new Error('Foto belum terbaca'); }
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT });
      let result = await worker.recognize(image, {}, { blocks: true });
      if (stopped) throw new Error('Foto belum terbaca');
      const readableLines = () => (result.data.blocks || []).flatMap(b => b.paragraphs.flatMap(p => p.lines)).filter(line => line.confidence >= 45 && /[a-zA-Z]{3}/.test(line.text)).map(line => line.text.trim()).filter(Boolean).join('\n');
      // A second, contrast-adjusted pass helps colored packaging without retaining another photo.
      if (!productNameFromText(readableLines()) && result.data.confidence < 35 && typeof createImageBitmap === 'function') {
        let bitmap: ImageBitmap | undefined;
        try {
          bitmap = await createImageBitmap(await (await fetch(image)).blob());
          const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
          const ctx = canvas.getContext('2d');
          if (ctx && !stopped) { ctx.filter = 'grayscale(1) contrast(1.6)'; ctx.drawImage(bitmap, 0, 0); result = await worker.recognize(canvas, {}, { blocks: true }); }
        } finally { bitmap?.close(); }
      }
      if (stopped) throw new Error('Foto belum terbaca');
      const text = readableLines() || (result.data.confidence >= 35 ? result.data.text : '');
      const name = productNameFromText(text);
      if (!name) throw new Error('Foto belum terbaca');
      return fullText ? text.slice(0, 4000) : name;
    })();
    return await Promise.race([task, interrupted]);
  } finally {
    clearTimeout(timeout); signal.removeEventListener('abort', stop); await worker?.terminate();
  }
}
export async function confirmPhotoRecognitionReady() {
  await (await caches.open(PHOTO_CACHE)).put(`${ROOT}/ready.json`, new Response('1'));
}
