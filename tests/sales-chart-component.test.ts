import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import SalesTrendChart from '../src/components/SalesTrendChart';

test('rendered chart moves a readable tooltip with pointer, touch and keyboard, stays inside mobile bounds, and supports bars/refunds', async () => {
  const dom = new JSDOM('<!doctype html><body><div id="root"></div></body>', { url: 'https://example.test', pretendToBeVisual: true });
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  let measuredWidth = 800;
  const observers: (() => void)[] = [];
  Object.assign(globalThis, { ResizeObserver: class { constructor(callback: () => void) { observers.push(callback); } observe() { observers.at(-1)!(); } disconnect() {} } });
  dom.window.Element.prototype.getBoundingClientRect = function () { return { left: this.tagName.toLowerCase() === 'svg' ? 56 : 0, width: this.tagName.toLowerCase() === 'svg' ? measuredWidth - 56 : measuredWidth, height: 280, top: 0 } as DOMRect; };
  const { createRoot } = await import('react-dom/client');
  const root = createRoot(dom.window.document.getElementById('root')!);
  const points = [
    { label: '15 Okt', sublabel: 'Kamis, 15 Oktober', omzet: 100000, count: 1 },
    { label: '16 Okt', sublabel: 'Jumat, 16 Oktober', omzet: 398000, count: 8 },
    { label: '17 Okt', sublabel: 'Sabtu, 17 Oktober', omzet: -50000, count: 0 },
  ];
  try {
    await act(async () => { root.render(React.createElement(SalesTrendChart, { points, type: 'line' })); });
    const svg = dom.window.document.querySelector('svg')!;
    const pointer = async (type: string, x: number) => act(async () => {
      const event = new dom.window.MouseEvent(type, { bubbles: true, clientX: x });
      Object.defineProperty(event, 'pointerType', { value: type === 'pointerdown' ? 'touch' : 'mouse' });
      svg.dispatchEvent(event);
    });
    await pointer('pointermove', 80);
    let tooltip = dom.window.document.querySelector<HTMLElement>('[data-chart-tooltip]')!;
    assert.match(tooltip.textContent!, /15 Oktober/); assert.match(tooltip.textContent!, /100.000/);
    const firstLeft = parseFloat(tooltip.style.left);
    await pointer('pointermove', 780);
    tooltip = dom.window.document.querySelector<HTMLElement>('[data-chart-tooltip]')!;
    assert.match(tooltip.textContent!, /17 Oktober/); assert.match(tooltip.textContent!, /-50.000/);
    assert.ok(parseFloat(tooltip.style.left) > firstLeft, 'tooltip follows selected date instead of staying in top-right');
    await act(async () => { svg.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Home', bubbles: true })); svg.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })); });
    assert.match(dom.window.document.querySelector('[data-chart-tooltip]')!.textContent!, /16 Oktober/);
    await pointer('pointerdown', 780);
    await act(async () => { svg.dispatchEvent(new dom.window.FocusEvent('focusin', { bubbles: true })); });
    assert.match(dom.window.document.querySelector('[data-chart-tooltip]')!.textContent!, /17 Oktober/, 'touch focus does not reset selection');
    measuredWidth = 320;
    await act(async () => { observers.forEach(callback => callback()); });
    await pointer('pointermove', 312);
    tooltip = dom.window.document.querySelector<HTMLElement>('[data-chart-tooltip]')!;
    assert.ok(parseFloat(tooltip.style.left) >= 8);
    assert.ok(parseFloat(tooltip.style.left) + parseFloat(tooltip.style.width) <= 312);
    for (const circle of dom.window.document.querySelectorAll('circle')) assert.ok(Number(circle.getAttribute('cy')) >= 20 && Number(circle.getAttribute('cy')) <= 244);
    assert.match(tooltip.className, /bg-white/); assert.match(tooltip.className, /text-slate-900/);
    assert.match(dom.window.document.body.textContent!, /15 Okt/); assert.match(dom.window.document.body.textContent!, /17 Okt/);
    await act(async () => { root.render(React.createElement(SalesTrendChart, { points, type: 'bar' })); });
    assert.equal(dom.window.document.querySelectorAll('rect[rx="3"]').length, 3);
    await act(async () => { svg.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.equal(dom.window.document.querySelector('[data-chart-tooltip]'), null);
  } finally { await act(async () => root.unmount()); dom.window.close(); }
});
