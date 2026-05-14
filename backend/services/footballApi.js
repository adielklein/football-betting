const API_BASE = 'https://v3.football.api-sports.io';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map();

const getApiKey = () => process.env.API_FOOTBALL_KEY || null;

const isConfigured = () => !!getApiKey();

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

const apiGet = async (path, params = {}) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('API_FOOTBALL_KEY is not configured');
    err.code = 'API_KEY_MISSING';
    throw err;
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { 'x-apisports-key': apiKey }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`API-Football error ${res.status}: ${text}`);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.warn('⚠️ [FOOTBALL-API] errors in payload:', json.errors);
  }
  return json;
};

const seasonForDate = (d) => {
  const month = d.getUTCMonth() + 1;
  const year = d.getUTCFullYear();
  return month >= 7 ? year : year - 1;
};

const fetchUpcomingFixtures = async ({ apiFootballId, fromDate, toDate, refresh = false }) => {
  if (!apiFootballId) throw new Error('apiFootballId is required');

  const season = seasonForDate(new Date(fromDate));
  const cacheKey = `fixtures_${apiFootballId}_${season}_${fromDate}_${toDate}`;

  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  const json = await apiGet('/fixtures', {
    league: apiFootballId,
    season,
    from: fromDate,
    to: toDate,
    timezone: 'Asia/Jerusalem'
  });

  const fixtures = (json.response || []).map((item) => ({
    apiId: item.fixture.id,
    kickoffIso: item.fixture.date,
    statusShort: item.fixture.status?.short || null,
    leagueApiId: item.league.id,
    leagueName: item.league.name,
    team1En: item.teams.home.name,
    team1LogoUrl: item.teams.home.logo,
    team2En: item.teams.away.name,
    team2LogoUrl: item.teams.away.logo
  }));

  cacheSet(cacheKey, fixtures);
  return fixtures;
};

const parseOddsResponse = (json) => {
  const first = (json.response || [])[0];
  if (!first) return null;
  const bookmaker = first.bookmakers?.[0];
  if (!bookmaker) return null;
  const matchWinnerBet = bookmaker.bets?.find((b) => /Match Winner|1x2|Full Time Result/i.test(b.name));
  if (!matchWinnerBet) return null;

  const result = {};
  for (const v of matchWinnerBet.values) {
    const odd = parseFloat(v.odd);
    if (!Number.isFinite(odd)) continue;
    const label = String(v.value).toLowerCase();
    if (label === 'home' || label === '1') result.homeWin = Math.round(odd * 10) / 10;
    else if (label === 'draw' || label === 'x') result.draw = Math.round(odd * 10) / 10;
    else if (label === 'away' || label === '2') result.awayWin = Math.round(odd * 10) / 10;
  }
  if (!result.homeWin && !result.draw && !result.awayWin) return null;
  return result;
};

const fetchOddsForFixture = async (apiFixtureId, refresh = false) => {
  if (!apiFixtureId) return null;
  const cacheKey = `odds_${apiFixtureId}`;

  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit !== null) return hit;
  }

  try {
    const json = await apiGet('/odds', { fixture: apiFixtureId });
    const parsed = parseOddsResponse(json);
    cacheSet(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.warn(`⚠️ [FOOTBALL-API] odds fetch failed for fixture ${apiFixtureId}:`, err.message);
    return null;
  }
};

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture
};
