const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  weekId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Week', 
    required: true 
  },
  
  // 🆕 שדה חדש - קישור לליגה במקום enum קבוע
  leagueId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'League', 
    required: true 
  },
  
  // 🔄 שומר גם את המפתח הישן לתאימות לאחור (אופציונלי)
  league: { 
    type: String 
  },
  
  team1: { 
    type: String, 
    required: true 
  },
  
  team2: { 
    type: String, 
    required: true 
  },
  
  date: { 
    type: String, 
    required: true 
  }, // "01.09" - פורמט DD.MM לתצוגה
  
  time: { 
    type: String, 
    required: true 
  }, // "17:00" - פורמט HH:MM
  
  // 🆕 תאריך מלא עם שנה נכונה (למשחקים חדשים בלבד)
  fullDate: { 
    type: Date 
  },
  
  result: {
    team1Goals: { type: Number },
    team2Goals: { type: Number }
  },

  // 🆕 יחסים (Odds) - אופציונלי
  odds: {
    homeWin: { type: Number, min: 1 },   // יחס לניצחון בית
    draw: { type: Number, min: 1 },       // יחס לתיקו
    awayWin: { type: Number, min: 1 }     // יחס לניצחון חוץ
  },
  
  notifiedExactScore: {
    type: Boolean,
    default: false
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// אינדקס לשאילתות מהירות
matchSchema.index({ weekId: 1, leagueId: 1 });

module.exports = mongoose.model('Match', matchSchema);