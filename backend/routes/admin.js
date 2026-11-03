const express = require('express');
const Week = require('../models/Week');
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const Score = require('../models/Score');
const User = require('../models/User');
const MonthExclusion = require('../models/MonthExclusion');
const { requireAdmin } = require('../middleware/requireAdmin');
const { buildToday, buildWeekStatus } = require('../services/adminToday');
const providerHealth = require('../services/providerHealth');
const liveScores = require('../services/liveScores');

const router = express.Router();
router.use(requireAdmin);

// כמה שבועות אחורה בודקים. שבוע ישן שעוד חסרה בו תוצאה כמעט תמיד בין
// האחרונים; מעבר לזה זה עניין ל"בדיקת ניקוד" של החודש
const RECENT_WEEKS = 4;

// כל מה ששבוע צריך כדי לחשב את המצב שלו, בכמה שאילתות לכל השבועות יחד
const loadWeekData = async (weeks) => {
  const weekIds = weeks.map((w) => w._id);
  const matches = await Match.find({ weekId: { $in: weekIds } }).lean();
  const months = [...new Set(weeks.map((w) => `${w.month}|${w.season}`))].map((k) => {
    const [month, season] = k.split('|');
    return { month: Number(month), season };
  });
  const [bets, scores, exclusions] = await Promise.all([
    Bet.find({ matchId: { $in: matches.map((m) => m._id) } }).lean(),
    Score.find({ weekId: { $in: weekIds } }).lean(),
    months.length ? MonthExclusion.find({ $or: months }).lean() : []
  ]);

  return weeks.map((week) => {
    const wid = String(week._id);
    const weekMatches = matches.filter((m) => String(m.weekId) === wid);
    const matchIds = new Set(weekMatches.map((m) => String(m._id)));
    return {
      week,
      matches: weekMatches,
      bets: bets.filter((b) => matchIds.has(String(b.matchId))),
      scores: scores.filter((s) => String(s.weekId) === wid),
      exclusions: exclusions.filter((e) => e.month === week.month && e.season === week.season)
    };
  });
};

const loadPeople = async () => {
  const users = await User.find({}, 'name role pushSettings').lean();
  return { users, players: users.filter((u) => u.role !== 'admin') };
};

// 📋 היום: מה צריך לעשות עכשיו
router.get('/today', async (req, res) => {
  try {
    const weeks = await Week.find().sort({ createdAt: -1 }).limit(RECENT_WEEKS).lean();
    const [weekData, people] = await Promise.all([loadWeekData(weeks), loadPeople()]);
    res.json(buildToday({
      weekData,
      ...people,
      providers: providerHealth.snapshot(),
      liveBackoff: liveScores.backoffStatus()
    }));
  } catch (error) {
    console.error('❌ [admin/today] error:', error);
    res.status(500).json({ message: error.message });
  }
});

// מצב שבוע אחד - לפס השלבים במסך השבוע
router.get('/week/:weekId', async (req, res) => {
  try {
    const week = await Week.findById(req.params.weekId).lean();
    if (!week) return res.status(404).json({ message: 'השבוע לא נמצא' });
    const [[data], people] = await Promise.all([loadWeekData([week]), loadPeople()]);
    res.json(buildWeekStatus({ ...data, ...people }));
  } catch (error) {
    console.error('❌ [admin/week] error:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
