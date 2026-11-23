const { test } = require('node:test');
const assert = require('node:assert/strict');
const { computeStreaks } = require('./streaks');

const m = (date, r, created = '2026-01-01') => ({ fullDate: date, createdAt: created, result: { team1Goals: r[0], team2Goals: r[1] } });
const b = (match, p) => ({ match, prediction: { team1Goals: p[0], team2Goals: p[1] } });

test('a hit is exact or right direction; exact streak counts only exact', () => {
  const s = computeStreaks([
    b(m('2026-11-01', [2, 1]), [2, 1]), // בול
    b(m('2026-11-02', [1, 0]), [3, 0]), // כיוון
    b(m('2026-11-03', [1, 1]), [0, 0]), // כיוון (תיקו)
    b(m('2026-11-04', [0, 2]), [1, 0]), // החטאה
    b(m('2026-11-05', [3, 3]), [3, 3]), // בול
    b(m('2026-11-06', [0, 1]), [0, 1]), // בול
  ]);
  assert.deepEqual(s, { bestHitStreak: 3, currentHitStreak: 2, bestExactStreak: 2, currentExactStreak: 2 });
});

test('order is by kickoff, not by when the match was added', () => {
  // משחק שנוסף אחרון אבל שוחק ראשון - החטאה בתחילת הרצף ולא באמצעו
  const s = computeStreaks([
    b(m('2026-11-02', [1, 0], '2026-10-01'), [1, 0]),
    b(m('2026-11-03', [1, 0], '2026-10-01'), [2, 0]),
    b(m('2026-11-01', [0, 1], '2026-10-20'), [1, 0]),
  ]);
  assert.equal(s.bestHitStreak, 2);
  assert.equal(s.currentHitStreak, 2);
});

test('matches without result or prediction are skipped', () => {
  const s = computeStreaks([b({ fullDate: '2026-11-01', result: {} }, [1, 0]), { match: m('2026-11-02', [1, 0]), prediction: null }]);
  assert.deepEqual(s, { bestHitStreak: 0, currentHitStreak: 0, bestExactStreak: 0, currentExactStreak: 0 });
});
