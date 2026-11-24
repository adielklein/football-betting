const { test } = require('node:test');
const assert = require('node:assert/strict');
const { isMatchOpen, isMatchLocked, deriveWeekLocks, redactBets, lockModeOf } = require('./betLock');

const T = Date.parse('2026-11-28T15:00:00Z');
const H = 3600000;
const m = (id, at) => ({ _id: id, fullDate: at == null ? undefined : new Date(at) });
const matches = [m('a', T), m('b', T + 3 * H), m('c', T + 24 * H), m('d', null)];
const week = { active: true, lockMode: 'match', lockTime: new Date(T + 24 * H) };

test('legacy weeks (no lockMode) keep locking all together', () => {
  assert.equal(lockModeOf({}), 'week');
  const legacy = { active: true, lockTime: new Date(T) };
  assert.equal(isMatchOpen(legacy, matches[2], matches, T - 1), true);
  assert.equal(isMatchOpen(legacy, matches[2], matches, T), false);
  assert.equal(isMatchOpen({ ...legacy, locked: true }, matches[2], matches, T - H), false);
});

test('per match: each closes exactly at its own kickoff', () => {
  assert.equal(isMatchOpen(week, matches[0], matches, T - 1), true);
  assert.equal(isMatchOpen(week, matches[0], matches, T), false);
  assert.equal(isMatchOpen(week, matches[1], matches, T + H), true);
  assert.equal(isMatchOpen(week, matches[2], matches, T + 23 * H), true);
});

test('a match with no kickoff time closes with the first match of the week', () => {
  assert.equal(isMatchOpen(week, matches[3], matches, T - 1), true);
  assert.equal(isMatchOpen(week, matches[3], matches, T), false);
});

test('inactive week is not open, but not "locked" either', () => {
  const off = { ...week, active: false };
  assert.equal(isMatchOpen(off, matches[0], matches, T - H), false);
  assert.equal(isMatchLocked(off, matches[0], matches, T - H), false);
});

test('derived week locks: first and last kickoff', () => {
  const d = deriveWeekLocks(week, matches);
  assert.equal(d.firstLockAt.getTime(), T);
  assert.equal(d.lockTime.getTime(), T + 24 * H);
  assert.equal(deriveWeekLocks({ lockTime: new Date(T) }, matches), null);
});

test("others' predictions stay hidden until that match locks", () => {
  const bets = [
    { userId: 'me', matchId: 'b', prediction: { team1Goals: 1, team2Goals: 0 } },
    { userId: 'x', matchId: 'a', prediction: { team1Goals: 2, team2Goals: 2 } },
    { userId: 'x', matchId: 'b', prediction: { team1Goals: 3, team2Goals: 1 } }
  ];
  const byId = new Map(matches.map((x) => [x._id, x]));
  const out = redactBets(bets, { week, matchesById: byId, viewerId: 'me', isAdmin: false, now: T + H });
  assert.deepEqual(out[0].prediction, { team1Goals: 1, team2Goals: 0 }); // שלי
  assert.deepEqual(out[1].prediction, { team1Goals: 2, team2Goals: 2 }); // משחק שהתחיל
  assert.equal(out[2].prediction, undefined);                              // עוד לא התחיל
  assert.equal(out[2].hidden, true);
  // אנונימי לא רואה כלום פתוח; מנהל רואה הכל
  assert.equal(redactBets(bets, { week, matchesById: byId, viewerId: null, isAdmin: false, now: T + H })[0].prediction, undefined);
  assert.ok(redactBets(bets, { week, matchesById: byId, viewerId: null, isAdmin: true, now: T + H })[2].prediction);
});
