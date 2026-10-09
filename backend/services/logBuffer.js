// הלוגים האחרונים של השרת, בזיכרון, כדי שהאדמין יוכל לראות אותם מהאפליקציה.
//
// עד עכשיו כל מה שהשרת כתב (שגיאות 365, סיבות לכישלון התראות, נסיגות)
// היה גלוי רק בלוח של Render. מכאן מסך "לוגים" קורא את אותן שורות.
//
// הזיכרון מתאפס בכל הפעלה מחדש של השרת (דיפלוי, קריסה) - זה חלון של
// השעות האחרונות, לא ארכיון.

const MAX_ENTRIES = 1500;
const MAX_MESSAGE = 2000;

const entries = [];
let nextId = 1;
let installed = false;
const startedAt = new Date();

const stringify = (value) => {
  if (value instanceof Error) return value.stack || value.message;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

// אזהרות של Node עצמו (DeprecationWarning) נכתבות ל-stderr, אבל הן לא
// תקלה של האפליקציה - בלי ההורדה הן היו נצבעות באדום בין השגיאות האמיתיות
const NODE_WARNING = /^\(node:\d+\) (\[\w+\] )?\w*Warning:/;

const push = (level, args) => {
  let message = args.map(stringify).join(' ');
  if (level === 'error' && NODE_WARNING.test(message)) level = 'warn';
  if (message.length > MAX_MESSAGE) message = `${message.slice(0, MAX_MESSAGE)}…`;
  entries.push({ id: nextId++, at: new Date(), level, message });
  if (entries.length > MAX_ENTRIES) entries.splice(0, entries.length - MAX_ENTRIES);
};

// עוטף את console כך שכל שורה ממשיכה ללוג הרגיל של Render וגם נשמרת כאן
const install = (target = console) => {
  if (installed) return;
  installed = true;
  for (const [method, level] of [['log', 'info'], ['info', 'info'], ['warn', 'warn'], ['error', 'error']]) {
    const original = target[method].bind(target);
    target[method] = (...args) => {
      try { push(level, args); } catch { /* הלוג לעולם לא מפיל את מי שכותב אליו */ }
      original(...args);
    };
  }
};

/**
 * @param level  'error' | 'warn' | 'info' - הרמה המינימלית
 * @param q      טקסט לחיפוש (לא רגיש לאותיות)
 * @param limit  מספר שורות מקסימלי, מהחדשות
 */
const read = ({ level = 'info', q = '', limit = 300 } = {}) => {
  const rank = { info: 0, warn: 1, error: 2 };
  const min = rank[level] ?? 0;
  const needle = String(q || '').trim().toLowerCase();
  const max = Math.min(Math.max(parseInt(limit, 10) || 300, 1), MAX_ENTRIES);

  const out = [];
  for (let i = entries.length - 1; i >= 0 && out.length < max; i--) {
    const e = entries[i];
    if (rank[e.level] < min) continue;
    if (needle && !e.message.toLowerCase().includes(needle)) continue;
    out.push(e);
  }
  return { entries: out, total: entries.length, startedAt };
};

// לבדיקות בלבד
const reset = () => { entries.length = 0; nextId = 1; };

module.exports = { install, read, push, reset, MAX_ENTRIES };
