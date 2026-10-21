import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

function harness(failAsset = false) {
  const handlers: Record<string, (event: any) => void> = {};
  const stores = new Map<string, Map<string, Response>>();
  let offline = false, activated = false;
  const key = (request: any) => new URL(typeof request === 'string' ? request : request.url, 'https://local.test').pathname;
  const cacheApi = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const data = stores.get(name)!;
    return {
      match: async (request: any) => data.get(key(request))?.clone(),
      put: async (request: any, response: Response) => { data.set(key(request), response.clone()); },
      addAll: async (urls: string[]) => {
        const responses = await Promise.all(urls.map(async url => { const response = await network(url); if (!response.ok) throw new Error('Asset unavailable'); return [url, response] as const; }));
        responses.forEach(([url, response]) => data.set(key(url), response));
      }
    };
  };
  const network = async (request: any) => {
    if (offline) throw new Error('Offline');
    const path = key(request);
    if (path === '/offline-manifest.json') return Response.json({ version: 'sakunota-pos-v2.6.0-stability', allUrls: ['/pos', '/admin/stok', '/app.js'] });
    return new Response(path, { status: failAsset && path === '/app.js' ? 503 : 200 });
  };
  const context = vm.createContext({ Response, URL, fetch: network, console, caches: {
    open: async (name: string) => cacheApi(name), keys: async () => [...stores.keys()], delete: async (name: string) => stores.delete(name),
    match: async (request: any) => { for (const data of stores.values()) { const response = data.get(key(request)); if (response) return response.clone(); } }
  }, self: { location: { origin: 'https://local.test' }, addEventListener: (name: string, handler: any) => { handlers[name] = handler; }, skipWaiting: async () => { activated = true; }, clients: { claim: async () => {} } } });
  vm.runInContext(fs.readFileSync('public/sw.js', 'utf8'), context);
  return { handlers, stores, setOffline: () => { offline = true; }, activated: () => activated };
}

test('offline install waits for all assets; failed build cannot activate', async () => {
  const h = harness(true);
  h.stores.set('sakunota-pos-previous', new Map([['/pos', new Response('old working POS')]]));
  let pending: Promise<void> | undefined;
  h.handlers.install({ waitUntil: (promise: Promise<void>) => { pending = promise; } });
  await assert.rejects(pending!, /Asset unavailable/);
  assert.equal(h.activated(), false);
  assert.ok(h.stores.get('sakunota-pos-previous')?.has('/pos'));
});

test('offline route identity is preserved and API responses never enter cache', async () => {
  const h = harness();
  let pending: Promise<void> | undefined;
  h.handlers.install({ waitUntil: (promise: Promise<void>) => { pending = promise; } });
  await pending; assert.equal(h.activated(), true);
  h.setOffline();
  async function navigate(path: string) {
    let result: Promise<Response> | undefined;
    h.handlers.fetch({ request: new Request('https://local.test'+path, { headers: { accept: 'text/html' } }), respondWith: (response: Promise<Response>) => { result = response; } });
    return result;
  }
  const stock = await navigate('/admin/stok');
  assert.equal(await stock!.text(), '/admin/stok');
  const missing = await navigate('/admin/missing');
  assert.equal(missing!.status, 503);
  assert.equal(await navigate('/api/owner/metrics'), undefined);
  assert.equal(await navigate('/api/payment/config'), undefined);
});

test('upgrade keeps the immediately previous production cache and its chunks for open tabs', async () => {
  const h = harness();
  const previous = 'sakunota-pos-v2.6.7-1792545587300';
  h.stores.set('sakunota-pos-older-build', new Map());
  h.stores.set(previous, new Map([['/_next/static/previous.js', new Response('previous chunk')]]));
  h.stores.set('unrelated-app-cache', new Map());
  let pending: Promise<void> | undefined;
  h.handlers.install({ waitUntil: (promise: Promise<void>) => { pending = promise; } });
  await pending;
  h.handlers.activate({ waitUntil: (promise: Promise<void>) => { pending = promise; } });
  await pending;
  assert.ok(h.stores.has(previous));
  assert.equal(h.stores.has('sakunota-pos-older-build'), false);
  assert.ok(h.stores.has('unrelated-app-cache'));
  h.setOffline();
  let result: Promise<Response> | undefined;
  h.handlers.fetch({ request: new Request('https://local.test/_next/static/previous.js'), respondWith: (response: Promise<Response>) => { result = response; } });
  assert.equal(await (await result!).text(), 'previous chunk');
});

test('new cached stock route remains available after activation while offline', async () => {
  const h = harness();
  let pending: Promise<void> | undefined;
  for (const lifecycle of ['install', 'activate']) {
    h.handlers[lifecycle]({ waitUntil: (promise: Promise<void>) => { pending = promise; } });
    await pending;
  }
  h.setOffline();
  let result: Promise<Response> | undefined;
  h.handlers.fetch({ request: new Request('https://local.test/admin/stok/', { headers: { accept: 'text/html' } }), respondWith: (response: Promise<Response>) => { result = response; } });
  assert.equal(await (await result!).text(), '/admin/stok');
});

test('failed update leaves previous production assets intact and never calls skipWaiting', async () => {
  const h = harness(true);
  const previous = 'sakunota-pos-v2.6.7-1792545587300';
  h.stores.set(previous, new Map([['/pos', new Response('working production POS')]]));
  let pending: Promise<void> | undefined;
  h.handlers.install({ waitUntil: (promise: Promise<void>) => { pending = promise; } });
  await assert.rejects(pending!, /Asset unavailable/);
  assert.equal(h.activated(), false);
  assert.equal(await h.stores.get(previous)!.get('/pos')!.text(), 'working production POS');
});
