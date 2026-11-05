import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatCountdown } from './countdown.js';

const f = (days, hours, minutes = 0, seconds = 0) => formatCountdown({ days, hours, minutes, seconds });

test('more than a day reads as a sentence', () => {
  assert.equal(f(1, 17).text, 'יום ו־17 שעות');
  assert.equal(f(2, 3).text, 'יומיים ו־3 שעות');
  assert.equal(f(3, 0).text, '3 ימים');
  assert.equal(f(1, 1).text, 'יום ושעה');
  assert.equal(f(4, 2).text, '4 ימים ושעתיים');
  assert.equal(f(1, 17).clock, false);
});

test('the last day is a ticking clock', () => {
  assert.deepEqual(f(0, 17, 22, 5), { text: '17:22:05', clock: true });
  assert.deepEqual(f(0, 0, 9, 3), { text: '09:03', clock: true });
});
