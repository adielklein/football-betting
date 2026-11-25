const test = require('node:test');
const assert = require('node:assert');
const {
  detectEvents, describeEvent, selectMatchEndRecipients, eventKey, SNAPSHOT_FIELDS,
  SETTING_BY_EVENT, eventDetails, CANCEL_CONFIRM_MS, voidCounts
} = require('./matchEvents');

// ירידה בתוצאה מאושרת כביטול רק אחרי המתנה: סריקה ראשונה פותחת המתנה,
// סריקה אחרי CANCEL_CONFIRM_MS עם אותה תוצאה מאשרת
const T0 = 1_000_000;
const dropThenConfirm = (prev, lowered) => {
  const first = detectEvents(prev, lowered, T0);
  return { first, second: detectEvents(first.next, lowered, T0 + CANCEL_CONFIRM_MS + 1000) };
};

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

test('תיקון תוצאה כלפי מטה אינו שער אלא ביטול', () => {
  // היה כאן "ואינו כלום". מאז נוספה התראת ביטול, וירידה של אחד היא
  // בדיוק מה שהיא מזהה - אבל שער היא עדיין לא
  const { first, second } = dropThenConfirm(live({ team1Goals: 2 }), live({ team1Goals: 1 }));
  assert.deepEqual(types(first), []);           // עוד לא - מחכים לאישור
  assert.deepEqual(types(second), ['scoreCorrected']); // בלי אירוע ביטול אצל 365 - "התוצאה תוקנה"
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

test('חתימת אירוע: אותו אירוע נותן אותה חתימה, אירוע אחר נותן אחרת', () => {
  const start = { type: 'start' };
  assert.equal(eventKey(start), eventKey({ type: 'start' }));

  // שער ראשון ושני באותו משחק חייבים להיות שתי התראות נפרדות
  const first = { type: 'goal', scorer: 'team1', team1Goals: 1, team2Goals: 0 };
  const second = { type: 'goal', scorer: 'team2', team1Goals: 1, team2Goals: 1 };
  assert.notEqual(eventKey(first), eventKey(second));

  // ושליחה חוזרת של אותו שער - אותה חתימה, ולכן תחליף על המכשיר
  assert.equal(eventKey(first), eventKey({ ...first }));

  // פתיחה וסיום של אותו משחק אינם מתלכדים
  assert.notEqual(eventKey(start), eventKey({ type: 'end', team1Goals: 0, team2Goals: 0 }));
});

test('שני אדומים לאותה קבוצה הם שני אירועים ולא אחד', () => {
  const prev = { status: 'live', team1Goals: 0, team2Goals: 0, team1Reds: 0, team2Reds: 0 };
  const one = detectEvents(prev, { status: 'live', team1Goals: 0, team2Goals: 0, team1Reds: 1, team2Reds: 0 });
  const two = detectEvents(one.next, { status: 'live', team1Goals: 0, team2Goals: 0, team1Reds: 2, team2Reds: 0 });

  assert.equal(one.events[0].type, 'red');
  assert.equal(two.events[0].type, 'red');
  assert.notEqual(eventKey(one.events[0]), eventKey(two.events[0]));
});

test('שדות תמונת המצב הם בדיוק אלה שהזיהוי משווה', () => {
  const { next } = detectEvents(null, { status: 'live', team1Goals: 1, team2Goals: 0 });
  assert.deepEqual(SNAPSHOT_FIELDS.slice().sort(), Object.keys(next).sort());
});

test('שער שבוטל מזוהה כביטול, ולא כשער', () => {
  const prev = live({ team1Goals: 1, team2Goals: 0 });
  // עם אירוע "השער נפסל" אצל 365 - מאושר מיד, בסריקה הראשונה
  const r = detectEvents(prev, live({ team1Goals: 0, team2Goals: 0 }), T0, { voids: { team1: 1, team2: 0, team1Recent: true } });

  assert.deepEqual(types(r), ['goalCancelled']);
  assert.equal(r.events[0].side, 'team1');

  const text = describeEvent(r.events[0], 'רומא', 'אינטר');
  // הנוסח עודכן ל"נפסל" כשהתברר שזה בדיוק מה ש-365 קוראים לזה
  assert.match(text.title, /נפסל/);
  assert.match(text.body, /רומא/);
});

test('ירידה של יותר משער אחד אינה ביטול - זו תקלה בנתונים', () => {
  const prev = live({ team1Goals: 3, team2Goals: 0 });
  const r = detectEvents(prev, live({ team1Goals: 0, team2Goals: 0 }));
  assert.deepEqual(types(r), []);
});

test('ירידה בתוצאה כשהמשחק אינו מתנהל אינה ביטול', () => {
  const prev = live({ team1Goals: 1, team2Goals: 0 });
  const finished = detectEvents(prev, live({ status: 'finished', team1Goals: 0, team2Goals: 0 }));
  assert.ok(!types(finished).includes('goalCancelled'), types(finished).join(','));

  const started = detectEvents(
    live({ status: 'scheduled', team1Goals: 1, team2Goals: 0 }),
    live({ team1Goals: 0, team2Goals: 0 })
  );
  assert.ok(!types(started).includes('goalCancelled'), types(started).join(','));
});

test('ביטול ושער באותה סריקה - שניהם מדווחים', () => {
  const prev = live({ team1Goals: 1, team2Goals: 0 });
  const { first, second } = dropThenConfirm(prev, live({ team1Goals: 0, team2Goals: 1 }));
  assert.deepEqual(types(first), ['goal']);               // השער מיד
  assert.deepEqual(types(second), ['scoreCorrected']);    // הירידה - אחרי המתנה
});

test('תנודה בנתונים (תוצאה שיורדת וחוזרת) - לא ביטול ולא שער חדש', () => {
  const prev = live({ team1Goals: 2, team2Goals: 1 });
  const a = detectEvents(prev, live({ team1Goals: 1, team2Goals: 1 }), T0);
  const b = detectEvents(a.next, live({ team1Goals: 2, team2Goals: 1 }), T0 + 20000);
  assert.deepEqual(types(a), []);
  assert.deepEqual(types(b), []);
  assert.equal(b.next.dropAt, null);
  // וגם אחרי הדקה לא יוצא כלום
  const c = detectEvents(b.next, live({ team1Goals: 2, team2Goals: 1 }), T0 + 90000);
  assert.deepEqual(types(c), []);
});

test('ירידה שנשארת עד סוף המשחק - ביטול גם לפני הדקה', () => {
  const a = detectEvents(live({ team1Goals: 1 }), live({ team1Goals: 0 }), T0);
  const b = detectEvents(a.next, live({ status: 'finished', team1Goals: 0 }), T0 + 15000);
  assert.ok(types(b).includes('scoreCorrected'), types(b).join(','));
});

test('שער אמיתי אחרי ביטול שאושר, באותה תוצאה - נשלח (חתימה חדשה)', () => {
  const prev = live({ team1Goals: 2, team2Goals: 0 });
  const { second } = dropThenConfirm(prev, live({ team1Goals: 1, team2Goals: 0 }));
  const again = detectEvents(second.next, live({ team1Goals: 2, team2Goals: 0 }), T0 + 10 * 60000);
  assert.deepEqual(types(again), ['goal']);
  const before = eventKey({ type: 'goal', team1Goals: 2, team2Goals: 0, cancels: 0 });
  assert.notEqual(eventKey(again.events[0]), before);
});

test('"השער נפסל" בשדה השחקן לא הופך לשם הכובש, ושער מפנדל מזוהה', () => {
  const details = {
    homeCompetitorId: 1, awayCompetitorId: 2,
    events: [
      { competitorId: 2, playerName: 'ברונו פרננדש', minute: "48'", order: 5, typeName: 'גול', subTypeName: 'פנדל' },
      { competitorId: 2, playerName: 'השער נפסל', minute: "82'", order: 15, typeName: 'השער נפסל', subTypeName: 'Var' }
    ]
  };
  // השער האחרון של הקבוצה כבר נפסל - בלי כובש בהתראת השער
  assert.deepEqual(eventDetails('goal', 'team2', details), {});
  // הביטול: דקה ו-VAR, בלי "השער נפסל" כשם
  const c = eventDetails('goalCancelled', 'team2', details);
  assert.equal(c.scorer, null);
  assert.equal(c.minute, "82'");
  assert.equal(c.byVar, true);
  // שער מפנדל (בלי המילה "שער") מזוהה
  const pen = eventDetails('goal', 'team2', { ...details, events: details.events.slice(0, 1) });
  assert.equal(pen.scorer, 'ברונו פרננדש');
});

test('ביטול נושא חתימה משלו, ולא זו של שער באותה תוצאה', () => {
  const goal = { type: 'goal', scorer: 'team1', team1Goals: 1, team2Goals: 0 };
  const cancel = { type: 'goalCancelled', side: 'team2', team1Goals: 1, team2Goals: 0 };
  assert.notEqual(eventKey(goal), eventKey(cancel));
});

test('ביטול שער נשלט באותו מתג של שערים', () => {
  assert.equal(SETTING_BY_EVENT.goalCancelled, SETTING_BY_EVENT.goal);
});

// ── פרטי אירוע מתוך הנתיב של משחק בודד ───────────────────────────

const details = {
  homeCompetitorId: 100,
  awayCompetitorId: 200,
  events: [
    { competitorId: 100, order: 1, typeName: 'שער', subTypeName: null, playerName: 'חקימי', minute: "12'" },
    { competitorId: 200, order: 2, typeName: 'השער נפסל', subTypeName: 'Var', playerName: 'קיין', minute: "14'" },
    { competitorId: 100, order: 3, typeName: 'שער', subTypeName: null, playerName: 'ויניסיוס', minute: "61'" }
  ]
};

test('שער נפסל: מזוהה לפי סוג האירוע, עם הדקה והסימון של VAR', () => {
  const d = eventDetails('goalCancelled', 'team2', details);
  assert.equal(d.byVar, true);
  assert.equal(d.minute, "14'");

  const text = describeEvent(
    { type: 'goalCancelled', side: 'team2', team1Goals: 1, team2Goals: 0, details: d },
    'ריאל', 'טוטנהאם'
  );
  assert.match(text.title, /VAR/);
  assert.match(text.body, /טוטנהאם/);
  assert.match(text.body, /14/);
});

test('שער: נלקח האחרון של אותה קבוצה, ולא הראשון', () => {
  const d = eventDetails('goal', 'team1', details);
  assert.equal(d.scorer, 'ויניסיוס');
  assert.equal(d.minute, "61'");

  const text = describeEvent(
    { type: 'goal', scorer: 'team1', team1Goals: 2, team2Goals: 0, details: d },
    'ריאל', 'טוטנהאם'
  );
  assert.match(text.body, /ויניסיוס/);
});

test('אירוע של הקבוצה השנייה אינו נספר לצד הזה', () => {
  // לטוטנהאם אין שער, רק שער שנפסל
  assert.equal(eventDetails('goal', 'team2', details).scorer, undefined);
});

test('בלי פרטים מהספק ההתראה נשלחת כרגיל, בלי שם ובלי דקה', () => {
  assert.deepEqual(eventDetails('goal', 'team1', null), {});

  const text = describeEvent(
    { type: 'goalCancelled', side: 'team1', team1Goals: 0, team2Goals: 0, details: {} },
    'רומא', 'אינטר'
  );
  assert.match(text.title, /נפסל/);
  assert.ok(!text.title.includes('VAR'), text.title);
});


test('ביטול עם אירוע 365 טרי - "השער נפסל" מיד; ביטול ישן לא מאשר תנודה חדשה', () => {
  const details = (events) => ({ homeCompetitorId: 1, awayCompetitorId: 2, events });
  const goal = (cid, order) => ({ competitorId: cid, typeName: 'גול', subTypeName: 'שער שדה', order });
  const voided = (cid, order) => ({ competitorId: cid, typeName: 'השער נפסל', subTypeName: 'Var', playerName: 'השער נפסל', order });
  // VAR בדקה 30, אחר כך שער תקף - הביטול כבר לא "טרי"
  const old = voidCounts(details([voided(1, 3), goal(1, 5)]));
  assert.equal(old.team1Recent, false);
  const a = detectEvents(live({ team1Goals: 2 }), live({ team1Goals: 1 }), T0, { voids: old });
  assert.deepEqual(types(a), []); // מחכה, לא "נפסל"
  // שער שנפסל עכשיו - טרי
  const now = voidCounts(details([goal(1, 5), voided(1, 9)]));
  assert.equal(now.team1Recent, true);
  const b = detectEvents(live({ team1Goals: 2 }), live({ team1Goals: 1 }), T0, { voids: now });
  assert.deepEqual(types(b), ['goalCancelled']);
  // ואותו אירוע לא מאשר ירידה נוספת אחר כך
  const c = detectEvents(live({ ...b.next, team1Goals: 2 }), live({ team1Goals: 1 }), T0 + 60000, { voids: now });
  assert.deepEqual(types(c), []);
});

test('התוצאה תוקנה - נוסח בלי VAR', () => {
  const t = describeEvent({ type: 'scoreCorrected', side: 'team1', team1Goals: 1, team2Goals: 1 }, 'ארסנל', 'דורטמונד');
  assert.match(t.title, /תוקנה/);
  assert.doesNotMatch(t.title + t.body, /VAR|נפסל/);
});
