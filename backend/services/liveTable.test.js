const test = require('node:test');
const assert = require('node:assert');
const { buildLiveTable, rankOf } = require('./liveTable');

const PLAYERS = [
  { _id: 'u1', name: 'אלף' },
  { _id: 'u2', name: 'בית' },
  { _id: 'u3', name: 'גימל' }
];

const match = (id, opts = {}) => ({
  _id: id, team1: 'א', team2: 'ב',
  result: opts.result ? { team1Goals: opts.result[0], team2Goals: opts.result[1] } : undefined,
  odds: opts.odds || null
});

const bet = (userId, matchId, pred) => ({
  userId, matchId, prediction: { team1Goals: pred[0], team2Goals: pred[1] }
});

const liveOf = (matchId, score, status = 'live', minute = "67'") => ({
  matchId, status, team1Goals: score[0], team2Goals: score[1], minute
});

const row = (t, id) => t.rows.find((r) => r.userId === id);

test('דירוג: שוויון מקבל את המקום הגבוה', () => {
  assert.strictEqual(rankOf(5, [7, 6, 3]), 3);
  assert.strictEqual(rankOf(5, [5, 5, 1]), 1);
});

test('בלי משחקים חיים, הטבלה החיה זהה למאושרת', () => {
  const matches = [match('m1', { result: [2, 1] })];
  const bets = [bet('u1', 'm1', [2, 1]), bet('u2', 'm1', [1, 0])];
  const t = buildLiveTable(PLAYERS, matches, bets, []);

  assert.strictEqual(row(t, 'u1').confirmedScore, 3);
  assert.strictEqual(row(t, 'u1').liveScore, 3);
  assert.strictEqual(row(t, 'u1').gained, 0);
  assert.strictEqual(row(t, 'u1').rankChange, 0);
  assert.strictEqual(t.liveMatches, 0);
});

test('משחק חי מוסיף ניקוד ומזיז דירוג', () => {
  const matches = [match('m1', { result: [1, 0] }), match('m2')];
  const bets = [
    bet('u1', 'm1', [1, 0]),   // בול מאושר = 3
    bet('u2', 'm1', [2, 0]),   // כיוון = 1
    bet('u2', 'm2', [1, 1])    // המשחק החי: בול = 3 נוספות
  ];
  const t = buildLiveTable(PLAYERS, matches, bets, [liveOf('m2', [1, 1])]);

  assert.strictEqual(row(t, 'u1').confirmedScore, 3);
  assert.strictEqual(row(t, 'u1').liveScore, 3);
  assert.strictEqual(row(t, 'u2').confirmedScore, 1);
  assert.strictEqual(row(t, 'u2').liveScore, 4);

  // u2 עוקף את u1 בזכות המשחק החי
  assert.strictEqual(row(t, 'u2').confirmedRank, 2);
  assert.strictEqual(row(t, 'u2').liveRank, 1);
  assert.strictEqual(row(t, 'u2').rankChange, 1);
  assert.strictEqual(row(t, 'u1').rankChange, -1);
});

test('תוצאה שמורה גוברת על החיה - היא כוללת הארכה ופנדלים', () => {
  // המשחק הסתיים 1-1 ב-90, ובהארכה נשמר 2-1. החי עדיין מדווח 1-1.
  const matches = [match('m1', { result: [2, 1] })];
  const bets = [bet('u1', 'm1', [1, 1]), bet('u2', 'm1', [2, 1])];
  const t = buildLiveTable(PLAYERS, matches, bets, [liveOf('m1', [1, 1], 'finished')]);

  assert.strictEqual(row(t, 'u1').liveScore, 0, 'הניחוש 1-1 לא זוכה - התוצאה השמורה היא 2-1');
  assert.strictEqual(row(t, 'u2').liveScore, 3);
});

test('משחק שטרם החל אינו משפיע', () => {
  const matches = [match('m1')];
  const bets = [bet('u1', 'm1', [1, 0])];
  const t = buildLiveTable(PLAYERS, matches, bets, [
    { matchId: 'm1', status: 'scheduled', team1Goals: null, team2Goals: null }
  ]);
  assert.strictEqual(row(t, 'u1').liveScore, 0);
  assert.strictEqual(t.pendingMatches, 1);
  assert.strictEqual(t.liveMatches, 0);
});

test('הרווחים מהמשחקים החיים מפורטים, עם סימון בול', () => {
  const matches = [match('m1'), match('m2')];
  const bets = [bet('u1', 'm1', [2, 1]), bet('u1', 'm2', [3, 0])];
  const t = buildLiveTable(PLAYERS, matches, bets, [
    liveOf('m1', [2, 1]),        // בול
    liveOf('m2', [1, 0], 'live') // כיוון בלבד
  ]);

  const gains = row(t, 'u1').gains;
  assert.strictEqual(gains.length, 2);
  assert.strictEqual(gains[0].points, 3, 'הגדול קודם');
  assert.strictEqual(gains[0].exact, true);
  assert.strictEqual(gains[1].exact, false);
  assert.strictEqual(gains[0].minute, "67'");
});

test('שחקן בלי הימורים מופיע עם אפס ולא נעלם', () => {
  const t = buildLiveTable(PLAYERS, [match('m1', { result: [1, 0] })], [bet('u1', 'm1', [1, 0])]);
  assert.strictEqual(t.rows.length, 3);
  assert.strictEqual(row(t, 'u3').liveScore, 0);
});

test('יחסים נלקחים בחשבון גם בחישוב החי', () => {
  const odds = { homeWin: 1.5, draw: 3.9, awayWin: 6.2 };
  const matches = [match('m1', { odds })];
  const bets = [bet('u1', 'm1', [0, 2])];
  const t = buildLiveTable(PLAYERS, matches, bets, [liveOf('m1', [0, 2])]);
  assert.strictEqual(row(t, 'u1').liveScore, 4.1); // 6.2 * 2/3
});

test('הימור של מי שאינו ברשימה מדולג', () => {
  const matches = [match('m1', { result: [1, 0] })];
  const t = buildLiveTable(PLAYERS, matches, [bet('admin', 'm1', [1, 0])]);
  assert.ok(t.rows.every((r) => r.liveScore === 0));
});

test('הטבלה ממוינת לפי הניקוד החי', () => {
  const matches = [match('m1'), match('m2', { result: [0, 0] })];
  const bets = [
    bet('u1', 'm2', [0, 0]),   // 3 מאושרות
    bet('u2', 'm1', [1, 1]),   // 3 חיות
    bet('u2', 'm2', [0, 0])    // ועוד 3 מאושרות
  ];
  const t = buildLiveTable(PLAYERS, matches, bets, [liveOf('m1', [1, 1])]);
  assert.deepStrictEqual(t.rows.map((r) => r.userId), ['u2', 'u1', 'u3']);
});

test('ספירת המשחקים החיים והממתינים נכונה', () => {
  const matches = [match('m1', { result: [1, 0] }), match('m2'), match('m3')];
  const t = buildLiveTable(PLAYERS, matches, [], [liveOf('m2', [0, 0])]);
  assert.strictEqual(t.liveMatches, 1);
  assert.strictEqual(t.pendingMatches, 1); // m3 בלבד
});
