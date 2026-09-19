const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const notificationRoutes = require('./routes/notifications');
require('dotenv').config();
const { requireAdmin, INTERNAL_TOKEN } = require('./middleware/requireAdmin');

const app = express();

// CORS Configuration
app.use(cors({
  origin: [
    'https://football-betting-frontend.onrender.com',
    'https://football-betting-app.onrender.com', 
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Id', 'X-Internal-Token']
}));

app.use(express.json({ limit: '10mb' })); 
app.use('/api/notifications', notificationRoutes);

// חיבור למונגו
const connectMongoDB = async () => {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables!');
      return;
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully!');
    
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`👥 Found ${userCount} users in database`);
    
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
  }
};

connectMongoDB();

// Routes
const authRoutes = require('./routes/auth');
const weeksRoutes = require('./routes/weeks');
const matchesRoutes = require('./routes/matches');
const betsRoutes = require('./routes/bets');
const scoresRoutes = require('./routes/scores');
const leaguesRoutes = require('./routes/leagues');
const uploadRouter = require('./routes/upload');
const statsRoutes = require('./routes/stats');
const exclusionsRoutes = require('./routes/exclusions');
const externalRoutes = require('./routes/external');

app.use('/api/upload', uploadRouter);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/weeks', weeksRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/leagues', leaguesRoutes);
app.use('/api/exclusions', exclusionsRoutes);
app.use('/api/external', externalRoutes);

// Audit log endpoint - רק לאדמין הראשי
app.get('/api/audit', requireAdmin, async (req, res) => {
  try {
    const AuditLog = require('./models/AuditLog');
    const limit = parseInt(req.query.limit) || 500;
    const query = {};
    if (req.query.from) {
      query.createdAt = { $gte: new Date(req.query.from) };
    }
    if (req.query.to) {
      query.createdAt = { ...query.createdAt, $lte: new Date(req.query.to + 'T23:59:59.999Z') };
    }
    const logs = await AuditLog.find(query)
      .sort({ createdAt: -1 })
      .limit(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// איזו גרסה רצה כאן. Render מזריק את משתני הגיט לבד בכל דיפלוי, ולכן
// אין מה לתחזק - התשובה נכונה מעצמה. הנקודה פתוחה בלי אימות בכוונה:
// הריפו ציבורי, ה-SHA לא חושף דבר, וכל הערך שלה הוא בזמינות המיידית.
app.get('/api/version', (req, res) => {
  const uptimeSeconds = Math.round(process.uptime());
  const commit = process.env.RENDER_GIT_COMMIT || null;
  res.json({
    service: process.env.RENDER_SERVICE_NAME || 'local',
    commit,
    shortCommit: commit ? commit.slice(0, 7) : null,
    branch: process.env.RENDER_GIT_BRANCH || null,
    startedAt: new Date(Date.now() - uptimeSeconds * 1000).toISOString(),
    uptimeSeconds
  });
});

// Debug endpoint
app.get('/api/debug', requireAdmin, async (req, res) => {
  try {
    const stats = {
      users: 0,
      weeks: 0,
      matches: 0,
      bets: 0,
      scores: 0,
      leagues: 0,
      mongoConnection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      mongoHost: mongoose.connection.host || 'Unknown'
    };
    
    try {
      const User = require('./models/User');
      const Week = require('./models/Week');
      const Match = require('./models/Match');
      const Bet = require('./models/Bet');
      const Score = require('./models/Score');
      const League = require('./models/League');
      
      stats.users = await User.countDocuments();
      stats.weeks = await Week.countDocuments();
      stats.matches = await Match.countDocuments();
      stats.bets = await Bet.countDocuments();
      stats.scores = await Score.countDocuments();
      stats.leagues = await League.countDocuments();
    } catch (error) {
      console.log('Some models not found, this is normal');
    }
    
    res.json({
      status: 'OK',
      timestamp: new Date(),
      database: stats,
      environment: process.env.NODE_ENV || 'development',
      authSystem: 'Username/Password (No OAuth)'
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      timestamp: new Date()
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Football Betting API - Username/Password Authentication',
    status: 'Running',
    environment: process.env.NODE_ENV || 'development',
    authSystem: 'Username/Password',
    endpoints: {
      debug: '/api/debug',
      auth: '/api/auth/*',
      weeks: '/api/weeks/*',
      matches: '/api/matches/*',
      bets: '/api/bets/*',
      scores: '/api/scores/*',
      leagues: '/api/leagues/*'
    }
  });
});

// 🕐 Cron - סנכרון תוצאות אוטומטי כל שעה
// סורק רק שבועות שבאמת יכול להיות בהם משהו לעדכן. בעבר זה סרק כל שבוע לא
// נעול (עשרות שבועות ישנים שכבר מזמן סגורים) והפציץ את 365 בקריאות מיותרות.
const cron = require('node-cron');
const Week = require('./models/Week');
const Match = require('./models/Match');

const RECENT_DAYS = 14;

const findWeeksToSync = async () => {
  const now = new Date();
  const recentFrom = new Date(now.getTime() - RECENT_DAYS * 24 * 60 * 60 * 1000);

  const [recentIds, pendingIds] = await Promise.all([
    // משחקים שהתחילו לאחרונה - התוצאות הטריות וגם תיקונים מאוחרים
    Match.find({ fullDate: { $gte: recentFrom, $lte: now } }).distinct('weekId'),
    // משחקים שכבר התחילו ועדיין אין להם תוצאה - נדחים או כאלה שלא נתפסו
    Match.find({ fullDate: { $lt: now }, 'result.team1Goals': { $exists: false } }).distinct('weekId')
  ]);

  const candidateIds = [...new Set([...recentIds, ...pendingIds].map(String))];
  if (candidateIds.length === 0) return [];
  // בכוונה בלי סינון לפי locked: הנעילה נסגרת בבעיטת הפתיחה, בדיוק כשהתוצאות
  // מתחילות להיכנס. סינון לפי locked היה עוצר את הסנכרון של כל שבוע פעיל.
  return Week.find({ _id: { $in: candidateIds } });
};

// נעילת שבועות שזמן הנעילה שלהם עבר. עד עכשיו הדגל locked התהפך רק כשמישהו
// ניסה להמר באיחור, ולכן שבועות ישנים נשארו מסומנים כפתוחים לנצח. ההימור עצמו
// תמיד נחסם לפי lockTime, כך שזו התאמה של המצב במסד למה שכבר קורה בפועל.
const lockExpiredWeeks = async () => {
  const res = await Week.updateMany(
    { locked: false, lockTime: { $ne: null, $lte: new Date() } },
    { $set: { locked: true } }
  );
  if (res.modifiedCount > 0) {
    console.log(`🔒 [CRON] locked ${res.modifiedCount} week(s) whose lock time passed`);
  }
};

// האם יש בשבוע תוצאה שנכנסה אחרי הפעם האחרונה שחושב הניקוד
const weekHasUnscoredResults = async (week) => {
  const newest = await Match.findOne(
    { weekId: week._id, resultUpdatedAt: { $ne: null } },
    'resultUpdatedAt'
  ).sort({ resultUpdatedAt: -1 });
  if (!newest?.resultUpdatedAt) return false;
  if (!week.scoresCalculatedAt) return true;
  return newest.resultUpdatedAt > week.scoresCalculatedAt;
};

const INTERNAL_BASE = () =>
  process.env.NODE_ENV === 'development'
    ? `http://localhost:${process.env.PORT || 5000}`
    : 'https://football-betting-backend.onrender.com';

// מסנכרן תוצאות לשבוע אחד, ומחשב ניקוד אם נכנס משהו חדש.
// משמש גם את הסריקה השעתית וגם את הסריקה הדקתית של מצב חי.
const syncAndScoreWeek = async (weekId, weekName = weekId) => {
  const base = INTERNAL_BASE();
  const r = await fetch(`${base}/api/external/sync-results/${weekId}`, {
    method: 'POST',
    headers: { 'X-Internal-Token': INTERNAL_TOKEN }
  });
  const j = await r.json().catch(() => null);

  // תוצאות שנכנסו אך הניקוד מעולם לא רץ עליהן. קורה אם חישוב הניקוד
  // נכשל, נפל ב-timeout, או שהתוצאות נכתבו בלי שהחישוב הופעל אחריהן.
  // בלי הבדיקה הזו הנקודות נשארות 0 לנצח - הסנכרון הבא כבר לא מוצא
  // מה לעדכן ולכן לעולם לא מפעיל חישוב.
  const week = await Week.findById(weekId);
  const stale = week ? await weekHasUnscoredResults(week) : false;

  if (!(j?.updated > 0 || stale)) return { updated: 0, calculated: false };

  const reason = j?.updated > 0 ? `updated ${j.updated}` : 'unscored results found';
  console.log(`🔄 week ${weekName}: ${reason}, calculating scores...`);

  // מתריעים רק על תוצאות שנכנסו בריצה הזו. תיקון רטרואקטיבי של ניקוד
  // ישן מתבצע בשקט, בלי להציף התראות על משחקים מלפני ימים.
  await fetch(`${base}/api/scores/calculate/${weekId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
    body: JSON.stringify({ matchIds: j?.updatedMatchIds || [] })
  });
  return { updated: j?.updated || 0, calculated: true };
};

const runResultsSync = async () => {
  try {
    await lockExpiredWeeks().catch((e) => console.warn('🔒 [CRON] lock sweep failed:', e.message));
    const weeks = await findWeeksToSync();
    if (weeks.length === 0) return;
    console.log(`🕐 [CRON] sync-results: scanning ${weeks.length} relevant week(s)`);
    for (const w of weeks) {
      try {
        await syncAndScoreWeek(w._id, w.name);
      } catch (e) {
        console.warn(`🕐 [CRON] week ${w.name} sync failed:`, e.message);
      }
    }
  } catch (err) {
    console.error('❌ [CRON] sync-results error:', err.message);
  }
};
// כל שעה בדקה 17 (כדי לא להתנגש עם שעה עגולה ולחסוך טראפיק לאתרים אחרים)
cron.schedule('17 * * * *', runResultsSync, { timezone: 'Asia/Jerusalem' });
console.log('🕐 Cron registered: sync-results every hour at minute 17');

// 🔴 סריקת מצב חי כל 10 שניות.
//
// כל משחקי השבוע נשלפים מ-365 בבקשה אחת - לא אחת למשחק - וכשיש משחקים
// חיים 365 עצמם מחזירים ttl=5, כלומר מצפים לרענון כל 5 שניות. 10 שניות
// עדיין שמרניות מזה. הסריקה רצה אך ורק כשיש משחק בחלון שידור, כך שברוב
// שעות היממה היא לא פונה ל-365 בכלל.
//
// כישלון מול הספק מפעיל נסיגה מתרחבת (ראה liveScores), כדי שקצב גבוה לא
// יתורגם להמשך הכאה בספק שכבר סירב.
//
// היא גם מקצרת דרמטית את הזמן עד שהניקוד מתעדכן: עד עכשיו תוצאה סופית
// יכלה לחכות עד שעה שלמה לסריקה השעתית, ועכשיו היא נתפסת תוך דקה.
const liveScores = require('./services/liveScores');

// 📣 התראות אירועים במשחק חי.
//
// האירועים נגזרים מהפרש בין תמונת המצב השמורה על המשחק לזו שחזרה עכשיו,
// והתמונה החדשה נשמרת מיד אחרי השליחה - כך שהפעלה מחדש של השרת באמצע
// משחק לא שולחת שוב את אותו שער.
//
// כל ארבעת הסוגים כבויים כברירת מחדל, ולכן ברוב המקרים אין למי לשלוח
// ואפילו לא נשלפת רשימת משתמשים.
const {
  detectEvents, describeEvent, eventKey, SETTING_BY_EVENT, SNAPSHOT_FIELDS
} = require('./services/matchEvents');

// sentInThisPoll מגיע מהסבב ולא נוצר כאן: אותו משחק יכול להיות שמור בשני
// מסמכים, וגם בשני שבועות שונים - ואז אלה שתי קריאות נפרדות. זיכרון
// משותף לכל הסבב הוא מה שהופך אותן לשליחה אחת
const notifyLiveEvents = async (matches, games, sentInThisPoll = new Set()) => {
  const User = require('./models/User');
  const { sendNotificationToUsers } = require('./services/pushNotifications');
  const liveById = new Map(games.map((g) => [String(g.matchId), g]));

  for (const match of matches) {
    const live = liveById.get(String(match._id));
    if (!live) continue;

    const prev = typeof match.liveSnapshot?.toObject === 'function'
      ? match.liveSnapshot.toObject()
      : match.liveSnapshot;

    const { events, next, changed } = detectEvents(prev, live);
    if (!changed) continue;

    // התמונה נשמרת בכל מקרה, גם כשאין למי לשלוח, כי היא קו הבסיס להפרש הבא.
    //
    // הכתיבה מותנית בתמונה הקודמת ולא עיוורת: אם שתי סריקות רצות על אותו
    // משחק - שני מופעי שרת, או סבב שהתחיל לפני שהקודם הספיק לשמור - שתיהן
    // ראו את אותה תמונה ושתיהן היו שולחות את אותה התראה. כאן רק אחת מהן
    // מצליחה לכתוב, והשנייה יוצאת בלי לשלוח.
    //
    // updateOne ולא save: המסמך נשלף עם projection חלקי, וכתיבה ממוקדת של
    // השדה היחיד שהשתנה לא תלויה בשדות שלא נשלפו
    const guard = { _id: match._id };
    for (const field of SNAPSHOT_FIELDS) {
      guard[`liveSnapshot.${field}`] = prev?.[field] ?? null;
    }

    const write = await Match.updateOne(guard, { $set: { liveSnapshot: next } });
    if (write.modifiedCount === 0) {
      console.warn(`📣 [LIVE] ${match.team1} - ${match.team2}: התמונה כבר עודכנה במקביל - לא נשלח שוב`);
      continue;
    }
    match.liveSnapshot = next;

    for (const event of events) {
      // סוף משחק נשלח מחישוב הניקוד (routes/scores.js) ולא מכאן, כי שם
      // כבר ידוע כמה נקודות כל אחד הרוויח ומי קלע בול. שליחה גם כאן הייתה
      // מייצרת התראה כפולה, ובלי הניקוד
      if (event.type === 'end') continue;

      const setting = SETTING_BY_EVENT[event.type];
      if (!setting) continue;

      const key = eventKey(event);

      const sharedKey = `${match.externalId}|${key}`;
      if (sentInThisPoll.has(sharedKey)) {
        console.warn(`📣 [LIVE] ${event.type} כפול ל-${match.team1} - ${match.team2} (אותו משחק שמור פעמיים) - לא נשלח שוב`);
        continue;
      }
      sentInThisPoll.add(sharedKey);

      try {
        const recipients = await User.find(
          { role: { $ne: 'admin' }, 'pushSettings.enabled': true, [`pushSettings.${setting}`]: true },
          '_id'
        );
        if (recipients.length === 0) continue;

        const text = describeEvent(event, match.team1, match.team2);
        if (!text) continue;

        // ההתראה נתפסת לפני שהיא נשלחת, בכתיבה אחת אטומית: התנאי הוא
        // שהחתימה עוד לא ברשימה, ולכן רק הקורא הראשון מצליח לכתוב. זה מה
        // שהופך "המשחק התחיל" לחד-פעמי באמת - גם אם הספק ידווח שוב "טרם
        // החל" ואז "מתנהל", גם אחרי הפעלה מחדש של השרת וגם אם שתי סריקות
        // רצות במקביל. תמונת המצב לבדה רואה כל תנודה כשריקת פתיחה חדשה.
        //
        // נתפסת רק כשבאמת עומדים לשלוח: אם אף אחד לא ביקש את ההתראה הזו
        // אין מה לסמן, ומי שיפעיל אותה באמצע המשחק עדיין יקבל את הבא
        const claim = await Match.updateOne(
          { _id: match._id, notifiedEvents: { $ne: key } },
          { $addToSet: { notifiedEvents: key } }
        );
        if (claim.modifiedCount === 0) {
          console.warn(`📣 [LIVE] ${event.type} כבר נשלח ל-${match.team1} - ${match.team2} - לא נשלח שוב`);
          continue;
        }

        await sendNotificationToUsers(
          recipients.map((u) => u._id),
          text.title,
          text.body,
          {
            type: `match_${event.type}`,
            matchId: String(match._id),
            // החתימה נושאת את המזהה החיצוני ולא את מזהה המסמך, כדי ששני
            // מסמכים לאותו משחק יישאו את אותו tag ויתלכדו על המכשיר
            dedupeKey: `${match.externalId}:${key}`
          }
        );
        console.log(`📣 [LIVE] ${event.type}: ${match.team1} - ${match.team2} → ${recipients.length} משתמשים`);
      } catch (err) {
        // התראה שנכשלה לא אמורה לעצור את הסריקה או את חישוב הניקוד.
        // התפיסה משוחררת כדי שהסריקה הבאה תנסה שוב - אחרת אירוע שנכשל
        // ברשת היה נחשב "כבר נשלח" ולא היה יוצא לעולם
        await Match.updateOne({ _id: match._id }, { $pull: { notifiedEvents: key } });
        console.warn(`📣 [LIVE] שליחת ${event.type} נכשלה:`, err.message);
      }
    }
  }
};

let livePollInFlight = false;

const runLivePoll = async () => {
  if (livePollInFlight) return;

  // בזמן נסיגה אחרי כישלון לא נוגעים בכלום: לא בספק, לא במסד, וגם לא
  // ב-cache - invalidate היה מוחק את התשובה האחרונה שמסך השחקנים מגיש
  if (liveScores.inBackoff()) return;

  livePollInFlight = true;
  try {
    const now = Date.now();
    // מועמדים לפי תאריך בלבד, כדי לא לשלוף את כל המשחקים בכל דקה
    const from = new Date(now - 4 * 60 * 60 * 1000);
    const to = new Date(now + 10 * 60 * 1000);
    const candidates = await Match.find(
      { fullDate: { $gte: from, $lte: to }, externalId: { $ne: null } },
      'weekId externalId fullDate result team1 team2 liveSnapshot'
    );
    const inWindow = candidates.filter((m) => liveScores.inBroadcastWindow(m, now));
    if (inWindow.length === 0) return;

    // אותו משחק שמור בשני מסמכים - באותו שבוע או בשניים - הוא מקור להתראה
    // כפולה וגם לניקוד כפול, והוא לא נראה בשום מסך אחד. מדווח כאן כדי
    // שאפשר יהיה למצוא אותו במקום לנחש
    const copies = new Map();
    for (const m of inWindow) {
      const id = String(m.externalId);
      copies.set(id, (copies.get(id) || 0) + 1);
    }
    for (const m of inWindow) {
      if (copies.get(String(m.externalId)) > 1) {
        console.warn(`⚠️ [LIVE] ${m.team1} - ${m.team2} שמור יותר מפעם אחת (שבוע ${m.weekId}, מסמך ${m._id})`);
      }
    }

    // משותף לכל השבועות בסבב, ולא לכל שבוע בנפרד
    const sentInThisPoll = new Set();

    const byWeek = new Map();
    for (const m of inWindow) {
      const key = String(m.weekId);
      if (!byWeek.has(key)) byWeek.set(key, []);
      byWeek.get(key).push(m);
    }

    for (const [weekId, matches] of byWeek) {
      liveScores.invalidate(weekId);
      const games = await liveScores.getLiveForWeek(weekId, matches);

      await notifyLiveEvents(matches, games, sentInThisPoll);

      // משחק שהסתיים אצל הספק אך עדיין אין לו תוצאה אצלנו. הבדיקה הזו
      // אידמפוטנטית - ברגע שהתוצאה נכנסה היא כבר לא מזוהה שוב.
      const hasResult = new Map(
        matches.map((m) => [String(m._id), m.result && m.result.team1Goals != null])
      );
      const newlyFinished = games.filter((g) => g.status === 'finished' && !hasResult.get(g.matchId));
      if (newlyFinished.length === 0) continue;

      console.log(`🔴 [LIVE] ${newlyFinished.length} match(es) just finished, syncing week ${weekId}`);
      await syncAndScoreWeek(weekId);
    }
  } catch (err) {
    console.warn('🔴 [LIVE] poll failed:', err.message);
  } finally {
    livePollInFlight = false;
  }
};

// שישה שדות ולא חמישה: השדה הראשון הוא שניות. node-cron תומך בזה,
// וזו הדרך היחידה לרדת מתחת לדקה
cron.schedule('*/10 * * * * *', runLivePoll, { timezone: 'Asia/Jerusalem' });
console.log('🔴 Cron registered: live poll every 10s (only while matches are on)');

// ⏰ תזכורת לפני נעילת שבוע.
//
// האפליקציה הבטיחה את התזכורת הזו מאז ומתמיד - היא מוצגת למשתמש בהפעלת
// ההתראות ואפשר לבחור כמה שעות מראש - אבל שום קוד מעולם לא שלח אותה.
//
// כל עשר דקות ולא כל שעה, כי הבחירה היא פר-משתמש: מי שביקש שעתיים אמור
// לקבל בערך בשעתיים, לא בטווח של שעה שלמה סביבן.
const { runLockReminders } = require('./services/lockReminder');

const runReminders = async () => {
  try {
    await runLockReminders();
  } catch (err) {
    console.error('⏰ [REMINDER] failed:', err.message);
  }
};

cron.schedule('*/10 * * * *', runReminders, { timezone: 'Asia/Jerusalem' });
console.log('⏰ Cron registered: lock reminders every 10 minutes');

// בדיקה יבשה - מי היה מקבל תזכורת עכשיו, בלי לשלוח דבר. למנהלים בלבד.
app.get('/api/admin/lock-reminders/preview', requireAdmin, async (req, res) => {
  try {
    res.json(await runLockReminders({ dryRun: true }));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
require('./services/pushNotifications');
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔐 Auth System: Username/Password`);

  // Keep-alive: ping ourselves every 14 minutes to prevent Render from sleeping
  // Disabled between 01:00-07:00 Israel time to save Render hours
  if (process.env.NODE_ENV !== 'development') {
    const RENDER_URL = 'https://football-betting-backend.onrender.com';
    setInterval(() => {
      const israelHour = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour: 'numeric', hour12: false });
      const hour = parseInt(israelHour, 10);
      if (hour >= 1 && hour < 7) {
        return; // Sleep hours - don't ping
      }
      fetch(`${RENDER_URL}/`)
        .then(() => console.log('🏓 Keep-alive ping sent'))
        .catch(() => console.log('🏓 Keep-alive ping failed (will retry)'));
    }, 14 * 60 * 1000);
    console.log('🏓 Keep-alive enabled: pinging every 14 min (paused 01:00-07:00 IST)');
  }
});