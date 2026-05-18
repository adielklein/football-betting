const mongoose = require('mongoose');

const leagueSchema = new mongoose.Schema({
  // שם הליגה בעברית (לתצוגה)
  name: { 
    type: String, 
    required: [true, 'שם הליגה נדרש'],
    trim: true,
    minlength: [2, 'שם הליגה חייב להיות לפחות 2 תווים']
  },
  
  // מזהה ייחודי באנגלית (למערכת)
  key: { 
    type: String, 
    required: [true, 'מפתח ליגה נדרש'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9_-]+$/, 'מפתח יכול להכיל רק אותיות אנגלית קטנות, מספרים, - ו-_']
  },
  
  // צבע הליגה (לעיצוב)
  color: { 
    type: String, 
    required: [true, 'צבע ליגה נדרש'],
    default: '#6c757d',
    match: [/^#[0-9A-Fa-f]{6}$/, 'צבע חייב להיות בפורמט HEX (#RRGGBB)']
  },
  
  // סוג הליגה (לסינון)
  type: {
    type: String,
    enum: ['club', 'national', 'other'],
    default: 'club'
  },
  
  // ארץ/אזור
  region: {
    type: String,
    trim: true
  },
  
  // האם הליגה פעילה
  active: { 
    type: Boolean, 
    default: true 
  },
  
  // סדר תצוגה
  order: {
    type: Number,
    default: 0
  },

  // מזהה הליגה ב-API-Football (לייבוא משחקים אוטומטי)
  apiFootballId: {
    type: Number,
    default: null
  },

  // קוד הליגה ב-football-data.org (PL, PD, SA, BL1, FL1, CL וכו')
  footballDataCode: {
    type: String,
    trim: true,
    uppercase: true,
    default: null
  },

  // קוד הליגה ב-ESPN API נסתר (isr.1, eng.fa, uefa.europa, וכו')
  espnLeagueCode: {
    type: String,
    trim: true,
    default: null
  },

  // מזהה ה-tournament ב-SofaScore (266 = Israeli Premier League, 370 = State Cup)
  sofaScoreTournamentId: {
    type: Number,
    default: null
  },

  createdAt: {
    type: Date, 
    default: Date.now 
  },
  
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// אינדקס לחיפוש מהיר
leagueSchema.index({ key: 1, active: 1 });

// עדכון updatedAt אוטומטי
leagueSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

leagueSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('League', leagueSchema);