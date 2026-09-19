// מצב חי: תוצאות ודקת משחק בזמן אמת.
//
// 365 מחזירים את כל המשחקים המבוקשים בבקשה אחת (/games/current/?games=id1,id2)
// ולא אחת לכל משחק, ולכן מחזור סריקה שלם של שבוע עולה בקשה אחת. כשיש משחקים
// חיים הם מחזירים ttl=5, כלומר הם עצמם מצפים לרענון כל 5 שניות - סריקה כל
// דקה היא הרבה מתחת לזה.
//
// המחיר האמיתי הוא לא הבקשות אלא הזמן שהשרת ער, ולכן הסריקה רצה אך ורק
// כשבאמת יש משחק בחלון שידור. מחוץ לחלון: אפס בקשות.

const API_BASE = 'https://webws.365scores.com/web';
const COMMON_QUERY = 'appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6';

// חלון השידור של משחק: מעט לפני הבעיטה ועד הרבה אחרי, כדי לכסות גם דחיות,
// הארכה ופנדלים. מחוץ לחלון הזה אין מה לבדוק.
const WINDOW_BEFORE_MS = 10 * 60 * 1000;
const WINDOW_AFTER_MS = 4 * 60 * 60 * 1000;

// כמה זמן תשובה נחשבת טרייה מספיק כדי להגיש אותה ללקוח בלי לפנות ל-365 שוב.
// כמה לקוחות שמרעננים במקביל מקבלים את אותה תשובה מהזיכרון.
const CACHE_TTL_MS = 20 * 1000;

// 365scores statusGroup: 2=טרם החל, 3=מתנהל, 4=הסתיים
const STATUS_SCHEDULED = 2;
const STATUS_LIVE = 3;
const STATUS_FINISHED = 4;

const cache = new Map(); // weekId -> { at, games }

const stripPrefix = (externalId) =>
  externalId && externalId.startsWith('365_') ? externalId.slice(4) : externalId;

// רק מזהי 365 נשלחים לנקודת הקצה של 365. משחק שיובא מספק אחר (espn_/sofa_/
// tsdb_) עבר עד עכשיו כמו שהוא, ומכיוון שכל משחקי השבוע נשלחים בבקשה אחת -
// מזהה זר אחד היה מסכן את המצב החי של כל השבוע, לא רק של עצמו.
const is365Id = (externalId) => !!externalId && !/^(espn|sofa|tsdb)_/.test(externalId);

const apiGet = async (path) => {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      Referer: 'https://www.365scores.com/'
    }
  });
  if (!res.ok) throw new Error(`365scores live error ${res.status}`);
  return res.json();
};

// האם המשחק נמצא עכשיו בחלון שבו יכול להיות משהו לראות
const inBroadcastWindow = (match, now = Date.now()) => {
  if (!match.fullDate) return false;
  const kickoff = new Date(match.fullDate).getTime();
  if (Number.isNaN(kickoff)) return false;
  return now >= kickoff - WINDOW_BEFORE_MS && now <= kickoff + WINDOW_AFTER_MS;
};

const scoreOf = (competitor) => {
  const s = competitor?.score;
  // 365 מחזירים -1 למשחק שטרם החל, ולא null
  return s == null || s < 0 ? null : Math.round(s);
};

// כרטיסים אדומים. אין לנו תיעוד של המבנה שבו 365 מחזירים אותם בנקודת הקצה
// הזו, ולכן מנסים כמה שמות סבירים ומחזירים null כשאף אחד לא קיים. null
// פירושו "לא ידוע" ולא "אפס", וזיהוי האירועים לא מייצר ממנו כרטיס אדום -
// כך שגם אם הספק לא מדווח כרטיסים, אף אחד לא מקבל התראת שווא
const redCardsOf = (competitor) => {
  const v = competitor?.redCards ?? competitor?.redCardsCount ?? competitor?.redcards;
  return typeof v === 'number' && v >= 0 ? Math.round(v) : null;
};

// מדווח פעם אחת לכל עליית שרת אם התשובה החיה לא כוללת כרטיסים, כדי
// שאפשר יהיה לדעת מהלוג אם התראות אדום בכלל ניתנות למימוש מהמקור הזה
let redCardSupportLogged = false;
const noteRedCardSupport = (competitor) => {
  if (redCardSupportLogged || !competitor) return;
  redCardSupportLogged = true;
  const supported = redCardsOf(competitor) != null;
  console.log(
    supported
      ? '🟥 [LIVE] 365 מדווחים כרטיסים אדומים - התראות אדום פעילות'
      : `🟥 [LIVE] אין שדה כרטיסים אדומים בתשובה החיה. שדות זמינים: ${Object.keys(competitor).join(', ')}`
  );
};

// מה שהלקוח צריך כדי לצייר שורה חיה, בסדר team1/team2 של האפליקציה
// כל statusGroup שאינו אחד משלושת המוכרים מתורגם ל"טרם החל", וזה בדיוק
// מה שיכול להיראות כשריקת פתיחה נוספת כשהמשחק כבר מתנהל. מדווח פעם אחת
// לכל ערך חדש, כדי שיהיה אפשר לדעת אם זה מה שקורה ומה הערך האמיתי
const seenStatusGroups = new Set();
const noteStatusGroup = (game) => {
  const group = game?.statusGroup;
  if (group === STATUS_LIVE || group === STATUS_FINISHED || group === STATUS_SCHEDULED) return;
  if (seenStatusGroups.has(group)) return;
  seenStatusGroups.add(group);
  console.log(`⚪ [LIVE] statusGroup לא מוכר מ-365: ${group} ("${game?.shortStatusText || game?.statusText || ''}")`);
};

const toLiveEntry = (match, game) => {
  noteStatusGroup(game);
  const finished = game.statusGroup === STATUS_FINISHED;
  noteRedCardSupport(game.homeCompetitor);
  return {
    team1Reds: redCardsOf(game.homeCompetitor),
    team2Reds: redCardsOf(game.awayCompetitor),
    matchId: String(match._id),
    status: finished ? 'finished' : game.statusGroup === STATUS_LIVE ? 'live' : 'scheduled',
    statusText: game.shortStatusText || game.statusText || null,
    // "45+1'" בזמן משחק, ריק לפני ואחרי
    minute: game.gameTimeDisplay || null,
    team1Goals: scoreOf(game.homeCompetitor),
    team2Goals: scoreOf(game.awayCompetitor),
    justEnded: !!game.justEnded
  };
};

// שליפה אחת עבור אוסף משחקים. מחזירה מפה מ-matchId לנתוני החי.
const fetchLiveFor = async (matches) => {
  const withExternal = matches.filter((m) => is365Id(m.externalId));
  if (withExternal.length === 0) return [];

  const byGameId = new Map(withExternal.map((m) => [String(stripPrefix(m.externalId)), m]));
  const ids = [...byGameId.keys()].join(',');

  const json = await apiGet(`/games/current/?${COMMON_QUERY}&games=${ids}`);

  return (json.games || [])
    .map((game) => {
      const match = byGameId.get(String(game.id));
      return match ? toLiveEntry(match, game) : null;
    })
    .filter(Boolean);
};

// ── נסיגה אחרי כישלון ─────────────────────────────────────────────
//
// עד עכשיו כישלון מול 365 פשוט נבלע: הסריקה המשיכה באותו קצב, והטבלה החיה
// נעלמה מהמסך בלי הסבר. בסריקה כל 10 שניות זה גם אומר להמשיך להכות בספק
// שכבר אמר לא.
//
// ההשהיה מוכפלת עם כל כישלון רצוף ומתאפסת בהצלחה הראשונה. היא משותפת לכל
// הקוראים - גם הסריקה וגם בקשות השחקנים - אחרת אחד מהם היה ממשיך לפנות
// בזמן שהשני נח.
const BACKOFF_BASE_MS = 30 * 1000;
const BACKOFF_MAX_MS = 5 * 60 * 1000;

let consecutiveFailures = 0;
let nextAttemptAt = 0;

// ההשהיה אחרי n כישלונות רצופים: 30ש, דקה, 2, 4, ואז תקרה של 5 דקות
const backoffDelay = (failures) =>
  Math.min(BACKOFF_BASE_MS * Math.pow(2, Math.max(failures, 1) - 1), BACKOFF_MAX_MS);

const inBackoff = (now = Date.now()) => now < nextAttemptAt;

const noteFailure = (err) => {
  consecutiveFailures++;
  const wait = backoffDelay(consecutiveFailures);
  nextAttemptAt = Date.now() + wait;
  console.warn(
    `🔴 [LIVE] פנייה ל-365 נכשלה (${consecutiveFailures} ברצף): ${err.message}. ` +
    `נסיגה ל-${Math.round(wait / 1000)} שניות`
  );
};

const noteSuccess = () => {
  if (consecutiveFailures > 0) {
    console.log(`🔴 [LIVE] 365 חזר אחרי ${consecutiveFailures} כישלונות`);
  }
  consecutiveFailures = 0;
  nextAttemptAt = 0;
};

// לבדיקות בלבד
const resetBackoff = () => { consecutiveFailures = 0; nextAttemptAt = 0; };

// מצב חי לשבוע. מגיש מהזיכרון אם התשובה עדיין טרייה.
const getLiveForWeek = async (weekId, matches) => {
  const key = String(weekId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.games;

  const active = matches.filter((m) => inBroadcastWindow(m));
  if (active.length === 0) {
    cache.set(key, { at: Date.now(), games: [] });
    return [];
  }

  // בזמן נסיגה לא פונים לספק. מגישים את התשובה האחרונה הידועה גם אם היא
  // ישנה - עדיף מלמחוק את הטבלה החיה מהמסך
  if (inBackoff()) return hit ? hit.games : [];

  try {
    const games = await fetchLiveFor(active);
    noteSuccess();
    cache.set(key, { at: Date.now(), games });
    return games;
  } catch (err) {
    noteFailure(err);
    return hit ? hit.games : [];
  }
};

const invalidate = (weekId) => cache.delete(String(weekId));

module.exports = {
  getLiveForWeek,
  fetchLiveFor,
  inBroadcastWindow,
  invalidate,
  inBackoff,
  backoffDelay,
  resetBackoff,
  BACKOFF_MAX_MS,
  STATUS_FINISHED,
  STATUS_LIVE
};
