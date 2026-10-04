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

// === מחצית ===
const { toLiveEntry, isHalftime, STATUS_LIVE: LIVE } = require('./liveScores');
const liveGame = (shortStatusText, statusText, gameTimeDisplay = "45+2'", statusGroup = LIVE) => ({
  statusGroup, shortStatusText, statusText, gameTimeDisplay,
  homeCompetitor: { score: 1 }, awayCompetitor: { score: 0 }
});
const entry = (game) => toLiveEntry({ _id: 'm1' }, game);

test('בהפסקת המחצית מוצג "מחצית" במקום הדקה הקפואה', () => {
  const e = entry(liveGame('מחצית', 'מחצית'));
  assert.equal(e.minute, 'מחצית');
  assert.equal(e.halftime, true);
  assert.equal(e.status, 'live');
});

test('מזהה גם את הניסוחים באנגלית', () => {
  for (const t of ['HT', 'Halftime', 'Half Time', 'half-time']) {
    assert.equal(isHalftime({ shortStatusText: t }), true, t);
  }
});

test('מחצית ראשונה או שנייה הן זמן משחק - הדקה נשארת', () => {
  for (const t of ['מחצית ראשונה', 'מחצית שנייה', 'מחצית 1', '2nd Half', '1st Half']) {
    const e = entry(liveGame(t, t, "38'"));
    assert.equal(e.minute, "38'", t);
    assert.equal(e.halftime, false, t);
  }
});

test('הפסקה לפני הארכה איננה מחצית', () => {
  assert.equal(isHalftime({ statusText: 'הפסקה לפני הארכה' }), false);
  assert.equal(isHalftime({ statusText: 'Break Time' }), false);
});

test('מספיק שאחד משני הטקסטים אומר מחצית', () => {
  assert.equal(entry(liveGame('HT', "45'")).minute, 'מחצית');
  assert.equal(entry(liveGame(null, ' מחצית ')).minute, 'מחצית');
});

test('משחק שלא מתנהל לא מסומן כמחצית גם אם הטקסט מתאים', () => {
  const e = entry(liveGame('HT', 'HT', null, 2));
  assert.equal(e.halftime, false);
  assert.equal(e.minute, null);
});
