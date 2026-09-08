// שליפת לוגים מ-Render, לחיפוש הימור שנדחה.
//
// כשהשרת דוחה שמירה הוא לא כותב כלום למסד - הבדיקה קורית לפני הכתיבה.
// העקבה היחידה היא שורת הדיבאג בראש routes/bets.js, שמדפיסה את גוף
// הבקשה עוד לפני בדיקת הנעילה. היא נמצאת רק בלוגים של Render.
//
// הרצה:
//   RENDER_API_KEY=rnd_xxx node tools/renderLogs.js "68e5506835963d547b5e6533"
//
// המפתח נוצר ב-Render: Account Settings → API Keys → Create API Key.
// אין צורך לשמור אותו בקובץ; משתנה סביבה לריצה אחת מספיק.

const KEY = process.env.RENDER_API_KEY;
const NEEDLE = process.argv[2] || '';
const HOURS = Number(process.argv[3] || 6);

if (!KEY) {
  console.error('חסר RENDER_API_KEY. ראו את ההוראות בראש הקובץ.');
  process.exit(1);
}

const api = async (path, params = {}) => {
  const url = new URL(`https://api.render.com/v1${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (Array.isArray(v)) v.forEach((x) => url.searchParams.append(k, x));
    else if (v != null) url.searchParams.set(k, v);
  });
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${KEY}`, Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`Render API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return res.json();
};

(async () => {
  // 1. איתור השירות
  const services = await api('/services', { limit: 50 });
  const list = services.map((s) => s.service || s);
  const backend = list.find((s) => /football-betting-backend/.test(s.name || ''));

  if (!backend) {
    console.log('שירותים בחשבון:');
    list.forEach((s) => console.log('  -', s.name, '|', s.id));
    throw new Error('לא נמצא שירות בשם football-betting-backend');
  }
  console.log('שירות:', backend.name, '|', backend.id);

  // 2. שליפת הלוגים
  const end = new Date();
  const start = new Date(end.getTime() - HOURS * 60 * 60 * 1000);
  console.log(`חלון: ${start.toLocaleString('he-IL')} → ${end.toLocaleString('he-IL')}`);
  console.log(NEEDLE ? `מסנן: "${NEEDLE}"` : 'ללא סינון');
  console.log('');

  const params = {
    ownerId: backend.ownerId,
    resource: [backend.id],
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    limit: 1000
  };
  if (NEEDLE) params.text = [NEEDLE];

  const data = await api('/logs', params);
  const logs = data.logs || data.items || [];

  if (logs.length === 0) {
    console.log('לא נמצאו שורות תואמות.');
    console.log('');
    console.log('אפשרויות: הבקשה לא נשלחה מעולם (הטופס מולא בלי ללחוץ שמור),');
    console.log('הלוגים כבר לא נשמרים לחלון הזמן הזה, או שהמסנן צר מדי.');
    return;
  }

  console.log(`נמצאו ${logs.length} שורות:`);
  console.log('');
  for (const l of logs) {
    const t = new Date(l.timestamp).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
    console.log(`[${t}] ${String(l.message || '').trim()}`);
  }
})().catch((e) => {
  console.error('שגיאה:', e.message);
  process.exit(1);
});
