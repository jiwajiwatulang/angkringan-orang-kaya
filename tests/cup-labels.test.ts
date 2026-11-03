import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractCupLabelUnits,
  generateCupLabelsEscPos,
  generateCupLabelsHtml,
} from '../src/lib/receipt';

test('extractCupLabelUnits: takeaway order expands quantity and formats correctly', () => {
  const receipt = {
    orderId: '045',
    customerName: 'Vina',
    orderType: 'Takeaway',
    tableId: null,
    createdAt: '2026-06-25T13:56:00.000Z',
    items: [
      {
        nama: 'Matcha Latte Orijinaru',
        qty: 2,
        kategori: 'Minuman',
        selectedModifiers: [{ optionName: 'less sugar', harga: 0 }],
      },
    ],
  };

  const units = extractCupLabelUnits(receipt);
  assert.equal(units.length, 2);

  // Unit 1
  assert.equal(units[0].customerOrTable, 'Vina');
  assert.equal(units[0].orderType, 'Take Away');
  assert.equal(units[0].unit, '1 Cup');
  assert.equal(units[0].nama, 'Matcha Latte Orijinaru');
  assert.deepEqual(units[0].modifiers, ['less sugar']);
  assert.equal(units[0].index, 1);
  assert.equal(units[0].total, 2);

  // Unit 2
  assert.equal(units[1].customerOrTable, 'Vina');
  assert.equal(units[1].orderType, 'Take Away');
  assert.equal(units[1].unit, '1 Cup');
  assert.equal(units[1].nama, 'Matcha Latte Orijinaru');
  assert.deepEqual(units[1].modifiers, ['less sugar']);
  assert.equal(units[1].index, 2);
  assert.equal(units[1].total, 2);
});

test('extractCupLabelUnits: dine in with table and multiple items', () => {
  const receipt = {
    orderId: '088',
    customerName: 'Budi',
    orderType: 'Dine-in',
    tableName: 'Meja 03',
    tableId: 3,
    createdAt: '2026-06-25T14:10:00.000Z',
    items: [
      {
        nama: 'Es Kopi Susu',
        qty: 1,
        kategori: 'Minuman Kopi',
        selectedModifiers: [{ optionName: 'Extra Shot' }],
      },
      {
        nama: 'Roti Bakar Coklat',
        qty: 1,
        kategori: 'Makanan',
      },
    ],
  };

  const units = extractCupLabelUnits(receipt);
  assert.equal(units.length, 2);

  // Unit 1: Drink
  assert.ok(units[0].customerOrTable.includes('Meja 03'));
  assert.ok(units[0].customerOrTable.includes('Budi'));
  assert.equal(units[0].orderType, 'Dine In');
  assert.equal(units[0].unit, '1 Cup');
  assert.equal(units[0].nama, 'Es Kopi Susu');
  assert.deepEqual(units[0].modifiers, ['Extra Shot']);
  assert.equal(units[0].index, 1);
  assert.equal(units[0].total, 2);

  // Unit 2: Food
  assert.equal(units[1].unit, '1 Porsi');
  assert.equal(units[1].nama, 'Roti Bakar Coklat');
  assert.equal(units[1].index, 2);
  assert.equal(units[1].total, 2);
});

test('generateCupLabelsEscPos: produces valid ESC/POS commands with cut markers', () => {
  const receipt = {
    orderId: '045',
    customerName: 'Vina',
    orderType: 'Takeaway',
    createdAt: '2026-06-25T13:56:00.000Z',
    items: [
      {
        nama: 'Matcha Latte',
        qty: 1,
        selectedModifiers: [{ optionName: 'less sugar' }],
      },
    ],
  };

  const escpos = generateCupLabelsEscPos(receipt);
  assert.ok(escpos.includes('Vina'));
  assert.ok(escpos.includes('Take Away'));
  assert.ok(escpos.includes('Matcha Latte'));
  assert.ok(escpos.includes('less sugar'));
  assert.ok(escpos.includes('1/1'));
  // Contains cut command GS V B 0
  assert.ok(escpos.includes('\x1dV\x42\x00'));
});

test('generateCupLabelsHtml: generates valid HTML structure with cup-label elements', () => {
  const receipt = {
    orderId: '045',
    customerName: 'Vina',
    orderType: 'Takeaway',
    createdAt: '2026-06-25T13:56:00.000Z',
    items: [
      {
        nama: 'Matcha Latte Orijinaru',
        qty: 2,
        selectedModifiers: [{ optionName: 'less sugar' }],
      },
    ],
  };

  const html = generateCupLabelsHtml(receipt);
  assert.ok(html.includes('class="cup-label"'));
  assert.ok(html.includes('Matcha Latte Orijinaru'));
  assert.ok(html.includes('less sugar'));
  assert.ok(html.includes('1/2'));
  assert.ok(html.includes('2/2'));
  assert.ok(html.includes('Vina'));
  assert.ok(html.includes('Take Away'));
});
