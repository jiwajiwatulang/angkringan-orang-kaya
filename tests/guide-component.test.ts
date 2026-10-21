import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import FirstRunGuide from '../src/components/FirstRunGuide';
import { FIRST_RUN_GUIDE_KEY } from '../src/lib/firstRunGuide';

test('interactive guide locks the workspace, advances on action, restores access after Skip and stays dismissed on remount', async () => {
  const dom = new JSDOM('<!doctype html><body><main><button id="admin">Admin</button><button id="product" data-guide-product>Produk</button><section data-guide="cart"><button data-guide-quantity>+</button></section></main><div id="root"></div></body>', { url: 'https://example.test', pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, requestAnimationFrame: dom.window.requestAnimationFrame.bind(dom.window), cancelAnimationFrame: dom.window.cancelAnimationFrame.bind(dom.window), IS_REACT_ACT_ENVIRONMENT: true });
  dom.window.HTMLElement.prototype.getClientRects = function () { return [{ width: 100, height: 40 }] as unknown as DOMRectList; };
  Object.defineProperty(dom.window.HTMLElement.prototype, 'inert', { configurable: true, get() { return this.hasAttribute('inert'); }, set(value) { this.toggleAttribute('inert', value); } });
  const { createRoot } = await import('react-dom/client');
  const props = { ready: true, demo: true, hasShift: true, hasItems: false, paymentOpen: false, savedReceipt: false, hasMenus: true, labelsEnabled: false, restartToken: 0, onNavigate: () => {} };
  let root = createRoot(dom.window.document.getElementById('root')!);
  const render = async () => act(async () => { root.render(React.createElement(FirstRunGuide, props)); await new Promise(resolve => setTimeout(resolve, 30)); });
  const clickText = async (text: string) => act(async () => { [...dom.window.document.querySelectorAll('button')].find(button => button.textContent === text)!.click(); await new Promise(resolve => setTimeout(resolve, 30)); });
  const outside = () => { const event = new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }); dom.window.document.getElementById('admin')!.dispatchEvent(event); return event.defaultPrevented; };
  try {
    await render(); await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.equal(outside(), true);
    await clickText('Mulai Panduan');
    assert.match(dom.window.document.body.textContent!, /2. Pilih produk/);
    props.hasItems = true; await render();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.match(dom.window.document.body.textContent!, /3. Periksa keranjang/);
    assert.equal(outside(), true);
    await clickText('Lewati');
    assert.equal(outside(), false);
    assert.equal(JSON.parse(dom.window.localStorage.getItem(FIRST_RUN_GUIDE_KEY)!).status, 'skipped');
    await act(async () => root.unmount());
    root = createRoot(dom.window.document.getElementById('root')!);
    props.demo = false; await render();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.equal(dom.window.document.querySelector('[aria-labelledby="first-run-title"]'), null);
    assert.equal(outside(), false);
    props.restartToken = 1; await render();
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); });
    assert.match(dom.window.document.body.textContent!, /Kenali kasir/);
    assert.equal(outside(), true);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
