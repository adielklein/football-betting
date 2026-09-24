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

  // זהות הקבוצות אצל הספק שממנו יובא המשחק (365). עד עכשיו נשמר רק השם,
  // והסמלים התגלו מחדש בצד הלקוח מול Google Favicon/TheSportsDB - מקור אחר
  // לגמרי מזה שממנו הגיע המשחק. הסמל והמזהה מגיעים כבר בייבוא, ולכן נשמרים
  team1LogoUrl: { type: String, default: null },
  team2LogoUrl: { type: String, default: null },
  team1ExternalId: { type: String, default: null },
  team2ExternalId: { type: String, default: null },

  // תמונת המצב האחרונה שנראתה בסריקה החיה. ממנה נגזרים אירועי שער/אדום/
  // פתיחה/סיום, והיא נשמרת כאן ולא בזיכרון כדי שהפעלה מחדש של השרת לא
  // תשלח שוב התראה שכבר יצאה
  // הסיבוב אצל הספק: "מחזור 5", "שלב הבתים", "רבע גמר". בגביע שני
  // משחקים של אותן קבוצות נראים זהים בלעדיו
  round: { type: String, default: null },

  // המשחק נדחה או ננטש לפי הספק. סימון ולא מחיקה: ההחלטה מה לעשות עם
  // משחק דחוי היא של המנהל, והמסך רק צריך לומר לו שזה המצב
  postponed: { type: Boolean, default: false },
  postponedText: { type: String, default: null },

  liveSnapshot: {
    status: { type: String, default: null },
    team1Goals: { type: Number, default: null },
    team2Goals: { type: Number, default: null },
    team1Reds: { type: Number, default: null },
    team2Reds: { type: Number, default: null }
  },

  // חתימות האירועים שכבר יצאה עליהם התראה על המשחק הזה. תמונת המצב לבדה
  // אינה מספיקה: היא אומרת מה המצב עכשיו, ואם הספק מדווח רגע אחד "טרם
  // החל" ורגע אחרי "מתנהל" - היא רואה שריקת פתיחה נוספת ושולחת שוב.
  // הרשימה הזו אומרת מה כבר נשלח, והכתיבה אליה אטומית, ולכן "המשחק
  // התחיל" יוצא פעם אחת בדיוק - גם מול דיווח מתנדנד, גם אחרי הפעלה
  // מחדש של השרת וגם אם שתי סריקות רצות במקביל
  notifiedEvents: { type: [String], default: [] },

  // יומן קצר של מה שהסריקה החיה ראתה ועשתה במשחק הזה: כל שינוי מצב מהספק,
  // כל התראה שיצאה וכל אחת שנחסמה. בלעדיו כל בירור של "למה קיבלתי את זה
  // שוב" מסתיים בלוגים של Render, שגם נמחקים אחרי כמה ימים. מוגבל ל-40
  // הרשומות האחרונות, ונכתב רק כשבאמת קרה משהו
  liveLog: {
    type: [{
      at: { type: Date, default: Date.now },
      kind: { type: String },   // status | sent | blocked
      detail: { type: String }
    }],
    default: []
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
    team2Goals: { type: Number },
    // תוצאה סופית כולל הארכה/פנדלים (רק אם המשחק עבר ל-ET)
    // התוצאה הראשית (team1Goals/team2Goals) היא תמיד ה-90 דקות
    finalScore: {
      team1Goals: { type: Number },
      team2Goals: { type: Number },
      penalties: {
        team1: { type: Number },
        team2: { type: Number }
      }
    }
  },

  // 🆕 יחסים (Odds) - אופציונלי
  odds: {
    homeWin: { type: Number, min: 1 },   // יחס לניצחון בית
    draw: { type: Number, min: 1 },       // יחס לתיקו
    awayWin: { type: Number, min: 1 }     // יחס לניצחון חוץ
  },
  
  // 🆕 מקור חיצוני - לעדכון תוצאות אוטומטי
  externalId: { type: String, default: null },           // מזהה המשחק אצל הספק
  externalProvider: { type: String, default: null },      // 365scores / football-data.org / ...
  resultSource: { type: String, default: null },          // 'manual' / 'auto:365scores' / ...
  resultUpdatedAt: { type: Date, default: null },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

// אינדקס לשאילתות מהירות
matchSchema.index({ weekId: 1, leagueId: 1 });

module.exports = mongoose.model('Match', matchSchema);