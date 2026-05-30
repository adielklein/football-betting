const API_BASE = 'https://api.football-data.org/v4';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const cache = new Map();

const getApiToken = () => process.env.FOOTBALL_DATA_TOKEN || null;

const isConfigured = () => !!getApiToken();

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
  const token = getApiToken();
  if (!token) {
    const err = new Error('FOOTBALL_DATA_TOKEN is not configured');
    err.code = 'API_TOKEN_MISSING';
    throw err;
  }

  const qs = new URLSearchParams(params).toString();
  const url = `${API_BASE}${path}${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, {
    headers: { 'X-Auth-Token': token }
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`football-data.org error ${res.status}: ${text}`);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }

  return res.json();
};

const fetchUpcomingFixtures = async ({ footballDataCode, fromDate, toDate, refresh = false, includePast = false }) => {
  if (!footballDataCode) throw new Error('footballDataCode is required');

  const cacheKey = `fixtures_${footballDataCode}_${fromDate}_${toDate}_${includePast ? 'all' : 'fut'}`;

  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  // includePast=true כולל גם משחקים שנגמרו (לצורך גילוי externalId)
  const status = includePast ? 'SCHEDULED,TIMED,IN_PLAY,PAUSED,FINISHED' : 'SCHEDULED,TIMED';
  const json = await apiGet(`/competitions/${footballDataCode}/matches`, {
    dateFrom: fromDate,
    dateTo: toDate,
    status
  });

  const fixtures = (json.matches || []).map((m) => ({
    apiId: m.id,
    kickoffIso: m.utcDate,
    statusShort: m.status || null,
    leagueName: m.competition?.name || json.competition?.name || null,
    team1En: m.homeTeam?.name || m.homeTeam?.shortName || 'Unknown',
    team1LogoUrl: m.homeTeam?.crest || null,
    team2En: m.awayTeam?.name || m.awayTeam?.shortName || 'Unknown',
    team2LogoUrl: m.awayTeam?.crest || null
  }));

  cacheSet(cacheKey, fixtures);
  return fixtures;
};

// football-data.org free tier doesn't provide odds
const fetchOddsForFixture = async () => null;

// football-data.org:
//   score.fullTime    = שערים ב-90 דקות + תוספת
//   score.extraTime   = שערים בהארכה (תוספתיים)
//   score.penalties   = פנדלים
//   score.duration    = "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT"
const fetchResult = async (externalId) => {
  if (!externalId) return null;
  try {
    const json = await apiGet(`/matches/${externalId}`);
    console.log(`⚽ [FD] match ${externalId} status=${json.status} duration=${json.score?.duration} ft=${json.score?.fullTime?.home}-${json.score?.fullTime?.away}`);
    if (json.status !== 'FINISHED') return null;
    const ft = json.score?.fullTime;
    const et = json.score?.extraTime;
    const pens = json.score?.penalties;
    const duration = json.score?.duration || 'REGULAR';
    if (ft?.home == null || ft?.away == null) return null;

    const team1Goals = ft.home;
    const team2Goals = ft.away;

    let finalScore = null;
    if (duration !== 'REGULAR') {
      // המשחק עבר ל-ET או פנדלים
      const final1 = (ft.home || 0) + (et?.home || 0);
      const final2 = (ft.away || 0) + (et?.away || 0);
      finalScore = { team1Goals: final1, team2Goals: final2 };
      if (pens?.home != null && pens?.away != null) {
        finalScore.penalties = { team1: pens.home, team2: pens.away };
      }
    }

    return { team1Goals, team2Goals, finalScore };
  } catch (err) {
    console.warn(`⚠️ [FD] fetchResult failed for ${externalId}:`, err.message);
    return null;
  }
};

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture,
  fetchResult
};
