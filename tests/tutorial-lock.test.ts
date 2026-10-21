import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { installTutorialLock, tutorialTargets } from '../src/lib/tutorialLock';

function scene() {
  const dom = new JSDOM(`<!doctype html><body>
    <nav><button id="admin">Admin</button></nav>
    <main><button id="sold" data-guide-product disabled>Habis</button><button id="product" data-guide-product>Produk A</button><button id="other" data-guide-product>Produk B</button>
    <section data-guide="cart"><button id="minus" data-guide-quantity>−</button><button id="plus" data-guide-quantity>+</button><button id="discount">Diskon</button><button id="checkout" data-guide-checkout>Bayar</button></section>
    <section data-guide="shift"><form id="shift"><input id="operator"><button id="save">Simpan</button></form></section>
    <section data-guide="payment"><button id="cash" data-guide-payment-method>Cash</button><button id="credit">Kasbon</button><div data-guide-payment-cash><input id="amount"><button id="exact">Pas</button></div><button id="pay" data-guide-payment-confirm>Bayar</button><button id="split">Split</button></section></main>
    <aside id="panel" tabindex="-1"><button data-guide-skip id="skip">Lewati</button><button id="next">Lanjut</button></aside></body>`, { url: 'https://example.test' });
  // jsdom has no layout; this stub only defines which test controls are visible.
  dom.window.HTMLElement.prototype.getClientRects = function () { return (this.closest('[hidden]') ? [] : [{ width: 100, height: 40 }]) as unknown as DOMRectList; };
  Object.defineProperty(dom.window.HTMLElement.prototype, 'inert', { configurable: true, get() { return this.hasAttribute('inert'); }, set(value) { this.toggleAttribute('inert', value); } });
  const doc = dom.window.document;
  const get = (id: string) => doc.getElementById(id)!;
  const fire = (id: string, type = 'click') => {
    const event = new dom.window.Event(type, { bubbles: true, cancelable: true });
    get(id).dispatchEvent(event); return event;
  };
  return { dom, doc, get, fire, panel: get('panel') };
}

test('catalog permits only the highlighted available product and tutorial buttons', () => {
  const { dom, doc, panel, fire, get } = scene();
  const cleanup = installTutorialLock(doc, panel, 'catalog', () => {});
  let product = 0, outside = 0;
  get('product').addEventListener('click', () => product++);
  get('admin').addEventListener('click', () => outside++);
  assert.equal(fire('product').defaultPrevented, false);
  for (const type of ['click', 'pointerdown', 'touchstart', 'dblclick']) assert.equal(fire('admin', type).defaultPrevented, true);
  assert.equal(fire('other').defaultPrevented, true);
  assert.equal(fire('skip').defaultPrevented, false);
  assert.equal(product, 1); assert.equal(outside, 0);
  assert.equal(get('admin').closest('[inert]') !== null, true);
  cleanup(); assert.equal(fire('admin').defaultPrevented, false);
  assert.equal(outside, 1); assert.equal(get('admin').closest('[inert]'), null);
  dom.window.close();
});

test('variant/modifier choices replace product access until closed', async () => {
  const { dom, doc, panel, fire } = scene();
  const cleanup = installTutorialLock(doc, panel, 'catalog', () => {});
  const options = doc.createElement('div'); options.dataset.guide = 'options'; options.innerHTML = '<button id="variant">Pilih ukuran</button>';
  doc.body.append(options); await Promise.resolve();
  assert.equal(fire('variant').defaultPrevented, false);
  assert.equal(fire('product').defaultPrevented, true);
  options.remove(); await Promise.resolve();
  assert.equal(fire('product').defaultPrevented, false);
  cleanup(); dom.window.close();
});

test('cart allows quantity and checkout while discount and navigation remain locked', () => {
  const { dom, doc, panel, fire } = scene();
  const cleanup = installTutorialLock(doc, panel, 'cart', () => {});
  for (const id of ['minus', 'plus', 'checkout']) assert.equal(fire(id).defaultPrevented, false);
  for (const id of ['discount', 'admin', 'product']) assert.equal(fire(id).defaultPrevented, true);
  cleanup(); dom.window.close();
});

test('shift form submissions work; other forms and actions cannot fire', () => {
  const { dom, doc, panel, fire } = scene();
  const cleanup = installTutorialLock(doc, panel, 'shift', () => {});
  assert.equal(fire('save').defaultPrevented, false);
  assert.equal(fire('shift', 'submit').defaultPrevented, false);
  assert.equal(fire('checkout').defaultPrevented, true);
  cleanup(); dom.window.close();
});

test('payment allows input, amount shortcuts and confirmation without opening split or credit flows', () => {
  const { dom, doc, panel, fire } = scene();
  const cleanup = installTutorialLock(doc, panel, 'payment', () => {});
  for (const id of ['cash', 'amount', 'exact', 'pay', 'skip']) assert.equal(fire(id).defaultPrevented, false);
  for (const id of ['credit', 'split', 'admin']) assert.equal(fire(id).defaultPrevented, true);
  cleanup(); dom.window.close();
});

test('keyboard remains within allowed controls; Escape focuses Skip without skipping automatically', () => {
  const { dom, doc, panel, get } = scene();
  const cleanup = installTutorialLock(doc, panel, 'catalog', () => {});
  let skipped = 0; get('skip').addEventListener('click', () => skipped++);
  get('product').focus();
  doc.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
  assert.equal(doc.activeElement, get('skip'));
  get('admin').focus(); assert.equal(doc.activeElement, panel);
  panel.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
  assert.equal(doc.activeElement, get('next'));
  panel.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  assert.equal(doc.activeElement, get('skip')); assert.equal(skipped, 0);
  const shortcut = new dom.window.KeyboardEvent('keydown', { key: 'F2', bubbles: true, cancelable: true });
  get('product').dispatchEvent(shortcut); assert.equal(shortcut.defaultPrevented, true);
  cleanup(); dom.window.close();
});

test('welcome, receipt and finish only accept tutorial controls; existing inert state is preserved', () => {
  const { dom, doc, panel, get, fire } = scene();
  get('admin').inert = true;
  for (const step of ['welcome', 'receipt', 'done'] as const) {
    const cleanup = installTutorialLock(doc, panel, step, () => {});
    assert.equal(tutorialTargets(doc, step).length, 0);
    assert.equal(fire('product').defaultPrevented, true);
    assert.equal(fire('next').defaultPrevented, false);
    cleanup(); assert.equal(get('admin').inert, true);
  }
  dom.window.close();
});
