const test = require('node:test');
const assert = require('node:assert');
const {
  buildCourageTable, courageOf, impliedProbabilities, BRAVE_THRESHOLD
} = require('./courageTable');

// פייבוריט בית מובהק: ~77% בית, ~15% תיקו, ~8% חוץ אחרי נרמול
const LOPSIDED = { homeWin: 1.3, draw: 5.5, awayWin: 9.0 };
const EVEN = { homeWin: 3.0, draw: 3.0, awayWin: 3.0 };

const result = { team1Goals: 1, team2Goals: 0 };
const players = [{ _id: 'u1', name: 'דנה' }, { _id: 'u2', name: 'רועי' }];

const bet = (userId, pred, odds, points = 0) => ({
  userId,
  prediction: pred,
  points,
  match: { result, odds }
});

const HOME = { team1Goals: 2, team2Goals: 0 };
const AWAY = { team1Goals: 0, team2Goals: 2 };
const DRAW = { team1Goals: 1, team2Goals: 1 };

test('ההסתברויות המשתמעות מנורמלות לסכום 1', () => {
  const p = impliedProbabilities(LOPSIDED);
  assert.ok(Math.abs(p.home + p.draw + p.away - 1) < 1e-9);
  assert.ok(p.home > p.draw && p.draw > p.away);
});

test('ניחוש על פייבוריט דורש מעט אומץ, ועל המנצחת המופתעת הרבה', () => {
  const safe = courageOf(HOME, LOPSIDED);
  const brave = courageOf(AWAY, LOPSIDED);
  assert.ok(safe < 0.3, `safe=${safe}`);
  assert.ok(brave > 0.85, `brave=${brave}`);
  assert.ok(brave > safe);
});

test('במשחק מאוזן כל הכיוונים דורשים אומץ דומה', () => {
  const values = [HOME, DRAW, AWAY].map((p) => courageOf(p, EVEN));
  const spread = Math.max(...values) - Math.min(...values);
  assert.ok(spread < 0.01, `spread=${spread}`);
});

test('בלי יחסים אי אפשר לתמחר אומץ', () => {
  assert.equal(courageOf(HOME, null), null);
  assert.equal(courageOf(HOME, {}), null);
});

test('הימור על משחק בלי יחסים נספר אך אינו מתומחר, והכיסוי מדווח', () => {
  const rows = buildCourageTable(
    [bet('u1', HOME, LOPSIDED), bet('u1', HOME, null)],
    players
  );
  const dana = rows.find((r) => r.userId === 'u1');
  assert.equal(dana.bets, 2);
  assert.equal(dana.priced, 1);
  assert.equal(dana.coverage, 50);
});

test('הדירוג הוא לפי ממוצע, כך שמי שהימר יותר אינו אמיץ יותר אוטומטית', () => {
  const brave = [bet('u1', AWAY, LOPSIDED)];
  // רועי אמיץ באותה מידה בכל הימור, אבל הימר שבע פעמים
  const many = Array.from({ length: 7 }, () => bet('u2', AWAY, LOPSIDED));

  const rows = buildCourageTable([...brave, ...many], players);
  const [a, b] = rows;
  assert.ok(Math.abs(a.courage - b.courage) < 1e-9, 'הממוצע זהה');
});

test('braveryPaid חיובי כשההימורים האמיצים הניבו יותר', () => {
  const rows = buildCourageTable([
    bet('u1', AWAY, LOPSIDED, 6),   // אמיץ, השתלם
    bet('u1', AWAY, LOPSIDED, 6),
    bet('u1', HOME, LOPSIDED, 1),   // זהיר, פחות
    bet('u1', HOME, LOPSIDED, 1)
  ], players);

  const dana = rows.find((r) => r.userId === 'u1');
  assert.equal(dana.bravePerBet, 6);
  assert.equal(dana.safePerBet, 1);
  assert.equal(dana.braveryPaid, 5);
});

test('braveryPaid שלילי כשהזהירות השתלמה יותר', () => {
  const rows = buildCourageTable([
    bet('u1', AWAY, LOPSIDED, 0),
    bet('u1', HOME, LOPSIDED, 3)
  ], players);
  assert.ok(rows.find((r) => r.userId === 'u1').braveryPaid < 0);
});

test('בלי צד אחד להשוואה, braveryPaid אינו מספר מומצא', () => {
  const rows = buildCourageTable([bet('u1', HOME, LOPSIDED, 3)], players);
  const dana = rows.find((r) => r.userId === 'u1');
  assert.equal(dana.braveBets, 0);
  assert.equal(dana.braveryPaid, null);
  assert.equal(dana.bravePerBet, null);
});

test('הסף מחלק נכון בין אמיץ לזהיר', () => {
  const rows = buildCourageTable([
    bet('u1', AWAY, LOPSIDED),  // אומץ גבוה
    bet('u1', HOME, LOPSIDED)   // אומץ נמוך
  ], players);
  const dana = rows.find((r) => r.userId === 'u1');
  assert.equal(dana.braveBets, 1);
  assert.equal(dana.safeBets, 1);
  assert.ok(BRAVE_THRESHOLD > 0 && BRAVE_THRESHOLD < 1);
});

test('משחק בלי תוצאה עדיין לא נספר', () => {
  const pending = { userId: 'u1', prediction: HOME, points: 0, match: { result: null, odds: LOPSIDED } };
  assert.deepEqual(buildCourageTable([pending], players), []);
});

test('מנהל או משתמש שנמחק אינו מופיע בטבלה', () => {
  const rows = buildCourageTable([bet('ghost', AWAY, LOPSIDED)], players);
  assert.deepEqual(rows, []);
});

test('מי שאין לו מספיק הימורים מתומחרים יורד לתחתית בלי מקום', () => {
  const rows = buildCourageTable([bet('u1', AWAY, LOPSIDED)], players);
  assert.equal(rows[0].ranked, false);
  assert.equal(rows[0].rank, null);
});
