const express = require('express');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const Week = require('../models/Week');
const User = require('../models/User'); // 🆕 נוסף לבדיקת תפקיד משתמש
const { logAdminAction } = require('../services/auditService');
const { requireUser } = require('../middleware/requireAdmin');
const { isMatchOpen, redactBets, lockModeOf } = require('../services/betLock');
const router = express.Router();

// הימורים של אחרים על משחק שעוד לא התחיל לא נחשפים (services/betLock.js).
// מי מבקש - מהטוקן (authenticate רץ על כל בקשה); מנהל רואה הכל
const redactForViewer = async (req, bets, weekId) => {
  const week = await Week.findById(weekId).lean();
  if (!week) return bets;
  const matches = await Match.find({ weekId }, 'fullDate weekId').lean();
  return redactBets(bets, {
    week,
    matchesById: new Map(matches.map((m) => [String(m._id), m])),
    viewerId: req.authUser ? String(req.authUser._id) : null,
    isAdmin: req.authUser?.role === 'admin'
  });
};

// למה אי אפשר להמר על המשחק עכשיו (null = אפשר). הסיבה באנגלית - האפליקציה
// מתרגמת לפי מילים (BettingInterface: FRIENDLY_ERRORS)
const closedReason = async (week, match) => {
  if (!week.active) return 'This week is not active';
  const weekMatches = await Match.find({ weekId: week._id }, 'fullDate').lean();
  if (isMatchOpen(week, match, weekMatches)) return null;
  if (lockModeOf(week) === 'match') return 'This match has already started - betting is locked';
  return 'Betting time has expired for this week';
};

// Get user bets for a week
router.get('/user/:userId/week/:weekId', async (req, res) => {
  try {
    const bets = await Bet.find({ 
      userId: req.params.userId, 
      weekId: req.params.weekId 
    }).populate('matchId');
    
    res.json(await redactForViewer(req, bets, req.params.weekId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all bets for a week (admin view)
router.get('/week/:weekId', async (req, res) => {
  try {
    const bets = await Bet.find({ weekId: req.params.weekId })
      .populate('userId', 'name email role')
      .populate('matchId');
    
    res.json(await redactForViewer(req, bets, req.params.weekId));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update bet
router.post('/', requireUser, async (req, res) => {
  try {
    const { userId, matchId, weekId, team1Goals, team2Goals } = req.body;

    // מי מבקש - מהטוקן בלבד. עד עכשיו זה נלקח מ-requestedByUserId שבבקשה,
    // כך שכל אחד יכול היה להמר בשם אחר, ועם מזהה של אדמין גם לעקוף נעילה
    const requesterUser = req.authUser;
    if (!requesterUser) return res.status(401).json({ message: 'נדרשת התחברות' });
    const isAdmin = requesterUser.role === 'admin';
    const requestedByUserId = String(requesterUser._id);
    if (!isAdmin && String(userId) !== requestedByUserId) {
      return res.status(403).json({ message: 'אפשר להמר רק בשם עצמך' });
    }
    
    console.log(`🔍 בדיקת הרשאות: מבקש ${requesterUser?.name}, תפקיד: ${requesterUser?.role}, אדמין: ${isAdmin}`);
    console.log(`🎯 הימור עבור שחקן: ${userId}, מבקש: ${requestedByUserId}`);
    
    // השבוע נלקח מהמשחק עצמו ולא ממה שהלקוח שלח - כדי שאי אפשר יהיה להמר
    // על משחק סגור בשם שבוע אחר שעוד פתוח
    const match = await Match.findById(matchId).lean();
    if (!match) return res.status(404).json({ message: 'Match not found' });
    const week = await Week.findById(match.weekId || weekId);
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }

    // אדמין מחורג מכל בדיקות הנעילה
    if (!isAdmin) {
      const reason = await closedReason(week, match);
      if (reason) {
        console.log(`🔒 Bet blocked - ${week.name} / ${match.team1}-${match.team2}: ${reason}`);
        return res.status(400).json({ message: reason });
      }
    } else {
      console.log(`👑 Admin override: ${requesterUser.name} can edit bets even if week is locked`);
    }
    
    const prediction = {
      team1Goals: parseInt(team1Goals),
      team2Goals: parseInt(team2Goals)
    };
    
    // אם הגענו עד כאן - הדימור מורשה
    console.log(`✅ Bet allowed for user ${userId} on week ${week.name}${isAdmin ? ` (REQUESTED BY ADMIN: ${requesterUser.name})` : ''}`);

    // Update existing bet or create new one
    const bet = await Bet.findOneAndUpdate(
      { userId, matchId },
      { prediction, weekId: week._id, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    // Audit log - כשאדמין משנה הימור של שחקן אחר
    if (isAdmin && requestedByUserId && requestedByUserId !== userId) {
      const player = await User.findById(userId);
      const match = await Match.findById(matchId);
      logAdminAction(requestedByUserId, 'עדכון הימור של שחקן', `${player?.name}: ${match?.team1} ${team1Goals} - ${team2Goals} ${match?.team2}`, { playerId: userId, matchId, weekId });
    }

    res.json(bet);
  } catch (error) {
    console.error('Error in bet creation:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update bet (עם חריגה לאדמין)
router.patch('/:id', requireUser, async (req, res) => {
  try {
    const { prediction } = req.body;
    
    // מצא את הדימור הקיים
    const existingBet = await Bet.findById(req.params.id)
      .populate('weekId')
      .populate('userId'); // לבדיקת תפקיד הבעל המקורי של ההימור
    
    if (!existingBet) {
      return res.status(404).json({ message: 'Bet not found' });
    }
    
    const week = existingBet.weekId;
    const betOwner = existingBet.userId;
    
    // מי מבקש - מהטוקן בלבד, כמו ביצירת הימור
    const requesterUser = req.authUser;
    if (!requesterUser) return res.status(401).json({ message: 'נדרשת התחברות' });
    const isAdmin = requesterUser.role === 'admin';
    if (!isAdmin && String(betOwner?._id) !== String(requesterUser._id)) {
      return res.status(403).json({ message: 'אפשר לשנות רק הימור של עצמך' });
    }
    const requestedByUserId = String(requesterUser._id);
    
    console.log(`🔍 עדכון הימור: בעלים ${betOwner?.name}, מבקש ${requesterUser?.name}, תפקיד מבקש: ${requesterUser?.role}, אדמין: ${isAdmin}`);
    
    // אדמין מחורג מכל בדיקות הנעילה
    if (!isAdmin) {
      const match = await Match.findById(existingBet.matchId).lean();
      const reason = match ? await closedReason(week, match) : 'Match not found';
      if (reason) {
        console.log(`🔒 Bet update blocked - ${week.name}: ${reason}`);
        return res.status(400).json({ message: reason });
      }
    } else {
      console.log(`👑 Admin override: ${requesterUser.name} can update bets even if week is locked`);
    }
    
    const bet = await Bet.findByIdAndUpdate(
      req.params.id,
      { 
        prediction,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    console.log(`✅ Bet update allowed for bet ${req.params.id}${isAdmin ? ` (REQUESTED BY ADMIN: ${requesterUser.name})` : ''}`);

    // Audit log - כשאדמין מעדכן הימור
    if (isAdmin && requestedByUserId !== String(betOwner._id)) {
      const match = await Match.findById(existingBet.matchId);
      logAdminAction(requestedByUserId, 'עדכון הימור של שחקן', `${betOwner?.name}: ${match?.team1} ${prediction.team1Goals} - ${prediction.team2Goals} ${match?.team2}`, { betId: req.params.id, playerId: betOwner._id });
    }

    res.json(bet);
  } catch (error) {
    console.error('Error in bet update:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;