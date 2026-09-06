// הודעות קצרות במקום alert().
//
// ה-API אימפרטיבי בכוונה (toast.success('...')) כדי שאפשר יהיה לקרוא לו
// מכל מקום בדיוק כמו alert - בלי context ובלי להעביר props דרך חמש רמות.
// ההבדל המהותי מ-alert הוא שזה לא חוסם את הדפדפן; בכל הקריאות באפליקציה
// ההודעה היא חד-כיוונית ואף אחת מהן לא חיכתה לתשובה.
//
// לשאלות כן/לא ממשיכים להשתמש ב-window.confirm.

let listener = null;
let queued = [];
let nextId = 1;

// ההודעה מוצגת עד שהמשתמש מספיק לקרוא אותה. שגיאות נשארות קצת יותר.
const DURATIONS = { success: 3000, info: 3500, warning: 4000, error: 5000 };

const emit = (type, message) => {
  const text = String(message ?? '').trim();
  if (!text) return;

  const item = { id: nextId++, type, text, duration: DURATIONS[type] || 3500 };

  // אם ההודעה נשלחה לפני שה-host הספיק להירשם (למשל משגיאה בטעינה
  // הראשונית), שומרים אותה ומציגים ברגע שהוא עולה
  if (listener) listener(item);
  else queued.push(item);
};

export const subscribeToToasts = (fn) => {
  listener = fn;
  queued.forEach(fn);
  queued = [];
  return () => { listener = null; };
};

export const toast = {
  success: (message) => emit('success', message),
  error: (message) => emit('error', message),
  warning: (message) => emit('warning', message),
  info: (message) => emit('info', message)
};

export default toast;
