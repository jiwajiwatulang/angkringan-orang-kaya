import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import MobileCatalogScreen from '../src/components/mobile/MobileCatalogScreen';

test('catalog weight filter includes weighed products across categories and matches barcode action styling', () => {
  const oldReact = Object.getOwnPropertyDescriptor(globalThis, 'React'); Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
  const products = [
    { id: 1, nama: 'Beras Curah', harga: 18000, kategori: 'Sembako', saleUnit: 'weight' as const, priceBasis: 1000 as const },
    { id: 2, nama: 'Kopi Curah', harga: 12000, kategori: 'Kopi', saleUnit: 'weight' as const, priceBasis: 100 as const },
    { id: 3, nama: 'Beras Kemasan', harga: 75000, kategori: 'Sembako' },
  ];
  function render(weightOnly: boolean, available = true) {
    return new JSDOM(renderToStaticMarkup(<MobileCatalogScreen menuData={products} categories={['Semua', 'Sembako', 'Kopi']} activeCategory="Semua" onSelectCategory={() => {}} searchQuery="" onSearchChange={() => {}} onAddToCart={() => {}} onOpenBarcodeScan={() => {}} onToggleWeight={available ? () => {} : undefined} weightOnly={weightOnly} />));
  }
  try {
    const all = render(false); const buttons = [...all.window.document.querySelectorAll('button')];
    const weight = buttons.find(b => b.textContent === 'Barang Timbang')!, scan = buttons.find(b => b.textContent === 'Scan')!;
    assert.ok(weight && scan); assert.equal(weight.className, scan.className); assert.equal(weight.getAttribute('aria-pressed'), 'false'); assert.ok(all.window.document.body.textContent!.includes('Beras Kemasan')); all.window.close();
    const filtered = render(true); const text = filtered.window.document.body.textContent!; assert.ok(text.includes('Beras Curah')); assert.ok(text.includes('Kopi Curah')); assert.ok(!text.includes('Beras Kemasan')); assert.equal(filtered.window.document.querySelector('button[aria-pressed="true"]')?.textContent, 'Semua'); filtered.window.close();
    const hidden = render(false, false); assert.ok(![...hidden.window.document.querySelectorAll('button')].some(b => b.textContent === 'Barang Timbang')); hidden.window.close();
  } finally { if (oldReact) Object.defineProperty(globalThis, 'React', oldReact); else Reflect.deleteProperty(globalThis, 'React'); }
});
