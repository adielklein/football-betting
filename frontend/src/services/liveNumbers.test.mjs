import test from 'node:test';
import assert from 'node:assert/strict';
import { formatScore, isGoal, goalTimestamps } from './liveNumbers.js';

test('הניקוד מוצג כמו שהוא, בלי אפסים מיותרים', () => {
  assert.equal(formatScore(5), '5');
  assert.equal(formatScore(5.0), '5');
  assert.equal(formatScore(5.4), '5.4');
  assert.equal(formatScore(0), '0');
});

test('ערכי ביניים של הגלגול מתעגלים לספרה אחת', () => {
  assert.equal(formatScore(5.4372), '5.4');
  assert.equal(formatScore(5.96), '6');
  assert.equal(formatScore(-0.04), '0');
});

test('קלט לא תקין לא שובר את התצוגה', () => {
  assert.equal(formatScore(undefined), '0');
  assert.equal(formatScore(null), '0');
  assert.equal(formatScore('לא מספר'), '0');
});

const g = (a, b) => ({ team1Goals: a, team2Goals: b });

test('שינוי בתוצאה הוא שער', () => {
  assert.equal(isGoal(g(0, 0), g(1, 0)), true);
  assert.equal(isGoal(g(1, 0), g(1, 1)), true);
  // ביטול שער אחרי VAR הוא גם שינוי שראוי להבזק
  assert.equal(isGoal(g(1, 0), g(0, 0)), true);
});

test('אותה תוצאה אינה שער - הסריקה רצה כל דקה', () => {
  assert.equal(isGoal(g(2, 1), g(2, 1)), false);
});

test('הטעינה הראשונה אינה שער', () => {
  assert.equal(isGoal(undefined, g(2, 1)), false);
  assert.equal(isGoal(null, g(2, 1)), false);
  assert.equal(isGoal(g(null, null), g(2, 1)), false);
  assert.equal(isGoal(g(2, 1), g(null, null)), false);
});

test('חותמות זמן נרשמות רק למשחקים שבאמת זזו', () => {
  const before = { a: g(0, 0), b: g(1, 1) };
  const after = { a: g(1, 0), b: g(1, 1) };
  const out = goalTimestamps(before, after, {}, 1000);
  assert.deepEqual(out, { a: 1000 });
});

test('חותמת קודמת נשמרת עד שנופל שער חדש', () => {
  const before = { a: g(1, 0) };
  const after = { a: g(1, 0) };
  assert.deepEqual(goalTimestamps(before, after, { a: 500 }, 1000), { a: 500 });
  assert.deepEqual(goalTimestamps({ a: g(1, 0) }, { a: g(2, 0) }, { a: 500 }, 1000), { a: 1000 });
});

test('משחק שנעלם מהסריקה לא מייצר שער', () => {
  assert.deepEqual(goalTimestamps({ a: g(1, 0) }, {}, {}, 1000), {});
});
