import test from 'node:test';
import assert from 'node:assert/strict';
import { chartPointAtPointer, chartTooltipPosition } from '../src/lib/chartInteraction';

test('cursor selects dates across the whole plot, including between tiny points', () => {
  assert.equal(chartPointAtPointer(140, 100, 800, 7), 0);
  assert.equal(chartPointAtPointer(500, 100, 800, 7), 3);
  assert.equal(chartPointAtPointer(555, 100, 800, 7), 3);
  assert.equal(chartPointAtPointer(565, 100, 800, 7), 4);
  assert.equal(chartPointAtPointer(860, 100, 800, 7), 6);
});
test('responsive mobile and desktop widths map to the same date', () => {
  assert.equal(chartPointAtPointer(200, 40, 320, 7), 3);
  assert.equal(chartPointAtPointer(640, 40, 1200, 7), 3);
});
test('padding and positions beyond canvas clamp to first or last date', () => {
  assert.equal(chartPointAtPointer(-10, 100, 800, 30), 0);
  assert.equal(chartPointAtPointer(9999, 100, 800, 30), 29);
});
test('empty or hidden chart cannot select invalid data', () => {
  assert.equal(chartPointAtPointer(200, 0, 0, 7), null);
  assert.equal(chartPointAtPointer(200, 0, 800, 0), null);
  assert.equal(chartPointAtPointer(NaN, 0, 800, 7), null);
});
test('single date and a dense month remain selectable', () => {
  assert.equal(chartPointAtPointer(500, 0, 800, 1), 0);
  assert.equal(chartPointAtPointer(400, 0, 800, 31), 15);
});

test('tooltip follows the point and stays inside chart boundaries on narrow screens', () => {
  const first = chartTooltipPosition(80, 180, 800, 280);
  const last = chartTooltipPosition(760, 80, 800, 280);
  assert.ok(last.left > first.left);
  assert.ok(last.top > 80, 'high points place tooltip below rather than outside the top');
  for (const width of [240, 280, 320, 800]) {
    for (const x of [0, width / 2, width]) {
      const position = chartTooltipPosition(x, 150, width, 248);
      assert.ok(position.left >= 8);
      assert.ok(position.left + position.width <= width - 8);
    }
  }
});
