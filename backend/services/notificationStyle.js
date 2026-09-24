// האופי הפיזי של כל סוג התראה: קצב רטט, וכפתורי פעולה.
//
// רטט הוא ערוץ המידע היחיד בהתראה שבאמת יכול לנוע - תמונה מונפשת מוצגת
// כפריים בודד - ולכן קצב ייחודי לכל סוג הוא הדרך לדעת מה קרה עוד לפני
// שמוציאים את הטלפון מהכיס. המערך מתחלף: [רטט, הפסקה, רטט, ...]
//
// אפל לא מממשת vibrate ו-actions בכלל (ראה ההערה ב-pushNotifications),
// ולכן שם זה פשוט לא יופיע.

const GOAL = [90, 60, 90, 60, 400];      // טה-טה-טאאם, כמו קריאה ביציע
const RED = [350, 150, 350];             // שתי חבטות ארוכות - משהו רע קרה
const START = [150];                     // נקישה אחת קצרה
const END = [200, 100, 200];             // שתיים מדודות
const EXACT = [70, 50, 70, 50, 70, 50, 450]; // חגיגי: שלוש קצרות ואז החזקה
const NUDGE = [120, 80, 120, 80, 120];   // דפיקה מתמשכת בדלת
const CANCELLED = [60, 40, 60, 40, 60, 40, 60];  // גמגום קצר - משהו נלקח בחזרה
const DEFAULT = [200, 100, 200];

// כפתור על ההתראה עצמה. ה-url נשלח לצדו כדי שה-service worker יישאר
// גנרי ולא יצטרך להכיר את סוגי ההתראות
const toLive = { action: 'live', title: '📊 לטבלה', url: '/#/leaderboard' };
const toBet = { action: 'bet', title: '⚽ להמר עכשיו', url: '/#/betting' };

const STYLES = {
  match_goal: { vibrate: GOAL, actions: [toLive] },
  // רטט הפוך במובן מסוים לשער: קצר ומקוטע, כדי שההבדל יורגש בכיס
  match_goalCancelled: { vibrate: CANCELLED, actions: [toLive] },
  match_red: { vibrate: RED, actions: [toLive] },
  match_start: { vibrate: START, actions: [toLive] },
  match_end: { vibrate: END, actions: [toLive] },
  exact_score: { vibrate: EXACT, actions: [toLive] },
  'lock-reminder': { vibrate: NUDGE, actions: [toBet] },
  nudge: { vibrate: NUDGE, actions: [toBet] },
  week_activated: { vibrate: NUDGE, actions: [toBet] }
};

/**
 * מחזיר את תוספות ה-payload לפי סוג ההתראה שב-data.type.
 * סוג לא מוכר מקבל את ברירת המחדל הקיימת, כך שאף קורא לא נשבר.
 */
function styleFor(type) {
  const style = STYLES[type];
  if (!style) return { vibrate: DEFAULT, actions: [], actionUrls: {} };

  return {
    vibrate: style.vibrate,
    // הכפתור שנשלח למכשיר נושא רק action ו-title. ה-url נשאר בצד
    actions: style.actions.map(({ action, title }) => ({ action, title })),
    actionUrls: Object.fromEntries(style.actions.map((a) => [a.action, a.url]))
  };
}

module.exports = { styleFor, GOAL, RED, START, END, EXACT, NUDGE, DEFAULT };
