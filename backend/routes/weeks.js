const express = require('express');
const Week = require('../models/Week');
const Match = require('../models/Match');
const router = express.Router();

// Get all weeks
router.get('/', async (req, res) => {
  try {
    const weeks = await Week.find().sort({ createdAt: 1 });
    res.json(weeks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get week by ID with matches
router.get('/:id', async (req, res) => {
  try {
    const week = await Week.findById(req.params.id);
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    const matches = await Match.find({ weekId: req.params.id });
    
    res.json({ week, matches });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new week
router.post('/', async (req, res) => {
  try {
    const { name, month, season } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Week name is required' });
    }
    
    if (!month) {
      return res.status(400).json({ message: 'Month is required' });
    }
    
    const week = new Week({ 
      name, 
      month: parseInt(month),
      season: season || '2025-26'
    });
    await week.save();
    
    console.log('Created new week:', week);
    res.status(201).json(week);
  } catch (error) {
    console.error('Error creating week:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update week - תיקון מחדש
router.patch('/:id', async (req, res) => {
  try {
    const weekId = req.params.id;
    const { name, month, season } = req.body;
    
    console.log(`Updating week ${weekId} with:`, { name, month, season });
    
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Week name is required and cannot be empty' });
    }
    
    const updateData = { name: name.trim() };
    if (month !== undefined) updateData.month = parseInt(month);
    if (season) updateData.season = season.trim();
    
    const week = await Week.findByIdAndUpdate(
      weekId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!week) {
      console.log('Week not found:', weekId);
      return res.status(404).json({ message: 'Week not found' });
    }
    
    console.log('Successfully updated week:', week);
    res.json(week);
  } catch (error) {
    console.error('Error updating week:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid week ID format' });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// Activate week
router.patch('/:id/activate', async (req, res) => {
  try {
    const { lockTime } = req.body;
    console.log(`Activating week ${req.params.id} with lockTime: ${lockTime}`);
    
    const week = await Week.findByIdAndUpdate(
      req.params.id,
      { active: true, lockTime: new Date(lockTime) },
      { new: true }
    );
    
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    console.log('Week activated successfully:', week);
    res.json(week);
  } catch (error) {
    console.error('Error activating week:', error);
    res.status(500).json({ message: error.message });
  }
});

// Deactivate week (החזרה מפעיל ללא פעיל) - חדש!
router.patch('/:id/deactivate', async (req, res) => {
  try {
    const weekId = req.params.id;
    console.log(`כיבוי שבוע ${weekId}`);
    
    // בדוק שהשבוע קיים ופעיל
    const currentWeek = await Week.findById(weekId);
    if (!currentWeek) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    if (!currentWeek.active) {
      return res.status(400).json({ message: 'השבוע כבר לא פעיל' });
    }
    
    if (currentWeek.locked) {
      return res.status(400).json({ message: 'לא ניתן לכבות שבוע שכבר נעול' });
    }
    
    // כבה את השבוע - הסר פעילות וזמן נעילה
    const week = await Week.findByIdAndUpdate(
      weekId,
      { 
        active: false,
        locked: false,
        lockTime: null  // נקה את זמן הנעילה
      },
      { new: true }
    );
    
    console.log('השבוע כובה בהצלחה:', week);
    res.json(week);
  } catch (error) {
    console.error('שגיאה בכיבוי שבוע:', error);
    res.status(500).json({ message: error.message });
  }
});

// Lock week
router.patch('/:id/lock', async (req, res) => {
  try {
    console.log(`Locking week ${req.params.id}`);
    
    const week = await Week.findByIdAndUpdate(
      req.params.id,
      { locked: true },
      { new: true }
    );
    
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    console.log('Week locked successfully:', week);
    res.json(week);
  } catch (error) {
    console.error('Error locking week:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete week
router.delete('/:id', async (req, res) => {
  try {
    const weekId = req.params.id;
    console.log('Deleting week:', weekId);
    
    // בדיקה שהשבוע קיים
    const week = await Week.findById(weekId);
    if (!week) {
      return res.status(404).json({ message: 'Week not found' });
    }
    
    // Delete all matches of the week
    const deletedMatches = await Match.deleteMany({ weekId });
    console.log(`Deleted ${deletedMatches.deletedCount} matches`);
    
    // Delete all bets of the week
    const deletedBets = await require('../models/Bet').deleteMany({ weekId });
    console.log(`Deleted ${deletedBets.deletedCount} bets`);
    
    // Delete all scores of the week
    const deletedScores = await require('../models/Score').deleteMany({ weekId });
    console.log(`Deleted ${deletedScores.deletedCount} scores`);
    
    // Delete the week itself
    await Week.findByIdAndDelete(weekId);
    console.log('Week deleted successfully');
    
    res.json({ 
      message: 'Week deleted successfully',
      deletedCount: {
        matches: deletedMatches.deletedCount,
        bets: deletedBets.deletedCount,
        scores: deletedScores.deletedCount
      }
    });
  } catch (error) {
    console.error('Error deleting week:', error);
    
    if (error.name === 'CastError') {
      return res.status(400).json({ message: 'Invalid week ID format' });
    }
    
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;