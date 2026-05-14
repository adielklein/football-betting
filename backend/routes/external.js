const express = require('express');
const League = require('../models/League');
const Match = require('../models/Match');
const footballApi = require('../services/footballApi');

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

// בדיקת תקינות מהירה - האם API-Football מוגדר
router.get('/health', (req, res) => {
  const configured = footballApi.isConfigured();
  res.json({
    apiFootballConfigured: configured,
    message: configured
      ? '✅ API_FOOTBALL_KEY מוגדר ומוכן לשימוש'
      : '❌ API_FOOTBALL_KEY חסר - הוסף אותו ב-Environment Variables ב-Render'
  });
});

router.get('/fixtures', async (req, res) => {
  try {
    if (!footballApi.isConfigured()) {
      return res.status(503).json({
        message: 'API-Football אינו מוגדר. הוסף API_FOOTBALL_KEY ל-.env'
      });
    }

    const { leagueId, days = '7', includeOdds = 'false', refresh = 'false' } = req.query;
    if (!leagueId) {
      return res.status(400).json({ message: 'leagueId נדרש' });
    }

    const league = await League.findById(leagueId);
    if (!league) return res.status(404).json({ message: 'הליגה לא נמצאה' });
    if (!league.apiFootballId) {
      return res.status(400).json({
        message: 'לליגה זו אין מזהה API-Football. הגדר אותו במסך ניהול ליגות'
      });
    }

    const daysAhead = Math.min(Math.max(parseInt(days, 10) || 7, 1), 30);
    const today = new Date();
    const fromDate = formatDateForApi(today);
    const toDate = formatDateForApi(new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000));
    const wantOdds = includeOdds === 'true' || includeOdds === '1';
    const forceRefresh = refresh === 'true' || refresh === '1';

    const fixtures = await footballApi.fetchUpcomingFixtures({
      apiFootballId: league.apiFootballId,
      fromDate,
      toDate,
      refresh: forceRefresh
    });

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
          result.odds = await footballApi.fetchOddsForFixture(f.apiId, forceRefresh);
        }
        return result;
      })
    );

    enriched.sort((a, b) => new Date(a.kickoffIso) - new Date(b.kickoffIso));

    res.json({
      league: { _id: league._id, name: league.name, key: league.key },
      fromDate,
      toDate,
      includeOdds: wantOdds,
      fixtures: enriched
    });
  } catch (err) {
    console.error('❌ [external/fixtures] error:', err);
    if (err.code === 'API_KEY_MISSING') {
      return res.status(503).json({ message: 'API-Football אינו מוגדר' });
    }
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
