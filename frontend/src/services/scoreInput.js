// קלט ניקוד: ההקשה הראשונה אחרי הכניסה לשדה מחליפה את מה שהיה בו.
//
// קודם זה נעשה ע"י סימון התוכן בכניסה לשדה (select), אבל באנדרואיד סימון
// מקפיץ תפריט Cut/Copy/Share וידיות כחולות מעל הספרה. כאן אין סימון:
// מזהים את התו שנוסף לפי מיקום הסמן ומשאירים רק אותו.
//
// prev - הערך שהיה, raw - מה שהשדה מכיל אחרי ההקשה, caret - מיקום הסמן
// אחרי ההקשה, fresh - זו ההקשה הראשונה מאז הכניסה לשדה.
// מחזיר עד שתי ספרות.
export const nextScoreValue = ({ prev = '', raw = '', caret = null, fresh = false }) => {
  const prevStr = String(prev ?? '');
  const rawStr = String(raw ?? '');
  if (fresh && prevStr && rawStr.length > prevStr.length) {
    const at = caret == null ? rawStr.length : caret;
    const typed = rawStr.slice(Math.max(0, at - 1), at).replace(/\D/g, '');
    if (typed) return typed;
    // הדבקה או מקלדת שלא מדווחת על הסמן - לוקחים את הספרה האחרונה
    const digits = rawStr.replace(/\D/g, '');
    return digits ? digits.slice(-1) : prevStr;
  }
  return rawStr.replace(/\D/g, '').slice(0, 2);
};
