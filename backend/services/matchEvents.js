// זיהוי אירועים במשחק חי: שער, כרטיס אדום, שריקת פתיחה ושריקת סיום.
//
// הסריקה החיה מחזירה תמונת מצב, לא אירועים, ולכן אירוע הוא תמיד הפרש בין
// התמונה הקודמת לנוכחית. המצב הקודם נשמר על המשחק במסד ולא בזיכרון, כדי
// שהפעלה מחדש של השרת לא תשלח שוב התראה שכבר יצאה.
//
// המודול טהור בכוונה - בלי רשת ובלי מסד - כדי שההחלטה מה נחשב אירוע
// תהיה ניתנת לבדיקה ישירה (ראה matchEvents.test.js).

// תמונת מצב ריקה: משחק שעוד לא נראה מעולם
const EMPTY = { status: null, team1Goals: null, team2Goals: null, team1Reds: null, team2Reds: null };

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

/**
 * @param prev תמונת המצב השמורה על המשחק, או null אם זו הפעם הראשונה
 * @param live מה שהסריקה החיה מחזירה עכשיו
 * @returns {{ events: Array, next: object, changed: boolean }}
 */
function detectEvents(prev, live) {
  const next = snapshotOf(live);
  // מונגו מחזיר את תת-המסמך עם ברירות המחדל שלו גם למשחק שמעולם לא נסרק,
  // ולכן "יש אובייקט" אינו מספיק כדי לקבוע שראינו אותו. תמונה שנשמרה
  // באמת תמיד נושאת status, ולכן הוא הסימן שמבדיל בין השניים
  const before = prev && prev.status != null ? { ...EMPTY, ...prev } : null;

  const changed =
    !before ||
    before.status !== next.status ||
    before.team1Goals !== next.team1Goals ||
    before.team2Goals !== next.team2Goals ||
    before.team1Reds !== next.team1Reds ||
    before.team2Reds !== next.team2Reds;

  // פגישה ראשונה עם המשחק היא קו בסיס בלבד. בלי זה, משחק שכבר מתנהל
  // כשהשרת עולה היה מייצר "המשחק התחיל" באיחור, וכל שער שכבר נכבש
  // היה נספר כשער חדש
  if (!before) return { events: [], next, changed };

  const events = [];

  if (before.status !== 'live' && next.status === 'live') {
    events.push({ type: 'start' });
  }

  // שער נספר גם כשהוא נכנס באותה סריקה שבה המשחק הסתיים
  const team1Scored = rise(before.team1Goals, next.team1Goals);
  const team2Scored = rise(before.team2Goals, next.team2Goals);
  if (team1Scored > 0 || team2Scored > 0) {
    events.push({
      type: 'goal',
      scorer: team1Scored > 0 && team2Scored > 0 ? 'both' : team1Scored > 0 ? 'team1' : 'team2',
      team1Goals: next.team1Goals,
      team2Goals: next.team2Goals
    });
  }

  const team1Reds = rise(before.team1Reds, next.team1Reds);
  const team2Reds = rise(before.team2Reds, next.team2Reds);
  if (team1Reds > 0 || team2Reds > 0) {
    events.push({
      type: 'red',
      side: team1Reds > 0 && team2Reds > 0 ? 'both' : team1Reds > 0 ? 'team1' : 'team2'
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

// שם השדה בהגדרות המשתמש שמאשר כל סוג אירוע. ברירת המחדל של כולם היא
// כבויה, ולכן משתמש שלא בחר דבר לא יקבל שום התראה חדשה
const SETTING_BY_EVENT = {
  goal: 'goalAlerts',
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
      return {
        title: '⚽ שער!',
        body: who ? `${who} כבשה · ${pair} ${score}` : `${pair} ${score}`
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

module.exports = { detectEvents, describeEvent, selectMatchEndRecipients, SETTING_BY_EVENT };
