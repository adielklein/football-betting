import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextScoreValue as n } from './scoreInput.js';

test('first keystroke after focus replaces the old digit wherever the caret is', () => {
  assert.equal(n({ prev: '2', raw: '23', caret: 2, fresh: true }), '3');
  assert.equal(n({ prev: '2', raw: '32', caret: 1, fresh: true }), '3');
  assert.equal(n({ prev: '1', raw: '11', caret: 2, fresh: true }), '1');
  assert.equal(n({ prev: '10', raw: '103', caret: 3, fresh: true }), '3');
  assert.equal(n({ prev: '10', raw: '310', caret: 1, fresh: true }), '3');
});

test('after the first keystroke a second digit is appended, up to two', () => {
  assert.equal(n({ prev: '1', raw: '12', caret: 2, fresh: false }), '12');
  assert.equal(n({ prev: '12', raw: '123', caret: 3, fresh: false }), '12');
});

test('empty field just takes the digit', () => {
  assert.equal(n({ prev: '', raw: '4', caret: 1, fresh: true }), '4');
});

test('non-digits from a phone pad (* # +) are ignored', () => {
  assert.equal(n({ prev: '2', raw: '2*', caret: 2, fresh: true }), '2');
  assert.equal(n({ prev: '', raw: '+', caret: 1, fresh: true }), '');
  assert.equal(n({ prev: '1', raw: '1#', caret: 2, fresh: false }), '1');
});

test('backspace works as usual', () => {
  assert.equal(n({ prev: '2', raw: '', caret: 0, fresh: true }), '');
  assert.equal(n({ prev: '12', raw: '1', caret: 1, fresh: false }), '1');
});

test('unknown caret falls back to the last digit', () => {
  assert.equal(n({ prev: '2', raw: '25', caret: null, fresh: true }), '5');
});
