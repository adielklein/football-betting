const express = require('express');
const Match = require('../models/Match');
const Week = require('../models/Week');
const router = express.Router();

// Get all matches for a week
router.get('/week/:weekId', async (req, res) => {
  try {
    const matches = await Match.find({ weekId: req.params.weekId });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new match
router.post('/', async (req, res) => {
  try {
    const { weekId, league, team1, team2, date, time } = req.body;
    
    const match = new Match({
      weekId,
      league,
      team1,
      team2,
      date,
      time
    });
    
    await match.save();
    res.status(201).json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update match result
router.patch('/:id/result', async (req, res) => {
  try {
    const { team1Goals, team2Goals } = req.body;
    
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { 
        result: { 
          team1Goals: parseInt(team1Goals), 
          team2Goals: parseInt(team2Goals) 
        }
      },
      { new: true }
    );
    
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete match
router.delete('/:id', async (req, res) => {
  try {
    await Match.findByIdAndDelete(req.params.id);
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;