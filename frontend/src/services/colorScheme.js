// מצב כהה.
//
// עד עכשיו היה ב-index.css בלוק ‎@media (prefers-color-scheme: dark)‎ שחל על
// מחלקה בשם auto-dark-mode - מחלקה שלא הופיעה באף מקום בקוד, כלומר הוא היה
// מת. וגם אילו היה חי, הוא שינה שלושה משתנים בלבד בעוד 429 צבעים כתובים
// קשיח בסגנונות המוטבעים, כך שהתוצאה הייתה טקסט לבן על רקע לבן.
//
// שלושה מצבים ולא שניים: "לפי המערכת" הוא ברירת המחדל, ומי שרוצה לכפות
// בהיר או כהה בלי קשר להעדפת הטלפון יכול. הבחירה נשמרת מקומית למכשיר,
// כי היא מאפיין של המכשיר ולא של החשבון.

const STORAGE_KEY = 'football_betting_color_scheme';
export const MODES = ['system', 'light', 'dark'];

const listeners = new Set();

const media = () =>
  (typeof window !== 'undefined' && window.matchMedia)
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

export const getMode = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return MODES.includes(saved) ? saved : 'system';
  } catch (err) {
    // גלישה פרטית או אחסון חסום - נופלים להעדפת המערכת
    return 'system';
  }
};

export const resolvedMode = () => {
  const mode = getMode();
  if (mode !== 'system') return mode;
  return media()?.matches ? 'dark' : 'light';
};

export const isDark = () => resolvedMode() === 'dark';

// הסימון על שורש המסמך הוא מה שמפעיל את ערכת הצבעים ב-CSS.
// בכוונה נכתב תמיד במפורש ולא רק כשהמצב אינו "מערכת", כדי שכלל
// ‎[data-theme="light"]‎ יוכל לגבור על העדפת מערכת כהה.
const stamp = () => {
  const root = document.documentElement;
  const mode = getMode();
  if (mode === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', mode);
  root.style.colorScheme = resolvedMode();
};

export const applyColorScheme = () => {
  stamp();
  listeners.forEach((fn) => {
    try { fn(resolvedMode()); } catch (err) { /* מאזין שנשבר לא יפיל את השאר */ }
  });
};

export const setMode = (mode) => {
  if (!MODES.includes(mode)) return;
  try { localStorage.setItem(STORAGE_KEY, mode); } catch (err) { /* לא קריטי */ }
  applyColorScheme();
};

export const onSchemeChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// שינוי בהעדפת המערכת משפיע רק כשלא נבחר מצב מפורש
const mq = media();
if (mq) {
  const handler = () => { if (getMode() === 'system') applyColorScheme(); };
  if (mq.addEventListener) mq.addEventListener('change', handler);
  else if (mq.addListener) mq.addListener(handler); // ספארי ישן
}

// מוחל מיד בטעינה, לפני הרינדור הראשון
if (typeof document !== 'undefined') stamp();
