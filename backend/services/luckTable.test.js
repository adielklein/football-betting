const test = require('node:test');
const assert = require('node:assert');
const { buildLuckTable, MIN_BETS_FOR_RANK } = require('./luckTable');

const players = [
  { _id: 'u1', name: 'אלף' },
  { _id: 'u2', name: 'בית' },
  { _id: 'u3', name: 'גימל' }
];

const mkBet = (userId, pred, result, odds = null) => ({
  userId,
  prediction: { team1Goals: pred[0], team2Goals: pred[1] },
  match: { _id: 'm', team1: 'א', team2: 'ב', result: { team1Goals: result[0], team2Goals: result[1] }, odds }
});

// החמצה של שער אחד ששווה 2 נקודות (ניחש 2-0, יצא 2-1)
const near = (u) => mkBet(u, [2, 0], [2, 1]);
// בול
const hit = (u) => mkBet(u, [2, 1], [2, 1]);
const many = (fn, u, n) => Array.from({ length: n }, () => fn(u));

test('כל שחקן מקבל מקום אחד - אין "כולם ראשונים"', () => {
  const rows = buildLuckTable([
    ...many(near, 'u1', 10), ...many(hit, 'u1', 20),   // קצב 20/30 = 0.67
    ...many(near, 'u2', 20), ...many(hit, 'u2', 10),   // קצב 40/30 = 1.33
    ...many(hit, 'u3', 30)                              // קצב 0
  ], players);

  assert.deepStrictEqual(rows.map((r) => r.name), ['בית', 'אלף', 'גימל']);
  assert.deepStrictEqual(rows.map((r) => r.rank), [1, 2, 3]);
});

test('הדירוג לפי קצב ולא לפי סכום', () => {
  // u1 הימר הרבה והחמיץ הרבה בסכום; u2 הימר מעט אבל החמיץ כמעט תמיד.
  const rows = buildLuckTable([
    ...many(near, 'u1', 30), ...many(hit, 'u1', 170),  // 60 נק, קצב 0.3
    ...many(near, 'u2', 20), ...many(hit, 'u2', 5)     // 40 נק, קצב 1.6
  ], players);

  assert.strictEqual(rows[0].userId, 'u2', 'הקצב הגבוה מנצח למרות הסכום הנמוך');
  assert.ok(rows[0].lost < rows[1].lost, 'ודווקא הסכום שלו קטן יותר');
  assert.ok(rows[0].lostPerBet > rows[1].lostPerBet);
});

test('כולם מקבלים בדיוק אותו יחס', () => {
  const rows = buildLuckTable([
    ...many(near, 'u1', 25),
    ...Array.from({ length: 25 }, () => mkBet('u2', [0, 2], [1, 2]))
  ], players);
  assert.strictEqual(rows[0].lostPerBet, rows[1].lostPerBet);
  assert.strictEqual(rows[0].lost, rows[1].lost);
});

test('מעט מדי הימורים - מופיע בלי מקום, בתחתית', () => {
  const few = MIN_BETS_FOR_RANK - 1;
  const rows = buildLuckTable([
    ...many(near, 'u1', few),                          // קצב 2.0, אבל מעט הימורים
    ...many(near, 'u2', 5), ...many(hit, 'u2', 25)     // קצב נמוך, מספיק הימורים
  ], players);

  assert.strictEqual(rows[0].userId, 'u2', 'המדורג קודם למי שאין לו מספיק');
  assert.strictEqual(rows[0].rank, 1);
  assert.strictEqual(rows[1].userId, 'u1');
  assert.strictEqual(rows[1].rank, null);
  assert.strictEqual(rows[1].ranked, false);
});

test('אחוז ההימורים שהיו שער אחד', () => {
  const rows = buildLuckTable([...many(near, 'u1', 10), ...many(hit, 'u1', 30)], players);
  assert.strictEqual(rows[0].nearRate, 25);
  assert.strictEqual(rows[0].bets, 40);
  assert.strictEqual(rows[0].nearCount, 10);
});

test('החמצה רחוקה לא נספרת', () => {
  const rows = buildLuckTable(
    Array.from({ length: 25 }, () => mkBet('u1', [0, 4], [3, 0])), players
  );
  assert.strictEqual(rows[0].lost, 0);
  assert.strictEqual(rows[0].nearCount, 0);
  assert.strictEqual(rows[0].bets, 25);
});

test('הימור של מי שאינו ברשימת השחקנים מדולג', () => {
  const rows = buildLuckTable([...many(near, 'admin', 25), ...many(near, 'u1', 25)], players);
  assert.strictEqual(rows.length, 1);
  assert.strictEqual(rows[0].userId, 'u1');
});

test('יחסים נלקחים בחשבון - החמצה יקרה שווה יותר', () => {
  const odds = { homeWin: 1.2, draw: 4.0, awayWin: 9.0 };
  const rows = buildLuckTable([
    ...Array.from({ length: 25 }, () => mkBet('u1', [2, 0], [1, 0], odds)),
    ...Array.from({ length: 25 }, () => mkBet('u2', [0, 2], [0, 1], odds))
  ], players);
  assert.strictEqual(rows[0].userId, 'u2');
  assert.ok(rows[0].lost > rows[1].lost);
});

test('הימור בלי תוצאה לא נספר כהימור', () => {
  const b = mkBet('u1', [1, 0], [0, 0]);
  b.match.result = { team1Goals: null, team2Goals: null };
  const rows = buildLuckTable([b, ...many(near, 'u1', 25)], players);
  assert.strictEqual(rows[0].bets, 25);
});

test('שחקן בלי הימורים מוכרעים לא מופיע כלל', () => {
  const rows = buildLuckTable(many(near, 'u1', 25), players);
  assert.deepStrictEqual(rows.map((r) => r.userId), ['u1']);
});
