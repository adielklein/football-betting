const test = require('node:test');
const assert = require('node:assert');
const { describeRemaining } = require('./lockReminder');

const HOUR = 60 * 60 * 1000;

test('ניסוח הזמן שנותר', () => {
  assert.strictEqual(describeRemaining(3 * HOUR), 'נשארו 3 שעות');
  assert.strictEqual(describeRemaining(1.5 * HOUR), 'נשארה שעה');
  assert.strictEqual(describeRemaining(30 * 60 * 1000), 'נשארו 30 דקות');
});

test('פחות מדקה עדיין מדווח כדקה, לא כאפס', () => {
  assert.strictEqual(describeRemaining(20 * 1000), 'נשארו 1 דקות');
});

// --- בחירת הנמענים ---
// selectRecipients נשען על מודלים של mongoose, ולכן הלוגיקה עצמה נבדקת כאן
// על עותק זהה. זו הלוגיקה שקובעת למי נשלחת ההתראה, וטעות בה מפציצה 13 אנשים.

const MAX_LEAD_HOURS = 72;

const pick = ({ users, excluded = [], reminded = [], bets = {}, matchCount, msLeft }) => {
  const excludedSet = new Set(excluded);
  const remindedSet = new Set(reminded);
  return users.filter((u) => {
    if (excludedSet.has(u.id)) return false;
    if (remindedSet.has(u.id)) return false;
    if ((bets[u.id] || 0) >= matchCount) return false;
    const lead = Math.min(u.hours || 2, MAX_LEAD_HOURS);
    return msLeft <= lead * HOUR;
  });
};

const USERS = [
  { id: 'a', hours: 2 },
  { id: 'b', hours: 24 },
  { id: 'c', hours: 2 }
];

test('נשלח רק למי שהגיע זמן ההתראה שלו', () => {
  // נשארו 3 שעות: b ביקש 24 ולכן כן, a ו-c ביקשו 2 ולכן עדיין לא
  const got = pick({ users: USERS, matchCount: 5, bets: {}, msLeft: 3 * HOUR });
  assert.deepStrictEqual(got.map((u) => u.id), ['b']);
});

test('כשהזמן מתקרב, גם השאר נכנסים', () => {
  const got = pick({ users: USERS, matchCount: 5, bets: {}, msLeft: 1.5 * HOUR });
  assert.deepStrictEqual(got.map((u) => u.id), ['a', 'b', 'c']);
});

test('מי שכבר מילא את כל ההימורים לא מקבל תזכורת', () => {
  const got = pick({
    users: USERS, matchCount: 5,
    bets: { a: 5, b: 5, c: 3 },   // a ו-b סיימו, c באמצע
    msLeft: 1 * HOUR
  });
  assert.deepStrictEqual(got.map((u) => u.id), ['c']);
});

test('מילוי חלקי עדיין מזכה בתזכורת', () => {
  const got = pick({ users: [USERS[0]], matchCount: 5, bets: { a: 4 }, msLeft: 1 * HOUR });
  assert.strictEqual(got.length, 1);
});

test('מי שכבר קיבל תזכורת לשבוע הזה לא מקבל שוב', () => {
  const got = pick({ users: USERS, reminded: ['a', 'b'], matchCount: 5, bets: {}, msLeft: 1 * HOUR });
  assert.deepStrictEqual(got.map((u) => u.id), ['c']);
});

test('מוחרג מהחודש לא מקבל', () => {
  const got = pick({ users: USERS, excluded: ['b'], matchCount: 5, bets: {}, msLeft: 1 * HOUR });
  assert.deepStrictEqual(got.map((u) => u.id), ['a', 'c']);
});

test('בקשה חריגה לשעות מראש נחתכת בתקרה', () => {
  // משתמש שביקש 500 שעות לא יקבל תזכורת שלושה שבועות מראש
  const greedy = [{ id: 'x', hours: 500 }];
  assert.strictEqual(pick({ users: greedy, matchCount: 5, bets: {}, msLeft: 100 * HOUR }).length, 0);
  assert.strictEqual(pick({ users: greedy, matchCount: 5, bets: {}, msLeft: 70 * HOUR }).length, 1);
});

test('ברירת המחדל היא שעתיים כשלא הוגדר כלום', () => {
  const noPref = [{ id: 'y' }];
  assert.strictEqual(pick({ users: noPref, matchCount: 5, bets: {}, msLeft: 3 * HOUR }).length, 0);
  assert.strictEqual(pick({ users: noPref, matchCount: 5, bets: {}, msLeft: 2 * HOUR }).length, 1);
});

test('שילוב: רק מי שעומד בכל התנאים יחד', () => {
  const got = pick({
    users: [
      { id: 'a', hours: 2 },   // בזמן, לא סיים, לא הוזכר      -> כן
      { id: 'b', hours: 2 },   // סיים                          -> לא
      { id: 'c', hours: 2 },   // כבר הוזכר                     -> לא
      { id: 'd', hours: 2 },   // מוחרג                         -> לא
      { id: 'e', hours: 1 }    // עוד לא בטווח שלו              -> לא
    ],
    excluded: ['d'],
    reminded: ['c'],
    bets: { b: 5 },
    matchCount: 5,
    msLeft: 1.5 * HOUR
  });
  assert.deepStrictEqual(got.map((u) => u.id), ['a']);
});
