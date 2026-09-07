import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// לשוניות שנשענות על הכתובת במקום על state מקומי.
//
// עד עכשיו הלשונית הנוכחית ישבה ב-useState, ולכן: כפתור "חזור" יצא
// מהאפליקציה במקום לחזור ללשונית הקודמת, רענון תמיד נחת על מסך ההימורים,
// ולא הייתה שום דרך לשלוח למישהו קישור לטבלה.
//
// הכתובת היא מסוג hash (‎/#/leaderboard) ולא נתיב רגיל, כי השרת הסטטי של
// Render לא מפנה נתיבים עמוקים אל index.html - נבדק, ‎/leaderboard מחזיר
// 404. עם hash הכל עובד בלי שום שינוי בהגדרות השרת.

/**
 * @param tabKeys  מפתחות הלשוניות החוקיות
 * @param fallback הלשונית שמוצגת כשהכתובת לא מוכרת
 * @param prefix   קידומת אופציונלית, כדי שלשוניות המנהל לא יתנגשו בשל השחקן
 * @param onBeforeChange בדיקה שיכולה לבטל את המעבר (למשל הימור לא שמור)
 */
export default function useTabRoute(tabKeys, fallback, { prefix = '', onBeforeChange } = {}) {
  const location = useLocation();
  const navigate = useNavigate();

  const base = prefix ? `/${prefix}` : '';
  const segment = location.pathname
    .replace(new RegExp(`^${base}/?`), '')
    .split('/')[0];

  const activeTab = tabKeys.includes(segment) ? segment : fallback;

  const setActiveTab = useCallback((key) => {
    if (!tabKeys.includes(key)) return;
    if (onBeforeChange && !onBeforeChange(key)) return;
    navigate(`${base}/${key}`);
    // מעבר לשונית הוא מעבר מסך מבחינת המשתמש, ולכן חוזרים לראש הדף
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [navigate, base, tabKeys, onBeforeChange]);

  return [activeTab, setActiveTab];
}
