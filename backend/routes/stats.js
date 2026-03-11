const express = require('express');
const router = express.Router();
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const Score = require('../models/Score');
const Week = require('../models/Week');
const { normalizeTeamName } = require('../utils/teamNormalizer');

// GET /api/stats/user/:userId - סטטיסטיקות של שחקן
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // שליפת כל ההימורים של המשתמש עם פרטי משחק
    const bets = await Bet.find({ userId }).populate('matchId').populate('weekId');
    const scores = await Score.find({ userId }).populate('weekId').sort({ 'weekId.createdAt': 1 });

    // סינון הימורים עם משחקים שיש להם תוצאות
    const completedBets = bets.filter(bet => {
      const match = bet.matchId;
      return match && match.result && match.result.team1Goals != null && match.result.team2Goals != null;
    });

    // === סטטיסטיקות בסיסיות ===
    let exactCount = 0;
    let directionCount = 0;
    let wrongCount = 0;
    let totalPoints = 0;

    // === סטטיסטיקות לפי קבוצה ===
    const teamStats = {}; // { teamName: { bets, exact, direction, wrong, points } }

    // === סטטיסטיקות לפי ליגה ===
    const leagueStats = {};

    // === התפלגות תוצאות ניחוש ===
    const predictionDistribution = { home: 0, draw: 0, away: 0 };
    const resultDistribution = { home: 0, draw: 0, away: 0 };

    // === ניחושים פופולריים ===
    const scorePredictions = {};

    for (const bet of completedBets) {
      const match = bet.matchId;
      const pred = bet.prediction;
      if (!pred || pred.team1Goals == null || pred.team2Goals == null) continue;

      const actualHome = match.result.team1Goals;
      const actualAway = match.result.team2Goals;
      const predHome = pred.team1Goals;
      const predAway = pred.team2Goals;

      // סוג תוצאה
      const isExact = (predHome === actualHome && predAway === actualAway);
      const actualDirection = actualHome > actualAway ? 'home' : actualHome < actualAway ? 'away' : 'draw';
      const predDirection = predHome > predAway ? 'home' : predHome < predAway ? 'away' : 'draw';
      const isDirection = !isExact && (actualDirection === predDirection);

      if (isExact) exactCount++;
      else if (isDirection) directionCount++;
      else wrongCount++;

      totalPoints += bet.points || 0;

      // התפלגות
      predictionDistribution[predDirection]++;
      resultDistribution[actualDirection]++;

      // ניחוש פופולרי
      const scoreKey = predHome + '-' + predAway;
      scorePredictions[scoreKey] = (scorePredictions[scoreKey] || 0) + 1;

      // סטטיסטיקה לפי קבוצה
      const team1 = normalizeTeamName(match.team1);
      const team2 = normalizeTeamName(match.team2);

      for (const team of [team1, team2]) {
        if (!teamStats[team]) {
          teamStats[team] = { bets: 0, exact: 0, direction: 0, wrong: 0, points: 0 };
        }
        teamStats[team].bets++;
        if (isExact) teamStats[team].exact++;
        else if (isDirection) teamStats[team].direction++;
        else teamStats[team].wrong++;
        teamStats[team].points += bet.points || 0;
      }

      // סטטיסטיקה לפי ליגה
      const leagueName = match.league || 'ללא ליגה';
      if (!leagueStats[leagueName]) {
        leagueStats[leagueName] = { bets: 0, exact: 0, direction: 0, wrong: 0, points: 0 };
      }
      leagueStats[leagueName].bets++;
      if (isExact) leagueStats[leagueName].exact++;
      else if (isDirection) leagueStats[leagueName].direction++;
      else leagueStats[leagueName].wrong++;
      leagueStats[leagueName].points += bet.points || 0;
    }

    // === סטטיסטיקות לפי שבוע (ציר זמן) ===
    const weeklyTimeline = scores
      .filter(s => s.weekId)
      .map(s => ({
        weekName: s.weekId.name || '',
        weeklyScore: s.weeklyScore || 0,
        totalScore: s.totalScore || 0,
      }));

    // === קבוצות מובילות (לפי אחוז דיוק) ===
    const teamStatsArray = Object.entries(teamStats)
      .map(([name, stats]) => ({
        name,
        ...stats,
        accuracy: stats.bets > 0 ? Math.round(((stats.exact + stats.direction) / stats.bets) * 100) : 0,
        exactRate: stats.bets > 0 ? Math.round((stats.exact / stats.bets) * 100) : 0,
        avgPoints: stats.bets > 0 ? Math.round((stats.points / stats.bets) * 10) / 10 : 0,
      }))
      .sort((a, b) => b.bets - a.bets);

    // קבוצות שהכי טוב/רע מנחשים (מינימום 3 הימורים)
    const teamsWithEnoughData = teamStatsArray.filter(t => t.bets >= 3);
    const bestTeams = [...teamsWithEnoughData].sort((a, b) => b.accuracy - a.accuracy || b.exactRate - a.exactRate).slice(0, 5);
    const worstTeams = [...teamsWithEnoughData].sort((a, b) => a.accuracy - b.accuracy || a.exactRate - b.exactRate).slice(0, 5);

    // ניחושים פופולריים - top 5
    const topPredictions = Object.entries(scorePredictions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([score, count]) => ({ score, count }));

    // === רצפים ===
    let currentStreak = 0;
    let bestStreak = 0;
    let streakType = null; // 'hit' or 'miss'
    let currentHitStreak = 0;
    let bestHitStreak = 0;

    const sortedBets = completedBets
      .filter(b => b.matchId && b.matchId.createdAt)
      .sort((a, b) => new Date(a.matchId.createdAt) - new Date(b.matchId.createdAt));

    for (const bet of sortedBets) {
      const match = bet.matchId;
      const pred = bet.prediction;
      if (!pred || pred.team1Goals == null) continue;

      const isExact = (pred.team1Goals === match.result.team1Goals && pred.team2Goals === match.result.team2Goals);
      const actualDir = match.result.team1Goals > match.result.team2Goals ? 'home' : match.result.team1Goals < match.result.team2Goals ? 'away' : 'draw';
      const predDir = pred.team1Goals > pred.team2Goals ? 'home' : pred.team1Goals < pred.team2Goals ? 'away' : 'draw';
      const isHit = isExact || (actualDir === predDir);

      if (isHit) {
        currentHitStreak++;
        if (currentHitStreak > bestHitStreak) bestHitStreak = currentHitStreak;
      } else {
        currentHitStreak = 0;
      }
    }

    res.json({
      overview: {
        totalBets: completedBets.length,
        exactCount,
        directionCount,
        wrongCount,
        totalPoints: Math.round(totalPoints * 10) / 10,
        accuracy: completedBets.length > 0 ? Math.round(((exactCount + directionCount) / completedBets.length) * 100) : 0,
        exactRate: completedBets.length > 0 ? Math.round((exactCount / completedBets.length) * 100) : 0,
      },
      weeklyTimeline,
      predictionDistribution,
      resultDistribution,
      topPredictions,
      bestTeams,
      worstTeams,
      teamStats: teamStatsArray.slice(0, 20),
      bestHitStreak,
      currentHitStreak,
    });

  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
