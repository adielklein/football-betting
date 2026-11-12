// ערוצי השידור הישראליים של המשחקים, מ-365.
//
// לכל משחק בקשה אחת לנתיב של משחק בודד, בזה אחר זה עם הפסקה קצרה - לא
// להציף את הספק. רץ כל שלוש שעות על משחקים מהימים הקרובים, וגם פעם אחת
// אחרי עליית השרת, כך שגם שבוע שכבר באוויר מתעדכן מיד אחרי פריסה.
const Match = require('../models/Match');
const { fetchTvChannels } = require('./scores365Api');

const PAUSE_MS = 350;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const names = (list) => (list || []).map((c) => c.name).join('|');

const is365 = { externalProvider: '365scores', externalId: { $nin: [null, ''] } };

// מעדכן רשימת משחקים. תשובה ריקה לא מוחקת ערוץ שכבר נמצא: 365 מחזירים
// לפעמים תשובה חלקית, ועדיף ערוץ ידוע מאשר כרטיס שמהבהב
const syncTvForMatches = async (matches) => {
  const summary = { checked: 0, withTv: 0, updated: 0, failed: 0 };
  for (const m of matches) {
    summary.checked++;
    try {
      const channels = await fetchTvChannels(m.externalId);
      const keep = channels.length === 0 && (m.tvChannels || []).length > 0;
      const next = keep ? m.tvChannels : channels;
      if (next.length > 0) summary.withTv++;
      const set = { tvCheckedAt: new Date() };
      if (names(next) !== names(m.tvChannels)) {
        set.tvChannels = next;
        summary.updated++;
      }
      await Match.updateOne({ _id: m._id }, { $set: set });
    } catch (err) {
      summary.failed++;
      console.warn(`📺 [TV] ${m.team1} - ${m.team2}: ${err.message}`);
    }
    await sleep(PAUSE_MS);
  }
  return summary;
};

// משחקים מהימים הקרובים שלא נבדקו לאחרונה, ומשחקים מהשבועיים האחרונים
// שמעולם לא נבדקו (השלמה חד-פעמית - הערוץ מוצג גם אחרי המשחק)
const syncUpcomingTv = async ({ days = 10, backDays = 14, maxAgeHours = 2.5 } = {}) => {
  const now = Date.now();
  const recent = new Date(now - 3 * 3600e3);
  const matches = await Match.find({
    ...is365,
    $or: [
      {
        fullDate: { $gte: recent, $lte: new Date(now + days * 864e5) },
        $or: [{ tvCheckedAt: null }, { tvCheckedAt: { $lt: new Date(now - maxAgeHours * 3600e3) } }]
      },
      { fullDate: { $gte: new Date(now - backDays * 864e5), $lt: recent }, tvCheckedAt: null }
    ]
  }, 'externalId team1 team2 tvChannels').lean();
  if (matches.length === 0) return { checked: 0, withTv: 0, updated: 0, failed: 0 };
  const summary = await syncTvForMatches(matches);
  console.log(`📺 [TV] checked ${summary.checked}, with channel ${summary.withTv}, updated ${summary.updated}, failed ${summary.failed}`);
  return summary;
};

// כל משחקי שבוע מסוים, גם כאלה שכבר שוחקו - מכפתור המנהל
const syncWeekTv = async (weekId) => {
  const matches = await Match.find({ ...is365, weekId }, 'externalId team1 team2 tvChannels').lean();
  return syncTvForMatches(matches);
};

module.exports = { syncTvForMatches, syncUpcomingTv, syncWeekTv };
