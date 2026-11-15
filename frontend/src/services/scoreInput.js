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

// אותה התנהגות לשדות במסכי האדמין, שאין להם מצב משלהם לדגל "הקשה ראשונה":
// הדגל נשמר על השדה עצמו. onValue מקבל את הערך החדש; בלעדיו (שדה לא
// מבוקר) הערך נכתב ישירות לשדה.
export const scoreFieldProps = (onValue) => ({
  type: 'tel',
  inputMode: 'numeric',
  pattern: '[0-9]*',
  autoComplete: 'off',
  onFocus: (e) => {
    e.target.dataset.fresh = '1';
    e.target.dataset.prev = e.target.value;
  },
  onChange: (e) => {
    const el = e.target;
    const v = nextScoreValue({ prev: el.dataset.prev || '', raw: el.value, caret: el.selectionStart, fresh: el.dataset.fresh === '1' });
    el.dataset.fresh = '';
    el.dataset.prev = v;
    if (onValue) onValue(v);
    else el.value = v;
  },
});
