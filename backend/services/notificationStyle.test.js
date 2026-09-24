const test = require('node:test');
const assert = require('node:assert');
const { styleFor, GOAL, DEFAULT } = require('./notificationStyle');

test('לשער יש קצב רטט משלו, שונה מברירת המחדל', () => {
  const s = styleFor('match_goal');
  assert.deepEqual(s.vibrate, GOAL);
  assert.notDeepEqual(s.vibrate, DEFAULT);
});

test('כל סוג אירוע מקבל קצב שונה מהאחרים', () => {
  const patterns = ['match_goal', 'match_goalCancelled', 'match_red', 'match_start', 'match_end', 'exact_score']
    .map((t) => JSON.stringify(styleFor(t).vibrate));
  assert.equal(new Set(patterns).size, patterns.length);
});

test('סוג לא מוכר נופל לברירת המחדל ולא שובר כלום', () => {
  const s = styleFor('something_else');
  assert.deepEqual(s.vibrate, DEFAULT);
  assert.deepEqual(s.actions, []);
});

test('בלי סוג בכלל - עדיין מחזיר מבנה תקין', () => {
  const s = styleFor(undefined);
  assert.ok(Array.isArray(s.vibrate));
  assert.ok(Array.isArray(s.actions));
});

test('הכפתור שנשלח למכשיר נושא action ו-title בלבד, בלי url', () => {
  const s = styleFor('match_goal');
  assert.equal(s.actions.length, 1);
  assert.deepEqual(Object.keys(s.actions[0]).sort(), ['action', 'title']);
});

test('ה-url של כל כפתור נשלח בנפרד, לפי מזהה הפעולה', () => {
  assert.equal(styleFor('match_goal').actionUrls.live, '/#/leaderboard');
  assert.equal(styleFor('lock-reminder').actionUrls.bet, '/#/betting');
});

test('התראות שקוראות לפעולה מפנות להימורים, ואירועי משחק לטבלה', () => {
  assert.equal(styleFor('nudge').actions[0].action, 'bet');
  assert.equal(styleFor('week_activated').actions[0].action, 'bet');
  assert.equal(styleFor('match_end').actions[0].action, 'live');
});

test('מערך הרטט הוא מספרים חיוביים בלבד', () => {
  for (const type of ['match_goal', 'match_red', 'exact_score', 'nudge']) {
    for (const ms of styleFor(type).vibrate) {
      assert.equal(typeof ms, 'number');
      assert.ok(ms > 0, `${type}: ${ms}`);
    }
  }
});
