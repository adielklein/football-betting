const test = require('node:test');
const assert = require('node:assert');
const { buildNearMissReport, rankFor } = require('./nearMissReport');

const mkBet = (id, t1, t2, pred, result, opts = {}) => ({
  weekId: opts.weekId || 'w1',
  weekName: opts.weekName || 'שבוע א',
  prediction: { team1Goals: pred[0], team2Goals: pred[1] },
  match: {
    _id: id,
    team1: t1,
    team2: t2,
    result: { team1Goals: result[0], team2Goals: result[1] },
    odds: opts.odds || null
  }
});

test('דירוג: שוויון מקבל את המקום הגבוה', () => {
  assert.strictEqual(rankFor(10, [12, 11, 9]), 3);
  assert.strictEqual(rankFor(10, [10, 10, 9]), 1);
  assert.strictEqual(rankFor(10, []), 1);
  assert.strictEqual(rankFor(0, [5, 4, 3]), 4);
});

test('בול לא נספר כהחמצה', () => {
  const r = buildNearMissReport([mkBet('m1', 'א', 'ב', [2, 1], [2, 1])]);
  assert.strictEqual(r.nearCount, 0);
  assert.strictEqual(r.lostToOneGoal, 0);
  assert.deepStrictEqual(r.biggest, []);
});

test('שער אחד מבול נספר, ומחושב מה זה עלה', () => {
  const r = buildNearMissReport([mkBet('m1', 'ארסנל', 'צלסי', [2, 0], [2, 1])]);
  assert.strictEqual(r.nearCount, 1);
  assert.strictEqual(r.lostToOneGoal, 2); // קיבל 1, בול היה 3
  assert.strictEqual(r.biggest[0].predicted, '2-0');
  assert.strictEqual(r.biggest[0].actual, '2-1');
  assert.strictEqual(r.biggest[0].distance, 1);
});

test('החמצה רחוקה נספרת כהחמצה אך לא כ"קרוב"', () => {
  const r = buildNearMissReport([mkBet('m1', 'א', 'ב', [0, 3], [3, 0])]);
  assert.strictEqual(r.totalMisses, 1);
  assert.strictEqual(r.nearCount, 0);
  assert.strictEqual(r.lostToOneGoal, 0);
});

test('ההחמצות ממוינות לפי מה שהן עלו, לא לפי סדר ההגעה', () => {
  const odds = { homeWin: 1.2, draw: 4.0, awayWin: 9.0 };
  const r = buildNearMissReport([
    mkBet('cheap', 'א', 'ב', [2, 0], [1, 0], { odds }),
    mkBet('pricy', 'ג', 'ד', [0, 2], [0, 1], { odds })
  ]);
  assert.strictEqual(r.biggest[0].matchId, 'pricy');
  assert.ok(r.biggest[0].lost > r.biggest[1].lost);
});

test('טיפוס בטבלה נמדד על ההחמצה הבודדת', () => {
  // השחקן צבר 1 נקודה; בול היה נותן 3. היריבים: 2 ו-2.5.
  const rivals = new Map([['w1', [2, 2.5]]]);
  const r = buildNearMissReport([mkBet('m1', 'א', 'ב', [2, 0], [2, 1])], rivals);

  const w = r.weeks[0];
  assert.strictEqual(w.actual, 1);
  assert.strictEqual(w.potential, 3);
  assert.strictEqual(w.actualRank, 3);
  assert.strictEqual(w.potentialRank, 1);

  assert.strictEqual(r.biggestRankMiss.matchId, 'm1');
  assert.strictEqual(r.biggestRankMiss.rankBefore, 3);
  assert.strictEqual(r.biggestRankMiss.rankIfLanded, 1);
  assert.strictEqual(r.biggestRankMiss.rankGain, 2);
});

test('הכותרת נשענת על משחק אחד, לא על כל ההחמצות יחד', () => {
  // שתי החמצות של שער אחד, כל אחת שווה 2 נקודות (1 -> 3).
  // בפועל: 2 נקודות. יריבים: 3 ו-9.
  // החמצה בודדת מביאה ל-4 - עוקפת את 3 בלבד, כלומר מקום 3 -> 2.
  // שתיהן יחד היו מביאות ל-6, וזה עדיין מקום 2 - ולכן הטענה זהה,
  // אבל היא נאמרת על משחק מסוים ולא על תרחיש מצטבר.
  const rivals = new Map([['w1', [3, 9]]]);
  const r = buildNearMissReport([
    mkBet('a', 'א', 'ב', [2, 0], [2, 1]),
    mkBet('b', 'ג', 'ד', [0, 2], [1, 2])
  ], rivals);

  assert.strictEqual(r.weeks[0].actual, 2);
  assert.strictEqual(r.weeks[0].potential, 6);
  assert.strictEqual(r.biggestRankMiss.rankBefore, 3);
  assert.strictEqual(r.biggestRankMiss.rankIfLanded, 2);
  assert.strictEqual(r.biggestRankMiss.rankGain, 1);
});

test('כשההחמצה לא הייתה משנה מקום, אין דיווח על טיפוס', () => {
  const rivals = new Map([['w1', [40, 50]]]); // היריבים רחוקים מדי
  const r = buildNearMissReport([mkBet('m1', 'א', 'ב', [2, 0], [2, 1])], rivals);
  assert.strictEqual(r.biggest[0].rankGain, 0);
  assert.strictEqual(r.biggestRankMiss, null);
});

test('התרחיש סופר רק החמצות של שער אחד, לא מנפח הכל לבולים', () => {
  const r = buildNearMissReport([
    mkBet('near', 'א', 'ב', [2, 0], [2, 1]),   // שער אחד: 1 -> 3
    mkBet('far', 'ג', 'ד', [0, 4], [3, 0])     // רחוק: נשאר 0
  ]);
  const w = r.weeks[0];
  assert.strictEqual(w.actual, 1);
  assert.strictEqual(w.potential, 3);
  assert.strictEqual(w.nearCount, 1);
});

test('שבועות בלי החמצות קרובות לא מופיעים ברשימה', () => {
  const r = buildNearMissReport([
    mkBet('a', 'א', 'ב', [2, 1], [2, 1], { weekId: 'w1' }),  // בול
    mkBet('b', 'ג', 'ד', [2, 0], [2, 1], { weekId: 'w2' })   // החמצה קרובה
  ]);
  assert.strictEqual(r.weeks.length, 1);
  assert.strictEqual(r.weeks[0].weekId, 'w2');
});

test('הימור בלי תוצאה או בלי ניחוש מדולג בשקט', () => {
  const noResult = mkBet('m1', 'א', 'ב', [1, 0], [0, 0]);
  noResult.match.result = { team1Goals: null, team2Goals: null };
  const noPred = mkBet('m2', 'ג', 'ד', [1, 0], [2, 1]);
  noPred.prediction = null;

  const r = buildNearMissReport([noResult, noPred]);
  assert.strictEqual(r.totalMisses, 0);
  assert.strictEqual(r.nearCount, 0);
});
