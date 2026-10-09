// מצב החיבור לספקים חיצוניים (365), לפי הקריאות האמיתיות שהשרת עושה.
//
// כל כישלון מול 365 נבלע בכוונה בצד השחקן ("מצב חי הוא תוספת") - וזה
// בדיוק מה שהשאיר את האדמין בלי שום דרך לדעת שמשהו לא עובד ולמה. כאן
// נשמרים הסטטוס האחרון, השגיאה האחרונה עם הטקסט שהספק החזיר, והקריאות
// האחרונות, ומסך הלוגים מציג אותם.

const RECENT = 25;
const sources = new Map();

const stateOf = (source) => {
  if (!sources.has(source)) {
    sources.set(source, {
      source, okCount: 0, failCount: 0, consecutiveFailures: 0,
      lastOkAt: null, lastError: null, recent: []
    });
  }
  return sources.get(source);
};

const record = (source, { ok, status = null, message = '', path = '', ms = null }) => {
  const s = stateOf(source);
  const at = new Date();
  // הנתיב בלי פרמטרים קבועים, כדי שיהיה קריא
  const shortPath = String(path).replace(/appTypeId=\d+&langId=\d+&timezoneName=[^&]+&userCountryId=\d+&?/, '');

  if (ok) {
    s.okCount++;
    s.consecutiveFailures = 0;
    s.lastOkAt = at;
  } else {
    s.failCount++;
    s.consecutiveFailures++;
    s.lastError = { at, status, message: String(message).slice(0, 500), path: shortPath };
  }
  s.recent.unshift({ at, ok, status, ms, path: shortPath, message: ok ? '' : String(message).slice(0, 200) });
  if (s.recent.length > RECENT) s.recent.length = RECENT;
};

const snapshot = () => [...sources.values()].map((s) => ({ ...s, recent: [...s.recent] }));

// לבדיקות בלבד
const reset = () => sources.clear();

module.exports = { record, snapshot, reset };
