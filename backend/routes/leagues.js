const express = require('express');
const League = require('../models/League');
const { requireAdmin } = require('../middleware/requireAdmin');
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
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, key, color, type, region, active, order, apiFootballId } = req.body;

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
      order: order || 0,
      apiFootballId: apiFootballId == null || apiFootballId === '' ? null : parseInt(apiFootballId, 10)
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
router.patch('/:id', requireAdmin, async (req, res) => {
  try {
    const { name, key, color, type, region, active, order, apiFootballId } = req.body;

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
    if (apiFootballId !== undefined) {
      updateData.apiFootballId = apiFootballId === null || apiFootballId === ''
        ? null
        : parseInt(apiFootballId, 10);
    }
    
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
router.delete('/:id', requireAdmin, async (req, res) => {
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
router.post('/initialize', requireAdmin, async (req, res) => {
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

// 🌍 הוספת/עדכון חבילת ליגות+גביעים אירופית (אדמין)
// מוסיף ליגות חסרות ומעדכן apiFootballId לקיימות
router.post('/seed-european', requireAdmin, async (req, res) => {
  try {
    // עדיפות ספקים: football-data.org > SofaScore > ESPN
    const seedLeagues = [
      // ישראל - דרך 365scores (חברה ישראלית, מחזירים שמות בעברית)
      { name: 'ליגת העל', key: 'israeli', color: '#6f42c1', type: 'club', region: 'ישראל', order: 1, apiFootballId: 383, footballDataCode: null, espnLeagueCode: null, sofaScoreTournamentId: 266, sportsDbLeagueId: 4644, scores365CompetitionId: 42 },
      { name: 'גביע המדינה', key: 'israeli-cup', color: '#5a32a3', type: 'club', region: 'ישראל', order: 2, apiFootballId: 384, footballDataCode: null, espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 49 },
      // ספרד
      { name: 'לה ליגה', key: 'spanish', color: '#007bff', type: 'club', region: 'ספרד', order: 10, apiFootballId: 140, footballDataCode: 'PD', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 11 },
      { name: 'קופה דל ריי', key: 'spanish-cup', color: '#0056b3', type: 'club', region: 'ספרד', order: 11, apiFootballId: 143, footballDataCode: null, espnLeagueCode: 'esp.copa_del_rey', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 13 },
      // אנגליה
      { name: 'פרמייר ליג', key: 'english', color: '#dc3545', type: 'club', region: 'אנגליה', order: 20, apiFootballId: 39, footballDataCode: 'PL', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 7 },
      { name: 'גביע אנגליה (FA Cup)', key: 'english-fa-cup', color: '#a71d2a', type: 'club', region: 'אנגליה', order: 21, apiFootballId: 45, footballDataCode: null, espnLeagueCode: 'eng.fa', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 8 },
      // איטליה
      { name: 'סרייה א', key: 'italian', color: '#28a745', type: 'club', region: 'איטליה', order: 30, apiFootballId: 135, footballDataCode: 'SA', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 17 },
      { name: 'גביע איטליה (Coppa Italia)', key: 'italian-cup', color: '#1e7e34', type: 'club', region: 'איטליה', order: 31, apiFootballId: 137, footballDataCode: null, espnLeagueCode: 'ita.coppa_italia', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 20 },
      // גרמניה
      { name: 'בונדסליגה', key: 'german', color: '#ffc107', type: 'club', region: 'גרמניה', order: 40, apiFootballId: 78, footballDataCode: 'BL1', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 25 },
      { name: 'גביע גרמניה (DFB-Pokal)', key: 'german-cup', color: '#d39e00', type: 'club', region: 'גרמניה', order: 41, apiFootballId: 81, footballDataCode: null, espnLeagueCode: 'ger.dfb_pokal', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 28 },
      // צרפת
      { name: 'ליג 1', key: 'french', color: '#17a2b8', type: 'club', region: 'צרפת', order: 50, apiFootballId: 61, footballDataCode: 'FL1', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 35 },
      { name: 'גביע צרפת', key: 'french-cup', color: '#117a8b', type: 'club', region: 'צרפת', order: 51, apiFootballId: 66, footballDataCode: null, espnLeagueCode: 'fra.coupe_de_france', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 37 },
      // אירופאיות
      { name: 'ליגת האלופות', key: 'champions-league', color: '#001f5b', type: 'club', region: 'אירופה', order: 60, apiFootballId: 2, footballDataCode: 'CL', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 572 },
      { name: 'הליגה האירופית', key: 'europa-league', color: '#ff6600', type: 'club', region: 'אירופה', order: 61, apiFootballId: 3, footballDataCode: null, espnLeagueCode: 'uefa.europa', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 573 },
      { name: 'קונפרנס ליג', key: 'conference-league', color: '#00a651', type: 'club', region: 'אירופה', order: 62, apiFootballId: 848, footballDataCode: null, espnLeagueCode: 'uefa.europa.conf', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 7685 }
    ];

    const created = [];
    const updated = [];

    for (const item of seedLeagues) {
      const existing = await League.findOne({ key: item.key });
      if (existing) {
        existing.apiFootballId = item.apiFootballId;
        existing.footballDataCode = item.footballDataCode;
        existing.espnLeagueCode = item.espnLeagueCode;
        existing.sofaScoreTournamentId = item.sofaScoreTournamentId;
        existing.sportsDbLeagueId = item.sportsDbLeagueId;
        existing.scores365CompetitionId = item.scores365CompetitionId;
        if (!existing.region) existing.region = item.region;
        await existing.save();
        updated.push(existing);
      } else {
        const doc = await League.create(item);
        created.push(doc);
      }
    }

    res.status(201).json({
      message: `נוצרו ${created.length} ליגות, עודכנו ${updated.length}`,
      created: created.length,
      updated: updated.length,
      leagues: [...created, ...updated]
    });
  } catch (error) {
    console.error('Error seeding European leagues:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;