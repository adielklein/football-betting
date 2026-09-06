// השוואת תוצאת משחק שהתקבלה מהספק מול מה שכבר שמור.
// הופרד מ-routes/external.js כדי שאפשר יהיה לבדוק אותו ישירות
// (ראה services/resultCompare.test.js).
//
// למה זה עדין: mongoose מממש נתיבים מקוננים שמוגדרים בסכמה גם כשאין להם ערך
// במסד, כך ש-result.finalScore יכול לחזור כאובייקט "אמיתי" עם penalties: {}
// ריק. בדיקת קיום פשוטה (if (prev.finalScore)) נותנת true גם כשאין שם כלום,
// ואז כל סנכרון מדווח על "עדכון" מדומה. הנרמול מוחק בדיוק את ההבדל הזה.

const normalizeFinalScore = (fs) => {
  if (!fs || fs.team1Goals == null || fs.team2Goals == null) return null;
  const p = fs.penalties;
  return {
    team1Goals: fs.team1Goals,
    team2Goals: fs.team2Goals,
    penalties: p && p.team1 != null && p.team2 != null ? { team1: p.team1, team2: p.team2 } : null
  };
};

// האם התוצאה שהתקבלה זהה למה שכבר שמור (כולל הארכה ופנדלים)
const sameResult = (prev, next) => {
  if (!prev || prev.team1Goals !== next.team1Goals || prev.team2Goals !== next.team2Goals) return false;
  const a = normalizeFinalScore(prev.finalScore);
  const b = normalizeFinalScore(next.finalScore);
  if (!a && !b) return true;
  if (!a || !b) return false;
  if (a.team1Goals !== b.team1Goals || a.team2Goals !== b.team2Goals) return false;
  if (!a.penalties && !b.penalties) return true;
  if (!a.penalties || !b.penalties) return false;
  return a.penalties.team1 === b.penalties.team1 && a.penalties.team2 === b.penalties.team2;
};

module.exports = { normalizeFinalScore, sameResult };
