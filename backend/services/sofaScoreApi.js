// SofaScore unofficial API - בלי הרשמה. יציב יחסית.
const API_BASE = 'https://api.sofascore.com/api/v1';
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
  console.log(`📡 [SOFA] GET ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; football-betting-app/1.0)' }
  });
  console.log(`📡 [SOFA] status=${res.status}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`SofaScore error ${res.status}: ${text.slice(0, 200)}`);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }
  return res.json();
};

// SofaScore דורש seasonId - משתנה כל עונה. נקבל אותו מתוך הרשימה.
const getCurrentSeasonId = async (tournamentId) => {
  const cacheKey = `sofa_seasons_${tournamentId}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const json = await apiGet(`/unique-tournament/${tournamentId}/seasons`);
  const seasons = json.seasons || [];
  if (seasons.length === 0) throw new Error(`No seasons found for tournament ${tournamentId}`);
  // העונה הראשונה ברשימה היא הכי עדכנית
  const currentId = seasons[0].id;
  cacheSet(cacheKey, currentId);
  return currentId;
};

const fetchUpcomingFixtures = async ({ sofaScoreTournamentId, fromDate, toDate, refresh = false }) => {
  if (!sofaScoreTournamentId) throw new Error('sofaScoreTournamentId is required');

  const cacheKey = `sofa_fixtures_${sofaScoreTournamentId}_${fromDate}_${toDate}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  const seasonId = await getCurrentSeasonId(sofaScoreTournamentId);
  console.log(`⚽ [SOFA] tournament=${sofaScoreTournamentId} season=${seasonId} window=${fromDate}..${toDate}`);

  // נטען כמה דפים של "next events" עד שמגיעים לטווח התאריכים שמעניין אותנו
  const fromTs = new Date(fromDate + 'T00:00:00Z').getTime();
  const toTs = new Date(toDate + 'T23:59:59Z').getTime();
  const allEvents = [];
  for (let page = 0; page < 5; page++) {
    let json;
    try {
      json = await apiGet(`/unique-tournament/${sofaScoreTournamentId}/season/${seasonId}/events/next/${page}`);
    } catch (err) {
      if (err.status === 404) break;
      throw err;
    }
    const events = json.events || [];
    if (events.length === 0) break;
    allEvents.push(...events);
    const lastTs = events[events.length - 1].startTimestamp * 1000;
    if (lastTs > toTs) break; // עברנו את הטווח שלנו
    if (!json.hasNextPage) break;
  }
  console.log(`⚽ [SOFA] got ${allEvents.length} total events before filter`);

  const inWindow = allEvents.filter((ev) => {
    const ts = ev.startTimestamp * 1000;
    return ts >= fromTs && ts <= toTs;
  });
  console.log(`⚽ [SOFA] ${inWindow.length} events in window`);

  const teamLogo = (teamId) => teamId ? `https://api.sofascore.com/api/v1/team/${teamId}/image` : null;

  const fixtures = inWindow.map((ev) => ({
    apiId: `sofa_${ev.id}`,
    kickoffIso: new Date(ev.startTimestamp * 1000).toISOString(),
    statusShort: ev.status?.type || null,
    leagueName: ev.tournament?.name || null,
    team1En: ev.homeTeam?.name || 'Unknown',
    team1LogoUrl: teamLogo(ev.homeTeam?.id),
    team2En: ev.awayTeam?.name || 'Unknown',
    team2LogoUrl: teamLogo(ev.awayTeam?.id)
  }));

  cacheSet(cacheKey, fixtures);
  return fixtures;
};

const fetchOddsForFixture = async () => null; // SofaScore לא נותן יחסים בקלות

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture
};
