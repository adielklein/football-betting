// איך התוצאה החיה נראית מנקודת המבט של המהמר.
//
// שלוש מדרגות, בדיוק כמו הניקוד: פגיעה מדויקת, כיוון נכון בלבד, והחמצה.
// הצבע הוא הדבר היחיד שאפשר לקרוא בלי לעצור - הוא נותן למשתמש לסרוק
// מסך של שמונה משחקים ולדעת מיד איפה הוא עומד.
//
// הפונקציה טהורה בכוונה: היא לא יודעת דבר על React, מקבלת שני זוגות
// מספרים ומחזירה מפתח. הרכיב מתרגם את המפתח לטוקנים של ערכת הצבעים.

const num = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// הכיוון: 1 מארחת, 0 תיקו, -1- אורחת. אותה השוואה שהניקוד עושה.
const direction = (a, b) => Math.sign(a - b);

// מחזיר 'exact' | 'direction' | 'miss', או null כשאין על מה להשוות -
// אין ניחוש שמור, או שהמשחק עדיין בלי תוצאה. null משמר את המראה הנייטרלי.
export function liveBetStatus(prediction, live) {
  if (!prediction || !live) return null;

  const p1 = num(prediction.team1Goals);
  const p2 = num(prediction.team2Goals);
  const l1 = num(live.team1Goals);
  const l2 = num(live.team2Goals);
  if (p1 === null || p2 === null || l1 === null || l2 === null) return null;

  if (p1 === l1 && p2 === l2) return 'exact';
  if (direction(p1, p2) === direction(l1, l2)) return 'direction';
  return 'miss';
}

export const STATUS_LABEL = {
  exact: 'בול',
  direction: 'כיוון נכון',
  miss: 'לא בכיוון'
};

export default liveBetStatus;
