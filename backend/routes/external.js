const express = require('express');
const League = require('../models/League');
const Match = require('../models/Match');
const footballDataApi = require('../services/footballDataApi');
const espnApi = require('../services/espnApi');
const sofaScoreApi = require('../services/sofaScoreApi');
const sportsDbApi = require('../services/sportsDbApi');

// בוחר ספק לפי השדה הזמין על הליגה
// עדיפות: football-data > TheSportsDB > SofaScore > ESPN
const pickProvider = (league) => {
  if (league.footballDataCode) return { name: 'football-data.org', api: footballDataApi, codeField: 'footballDataCode' };
  if (league.sportsDbLeagueId) return { name: 'TheSportsDB', api: sportsDbApi, codeField: 'sportsDbLeagueId' };
  if (league.sofaScoreTournamentId) return { name: 'SofaScore', api: sofaScoreApi, codeField: 'sofaScoreTournamentId' };
  if (league.espnLeagueCode) return { name: 'ESPN', api: espnApi, codeField: 'espnLeagueCode' };
  return null;
};

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

    const fetchParams = {
      [provider.codeField]: league[provider.codeField],
      fromDate,
      toDate,
      refresh: forceRefresh
    };
    const fixtures = await provider.api.fetchUpcomingFixtures(fetchParams);

    const upcoming = fixtures.filter((f) => new Date(f.kickoffIso).getTime() > Date.now());

    const enriched = await Promise.all(
      upcoming.map(async (f) => {
        const israelTs = israelDateAndTime(f.kickoffIso);
        const result = {
          apiId: f.apiId,
          team1En: f.team1En,
          team2En: f.team2En,
          team1LogoUrl: f.team1LogoUrl,
          team2LogoUrl: f.team2LogoUrl,
          kickoffIso: f.kickoffIso,
          date: israelTs.date,
          time: israelTs.time,
          year: israelTs.year
        };
        if (wantOdds) {
          result.odds = await provider.api.fetchOddsForFixture(f.apiId, forceRefresh);
        }
        return result;
      })
    );

    enriched.sort((a, b) => new Date(a.kickoffIso) - new Date(b.kickoffIso));

    res.json({
      league: { _id: league._id, name: league.name, key: league.key },
      provider: provider.name,
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

module.exports = router;
