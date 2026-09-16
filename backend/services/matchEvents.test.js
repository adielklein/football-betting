const test = require('node:test');
const assert = require('node:assert');
const { detectEvents, describeEvent, selectMatchEndRecipients } = require('./matchEvents');

const types = (r) => r.events.map((e) => e.type);

const live = (over = {}) => ({
  status: 'live', team1Goals: 0, team2Goals: 0, team1Reds: 0, team2Reds: 0, ...over
});

test('פגישה ראשונה עם משחק היא קו בסיס ולא מייצרת אירועים', () => {
  const r = detectEvents(null, live({ status: 'live', team1Goals: 2 }));
  assert.deepEqual(types(r), []);
  assert.equal(r.next.team1Goals, 2);
});

test('תת-מסמך ריק ממונגו נחשב כמשחק שטרם נסרק ולא מייצר שריקת פתיחה', () => {
  // כך נראה liveSnapshot של משחק שמעולם לא נסרק: אובייקט מלא בברירות מחדל
  const fresh = { status: null, team1Goals: null, team2Goals: null, team1Reds: null, team2Reds: null };
  const r = detectEvents(fresh, live({ team1Goals: 1 }));
  assert.deepEqual(types(r), []);
  assert.equal(r.next.status, 'live');
});

test('משחק שנסרק לראשונה כשכבר הסתיים לא מדווח כמסתיים', () => {
  const fresh = { status: null, team1Goals: null, team2Goals: null, team1Reds: null, team2Reds: null };
  assert.deepEqual(types(detectEvents(fresh, live({ status: 'finished', team1Goals: 3 }))), []);
});

test('מעבר מלפני המשחק למשחק חי הוא שריקת פתיחה', () => {
  const prev = { status: 'scheduled', team1Goals: null, team2Goals: null, team1Reds: 0, team2Reds: 0 };
  assert.deepEqual(types(detectEvents(prev, live())), ['start']);
});

test('משחק שכבר היה חי לא מייצר שריקת פתיחה נוספת', () => {
  assert.deepEqual(types(detectEvents(live(), live())), []);
});

test('עלייה בשערים היא שער, עם ציון הקבוצה הכובשת', () => {
  const r = detectEvents(live(), live({ team1Goals: 1 }));
  assert.deepEqual(types(r), ['goal']);
  assert.equal(r.events[0].scorer, 'team1');
  assert.equal(r.events[0].team1Goals, 1);
});

test('שער לקבוצה השנייה מזוהה כשלה', () => {
  const r = detectEvents(live(), live({ team2Goals: 1 }));
  assert.equal(r.events[0].scorer, 'team2');
});

test('שתי קבוצות שכבשו בין סריקות מדווחות כאירוע אחד', () => {
  const r = detectEvents(live(), live({ team1Goals: 1, team2Goals: 1 }));
  assert.deepEqual(types(r), ['goal']);
  assert.equal(r.events[0].scorer, 'both');
});

test('תיקון תוצאה כלפי מטה אינו שער', () => {
  assert.deepEqual(types(detectEvents(live({ team1Goals: 2 }), live({ team1Goals: 1 }))), []);
});

test('כרטיס אדום מזוהה מעלייה במונה', () => {
  const r = detectEvents(live(), live({ team2Reds: 1 }));
  assert.deepEqual(types(r), ['red']);
  assert.equal(r.events[0].side, 'team2');
});

test('כשהספק לא מדווח כרטיסים אין אירוע אדום', () => {
  const noReds = live({ team1Reds: null, team2Reds: null });
  assert.deepEqual(types(detectEvents(noReds, { ...noReds, team1Goals: 1 })), ['goal']);
});

test('סיום משחק מדווח פעם אחת בלבד', () => {
  const finished = live({ status: 'finished', team1Goals: 1 });
  const first = detectEvents(live({ team1Goals: 1 }), finished);
  assert.deepEqual(types(first), ['end']);
  assert.deepEqual(types(detectEvents(first.next, finished)), []);
});

test('שער שנכנס באותה סריקה של שריקת הסיום מדווח גם הוא', () => {
  const r = detectEvents(live(), live({ status: 'finished', team1Goals: 1 }));
  assert.deepEqual(types(r), ['goal', 'end']);
});

test('changed מזהה שאין מה לשמור כשהתמונה זהה', () => {
  assert.equal(detectEvents(live(), live()).changed, false);
  assert.equal(detectEvents(live(), live({ team1Goals: 1 })).changed, true);
});

test('נוסח ההתראה כולל את שמות הקבוצות ואת התוצאה', () => {
  const goal = describeEvent(
    { type: 'goal', scorer: 'team1', team1Goals: 1, team2Goals: 0 }, 'מכבי חיפה', 'הפועל תל אביב'
  );
  assert.match(goal.title, /שער/);
  assert.match(goal.body, /מכבי חיפה/);
  assert.match(goal.body, /1 - 0/);

  const end = describeEvent({ type: 'end', team1Goals: 2, team2Goals: 2 }, 'א', 'ב');
  assert.match(end.body, /2 - 2/);
});

test('סוף משחק מציג את הניקוד שהורווח, בניסוח שמתאים לכמות', () => {
  const withPoints = (p) =>
    describeEvent({ type: 'end', team1Goals: 1, team2Goals: 0, points: p }, 'א', 'ב').body;

  assert.match(withPoints(3), /הרווחת 3 נקודות/);
  assert.match(withPoints(1), /הרווחת נקודה אחת/);
  assert.match(withPoints(0), /לא צברת נקודות/);
  // ניקוד לפי יחסים הוא שבר, ומעוגל לעשירית
  assert.match(withPoints(2.6666), /2\.7/);

  // בלי ניקוד - הנוסח הישן, בלי שורה שנייה ריקה
  const plain = describeEvent({ type: 'end', team1Goals: 1, team2Goals: 0 }, 'א', 'ב').body;
  assert.ok(!plain.includes('\n'));
});

// ── בחירת מקבלי התראת סוף משחק ─────────────────────────────────────
const pick = (over = {}) =>
  selectMatchEndRecipients({
    candidates: [{ userId: 'u1', matchId: 'm1' }],
    wantsEndAlert: () => true,
    ...over
  }).map((c) => `${c.userId}:${c.matchId}`);

test('מי שהפעיל התראות סוף משחק מקבל אותן', () => {
  assert.deepEqual(pick(), ['u1:m1']);
});

test('מי שלא הפעיל התראות סוף משחק לא מקבל', () => {
  assert.deepEqual(pick({ wantsEndAlert: () => false }), []);
});

test('בול שנשלח על אותו משחק מבטל את התראת סוף המשחק', () => {
  assert.deepEqual(pick({
    exactPairs: new Set(['u1:m1']),
    exactNotifiedUserIds: new Set(['u1'])
  }), []);
});

test('בול שלא נשלח בפועל אינו מבטל - אחרת מי שכיבה התראות בול לא יקבל דבר', () => {
  assert.deepEqual(pick({
    exactPairs: new Set(['u1:m1']),
    exactNotifiedUserIds: new Set()
  }), ['u1:m1']);
});

test('בול במשחק אחד אינו משתיק את ההתראה על משחק אחר באותה ריצה', () => {
  const got = pick({
    candidates: [{ userId: 'u1', matchId: 'm1' }, { userId: 'u1', matchId: 'm2' }],
    exactPairs: new Set(['u1:m1']),
    exactNotifiedUserIds: new Set(['u1'])
  });
  assert.deepEqual(got, ['u1:m2']);
});

test('בול של משתמש אחד אינו משתיק משתמש אחר על אותו משחק', () => {
  const got = pick({
    candidates: [{ userId: 'u1', matchId: 'm1' }, { userId: 'u2', matchId: 'm1' }],
    exactPairs: new Set(['u1:m1']),
    exactNotifiedUserIds: new Set(['u1'])
  });
  assert.deepEqual(got, ['u2:m1']);
});

test('מוחרג מהחודש אינו מקבל התראת סוף משחק', () => {
  assert.deepEqual(pick({ excludedIds: ['u1'] }), []);
});
