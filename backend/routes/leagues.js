const express = require('express');
const League = require('../models/League');
const router = express.Router();

// 🔍 קבלת כל הליגות (כולל לא פעילות)
router.get('/', async (req, res) => {
  try {
    const leagues = await League.find().sort({ order: 1, name: 1 });
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching leagues:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔍 קבלת ליגות פעילות בלבד
router.get('/active', async (req, res) => {
  try {
    const leagues = await League.find({ active: true }).sort({ order: 1, name: 1 });
    res.json(leagues);
  } catch (error) {
    console.error('Error fetching active leagues:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔍 קבלת ליגה לפי ID
router.get('/:id', async (req, res) => {
  try {
    const league = await League.findById(req.params.id);
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    res.json(league);
  } catch (error) {
    console.error('Error fetching league:', error);
    res.status(500).json({ message: error.message });
  }
});

// ➕ יצירת ליגה חדשה (אדמין)
router.post('/', async (req, res) => {
  try {
    const { name, key, color, type, region, active, order } = req.body;
    
    // בדיקת שדות חובה
    if (!name || !key) {
      return res.status(400).json({ message: 'שם ומפתח נדרשים' });
    }
    
    // בדיקה שהמפתח ייחודי
    const existingLeague = await League.findOne({ key });
    if (existingLeague) {
      return res.status(400).json({ message: 'מפתח ליגה כבר קיים' });
    }
    
    const league = new League({
      name,
      key,
      color: color || '#6c757d',
      type: type || 'club',
      region: region || '',
      active: active !== undefined ? active : true,
      order: order || 0
    });
    
    await league.save();
    console.log('✅ ליגה חדשה נוצרה:', league);
    res.status(201).json(league);
    
  } catch (error) {
    console.error('Error creating league:', error);
    
    // טיפול בשגיאות ולידציה
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// ✏️ עדכון ליגה (אדמין)
router.patch('/:id', async (req, res) => {
  try {
    const { name, key, color, type, region, active, order } = req.body;
    
    // אם משנים מפתח, בדוק שהוא ייחודי
    if (key) {
      const existingLeague = await League.findOne({ 
        key, 
        _id: { $ne: req.params.id } 
      });
      
      if (existingLeague) {
        return res.status(400).json({ message: 'מפתח ליגה כבר קיים' });
      }
    }
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (key !== undefined) updateData.key = key;
    if (color !== undefined) updateData.color = color;
    if (type !== undefined) updateData.type = type;
    if (region !== undefined) updateData.region = region;
    if (active !== undefined) updateData.active = active;
    if (order !== undefined) updateData.order = order;
    
    const league = await League.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    console.log('✅ ליגה עודכנה:', league);
    res.json(league);
    
  } catch (error) {
    console.error('Error updating league:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    
    res.status(500).json({ message: error.message });
  }
});

// 🗑️ מחיקת ליגה (אדמין)
router.delete('/:id', async (req, res) => {
  try {
    const leagueId = req.params.id;
    
    // בדוק אם יש משחקים שמשתמשים בליגה הזו
    const Match = require('../models/Match');
    const matchesUsingLeague = await Match.find({ leagueId: leagueId });
    
    if (matchesUsingLeague.length > 0) {
      return res.status(400).json({ 
        message: `לא ניתן למחוק - יש ${matchesUsingLeague.length} משחקים המשתמשים בליגה זו`,
        matchCount: matchesUsingLeague.length
      });
    }
    
    const league = await League.findByIdAndDelete(leagueId);
    
    if (!league) {
      return res.status(404).json({ message: 'League not found' });
    }
    
    console.log('🗑️ ליגה נמחקה:', league.name);
    res.json({ message: 'League deleted successfully', league });
    
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔄 אתחול ליגות ברירת מחדל (פעם אחת)
router.post('/initialize', async (req, res) => {
  try {
    // בדוק אם יש כבר ליגות
    const existingCount = await League.countDocuments();
    if (existingCount > 0) {
      return res.status(400).json({ 
        message: 'ליגות כבר קיימות במערכת',
        count: existingCount
      });
    }
    
    // הוסף 3 ליגות ברירת מחדל
    const defaultLeagues = [
      {
        name: 'פרמיירליג',
        key: 'english',
        color: '#dc3545',
        type: 'club',
        region: 'אנגליה',
        order: 1
      },
      {
        name: 'לה ליגה',
        key: 'spanish',
        color: '#007bff',
        type: 'club',
        region: 'ספרד',
        order: 2
      },
      {
        name: 'ליגת העל הישראלית',
        key: 'israeli',
        color: '#6f42c1',
        type: 'club',
        region: 'ישראל',
        order: 3
      }
    ];
    
    const createdLeagues = await League.insertMany(defaultLeagues);
    console.log('✅ ליגות ברירת מחדל נוצרו:', createdLeagues.length);
    
    res.status(201).json({
      message: 'ליגות ברירת מחדל נוצרו בהצלחה',
      leagues: createdLeagues
    });
    
  } catch (error) {
    console.error('Error initializing leagues:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;