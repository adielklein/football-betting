// זיהוי המכשיר שמאחורי מנוי התראות, לתצוגה במסך הניהול.
//
// שני מקורות, ובכוונה בסדר הזה:
//
// 1. כתובת הדחיפה. היא קיימת בכל מנוי, כולל כאלה שנרשמו לפני שהתחלנו
//    לשמור מידע נוסף, ולכן היא עובדת רטרואקטיבית. אבל היא מזהה את *שירות
//    הדחיפה* ולא את המכשיר: Chrome בדסקטופ ו-Chrome באנדרואיד שולחים שניהם
//    דרך FCM. לכן לא נטען כאן "אנדרואיד" - נאמר "Chrome".
//
// 2. ה-User-Agent, שנשמר מכאן והלאה. הוא זה שיודע להבדיל בין אייפון לבין
//    מק, ובין טלפון למחשב. למנוי ישן הוא לא קיים, וזה בסדר - עדיף "Chrome"
//    בלי דגם מאשר לנחש דגם.

const PUSH_SERVICES = [
  { match: 'web.push.apple.com', label: 'Safari / Apple' },
  { match: 'fcm.googleapis.com', label: 'Chrome' },
  { match: 'android.googleapis.com', label: 'Chrome' },
  { match: 'updates.push.services.mozilla.com', label: 'Firefox' },
  { match: 'notify.windows.com', label: 'Edge / Windows' }
];

// שירות הדחיפה לפי הכתובת, או המאחסן עצמו כשאינו מוכר
const pushServiceOf = (endpoint) => {
  const url = String(endpoint || '');
  if (!url) return 'לא ידוע';

  const known = PUSH_SERVICES.find((s) => url.includes(s.match));
  if (known) return known.label;

  const host = url.replace(/^https?:\/\//, '').split('/')[0];
  return host || 'לא ידוע';
};

// דגם/מערכת מתוך ה-User-Agent. מוחזר null כשאין ממה לגזור, כדי שהקורא
// יציג את שירות הדחיפה בלבד במקום לנחש
const deviceFromUserAgent = (userAgent) => {
  const ua = String(userAgent || '');
  if (!ua) return null;

  // הסדר חשוב: אייפד מזוהה לפני מק, כי אייפדוס מדווח על עצמו כמקינטוש
  if (/iPhone/i.test(ua)) return 'iPhone';
  if (/iPad/i.test(ua)) return 'iPad';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'Android' : 'טאבלט Android';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac';
  if (/Windows/i.test(ua)) return 'Windows';
  if (/Linux/i.test(ua)) return 'Linux';
  return null;
};

/**
 * תיאור מנוי אחד לתצוגה. אינו מחזיר את כתובת הדחיפה עצמה - היא מזהה
 * מכשיר ואין סיבה שתעבור לדפדפן, גם לא של אדמין.
 */
const describeSubscription = (sub) => {
  const service = pushServiceOf(sub?.endpoint);
  const device = deviceFromUserAgent(sub?.userAgent);

  return {
    service,
    device,
    label: device ? `${device} · ${service}` : service,
    addedAt: sub?.addedAt || null,
    lastSeenAt: sub?.lastSeenAt || null
  };
};

module.exports = { pushServiceOf, deviceFromUserAgent, describeSubscription };
