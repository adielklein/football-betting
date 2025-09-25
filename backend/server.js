const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

// CORS Configuration
app.use(cors({
  origin: [
    'https://football-betting-frontend.onrender.com',
    'https://football-betting-app.onrender.com', 
    'http://localhost:3000' // לפיתוח
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// 🆕 Migration endpoint - להוספת שדה theme למשתמשים קיימים
app.post('/api/migrate/add-theme-field', async (req, res) => {
  try {
    console.log('🔄 Starting theme field migration...');
    
    const User = require('./models/User');
    
    // עדכן רק משתמשים שאין להם שדה theme
    const result = await User.updateMany(
      { theme: { $exists: false } },
      { $set: { theme: 'default' } }
    );
    
    console.log(`✅ Updated ${result.modifiedCount} users with theme field`);
    
    // החזר את כל המשתמשים עם הtheme החדש
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
    
    // בדיקת כמות משתמשים
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

app.use('/api/auth', authRoutes);
app.use('/api/weeks', weeksRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/bets', betsRoutes);
app.use('/api/scores', scoresRoutes);

// Debug endpoint
app.get('/api/debug', async (req, res) => {
  try {
    const stats = {
      users: 0,
      weeks: 0,
      matches: 0,
      bets: 0,
      scores: 0,
      mongoConnection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      mongoHost: mongoose.connection.host || 'Unknown'
    };
    
    // ספירת רשומות
    try {
      const User = require('./models/User');
      const Week = require('./models/Week');
      const Match = require('./models/Match');
      const Bet = require('./models/Bet');
      const Score = require('./models/Score');
      
      stats.users = await User.countDocuments();
      stats.weeks = await Week.countDocuments();
      stats.matches = await Match.countDocuments();
      stats.bets = await Bet.countDocuments();
      stats.scores = await Score.countDocuments();
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
      auth: '/api/auth/*',
      weeks: '/api/weeks/*',
      matches: '/api/matches/*',
      bets: '/api/bets/*',
      scores: '/api/scores/*'
    }
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 Auth System: Username/Password`);
  console.log(`🔍 Debug URL: http://localhost:${PORT}/api/debug`);
  console.log(`🔄 Migration URL: http://localhost:${PORT}/api/migrate/add-theme-field`);
});