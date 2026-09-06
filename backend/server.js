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
  return Week.find({ _id: { $in: candidateIds }, locked: false });
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

const runResultsSync = async () => {
  try {
    const RENDER_URL = process.env.NODE_ENV === 'development'
      ? `http://localhost:${process.env.PORT || 5000}`
      : 'https://football-betting-backend.onrender.com';
    const weeks = await findWeeksToSync();
    if (weeks.length === 0) return;
    console.log(`🕐 [CRON] sync-results: scanning ${weeks.length} relevant week(s)`);
    for (const w of weeks) {
      try {
        const r = await fetch(`${RENDER_URL}/api/external/sync-results/${w._id}`, { method: 'POST', headers: { 'X-Internal-Token': INTERNAL_TOKEN } });
        const j = await r.json().catch(() => null);

        // תוצאות שנכנסו אך הניקוד מעולם לא רץ עליהן. קורה אם חישוב הניקוד
        // נכשל, נפל ב-timeout, או שהתוצאות נכתבו בלי שהחישוב הופעל אחריהן.
        // בלי הבדיקה הזו הנקודות נשארות 0 לנצח - הסנכרון הבא כבר לא מוצא
        // מה לעדכן ולכן לעולם לא מפעיל חישוב.
        const stale = await weekHasUnscoredResults(w);

        if (j?.updated > 0 || stale) {
          const reason = j?.updated > 0 ? `updated ${j.updated}` : 'unscored results found';
          console.log(`🕐 [CRON] week ${w.name}: ${reason}, calculating scores...`);
          // מתריעים רק על תוצאות שנכנסו בריצה הזו. תיקון רטרואקטיבי של
          // ניקוד ישן מתבצע בשקט, בלי להציף התראות על משחקים מלפני ימים.
          await fetch(`${RENDER_URL}/api/scores/calculate/${w._id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Internal-Token': INTERNAL_TOKEN },
            body: JSON.stringify({ matchIds: j?.updatedMatchIds || [] })
          });
        }
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