// זיהוי אירועים במשחק חי: שער, כרטיס אדום, שריקת פתיחה ושריקת סיום.
//
// הסריקה החיה מחזירה תמונת מצב, לא אירועים, ולכן אירוע הוא תמיד הפרש בין
// התמונה הקודמת לנוכחית. המצב הקודם נשמר על המשחק במסד ולא בזיכרון, כדי
// שהפעלה מחדש של השרת לא תשלח שוב התראה שכבר יצאה.
//
// המודול טהור בכוונה - בלי רשת ובלי מסד - כדי שההחלטה מה נחשב אירוע
// תהיה ניתנת לבדיקה ישירה (ראה matchEvents.test.js).

// תמונת מצב ריקה: משחק שעוד לא נראה מעולם.
// dropAt/dropFrom1/dropFrom2 - ירידה בתוצאה שעוד מחכה לאישור (ראה למטה);
// cancels - כמה ביטולי שער אושרו במשחק. כולם null כשאין - חשוב: הכתיבה
// המותנית בשרת משווה כל שדה לערך הקודם, ו-null תואם גם שדה שלא קיים
const EMPTY = {
  status: null, team1Goals: null, team2Goals: null, team1Reds: null, team2Reds: null,
  dropAt: null, dropFrom1: null, dropFrom2: null, cancels: null
};

// כמה זמן התוצאה צריכה להישאר נמוכה לפני שמודיעים שהשער נפסל. 365
// מחזירים לפעמים לרגע תוצאה ישנה ואז חוזרים לנכונה - בלי ההמתנה זו הייתה
// התראת "השער נפסל" על שער שלא נפסל (קרה בארסנל-דורטמונד ובליל-באיירן)
const CANCEL_CONFIRM_MS = 60000;

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null);

const snapshotOf = (live) => ({
  status: live?.status || null,
  team1Goals: num(live?.team1Goals),
  team2Goals: num(live?.team2Goals),
  team1Reds: num(live?.team1Reds),
  team2Reds: num(live?.team2Reds)
});

// כמה עלה מונה בין שתי תמונות. null באחד הצדדים = לא ידוע, ולכן לא אירוע
const rise = (before, after) => {
  if (before == null || after == null) return 0;
  return after > before ? after - before : 0;
};

// וכמה ירד. שער שבוטל אחרי VAR הוא בדיוק זה: התוצאה יורדת באחד.
//
// אחד בלבד: ירידה של שניים ומעלה היא כמעט תמיד תקלה בנתונים ולא ביטול,
// והתראה על ביטול שלא היה גרועה מאשר שתיקה
const cancelled = (before, after) => {
  if (before == null || after == null) return 0;
  return before - after === 1 ? 1 : 0;
};

/**
 * @param prev תמונת המצב השמורה על המשחק, או null אם זו הפעם הראשונה
 * @param live מה שהסריקה החיה מחזירה עכשיו
 * @returns {{ events: Array, next: object, changed: boolean }}
 */
function detectEvents(prev, live, now = Date.now()) {
  const next = snapshotOf(live);
  // מונגו מחזיר את תת-המסמך עם ברירות המחדל שלו גם למשחק שמעולם לא נסרק,
  // ולכן "יש אובייקט" אינו מספיק כדי לקבוע שראינו אותו. תמונה שנשמרה
  // באמת תמיד נושאת status, ולכן הוא הסימן שמבדיל בין השניים
  const before = prev && prev.status != null ? { ...EMPTY, ...prev } : null;

  // ביטולים שאושרו והמתנה פתוחה עוברים מתמונה לתמונה
  next.cancels = before ? before.cancels : null;
  next.dropAt = before ? before.dropAt : null;
  next.dropFrom1 = before ? before.dropFrom1 : null;
  next.dropFrom2 = before ? before.dropFrom2 : null;

  const changedScore = () =>
    !before ||
    before.status !== next.status ||
    before.team1Goals !== next.team1Goals ||
    before.team2Goals !== next.team2Goals ||
    before.team1Reds !== next.team1Reds ||
    before.team2Reds !== next.team2Reds;
  let changed = changedScore();

  // פגישה ראשונה עם המשחק היא קו בסיס בלבד. בלי זה, משחק שכבר מתנהל
  // כשהשרת עולה היה מייצר "המשחק התחיל" באיחור, וכל שער שכבר נכבש
  // היה נספר כשער חדש
  if (!before) return { events: [], next, changed };

  const events = [];

  if (before.status !== 'live' && next.status === 'live') {
    events.push({ type: 'start' });
  }

  const pending = before.dropAt != null;
  // התוצאה חזרה לזו שלפני הירידה: זו הייתה תנודה בנתונים ולא ביטול.
  // ההמתנה נסגרת בשקט, וגם ה"עלייה" חזרה אינה שער חדש
  const bounced = pending && next.team1Goals === before.dropFrom1 && next.team2Goals === before.dropFrom2;
  if (bounced) {
    next.dropAt = null; next.dropFrom1 = null; next.dropFrom2 = null;
  }

  // שער נספר גם כשהוא נכנס באותה סריקה שבה המשחק הסתיים
  const team1Scored = bounced ? 0 : rise(before.team1Goals, next.team1Goals);
  const team2Scored = bounced ? 0 : rise(before.team2Goals, next.team2Goals);
  if (team1Scored > 0 || team2Scored > 0) {
    events.push({
      type: 'goal',
      scorer: team1Scored > 0 && team2Scored > 0 ? 'both' : team1Scored > 0 ? 'team1' : 'team2',
      team1Goals: next.team1Goals,
      team2Goals: next.team2Goals,
      cancels: next.cancels || 0
    });
  }

  // ביטול שער: ירידה של אחד בזמן שהמשחק מתנהל. לא מודיעים מיד - פותחים
  // המתנה, ומאשרים רק אם התוצאה נשארה נמוכה דקה שלמה (או שהמשחק נגמר כך).
  // ירידה בזמן שהמצב עצמו משתנה (נתונים שנטענים מחדש בסוף) אינה ביטול
  if (!pending && next.status === 'live' && before.status === 'live') {
    const team1Cancelled = cancelled(before.team1Goals, next.team1Goals);
    const team2Cancelled = cancelled(before.team2Goals, next.team2Goals);
    if (team1Cancelled > 0 || team2Cancelled > 0) {
      next.dropAt = now;
      next.dropFrom1 = before.team1Goals;
      next.dropFrom2 = before.team2Goals;
    }
  } else if (pending && !bounced) {
    const lower = next.team1Goals < before.dropFrom1 || next.team2Goals < before.dropFrom2;
    const waited = now - before.dropAt >= CANCEL_CONFIRM_MS;
    if (!lower) {
      // התוצאה עלתה מעבר למה שהיה (שער אחר): ההמתנה כבר לא רלוונטית
      next.dropAt = null; next.dropFrom1 = null; next.dropFrom2 = null;
    } else if (waited || next.status === 'finished') {
      const side1 = next.team1Goals < before.dropFrom1;
      const side2 = next.team2Goals < before.dropFrom2;
      next.cancels = (next.cancels || 0) + 1;
      events.push({
        type: 'goalCancelled',
        side: side1 && side2 ? 'both' : side1 ? 'team1' : 'team2',
        team1Goals: next.team1Goals,
        team2Goals: next.team2Goals,
        cancels: next.cancels
      });
      next.dropAt = null; next.dropFrom1 = null; next.dropFrom2 = null;
    }
  }
  changed = changedScore() || next.dropAt !== before.dropAt || next.cancels !== before.cancels;

  const team1Reds = rise(before.team1Reds, next.team1Reds);
  const team2Reds = rise(before.team2Reds, next.team2Reds);
  if (team1Reds > 0 || team2Reds > 0) {
    events.push({
      type: 'red',
      side: team1Reds > 0 && team2Reds > 0 ? 'both' : team1Reds > 0 ? 'team1' : 'team2',
      team1Reds: next.team1Reds,
      team2Reds: next.team2Reds
    });
  }

  if (before.status !== 'finished' && next.status === 'finished') {
    events.push({
      type: 'end',
      team1Goals: next.team1Goals,
      team2Goals: next.team2Goals
    });
  }

  return { events, next, changed };
}

// ── פרטים מתוך אירועי המשחק ──────────────────────────────────────
//
// 365 מדווחים על אירוע שער שנפסל עם eventType.name = "השער נפסל"
// ו-subTypeName = "Var". זה מה שהופך "השער בוטל" ל"VAR פסל את השער
// של רומא בדקה 14".
const CANCELLED_EVENT = /נפסל|בוטל|disallow|cancel|annul/i;
// 365 קוראים לשער "גול" (subType: "שער שדה" / "פנדל"). קודם חיפשנו רק "שער",
// ושער מפנדל לא זוהה בכלל
const GOAL_EVENT = /גול|שער|goal/i;
const VAR_EVENT = /var/i;

// האירוע האחרון שמתאים, לפי order. הרשימה מסודרת לפי מהלך המשחק, ולכן
// האחרון הוא זה שהרגע קרה - וזה שההתראה מדברת עליו
const latestEvent = (events, { pattern, exclude = null, competitorId = null }) => {
  const matches = (events || []).filter((e) => {
    if (competitorId != null && e.competitorId !== competitorId) return false;
    // 365 שמים בשער שנפסל את "השער נפסל" גם בשדה של שם השחקן - ולכן הוא
    // נכלל בבדיקה. בלי זה יצאה התראת "⚽ שער! (השער נפסל, 82')"
    const text = `${e.typeName || ''} ${e.subTypeName || ''} ${e.playerName || ''}`;
    // "השער נפסל" מכיל את המילה "שער", ולכן חיפוש שער תופס גם אותו.
    // בלי ההחרגה, שער שנפסל היה מדווח ככובש של הקבוצה שהשער נלקח ממנה
    if (exclude && exclude.test(text)) return false;
    return pattern.test(text);
  });

  if (matches.length === 0) return null;
  return matches.reduce((best, e) => ((e.order ?? 0) >= (best.order ?? 0) ? e : best));
};

/**
 * פרטי האירוע שיש לצרף להתראה: מי, מתי, ולמה.
 * מחזיר אובייקט ריק כשאין פרטים - ההתראה תישלח בלעדיהם.
 */
const eventDetails = (type, side, details) => {
  if (!details || !Array.isArray(details.events)) return {};

  // הצד שעליו מדובר, לפי מזהה הקבוצה אצל הספק
  const competitorId = side === 'team1' ? details.homeCompetitorId
    : side === 'team2' ? details.awayCompetitorId
      : null;

  const found = type === 'goalCancelled'
    ? latestEvent(details.events, { pattern: CANCELLED_EVENT, competitorId })
    : latestEvent(details.events, { pattern: GOAL_EVENT, exclude: CANCELLED_EVENT, competitorId });

  if (!found) return {};

  // שער: אם אחרי השער האחרון של הקבוצה כבר רשום שער שנפסל, השער שהתראה
  // מדברת עליו הוא כנראה בדיוק זה שנפסל - לא מצמידים לו כובש של שער קודם
  if (type === 'goal') {
    const voided = latestEvent(details.events, { pattern: CANCELLED_EVENT, competitorId });
    if (voided && (voided.order ?? 0) > (found.order ?? 0)) return {};
  }

  const name = found.playerName && !CANCELLED_EVENT.test(found.playerName) ? found.playerName : null;
  return {
    scorer: type === 'goalCancelled' ? name : (name || null),
    minute: found.minute || null,
    byVar: VAR_EVENT.test(`${found.subTypeName || ''} ${found.typeName || ''}`)
  };
};

// שדות תמונת המצב, בסדר אחד ויחיד. הכתיבה המותנית בסריקה בונה מהם את
// התנאי, ולכן הם חיים כאן ליד ההגדרה ולא משוכפלים שם
const SNAPSHOT_FIELDS = Object.keys(EMPTY);

// חתימה יציבה לאירוע. היא הופכת ל-tag של ההתראה, ולכן שליחה שנייה של אותו
// אירוע - מסמך כפול, שני מופעי שרת, ניסיון חוזר - מחליפה על המכשיר את
// ההתראה הקודמת במקום להופיע לידה. אירוע אחר באותו משחק נושא חתימה אחרת
// ולכן מוצג בנפרד
const eventKey = (event) => {
  switch (event?.type) {
    case 'start':
      return 'start';
    // אחרי ביטול שאושר, שער שמחזיר את אותה תוצאה הוא שער חדש - ולכן מספר
    // הביטולים נכנס לחתימה. תנודה בנתונים לא מעלה אותו, ולכן "שער" שחוזר
    // אחריה עדיין נחסם ככפול
    case 'goal':
      return `goal:${event.team1Goals}-${event.team2Goals}${event.cancels ? `#${event.cancels}` : ''}`;
    case 'goalCancelled':
      return `cancel:${event.team1Goals}-${event.team2Goals}${event.cancels ? `#${event.cancels}` : ''}`;
    case 'red':
      return `red:${event.team1Reds}-${event.team2Reds}`;
    case 'end':
      return `end:${event.team1Goals}-${event.team2Goals}`;
    default:
      return String(event?.type || 'event');
  }
};

// שם השדה בהגדרות המשתמש שמאשר כל סוג אירוע. ברירת המחדל של כולם היא
// כבויה, ולכן משתמש שלא בחר דבר לא יקבל שום התראה חדשה
const SETTING_BY_EVENT = {
  goal: 'goalAlerts',
  // אותו מתג כמו שער: מי שרוצה לדעת על שער רוצה לדעת גם כשהוא נמחק
  goalCancelled: 'goalAlerts',
  red: 'redCardAlerts',
  start: 'matchStartAlerts',
  end: 'matchEndAlerts'
};

// ניקוד יכול להיות שבר (יחס חלקי מעוגל לעשירית), ולכן לא מספיק "N נקודות":
// "1 נקודות" שגוי, ו-"0 נקודות" נשמע כמו תקלה ולא כמו תוצאה
const pointsPhrase = (points) => {
  const n = Math.round(points * 10) / 10;
  if (n === 0) return 'לא צברת נקודות הפעם';
  if (n === 1) return 'הרווחת נקודה אחת';
  return `הרווחת ${n} נקודות`;
};

// נוסח ההתראה. team1/team2 הם השמות כפי שהם מוצגים אצלנו
function describeEvent(event, team1, team2) {
  const score = `${event.team1Goals ?? 0} - ${event.team2Goals ?? 0}`;
  const pair = `${team1} מול ${team2}`;

  switch (event.type) {
    case 'start':
      return { title: '🏁 המשחק התחיל', body: pair };
    case 'goal': {
      const who = event.scorer === 'team1' ? team1 : event.scorer === 'team2' ? team2 : null;
      // הכובש והדקה, כשהספק מספר אותם
      const by = event.details?.scorer ? ` (${event.details.scorer}${event.details.minute ? `, ${event.details.minute}` : ''})` : '';
      return {
        title: '⚽ שער!',
        body: who ? `${who} כבשה${by} · ${pair} ${score}` : `${pair} ${score}`
      };
    }
    case 'goalCancelled': {
      // הקבוצה שהשער נמחק לה, לא זו שנהנתה מהביטול: זו הקבוצה שהמידע
      // הקודם היה עליה, ולכן היא מה שמחפשים בהתראה
      const who = event.side === 'team1' ? team1 : event.side === 'team2' ? team2 : null;
      const details = event.details || {};
      const when = details.minute ? ` בדקה ${details.minute.replace(/'/g, '')}` : '';
      const reason = details.byVar ? 'VAR פסל את השער' : 'השער נפסל';
      return {
        title: details.byVar ? '📺 VAR - השער נפסל' : '❌ השער נפסל',
        body: who
          ? `${reason} של ${who}${when} · ${pair} ${score}`
          : `${reason}${when} · ${pair} ${score}`
      };
    }
    case 'red': {
      const who = event.side === 'team1' ? team1 : event.side === 'team2' ? team2 : null;
      return { title: '🟥 כרטיס אדום', body: who ? `${who} · ${pair}` : pair };
    }
    case 'end': {
      const base = `${pair} ${score}`;
      if (event.points == null) return { title: '🔚 המשחק הסתיים', body: base };
      return { title: '🔚 המשחק הסתיים', body: `${base}\n${pointsPhrase(event.points)}` };
    }
    default:
      return null;
  }
}

// מי אמור לקבל התראת סוף משחק, אחרי שהניקוד כבר חושב.
//
// ההכרעה העדינה כאן היא הכפילות מול התראת ה"בול": מי שקיבל בול על משחק
// מסוים לא צריך גם התראת סוף משחק עליו. הזיווג הוא משתמש+משחק, כדי שבול
// במשחק אחד לא ישתיק את ההתראה על משחק אחר באותה ריצה; והחסימה חלה רק
// כשהבול באמת נשלח, כדי שמי שכיבה התראות בול לא יישאר בלי כלום.
function selectMatchEndRecipients({
  candidates = [],
  exactPairs = new Set(),
  exactNotifiedUserIds = new Set(),
  excludedIds = [],
  wantsEndAlert = () => false
}) {
  const excluded = new Set(excludedIds.map(String));

  return candidates.filter(({ userId, matchId }) => {
    const uid = String(userId);
    if (excluded.has(uid)) return false;
    if (!wantsEndAlert(uid)) return false;
    if (exactNotifiedUserIds.has(uid) && exactPairs.has(`${uid}:${matchId}`)) return false;
    return true;
  });
}

module.exports = {
  CANCEL_CONFIRM_MS,
  eventDetails,
  latestEvent,
  SNAPSHOT_FIELDS,
  eventKey,
  detectEvents,
  describeEvent,
  selectMatchEndRecipients,
  SETTING_BY_EVENT
};
