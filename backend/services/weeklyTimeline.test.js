const test = require('node:test');
const assert = require('node:assert');
const { buildWeeklyTimeline } = require('./weeklyTimeline');

const score = (name, weeklyScore, createdAt, extra = {}) => ({
  weeklyScore,
  totalScore: 99,
  weekId: { _id: name, name, createdAt: new Date(createdAt), month: 9, season: '2026-27', ...extra },
});

test('שבועות מסודרים לפי מועד היצירה ולא לפי סדר הרשומות', () => {
  const rows = buildWeeklyTimeline([
    score('ב', 2, '2026-09-10'),
    score('א', 1, '2026-09-03'),
    score('ג', 3, '2026-09-17'),
  ]);
  assert.deepStrictEqual(rows.map((r) => r.weekName), ['א', 'ב', 'ג']);
  assert.deepStrictEqual(rows.map((r) => r.weekIndex), [1, 2, 3]);
});

test('הסכום המצטבר עולה שבוע אחר שבוע', () => {
  const rows = buildWeeklyTimeline([
    score('א', 7, '2026-09-03'),
    score('ב', 1.2, '2026-09-10'),
    score('ג', 0, '2026-09-17'),
    score('ד', 5, '2026-09-24'),
  ]);
  assert.deepStrictEqual(rows.map((r) => r.cumulativeScore), [7, 8.2, 8.2, 13.2]);
});

test('הסכום המצטבר לא נשען על totalScore שנשמר על הרשומה', () => {
  const rows = buildWeeklyTimeline([score('א', 3, '2026-09-03'), score('ב', 4, '2026-09-10')]);
  assert.deepStrictEqual(rows.map((r) => r.totalScore), [99, 99]);
  assert.deepStrictEqual(rows.map((r) => r.cumulativeScore), [3, 7]);
});

test('ניקוד שבועי שבור מתנהג כאפס', () => {
  const rows = buildWeeklyTimeline([
    { weekId: { _id: 'א', name: 'א', createdAt: new Date('2026-09-03') } },
    score('ב', null, '2026-09-10'),
  ]);
  assert.deepStrictEqual(rows.map((r) => r.weeklyScore), [0, 0]);
  assert.deepStrictEqual(rows.map((r) => r.cumulativeScore), [0, 0]);
});

test('רשומות בלי שבוע נזרקות, ושבוע בלי תאריך נדחף לסוף', () => {
  const rows = buildWeeklyTimeline([
    null,
    { weeklyScore: 5 },
    { weeklyScore: 2, weekId: { _id: 'ללא', name: 'ללא תאריך' } },
    score('א', 1, '2026-09-03'),
  ]);
  assert.deepStrictEqual(rows.map((r) => r.weekName), ['א', 'ללא תאריך']);
  assert.deepStrictEqual(rows.map((r) => r.cumulativeScore), [1, 3]);
});

test('שברי נקודות נשמרים לספרה אחת ולא נערמים בשגיאות עשרוניות', () => {
  const rows = buildWeeklyTimeline([
    score('א', 0.1, '2026-09-03'),
    score('ב', 0.2, '2026-09-10'),
    score('ג', 0.4, '2026-09-17'),
  ]);
  assert.deepStrictEqual(rows.map((r) => r.cumulativeScore), [0.1, 0.3, 0.7]);
});

test('רשימה ריקה מחזירה ציר ריק', () => {
  assert.deepStrictEqual(buildWeeklyTimeline([]), []);
  assert.deepStrictEqual(buildWeeklyTimeline(undefined), []);
});
