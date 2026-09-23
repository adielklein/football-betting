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
      footballDataCode, espnLeagueCode, sofaScoreTournamentId, scores365CompetitionId
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
      scores365CompetitionId: toIntOrNull(scores365CompetitionId)
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
      footballDataCode, espnLeagueCode, sofaScoreTournamentId, scores365CompetitionId
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
    if (scores365CompetitionId !== undefined) updateData.scores365CompetitionId = toIntOrNull(scores365CompetitionId);

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
      { name: 'ליגת האומות', key: 'nations-league', color: '#0b3d91', type: 'national', region: 'אירופה', order: 70, apiFootballId: 5, footballDataCode: null, espnLeagueCode: 'uefa.nations', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['ליגת האומות', 'ליגת האומות של אופא', 'Nations League'], exact: ['ליגת האומות', 'ליגת האומות של אופ"א', 'UEFA Nations League'] } },
      { name: 'מוקדמות המונדיאל (אירופה)', key: 'world-cup-qual-uefa', color: '#146b3a', type: 'national', region: 'אירופה', order: 71, apiFootballId: 32, footballDataCode: null, espnLeagueCode: 'fifa.worldq.uefa', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['מוקדמות מונדיאל אירופה', 'מוקדמות מונדיאל', 'מוקדמות המונדיאל', 'מוקדמות גביע העולם', 'מוקדמות', 'World Cup Qualification'], country: 'אירופה', exact: ['מוקדמות מונדיאל אירופה', 'מוקדמות מונדיאל, אירופה', 'מוקדמות המונדיאל, אירופה', 'מוקדמות מונדיאל - אירופה', 'World Cup Qualification, UEFA'] } },
      { name: 'מונדיאל', key: 'world-cup', color: '#b8860b', type: 'national', region: 'עולם', order: 72, apiFootballId: 1, footballDataCode: null, espnLeagueCode: 'fifa.world', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['מונדיאל', 'גביע העולם', 'World Cup'], exact: ['מונדיאל', 'גביע העולם', 'מונדיאל 2026', 'גביע העולם 2026', 'FIFA World Cup'] } },
      { name: 'אליפות אירופה (יורו)', key: 'euro', color: '#1d4ed8', type: 'national', region: 'אירופה', order: 73, apiFootballId: 4, footballDataCode: null, espnLeagueCode: 'uefa.euro', sofaScoreTournamentId: null, sportsDbLeagueId: null, scores365CompetitionId: null, seek365: { names: ['אליפות אירופה', 'יורו', 'EURO', 'European Championship'], exact: ['אליפות אירופה', 'יורו 2028', 'אליפות אירופה 2028', 'UEFA European Championship'] } }
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

    // השלמת מזהי 365 חסרים מול 365 עצמם, במקום לכתוב מספר מנוחש בקוד.
    // התנאי המחמיר הוא הבטיחות כאן: משלימים אך ורק כשיש התאמה יחידה
    // לשם ולמדינה. ריבוי מועמדים או אפס מועמדים מדווחים ולא מוכרעים לבד.
    const seekByKey = new Map(
      seedLeagues.filter((i) => i.seek365).map((i) => [i.key, i.seek365])
    );
    const resolved365 = [];
    const unresolved365 = [];

    for (const doc of [...created, ...updated]) {
      const seek = seekByKey.get(doc.key);
      if (!seek || doc.scores365CompetitionId != null) continue;

      let candidates = [];
      try {
        for (const name of seek.names) {
          const found = await scores365Api.searchCompetitions(name);
          let list = found.competitions;

          // המדינה מצמצמת, אך אינה פוסלת: תחרות נבחרות אינה שייכת למדינה
          // ואצל 365 השדה הזה עשוי להיות ריק. כשהסינון מותיר כלום נשארים
          // עם הרשימה המלאה - הכרעה עדיין דורשת מועמד יחיד, ולכן זה לא
          // פותח פתח לניחוש
          if (seek.country) {
            const inCountry = list.filter((c) => c.country && c.country.includes(seek.country));
            if (inCountry.length > 0) list = inCountry;
          }

          // שם מלא ומדויק הוא הצמצום החלופי, וכאן הוא הכרחי: "מונדיאל"
          // מוכל גם ב"מוקדמות מונדיאל", והשוואה מלאה מפרידה ביניהם בלי
          // לנחש
          if (list.length > 1 && Array.isArray(seek.exact)) {
            const wanted = seek.exact.map(normalizeName);
            const exact = list.filter((c) => wanted.includes(normalizeName(c.name)));
            if (exact.length > 0) list = exact;
          }

          candidates = list;
          if (candidates.length > 0) break;
        }
      } catch (err) {
        unresolved365.push({ league: doc.name, error: err.message });
        continue;
      }

      if (candidates.length === 1) {
        doc.scores365CompetitionId = candidates[0].id;
        await doc.save();
        resolved365.push({
          league: doc.name,
          id: candidates[0].id,
          matchedName: candidates[0].name,
          country: candidates[0].country
        });
      } else {
        // כולל את מה שחיפשנו: כשאין תוצאה בכלל, השאלה הבאה היא תמיד
        // "ומה בדיוק חיפשת", וממנה ממשיכים לחיפוש הידני
        unresolved365.push({
          league: doc.name,
          tried: seek.names,
          candidates: candidates.slice(0, 8)
        });
      }
    }

    const resolvedNote = resolved365.length > 0 ? `, אותרו ${resolved365.length} מזהי 365` : '';
    res.status(201).json({
      message: `נוצרו ${created.length} ליגות, עודכנו ${updated.length}${resolvedNote}`,
      resolved365,
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