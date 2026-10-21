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
export async function preparePhotoRecognition(progress: (percent: number) => void) {
  if (!supportsPhotoRecognition()) throw new Error('Pengenalan foto belum tersedia di perangkat ini.');
  const response = await fetch(`${ROOT}/manifest.json`, { cache: 'no-store' });
  if (!response.ok) throw new Error('Persiapan belum berhasil. Periksa koneksi lalu coba lagi.');
  const manifest = await response.json();
  const assets: { url: string; sha256: string; bytes: number }[] = manifest.assets;
  if (!Array.isArray(assets) || assets.length !== FILES.length || FILES.some(name => !assets.some(a => a.url === `${ROOT}/${name}`))) throw new Error('Persiapan belum tersedia. Coba lagi nanti.');
  const cache = await caches.open(PHOTO_CACHE);
  // Commit only after every file passes its checksum; an interrupted first download is never ready.
  const responses: [string, Response][] = [];
  for (let i = 0; i < assets.length; i++) {
    const asset = assets[i];
    const fetched = await fetch(asset.url, { cache: 'no-store' });
    if (!fetched.ok) throw new Error('Unduhan terputus. Coba lagi saat internet tersedia.');
    const bytes = await fetched.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== asset.bytes || hash !== asset.sha256) throw new Error('Unduhan belum lengkap. Coba lagi.');
    responses.push([asset.url, new Response(bytes, { headers: fetched.headers })]);
    progress(Math.round((i + 1) / assets.length * 100));
  }
  for (const [url, result] of responses) await cache.put(url, result);
}
export async function recognizeProductPhoto(image: string, signal: AbortSignal, preparing = false): Promise<string> {
  if (!await photoRecognitionReady(preparing) || !navigator.serviceWorker.controller) throw new Error('Pengenalan foto belum tersedia di perangkat ini.');
  const { createWorker, OEM } = await import('tesseract.js');
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
      const result = await worker.recognize(image);
      if (stopped) throw new Error('Foto belum terbaca');
      const name = productNameFromText(result.data.text);
      if (!name || result.data.confidence < 35) throw new Error('Foto belum terbaca');
      return name;
    })();
    return await Promise.race([task, interrupted]);
  } finally {
    clearTimeout(timeout); signal.removeEventListener('abort', stop); await worker?.terminate();
  }
}
export async function confirmPhotoRecognitionReady() {
  await (await caches.open(PHOTO_CACHE)).put(`${ROOT}/ready.json`, new Response('1'));
}
