const express = require('express');
const League = require('../models/League');
const Match = require('../models/Match');
const footballDataApi = require('../services/footballDataApi');
const espnApi = require('../services/espnApi');
const sofaScoreApi = require('../services/sofaScoreApi');
const sportsDbApi = require('../services/sportsDbApi');
const scores365Api = require('../services/scores365Api');
const { hebrewToEnglish } = require('../utils/teamNames');
const liveScores = require('../services/liveScores');

// בוחר ספק לפי השדה הזמין על הליגה
// עדיפות: 365scores (ראשון - שמות בעברית) > football-data > ESPN > TheSportsDB > SofaScore
const pickProvider = (league) => {
  if (league.scores365CompetitionId) return { name: '365scores', api: scores365Api, codeField: 'scores365CompetitionId' };
  if (league.footballDataCode) return { name: 'football-data.org', api: footballDataApi, codeField: 'footballDataCode' };
  if (league.espnLeagueCode) return { name: 'ESPN', api: espnApi, codeField: 'espnLeagueCode' };
  if (league.sportsDbLeagueId) return { name: 'TheSportsDB', api: sportsDbApi, codeField: 'sportsDbLeagueId' };
  if (league.sofaScoreTournamentId) return { name: 'SofaScore', api: sofaScoreApi, codeField: 'sofaScoreTournamentId' };
  return null;
};

// fallback - אם הספק הראשי החזיר 0 או נכשל, ננסה את הבא
const fallbackProviders = (league, exclude) => {
  const candidates = [];
  if (league.footballDataCode && exclude !== 'football-data.org') candidates.push({ name: 'football-data.org', api: footballDataApi, codeField: 'footballDataCode' });
  if (league.espnLeagueCode && exclude !== 'ESPN') candidates.push({ name: 'ESPN', api: espnApi, codeField: 'espnLeagueCode' });
  if (league.sportsDbLeagueId && exclude !== 'TheSportsDB') candidates.push({ name: 'TheSportsDB', api: sportsDbApi, codeField: 'sportsDbLeagueId' });
  if (league.sofaScoreTournamentId && exclude !== 'SofaScore') candidates.push({ name: 'SofaScore', api: sofaScoreApi, codeField: 'sofaScoreTournamentId' });
  if (league.scores365CompetitionId && exclude !== '365scores') candidates.push({ name: '365scores', api: scores365Api, codeField: 'scores365CompetitionId' });
  return candidates;
};

const { requireAdmin } = require('../middleware/requireAdmin');
const router = express.Router();

const formatDateForApi = (d) => {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const israelDateAndTime = (isoString) => {
  const d = new Date(isoString);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jerusalem',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(d);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    date: `${lookup.day}.${lookup.month}`,
    time: `${lookup.hour}:${lookup.minute}`,
    year: parseInt(lookup.year, 10)
  };
};

// בדיקת תקינות מהירה
router.get('/health', (req, res) => {
  const fdConfigured = footballDataApi.isConfigured();
  res.json({
    footballDataConfigured: fdConfigured,
    providers: {
      'football-data.org': fdConfigured ? '✅ מוגדר' : '❌ FOOTBALL_DATA_TOKEN חסר',
      'TheSportsDB': '✅ זמין (חינמי רשמי)',
      'SofaScore (unofficial)': '✅ זמין (לא דורש מפתח)',
      'ESPN (unofficial)': '✅ זמין (לא דורש מפתח)'
    }
  });
});

router.get('/fixtures', async (req, res) => {
  try {
    const { leagueId, days = '7', includeOdds = 'false', refresh = 'false' } = req.query;
    if (!leagueId) {
      return res.status(400).json({ message: 'leagueId נדרש' });
    }

    const league = await League.findById(leagueId);
    if (!league) return res.status(404).json({ message: 'הליגה לא נמצאה' });

    const provider = pickProvider(league);
    if (!provider) {
      return res.status(400).json({
        message: 'לליגה זו אין מזהה חיצוני (footballDataCode או espnLeagueCode)'
      });
    }

    if (!provider.api.isConfigured()) {
      return res.status(503).json({
        message: `${provider.name} אינו מוגדר. הוסף את משתנה הסביבה המתאים`
      });
    }

    const daysAhead = Math.min(Math.max(parseInt(days, 10) || 7, 1), 30);
    const today = new Date();
    const fromDate = formatDateForApi(today);
    const toDate = formatDateForApi(new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000));
    const wantOdds = includeOdds === 'true' || includeOdds === '1';
    const forceRefresh = refresh === 'true' || refresh === '1';

    let activeProvider = provider;
    let fixtures = [];
    try {
      fixtures = await provider.api.fetchUpcomingFixtures({
        [provider.codeField]: league[provider.codeField],
        fromDate,
        toDate,
        refresh: forceRefresh
      });
    } catch (primaryErr) {
      console.warn(`⚠️ [external] primary provider ${provider.name} failed:`, primaryErr.message);
      fixtures = [];
    }

    // אם הראשי נכשל או החזיר 0, ננסה fallbacks
    if (fixtures.length === 0) {
      for (const fb of fallbackProviders(league, provider.name)) {
        try {
          console.log(`🔁 [external] trying fallback ${fb.name} for ${league.name}`);
          const fbFixtures = await fb.api.fetchUpcomingFixtures({
            [fb.codeField]: league[fb.codeField],
            fromDate,
            toDate,
            refresh: forceRefresh
          });
          if (fbFixtures.length > 0) {
            fixtures = fbFixtures;
            activeProvider = fb;
            break;
          }
        } catch (fbErr) {
          console.warn(`⚠️ [external] fallback ${fb.name} failed:`, fbErr.message);
        }
      }
    }

    const upcoming = fixtures.filter((f) => new Date(f.kickoffIso).getTime() > Date.now());

    const enriched = upcoming.map((f) => {
      const israelTs = israelDateAndTime(f.kickoffIso);
      return {
        apiId: f.apiId,
        team1En: f.team1En,
        team2En: f.team2En,
        team1He: f.team1He || null,
        team2He: f.team2He || null,
        team1LogoUrl: f.team1LogoUrl,
        team2LogoUrl: f.team2LogoUrl,
        kickoffIso: f.kickoffIso,
        date: israelTs.date,
        time: israelTs.time,
        year: israelTs.year
      };
    });

    // משיכת יחסים - כל משחק דורש קריאה נפרדת לספק, לכן מגבילים מקביליות
    // כדי לא להיחסם (365scores חוסם לפי IP על ריבוי בקשות בו-זמנית)
    if (wantOdds) {
      const CONCURRENCY = 4;
      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, enriched.length) }, async () => {
        while (cursor < enriched.length) {
          const item = enriched[cursor++];
          try {
            item.odds = await activeProvider.api.fetchOddsForFixture(item.apiId, forceRefresh);
          } catch (oddsErr) {
            console.warn(`⚠️ [external] odds failed for ${item.apiId}:`, oddsErr.message);
            item.odds = null;
          }
        }
      });
      await Promise.all(workers);
      const withOdds = enriched.filter((f) => f.odds && (f.odds.homeWin || f.odds.draw || f.odds.awayWin)).length;
      console.log(`💰 [external] odds resolved for ${withOdds}/${enriched.length} fixtures via ${activeProvider.name}`);
    }

    enriched.sort((a, b) => new Date(a.kickoffIso) - new Date(b.kickoffIso));

    res.json({
      league: { _id: league._id, name: league.name, key: league.key },
      provider: activeProvider.name,
      fromDate,
      toDate,
      includeOdds: wantOdds,
      fixtures: enriched
    });
  } catch (err) {
    console.error('❌ [external/fixtures] error:', err);
    if (err.code === 'API_TOKEN_MISSING') {
      return res.status(503).json({ message: 'הספק לא מוגדר' });
    }
    res.status(500).json({ message: err.message });
  }
});

// נרמול שם קבוצה לצורך השוואה
// - מסיר accents (é→e, í→i)
// - מסיר גרשיים, רווחים, אותיות גדולות
// - מסיר סיומות נפוצות (FC, CF, RCD, AFC, Club, de, etc.)
const normalizeTeamName = (s) => {
  if (!s) return '';
  return String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/["'״׳’“”`]/g, '')
    .replace(/\b(fc|cf|rcd|afc|cd|ud|ac|as|sc|cda)\b/g, '')
    .replace(/\bf\.?c\.?\b/g, '')
    .replace(/\bfootball club\b/g, '')
    .replace(/\b(club|de|del|the|hotspur)\b/g, '')
    .replace(/[^a-z0-9֐-׿]+/g, '')
    .trim();
};

// בודק אם שתי קבוצות תואמות (בכל סדר). תומך גם ב-Hebrew-English mismatch.
const matchesPair = (a1, a2, b1, b2) => {
  const eq = (x, y) => x && y && (x === y || x.includes(y) || y.includes(x));
  // ניסיון ישיר (אותה שפה)
  const A1 = normalizeTeamName(a1), A2 = normalizeTeamName(a2);
  const B1 = normalizeTeamName(b1), B2 = normalizeTeamName(b2);
  if ((eq(A1, B1) && eq(A2, B2)) || (eq(A1, B2) && eq(A2, B1))) return true;
  // אם a1/a2 בעברית - נתרגם לאנגלית וננסה שוב
  const aEn1 = normalizeTeamName(hebrewToEnglish(a1));
  const aEn2 = normalizeTeamName(hebrewToEnglish(a2));
  if ((eq(aEn1, B1) && eq(aEn2, B2)) || (eq(aEn1, B2) && eq(aEn2, B1))) return true;
  // וגם להפך - אם b1/b2 בעברית
  const bEn1 = normalizeTeamName(hebrewToEnglish(b1));
  const bEn2 = normalizeTeamName(hebrewToEnglish(b2));
  if ((eq(A1, bEn1) && eq(A2, bEn2)) || (eq(A1, bEn2) && eq(A2, bEn1))) return true;
  return false;
};

// בודק אם שני שמות מתארים את אותה קבוצה (תומך עברית מול אנגלית)
const sameTeam = (a, b) => {
  if (!a || !b) return false;
  const eq = (x, y) => x && y && (x === y || x.includes(y) || y.includes(x));
  const A = normalizeTeamName(a), B = normalizeTeamName(b);
  if (eq(A, B)) return true;
  return eq(normalizeTeamName(hebrewToEnglish(a)), B) || eq(A, normalizeTeamName(hebrewToEnglish(b)));
};

// זיהוי הכיוון יושב במודול נפרד כדי שאפשר יהיה לבדוק אותו ישירות
// (ראה services/orientation.test.js). ההשוואה בין שמות מוזרקת אליו.
const detectOrientation = require('../services/orientation').buildDetector(sameTeam);

const { sameResult } = require('../services/resultCompare');

// 🔎 גילוי externalId למשחק שלא יובא ממאגר
const discoverExternalId = async (match, providersByName, debugCollector = null) => {
  const dbg = (...args) => { console.log('🔎 [discover]', ...args); if (debugCollector) debugCollector.push(args.join(' ')); };

  if (!match.leagueId) {
    dbg(`match ${match._id}: no leagueId`);
    return null;
  }
  const league = match.leagueId;
  const provider = pickProvider(league);
  if (!provider) {
    dbg(`match ${match._id} (${match.team1} vs ${match.team2}): league "${league.name}" has no provider code`);
    return null;
  }

  // טווח של ±5 ימים סביב המשחק (הורחב מ-3)
  const matchTs = match.fullDate ? new Date(match.fullDate).getTime() : Date.now();
  const fromDate = formatDateForApi(new Date(matchTs - 5 * 86400000));
  const toDate = formatDateForApi(new Date(matchTs + 5 * 86400000));
  dbg(`match ${match._id} (${match.team1} vs ${match.team2}): provider=${provider.name}, window=${fromDate}..${toDate}`);

  try {
    const fixtures = await provider.api.fetchUpcomingFixtures({
      [provider.codeField]: league[provider.codeField],
      fromDate,
      toDate,
      refresh: false,
      includePast: true
    });
    dbg(`got ${fixtures.length} candidates from ${provider.name} (includePast=true)`);

    for (const f of fixtures) {
      const fxTeam1 = f.team1He || f.team1En;
      const fxTeam2 = f.team2He || f.team2En;
      const matched = matchesPair(match.team1, match.team2, fxTeam1, fxTeam2);
      dbg(`  candidate: "${fxTeam1}" vs "${fxTeam2}" (${f.kickoffIso}) → ${matched ? '✓ MATCH' : 'no'}`);
      if (matched) {
        return { externalId: f.apiId, externalProvider: provider.name };
      }
    }
    dbg(`no match found out of ${fixtures.length} candidates`);
  } catch (err) {
    dbg(`failed: ${err.message}`);
  }
  return null;
};

// 🆕 סנכרון תוצאות לשבוע - מושך תוצאות מהספקים, מעדכן רק משחקים בלי תוצאה ידנית
router.post('/sync-results/:weekId', requireAdmin, async (req, res) => {
  try {
    const weekId = req.params.weekId;
    const matches = await Match.find({ weekId }).populate('leagueId');
    if (matches.length === 0) {
      return res.json({ message: 'אין משחקים בשבוע הזה', checked: 0, updated: 0 });
    }

    const providersByName = {
      '365scores': scores365Api,
      'football-data.org': footballDataApi,
      'ESPN': espnApi,
      'TheSportsDB': sportsDbApi,
      'SofaScore': sofaScoreApi
    };

    const results = { checked: 0, skippedManual: 0, skippedFuture: 0, skippedNoExternal: 0, discovered: 0, notFinished: 0, alreadyUpToDate: 0, updated: 0, updatedMatchIds: [], errors: [], debug: [] };
    const now = Date.now();

    for (const m of matches) {
      results.checked++;
      const hasResult = m.result && m.result.team1Goals != null && m.result.team2Goals != null;
      // יש תוצאה והיא לא הוזנה אוטומטית - לא נדרוס
      if (hasResult && (!m.resultSource || !m.resultSource.startsWith('auto:'))) {
        results.skippedManual++;
        continue;
      }
      // משחק שעוד לא התחיל - דלג
      if (m.fullDate && new Date(m.fullDate).getTime() > now) {
        results.skippedFuture++;
        continue;
      }
      // אין מזהה חיצוני - ננסה לגלות אוטומטית
      if (!m.externalId || !m.externalProvider) {
        const matchDebug = [];
        const discovered = await discoverExternalId(m, providersByName, matchDebug);
        results.debug.push({ match: `${m.team1} vs ${m.team2}`, date: m.date, lines: matchDebug });
        if (discovered) {
          m.externalId = discovered.externalId;
          m.externalProvider = discovered.externalProvider;
          await m.save();
          results.discovered++;
          console.log(`🔎 [sync] discovered ${m.team1} vs ${m.team2} → ${discovered.externalProvider}/${discovered.externalId}`);
        } else {
          results.skippedNoExternal++;
          continue;
        }
      }
      const provider = providersByName[m.externalProvider];
      if (!provider || typeof provider.fetchResult !== 'function') {
        results.errors.push({ matchId: m._id, reason: `provider ${m.externalProvider} not supported for results` });
        continue;
      }

      try {
        // ESPN דורש hint נוסף
        const hint = m.externalProvider === 'ESPN' ? {
          espnLeagueCode: m.leagueId?.espnLeagueCode,
          dateYmd: m.fullDate ? new Date(m.fullDate).toISOString().slice(0, 10).replace(/-/g, '') : null
        } : null;

        const result = await provider.fetchResult(m.externalId, hint);
        if (!result) {
          results.notFinished++;
          continue;
        }
        const newResult = {
          team1Goals: result.team1Goals,
          team2Goals: result.team2Goals
        };
        if (result.finalScore) newResult.finalScore = result.finalScore;

        // התוצאה כבר זהה למה שבמסד - לא נוגעים ולא מדווחים כעדכון.
        // בלי הבדיקה הזו כל ריצת cron הייתה "מעדכנת" מחדש כל משחק שהסתיים,
        // ומי שקלע בול היה מקבל את אותה התראה שוב כל שעה עד שהשבוע ננעל.
        if (sameResult(m.result, newResult)) {
          results.alreadyUpToDate++;
          continue;
        }

        m.result = newResult;
        m.resultSource = `auto:${m.externalProvider}`;
        m.resultUpdatedAt = new Date();
        await m.save();
        results.updated++;
        results.updatedMatchIds.push(m._id.toString());
      } catch (err) {
        results.errors.push({ matchId: m._id, reason: err.message });
      }
    }

    res.json({ message: `נבדקו ${results.checked}, עודכנו ${results.updated}`, ...results });
  } catch (err) {
    console.error('❌ [sync-results] error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 🔬 בדיקה רב-טווחית - בודק האם ESPN בכלל מחזיק נתונים על הליגה
router.get('/probe/:leagueId', async (req, res) => {
  try {
    const league = await League.findById(req.params.leagueId);
    if (!league || !league.espnLeagueCode) {
      return res.status(400).json({ message: 'Need ESPN league' });
    }
    const code = league.espnLeagueCode;
    const probes = [
      { label: 'no dates (today)', url: `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard` },
      { label: 'last 30 days', url: `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${formatDateForApi(new Date(Date.now() - 30*86400000)).replace(/-/g,'')}-${formatDateForApi(new Date()).replace(/-/g,'')}` },
      { label: 'last 90 days', url: `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${formatDateForApi(new Date(Date.now() - 90*86400000)).replace(/-/g,'')}-${formatDateForApi(new Date()).replace(/-/g,'')}` },
      { label: 'next 90 days', url: `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=${formatDateForApi(new Date()).replace(/-/g,'')}-${formatDateForApi(new Date(Date.now() + 90*86400000)).replace(/-/g,'')}` },
      { label: 'August 2025 start of season', url: `https://site.api.espn.com/apis/site/v2/sports/soccer/${code}/scoreboard?dates=20250801-20250930` }
    ];
    const results = await Promise.all(probes.map(async (p) => {
      try {
        const r = await fetch(p.url, { headers: { 'User-Agent': 'football-betting-app/1.0' } });
        const j = await r.json().catch(() => null);
        return {
          label: p.label,
          url: p.url,
          status: r.status,
          eventsCount: j?.events?.length || 0,
          firstEventDate: j?.events?.[0]?.date || null,
          lastEventDate: j?.events?.[j?.events?.length - 1]?.date || null
        };
      } catch (e) {
        return { label: p.label, url: p.url, error: e.message };
      }
    }));
    res.json({ league: league.name, espnCode: code, probes: results });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔍 Debug - מחזיר את התגובה הגולמית מהספק כדי לאבחן בעיות
router.get('/debug/:leagueId', async (req, res) => {
  try {
    const league = await League.findById(req.params.leagueId);
    if (!league) return res.status(404).json({ message: 'הליגה לא נמצאה' });

    const provider = pickProvider(league);
    if (!provider) return res.json({ league: league.name, error: 'no external code' });

    const days = parseInt(req.query.days, 10) || 30;
    const today = new Date();
    const fromDate = formatDateForApi(today);
    const toDate = formatDateForApi(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    if (provider.name === 'ESPN') {
      const dates = `${fromDate.replace(/-/g, '')}-${toDate.replace(/-/g, '')}`;
      const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${league.espnLeagueCode}/scoreboard?dates=${dates}`;
      const raw = await fetch(url, { headers: { 'User-Agent': 'football-betting-app/1.0' } });
      const status = raw.status;
      const body = await raw.json().catch(() => null);
      return res.json({
        league: league.name,
        provider: provider.name,
        espnCode: league.espnLeagueCode,
        url,
        status,
        eventsCount: body?.events?.length || 0,
        leagueInfoFromEspn: body?.leagues?.[0]?.name || 'no league field',
        season: body?.season || null,
        sampleEvent: body?.events?.[0] || null
      });
    }

    if (provider.name === 'TheSportsDB') {
      const url = `https://www.thesportsdb.com/api/v1/json/3/eventsnextleague.php?id=${league.sportsDbLeagueId}`;
      const raw = await fetch(url);
      const status = raw.status;
      const body = await raw.json().catch(() => null);
      const all = body?.events || [];
      const future = all.filter(e => {
        const ts = e.strTimestamp ? new Date(e.strTimestamp + 'Z').getTime() : null;
        return ts && ts > Date.now();
      });
      return res.json({
        league: league.name,
        provider: provider.name,
        sportsDbLeagueId: league.sportsDbLeagueId,
        url,
        status,
        totalEvents: all.length,
        futureEvents: future.length,
        firstThreeFuture: future.slice(0, 3).map(e => ({
          when: e.strTimestamp,
          home: e.strHomeTeam,
          away: e.strAwayTeam
        }))
      });
    }

    if (provider.name === 'SofaScore') {
      const url = `https://api.sofascore.com/api/v1/unique-tournament/${league.sofaScoreTournamentId}/seasons`;
      const raw = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Referer': 'https://www.sofascore.com/'
        }
      });
      return res.json({
        league: league.name,
        provider: provider.name,
        sofaScoreTournamentId: league.sofaScoreTournamentId,
        url,
        status: raw.status,
        body: await raw.json().catch(() => null)
      });
    }

    if (provider.name === 'football-data.org') {
      const url = `https://api.football-data.org/v4/competitions/${league.footballDataCode}/matches?dateFrom=${fromDate}&dateTo=${toDate}`;
      const raw = await fetch(url, { headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_TOKEN || '' } });
      const status = raw.status;
      const body = await raw.json().catch(() => null);
      return res.json({
        league: league.name,
        provider: provider.name,
        footballDataCode: league.footballDataCode,
        url,
        status,
        matchesCount: body?.matches?.length || 0,
        sampleMatch: body?.matches?.[0] || null,
        rawError: body?.message || null
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, stack: err.stack });
  }
});

// 💰 רענון יחסי ווינר לשבוע קיים
// ווינר מפרסם יחסים רק למחזור הקרוב, לכן שבוע שיובא מראש יקבל יחסים רק
// כשמריצים את זה שוב קרוב למשחקים
router.post('/sync-odds/:weekId', requireAdmin, async (req, res) => {
  try {
    const matches = await Match.find({ weekId: req.params.weekId }).populate('leagueId');
    if (matches.length === 0) {
      return res.json({ message: 'אין משחקים בשבוע הזה', checked: 0, updated: 0 });
    }

    const summary = { checked: matches.length, updated: 0, unchanged: 0, noOdds: 0, noExternal: 0, details: [] };

    // גילוי externalId חסר - סדרתי, כדי לא להציף את הספק
    for (const m of matches) {
      if (!m.externalId || !m.externalProvider) {
        const discovered = await discoverExternalId(m, { '365scores': scores365Api });
        if (discovered) {
          m.externalId = discovered.externalId;
          m.externalProvider = discovered.externalProvider;
          await m.save();
        }
      }
    }

    const targets = matches.filter((m) => m.externalId && m.externalProvider === '365scores');
    summary.noExternal = matches.length - targets.length;

    // משיכה במקביליות מוגבלת כדי לא להיחסם
    const CONCURRENCY = 4;
    let cursor = 0;
    const workers = Array.from({ length: Math.min(CONCURRENCY, targets.length) }, async () => {
      while (cursor < targets.length) {
        const m = targets[cursor++];
        try {
          const odds = await scores365Api.fetchOddsForFixture(m.externalId, true);
          const label = `${m.team1} - ${m.team2}`;
          if (!odds || (!odds.homeWin && !odds.draw && !odds.awayWin)) {
            summary.noOdds++;
            summary.details.push({ match: label, status: 'אין יחסים בווינר עדיין' });
            continue;
          }
          const before = m.odds || {};
          const same = before.homeWin === odds.homeWin && before.draw === odds.draw && before.awayWin === odds.awayWin;
          if (same) {
            summary.unchanged++;
            summary.details.push({ match: label, status: 'ללא שינוי', odds });
            continue;
          }
          m.odds = odds;
          await m.save();
          summary.updated++;
          summary.details.push({ match: label, status: 'עודכן', odds });
        } catch (err) {
          summary.details.push({ match: `${m.team1} - ${m.team2}`, status: `שגיאה: ${err.message}` });
        }
      }
    });
    await Promise.all(workers);

    console.log(`💰 [sync-odds] week ${req.params.weekId}: updated ${summary.updated}/${summary.checked}`);
    res.json(summary);
  } catch (err) {
    console.error('❌ [external/sync-odds] error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 📊 תובנות טרום-משחק לקבלת החלטה (כושר, טבלה, ראש בראש, יחסי ווינר)
// מקור: 365scores בלבד - שאר הספקים לא מספקים את הנתונים האלה
router.get('/insights/:matchId', async (req, res) => {
  try {
    const { refresh = 'false' } = req.query;
    const forceRefresh = refresh === 'true' || refresh === '1';

    const match = await Match.findById(req.params.matchId).populate('leagueId');
    if (!match) return res.status(404).json({ message: 'המשחק לא נמצא' });

    // אין מזהה חיצוני - ננסה לגלות ולשמור (עלות חד-פעמית)
    if (!match.externalId || !match.externalProvider) {
      const discovered = await discoverExternalId(match, { '365scores': scores365Api });
      if (discovered) {
        match.externalId = discovered.externalId;
        match.externalProvider = discovered.externalProvider;
        await match.save();
      }
    }

    if (!match.externalId || match.externalProvider !== '365scores') {
      return res.status(404).json({
        message: 'אין נתונים סטטיסטיים למשחק הזה',
        reason: match.externalId ? `ספק ${match.externalProvider} לא תומך בסטטיסטיקות` : 'לא נמצאה התאמה ב-365scores'
      });
    }

    const insights = await scores365Api.fetchTeamInsights(match.externalId, { refresh: forceRefresh });
    if (!insights) return res.status(404).json({ message: 'לא הוחזרו נתונים מ-365scores' });

    // סדר הקבוצות אצלנו מול 365 - במשחקים שנוספו ידנית הוא עלול להיות הפוך
    const orientation = detectOrientation(
      match.team1, match.team2, insights.home?.name, insights.away?.name
    );
    if (!orientation.confident) {
      console.warn(
        `⚠️ [insights] לא ניתן לקבוע כיוון: "${match.team1}"/"${match.team2}" ` +
        `מול "${insights.home?.name}"/"${insights.away?.name}" - מוצג בסדר הטבעי`
      );
    }

    res.json({
      matchId: match._id,
      team1: match.team1,
      team2: match.team2,
      flipped: orientation.flipped,
      orientationConfident: orientation.confident,
      ...insights
    });
  } catch (err) {
    console.error('❌ [external/insights] error:', err);
    res.status(500).json({ message: err.message });
  }
});

// 🔴 טבלה חיה - הדירוג השבועי כפי שהיה נראה אילו הכל היה נגמר עכשיו.
//
// מה שמעניין כאן אינו הניקוד אלא התנועה: ההפרש בין הדירוג לפי מה שכבר
// סגור לבין הדירוג כולל המשחקים שמתנהלים ברגע זה. שער אחד במגרש מזיז
// שורות על המסך.
router.get('/live-table/:weekId', async (req, res) => {
  try {
    const weekId = req.params.weekId;
    const User = require('../models/User');
    const Bet = require('../models/Bet');
    const MonthExclusion = require('../models/MonthExclusion');
    const Week = require('../models/Week');
    const { buildLiveTable } = require('../services/liveTable');

    const week = await Week.findById(weekId).lean();
    if (!week) return res.status(404).json({ message: 'השבוע לא נמצא' });

    const [matches, players, bets, exclusions] = await Promise.all([
      Match.find({ weekId }, 'team1 team2 result odds externalId fullDate').lean(),
      User.find({ role: { $ne: 'admin' } }, 'name').lean(),
      Bet.find({ weekId }, 'userId matchId prediction').lean(),
      MonthExclusion.find({ month: week.month, season: week.season }, 'userId').lean()
    ]);

    // מוחרגים מהחודש אינם בתחרות השבוע הזה, בדיוק כמו בטבלה הרגילה
    const excluded = new Set(exclusions.map((e) => String(e.userId)));
    const inPlay = players.filter((p) => !excluded.has(String(p._id)));

    const live = await liveScores.getLiveForWeek(weekId, matches);
    const table = buildLiveTable(inPlay, matches, bets, live);

    res.json({
      weekId,
      weekName: week.name,
      ...table,
      at: new Date()
    });
  } catch (err) {
    console.error('❌ [external/live-table] error:', err.message);
    // הטבלה החיה היא תוספת ולא תלות: כישלון לא אמור לשבור את מסך הטבלה
    res.json({ rows: [], liveMatches: 0, pendingMatches: 0, error: true });
  }
});

// 🔴 מצב חי - תוצאות ודקת משחק לשבוע. פתוח לשחקנים, קריאה בלבד.
//
// התשובה נשמרת בזיכרון לזמן קצר, ולכן כמה שחקנים שמסתכלים במקביל
// מתורגמים לבקשה אחת ל-365, לא לבקשה לכל אחד.
router.get('/live/:weekId', async (req, res) => {
  try {
    const matches = await Match.find({ weekId: req.params.weekId }, 'externalId fullDate');
    if (matches.length === 0) return res.json({ games: [], live: false });

    const games = await liveScores.getLiveForWeek(req.params.weekId, matches);
    res.json({
      games,
      live: games.some((g) => g.status === 'live'),
      at: new Date()
    });
  } catch (err) {
    console.error('❌ [external/live] error:', err.message);
    // מצב חי הוא תוספת, לא תלות: כישלון לא אמור לשבור את מסך ההימורים
    res.json({ games: [], live: false, error: true });
  }
});

module.exports = router;
