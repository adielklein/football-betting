// שומר על השבוע את זמני הנעילה שנגזרים מהמשחקים, במצב "נעילה לפי משחק"
// (services/betLock.js): firstLockAt = המשחק הראשון, lockTime = האחרון.
// נקרא בהפעלת שבוע ובכל הוספה/עדכון/מחיקה של משחק, וגם ב-cron ליתר ביטחון.

const Week = require('../models/Week');
const Match = require('../models/Match');
const { deriveWeekLocks, lockModeOf } = require('./betLock');

const syncWeekLocks = async (weekId) => {
  if (!weekId) return null;
  const week = await Week.findById(weekId).lean();
  if (!week || lockModeOf(week) !== 'match') return null;
  const matches = await Match.find({ weekId }, 'fullDate').lean();
  const d = deriveWeekLocks(week, matches);
  if (!d) return null;
  const set = { firstLockAt: d.firstLockAt, lockTime: d.lockTime };
  // משחק שנוסף אחרי שהשבוע ננעל פותח אותו מחדש עד הפתיחה שלו
  if (week.locked && d.lockTime.getTime() > Date.now()) set.locked = false;
  const changed = String(week.firstLockAt && new Date(week.firstLockAt).getTime()) !== String(d.firstLockAt.getTime()) ||
    String(week.lockTime && new Date(week.lockTime).getTime()) !== String(d.lockTime.getTime()) || set.locked === false;
  if (changed) await Week.updateOne({ _id: weekId }, { $set: set });
  return set;
};

// כל השבועות הפעילים במצב משחק
const syncAllActiveWeekLocks = async () => {
  const weeks = await Week.find({ active: true, lockMode: 'match' }, '_id').lean();
  for (const w of weeks) await syncWeekLocks(w._id);
};

module.exports = { syncWeekLocks, syncAllActiveWeekLocks };
