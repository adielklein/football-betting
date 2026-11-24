// מתי נסגרים ההימורים - כלל אחד לשרת (ובמראה לאפליקציה, frontend/src/services/betLock.js).
//
// שני מצבים לשבוע (week.lockMode):
//   'match' - כל משחק נסגר בדיוק בשעת הפתיחה שלו. ברירת המחדל לשבוע חדש.
//   'week'  - כל השבוע נסגר יחד ב-lockTime (השיטה הישנה). שבוע בלי השדה
//             (כל מה שנוצר לפני השינוי) הוא 'week', כדי שכללים לא ישתנו
//             לשבוע שכבר רץ.
//
// משחק בלי שעת פתיחה (fullDate) במצב 'match' נסגר עם המשחק הראשון של
// השבוע, ואם אין לאף משחק שעה - ב-lockTime של השבוע.
//
// שדות שנגזרים מהמשחקים ונשמרים על השבוע (syncWeekLocks):
//   firstLockAt - המשחק הראשון ננעל: מכאן אפשר לראות הימורים של אחרים
//   lockTime    - במצב 'match': המשחק האחרון ננעל = כל השבוע סגור. כך כל
//                 מה שכבר בודק "השבוע נעול" (מסכים, cron) ממשיך לעבוד

const lockModeOf = (week) => (week && week.lockMode === 'match' ? 'match' : 'week');

const kickoffOf = (match) => {
  if (!match || !match.fullDate) return null;
  const t = new Date(match.fullDate).getTime();
  return Number.isFinite(t) ? t : null;
};

const ms = (d) => (d ? new Date(d).getTime() : null);

// מתי המשחק הזה ננעל (מילישניות), או null אם אין שום מועד ידוע
const matchLockAt = (week, match, weekMatches = []) => {
  if (lockModeOf(week) === 'week') return ms(week.lockTime);
  const own = kickoffOf(match);
  if (own != null) return own;
  const kicks = weekMatches.map(kickoffOf).filter((t) => t != null);
  if (kicks.length) return Math.min(...kicks);
  return ms(week.firstLockAt) ?? ms(week.lockTime);
};

// האם אפשר עדיין להמר על המשחק (לא כולל עקיפת מנהל - זה אצל הקורא)
const isMatchOpen = (week, match, weekMatches = [], now = Date.now()) => {
  if (!week || !week.active) return false;
  if (lockModeOf(week) === 'week' && week.locked) return false;
  const at = matchLockAt(week, match, weekMatches);
  if (at == null) return true;
  return now < at;
};

// האם המשחק כבר ננעל (זמן הנעילה עבר). שונה מ"לא פתוח": שבוע לא פעיל
// אינו פתוח, אבל גם לא ננעל - והימורים בו לא נחשפים
const isMatchLocked = (week, match, weekMatches = [], now = Date.now()) => {
  if (!week) return false;
  if (lockModeOf(week) === 'week' && week.locked) return true;
  const at = matchLockAt(week, match, weekMatches);
  return at != null && now >= at;
};

// firstLockAt / lockTime של השבוע לפי המשחקים (רק במצב 'match')
const deriveWeekLocks = (week, weekMatches = []) => {
  if (lockModeOf(week) === 'week') return null;
  const locks = weekMatches.map((m) => matchLockAt(week, m, weekMatches)).filter((t) => t != null);
  if (!locks.length) return null;
  return { firstLockAt: new Date(Math.min(...locks)), lockTime: new Date(Math.max(...locks)) };
};

// מה מותר לחשוף מהימורים של אחרים: הימור על משחק שעוד לא ננעל מוחזר בלי
// התוצאה שניחשו. viewerId = מי שמבקש; מנהל רואה הכל. bets עם matchId
// מאוכלס או מזהה; matchesById לפי מזהה
const redactBets = (bets, { week, matchesById, viewerId, isAdmin, now = Date.now() }) => {
  if (isAdmin) return bets;
  const weekMatches = [...matchesById.values()];
  return bets.map((b) => {
    const owner = String(b.userId?._id || b.userId || '');
    if (viewerId && owner === String(viewerId)) return b;
    const mid = String(b.matchId?._id || b.matchId || '');
    const match = matchesById.get(mid) || (b.matchId && b.matchId._id ? b.matchId : null);
    if (match && isMatchLocked(week, match, weekMatches, now)) return b;
    const copy = typeof b.toObject === 'function' ? b.toObject() : { ...b };
    delete copy.prediction;
    copy.hidden = true;
    return copy;
  });
};

module.exports = { lockModeOf, kickoffOf, matchLockAt, isMatchOpen, isMatchLocked, deriveWeekLocks, redactBets };
