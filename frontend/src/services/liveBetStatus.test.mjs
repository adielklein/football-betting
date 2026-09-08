import test from 'node:test';
import assert from 'node:assert/strict';
import { liveBetStatus } from './liveBetStatus.js';

const p = (a, b) => ({ team1Goals: a, team2Goals: b });
const l = (a, b) => ({ team1Goals: a, team2Goals: b });

test('פגיעה מדויקת', () => {
  assert.equal(liveBetStatus(p(2, 1), l(2, 1)), 'exact');
  assert.equal(liveBetStatus(p(0, 0), l(0, 0)), 'exact');
});

test('כיוון נכון בלי דיוק', () => {
  assert.equal(liveBetStatus(p(2, 0), l(3, 1)), 'direction');
  assert.equal(liveBetStatus(p(0, 2), l(1, 4)), 'direction');
});

test('תיקו הוא כיוון בפני עצמו', () => {
  assert.equal(liveBetStatus(p(1, 1), l(2, 2)), 'direction');
  assert.equal(liveBetStatus(p(1, 1), l(2, 1)), 'miss');
  assert.equal(liveBetStatus(p(2, 1), l(1, 1)), 'miss');
});

test('כיוון הפוך הוא החמצה', () => {
  assert.equal(liveBetStatus(p(2, 0), l(0, 2)), 'miss');
});

test('מחרוזות מהטופס מתנהגות כמספרים', () => {
  assert.equal(liveBetStatus(p('2', '1'), l(2, 1)), 'exact');
  assert.equal(liveBetStatus(p('3', '0'), l(1, 0)), 'direction');
});

test('בלי ניחוש שמור אין צבע', () => {
  assert.equal(liveBetStatus(null, l(1, 0)), null);
  assert.equal(liveBetStatus({}, l(1, 0)), null);
  // חצי ניחוש - שדה אחד מולא והשני לא
  assert.equal(liveBetStatus(p('2', ''), l(1, 0)), null);
});

test('בלי תוצאה חיה אין צבע', () => {
  assert.equal(liveBetStatus(p(1, 0), null), null);
  assert.equal(liveBetStatus(p(1, 0), l(null, null)), null);
});

test('אפס הוא ערך, לא היעדר ערך', () => {
  assert.equal(liveBetStatus(p(0, 0), l(0, 1)), 'miss');
  assert.equal(liveBetStatus(p('0', '0'), l(0, 0)), 'exact');
});
