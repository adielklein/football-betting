// זיהוי גרסה חדשה של האפליקציה.
//
// ה-Service Worker כאן משמש רק להתראות Push - אין לו fetch handler ואין בו
// קאשינג של קבצים - ולכן "עדכון של ה-SW" הוא לא סימן טוב לכך שהאפליקציה
// השתנתה: הקוד מתעדכן בכל דיפלוי, ה-SW כמעט אף פעם.
//
// במקום זה משווים את חתימת החבילה הראשית: CRA מייצר לכל build שם קובץ עם
// hash ורושם אותו ב-asset-manifest.json. אם מה שרץ בדפדפן שונה ממה שמוגש
// עכשיו מהשרת, המשתמש מריץ קוד ישן.

const MANIFEST_URL = '/asset-manifest.json';
const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// שם הקובץ שנטען בפועל בדף הזה - זו האמת לגבי מה שרץ עכשיו
const runningBundle = () => {
  const scripts = [...document.querySelectorAll('script[src]')];
  const main = scripts.find((s) => /\/static\/js\/main\.[^/]+\.js$/.test(s.getAttribute('src') || ''));
  return main ? main.getAttribute('src').split('/').pop() : null;
};

const servedBundle = async () => {
  // no-store וגם פרמטר משתנה: בלי זה הדפדפן עלול להגיש את המניפסט מהקאש
  // ואז לעולם לא נראה את הגרסה החדשה
  const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`manifest ${res.status}`);
  const manifest = await res.json();
  const main = manifest.files?.['main.js'];
  return main ? main.split('/').pop() : null;
};

// מפעיל את onUpdateAvailable פעם אחת כשמתגלה גרסה חדשה. מחזיר פונקציית ניקוי.
export const watchForUpdates = (onUpdateAvailable) => {
  const running = runningBundle();
  // בפיתוח אין hash בשם הקובץ ואין מניפסט - פשוט לא בודקים
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
      // אין רשת, או שהמניפסט לא זמין - ננסה שוב בפעם הבאה
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
