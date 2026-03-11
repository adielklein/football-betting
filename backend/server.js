const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const notificationRoutes = require('./routes/notifications');
require('dotenv').config();

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
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); 
app.use('/api/notifications', notificationRoutes);

// 🆕 Migration endpoint - להוספת שדה theme למשתמשים קיימים
app.post('/api/migrate/add-theme-field', async (req, res) => {
  try {
    console.log('🔄 Starting theme field migration...');
    
    const User = require('./models/User');
    
    const result = await User.updateMany(
      { theme: { $exists: false } },
      { $set: { theme: 'default' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users with theme field`);
    
    const allUsers = await User.find({}).select('name username role theme');
    
    res.json({
      success: true,
      message: `Migration completed successfully. Updated ${result.modifiedCount} users.`,
      modifiedCount: result.modifiedCount,
      users: allUsers
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    res.status(500).json({
      success: false,
      message: 'Migration failed: ' + error.message,
      error: error.message
    });
  }
});

// 🔧 בדיקת subscriptions לפני ניקוי
app.get('/api/admin/check-subscriptions', async (req, res) => {
  try {
    const User = require('./models/User');
    const allUsers = await User.find({}, 'name username pushSettings');
    
    const problematicUsers = allUsers.filter(user => {
      const hasEnabled = user.pushSettings?.enabled;
      const hasSubscription = user.pushSettings?.subscription;
      const isSubscriptionEmpty = hasSubscription && 
        (hasSubscription === null || 
         typeof hasSubscription !== 'object' ||
         Object.keys(hasSubscription).length === 0);
      
      return hasEnabled && isSubscriptionEmpty;
    });

    res.json({
      success: true,
      totalUsers: allUsers.length,
      problematicCount: problematicUsers.length,
      problematicUsers: problematicUsers.map(u => ({
        name: u.name,
        username: u.username,
        enabled: u.pushSettings?.enabled,
        subscription: u.pushSettings?.subscription
      }))
    });

  } catch (error) {
    console.error('❌ Error checking subscriptions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 🔧 ניקוי subscriptions ריקים - Route זמני!
// ⚠️ הסר את זה אחרי שימוש!
app.post('/api/admin/cleanup-subscriptions', async (req, res) => {
  try {
    console.log('🔧 Starting subscriptions cleanup...');

    const User = require('./models/User');
    
    // מצא כל המשתמשים
    const allUsers = await User.find({});
    console.log(`📊 Found ${allUsers.length} users`);

    let cleanedCount = 0;
    const cleanedUsers = [];

    for (const user of allUsers) {
      const hasEnabled = user.pushSettings?.enabled;
      const hasSubscription = user.pushSettings?.subscription;
      const isSubscriptionEmpty = hasSubscription && 
        (hasSubscription === null || 
         typeof hasSubscription !== 'object' ||
         Object.keys(hasSubscription).length === 0);

      // אם enabled = true אבל subscription ריק - תקן את זה
      if (hasEnabled && isSubscriptionEmpty) {
        console.log(`🔧 Fixing: ${user.name} (@${user.username})`);
        
        await User.findByIdAndUpdate(user._id, {
          'pushSettings.enabled': false,
          'pushSettings.subscription': null
        });
        
        cleanedUsers.push({
          name: user.name,
          username: user.username,
          before: { enabled: hasEnabled, subscription: hasSubscription },
          after: { enabled: false, subscription: null }
        });
        
        cleanedCount++;
      }
    }

    // הצג סטטיסטיקות מעודכנות
    const totalUsers = await User.countDocuments();
    const enabledUsers = await User.countDocuments({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    const stats = {
      totalUsers,
      enabledUsers,
      disabledUsers: totalUsers - enabledUsers,
      percentage: totalUsers > 0 ? Math.round((enabledUsers / totalUsers) * 100) : 0
    };

    console.log('✅ Cleanup completed successfully!');

    res.json({
      success: true,
      message: `ניקוי הסתיים בהצלחה! תוקנו ${cleanedCount} משתמשים`,
      cleanedCount,
      cleanedUsers,
      stats,
      instructions: 'עכשיו רענן את דף ניהול ההתראות - המספרים צריכים להתאים!'
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

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

app.use('/api/upload', uploadRouter);
app.use('/api/stats', statsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/weeks', weeksRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/scores', scoresRoutes);
app.use('/api/leagues', leaguesRoutes);

// Debug endpoint
app.get('/api/debug', async (req, res) => {
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
      migrate: '/api/migrate/add-theme-field',
      checkSubscriptions: '/api/admin/check-subscriptions',
      cleanupSubscriptions: '/api/admin/cleanup-subscriptions',
      auth: '/api/auth/*',
      weeks: '/api/weeks/*',
      matches: '/api/matches/*',
      bets: '/api/bets/*',
      scores: '/api/scores/*',
      leagues: '/api/leagues/*'
    }
  });
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
      fetch(`${RENDER_URL}/api/debug`)
        .then(() => console.log('🏓 Keep-alive ping sent'))
        .catch(() => console.log('🏓 Keep-alive ping failed (will retry)'));
    }, 14 * 60 * 1000);
    console.log('🏓 Keep-alive enabled: pinging every 14 min (paused 01:00-07:00 IST)');
  }
});