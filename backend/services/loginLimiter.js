// הגבלת ניסיונות כניסה כושלים.
//
// בלי הגבלה אפשר לנחש סיסמאות בלי סוף - וסיסמאות כאן קצרות (מינימום 4
// תווים). אחרי MAX_FAILURES כישלונות לאותו שם משתמש מאותה כתובת, ננעל
// לחלון של WINDOW_MS. כניסה מוצלחת מאפסת. בזיכרון: מתאפס בהפעלה מחדש,
// וזה בסדר - המטרה היא לעצור ניחוש רציף, לא לנהל היסטוריה.

const MAX_FAILURES = 8;
const WINDOW_MS = 15 * 60 * 1000;

const attempts = new Map(); // key -> { count, first }

const keyOf = (ip, username) => `${ip || '?'}|${String(username || '').toLowerCase()}`;

const live = (key, now) => {
  const a = attempts.get(key);
  if (a && now - a.first > WINDOW_MS) {
    attempts.delete(key);
    return null;
  }
  return a || null;
};

// כמה מילישניות נשארו לנעילה, או 0 אם מותר לנסות
const blockedFor = (ip, username, now = Date.now()) => {
  const a = live(keyOf(ip, username), now);
  return a && a.count >= MAX_FAILURES ? a.first + WINDOW_MS - now : 0;
};

const fail = (ip, username, now = Date.now()) => {
  const key = keyOf(ip, username);
  const a = live(key, now) || { count: 0, first: now };
  a.count++;
  attempts.set(key, a);
};

const succeed = (ip, username) => attempts.delete(keyOf(ip, username));

// לבדיקות בלבד
const reset = () => attempts.clear();

module.exports = { blockedFor, fail, succeed, reset, MAX_FAILURES, WINDOW_MS };
