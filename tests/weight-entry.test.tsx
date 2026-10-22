import React, { act } from 'react';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import WeightEntry from '../src/components/WeightEntry';

test('cashier weight entry: focus, comma input, live price, stock validation, submit, cancel and editing', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/' });
  const saved = new Map<string, PropertyDescriptor | undefined>();
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, HTMLInputElement: dom.window.HTMLInputElement, React, IS_REACT_ACT_ENVIRONMENT: true })) {
    saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key)); Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  }
  dom.window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); this.querySelector('input')?.focus(); };
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  let confirmed: number | undefined, closed = 0;
  const product = { nama: 'Beras Premium', harga: 18000, saleUnit: 'weight' as const, priceBasis: 1000 as const, trackStock: true, stockQty: 2000 };
  const render = async (key: string, initialGrams?: number) => act(async () => root.render(<WeightEntry key={key} product={product} initialGrams={initialGrams} onConfirm={g => { confirmed = g; }} onClose={() => closed++} />));
  const input = () => dom.window.document.querySelector('input')!;
  const form = () => dom.window.document.querySelector('form')!;
  async function type(text: string) {
    await act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value')!.set!.call(input(), text);
      input().dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
  }
  async function submit() { await act(async () => form().dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true }))); }
  try {
    await render('new'); assert.ok(dom.window.document.activeElement === input(), 'weight field receives focus'); assert.ok(dom.window.document.querySelector('dialog[open]'));
    await submit(); assert.match(dom.window.document.body.textContent!, /Masukkan berat barang/);
    await type('250'); assert.equal(dom.window.document.querySelector('output')!.textContent, 'Rp4.500'); await submit(); assert.equal(confirmed, 250);
    await act(async () => { const select = dom.window.document.querySelector('select')!; select.value = 'kg'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.equal(input().value, '0,25'); await type('1,25'); assert.equal(dom.window.document.querySelector('output')!.textContent, 'Rp22.500'); await submit(); assert.equal(confirmed, 1250);
    await type('2,1'); await submit(); assert.match(dom.window.document.body.textContent!, /Stok tidak mencukupi/); assert.equal(confirmed, 1250);
    await type('0'); await submit(); assert.match(dom.window.document.body.textContent!, /Berat harus lebih dari 0/);
    await act(async () => (dom.window.document.querySelector('button[type="button"]') as HTMLButtonElement).click()); assert.equal(closed, 1);
    await act(async () => dom.window.document.querySelector('dialog')!.dispatchEvent(new dom.window.Event('cancel', { cancelable: true }))); assert.equal(closed, 2);
    await render('edit', 500); assert.equal(input().value, '500'); assert.match(dom.window.document.body.textContent!, /Simpan Berat/); await type('750'); await submit(); assert.equal(confirmed, 750);
    assert.doesNotMatch(form().textContent!, /IndexedDB|Dexie|precision|snapshot|debug|v1\.0|API/);
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of saved) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key); }
  }
});
