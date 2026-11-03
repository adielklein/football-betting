// פעולות על שבוע שמופעלות מכמה מסכים (מסך "היום", פס השלבים). במקום אחד,
// כדי שכפתור "סנכרן תוצאות" יתנהג בדיוק אותו דבר בכל מקום.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const postJson = async (path, body) => {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {})
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `שגיאה ${res.status}`);
  return json;
};

// משיכת תוצאות מ-365, ואם משהו התעדכן - חישוב ניקוד. המשחקים שהתעדכנו
// עוברים לחישוב, ולכן התראות "בול" וסוף משחק יוצאות כרגיל
export const syncResults = async (weekId) => {
  const sync = await postJson(`/external/sync-results/${weekId}`);
  if (sync.updated > 0) {
    await postJson(`/scores/calculate/${weekId}`, { matchIds: sync.updatedMatchIds || [] });
  }
  return sync;
};

// חישוב מחדש לפי התוצאות השמורות. בלי matchIds - ולכן בלי התראות
export const recalcSilently = (weekId) => postJson(`/scores/calculate/${weekId}`, {});

// תזכורת למי שעוד לא סיים להמר. השרת מסנן בעצמו מי שכבר סיים או מוחרג
export const nudgePending = (weekId) => postJson(`/notifications/nudge/${weekId}`, {});

export const fetchToday = async () => {
  const res = await fetch(`${API_URL}/admin/today`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `שגיאה ${res.status}`);
  return json;
};

export const fetchWeekStatus = async (weekId) => {
  const res = await fetch(`${API_URL}/admin/week/${weekId}`);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `שגיאה ${res.status}`);
  return json;
};
