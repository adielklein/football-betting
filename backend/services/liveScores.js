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
const STATUS_LIVE = 3;
const STATUS_FINISHED = 4;

const cache = new Map(); // weekId -> { at, games }

const stripPrefix = (externalId) =>
  externalId && externalId.startsWith('365_') ? externalId.slice(4) : externalId;

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

// מה שהלקוח צריך כדי לצייר שורה חיה, בסדר team1/team2 של האפליקציה
const toLiveEntry = (match, game) => {
  const finished = game.statusGroup === STATUS_FINISHED;
  return {
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
  const withExternal = matches.filter((m) => m.externalId);
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

  const games = await fetchLiveFor(active);
  cache.set(key, { at: Date.now(), games });
  return games;
};

const invalidate = (weekId) => cache.delete(String(weekId));

module.exports = {
  getLiveForWeek,
  fetchLiveFor,
  inBroadcastWindow,
  invalidate,
  STATUS_FINISHED,
  STATUS_LIVE
};
