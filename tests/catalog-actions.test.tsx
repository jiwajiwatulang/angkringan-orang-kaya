import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import MobileCatalogScreen from '../src/components/mobile/MobileCatalogScreen';

test('mobile catalog: no redundant weight toggle, weighed products reachable via category, Tambah Barang in header', () => {
  const oldReact = Object.getOwnPropertyDescriptor(globalThis, 'React'); Object.defineProperty(globalThis, 'React', { configurable: true, value: React });
  const products = [
    { id: 1, nama: 'Beras Curah', harga: 18000, kategori: 'Barang Timbang', saleUnit: 'weight' as const, priceBasis: 1000 as const },
    { id: 2, nama: 'Beras Kemasan', harga: 75000, kategori: 'Sembako' },
  ];
  const render = (activeCategory: string, retail: boolean) => new JSDOM(renderToStaticMarkup(
    <MobileCatalogScreen menuData={products} categories={['Semua', 'Barang Timbang', 'Sembako']} activeCategory={activeCategory} onSelectCategory={() => {}} searchQuery="" onSearchChange={() => {}} onAddToCart={() => {}} onOpenBarcodeScan={() => {}} onAddRetailProduct={retail ? () => {} : undefined} />
  ));
  try {
    const all = render('Semua', true); const doc = all.window.document;
    const labels = [...doc.querySelectorAll('button')].map(b => b.textContent?.trim());
    assert.ok(labels.includes('Scan'), 'scan button present');
    assert.ok(labels.includes('Tambah Barang'), 'retail add button present');
    assert.equal(labels.filter(l => l === 'Barang Timbang').length, 1, 'Barang Timbang only appears once, as a category pill');
    assert.ok(!doc.querySelector('button.w-full'), 'no full-width add button pushing the catalog down');
    const header = doc.querySelector('h2')!.parentElement!;
    assert.ok(header.textContent!.includes('Tambah Barang'), 'Tambah Barang sits in the header row');
    assert.ok(doc.body.textContent!.includes('Beras Kemasan')); all.window.close();

    const weighed = render('Barang Timbang', true); const text = weighed.window.document.body.textContent!;
    assert.ok(text.includes('Beras Curah')); assert.ok(!text.includes('Beras Kemasan')); weighed.window.close();

    const nonRetail = render('Semua', false);
    assert.ok(![...nonRetail.window.document.querySelectorAll('button')].some(b => b.textContent?.trim() === 'Tambah Barang')); nonRetail.window.close();
  } finally { if (oldReact) Object.defineProperty(globalThis, 'React', oldReact); else Reflect.deleteProperty(globalThis, 'React'); }
});
