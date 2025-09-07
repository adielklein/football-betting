const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// CORS - תיקון מלא לproduction OAuth
app.use(cors({
  origin: [
    'https://football-betting-app.onrender.com',
    'https://football-betting-backend.onrender.com',
    'http://localhost:3000' // לפיתוח
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'Set-Cookie'],
  exposedHeaders: ['Set-Cookie']
}));

app.use(express.json());

// Session middleware - תיקון מלא לproduction HTTPS
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'football-betting-session',
  cookie: { 
    secure: true, // חובה לHTTPS production
    sameSite: 'none', // חובה לcross-domain OAuth
    maxAge: 24 * 60 * 60 * 1000, // 24 שעות
    httpOnly: true,
    domain: undefined // לא מגדיר domain ספציפי
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
      database: stats,
      environment: process.env.NODE_ENV || 'development',
      sessionConfig: {
        secure: true,
        sameSite: 'none',
        httpOnly: true
      }
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
      { name: 'Ediel Klein', email: 'adielklein@gmail.com', role: 'admin' },
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
    environment: process.env.NODE_ENV || 'development',
    cors: 'Configured for production',
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
  console.log(`🌐 Environment: production`);
  console.log(`🔒 CORS configured for: football-betting-app.onrender.com`);
  console.log(`🍪 Cookies: secure=true, sameSite=none`);
  console.log(`🔍 Debug URL: https://football-betting-backend.onrender.com/api/debug`);
});