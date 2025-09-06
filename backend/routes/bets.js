const express = require('express');
const Bet = require('../models/Bet');
const Match = require('../models/Match');
const Week = require('../models/Week');
const router = express.Router();

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
    
    // Check if week is locked
    const week = await Week.findById(weekId);
    if (week.locked) {
      return res.status(400).json({ message: 'Betting is locked for this week' });
    }
    
    const prediction = {
      team1Goals: parseInt(team1Goals),
      team2Goals: parseInt(team2Goals)
    };
    
    // Update existing bet or create new one
    const bet = await Bet.findOneAndUpdate(
      { userId, matchId },
      { prediction, weekId, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    
    res.json(bet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update bet (NEW)
router.patch('/:id', async (req, res) => {
  try {
    const { prediction } = req.body;
    
    const bet = await Bet.findByIdAndUpdate(
      req.params.id,
      { 
        prediction,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    res.json(bet);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;