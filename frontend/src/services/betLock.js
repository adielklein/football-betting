// מתי נסגרים ההימורים - מראה של backend/services/betLock.js (חייבים להתאים).
//   'match' - כל משחק נסגר בדיוק בשעת הפתיחה שלו (ברירת המחדל לשבוע חדש)
//   'week'  - כל השבוע נסגר יחד ב-lockTime (שבוע בלי השדה = השיטה הישנה)
// משחק בלי שעה במצב 'match' נסגר עם המשחק הראשון של השבוע.

export const lockModeOf = (week) => (week && week.lockMode === 'match' ? 'match' : 'week');

export const kickoffOf = (match) => {
  if (!match || !match.fullDate) return null;
  const t = new Date(match.fullDate).getTime();
  return Number.isFinite(t) ? t : null;
};

const ms = (d) => (d ? new Date(d).getTime() : null);

export const matchLockAt = (week, match, weekMatches = []) => {
  if (lockModeOf(week) === 'week') return ms(week?.lockTime);
  const own = kickoffOf(match);
  if (own != null) return own;
  const kicks = weekMatches.map(kickoffOf).filter((t) => t != null);
  if (kicks.length) return Math.min(...kicks);
  return ms(week.firstLockAt) ?? ms(week.lockTime);
};

export const isMatchLocked = (week, match, weekMatches = [], now = Date.now()) => {
  if (!week) return false;
  if (lockModeOf(week) === 'week' && week.locked) return true;
  const at = matchLockAt(week, match, weekMatches);
  return at != null && now >= at;
};

// מתי ננעל המשחק הראשון - מכאן השבוע מופיע ב"כל ההימורים"
export const weekFirstLockAt = (week) =>
  lockModeOf(week) === 'match' ? (ms(week?.firstLockAt) ?? ms(week?.lockTime)) : ms(week?.lockTime);

// האם כבר אפשר לראות הימורים של אחרים בשבוע (לפחות משחק אחד ננעל)
export const weekRevealed = (week, now = Date.now()) => {
  if (!week || !week.active) return false;
  if (week.locked) return true;
  const at = weekFirstLockAt(week);
  return at != null && now >= at;
};

// המשחק הבא שננעל (ממשחקים שעוד פתוחים), או null
export const nextLockAt = (week, weekMatches = [], now = Date.now()) => {
  const ats = weekMatches.map((m) => matchLockAt(week, m, weekMatches)).filter((t) => t != null && t > now);
  return ats.length ? Math.min(...ats) : null;
};
