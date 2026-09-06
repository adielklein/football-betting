// 365scores - חברה ישראלית, מחזירים שמות בעברית, כוללים את כל ליגות ישראל
const API_BASE = 'https://webws.365scores.com/web';
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
  console.log(`📡 [365] GET ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'he-IL,he;q=0.9,en;q=0.8',
      'Referer': 'https://www.365scores.com/'
    }
  });
  console.log(`📡 [365] status=${res.status}`);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`365scores error ${res.status}: ${text.slice(0, 200)}`);
    err.code = 'API_ERROR';
    err.status = res.status;
    throw err;
  }
  return res.json();
};

const fetchUpcomingFixtures = async ({ scores365CompetitionId, fromDate, toDate, refresh = false, includePast = false }) => {
  if (!scores365CompetitionId) throw new Error('scores365CompetitionId is required');

  const cacheKey = `365_${scores365CompetitionId}_${fromDate}_${toDate}_${includePast ? 'all' : 'fut'}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  // עתידיים מ-fixtures, ואם includePast גם משחקים שנגמרו מ-results
  const endpoints = [`/games/fixtures/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&competitions=${scores365CompetitionId}`];
  if (includePast) {
    endpoints.push(`/games/results/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&competitions=${scores365CompetitionId}`);
  }
  const games = [];
  for (const ep of endpoints) {
    try {
      const json = await apiGet(ep);
      (json.games || []).forEach(g => games.push(g));
    } catch (err) {
      console.warn(`⚠️ [365] endpoint ${ep} failed:`, err.message);
    }
  }
  console.log(`⚽ [365] got ${games.length} games for competition ${scores365CompetitionId} (includePast=${includePast})`);

  const fromTs = new Date(fromDate + 'T00:00:00Z').getTime();
  const toTs = new Date(toDate + 'T23:59:59Z').getTime();

  // מפת לוגואים של קבוצות לפי competitor.id
  const competitorImg = (id) =>
    id ? `https://imagecache.365scores.com/image/upload/f_png,w_64,h_64,c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v9/Competitors/${id}` : null;

  const fixtures = games
    .map((g) => {
      const ts = new Date(g.startTime).getTime();
      if (!ts || ts < fromTs || ts > toTs) return null;
      return {
        apiId: `365_${g.id}`,
        kickoffIso: new Date(ts).toISOString(),
        statusShort: g.statusText || g.statusGroup || null,
        leagueName: g.competition?.name || null,
        // 365scores מחזירים שמות בעברית כי langId=2. ה-He שדה ישתמש בו ישירות.
        team1En: g.homeCompetitor?.name || 'Unknown',
        team1He: g.homeCompetitor?.name || null,
        team1LogoUrl: competitorImg(g.homeCompetitor?.id),
        team2En: g.awayCompetitor?.name || 'Unknown',
        team2He: g.awayCompetitor?.name || null,
        team2LogoUrl: competitorImg(g.awayCompetitor?.id)
      };
    })
    .filter(Boolean);

  console.log(`⚽ [365] ${fixtures.length} games in window`);
  cacheSet(cacheKey, fixtures);
  return fixtures;
};

// יחסי ווינר (Winner) למשחק עתידי - מקבל apiId בפורמט "365_12345"
// מחזיר { homeWin, draw, awayWin } מעוגל לעשירית, או null אם אין יחסים
const fetchOddsForFixture = async (externalId, refresh = false) => {
  if (!externalId) return null;
  const id = externalId.startsWith('365_') ? externalId.slice(4) : externalId;
  const cacheKey = `365_odds_${id}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit !== null) return hit;
  }
  try {
    const json = await apiGet(`/game/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&gameId=${id}`);
    const game = json.game;
    const lines = game?.bestOdds || [];

    // מחפשים את קו ה"תוצאת סיום" (1X2, lineTypeId=1); מעדיפים את ווינר (bookmakerId=1)
    const fullTimeLines = lines.filter((l) => l.lineTypeId === 1 && Array.isArray(l.options));
    const line =
      fullTimeLines.find((l) => l.bookmakerId === 1 || l.bookmaker?.name === 'ווינר') ||
      fullTimeLines[0];
    if (!line) {
      cacheSet(cacheKey, null);
      return null;
    }

    const round = (v) => (Number.isFinite(v) && v >= 1 ? Math.round(v * 10) / 10 : undefined);
    const result = {};
    for (const opt of line.options) {
      const rate = opt.rate?.decimal;
      if (opt.name === '1') result.homeWin = round(rate);
      else if (opt.name === 'X') result.draw = round(rate);
      else if (opt.name === '2') result.awayWin = round(rate);
    }

    const parsed = result.homeWin || result.draw || result.awayWin ? result : null;
    cacheSet(cacheKey, parsed);
    return parsed;
  } catch (err) {
    console.warn(`⚠️ [365] fetchOddsForFixture failed for ${externalId}:`, err.message);
    return null;
  }
};

// תוצאה למשחק שכבר נגמר - מקבל apiId (פורמט "365_12345")
// מחזיר תוצאה ב-90 דקות + finalScore כולל הארכה/פנדלים אם המשחק התארך
const fetchResult = async (externalId) => {
  if (!externalId) return null;
  const id = externalId.startsWith('365_') ? externalId.slice(4) : externalId;
  try {
    // endpoint /game/ מחזיר אובייקט מלא עם stages
    const json = await apiGet(`/game/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&gameId=${id}`);
    const game = json.game;
    if (!game) return null;
    const finished = game.statusGroup === 4 || /הסתיים|finished|ended/i.test(game.statusText || game.shortStatusText || '');
    if (!finished) return null;

    // 365scores stages:
    // id=7 מחצית, id=9 סוף 90 דקות, id=10 הארכה, id=11 פנדלים (לא בטוח), id=1 תוצאה נוכחית
    const stages = game.stages || [];
    const stage90 = stages.find((s) => s.id === 9);
    const stageET = stages.find((s) => s.id === 10);
    const stagePens = stages.find((s) => s.name?.includes('פנדל') || s.name?.toLowerCase().includes('penalt'));
    const stageCurrent = stages.find((s) => s.isCurrent || s.id === 1);

    // תוצאה ב-90 דקות
    let team1Goals, team2Goals;
    if (stage90) {
      team1Goals = stage90.homeCompetitorScore;
      team2Goals = stage90.awayCompetitorScore;
    } else if (stageCurrent) {
      // אין stage נפרד ל-90 - המשחק לא עבר הארכה, התוצאה הנוכחית = 90 דקות
      team1Goals = stageCurrent.homeCompetitorScore;
      team2Goals = stageCurrent.awayCompetitorScore;
    } else {
      // fallback - השדה הראשי
      team1Goals = game.homeCompetitor?.score;
      team2Goals = game.awayCompetitor?.score;
    }

    if (team1Goals == null || team2Goals == null || team1Goals < 0 || team2Goals < 0) return null;

    // אם המשחק עבר הארכה - בונים finalScore
    let finalScore = null;
    if (stageET) {
      finalScore = {
        team1Goals: stageET.homeCompetitorScore,
        team2Goals: stageET.awayCompetitorScore
      };
      if (stagePens) {
        finalScore.penalties = {
          team1: stagePens.homeCompetitorScore,
          team2: stagePens.awayCompetitorScore
        };
      }
    }

    return {
      team1Goals: Math.round(team1Goals),
      team2Goals: Math.round(team2Goals),
      finalScore
    };
  } catch (err) {
    console.warn(`⚠️ [365] fetchResult failed for ${externalId}:`, err.message);
    return null;
  }
};

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture,
  fetchResult
};
