const test = require('node:test');
const assert = require('node:assert');
const { buildParticipation } = require('./participation');

const d = (s) => new Date(s);

const WEEKS = [
  { _id: 'w1', month: 9, season: '2025-26', createdAt: d('2025-09-01'), hasMatches: true },
  { _id: 'w2', month: 9, season: '2025-26', createdAt: d('2025-09-08'), hasMatches: true },
  { _id: 'w3', month: 10, season: '2025-26', createdAt: d('2025-10-01'), hasMatches: true },
  { _id: 'w4', month: 10, season: '2025-26', createdAt: d('2025-10-08'), hasMatches: true }
];

const veteran = { _id: 'u1', name: 'ותיק', createdAt: d('2025-08-01') };
const one = (rows, id) => rows.find((r) => r.userId === id);

test('מי שהימר בכל השבועות מקבל 100%', () => {
  const bets = WEEKS.map((w) => ({ userId: 'u1', weekId: w._id }));
  const r = one(buildParticipation([veteran], WEEKS, bets), 'u1');
  assert.strictEqual(r.weeksPlayed, 4);
  assert.strictEqual(r.weeksAvailable, 4);
  assert.strictEqual(r.participation, 100);
});

test('מי שלא הימר בכלל מקבל 0%, לא 100%', () => {
  // זה היה הבאג המרכזי: המדד ספר רשומות ניקוד, שנוצרות לכל אחד
  const r = one(buildParticipation([veteran], WEEKS, []), 'u1');
  assert.strictEqual(r.weeksPlayed, 0);
  assert.strictEqual(r.weeksAvailable, 4);
  assert.strictEqual(r.participation, 0);
});

test('כמה הימורים באותו שבוע נספרים כשבוע אחד', () => {
  const bets = [
    { userId: 'u1', weekId: 'w1' }, { userId: 'u1', weekId: 'w1' }, { userId: 'u1', weekId: 'w1' }
  ];
  const r = one(buildParticipation([veteran], WEEKS, bets), 'u1');
  assert.strictEqual(r.weeksPlayed, 1);
  assert.strictEqual(r.participation, 25);
});

test('שבועות שקדמו להצטרפות אינם נספרים לרעת השחקן', () => {
  // הצטרף אחרי שני השבועות הראשונים, והימר בשניים שנותרו
  const late = { _id: 'u2', name: 'מצטרף', createdAt: d('2025-09-20') };
  const bets = [{ userId: 'u2', weekId: 'w3' }, { userId: 'u2', weekId: 'w4' }];
  const r = one(buildParticipation([late], WEEKS, bets), 'u2');
  assert.strictEqual(r.weeksAvailable, 2, 'רק השבועות שאחרי ההצטרפות');
  assert.strictEqual(r.weeksPlayed, 2);
  assert.strictEqual(r.participation, 100);
});

test('חודש מוחרג יורד מהמכנה', () => {
  const bets = [{ userId: 'u1', weekId: 'w3' }, { userId: 'u1', weekId: 'w4' }];
  const excl = [{ userId: 'u1', month: 9, season: '2025-26' }];
  const r = one(buildParticipation([veteran], WEEKS, bets, excl), 'u1');
  assert.strictEqual(r.weeksAvailable, 2, 'ספטמבר יורד');
  assert.strictEqual(r.participation, 100);
});

test('הימור בחודש מוחרג עדיין נספר - אחרת יוצא מעל 100%', () => {
  // קיים בנתונים האמיתיים: שחקנים שהימרו בחודש שהוחרגו ממנו. בלי החריג
  // הזה יצא להם יותר שבועות ששיחקו בהם מאשר שבועות זמינים.
  const bets = WEEKS.map((w) => ({ userId: 'u1', weekId: w._id }));
  const excl = [{ userId: 'u1', month: 9, season: '2025-26' }];
  const r = one(buildParticipation([veteran], WEEKS, bets, excl), 'u1');
  assert.strictEqual(r.weeksAvailable, 4);
  assert.strictEqual(r.weeksPlayed, 4);
  assert.strictEqual(r.participation, 100);
});

test('אף שחקן לא יכול לעבור 100%', () => {
  const excl = [{ userId: 'u1', month: 9, season: '2025-26' }, { userId: 'u1', month: 10, season: '2025-26' }];
  const bets = WEEKS.map((w) => ({ userId: 'u1', weekId: w._id }));
  const r = one(buildParticipation([veteran], WEEKS, bets, excl), 'u1');
  assert.ok(r.participation <= 100, `יצא ${r.participation}%`);
  assert.ok(r.weeksPlayed <= r.weeksAvailable);
});

test('שבוע בלי משחקים לא נספר', () => {
  const weeks = [...WEEKS, { _id: 'w5', month: 11, season: '2025-26', createdAt: d('2025-11-01'), hasMatches: false }];
  const r = one(buildParticipation([veteran], weeks, []), 'u1');
  assert.strictEqual(r.weeksAvailable, 4);
});

test('שחקן בלי שבועות זמינים מקבל 0 ולא חלוקה באפס', () => {
  const brandNew = { _id: 'u3', name: 'חדש', createdAt: d('2030-01-01') };
  const r = one(buildParticipation([brandNew], WEEKS, []), 'u3');
  assert.strictEqual(r.weeksAvailable, 0);
  assert.strictEqual(r.participation, 0);
  assert.ok(Number.isFinite(r.participation));
});

test('מוחזרים גם המספרים הגולמיים, לא רק אחוז', () => {
  const bets = [{ userId: 'u1', weekId: 'w1' }];
  const r = one(buildParticipation([veteran], WEEKS, bets), 'u1');
  assert.strictEqual(r.weeksPlayed, 1);
  assert.strictEqual(r.weeksAvailable, 4);
  assert.strictEqual(r.weeksMissed, 3);
  assert.strictEqual(r.weeksPlayed + r.weeksMissed, r.weeksAvailable);
});

test('כל שחקן מחושב בנפרד ואינו מושפע מהאחרים', () => {
  const players = [veteran, { _id: 'u2', name: 'שני', createdAt: d('2025-08-01') }];
  const bets = [{ userId: 'u1', weekId: 'w1' }, { userId: 'u1', weekId: 'w2' }, { userId: 'u2', weekId: 'w1' }];
  const rows = buildParticipation(players, WEEKS, bets);
  assert.strictEqual(one(rows, 'u1').participation, 50);
  assert.strictEqual(one(rows, 'u2').participation, 25);
});

test('משתמש בלי תאריך הצטרפות נחשב כמי שהיה מההתחלה', () => {
  const noDate = { _id: 'u4', name: 'בלי תאריך' };
  const r = one(buildParticipation([noDate], WEEKS, [{ userId: 'u4', weekId: 'w1' }]), 'u4');
  assert.strictEqual(r.weeksAvailable, 4);
  assert.strictEqual(r.participation, 25);
});
