// זיהוי המכשיר שמאחורי מנוי התראות, לתצוגה במסך הניהול.
//
// שלושה מקורות, בסדר אמינות יורד:
//
// 1. שם שהמשתמש נתן למכשיר. המקור היחיד שהוא ודאי, והיחיד שיכול לומר
//    "האייפון של אדיאל" ולא רק "אייפון". נשמר בדפדפן ונשלח מחדש בכל
//    סנכרון, כך שהמכשיר זוכר את שמו בעצמו.
//
// 2. דגם מה-User-Agent. באנדרואיד הוא באמת שם: "Android 14; SM-A556B".
//    באייפון הוא לא - אפל לא מדווחת את הדגם, בשום צורה.
//
// 3. סוג המכשיר בעברית - אייפון, סמסונג, מחשב. זו רצפת הבסיס, וכשאין דגם
//    היא התשובה: "אייפון" עונה על השאלה שנשאלה.
//
// גיאומטריית המסך מצמצמת אייפון לקבוצת דגמים, אבל לא לדגם - 15, 15 Pro ו-16
// חולקים בדיוק אותו viewport - ולכן היא רמז לריחוף ולא הכותרת של השורה.
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

// הדגם מתוך ה-User-Agent. null כשאין - כלומר תמיד באייפון
const modelFromUserAgent = (userAgent) => {
  const ua = String(userAgent || '');
  if (!ua) return null;

  // "Linux; Android 14; SM-A556B Build/UP1A" או "...; SM-A556B)"
  const android = ua.match(/Android\s+[\d.]+;\s*([^;)]+?)(?:\s+Build\/[^;)]*)?\)/i);
  if (android) return prettifyAndroidModel(android[1]);

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

// viewport בנקודות CSS (לאורך) וצפיפות → קבוצת דגמים. מקור: טבלאות
// viewport ציבוריות. הקבוצות אמיתיות ולא עיגול פינות: 393x852@3 הוא באמת
// אותו מסך באייפון 15, ב-15 Pro וב-16.
const IPHONE_SCREENS = {
  '320x568@2': 'iPhone SE (דור 1) / 5s',
  '375x667@2': 'iPhone SE (2/3) / 8 / 7 / 6s',
  '414x736@3': 'iPhone 8 Plus / 7 Plus',
  '375x812@3': 'iPhone 13 mini / 12 mini / 11 Pro / X',
  '414x896@2': 'iPhone 11 / XR',
  '414x896@3': 'iPhone 11 Pro Max / XS Max',
  '390x844@3': 'iPhone 14 / 13 / 13 Pro / 12',
  '428x926@3': 'iPhone 14 Plus / 13 Pro Max / 12 Pro Max',
  '393x852@3': 'iPhone 16 / 15 Pro / 15 / 14 Pro',
  '430x932@3': 'iPhone 16 Plus / 15 Pro Max / 15 Plus / 14 Pro Max',
  '402x874@3': 'iPhone 16 Pro',
  '440x956@3': 'iPhone 16 Pro Max'
};

const iphoneFromScreen = (screen) => {
  const w = Number(screen?.width);
  const h = Number(screen?.height);
  const dpr = Math.round(Number(screen?.dpr) || 0);
  if (!w || !h || !dpr) return null;

  // המסך מדווח לפי הכיוון שבו המשתמש החזיק את הטלפון
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  return IPHONE_SCREENS[`${short}x${long}@${dpr}`] || null;
};

/**
 * תיאור מנוי אחד לתצוגה. אינו מחזיר את כתובת הדחיפה - היא מזהה מכשיר
 * ואין סיבה שתעבור לדפדפן, גם לא של אדמין.
 */
const describeSubscription = (sub) => {
  const service = pushServiceOf(sub?.endpoint);
  const model = modelFromUserAgent(sub?.userAgent);
  const platform = platformFromUserAgent(sub?.userAgent);
  const byScreen = platform === 'אייפון' ? iphoneFromScreen(sub?.screen) : null;
  const named = String(sub?.deviceName || '').trim().slice(0, 40) || null;

  // סדר האמינות: שם שנתן המשתמש, דגם מה-UA, ואז סוג המכשיר.
  //
  // קבוצת הדגמים לפי מסך אינה נכנסת לשורה עצמה: "iPhone 16 / 15 Pro / 15 /
  // 14 Pro" הוא רעש, ו"אייפון" עונה על השאלה. הקבוצה נשמרת כרמז לריחוף.
  const identity = named || model || platform || service;

  return {
    service,
    model: model || null,
    platform: platform || null,
    deviceName: named,
    // צמצום לפי מסך, כשיש. קבוצה ולא דגם, ולכן רמז ולא כותרת
    modelHint: !named && !model ? byScreen : null,
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
  iphoneFromScreen,
  describeSubscription
};
