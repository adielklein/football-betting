const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// CORS - עדכון ל-production frontend
app.use(cors({
  origin: 'https://football-betting-app.onrender.com',
  credentials: true
}));

app.use(express.json());

// Session middleware - חייב להיות לפני passport
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // true רק עבור HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 שעות
  }
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// חיבור למונגו עם בדיקה מפורטת
const connectMongoDB = async () => {
  try {
    console.log('🔄 Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGODB_URI ? 'SET' : 'NOT SET');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI is not set in environment variables!');
      return;
    }
    
    // נסיון חיבור
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // בדיקת כמות משתמשים
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    console.log(`✅ MongoDB connected successfully! Users in DB: ${userCount}`);
    
    // בדיקת כמות שבועות
    const Week = require('./models/Week');
    const weekCount = await Week.countDocuments();
    console.log(`📅 Weeks in DB: ${weekCount}`);
    
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
  }
};

// הפעל את החיבור
connectMongoDB();

// Import routes
const authRoutes = require('./routes/auth');
const weekRoutes = require('./routes/weeks');
const matchRoutes = require('./routes/matches');
const betRoutes = require('./routes/bets');
const scoreRoutes = require('./routes/scores');

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/weeks', weekRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/bets', betRoutes);
app.use('/api/scores', scoreRoutes);

// Debug endpoint לבדיקת המערכת
app.get('/api/debug', async (req, res) => {
  try {
    const User = require('./models/User');
    const Week = require('./models/Week');
    const Match = require('./models/Match');
    const Bet = require('./models/Bet');
    const Score = require('./models/Score');
    
    const stats = {
      users: await User.countDocuments(),
      weeks: await Week.countDocuments(),
      matches: await Match.countDocuments(),
      bets: await Bet.countDocuments(),
      scores: await Score.countDocuments(),
      mongoConnection: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
      mongoHost: mongoose.connection.host || 'Unknown'
    };
    
    res.json({
      status: 'OK',
      timestamp: new Date(),
      database: stats
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message,
      stack: error.stack,
      timestamp: new Date()
    });
  }
});

// Test endpoints
app.get('/api/setup', async (req, res) => {
  try {
    const User = require('./models/User');
    await User.deleteMany({});
    
    const users = await User.insertMany([
      { name: 'Ediel Klein', email: 'ediel@example.com', role: 'admin' },
      { name: 'Guy Yariv', email: 'guy@example.com', role: 'player' }
    ]);
    
    res.json({ message: 'Setup complete', users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/', (req, res) => {
  res.json({ 
    message: 'Football Betting API with Google OAuth!',
    status: 'Running',
    endpoints: {
      debug: '/api/debug',
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
  console.log(`Server running on port ${PORT}`);
  console.log(`🌐 Main URL: http://localhost:${PORT}`);
  console.log(`🔍 Debug URL: http://localhost:${PORT}/api/debug`);
});