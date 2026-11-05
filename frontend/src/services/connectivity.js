// האם יש חיבור לשרת.
//
// navigator.onLine לבד לא מספיק: באצטדיון הטלפון "מחובר" לרשת סלולרית
// שלא מעבירה כלום. לכן גם כל קריאה לשרת מדווחת לכאן - קריאה שנכשלה ברשת,
// או תשובה שהגיעה מהקאש של ה-Service Worker (כותרת X-From-Cache), פירושן
// שאין חיבור; תשובה אמיתית מהשרת פירושה שיש.

let offline = typeof navigator !== 'undefined' && navigator.onLine === false;
const listeners = new Set();

const set = (value) => {
  if (value === offline) return;
  offline = value;
  listeners.forEach((fn) => fn(offline));
};

export const isOffline = () => offline;
export const reportOffline = () => set(true);
export const reportOnline = () => set(false);

export const onConnectivityChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

if (typeof window !== 'undefined') {
  window.addEventListener('offline', reportOffline);
  window.addEventListener('online', reportOnline);
}
