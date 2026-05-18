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

const fetchUpcomingFixtures = async ({ espnLeagueCode, fromDate, toDate, refresh = false }) => {
  if (!espnLeagueCode) throw new Error('espnLeagueCode is required');

  const cacheKey = `espn_${espnLeagueCode}_${fromDate}_${toDate}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  const dates = `${toEspnDate(fromDate)}-${toEspnDate(toDate)}`;
  console.log(`🏈 [ESPN] fetchUpcomingFixtures league=${espnLeagueCode} dates=${dates}`);
  const json = await apiGet(`/${espnLeagueCode}/scoreboard`, { dates });

  const events = json.events || [];
  console.log(`🏈 [ESPN] received ${events.length} raw events for ${espnLeagueCode}`);
  if (events.length === 0) {
    console.log(`⚠️ [ESPN] empty response. leagues field:`, JSON.stringify(json.leagues?.[0]?.name || 'none'));
    console.log(`⚠️ [ESPN] season:`, JSON.stringify(json.season || 'none'));
  }
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

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture
};
