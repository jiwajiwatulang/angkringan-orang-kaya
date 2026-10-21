import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FIRST_RUN_GUIDE_KEY, readGuideProgress, reconcileGuideStep, saveGuideProgress, type GuideStorage } from '../src/lib/firstRunGuide';

function storage(): GuideStorage {
  const entries = new Map<string, string>();
  return { getItem: key => entries.get(key) ?? null, setItem: (key, value) => { entries.set(key, value); } };
}
const empty = { hasShift: false, hasItems: false, paymentOpen: false, savedReceipt: false };

test('first visit offers welcome without creating any store data', () => {
  const local = storage();
  assert.deepEqual(readGuideProgress(local), { status: 'active', step: 'welcome' });
  assert.equal(local.getItem(FIRST_RUN_GUIDE_KEY), null);
});

test('skip remains dismissed after reload and switching demo to licensed mode', () => {
  const local = storage();
  assert.equal(saveGuideProgress(local, { status: 'skipped', step: 'payment' }), true);
  // Both modes use this same device preference; demo sandbox deletion does not touch it.
  assert.equal(readGuideProgress(local).status, 'skipped');
  assert.equal(readGuideProgress(local).status, 'skipped');
});

test('completed guide stays completed and explicit replay starts at welcome', () => {
  const local = storage();
  saveGuideProgress(local, { status: 'completed', step: 'done' });
  assert.equal(readGuideProgress(local).status, 'completed');
  saveGuideProgress(local, { status: 'active', step: 'welcome' });
  assert.deepEqual(readGuideProgress(local), { status: 'active', step: 'welcome' });
});

test('blocked storage reports failure; corrupt preferences are recoverable', () => {
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  assert.equal(readGuideProgress(blocked).step, 'welcome');
  assert.equal(saveGuideProgress(blocked, { status: 'skipped', step: 'welcome' }), false);
  for (const value of ['{broken', 'null', '[]', '{"status":"skipped","step":"unknown"}']) {
    const local = storage(); local.setItem(FIRST_RUN_GUIDE_KEY, value);
    assert.equal(readGuideProgress(local).status, 'active');
  }
});

test('shift and product steps advance only after actual saved shift/cart state', () => {
  assert.equal(reconcileGuideStep('shift', empty), 'shift');
  assert.equal(reconcileGuideStep('shift', { ...empty, hasShift: true }), 'catalog');
  assert.equal(reconcileGuideStep('catalog', { ...empty, hasShift: true }), 'catalog');
  assert.equal(reconcileGuideStep('catalog', { ...empty, hasShift: true, hasItems: true }), 'cart');
});

test('failed payment cannot finish tour; closing payment returns to cart', () => {
  const checkout = { ...empty, hasShift: true, hasItems: true, paymentOpen: true };
  assert.equal(reconcileGuideStep('cart', checkout), 'payment');
  assert.equal(reconcileGuideStep('payment', checkout), 'payment');
  assert.equal(reconcileGuideStep('payment', { ...checkout, paymentOpen: false }), 'cart');
});

test('saved receipt advances even when payment clears cart; closing receipt reaches finish', () => {
  const saved = { ...empty, hasShift: true, savedReceipt: true };
  assert.equal(reconcileGuideStep('payment', saved), 'receipt');
  assert.equal(reconcileGuideStep('receipt', saved), 'receipt');
  assert.equal(reconcileGuideStep('receipt', { ...saved, savedReceipt: false }), 'done');
});

test('resume after reload recovers missing cart or shift without creating orders', () => {
  assert.equal(reconcileGuideStep('payment', { ...empty, hasShift: true }), 'catalog');
  assert.equal(reconcileGuideStep('cart', empty), 'shift');
  assert.equal(reconcileGuideStep('welcome', { ...empty, hasShift: true }), 'welcome');
  assert.equal(reconcileGuideStep('done', empty), 'done');
});
