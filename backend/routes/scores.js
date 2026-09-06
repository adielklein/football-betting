const express = require('express');
const Score = require('../models/Score');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');
const Week = require('../models/Week');
const MonthExclusion = require('../models/MonthExclusion');
const { sendNotificationToUsers } = require('../services/pushNotifications');
const { logAdminAction } = require('../services/auditService');
const { requireAdmin } = require('../middleware/requireAdmin');
const router = express.Router();

// Calculate scores for a week
router.post('/calculate/:weekId', requireAdmin, async (req, res) => {
  try {
    const weekId = req.params.weekId;
    const { matchId, matchIds, adminId } = req.body || {};

    // המשחקים שהתוצאה שלהם נכנסה בבקשה הזו - רק עליהם נשלחת התראת "בול".
    // בלי זה, כל חישוב ניקוד מחדש היה מפוצץ את כולם בהתראות על משחקים ישנים.
    const notifyMatchIds = new Set(
      [...(Array.isArray(matchIds) ? matchIds : []), ...(matchId ? [matchId] : [])].map(String)
    );

    const week = await Week.findById(weekId);

    // הכל נשלף בשלוש שאילתות ומחושב בזיכרון. הגרסה הקודמת שלפה הימור אחד
    // בכל פעם בתוך לולאה כפולה (משתמשים x משחקים) והגיעה ל-~240 סיבובים
    // למסד, כ-30 שניות לשבוע אחד - מספיק קרוב ל-timeout כדי להיכשל.
    const [allWeekMatches, users] = await Promise.all([
      Match.find({ weekId }),
      User.find()
    ]);

    const hasResult = (m) => m.result && m.result.team1Goals != null && m.result.team2Goals != null;
    const playedMatches = allWeekMatches.filter(hasResult);
    const matchById = new Map(allWeekMatches.map((m) => [m._id.toString(), m]));

    const bets = await Bet.find({ matchId: { $in: allWeekMatches.map((m) => m._id) } });

    const betOps = [];
    const weeklyByUser = new Map();
    const exactByUser = new Map();
    const userById = new Map(users.map((u) => [u._id.toString(), u]));

    for (const bet of bets) {
      const match = matchById.get(bet.matchId.toString());
      if (!match) continue;

      // משחק בלי תוצאה מאפס את הנקודות, כמו קודם
      const points = hasResult(match)
        ? calculateMatchPoints(bet.prediction, match.result, match.odds)
        : 0;

      if (bet.points !== points) {
        betOps.push({ updateOne: { filter: { _id: bet._id }, update: { $set: { points } } } });
      }

      const userId = bet.userId.toString();
      weeklyByUser.set(userId, (weeklyByUser.get(userId) || 0) + points);

      const isExact =
        hasResult(match) &&
        notifyMatchIds.has(match._id.toString()) &&
        bet.prediction.team1Goals === match.result.team1Goals &&
        bet.prediction.team2Goals === match.result.team2Goals;

      if (isExact) {
        const user = userById.get(userId);
        if (user && user.role !== 'admin') {
          if (!exactByUser.has(userId)) {
            exactByUser.set(userId, { userId: user._id, name: user.name, exactCount: 0, exactMatches: [] });
          }
          const entry = exactByUser.get(userId);
          entry.exactCount++;
          entry.exactMatches.push({
            team1: match.team1,
            team2: match.team2,
            // סדר טבעי team1-team2, כמו בכל מסכי האפליקציה
            score: `${match.result.team1Goals}-${match.result.team2Goals}`
          });
        }
      }
    }

    if (betOps.length > 0) await Bet.bulkWrite(betOps);

    // ניקוד שבועי. כשאין בכלל תוצאות לא יוצרים רשומות חדשות - רק מאפסים קיימות
    const now = new Date();
    const scoreOps = users.map((u) => ({
      updateOne: {
        filter: { userId: u._id, weekId },
        update: { $set: { weeklyScore: weeklyByUser.get(u._id.toString()) || 0, updatedAt: now } },
        upsert: playedMatches.length > 0
      }
    }));
    if (scoreOps.length > 0) await Score.bulkWrite(scoreOps);

    // סכום מצטבר לכל משתמש - אגרגציה אחת במקום שאילתה לכל משתמש
    const totals = await Score.aggregate([
      { $group: { _id: '$userId', total: { $sum: '$weeklyScore' } } }
    ]);
    if (totals.length > 0) {
      await Score.bulkWrite(
        totals.map((t) => ({
          updateMany: { filter: { userId: t._id }, update: { $set: { totalScore: t.total } } }
        }))
      );
    }

    if (playedMatches.length === 0) {
      await Week.findByIdAndUpdate(weekId, { scoresCalculatedAt: now });
      return res.json({ message: 'Scores reset successfully (no results found)' });
    }

    // התראות "בול" למי שניחש במדויק את המשחקים שנכנסו עכשיו
    const exactScoreUsers = [...exactByUser.values()];
    if (exactScoreUsers.length > 0) {
      try {
        const excludedIds = week
          ? (await MonthExclusion.find({ month: week.month, season: week.season })).map((e) => e.userId.toString())
          : [];

        const usersToNotify = exactScoreUsers.filter((eu) => {
          if (excludedIds.includes(eu.userId.toString())) return false;
          const u = userById.get(eu.userId.toString());
          return u && u.pushSettings?.enabled && u.pushSettings?.exactScoreAlerts !== false;
        });

        for (const eu of usersToNotify) {
          const title = '🎯 דייקת!';
          const matchLines = eu.exactMatches.map((m) => `⚽ ${m.team1} ${m.score} ${m.team2}`).join('\n');
          const body = `ניחשת בול!\n${matchLines}\nכל הכבוד 🔥`;
          await sendNotificationToUsers([eu.userId], title, body, { type: 'exact_score' });
        }
        if (usersToNotify.length > 0) {
          console.log(`🎯 Exact score notifications sent to ${usersToNotify.length} users`);
        }
      } catch (pushError) {
        console.error('Push notification error (non-critical):', pushError.message);
      }
    }

    // Audit log
    if (adminId) {
      const weekName = week ? week.name : weekId;
      logAdminAction(adminId, 'חישוב ניקוד', `שבוע: ${weekName} (${playedMatches.length} משחקים)`, { weekId, matchId });
    }

    // מסמנים שהניקוד חושב על התוצאות הנוכחיות, כדי שה-cron יזהה שבוע
    // שנכנסו לו תוצאות אך הניקוד לא רץ עליהן
    await Week.findByIdAndUpdate(weekId, { scoresCalculatedAt: now });

    res.json({ message: 'Scores calculated successfully' });
  } catch (error) {
    console.error('❌ [scores/calculate] error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Get leaderboard - תיקון: ללא אדמינים
router.get('/leaderboard', async (req, res) => {
  try {
    const scores = await Score.aggregate([
      {
        $group: {
          _id: '$userId',
          totalScore: { $sum: '$weeklyScore' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      },
      {
        // תיקון: סנן רק שחקנים (לא אדמינים)
        $match: {
          'user.role': { $ne: 'admin' }
        }
      },
      {
        $sort: { totalScore: -1 }
      }
    ]);
    
    res.json(scores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get detailed scores - חדש!
router.get('/detailed', async (req, res) => {
  try {
    const scores = await Score.find()
      .populate('userId', 'name email role')
      .populate('weekId', 'name month')
      .sort({ 'weekId.month': 1, 'weekId.createdAt': 1 });
    
    // סנן רק שחקנים (לא אדמינים)
    const playerScores = scores.filter(score => 
      score.userId && score.userId.role !== 'admin'
    );
    
    res.json(playerScores);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🆕 Helper function to calculate points - עם תמיכה ביחסים
function calculateMatchPoints(prediction, result, odds) {
  const predTeam1 = prediction.team1Goals;
  const predTeam2 = prediction.team2Goals;
  const resultTeam1 = result.team1Goals;
  const resultTeam2 = result.team2Goals;
  
  // חשב את הכיוון (outcome) של הניחוש והתוצאה
  const predOutcome = predTeam1 > predTeam2 ? 'home' : predTeam1 < predTeam2 ? 'away' : 'draw';
  const resultOutcome = resultTeam1 > resultTeam2 ? 'home' : resultTeam1 < resultTeam2 ? 'away' : 'draw';
  
  // בדוק אם יש יחסים מוגדרים למשחק
  const hasOdds = odds && (odds.homeWin || odds.draw || odds.awayWin);
  
  if (hasOdds) {
    // === מצב יחסים ===
    
    // מצא את היחס הרלוונטי לתוצאה האמיתית
    let relevantOdd = 1;
    if (resultOutcome === 'home' && odds.homeWin) relevantOdd = odds.homeWin;
    else if (resultOutcome === 'draw' && odds.draw) relevantOdd = odds.draw;
    else if (resultOutcome === 'away' && odds.awayWin) relevantOdd = odds.awayWin;
    
    // צלף בדיוק = כפול היחס חלקי 3
    if (predTeam1 === resultTeam1 && predTeam2 === resultTeam2) {
      return Math.round(relevantOdd * 2 / 3 * 10) / 10; // עיגול לעשירית
    }
    
    // צדק בכיוון = היחס חלקי 3
    if (predOutcome === resultOutcome) {
      return Math.round(relevantOdd / 3 * 10) / 10; // עיגול לעשירית
    }
    
    // טעה = 0
    return 0;
    
  } else {
    // === מצב קלאסי (ללא יחסים) ===
    
    // תוצאה מדויקת = 3 נקודות
    if (predTeam1 === resultTeam1 && predTeam2 === resultTeam2) {
      return 3;
    }
    
    // כיוון נכון = 1 נקודה
    if (predOutcome === resultOutcome) {
      return 1;
    }
    
    // טעות = 0
    return 0;
  }
}

module.exports = router;