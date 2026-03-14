const express = require('express');
const Score = require('../models/Score');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');
const { sendNotificationToUsers } = require('../services/pushNotifications');
const router = express.Router();

// Calculate scores for a week
router.post('/calculate/:weekId', async (req, res) => {
  try {
    const weekId = req.params.weekId;
    const { matchId } = req.body || {}; // Optional: specific match that was just updated

    // Get all matches with results for this week
    const matches = await Match.find({
      weekId,
      'result.team1Goals': { $exists: true },
      'result.team2Goals': { $exists: true }
    });

    if (matches.length === 0) {
      return res.status(400).json({ message: 'No completed matches found' });
    }

    // Get all users
    const users = await User.find();
    const exactScoreUsers = []; // Users who got exact scores on the specific match

    for (const user of users) {
      let totalPoints = 0;
      let exactCount = 0;
      const exactMatches = [];

      for (const match of matches) {
        const bet = await Bet.findOne({ userId: user._id, matchId: match._id });

        if (bet) {
          const points = calculateMatchPoints(bet.prediction, match.result, match.odds);
          await Bet.findByIdAndUpdate(bet._id, { points });
          totalPoints += points;

          // Track exact scores only for the specific match that was just updated
          if (matchId && match._id.toString() === matchId &&
              bet.prediction.team1Goals === match.result.team1Goals &&
              bet.prediction.team2Goals === match.result.team2Goals) {
            exactCount++;
            exactMatches.push({
              team1: match.team1,
              team2: match.team2,
              score: `${match.result.team1Goals}-${match.result.team2Goals}`
            });
          }
        }
      }

      // Track users with exact scores for push notification
      if (exactCount > 0 && user.role !== 'admin') {
        exactScoreUsers.push({ userId: user._id, name: user.name, exactCount, exactMatches });
      }

      // Update user's score for this week
      await Score.findOneAndUpdate(
        { userId: user._id, weekId },
        {
          weeklyScore: totalPoints,
          updatedAt: new Date()
        },
        { upsert: true }
      );

      // Calculate total score across all weeks
      const userScores = await Score.find({ userId: user._id });
      const totalScore = userScores.reduce((sum, score) => sum + score.weeklyScore, 0);

      // Update all scores with new total
      await Score.updateMany(
        { userId: user._id },
        { totalScore }
      );
    }

    // Send push notifications to users who got exact scores on this specific match
    if (exactScoreUsers.length > 0) {
      try {
        const usersToNotify = [];
        for (const eu of exactScoreUsers) {
          const u = await User.findById(eu.userId);
          if (u && u.pushSettings?.enabled && u.pushSettings?.exactScoreAlerts !== false) {
            usersToNotify.push(eu);
          }
        }

        if (usersToNotify.length > 0) {
          for (const eu of usersToNotify) {
            const title = '🎯 דייקת!';
            const matchLines = eu.exactMatches.map(m => `⚽ ${m.team1} ${m.score} ${m.team2}`).join('\n');
            const body = `ניחשת בול!\n${matchLines}\nכל הכבוד 🔥`;
            await sendNotificationToUsers([eu.userId], title, body, { type: 'exact_score' });
          }
          console.log(`🎯 Exact score notifications sent to ${usersToNotify.length} users`);
        }
      } catch (pushError) {
        console.error('Push notification error (non-critical):', pushError.message);
      }
    }

    res.json({ message: 'Scores calculated successfully' });
  } catch (error) {
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