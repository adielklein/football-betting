const test = require('node:test');
const assert = require('node:assert');
const { classifyBettors, nudgeMessage } = require('./pendingBettors');

const MATCHES = ['m1', 'm2', 'm3'];

const player = (id, name, opts = {}) => ({
  _id: id,
  name,
  pushSettings: opts.noPush
    ? { enabled: false, subscriptions: [] }
    : { enabled: true, subscriptions: [{ endpoint: 'https://fcm.googleapis.com/x' }] }
});

const betsFor = (userId, ids) => ids.map((m) => ({ userId, matchId: m }));
const names = (rows) => rows.map((r) => r.name);

test('מי שלא הימר בכלל נמצא ברשימת החסרים', () => {
  const r = classifyBettors([player('u1', 'אלף')], MATCHES, []);
  assert.deepStrictEqual(names(r.pending), ['אלף']);
  assert.strictEqual(r.pending[0].placed, 0);
  assert.strictEqual(r.pending[0].missing, 3);
});

test('מי שמילא חלקית עדיין נחשב חסר', () => {
  const r = classifyBettors([player('u1', 'אלף')], MATCHES, betsFor('u1', ['m1', 'm2']));
  assert.strictEqual(r.pending.length, 1);
  assert.strictEqual(r.pending[0].placed, 2);
  assert.strictEqual(r.pending[0].missing, 1);
});

test('מי שסיים לא מקבל דחיפה', () => {
  const r = classifyBettors([player('u1', 'אלף')], MATCHES, betsFor('u1', MATCHES));
  assert.deepStrictEqual(names(r.pending), []);
  assert.deepStrictEqual(names(r.complete), ['אלף']);
});

test('מי שאינו רשום לחודש אינו נחשב חסר - זו כל הנקודה', () => {
  // הוא לא בתחרות החודש הזה, ודחיפה להמר תיראה לו כטעות
  const players = [player('u1', 'אלף'), player('u2', 'בית')];
  const r = classifyBettors(players, MATCHES, [], [{ userId: 'u2' }]);
  assert.deepStrictEqual(names(r.pending), ['אלף']);
  assert.deepStrictEqual(names(r.notRegistered), ['בית']);
  assert.strictEqual(r.complete.length, 0);
});

test('מוחרג שדווקא כן הימר עדיין לא נספר כחסר', () => {
  const r = classifyBettors([player('u1', 'אלף')], MATCHES, betsFor('u1', ['m1']), [{ userId: 'u1' }]);
  assert.strictEqual(r.pending.length, 0);
  assert.deepStrictEqual(names(r.notRegistered), ['אלף']);
});

test('הימור כפול לאותו משחק נספר פעם אחת', () => {
  const dup = [...betsFor('u1', ['m1', 'm1', 'm1']), ...betsFor('u1', ['m2'])];
  const r = classifyBettors([player('u1', 'אלף')], MATCHES, dup);
  assert.strictEqual(r.pending[0].placed, 2);
});

test('הימור למשחק שאינו בשבוע הזה לא נספר', () => {
  const r = classifyBettors([player('u1', 'אלף')], MATCHES, betsFor('u1', ['m1', 'זר']));
  assert.strictEqual(r.pending[0].placed, 1);
});

test('מי שאין לו התראות מופיע ברשימה אך מסומן כלא-בר-השגה', () => {
  const players = [player('u1', 'אלף'), player('u2', 'בית', { noPush: true })];
  const r = classifyBettors(players, MATCHES, []);
  assert.strictEqual(r.pending.length, 2, 'שניהם חסרים');
  assert.strictEqual(r.reachable, 1, 'רק אחד ניתן להשגה');
  assert.strictEqual(r.pending.find((x) => x.name === 'בית').canBeNotified, false);
});

test('החסרים ממוינים לפי כמה חסר להם, מהגדול לקטן', () => {
  const players = [player('u1', 'אלף'), player('u2', 'בית'), player('u3', 'גימל')];
  const bets = [...betsFor('u1', ['m1', 'm2']), ...betsFor('u2', ['m1'])];
  const r = classifyBettors(players, MATCHES, bets);
  assert.deepStrictEqual(names(r.pending), ['גימל', 'בית', 'אלף']);
});

test('שבוע בלי משחקים לא מסווג אף אחד כמי שסיים', () => {
  const r = classifyBettors([player('u1', 'אלף')], [], []);
  assert.strictEqual(r.matchCount, 0);
  assert.strictEqual(r.complete.length, 0);
  assert.strictEqual(r.pending.length, 1);
});

test('נוסח ההודעה מבחין בין מי שלא התחיל למי שבאמצע', () => {
  const week = { name: 'סופ"ש 1' };
  const none = nudgeMessage(week, { placed: 0, missing: 3, of: 3 });
  const partial = nudgeMessage(week, { placed: 2, missing: 1, of: 3 });

  assert.ok(none.body.includes('עדיין לא הימרת'));
  assert.ok(!partial.body.includes('לא הימרת'), 'למי שמילא חלק אסור לומר שלא הימר');
  assert.ok(partial.body.includes('1'));
  assert.ok(partial.body.includes('3'));
});

test('כל שחקן נופל לקבוצה אחת בדיוק', () => {
  const players = [
    player('u1', 'אלף'), player('u2', 'בית'), player('u3', 'גימל'), player('u4', 'דלת')
  ];
  const bets = [...betsFor('u1', MATCHES), ...betsFor('u2', ['m1'])];
  const r = classifyBettors(players, MATCHES, bets, [{ userId: 'u4' }]);
  assert.strictEqual(r.pending.length + r.complete.length + r.notRegistered.length, players.length);
  const all = [...r.pending, ...r.complete, ...r.notRegistered].map((x) => x.userId);
  assert.strictEqual(new Set(all).size, players.length, 'אף אחד לא מופיע פעמיים');
});
