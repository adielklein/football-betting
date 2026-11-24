import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isMatchLocked, weekRevealed, nextLockAt, lockModeOf } from './betLock.js';

const T = Date.parse('2026-11-28T15:00:00Z');
const H = 3600000;
const ms = [{ fullDate: new Date(T) }, { fullDate: new Date(T + 3 * H) }, {}];
const week = { active: true, lockMode: 'match', firstLockAt: new Date(T), lockTime: new Date(T + 3 * H) };

test('per match lock, matches without time close with the first one', () => {
  assert.equal(isMatchLocked(week, ms[0], ms, T - 1), false);
  assert.equal(isMatchLocked(week, ms[0], ms, T), true);
  assert.equal(isMatchLocked(week, ms[1], ms, T + H), false);
  assert.equal(isMatchLocked(week, ms[2], ms, T), true);
});

test('legacy week locks together', () => {
  const legacy = { active: true, lockTime: new Date(T) };
  assert.equal(lockModeOf(legacy), 'week');
  assert.equal(isMatchLocked(legacy, ms[1], ms, T), true);
});

test('revealed from the first lock; next lock skips started matches', () => {
  assert.equal(weekRevealed(week, T - 1), false);
  assert.equal(weekRevealed(week, T), true);
  assert.equal(nextLockAt(week, ms, T + 1), T + 3 * H);
  assert.equal(nextLockAt(week, ms, T + 4 * H), null);
});
