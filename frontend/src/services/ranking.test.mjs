import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placesFor, anyScored } from './ranking.js';

test('ties share a place and the next place skips', () => {
  assert.deepEqual(placesFor([3.4, 2.3, 2.3, 2.2, 2.2, 2.2, 2.1]), [1, 2, 2, 4, 4, 4, 7]);
});

test('float noise does not break a tie', () => {
  assert.deepEqual(placesFor([3.4000000000000004, 3.4]), [1, 1]);
});

test('order of the list does not matter', () => {
  assert.deepEqual(placesFor([1, 3, 2, 3]), [4, 1, 3, 1]);
});

test('all zero means nobody scored', () => {
  assert.equal(anyScored([0, 0, undefined]), false);
  assert.equal(anyScored([0, 0.1]), true);
});
