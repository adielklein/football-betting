// טוקן התחברות חתום.
//
// עד עכשיו השרת זיהה משתמש לפי מזהה שהלקוח שלח (X-User-Id). המזהים
// פומביים - רשימת המשתמשים פתוחה - ולכן כל אחד יכול היה לשלוח את המזהה של
// אדמין ולפעול בשמו. טוקן נוצר רק בכניסה עם סיסמה, ואי אפשר לזייף אותו
// בלי המפתח של השרת.
//
// מבנה: base64url(payload) + "." + base64url(HMAC-SHA256). אין תלות חיצונית.
//
// המפתח חייב להיות יציב בין הפעלות - אחרת כל דיפלוי היה מנתק את כולם.
// AUTH_SECRET אם הוגדר; אחרת נגזר מ-VAPID_PRIVATE_KEY, שכבר מוגדר ב-Render
// וסודי באותה מידה (הגזירה דרך hash עם קידומת, כך שהמפתח עצמו לא משמש
// לשני דברים).

const crypto = require('crypto');

const TTL_MS = 180 * 24 * 60 * 60 * 1000;     // חצי שנה
const RENEW_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // טוקן בן שבוע מתחדש בשימוש

let cachedKey = null;
const key = () => {
  if (cachedKey) return cachedKey;
  const base = process.env.AUTH_SECRET || process.env.VAPID_PRIVATE_KEY;
  if (!base) {
    console.warn('⚠️ [AUTH] אין AUTH_SECRET ואין VAPID_PRIVATE_KEY - מפתח זמני; כל הפעלה מחדש תנתק את כולם');
  }
  cachedKey = crypto.createHash('sha256')
    .update(`football-betting-auth-v1:${base || crypto.randomBytes(32).toString('hex')}`)
    .digest();
  return cachedKey;
};

const b64 = (buf) => Buffer.from(buf).toString('base64url');
const mac = (data) => crypto.createHmac('sha256', key()).update(data).digest();

/**
 * @param uid  מזהה המשתמש
 * @param tv   גרסת הטוקנים של המשתמש - העלאה שלה מבטלת את כל הטוקנים הקיימים
 */
const sign = ({ uid, tv = 0 }, now = Date.now()) => {
  const payload = b64(JSON.stringify({ uid: String(uid), tv, iat: now, exp: now + TTL_MS }));
  return `${payload}.${b64(mac(payload))}`;
};

// מחזיר את התוכן אם הטוקן תקין ובתוקף, אחרת null. לעולם לא זורק.
const verify = (token, now = Date.now()) => {
  try {
    const [payload, sig] = String(token || '').split('.');
    if (!payload || !sig) return null;
    const expected = mac(payload);
    const given = Buffer.from(sig, 'base64url');
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.uid || !Number.isFinite(data.exp) || data.exp <= now) return null;
    return data;
  } catch {
    return null;
  }
};

const shouldRenew = (data, now = Date.now()) => now - data.iat > RENEW_AFTER_MS;

// לבדיקות בלבד
const resetKey = () => { cachedKey = null; };

module.exports = { sign, verify, shouldRenew, resetKey, TTL_MS, RENEW_AFTER_MS };
