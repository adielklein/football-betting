const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Week name is required'],
    trim: true,
    minlength: [1, 'Week name cannot be empty'],
    maxlength: [100, 'Week name is too long']
  },
  month: { 
    type: Number, 
    required: [true, 'Month is required'],
    min: [1, 'Month must be at least 1'],
    max: [12, 'Month cannot be more than 12']
  },
  season: {
    type: String,
    required: [true, 'Season is required'],
    default: '2026-27',
    trim: true
  },
  active: { 
    type: Boolean, 
    default: false 
  },
  locked: { 
    type: Boolean, 
    default: false 
  },
  lockTime: { 
    type: Date 
  },
  // 'match' = כל משחק נסגר בשעת הפתיחה שלו; 'week' = כל השבוע יחד ב-lockTime.
  // בלי ברירת מחדל בסכמה בכוונה: שבוע ישן בלי השדה הוא 'week' (services/betLock),
  // ו-default היה הופך אותו ל-'match' בכל קריאה. שבוע חדש מקבל 'match' ביצירה
  lockMode: { type: String, enum: ['match', 'week'] },
  // במצב 'match': מתי המשחק הראשון ננעל (מכאן רואים הימורים של אחרים)
  firstLockAt: { type: Date, default: null },
  // מתי חושב הניקוד לאחרונה. משמש לזיהוי שבוע שנכנסו לו תוצאות
  // אבל הניקוד מעולם לא חושב עליהן (למשל אם החישוב נכשל או קרס באמצע)
  scoresCalculatedAt: {
    type: Date,
    default: null
  },

  // מי כבר קיבל תזכורת לפני הנעילה לשבוע הזה. נשמר על השבוע ולא בזיכרון,
  // כדי שהפעלה מחדש של השרת לא תשלח את אותה תזכורת פעם שנייה.
  // מתי McCannkey עדכן את כל ההימורים לפני הנעילה (services/mccannkey.js)
  mccannkeyFinalAt: { type: Date, default: null },

  // נעילה לפי משחק: "userId:מועד" לכל תזכורת שנשלחה (services/lockReminder)
  matchRemindersSent: [{ type: String }],

  lockRemindersSent: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update updatedAt on save
weekSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Update updatedAt on findOneAndUpdate
weekSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Week', weekSchema);