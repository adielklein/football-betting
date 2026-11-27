import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionChanged } from './scoresVersion.js';

test('בדיקה ראשונה רק קובעת בסיס - בלי רענון', () => {
  assert.equal(versionChanged(null, 1700000000000), false);
});

test('ניקוד חושב מחדש - רענון', () => {
  assert.equal(versionChanged(1700000000000, 1700000060000), true);
});

test('אותה גרסה - בלי רענון', () => {
  assert.equal(versionChanged(1700000000000, 1700000000000), false);
});

test('תשובה חסרה - בלי רענון', () => {
  assert.equal(versionChanged(1700000000000, null), false);
});
