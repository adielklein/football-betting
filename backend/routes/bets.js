const express = require('express');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const Week = require('../models/Week');
const User = require('../models/User'); // 🆕 נוסף לבדיקת תפקיד משתמש
const router = express.Router();
const isAdmin = user && user.role === 'admin';

// Get user bets for a week
router.get('/user/:userId/week/:weekId', async (req, res) => {
  try {
    const bets = await Bet.find({ 
      userId: req.params.userId, 
      weekId: req.params.weekId 
    }).populate('matchId');
    
    res.json(bets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all bets for a week (admin view)
router.get('/week/:weekId', async (req, res) => {
  try {
    const bets = await Bet.find({ weekId: req.params.weekId })
      .populate('userId', 'name email')
      .populate('matchId');
    
    res.json(bets);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update bet
router.post('/', async (req, res) => {
  try {
    const { userId, matchId, weekId, team1Goals, team2Goals } = req.body;
    
    // 🆕 בדוק אם המשתמש הוא אדמין
    const user = await User.findById(userId);
    const isAdmin = user && user.role === 'admin';
    
    console.log(`🔍 בדיקת הרשאות: משתמש ${user?.name}, תפקיד: ${user?.role}, אדמין: ${isAdmin}`);
    
    // בדיקה מלאה - עם חריגה לאדמין
    const week = await Week.findById(weekId);
    
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    // 🆕 אדמין מחורג מכל בדיקות הנעילה
    if (!isAdmin) {
      // בדיקה 1: האם השבוע סומן כנעול
      if (week.locked) {
        console.log(`🔒 Bet blocked - Week ${week.name} is locked (User is not admin)`);
        return res.status(400).json({ message: 'Betting is locked for this week' });
      }
      
      // בדיקה 2: האם עבר זמן הנעילה
      if (week.lockTime) {
        const lockTime = new Date(week.lockTime);
        const now = new Date();
        
        if (now >= lockTime) {
          console.log(`⏰ Bet blocked - Lock time passed for week ${week.name} (User is not admin)`);
          console.log(`Lock time: ${lockTime.toLocaleString('he-IL')}`);
          console.log(`Current time: ${now.toLocaleString('he-IL')}`);
          
          // אופציונלי: נעל את השבוע אוטומטית
          await Week.findByIdAndUpdate(weekId, { locked: true });
          
          return res.status(400).json({ 
            message: 'Betting time has expired for this week',
            lockTime: lockTime.toISOString(),
            currentTime: now.toISOString()
          });
        }
      }
      
      // בדיקה 3: האם השבוע בכלל פעיל
      if (!week.active) {
        console.log(`❌ Bet blocked - Week ${week.name} is not active (User is not admin)`);
        return res.status(400).json({ message: 'This week is not active' });
      }
    } else {
      // 🆕 הודעה לאדמין
      console.log(`👑 Admin override: ${user.name} can edit bets even if week is locked`);
    }
    
    const prediction = {
      team1Goals: parseInt(team1Goals),
      team2Goals: parseInt(team2Goals)
    };
    
    // אם הגענו עד כאן - הדימור מורשה
    console.log(`✅ Bet allowed for user ${userId} on week ${week.name}${isAdmin ? ' (ADMIN)' : ''}`);
    
    // Update existing bet or create new one
    const bet = await Bet.findOneAndUpdate(
      { userId, matchId },
      { prediction, weekId, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    
    res.json(bet);
  } catch (error) {
    console.error('Error in bet creation:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update bet (עם חריגה לאדמין)
router.patch('/:id', async (req, res) => {
  try {
    const { prediction } = req.body;
    
    // מצא את הדימור הקיים
    const existingBet = await Bet.findById(req.params.id)
      .populate('weekId')
      .populate('userId'); // 🆕 נוסף לבדיקת תפקיד
    
    if (!existingBet) {
      return res.status(404).json({ message: 'Bet not found' });
    }
    
    const week = existingBet.weekId;
    const user = existingBet.userId;
    const isAdmin = user && user.role === 'admin';
    
    console.log(`🔍 עדכון הימור: משתמש ${user?.name}, תפקיד: ${user?.role}, אדמין: ${isAdmin}`);
    
    // 🆕 אדמין מחורג מכל בדיקות הנעילה
    if (!isAdmin) {
      // בדיקות נעילה זהות
      if (week.locked) {
        console.log(`🔒 Bet update blocked - Week ${week.name} is locked (User is not admin)`);
        return res.status(400).json({ message: 'Betting is locked for this week' });
      }
      
      if (week.lockTime && new Date() >= new Date(week.lockTime)) {
        console.log(`⏰ Bet update blocked - Lock time passed for week ${week.name} (User is not admin)`);
        return res.status(400).json({ message: 'Betting time has expired for this week' });
      }
      
      if (!week.active) {
        console.log(`❌ Bet update blocked - Week ${week.name} is not active (User is not admin)`);
        return res.status(400).json({ message: 'This week is not active' });
      }
    } else {
      console.log(`👑 Admin override: ${user.name} can update bets even if week is locked`);
    }
    
    const bet = await Bet.findByIdAndUpdate(
      req.params.id,
      { 
        prediction,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log(`✅ Bet update allowed for bet ${req.params.id}${isAdmin ? ' (ADMIN)' : ''}`);
    res.json(bet);
  } catch (error) {
    console.error('Error in bet update:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;