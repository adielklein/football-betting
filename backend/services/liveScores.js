// מצב חי: תוצאות ודקת משחק בזמן אמת.
//
// 365 מחזירים את כל המשחקים המבוקשים בבקשה אחת (/games/current/?games=id1,id2)
// ולא אחת לכל משחק, ולכן מחזור סריקה שלם של שבוע עולה בקשה אחת. כשיש משחקים
// חיים הם מחזירים ttl=5, כלומר הם עצמם מצפים לרענון כל 5 שניות - סריקה כל
// דקה היא הרבה מתחת לזה.
//
// המחיר האמיתי הוא לא הבקשות אלא הזמן שהשרת ער, ולכן הסריקה רצה אך ורק
// כשבאמת יש משחק בחלון שידור. מחוץ לחלון: אפס בקשות.

const providerHealth = require('./providerHealth');

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

// כל קריאה נרשמת במצב הספק (הצלחה, או הסטטוס והטקסט שהוחזרו), כדי שמסך
// הלוגים יראה למה 365 לא עונה - ולא רק שהוא לא עונה
const apiGet = async (path) => {
  const started = Date.now();
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
        Referer: 'https://www.365scores.com/'
      }
    });
  } catch (err) {
    providerHealth.record('365 חי', { ok: false, message: `אין חיבור: ${err.message}`, path, ms: Date.now() - started });
    throw err;
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const message = `365scores live error ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`;
    providerHealth.record('365 חי', { ok: false, status: res.status, message, path, ms: Date.now() - started });
    throw new Error(message);
  }
  try {
    const json = await res.json();
    providerHealth.record('365 חי', { ok: true, status: res.status, path, ms: Date.now() - started });
    return json;
  } catch (err) {
    providerHealth.record('365 חי', { ok: false, status: res.status, message: `תשובה שאינה JSON: ${err.message}`, path, ms: Date.now() - started });
    throw err;
  }
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

// משחק שנדחה או ננטש. statusGroup אינו מבדיל אותו מ"טרם החל", ולכן הוא
// היה נשאר אצלנו "עתיד להתחיל" לנצח: בלי תוצאה, בלי ניקוד, ובלי שאף
// מסך יאמר למה השבוע לא נסגר. הטקסט של הספק כן אומר
const POSTPONED = /דחוי|נדחה|בוטל|מבוטל|ננטש|הופסק|postpon|abandon|cancel|suspend/i;

// הפסקת המחצית. השעון של 365 נשאר בה על "45'" (או "45+3'"), ולכן בלי
// הזיהוי הזה המשחק נראה כאילו נתקע בדקה 45. מזהים לפי טקסט הסטטוס, בהתאמה
// מלאה בלבד: "מחצית" לבדה היא ההפסקה, אבל "מחצית ראשונה" / "מחצית 2" הן זמן
// משחק, וגם הפסקה לפני הארכה היא לא מחצית
const HALFTIME = /^(?:מחצית|הפסקת מחצית|half[\s-]?time|HT)$/i;
const isHalftime = (game) =>
  [game?.shortStatusText, game?.statusText].some((t) => HALFTIME.test(String(t || '').trim()));

// כל טקסט סטטוס חי מודפס ללוג פעם אחת, כדי שאם 365 מנסחים את המחצית אחרת
// ממה שמצופה כאן, יהיה אפשר לראות מה בדיוק הם שולחים
const seenLiveTexts = new Set();
const noteLiveText = (game) => {
  if (game?.statusGroup !== STATUS_LIVE) return;
  const text = `${game.shortStatusText || ''} | ${game.statusText || ''}`;
  if (seenLiveTexts.has(text)) return;
  seenLiveTexts.add(text);
  console.log(`⏱️ [LIVE] טקסט סטטוס חי מ-365: "${text}" (דקה: ${game.gameTimeDisplay || '-'})`);
};

const toLiveEntry = (match, game) => {
  noteStatusGroup(game);
  noteLiveText(game);
  const finished = game.statusGroup === STATUS_FINISHED;
  const halftime = game.statusGroup === STATUS_LIVE && isHalftime(game);
  noteRedCardSupport(game.homeCompetitor);
  return {
    team1Reds: redCardsOf(game.homeCompetitor),
    team2Reds: redCardsOf(game.awayCompetitor),
    matchId: String(match._id),
    status: finished ? 'finished' : game.statusGroup === STATUS_LIVE ? 'live' : 'scheduled',
    statusText: game.shortStatusText || game.statusText || null,
    postponed: POSTPONED.test(`${game.statusText || ''} ${game.shortStatusText || ''}`),
    // "45+1'" בזמן משחק, ריק לפני ואחרי, ו"מחצית" בהפסקה
    halftime,
    minute: halftime ? 'מחצית' : (game.gameTimeDisplay || null),
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

// מצב הנסיגה, למסך הלוגים: כמה כישלונות ברצף ועד מתי לא פונים
const backoffStatus = (now = Date.now()) => ({
  consecutiveFailures,
  until: nextAttemptAt > now ? new Date(nextAttemptAt) : null
});

// בדיקה יזומה מהמסך: קריאה אחת ל-365, גם בזמן נסיגה, עם התשובה כפי שהיא
const probe = async () => {
  const started = Date.now();
  try {
    // הנתיב שידוע שעובד בלי פרמטרים נוספים: כל המשחקים של היום
    const json = await apiGet(`/games/allscores/?${COMMON_QUERY}&sports=1`);
    noteSuccess();
    return { ok: true, ms: Date.now() - started, games: (json.games || []).length };
  } catch (err) {
    return { ok: false, ms: Date.now() - started, message: err.message };
  }
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

// ── פרטי משחק: מי כבש, ולמה השער נפסל ───────────────────────────
//
// הרשימות מחזירות תוצאה בלבד, ולכן "השער בוטל" היה כל מה שיכולנו לומר -
// מספר שירד, בלי סיבה. הנתיב של משחק בודד מחזיר מערך אירועים שבו 365
// אומרים את זה במפורש: eventType.name = "השער נפסל", subTypeName = "Var",
// לצד הדקה, הקבוצה והשחקן.
//
// נקרא רק כשזוהה אירוע ויש למי לשלוח - לא בכל סריקה.
const fetchGameDetails = async (externalId) => {
  if (!is365Id(externalId)) return null;

  try {
    const json = await apiGet(`/game/?${COMMON_QUERY}&gameId=${stripPrefix(externalId)}`);
    const game = json?.game;
    if (!game) return null;

    // members הוא רשימת השחקנים של שתי הקבוצות; ממנה השם לפי מזהה
    const nameById = new Map(
      (Array.isArray(game.members) ? game.members : [])
        .map((m) => [m.id, m.name || m.shortName || null])
    );

    const events = (Array.isArray(game.events) ? game.events : []).map((e) => ({
      competitorId: e.competitorId ?? null,
      playerId: e.playerId ?? null,
      playerName: nameById.get(e.playerId) || null,
      minute: e.gameTimeDisplay || (e.gameTime != null ? `${e.gameTime}'` : null),
      order: e.order ?? 0,
      typeName: e.eventType?.name || null,
      subTypeName: e.eventType?.subTypeName || null
    }));

    return {
      homeCompetitorId: game.homeCompetitor?.id ?? null,
      awayCompetitorId: game.awayCompetitor?.id ?? null,
      events
    };
  } catch (err) {
    // העשרה, לא תלות: בלעדיה ההתראה עדיין נשלחת, רק בלי הפרטים
    console.warn(`⚠️ [365] פרטי משחק ${externalId} לא נטענו: ${err.message}`);
    return null;
  }
};

module.exports = {
  fetchGameDetails,
  getLiveForWeek,
  fetchLiveFor,
  inBroadcastWindow,
  backoffStatus,
  probe,
  toLiveEntry,
  isHalftime,
  invalidate,
  inBackoff,
  backoffDelay,
  resetBackoff,
  BACKOFF_MAX_MS,
  STATUS_FINISHED,
  STATUS_LIVE
};
