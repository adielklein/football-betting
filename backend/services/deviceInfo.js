// זיהוי המכשיר שמאחורי מנוי התראות, לתצוגה במסך הניהול.
//
// שלושה מקורות לדגם, בסדר הזה:
//
// 1. Client Hints. מאז Chrome 110 (2023) ה-User-Agent באנדרואיד מוקפא -
//    הפלטפורמה תמיד "Android 10" והדגם הוא האות "K" בדיוק - ולכן הדגם
//    האמיתי מגיע רק מ-navigator.userAgentData.getHighEntropyValues(['model']),
//    שהלקוח שולח אלינו. זו מחרוזת הדגם עצמה, לא גזירה ממנה.
//
// 2. ה-User-Agent. עדיין נושא דגם בדפדפנים שלא מצמצמים - Samsung Internet,
//    פיירפוקס, webview - ולכן נשאר כגיבוי.
//
// 3. סוג המכשיר בעברית - אייפון, מחשב, טאבלט. רצפת הבסיס, וכשאין דגם היא
//    התשובה. באייפון היא תמיד התשובה: אפל לא מדווחת דגם באף אחת מהדרכים,
//    ו-userAgentData אינו קיים בספארי בכלל.
//
// וכשאין אף אחד מהם - שירות הדחיפה, שמזהה דפדפן ולא מכשיר.

const PUSH_SERVICES = [
  { match: 'web.push.apple.com', label: 'Safari / Apple' },
  { match: 'fcm.googleapis.com', label: 'Chrome' },
  { match: 'android.googleapis.com', label: 'Chrome' },
  { match: 'updates.push.services.mozilla.com', label: 'Firefox' },
  { match: 'notify.windows.com', label: 'Edge / Windows' }
];

const pushServiceOf = (endpoint) => {
  const url = String(endpoint || '');
  if (!url) return 'לא ידוע';

  const known = PUSH_SERVICES.find((s) => url.includes(s.match));
  if (known) return known.label;

  const host = url.replace(/^https?:\/\//, '').split('/')[0];
  return host || 'לא ידוע';
};

// קודי דגם של סמסונג לשם השיווקי. אצל סדרת A הקוד דומה לשם (A556 → A55),
// אבל בסדרת S הוא לא (S911 → S23), ולכן טבלה ולא נוסחה. מה שלא מופיע כאן
// מוצג כקוד - "SM-A556B" עדיין מזהה מכשיר, בניגוד לשם מומצא.
const SAMSUNG_MODELS = {
  'SM-A556': 'Galaxy A55', 'SM-A546': 'Galaxy A54', 'SM-A536': 'Galaxy A53',
  'SM-A356': 'Galaxy A35', 'SM-A346': 'Galaxy A34', 'SM-A336': 'Galaxy A33',
  'SM-A256': 'Galaxy A25', 'SM-A155': 'Galaxy A15', 'SM-A146': 'Galaxy A14',
  'SM-S921': 'Galaxy S24', 'SM-S926': 'Galaxy S24+', 'SM-S928': 'Galaxy S24 Ultra',
  'SM-S911': 'Galaxy S23', 'SM-S916': 'Galaxy S23+', 'SM-S918': 'Galaxy S23 Ultra',
  'SM-S901': 'Galaxy S22', 'SM-S906': 'Galaxy S22+', 'SM-S908': 'Galaxy S22 Ultra',
  'SM-S711': 'Galaxy S23 FE', 'SM-G991': 'Galaxy S21', 'SM-G998': 'Galaxy S21 Ultra',
  'SM-F946': 'Galaxy Z Fold5', 'SM-F731': 'Galaxy Z Flip5',
  'SM-F956': 'Galaxy Z Fold6', 'SM-F741': 'Galaxy Z Flip6'
};

// היצרן מתוך קוד/שם הדגם. כשאין דגם מוכר, המותג לבדו עדיף על קוד עירום:
// "סמסונג" אומר משהו, "SM-Z999B" צריך חיפוש בגוגל
const BRANDS = [
  { test: /^SM-|^GT-|^SCH-|galaxy/i, name: 'סמסונג' },
  { test: /^Pixel/i, name: 'Google Pixel' },
  { test: /redmi|xiaomi|^POCO|^M\d{4}/i, name: 'שיאומי' },
  { test: /^CPH|oneplus/i, name: 'OnePlus' },
  { test: /^RMX|realme/i, name: 'Realme' },
  { test: /oppo/i, name: 'Oppo' },
  { test: /^vivo/i, name: 'vivo' },
  { test: /^moto|motorola/i, name: 'מוטורולה' },
  { test: /huawei|honor/i, name: 'Huawei' },
  { test: /^Nokia/i, name: 'נוקיה' }
];

const brandOf = (model) => {
  const m = String(model || '').trim();
  if (!m) return null;
  const hit = BRANDS.find((b) => b.test.test(m));
  return hit ? hit.name : null;
};

const prettifyAndroidModel = (raw) => {
  const model = String(raw || '').trim();
  if (!model) return null;

  // קוד סמסונג נושא סיומת אזורית (B/E/U/N) שאינה מעניינת
  const samsung = model.match(/^(SM-[A-Z]\d{3,4})/i);
  if (samsung) {
    const base = samsung[1].toUpperCase();
    if (SAMSUNG_MODELS[base]) return SAMSUNG_MODELS[base];
    // דגם שלא בטבלה: המותג קודם, והקוד נשאר בסוגריים למי שרוצה לחפש
    return `סמסונג (${model})`;
  }

  // שאר היצרנים בדרך כלל מדווחים שם קריא כבר: "Pixel 8", "Redmi Note 12"
  return model;
};

// דגמים שאינם דגם. "K" הוא מה ש-Chrome שם במקום הדגם מאז שצמצם את
// ה-User-Agent, ולהציג אותו כשם מכשיר זה להציג את הצנזורה עצמה
const PLACEHOLDER_MODELS = /^(K|Android|Unknown|Generic.*)$/i;

const cleanModel = (raw) => {
  const model = String(raw || '').trim();
  if (!model || PLACEHOLDER_MODELS.test(model)) return null;
  return prettifyAndroidModel(model);
};

// הדגם מתוך ה-User-Agent. null כשאין - באייפון תמיד, ובכרום מאז הצמצום
const modelFromUserAgent = (userAgent) => {
  const ua = String(userAgent || '');
  if (!ua) return null;

  // "Linux; Android 14; SM-A556B Build/UP1A" או "...; SM-A556B)"
  const android = ua.match(/Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/i);
  if (android) return cleanModel(android[1]);

  return null;
};

// סוג המכשיר בעברית. זו רצפת הבסיס: כשאין דגם מדויק - ובאייפון לעולם אין -
// "אייפון" או "מחשב Windows" עונים על השאלה, בניגוד ל"Safari" שעונה על
// שאלה אחרת לגמרי
const platformFromUserAgent = (userAgent) => {
  const ua = String(userAgent || '');
  if (!ua) return null;
  // אייפד לפני מק: אייפדוס מדווח על עצמו כמקינטוש
  if (/iPhone/i.test(ua)) return 'אייפון';
  if (/iPad/i.test(ua)) return 'אייפד';
  if (/Android/i.test(ua)) return /Mobile/i.test(ua) ? 'אנדרואיד' : 'טאבלט אנדרואיד';
  if (/Macintosh|Mac OS X/i.test(ua)) return 'מק';
  if (/Windows/i.test(ua)) return 'מחשב Windows';
  if (/CrOS/i.test(ua)) return 'Chromebook';
  if (/Linux/i.test(ua)) return 'מחשב Linux';
  return null;
};

/**
 * תיאור מנוי אחד לתצוגה. אינו מחזיר את כתובת הדחיפה - היא מזהה מכשיר
 * ואין סיבה שתעבור לדפדפן, גם לא של אדמין.
 */
const describeSubscription = (sub) => {
  const service = pushServiceOf(sub?.endpoint);
  // Client Hints קודם: זה המקום היחיד שבו כרום מודרני מדווח דגם בכלל
  const model = cleanModel(sub?.model) || modelFromUserAgent(sub?.userAgent);
  const platform = platformFromUserAgent(sub?.userAgent);

  // דגם אם יש, אחרת סוג המכשיר, ואחרון - שירות הדחיפה
  const identity = model || platform || service;

  return {
    service,
    model: model || null,
    platform: platform || null,
    brand: brandOf(model) || null,
    label: identity === service ? service : `${identity} · ${service}`,
    addedAt: sub?.addedAt || null,
    lastSeenAt: sub?.lastSeenAt || null
  };
};

module.exports = {
  brandOf,
  pushServiceOf,
  modelFromUserAgent,
  platformFromUserAgent,
  describeSubscription
};
