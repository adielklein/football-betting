const express = require('express');
const Score = require('../models/Score');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const User = require('../models/User');
const router = express.Router();

// Calculate scores for a week
router.post('/calculate/:weekId', async (req, res) => {
  try {
    const weekId = req.params.weekId;
    
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
    
    for (const user of users) {
      let totalPoints = 0;
      
      for (const match of matches) {
        const bet = await Bet.findOne({ userId: user._id, matchId: match._id });
        
        if (bet) {
          const points = calculateMatchPoints(bet.prediction, match.result, match.odds);
          
          // Update bet points
          await Bet.findByIdAndUpdate(bet._id, { points });
          totalPoints += points;
        }
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
    
    // צלף בדיוק = כפול היחס
    if (predTeam1 === resultTeam1 && predTeam2 === resultTeam2) {
      return Math.round(relevantOdd * 2 * 10) / 10; // עיגול לעשירית
    }
    
    // צדק בכיוון = היחס
    if (predOutcome === resultOutcome) {
      return Math.round(relevantOdd * 10) / 10; // עיגול לעשירית
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