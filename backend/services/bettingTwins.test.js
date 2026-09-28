const test = require('node:test');
const assert = require('node:assert');
const { buildBettingTwins } = require('./bettingTwins');

const p = (a, b) => ({ team1Goals: a, team2Goals: b });
const players = [{ _id: 'dana', name: 'דנה' }, { _id: 'yossi', name: 'יוסי' }, { _id: 'avi', name: 'אבי' }];

// עשרה משחקים שהשחקן הימר עליהם, כולם 2-1
const myBets = Array.from({ length: 10 }, (_, i) => ({ matchId: 'm' + i, prediction: p(2, 1) }));
const others = (userId, fn, count = 10) =>
  Array.from({ length: count }, (_, i) => ({ userId, matchId: 'm' + i, prediction: fn(i) }));

test('התאום הוא מי שהימר הכי הרבה אותה תוצאה בדיוק', () => {
  const { twins } = buildBettingTwins(myBets, [
    ...others('dana', (i) => (i < 8 ? p(2, 1) : p(0, 0))),
    ...others('yossi', (i) => (i < 3 ? p(2, 1) : p(1, 0))),
  ], players);
  assert.deepStrictEqual(twins.map((t) => t.name), ['דנה', 'יוסי']);
  assert.strictEqual(twins[0].same, 8);
  assert.strictEqual(twins[0].common, 10);
  assert.strictEqual(twins[0].sameRate, 80);
});

test('אותו כיוון נספר בנפרד מתוצאה זהה', () => {
  const { twins } = buildBettingTwins(myBets, others('yossi', (i) => (i < 3 ? p(2, 1) : p(1, 0))), players);
  assert.strictEqual(twins[0].sameRate, 30);
  assert.strictEqual(twins[0].directionRate, 100); // 1-0 ו-2-1 שניהם ניצחון בית
});

test('אחוז קובע ולא ספירה: מי שמהמר יותר לא מנצח רק בגלל נפח', () => {
  const many = Array.from({ length: 40 }, (_, i) => ({ matchId: 'm' + i, prediction: p(2, 1) }));
  const { twins } = buildBettingTwins(many, [
    ...others('dana', (i) => (i < 12 ? p(2, 1) : p(0, 3)), 40), // 12/40 = 30%
    ...others('yossi', (i) => (i < 9 ? p(2, 1) : p(0, 3)), 10), // 9/10 = 90%
  ], players);
  assert.strictEqual(twins[0].name, 'יוסי');
});

test('פחות מהמינימום של משחקים משותפים - לא נכנס לדירוג', () => {
  const { twins, minCommon } = buildBettingTwins(myBets, others('dana', () => p(2, 1), 4), players);
  assert.strictEqual(minCommon, 10);
  assert.deepStrictEqual(twins, []);
});

test('מי שלא ברשימת השחקנים (אדמין, נמחק) לא מושווה', () => {
  const { twins } = buildBettingTwins(myBets, others('admin', () => p(2, 1)), players);
  assert.deepStrictEqual(twins, []);
});

test('הימור על משחק שהשחקן לא הימר עליו לא נספר', () => {
  const stray = Array.from({ length: 10 }, (_, i) => ({ userId: 'dana', matchId: 'x' + i, prediction: p(2, 1) }));
  const { twins } = buildBettingTwins(myBets, [...stray, ...others('dana', () => p(0, 0))], players);
  assert.strictEqual(twins[0].common, 10);
  assert.strictEqual(twins[0].same, 0);
});

test('בתיקו באחוז - מי שיש לו יותר התאמות בפועל קודם', () => {
  const many = Array.from({ length: 20 }, (_, i) => ({ matchId: 'm' + i, prediction: p(2, 1) }));
  const { twins } = buildBettingTwins(many, [
    ...others('dana', (i) => (i < 5 ? p(2, 1) : p(0, 0)), 10),   // 5/10
    ...others('yossi', (i) => (i < 10 ? p(2, 1) : p(0, 0)), 20), // 10/20
  ], players);
  assert.deepStrictEqual(twins.map((t) => t.name), ['יוסי', 'דנה']);
});

test('מחזיר עד שלושה', () => {
  const four = [...players, { _id: 'rina', name: 'רינה' }];
  const bets = ['dana', 'yossi', 'avi', 'rina'].flatMap((u) => others(u, () => p(2, 1)));
  assert.strictEqual(buildBettingTwins(myBets, bets, four).twins.length, 3);
});

test('הימורים שבורים נזרקים ולא מפילים', () => {
  const { twins } = buildBettingTwins(
    [...myBets, { matchId: 'bad', prediction: null }],
    [...others('dana', () => p(2, 1)), { userId: 'dana', matchId: 'm1', prediction: {} }],
    players
  );
  assert.strictEqual(twins[0].common, 10);
  assert.deepStrictEqual(buildBettingTwins(undefined, undefined, undefined).twins, []);
});
