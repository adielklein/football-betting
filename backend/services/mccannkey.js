// McCannkey 🐒 - "שחקן" ממוחשב שמהמר כל שבוע לפי התחזית (services/matchPredictor.js).
//
// הרעיון: נקודת השוואה. אם אנחנו מנחשים טוב יותר מסטטיסטיקה, נראה את זה
// בטבלה; אם הקוף מקדים אותנו - גם.
//
// כללים:
// - משתמש עם role: 'bot'. אי אפשר להתחבר אליו (auth חוסם), אין לו מכשירים
//   ולא נשלחות אליו תזכורות.
// - בטבלה הוא מופיע בשורה משלו, אבל בלי מקום: הוא לא תופס מדליה ולא דוחף
//   שחקן אמיתי מקום אחד למטה.
// - הוא מהמר מיד כשהשבוע מופעל, משלים משחקים שנוספו אחר כך, ושעה לפני
//   הנעילה מעדכן את כל ההימורים לפי הנתונים והיחסים העדכניים.
// - התוצאה שהוא בוחר היא הכי משתלמת בשיטת הניקוד של אותו משחק (כולל יחסים
//   אם הוזנו), לא סתם התוצאה הכי סבירה.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Week = require('../models/Week');
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const { predictMatch, pickForScoring } = require('./matchPredictor');
const { lockModeOf, isMatchOpen, matchLockAt } = require('./betLock');

const BOT_USERNAME = 'mccannkey';
const BOT_NAME = 'McCannkey';
const FINAL_LEAD_MS = 75 * 60 * 1000; // העדכון האחרון: עד שעה ורבע לפני הנעילה
const FALLBACK = { home: 1, away: 1 };

let cachedBotId = null;

const ensureBot = async () => {
  let bot = await User.findOne({ username: BOT_USERNAME });
  if (!bot) {
    // סיסמה אקראית שאף אחד לא יודע - וממילא ההתחברות חוסמת משתמש bot
    const password = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);
    bot = await User.create({ username: BOT_USERNAME, password, name: BOT_NAME, role: 'bot', nameLocked: true });
    console.log(`🐒 [mccannkey] נוצר המשתמש ${BOT_NAME}`);
  }
  cachedBotId = bot._id;
  return bot;
};

const botId = async () => cachedBotId || (await ensureBot())._id;

const swapOdds = (o) => (o ? { homeWin: o.awayWin, draw: o.draw, awayWin: o.homeWin } : null);
const hasOdds = (o) => Boolean(o && (o.homeWin || o.draw || o.awayWin));

// הניחוש למשחק אחד, בכיוון שלנו (team1 - team2), ומאיפה הוא הגיע
const pickForMatch = async (match) => {
  const scoringOdds = hasOdds(match.odds) ? match.odds : null;
  if (match.externalId && String(match.externalId).startsWith('365_')) {
    try {
      const scores365Api = require('./scores365Api');
      const { detectOrientation } = require('../utils/teamMatch');
      const ins = await scores365Api.fetchTeamInsights(match.externalId);
      const pred = ins && ins.prediction;
      if (pred) {
        const { flipped } = detectOrientation(match.team1, match.team2, ins.home?.name, ins.away?.name);
        // צפי השערים בכיוון שלנו
        const e1 = flipped ? pred.expectedAway : pred.expectedHome;
        const e2 = flipped ? pred.expectedHome : pred.expectedAway;
        const best = pickForScoring(e1, e2, scoringOdds);
        if (best) return { team1Goals: best.home, team2Goals: best.away, source: '365' };
      }
    } catch (err) {
      console.warn(`⚠️ [mccannkey] אין תחזית ל-${match.team1} - ${match.team2}:`, err.message);
    }
  }
  // בלי נתונים מ-365: אם הוזנו יחסים - תחזית מהיחסים בלבד
  if (scoringOdds && scoringOdds.homeWin && scoringOdds.draw && scoringOdds.awayWin) {
    const pred = predictMatch({ odds: scoringOdds });
    const best = pred && pickForScoring(pred.expectedHome, pred.expectedAway, scoringOdds);
    if (best) return { team1Goals: best.home, team2Goals: best.away, source: 'odds' };
  }
  return { team1Goals: FALLBACK.home, team2Goals: FALLBACK.away, source: 'fallback' };
};

const isOpen = (week, now) =>
  week && week.active && !week.locked && week.lockTime && new Date(week.lockTime).getTime() > now.getTime();

const finished = (m) => m.result && m.result.team1Goals != null && m.result.team2Goals != null;

/**
 * מהמר על משחקי השבוע. all=false - רק משחקים שעוד אין לו עליהם הימור.
 * מחזיר כמה הימורים נכתבו.
 */
const betWeek = async (weekId, { all = false, refreshDue = false, now = new Date() } = {}) => {
  const week = await Week.findById(weekId).lean();
  if (!isOpen(week, now)) return 0;
  const uid = await botId();
  const allMatches = await Match.find({ weekId: week._id }).lean();
  // רק משחקים שעוד אפשר להמר עליהם (בנעילה לפי משחק - שעוד לא התחילו)
  const matches = allMatches.filter((m) => !finished(m) && isMatchOpen(week, m, allMatches, now.getTime()));
  const myBets = await Bet.find({ userId: uid, weekId: week._id }, 'matchId updatedAt').lean();
  const existing = new Map(myBets.map((b) => [String(b.matchId), b]));
  // refreshDue: משחק שמתחיל בעוד פחות משעה ורבע, וההימור עליו ישן יותר מזה
  const due = (m) => {
    const at = matchLockAt(week, m, allMatches);
    const b = existing.get(String(m._id));
    return at != null && at - now.getTime() <= FINAL_LEAD_MS && (!b || new Date(b.updatedAt).getTime() < at - FINAL_LEAD_MS);
  };
  const todo = all ? matches : matches.filter((m) => !existing.has(String(m._id)) || (refreshDue && due(m)));
  let written = 0;
  const sources = {};
  for (const m of todo) {
    const pick = await pickForMatch(m);
    sources[pick.source] = (sources[pick.source] || 0) + 1;
    await Bet.findOneAndUpdate(
      { userId: uid, matchId: m._id },
      {
        $set: { prediction: { team1Goals: pick.team1Goals, team2Goals: pick.team2Goals }, weekId: week._id, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );
    written++;
  }
  if (written) console.log(`🐒 [mccannkey] ${week.name}: ${written} הימורים (${JSON.stringify(sources)})${all || refreshDue ? ' - כולל עדכון לפני נעילה' : ''}`);
  return written;
};

// רץ כל כמה דקות: משלים הימורים חסרים בכל שבוע פתוח, ושעה ורבע לפני
// הנעילה מעדכן את הכל פעם אחת (הסימון נשמר על השבוע ושורד הפעלה מחדש)
const runMcCannkey = async (now = new Date()) => {
  const weeks = await Week.find({ active: true, locked: false, lockTime: { $gt: now } }).lean();
  for (const w of weeks) {
    try {
      if (lockModeOf(w) === 'match') {
        // כל משחק מתעדכן בנפרד כשעה ורבע לפני הפתיחה שלו
        await betWeek(w._id, { refreshDue: true, now });
        continue;
      }
      const msLeft = new Date(w.lockTime).getTime() - now.getTime();
      if (msLeft <= FINAL_LEAD_MS && !w.mccannkeyFinalAt) {
        await betWeek(w._id, { all: true, now });
        await Week.updateOne({ _id: w._id }, { $set: { mccannkeyFinalAt: new Date() } });
      } else {
        await betWeek(w._id, { now });
      }
    } catch (err) {
      console.error(`❌ [mccannkey] שבוע ${w.name}:`, err.message);
    }
  }
};

module.exports = { ensureBot, betWeek, runMcCannkey, pickForMatch, BOT_USERNAME, BOT_NAME };
