const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'player'],
    default: 'player'
  },
  theme: {
    type: String,
    default: 'default'
  },
  pushSettings: {
    enabled: { 
      type: Boolean, 
      default: false 
    },
    // 🔧 תמיכה בשני המבנים:
    subscription: {  // ישן - למשתמשים שעדיין לא עברו migration
      type: Object 
    },
    subscriptions: [{  // חדש - תמיכה במספר מכשירים
      type: Object 
    }],
    hoursBeforeLock: { 
      type: Number, 
      default: 2 
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    exactScoreAlerts: {
      type: Boolean,
      default: true
    },

    // התראות אירועים במשחק חי. כולן כבויות כברירת מחדל ונדלקות רק בבחירה
    // מפורשת של המשתמש - אלה ההתראות התכופות ביותר במערכת, ושער אחד
    // בשבוע עמוס יכול להגיע לעשרות הודעות
    goalAlerts: {
      type: Boolean,
      default: false
    },
    redCardAlerts: {
      type: Boolean,
      default: false
    },
    matchStartAlerts: {
      type: Boolean,
      default: false
    },
    matchEndAlerts: {
      type: Boolean,
      default: false
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);