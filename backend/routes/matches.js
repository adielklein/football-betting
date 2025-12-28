const express = require('express');
const Match = require('../models/Match');
const Week = require('../models/Week');
const League = require('../models/League');
const router = express.Router();

// 🆕 פונקציית עזר לחישוב השנה הנכונה
const calculateYear = (month) => {
  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  
  // אם אנחנו בדצמבר והמשחק בינואר - הוסף שנה
  if (currentMonth === 12 && parseInt(month) === 1) {
    return currentYear + 1;
  }
  return currentYear;
};

// Get all matches for a week
router.get('/week/:weekId', async (req, res) => {
  try {
    const matches = await Match.find({ weekId: req.params.weekId })
      .populate('leagueId');
    
    res.json(matches);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create new match
router.post('/', async (req, res) => {
  try {
    const { weekId, leagueId, league, team1, team2, date, time } = req.body;
    
    // בדיקת שדות חובה
    if (!weekId || !team1 || !team2 || !date || !time) {
      return res.status(400).json({ 
        message: 'חסרים שדות חובה: weekId, team1, team2, date, time' 
      });
    }
    
    // בדיקה שהליגה קיימת
    let validLeagueId = leagueId;
    
    // אם לא סופק leagueId אבל יש league (מפתח ישן), מצא את הליגה
    if (!leagueId && league) {
      const foundLeague = await League.findOne({ key: league });
      if (!foundLeague) {
        return res.status(400).json({ 
          message: `ליגה '${league}' לא נמצאה. צור אותה תחילה.` 
        });
      }
      validLeagueId = foundLeague._id;
    }
    
    if (!validLeagueId) {
      return res.status(400).json({ 
        message: 'חובה לבחור ליגה' 
      });
    }
    
    // וודא שהליגה קיימת
    const leagueExists = await League.findById(validLeagueId);
    if (!leagueExists) {
      return res.status(400).json({ 
        message: 'הליגה שנבחרה לא קיימת במערכת' 
      });
    }
    
    // 🆕 חישוב fullDate עם השנה הנכונה
    const [day, month] = date.split('.');
    const [hour, minute] = time.split(':');
    const year = calculateYear(month);
    const fullDate = new Date(
      year, 
      parseInt(month) - 1, 
      parseInt(day), 
      parseInt(hour), 
      parseInt(minute)
    );
    
    const match = new Match({
      weekId,
      leagueId: validLeagueId,
      league: leagueExists.key,
      team1,
      team2,
      date,
      time,
      fullDate  // 🆕 שמירת תאריך מלא
    });
    
    await match.save();
    
    // טען את המשחק עם פרטי הליגה
    const populatedMatch = await Match.findById(match._id).populate('leagueId');
    
    console.log('✅ משחק חדש נוצר:', populatedMatch);
    res.status(201).json(populatedMatch);
    
  } catch (error) {
    console.error('Error creating match:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🆕 Update match details (admin can edit match even in active week)
router.patch('/:id', async (req, res) => {
  try {
    const { leagueId, team1, team2, date, time } = req.body;
    
    // בנה אובייקט עדכון רק עם השדות שנשלחו
    const updateData = {};
    
    if (leagueId !== undefined) {
      // וודא שהליגה קיימת
      const leagueExists = await League.findById(leagueId);
      if (!leagueExists) {
        return res.status(400).json({ 
          message: 'הליגה שנבחרה לא קיימת במערכת' 
        });
      }
      updateData.leagueId = leagueId;
      updateData.league = leagueExists.key;
    }
    
    if (team1 !== undefined) updateData.team1 = team1;
    if (team2 !== undefined) updateData.team2 = team2;
    if (date !== undefined) updateData.date = date;
    if (time !== undefined) updateData.time = time;
    
    // 🆕 אם עדכנו תאריך או שעה - חשב מחדש את fullDate
    if (date !== undefined || time !== undefined) {
      // קבל את המשחק הנוכחי כדי לקבל את הערכים שלא השתנו
      const currentMatch = await Match.findById(req.params.id);
      
      const finalDate = date || currentMatch.date;
      const finalTime = time || currentMatch.time;
      
      const [day, month] = finalDate.split('.');
      const [hour, minute] = finalTime.split(':');
      const year = calculateYear(month);
      
      updateData.fullDate = new Date(
        year, 
        parseInt(month) - 1, 
        parseInt(day), 
        parseInt(hour), 
        parseInt(minute)
      );
    }
    
    // בצע עדכון
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).populate('leagueId');
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    console.log('✏️ משחק עודכן:', match);
    res.json(match);
    
  } catch (error) {
    console.error('Error updating match:', error);
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
    ).populate('leagueId');
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    res.json(match);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🆕 Delete match result (clear the result)
router.delete('/:id/result', async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(
      req.params.id,
      { 
        $unset: { result: 1 }
      },
      { new: true }
    ).populate('leagueId');
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    console.log('🗑️ תוצאת משחק נמחקה:', match._id);
    res.json({ message: 'Result deleted successfully', match });
  } catch (error) {
    console.error('Error deleting match result:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete match
router.delete('/:id', async (req, res) => {
  try {
    const match = await Match.findByIdAndDelete(req.params.id);
    
    if (!match) {
      return res.status(404).json({ message: 'Match not found' });
    }
    
    res.json({ message: 'Match deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;