// זיהוי גרסה חדשה של האפליקציה.
//
// ה-Service Worker כאן משמש רק להתראות Push - אין לו fetch handler ואין בו
// קאשינג של קבצים - ולכן "עדכון של ה-SW" הוא לא סימן טוב לכך שהאפליקציה
// השתנתה: הקוד מתעדכן בכל דיפלוי, ה-SW כמעט אף פעם.
//
// במקום זה משווים את חתימת החבילה הראשית. לכל build יש שם קובץ עם hash,
// כך שאם מה שנטען בדפדפן שונה ממה ש-index.html מגיש עכשיו - המשתמש מריץ
// קוד ישן.
//
// ההשוואה נעשית מול index.html ולא מול קובץ מניפסט, כי המניפסט הוא פרט
// של כלי הבנייה (CRA כותב asset-manifest.json, Vite כותב משהו אחר לגמרי)
// בעוד index.html קיים תמיד ומצביע על מה שבאמת נטען.

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// מזהה את קובץ ה-JS הראשי לפי שם עם hash. CRA: main.<hash>.js תחת
// /static/js, Vite: index-<hash>.js תחת /assets.
const BUNDLE_PATTERN = /\/(?:static\/js|assets)\/[\w.-]*[.-][A-Za-z0-9_-]{8,}\.js\b/g;

const bundleFromSrc = (src) => {
  const matches = String(src || '').match(BUNDLE_PATTERN);
  return matches && matches.length ? matches[0].split('/').pop() : null;
};

// חשוב לקרוא דווקא את תגי ה-script ולא כל כתובת בדף: Vite מוסיף גם
// modulepreload לחבילות המשנה, וה-hash שלהן משתנה רק כשהתלויות משתנות.
// השוואה מולן הייתה מפספסת בדיוק את המקרה הנפוץ - שינוי בקוד של האפליקציה.
const SCRIPT_SRC_PATTERN = /<script[^>]+src=["']([^"']+)["']/gi;

const bundleFromHtml = (html) => {
  for (const m of html.matchAll(SCRIPT_SRC_PATTERN)) {
    const name = bundleFromSrc(m[1]);
    if (name) return name;
  }
  return null;
};

// שם הקובץ שנטען בפועל בדף הזה - זו האמת לגבי מה שרץ עכשיו
const runningBundle = () => {
  const srcs = [...document.querySelectorAll('script[src]')].map((s) => s.getAttribute('src') || '');
  return srcs.map(bundleFromSrc).find(Boolean) || null;
};

const servedBundle = async () => {
  // no-store וגם פרמטר משתנה: בלי זה הדפדפן עלול להגיש את הדף מהקאש
  // ואז לעולם לא נראה את הגרסה החדשה
  const res = await fetch(`/index.html?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`index ${res.status}`);
  return bundleFrom(await res.text());
};

// מפעיל את onUpdateAvailable פעם אחת כשמתגלה גרסה חדשה. מחזיר פונקציית ניקוי.
export const watchForUpdates = (onUpdateAvailable) => {
  const running = runningBundle();
  // בפיתוח אין hash בשם הקובץ - פשוט לא בודקים
  if (!running) return () => {};

  let stopped = false;

  const check = async () => {
    if (stopped || document.hidden) return;
    try {
      const served = await servedBundle();
      if (served && served !== running) {
        stopped = true;
        onUpdateAvailable();
      }
    } catch (err) {
      // אין רשת, או שהדף לא זמין - ננסה שוב בפעם הבאה
    }
  };

  const timer = setInterval(check, CHECK_INTERVAL_MS);
  // גם כשחוזרים לאפליקציה אחרי שהיא הייתה ברקע, כי אז סביר שעבר זמן
  const onVisible = () => { if (!document.hidden) check(); };
  document.addEventListener('visibilitychange', onVisible);
  check();

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
};

// טעינה נקייה: מנקים קאשים שנשארו מגרסאות קודמות ואז טוענים מחדש
export const applyUpdate = async () => {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (err) {
    // לא קריטי - הריענון עצמו הוא מה שחשוב
  }
  window.location.reload();
};
