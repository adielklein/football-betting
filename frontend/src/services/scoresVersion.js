// עדכון הטבלאות כשמשחק מסתיים בזמן שהאפליקציה פתוחה.
//
// השרת מחשב ניקוד תוך כדקה מסיום משחק (סריקת המצב החי), אבל המסכים טוענים
// את הטבלאות פעם אחת - ולכן מי שהיה באפליקציה ראה טבלה ישנה עד שיצא וחזר.
// כאן בודקים מדי חצי דקה את "גרסת" הניקוד (/scores/version - מתי חושב
// לאחרונה), רק כשהאפליקציה גלויה, ומיד כשהיא חוזרת מהרקע. כשהגרסה משתנה
// נשלח אירוע scores-updated, והמסכים מרעננים את עצמם בשקט
// (useReturnRefresh, ו-PlayerView לטבלה הכללית).

export const SCORES_UPDATED = 'scores-updated';
const POLL_MS = 30 * 1000;

// השוואת גרסאות: האירוע נשלח רק כשיש גרסה קודמת ידועה והחדשה שונה ממנה
export const versionChanged = (prev, next) => prev != null && next != null && next !== prev;

let started = false;
export const startScoresWatch = (apiUrl) => {
  if (started || typeof window === 'undefined') return () => {};
  started = true;
  let last = null;
  let timer = null;
  let stopped = false;

  const check = async () => {
    clearTimeout(timer);
    if (stopped) return;
    if (!document.hidden) {
      try {
        const res = await fetch(`${apiUrl}/scores/version`, { cache: 'no-store' });
        if (res.ok) {
          const { v } = await res.json();
          if (versionChanged(last, v)) window.dispatchEvent(new CustomEvent(SCORES_UPDATED, { detail: { v } }));
          last = v;
        }
      } catch (e) { /* בלי רשת - ננסה שוב בסבב הבא */ }
    }
    if (!stopped) timer = setTimeout(check, POLL_MS);
  };
  const onVisible = () => { if (!document.hidden) check(); };
  document.addEventListener('visibilitychange', onVisible);
  check();

  return () => {
    stopped = true;
    started = false;
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
};
