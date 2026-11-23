const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeStanding } = require('./standing');

const weeks = [
  { _id: 'w1', active: true, month: 10, season: '2026-27', createdAt: '2026-10-01' },
  { _id: 'w2', active: true, month: 11, season: '2026-27', createdAt: '2026-11-01' },
  { _id: 'w3', active: true, month: 11, season: '2026-27', createdAt: '2026-11-15' },
  { _id: 'w4', active: false, month: 12, season: '2026-27', createdAt: '2026-12-01' },
];
const scores = [
  { userId: 'a', weekId: 'w2', weeklyScore: 5 }, { userId: 'a', weekId: 'w3', weeklyScore: 3 },
  { userId: 'b', weekId: 'w2', weeklyScore: 8 },
  { userId: 'c', weekId: 'w3', weeklyScore: 9.2 }, { userId: 'c', weekId: 'w1', weeklyScore: 50 },
  { userId: 'd', weekId: 'w2', weeklyScore: 1 },
];

test('rank in the month of the latest active week, ties share a place', () => {
  assert.deepEqual(computeStanding({ weeks, scores, userId: 'a' }), { month: 11, season: '2026-27', rank: 2, of: 4, points: 8 });
  assert.equal(computeStanding({ weeks, scores, userId: 'b' }).rank, 2);
  assert.equal(computeStanding({ weeks, scores, userId: 'c' }).rank, 1);
  assert.equal(computeStanding({ weeks, scores, userId: 'd' }).rank, 4);
});

test('excluded players are not counted and get no rank', () => {
  const r = computeStanding({ weeks, scores, excludedUserIds: ['c'], userId: 'a' });
  assert.equal(r.rank, 1);
  assert.equal(r.of, 3);
  assert.equal(computeStanding({ weeks, scores, excludedUserIds: ['c'], userId: 'c' }).rank, null);
});

test('no active weeks -> null', () => {
  assert.equal(computeStanding({ weeks: [], scores, userId: 'a' }), null);
});
