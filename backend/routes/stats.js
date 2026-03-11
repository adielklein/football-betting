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

// GET /api/stats/admin - סטטיסטיקות מקיפות לאדמין
router.get('/admin', async (req, res) => {
  try {
    const User = require('../models/User');
    const League = require('../models/League');

    const [allUsers, allWeeks, allMatches, allBets, allScores] = await Promise.all([
      User.find({}).lean(),
      Week.find({}).sort({ createdAt: 1 }).lean(),
      Match.find({}).lean(),
      Bet.find({}).populate('matchId').populate('weekId').lean(),
      Score.find({}).populate('weekId').populate('userId').lean(),
    ]);

    const players = allUsers.filter(u => u.role !== 'admin');
    const matchesWithResults = allMatches.filter(m => m.result && m.result.team1Goals != null);

    // === סטטיסטיקות כלליות ===
    const systemOverview = {
      totalPlayers: players.length,
      totalWeeks: allWeeks.length,
      activeWeeks: allWeeks.filter(w => w.active).length,
      totalMatches: allMatches.length,
      matchesWithResults: matchesWithResults.length,
      totalBets: allBets.length,
      avgBetsPerMatch: allMatches.length > 0 ? Math.round(allBets.length / allMatches.length * 10) / 10 : 0,
      avgBetsPerPlayer: players.length > 0 ? Math.round(allBets.length / players.length * 10) / 10 : 0,
    };

    // === Helper: classify bet ===
    function classifyBet(bet) {
      const match = bet.matchId;
      const pred = bet.prediction;
      if (!match || !pred || !match.result || match.result.team1Goals == null) return null;

      const isExact = pred.team1Goals === match.result.team1Goals && pred.team2Goals === match.result.team2Goals;
      const actualDir = match.result.team1Goals > match.result.team2Goals ? 'home' : match.result.team1Goals < match.result.team2Goals ? 'away' : 'draw';
      const predDir = pred.team1Goals > pred.team2Goals ? 'home' : pred.team1Goals < pred.team2Goals ? 'away' : 'draw';
      const isDirection = !isExact && actualDir === predDir;

      return { isExact, isDirection, isWrong: !isExact && !isDirection, points: bet.points || 0 };
    }

    // === סטטיסטיקות לפי שחקן (דירוג מקיף) ===
    const playerStatsMap = {};
    for (const player of players) {
      playerStatsMap[player._id.toString()] = {
        id: player._id,
        name: player.name,
        username: player.username,
        totalBets: 0,
        completedBets: 0,
        exact: 0,
        direction: 0,
        wrong: 0,
        points: 0,
        weeklyScores: [],
      };
    }

    // Process bets
    const completedBets = [];
    for (const bet of allBets) {
      const uid = (bet.userId || '').toString();
      if (!playerStatsMap[uid]) continue;
      playerStatsMap[uid].totalBets++;

      const result = classifyBet(bet);
      if (!result) continue;

      playerStatsMap[uid].completedBets++;
      if (result.isExact) playerStatsMap[uid].exact++;
      else if (result.isDirection) playerStatsMap[uid].direction++;
      else playerStatsMap[uid].wrong++;
      playerStatsMap[uid].points += result.points;

      completedBets.push(bet);
    }

    // Process scores for weekly data
    for (const score of allScores) {
      if (!score.userId || !score.weekId) continue;
      const uid = (score.userId._id || score.userId).toString();
      if (playerStatsMap[uid]) {
        playerStatsMap[uid].weeklyScores.push({
          weekName: score.weekId.name || '',
          weeklyScore: score.weeklyScore || 0,
        });
      }
    }

    // Build player rankings
    const playerRankings = Object.values(playerStatsMap)
      .map(p => ({
        ...p,
        accuracy: p.completedBets > 0 ? Math.round(((p.exact + p.direction) / p.completedBets) * 100) : 0,
        exactRate: p.completedBets > 0 ? Math.round((p.exact / p.completedBets) * 100) : 0,
        avgPoints: p.completedBets > 0 ? Math.round((p.points / p.completedBets) * 10) / 10 : 0,
        points: Math.round(p.points * 10) / 10,
        participation: allWeeks.length > 0 ? Math.round((p.weeklyScores.length / allWeeks.length) * 100) : 0,
      }))
      .sort((a, b) => b.points - a.points);

    // === דירוגים שונים ===
    const topByPoints = [...playerRankings].slice(0, 10);
    const topByAccuracy = [...playerRankings].filter(p => p.completedBets >= 10).sort((a, b) => b.accuracy - a.accuracy).slice(0, 10);
    const topByExact = [...playerRankings].filter(p => p.completedBets >= 10).sort((a, b) => b.exactRate - a.exactRate).slice(0, 10);
    const topByParticipation = [...playerRankings].sort((a, b) => b.participation - a.participation).slice(0, 10);

    // === סטטיסטיקות לפי שבוע ===
    const weeklyStats = [];
    for (const week of allWeeks) {
      const weekBets = allBets.filter(b => {
        const wid = b.weekId && (b.weekId._id || b.weekId);
        return wid && wid.toString() === week._id.toString();
      });

      const weekScores = allScores.filter(s => {
        const wid = s.weekId && (s.weekId._id || s.weekId);
        return wid && wid.toString() === week._id.toString();
      });

      let weekExact = 0, weekDir = 0, weekWrong = 0;
      for (const bet of weekBets) {
        const r = classifyBet(bet);
        if (!r) continue;
        if (r.isExact) weekExact++;
        else if (r.isDirection) weekDir++;
        else weekWrong++;
      }

      const totalClassified = weekExact + weekDir + weekWrong;
      const activePlayers = new Set(weekBets.map(b => (b.userId || '').toString())).size;

      // Best player this week
      let bestPlayer = null;
      let bestScore = -1;
      for (const s of weekScores) {
        if (s.userId && s.userId.role !== 'admin' && (s.weeklyScore || 0) > bestScore) {
          bestScore = s.weeklyScore;
          bestPlayer = s.userId.name;
        }
      }

      weeklyStats.push({
        weekName: week.name,
        activePlayers,
        totalBets: weekBets.length,
        exact: weekExact,
        direction: weekDir,
        wrong: weekWrong,
        accuracy: totalClassified > 0 ? Math.round(((weekExact + weekDir) / totalClassified) * 100) : 0,
        bestPlayer,
        bestScore,
      });
    }

    // === סטטיסטיקות לפי קבוצה (כלל השחקנים) ===
    const globalTeamStats = {};
    for (const bet of completedBets) {
      const match = bet.matchId;
      if (!match) continue;
      const r = classifyBet(bet);
      if (!r) continue;

      const team1 = normalizeTeamName(match.team1);
      const team2 = normalizeTeamName(match.team2);

      for (const team of [team1, team2]) {
        if (!globalTeamStats[team]) {
          globalTeamStats[team] = { bets: 0, exact: 0, direction: 0, wrong: 0 };
        }
        globalTeamStats[team].bets++;
        if (r.isExact) globalTeamStats[team].exact++;
        else if (r.isDirection) globalTeamStats[team].direction++;
        else globalTeamStats[team].wrong++;
      }
    }

    const globalTeamRankings = Object.entries(globalTeamStats)
      .map(([name, s]) => ({
        name,
        ...s,
        accuracy: s.bets > 0 ? Math.round(((s.exact + s.direction) / s.bets) * 100) : 0,
        exactRate: s.bets > 0 ? Math.round((s.exact / s.bets) * 100) : 0,
      }))
      .sort((a, b) => b.bets - a.bets);

    const teamsEnough = globalTeamRankings.filter(t => t.bets >= 20);
    const easiestTeams = [...teamsEnough].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);
    const hardestTeams = [...teamsEnough].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);

    // === תוצאות מפתיעות - משחקים שאף אחד לא ניחש נכון ===
    const matchBetMap = {};
    for (const bet of completedBets) {
      const mid = bet.matchId && bet.matchId._id && bet.matchId._id.toString();
      if (!mid) continue;
      if (!matchBetMap[mid]) matchBetMap[mid] = { match: bet.matchId, bets: [], exactCount: 0 };
      const r = classifyBet(bet);
      if (r) {
        matchBetMap[mid].bets.push(bet);
        if (r.isExact) matchBetMap[mid].exactCount++;
      }
    }

    const surprisingMatches = Object.values(matchBetMap)
      .filter(m => m.bets.length >= 5 && m.exactCount === 0)
      .sort((a, b) => b.bets.length - a.bets.length)
      .slice(0, 5)
      .map(m => ({
        team1: m.match.team1,
        team2: m.match.team2,
        result: m.match.result.team1Goals + '-' + m.match.result.team2Goals,
        totalBets: m.bets.length,
      }));

    // === ניחוש פופולרי כללי ===
    const globalPredictions = {};
    for (const bet of completedBets) {
      const pred = bet.prediction;
      if (!pred || pred.team1Goals == null) continue;
      const key = pred.team1Goals + '-' + pred.team2Goals;
      globalPredictions[key] = (globalPredictions[key] || 0) + 1;
    }
    const topGlobalPredictions = Object.entries(globalPredictions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([score, count]) => ({ score, count }));

    // === תוצאות בפועל הכי נפוצות ===
    const resultCounts = {};
    for (const match of matchesWithResults) {
      const key = match.result.team1Goals + '-' + match.result.team2Goals;
      resultCounts[key] = (resultCounts[key] || 0) + 1;
    }
    const topResults = Object.entries(resultCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([score, count]) => ({ score, count }));

    res.json({
      systemOverview,
      playerRankings,
      topByPoints,
      topByAccuracy,
      topByExact,
      topByParticipation,
      weeklyStats,
      globalTeamRankings: globalTeamRankings.slice(0, 25),
      easiestTeams,
      hardestTeams,
      surprisingMatches,
      topGlobalPredictions,
      topResults,
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
