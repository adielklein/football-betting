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

// ── תובנות טרום-משחק ─────────────────────────────────────────────
// לוגו קבוצה לפי competitor.id
const competitorImgUrl = (id, size = 64) =>
  id ? `https://imagecache.365scores.com/image/upload/f_png,w_${size},h_${size},c_limit,q_auto:eco,dpr_2,d_Competitors:default1.png/v9/Competitors/${id}` : null;

// תוצאת משחק מנקודת מבט של קבוצה מסוימת
const outcomeFor = (game, teamId) => {
  const isHome = game.homeCompetitor?.id === teamId;
  const gf = isHome ? game.homeCompetitor?.score : game.awayCompetitor?.score;
  const ga = isHome ? game.awayCompetitor?.score : game.homeCompetitor?.score;
  if (gf == null || ga == null || gf < 0 || ga < 0) return null;
  return {
    isHome,
    goalsFor: Math.round(gf),
    goalsAgainst: Math.round(ga),
    outcome: gf > ga ? 'W' : gf === ga ? 'D' : 'L',
    opponent: isHome ? game.awayCompetitor?.name : game.homeCompetitor?.name,
    opponentId: isHome ? game.awayCompetitor?.id : game.homeCompetitor?.id,
    opponentLogo: competitorImgUrl(isHome ? game.awayCompetitor?.id : game.homeCompetitor?.id),
    date: game.startTime ? game.startTime.slice(0, 10) : null,
    competition: game.competitionDisplayName || null
  };
};

const finishedNewestFirst = (games) =>
  (games || [])
    .filter((g) => g.statusGroup === 4)
    .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));

// הנתיב לעמוד הישן יותר של אותה רשימה. 365 מחזיר נתיב מלא שכולל כבר /web.
const olderPagePath = (json) => {
  const prev = json?.paging?.previousPage;
  return prev ? prev.replace(/^\/web/, '') : null;
};

// כל המשחקים שהסתיימו של קבוצה (על פני כל המסגרות), החדשים ראשונים.
// מוחזר גם מצביע לעמוד הקודם, כדי שחיפוש ראש-בראש יוכל להמשיך מכאן
// במקום לשלוף שוב את אותו עמוד ראשון.
const fetchTeamGamesPage = async (competitorId) => {
  try {
    const json = await apiGet(`/games/results/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&competitors=${competitorId}`);
    return { games: finishedNewestFirst(json.games), nextPath: olderPagePath(json) };
  } catch (err) {
    console.warn(`⚠️ [365] fetchTeamGames failed for ${competitorId}:`, err.message);
    return { games: [], nextPath: null };
  }
};

const fetchTeamGames = async (competitorId) => (await fetchTeamGamesPage(competitorId)).games;

// מפגשים קודמים בין שתי קבוצות.
//
// ל-365 אין endpoint ייעודי לראש-בראש - competitors= הוא סינון "או", לא "וגם".
// לכן דופדפים אחורה בתוצאות של קבוצה אחת ומסננים את המשחקים מול היריבה.
// עמוד אחד מכסה חצי עונה בערך, ולכן בלי דפדוף כמעט תמיד יוצא ריק - וזו
// הסיבה שהחלון הציג "אין מפגשים" גם לזוגות שנפגשים כל שנה.
//
// 365 מאט מאוד תחת בקשות רצופות (עמוד בודד יכול לקחת 4 שניות), ולכן:
// העמוד הראשון מגיע מהשליפה שכבר נעשתה עבור הכושר, הדפדוף מוגבל בכמות
// עמודים וגם בתקציב זמן, ומפסיקים ברגע שנאספו מספיק מפגשים.
const MAX_H2H_PAGES = 3;
const WANTED_H2H = 5;
const H2H_TIME_BUDGET_MS = 6000;

const fetchHeadToHead = async (teamId, opponentId, { seedGames = [], seedNextPath = null } = {}) => {
  if (!teamId || !opponentId) return [];

  const isMeeting = (g) => {
    const ids = [g.homeCompetitor?.id, g.awayCompetitor?.id];
    return ids.includes(teamId) && ids.includes(opponentId);
  };

  const meetings = seedGames.filter(isMeeting);
  let path = seedNextPath;
  const deadline = Date.now() + H2H_TIME_BUDGET_MS;

  try {
    for (let page = 0; page < MAX_H2H_PAGES; page++) {
      if (!path || meetings.length >= WANTED_H2H || Date.now() > deadline) break;
      const json = await apiGet(path);
      meetings.push(...finishedNewestFirst(json.games).filter(isMeeting));
      path = olderPagePath(json);
    }
  } catch (err) {
    console.warn(`⚠️ [365] fetchHeadToHead ${teamId} vs ${opponentId} failed:`, err.message);
  }

  return meetings.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
};

const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null);
const round1 = (v) => (v == null ? null : Math.round(v * 10) / 10);

// בונה בלוק נתונים לקבוצה אחת
const buildTeamBlock = (competitor, games, standingsRows, formSize) => {
  const teamId = competitor?.id;
  const form = games
    .map((g) => outcomeFor(g, teamId))
    .filter(Boolean)
    .slice(0, formSize);

  const row = standingsRows.find((r) => r.competitor?.id === teamId);
  const table = row
    ? {
        position: row.position,
        points: row.points,
        played: row.gamePlayed,
        won: row.gamesWon,
        drawn: row.gamesEven,
        lost: row.gamesLost,
        goalsFor: row.for,
        goalsAgainst: row.against,
        goalDiff: (row.for ?? 0) - (row.against ?? 0)
      }
    : null;

  const formPoints = form.reduce((s, f) => s + (f.outcome === 'W' ? 3 : f.outcome === 'D' ? 1 : 0), 0);

  return {
    id: teamId,
    name: competitor?.name || null,
    logo: competitorImgUrl(teamId, 96),
    color: competitor?.color || null,
    table,
    form,
    formPoints,
    formMax: form.length * 3,
    avgScored: round1(avg(form.map((f) => f.goalsFor))),
    avgConceded: round1(avg(form.map((f) => f.goalsAgainst))),
    cleanSheets: form.filter((f) => f.goalsAgainst === 0).length,
    failedToScore: form.filter((f) => f.goalsFor === 0).length
  };
};

// הסתברות משתמעת מיחסים, מנורמלת (הסרת מרווח הבוקמייקר)
const impliedProbabilities = (odds) => {
  if (!odds) return null;
  const raw = { home: odds.homeWin ? 1 / odds.homeWin : 0, draw: odds.draw ? 1 / odds.draw : 0, away: odds.awayWin ? 1 / odds.awayWin : 0 };
  const total = raw.home + raw.draw + raw.away;
  if (!total) return null;
  return {
    home: Math.round((raw.home / total) * 100),
    draw: Math.round((raw.draw / total) * 100),
    away: Math.round((raw.away / total) * 100)
  };
};

// תחזית תוצאה: כוח התקפה של האחת מול הגנה של השנייה, + יתרון ביתיות קל
const predictScore = (home, away) => {
  if (home.avgScored == null || away.avgScored == null) return null;
  const HOME_EDGE = 1.1;
  const expHome = ((home.avgScored + away.avgConceded) / 2) * HOME_EDGE;
  const expAway = ((away.avgScored + home.avgConceded) / 2) / HOME_EDGE;
  return {
    expectedHome: round1(expHome),
    expectedAway: round1(expAway),
    suggestedHome: Math.max(0, Math.round(expHome)),
    suggestedAway: Math.max(0, Math.round(expAway))
  };
};

// אוסף את כל התובנות למשחק אחד. externalId בפורמט "365_12345"
const fetchTeamInsights = async (externalId, { refresh = false, formSize = 5 } = {}) => {
  if (!externalId) return null;
  const id = externalId.startsWith('365_') ? externalId.slice(4) : externalId;
  const cacheKey = `365_insights_${id}_${formSize}`;
  if (!refresh) {
    const hit = cacheGet(cacheKey);
    if (hit) return hit;
  }

  const gameJson = await apiGet(`/game/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&gameId=${id}`);
  const game = gameJson.game;
  if (!game) return null;

  const homeC = game.homeCompetitor;
  const awayC = game.awayCompetitor;

  // טבלה - לא קיימת בגביעים, נכשל בשקט
  let standingsRows = [];
  try {
    const st = await apiGet(`/standings/?appTypeId=5&langId=2&timezoneName=Asia/Jerusalem&userCountryId=6&competitions=${game.competitionId}`);
    standingsRows = (st.standings || []).flatMap((s) => s.rows || []);
  } catch (err) {
    console.warn(`⚠️ [365] standings unavailable for competition ${game.competitionId}:`, err.message);
  }

  const [homePage, awayPage] = await Promise.all([
    fetchTeamGamesPage(homeC?.id),
    fetchTeamGamesPage(awayC?.id)
  ]);
  const homeGames = homePage.games;
  const awayGames = awayPage.games;

  const home = buildTeamBlock(homeC, homeGames, standingsRows, formSize);
  const away = buildTeamBlock(awayC, awayGames, standingsRows, formSize);

  // ראש בראש. המשחק הנוכחי עצמו מסונן החוצה - כשהוא כבר הסתיים הוא חוזר
  // בתוצאות של הקבוצה, ואין טעם להציג אותו כ"מפגש קודם" של עצמו.
  const h2hGames = (await fetchHeadToHead(homeC?.id, awayC?.id, {
    seedGames: homeGames,
    seedNextPath: homePage.nextPath
  })).filter((g) => g.id !== game.id);

  const h2h = h2hGames
    .map((g) => {
      const o = outcomeFor(g, homeC?.id);
      if (!o) return null;
      return {
        date: o.date,
        competition: o.competition,
        homeTeamWasHome: o.isHome,
        homeGoals: o.goalsFor,
        awayGoals: o.goalsAgainst,
        winner: o.outcome === 'W' ? 'home' : o.outcome === 'L' ? 'away' : 'draw'
      };
    })
    .filter(Boolean)
    .slice(0, 5);

  const odds = await fetchOddsForFixture(externalId, refresh);

  const insights = {
    gameId: game.id,
    competition: game.competitionDisplayName || null,
    startTime: game.startTime || null,
    statusText: game.statusText || null,
    venue: game.venue?.name || null,
    home,
    away,
    h2h,
    h2hSummary: {
      homeWins: h2h.filter((m) => m.winner === 'home').length,
      draws: h2h.filter((m) => m.winner === 'draw').length,
      awayWins: h2h.filter((m) => m.winner === 'away').length
    },
    odds,
    impliedProbabilities: impliedProbabilities(odds),
    prediction: predictScore(home, away)
  };

  cacheSet(cacheKey, insights);
  return insights;
};

module.exports = {
  isConfigured,
  fetchUpcomingFixtures,
  fetchOddsForFixture,
  fetchResult,
  fetchTeamInsights
};
