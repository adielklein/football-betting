const test = require('node:test');
const assert = require('node:assert');
const { backoffDelay, BACKOFF_MAX_MS, inBroadcastWindow } = require('./liveScores');

test('הנסיגה מוכפלת עם כל כישלון רצוף', () => {
  assert.equal(backoffDelay(1), 30_000);
  assert.equal(backoffDelay(2), 60_000);
  assert.equal(backoffDelay(3), 120_000);
  assert.equal(backoffDelay(4), 240_000);
});

test('יש תקרה, כדי שהשירות יתאושש ולא ייעלם לשעות', () => {
  assert.equal(backoffDelay(5), BACKOFF_MAX_MS);
  assert.equal(backoffDelay(50), BACKOFF_MAX_MS);
  assert.ok(BACKOFF_MAX_MS <= 5 * 60 * 1000);
});

test('כישלון ראשון לא מייצר השהיה אפסית', () => {
  assert.ok(backoffDelay(0) > 0);
  assert.equal(backoffDelay(0), backoffDelay(1));
});

// חלון השידור נשאר כפי שהיה - נבדק כאן כי הוא מה שקובע אם בכלל סורקים
test('חלון השידור נפתח לפני הבעיטה ונסגר הרבה אחריה', () => {
  const kickoff = new Date('2026-09-16T18:00:00Z').getTime();
  const match = { fullDate: new Date(kickoff) };

  assert.equal(inBroadcastWindow(match, kickoff - 5 * 60 * 1000), true, '5 דקות לפני');
  assert.equal(inBroadcastWindow(match, kickoff + 90 * 60 * 1000), true, 'במהלך המשחק');
  assert.equal(inBroadcastWindow(match, kickoff - 60 * 60 * 1000), false, 'שעה לפני');
  assert.equal(inBroadcastWindow(match, kickoff + 6 * 60 * 60 * 1000), false, 'שש שעות אחרי');
});

test('משחק בלי תאריך לא נסרק', () => {
  assert.equal(inBroadcastWindow({ fullDate: null }), false);
  assert.equal(inBroadcastWindow({}), false);
});
