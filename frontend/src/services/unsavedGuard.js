// שמירה על הימור שהוקלד ולא נשמר.
//
// ההימורים כאן לא נשמרים אוטומטית - צריך ללחוץ שמירה לכל משחק. עד עכשיו
// אפשר היה להקליד תוצאה, לעבור לשונית או לסגור את הדף, ולאבד אותה בלי שום
// סימן. במסך שממלאים בו שלושה-עשר משחקים ברצף זה קורה.
//
// המימוש הוא רישום גלובלי אחד ולא context, כי הבדיקה נדרשת בשלושה מקומות
// שונים לגמרי: מעבר לשונית, ניווט בדפדפן, וסגירת הדף.

let checker = null;

/**
 * רושם פונקציה שיודעת לומר אם יש שינויים לא שמורים.
 * מחזיר פונקציית ביטול, לשימוש ב-cleanup של useEffect.
 */
export const setUnsavedChecker = (fn) => {
  checker = fn;
  return () => { if (checker === fn) checker = null; };
};

export const hasUnsaved = () => {
  try {
    return !!checker && !!checker();
  } catch (err) {
    // אם הבדיקה נשברת, עדיף לא לחסום את המשתמש
    return false;
  }
};

const DEFAULT_MESSAGE = 'יש לך הימור שהוקלד ולא נשמר. לצאת בלי לשמור?';

/**
 * מחזיר true אם מותר להמשיך. שואל רק כשבאמת יש מה לאבד.
 */
export const confirmLeave = (message = DEFAULT_MESSAGE) =>
  !hasUnsaved() || window.confirm(message);

// אזהרת הדפדפן בסגירה או רענון. הטקסט עצמו נקבע על ידי הדפדפן ולא על ידינו,
// אבל בלי preventDefault הוא לא מוצג בכלל.
window.addEventListener('beforeunload', (e) => {
  if (!hasUnsaved()) return;
  e.preventDefault();
  e.returnValue = '';
});
