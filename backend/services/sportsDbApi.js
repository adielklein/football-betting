// TheSportsDB API רשמי - חינמי, מפתח ציבורי "3", לא חוסם IP-ים של ענן
const API_BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map();

const isConfigured = () => true;

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

const apiGet = async (path) => {
  const url = `${API_BASE}${path}`;
  console.log(`📡 [TSDB] GET ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; football-betting-app/1.0)' }
  });
  console.log(`📡 [TSDB] status=${res.status}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`TheSportsDB error ${res.status}: ${text.slice(0, 200)}`);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }
  return res.json();
};

const fetchUpcomingFixtures = async ({ sportsDbLeagueId, fromDate, toDate, refresh = false }) => {
  if (!sportsDbLeagueId) throw new Error('sportsDbLeagueId is required');

  const cacheKey = `tsdb_${sportsDbLeagueId}_${fromDate}_${toDate}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  // eventsnextleague מחזיר עד 15 משחקים קרובים
  const json = await apiGet(`/eventsnextleague.php?id=${sportsDbLeagueId}`);
  const allEvents = json.events || [];
  console.log(`⚽ [TSDB] got ${allEvents.length} upcoming events for league ${sportsDbLeagueId}`);

  const fromTs = new Date(fromDate + 'T00:00:00Z').getTime();
  const toTs = new Date(toDate + 'T23:59:59Z').getTime();

  const fixtures = allEvents
    .map((ev) => {
      // TheSportsDB מחזיר strTimestamp בפורמט "YYYY-MM-DDTHH:MM:SS" ב-UTC
      const ts = ev.strTimestamp ? new Date(ev.strTimestamp + 'Z').getTime() : null;
      if (!ts || ts < fromTs || ts > toTs) return null;
      return {
        apiId: `tsdb_${ev.idEvent}`,
        kickoffIso: new Date(ts).toISOString(),
        statusShort: ev.strStatus || null,
        leagueName: ev.strLeague || null,
        team1En: ev.strHomeTeam || 'Unknown',
        team1LogoUrl: ev.strHomeTeamBadge || null,
        team2En: ev.strAwayTeam || 'Unknown',
        team2LogoUrl: ev.strAwayTeamBadge || null
      };
    })
    .filter(Boolean);

  console.log(`⚽ [TSDB] ${fixtures.length} events in window ${fromDate}..${toDate}`);
  cacheSet(cacheKey, fixtures);
  return fixtures;
};

const fetchOddsForFixture = async () => null;

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture
};
