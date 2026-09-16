const express = require('express');
const MonthExclusion = require('../models/MonthExclusion');
const { requireAdmin } = require('../middleware/requireAdmin');
const router = express.Router();

// Get excluded users for a month+season, or for a whole season when month is omitted
router.get('/', async (req, res) => {
  try {
    const { month, season } = req.query;
    if (!season) {
      return res.status(400).json({ message: 'season is required' });
    }

    if (!month) {
      const exclusions = await MonthExclusion.find({ season });
      return res.json(exclusions.map(e => ({ userId: e.userId.toString(), month: e.month })));
    }

    const exclusions = await MonthExclusion.find({
      month: parseInt(month),
      season
    });
    res.json(exclusions.map(e => e.userId.toString()));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Exclude a user from a month
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { userId, month, season } = req.body;
    await MonthExclusion.findOneAndUpdate(
      { userId, month, season },
      { userId, month, season, excludedAt: new Date() },
      { upsert: true }
    );
    res.json({ message: 'User excluded' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Re-include a user in a month
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const { userId, month, season } = req.body;
    await MonthExclusion.findOneAndDelete({ userId, month, season });
    res.json({ message: 'User included' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
