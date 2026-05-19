// ESPN API נסתר - בלי הרשמה, בלי מפתח. יציב אך לא רשמי.
const API_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map();

const isConfigured = () => true; // לא דורש מפתח

const cacheGet = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.savedAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const cacheSet = (key, value) => {
  cache.set(key, { value, savedAt: Date.now() });
};

// ESPN משתמש בפורמט YYYYMMDD
const toEspnDate = (isoDate) => isoDate.replace(/-/g, '');

const apiGet = async (path, params = {}) => {
  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  console.log(`📡 [ESPN] GET ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'football-betting-app/1.0' }
  });
  console.log(`📡 [ESPN] status=${res.status}`);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error(`❌ [ESPN] error body: ${text.slice(0, 300)}`);
    const err = new Error(`ESPN error ${res.status}: ${text}`);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }

  return res.json();
};

// ESPN לא תומך טווח dates רב-יומי לליגות קטנות. אנחנו עושים קריאה ליום בודד ומאגדים.
const enumerateDays = (fromDate, toDate) => {
  const days = [];
  const start = new Date(fromDate + 'T00:00:00Z');
  const end = new Date(toDate + 'T00:00:00Z');
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(formatYmd(d));
  }
  return days;
};

const formatYmd = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
};

const fetchUpcomingFixtures = async ({ espnLeagueCode, fromDate, toDate, refresh = false }) => {
  if (!espnLeagueCode) throw new Error('espnLeagueCode is required');

  const cacheKey = `espn_${espnLeagueCode}_${fromDate}_${toDate}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  const days = enumerateDays(fromDate, toDate);
  console.log(`🏈 [ESPN] fetching ${espnLeagueCode} day-by-day over ${days.length} days (${fromDate} → ${toDate})`);

  const seen = new Set();
  const allEvents = [];
  for (const day of days) {
    try {
      const json = await apiGet(`/${espnLeagueCode}/scoreboard`, { dates: day });
      const evs = json.events || [];
      for (const ev of evs) {
        if (!seen.has(ev.id)) {
          seen.add(ev.id);
          allEvents.push(ev);
        }
      }
    } catch (err) {
      console.warn(`⚠️ [ESPN] day ${day} failed:`, err.message);
    }
  }
  console.log(`🏈 [ESPN] aggregated ${allEvents.length} unique events for ${espnLeagueCode}`);

  const events = allEvents;
  const fixtures = events.map((ev) => {
    const comp = (ev.competitions || [])[0] || {};
    const competitors = comp.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home') || competitors[0] || {};
    const away = competitors.find((c) => c.homeAway === 'away') || competitors[1] || {};

    return {
      apiId: `espn_${ev.id}`,
      kickoffIso: ev.date,
      statusShort: comp.status?.type?.name || null,
      leagueName: ev.season?.displayName || null,
      team1En: home.team?.displayName || home.team?.shortDisplayName || 'Unknown',
      team1LogoUrl: home.team?.logo || null,
      team2En: away.team?.displayName || away.team?.shortDisplayName || 'Unknown',
      team2LogoUrl: away.team?.logo || null
    };
  });

  cacheSet(cacheKey, fixtures);
  return fixtures;
};

const fetchOddsForFixture = async () => null; // ESPN לא נותן יחסים

// ESPN לא חושף endpoint נקי למשחק בודד דרך scoreboard. ניתן לחפש דרך scoreboard ביום הספציפי.
const fetchResult = async (externalId, hint) => {
  if (!externalId) return null;
  const id = externalId.startsWith('espn_') ? externalId.slice(5) : externalId;
  const dayParam = hint?.dateYmd || formatYmd(new Date());
  const code = hint?.espnLeagueCode;
  if (!code) return null;
  try {
    const json = await apiGet(`/${code}/scoreboard`, { dates: dayParam });
    const ev = (json.events || []).find((e) => String(e.id) === String(id));
    if (!ev) return null;
    const comp = (ev.competitions || [])[0] || {};
    const finished = comp.status?.type?.completed === true;
    if (!finished) return null;
    const competitors = comp.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    const homeScore = parseInt(home?.score, 10);
    const awayScore = parseInt(away?.score, 10);
    if (!Number.isFinite(homeScore) || !Number.isFinite(awayScore)) return null;
    return { team1Goals: homeScore, team2Goals: awayScore };
  } catch (err) {
    console.warn(`⚠️ [ESPN] fetchResult failed for ${externalId}:`, err.message);
    return null;
  }
};

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture,
  fetchResult
};
