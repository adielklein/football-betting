const express = require('express');
const League = require('../models/League');
const scores365Api = require('../services/scores365Api');
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
// 🔍 בדיקה מול 365: האם כל ליגה באמת מחוברת לתחרות שהיא טוענת שהיא.
//
// מזהה מספרי ושם שמור אינם ראיה - שניהם נכתבו על סמך אותו חיפוש. הראיה
// היחידה היא המשחקים עצמם: שם התחרות כפי ש-365 מחזירים אותו על המשחק,
// ושמות הקבוצות. "ליגת האומות" שמחזירה את טורקס וקאיקוס מול מונטסראט
// עונה על השאלה מיד, בלי לסמוך על אף שם ששמרנו.
//
// חלון רחב ועם תוצאות עבר, כדי שגם תחרות שאינה בעונתה תראה משהו.
router.get('/verify365', requireAdmin, async (req, res) => {
  try {
    const leagues = await League.find({ scores365CompetitionId: { $ne: null } })
      .sort({ order: 1, name: 1 })
      .lean();

    const ymd = (d) => d.toISOString().slice(0, 10);
    const fromDate = ymd(new Date(Date.now() - 45 * 24 * 60 * 60 * 1000));
    const toDate = ymd(new Date(Date.now() + 75 * 24 * 60 * 60 * 1000));

    const check = async (league) => {
      const row = {
        _id: String(league._id),
        name: league.name,
        key: league.key,
        competitionId: league.scores365CompetitionId,
        storedName: league.scores365Name || null,
        liveName: null,
        samples: [],
        count: 0,
        error: null
      };

      try {
        const fixtures = await scores365Api.fetchUpcomingFixtures({
          scores365CompetitionId: league.scores365CompetitionId,
          fromDate,
          toDate,
          includePast: true
        });

        row.count = fixtures.length;
        // שם התחרות כפי שהוא מגיע על המשחקים עצמם
        const names = [...new Set(fixtures.map((f) => f.leagueName).filter(Boolean))];
        row.liveName = names.join(' / ') || null;
        row.samples = fixtures
          .slice(0, 3)
          .map((f) => `${f.team1He || f.team1En} - ${f.team2He || f.team2En}`);
      } catch (err) {
        row.error = err.message;
      }

      return row;
    };

    // בקבוצות קטנות: 21 בקשות בבת אחת מול 365 זו דרך טובה להיחסם
    const rows = [];
    const queue = [...leagues];
    const workers = Array.from({ length: 4 }, async () => {
      while (queue.length > 0) {
        const league = queue.shift();
        rows.push(await check(league));
      }
    });
    await Promise.all(workers);

    rows.sort((a, b) => a.name.localeCompare(b.name, 'he'));
    res.json({ checked: rows.length, fromDate, toDate, rows });
  } catch (error) {
    console.error('Error verifying 365 competitions:', error);
    res.status(500).json({ message: error.message });
  }
});

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
    const {
      name, key, color, type, region, active, order, apiFootballId,
      footballDataCode, espnLeagueCode, sofaScoreTournamentId, scores365CompetitionId,
      scores365Name
    } = req.body;

    // בדיקת שדות חובה
    if (!name || !key) {
      return res.status(400).json({ message: 'שם ומפתח נדרשים' });
    }

    // בדיקה שהמפתח ייחודי
    const existingLeague = await League.findOne({ key });
    if (existingLeague) {
      return res.status(400).json({ message: 'מפתח ליגה כבר קיים' });
    }

    const toIntOrNull = (v) => (v == null || v === '' ? null : parseInt(v, 10));

    const league = new League({
      name,
      key,
      color: color || '#6c757d',
      type: type || 'club',
      region: region || '',
      active: active !== undefined ? active : true,
      order: order || 0,
      apiFootballId: toIntOrNull(apiFootballId),
      footballDataCode: footballDataCode == null || footballDataCode === '' ? null : footballDataCode,
      espnLeagueCode: espnLeagueCode == null || espnLeagueCode === '' ? null : espnLeagueCode,
      sofaScoreTournamentId: toIntOrNull(sofaScoreTournamentId),
      scores365CompetitionId: toIntOrNull(scores365CompetitionId),
      scores365Name: scores365Name || null
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
    const {
      name, key, color, type, region, active, order, apiFootballId,
      footballDataCode, espnLeagueCode, sofaScoreTournamentId, scores365CompetitionId,
      scores365Name
    } = req.body;

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

    const toIntOrNull = (v) => (v === null || v === '' ? null : parseInt(v, 10));

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (key !== undefined) updateData.key = key;
    if (color !== undefined) updateData.color = color;
    if (type !== undefined) updateData.type = type;
    if (region !== undefined) updateData.region = region;
    if (active !== undefined) updateData.active = active;
    if (order !== undefined) updateData.order = order;
    if (apiFootballId !== undefined) updateData.apiFootballId = toIntOrNull(apiFootballId);
    if (footballDataCode !== undefined) updateData.footballDataCode = footballDataCode === '' ? null : footballDataCode;
    if (espnLeagueCode !== undefined) updateData.espnLeagueCode = espnLeagueCode === '' ? null : espnLeagueCode;
    if (sofaScoreTournamentId !== undefined) updateData.sofaScoreTournamentId = toIntOrNull(sofaScoreTournamentId);
    if (scores365CompetitionId !== undefined) {
      updateData.scores365CompetitionId = toIntOrNull(scores365CompetitionId);
      // השם מתלווה למזהה: כשנבחרה תחרות מהחיפוש הוא מגיע איתה, וכשהמזהה
      // הוחלף או נמחק ביד השם הישן כבר לא מתאר דבר
      updateData.scores365Name = scores365Name || null;
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
      // גביע הטוטו - התחרות הישראלית השלישית, והפער הבולט ברשימה. המזהה
      // מתאתר בסנכרון מול 365, כמו בגביע הליגה האנגלי
      { name: 'גביע הטוטו', key: 'israeli-toto-cup', color: '#4b2a86', type: 'club', region: 'ישראל', order: 3, apiFootballId: null, footballDataCode: null, espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['גביע הטוטו', 'טוטו'], country: 'ישראל', exact: ['גביע הטוטו'] } },
      // ספרד
      { name: 'לה ליגה', key: 'spanish', color: '#007bff', type: 'club', region: 'ספרד', order: 10, apiFootballId: 140, footballDataCode: 'PD', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 11 },
      { name: 'קופה דל ריי', key: 'spanish-cup', color: '#0056b3', type: 'club', region: 'ספרד', order: 11, apiFootballId: 143, footballDataCode: null, espnLeagueCode: 'esp.copa_del_rey', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 13 },
      // אנגליה
      { name: 'פרמייר ליג', key: 'english', color: '#dc3545', type: 'club', region: 'אנגליה', order: 20, apiFootballId: 39, footballDataCode: 'PL', espnLeagueCode: null, sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 7 },
      { name: 'גביע אנגליה (FA Cup)', key: 'english-fa-cup', color: '#a71d2a', type: 'club', region: 'אנגליה', order: 21, apiFootballId: 45, footballDataCode: null, espnLeagueCode: 'eng.fa', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 8 },
      // גביע הליגה האנגלי (EFL Cup / Carabao Cup). אין כאן מזהה 365 כתוב מראש
      // כי מזהה שגוי לא נכשל אלא מצביע בשקט על תחרות אחרת; במקום זה seek365
      // מבקש מהסנכרון לאתר אותו מול 365 עצמם. ESPN נשאר כגיבוי בלבד - רק 365
      // מחזיר עברית ומזין יחסי ווינר, תובנות וטבלה חיה
      { name: 'גביע הליגה האנגלי (Carabao Cup)', key: 'english-league-cup', color: '#1f3a93', type: 'club', region: 'אנגליה', order: 22, apiFootballId: 48, footballDataCode: null, espnLeagueCode: 'eng.league_cup', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['גביע הליגה', 'קאראבאו', 'League Cup'], country: 'אנגליה' } },
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
      { name: 'קונפרנס ליג', key: 'conference-league', color: '#00a651', type: 'club', region: 'אירופה', order: 62, apiFootballId: 848, footballDataCode: null, espnLeagueCode: 'uefa.europa.conf', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: 7685 },

      // נבחרות. בשבועות של הפסקת נבחרות אין מה לייבא בלי אלה, והן היו
      // חסרות לגמרי. כמו בגביע הליגה האנגלי - בלי מזהה 365 כתוב מראש
      // (מספר מנוחש לא נכשל, הוא מצביע בשקט על תחרות אחרת), אלא seek365
      // שמאתר אותו מול 365 עצמם. קוד ESPN קיים כגיבוי, כדי שהתחרות תופיע
      // בייבוא כבר עכשיו גם לפני שהמזהה אותר - אבל רק 365 נותן עברית,
      // יחסי ווינר ותובנות, ולכן שווה להריץ סנכרון.
      //
      // footballDataCode נשאר ריק בכוונה גם למונדיאל וליורו, שיש להם קוד
      // כזה: football-data דורש מפתח, ובסדר העדיפויות הוא קודם ל-ESPN -
      // כך שבלי מפתח הייבוא היה נעצר בשגיאה במקום ליפול ל-ESPN
      { name: 'ליגת האומות', key: 'nations-league', color: '#0b3d91', type: 'national', region: 'אירופה', order: 70, apiFootballId: 5, footballDataCode: null, espnLeagueCode: 'uefa.nations', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['ליגת האומות של אופ"א', 'ליגת האומות אופא', 'ליגת האומות', 'Nations League'], country: 'אירופה', exact: ['ליגת האומות של אופ"א', 'ליגת האומות - אופ"א', 'ליגת האומות', 'UEFA Nations League'], exclude: ['קונקקאף', 'קונקאקף', 'concacaf', 'אסיה', 'אפריקה', 'נשים', 'women', 'נוער', 'עד גיל', 'u2', 'u1'] } },
      { name: 'מוקדמות המונדיאל (אירופה)', key: 'world-cup-qual-uefa', color: '#146b3a', type: 'national', region: 'אירופה', order: 71, apiFootballId: 32, footballDataCode: null, espnLeagueCode: 'fifa.worldq.uefa', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['מוקדמות מונדיאל אירופה', 'מוקדמות מונדיאל', 'מוקדמות המונדיאל', 'מוקדמות גביע העולם', 'מוקדמות', 'World Cup Qualification'], country: 'אירופה', exclude: ['נשים', 'women', 'נוער', 'עד גיל', 'u2', 'u1'], exact: ['מוקדמות מונדיאל אירופה', 'מוקדמות מונדיאל, אירופה', 'מוקדמות המונדיאל, אירופה', 'מוקדמות מונדיאל - אירופה', 'World Cup Qualification, UEFA'] } },
      { name: 'מונדיאל', key: 'world-cup', color: '#b8860b', type: 'national', region: 'עולם', order: 72, apiFootballId: 1, footballDataCode: null, espnLeagueCode: 'fifa.world', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['מונדיאל', 'גביע העולם', 'World Cup'], exclude: ['נשים', 'women', 'מועדונים', 'club', 'נוער', 'עד גיל', 'u2', 'u1', 'חופים', 'futsal', 'מוקדמות'], exact: ['מונדיאל', 'גביע העולם', 'מונדיאל 2026', 'גביע העולם 2026', 'FIFA World Cup'] } },
      { name: 'אליפות אירופה (יורו)', key: 'euro', color: '#1d4ed8', type: 'national', region: 'אירופה', order: 73, apiFootballId: 4, footballDataCode: null, espnLeagueCode: 'uefa.euro', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['אליפות אירופה', 'יורו', 'EURO', 'European Championship'], exclude: ['נשים', 'women', 'נוער', 'עד גיל', 'u2', 'u1', 'futsal', 'מוקדמות'], exact: ['אליפות אירופה', 'יורו 2028', 'אליפות אירופה 2028', 'UEFA European Championship'] } }
    ];

    const created = [];
    const updated = [];

    // מזהה שהרשימה המובנית לא מכירה (null) לא מוחק מזהה שהוזן ידנית במסך
    // הניהול. בלי זה, לחיצה על "סנכרן" כדי לקלוט תחרות חדשה הייתה מוחקת
    // בשקט מזהים שהאדמין השלים בעצמו
    const keep = (current, fromSeed) => (fromSeed == null ? current : fromSeed);

    // השוואת שמות תחרויות: גרשיים, רווחים כפולים ואותיות גדולות אינם הבדל
    const normalizeName = (value) =>
      String(value || '').trim().toLowerCase().replace(/["'`׳״]/g, '').replace(/\s+/g, ' ');

    // האם שם התחרות נושא מילה פוסלת
    const isExcluded = (name, exclude) => {
      if (!Array.isArray(exclude) || exclude.length === 0) return false;
      const normalized = normalizeName(name);
      return exclude.map(normalizeName).some((word) => word && normalized.includes(word));
    };

    for (const item of seedLeagues) {
      // seek365 הוא הנחיה לסנכרון, לא שדה של הליגה
      const { seek365, ...fields } = item;
      const existing = await League.findOne({ key: fields.key });
      if (existing) {
        existing.apiFootballId = keep(existing.apiFootballId, fields.apiFootballId);
        existing.footballDataCode = keep(existing.footballDataCode, fields.footballDataCode);
        existing.espnLeagueCode = keep(existing.espnLeagueCode, fields.espnLeagueCode);
        existing.sofaScoreTournamentId = keep(existing.sofaScoreTournamentId, fields.sofaScoreTournamentId);
        existing.sportsDbLeagueId = keep(existing.sportsDbLeagueId, fields.sportsDbLeagueId);
        existing.scores365CompetitionId = keep(existing.scores365CompetitionId, fields.scores365CompetitionId);
        if (!existing.region) existing.region = fields.region;
        await existing.save();
        updated.push(existing);
      } else {
        const doc = await League.create(fields);
        created.push(doc);
      }
    }

    // מזהי 365 מול 365 עצמם, במקום מספר מנוחש בקוד.
    //
    // לא רק השלמה של חסר: גם בדיקה של מה שכבר שמור. מזהה שגוי לא מתגלה
    // בשום מסך - ליגת האומות הייתה מחוברת לתחרות של קונקקאף, וזה התגלה
    // רק כשיובאו משחקים של נבחרות האיים הקריביים. לכן לחיצה אחת על
    // "סנכרן" צריכה גם לתקן, ולא להשאיר עבודה ידנית.
    //
    // הזהירות נשמרת: מחליפים מזהה קיים רק כשהוא מוכר לחיפוש ונפסל
    // מפורשות (קונקקאף, נשים, נוער), ורק כשיש מועמד תקין יחיד להחליף בו.
    // מזהה שהחיפוש אינו מכיר - למשל כזה שהוזן ידנית - לא נגעים בו.
    const seekByKey = new Map(
      seedLeagues.filter((i) => i.seek365).map((i) => [i.key, i.seek365])
    );
    const resolved365 = [];
    const replaced365 = [];
    const unresolved365 = [];

    // כל מה שהחיפוש החזיר (raw), ומה שנשאר אחרי מדינה/פסילה/שם מדויק
    // (accepted). ההפרדה היא מה שמאפשר גם לזהות מזהה שמור שנפסל
    const lookup365 = async (seek) => {
      let raw = [];
      let accepted = [];

      for (const name of seek.names) {
        const found = await scores365Api.searchCompetitions(name);
        raw = found.competitions;
        let list = raw;

        // המדינה מצמצמת, אך אינה פוסלת: תחרות נבחרות אינה שייכת למדינה
        // ואצל 365 השדה הזה עשוי להיות ריק. כשהסינון מותיר כלום נשארים
        // עם הרשימה המלאה - הכרעה עדיין דורשת מועמד יחיד
        if (seek.country) {
          const inCountry = list.filter((c) => c.country && c.country.includes(seek.country));
          if (inCountry.length > 0) list = inCountry;
        }

        // פסילה מפורשת. "ליגת האומות" היא גם של קונקקאף, "מונדיאל" הוא
        // גם של נשים ושל נבחרות נוער - תחרויות אחרות לגמרי שנראות כמו
        // התאמה מצוינת לפי השם
        if (Array.isArray(seek.exclude)) {
          list = list.filter((c) => !isExcluded(c.name, seek.exclude));
        }

        // שם מלא ומדויק הוא הצמצום האחרון, וכאן הוא הכרחי: "מונדיאל"
        // מוכל גם ב"מוקדמות מונדיאל"
        if (list.length > 1 && Array.isArray(seek.exact)) {
          const wanted = seek.exact.map(normalizeName);
          const exact = list.filter((c) => wanted.includes(normalizeName(c.name)));
          if (exact.length > 0) list = exact;
        }

        accepted = list;
        if (accepted.length > 0) break;
      }

      return { raw, accepted };
    };

    for (const doc of [...created, ...updated]) {
      const seek = seekByKey.get(doc.key);
      if (!seek) continue;

      let raw = [];
      let accepted = [];
      try {
        ({ raw, accepted } = await lookup365(seek));
      } catch (err) {
        unresolved365.push({ league: doc.name, error: err.message });
        continue;
      }

      const current = doc.scores365CompetitionId;

      if (current != null) {
        const confirmed = accepted.find((c) => c.id === current);
        if (confirmed) {
          // תקין. שומרים את השם כדי שגם ליגה שאותרה פעם תציג אותו
          if (doc.scores365Name !== confirmed.name) {
            doc.scores365Name = confirmed.name || null;
            await doc.save();
          }
          continue;
        }

        const known = raw.find((c) => c.id === current);

        // מזהה שמור נחשב שגוי כששם התחרות נושא מילה פוסלת, או כשהתחרות
        // שייכת מפורשות לאזור אחר מזה שביקשנו. "ליגת האומות" של קונקקאף
        // נופלת באחד מהשניים גם אם השם שלה זהה לחלוטין
        const wrongRegion = !!(seek.country && known?.country && !known.country.includes(seek.country));
        const wrongName = !!(known && isExcluded(known.name, seek.exclude));

        if (!known || (!wrongName && !wrongRegion)) {
          // לא מוכר לחיפוש, או מוכר ותקין - אולי בחירה מכוונת של האדמין.
          // לא נוגעים, ולא מרעישים
          continue;
        }

        if (accepted.length === 1) {
          doc.scores365CompetitionId = accepted[0].id;
          doc.scores365Name = accepted[0].name || null;
          await doc.save();
          replaced365.push({
            league: doc.name,
            from: known.name,
            id: accepted[0].id,
            matchedName: accepted[0].name
          });
        } else {
          unresolved365.push({
            league: doc.name,
            wrong: known.name,
            tried: seek.names,
            candidates: accepted.slice(0, 8)
          });
        }
        continue;
      }

      if (accepted.length === 1) {
        doc.scores365CompetitionId = accepted[0].id;
        // השם נשמר כדי שיהיה אפשר לראות במסך למה התחברנו. מזהה לבדו לא
        // מגלה שהתחברנו לליגת האומות של קונקקאף במקום של אופ"א
        doc.scores365Name = accepted[0].name || null;
        await doc.save();
        resolved365.push({
          league: doc.name,
          id: accepted[0].id,
          matchedName: accepted[0].name,
          country: accepted[0].country
        });
      } else {
        // כולל את מה שחיפשנו: כשאין תוצאה בכלל, השאלה הבאה היא תמיד
        // "ומה בדיוק חיפשת", וממנה ממשיכים לחיפוש הידני
        unresolved365.push({
          league: doc.name,
          tried: seek.names,
          candidates: accepted.slice(0, 8)
        });
      }
    }

    const resolvedNote = resolved365.length > 0 ? `, אותרו ${resolved365.length} מזהי 365` : '';
    const replacedNote = replaced365.length > 0 ? `, תוקנו ${replaced365.length}` : '';
    res.status(201).json({
      message: `נוצרו ${created.length} ליגות, עודכנו ${updated.length}${resolvedNote}${replacedNote}`,
      resolved365,
      replaced365,
      unresolved365,
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