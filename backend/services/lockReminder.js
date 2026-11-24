// תזכורת לפני נעילת שבוע.
//
// האפליקציה הבטיחה את התזכורת הזו מאז ומתמיד - "תקבל תזכורת X שעות לפני
// נעילת השבוע" מוצג בהפעלת ההתראות, השדה נשמר לכל משתמש וניתן לשינוי
// במסך ההגדרות - אבל שום קוד מעולם לא שלח אותה.
//
// שלושה כללים שמונעים ממנה להפוך למטרד:
// 1. נשלחת פעם אחת לכל משתמש לכל שבוע. הסימון נשמר על השבוע עצמו, ולכן
//    הוא שורד גם הפעלה מחדש של השרת.
// 2. נשלחת רק למי שעדיין לא מילא את כל ההימורים. מי שכבר סיים לא צריך
//    תזכורת, והתראה מיותרת היא הדרך המהירה ביותר לגרום לאנשים לכבות
//    התראות לגמרי.
// 3. מכבדת את החרגות החודש, בדיוק כמו התראת פתיחת השבוע.

const Week = require('../models/Week');
const Match = require('../models/Match');
const Bet = require('../models/Bet');
const User = require('../models/User');
const MonthExclusion = require('../models/MonthExclusion');
const { lockModeOf, matchLockAt } = require('./betLock');

// שירות הפוש נטען בזמן השליחה ולא בראש הקובץ: הוא זורק כשאין מפתחות VAPID,
// ולכן טעינה מוקדמת שלו הייתה מונעת בדיקה של לוגיקת הבחירה בלי סביבת ייצור.
const sendToUsers = (...args) => require('./pushNotifications').sendNotificationToUsers(...args);

const HOUR_MS = 60 * 60 * 1000;

// לא מזכירים על שבוע שהנעילה שלו כבר עברה, וגם לא מוקדם מדי: אם משתמש
// ביקש 48 שעות והשבוע נפתח שבועיים מראש, אין טעם להזכיר לו מיד עם הפתיחה.
const MAX_LEAD_HOURS = 72;

const formatLock = (lockTime) =>
  new Date(lockTime).toLocaleString('he-IL', {
    timeZone: 'Asia/Jerusalem',
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });

// כמה שעות נשארו עד הנעילה, לניסוח ההודעה
const describeRemaining = (msLeft) => {
  const hours = msLeft / HOUR_MS;
  if (hours < 1) return `נשארו ${Math.max(1, Math.round(hours * 60))} דקות`;
  if (hours < 2) return 'נשארה שעה';
  return `נשארו ${Math.round(hours)} שעות`;
};

/**
 * מוצא למי צריך לשלוח תזכורת עכשיו. אינו שולח - רק בוחר.
 * מופרד כדי שאפשר יהיה לבדוק את הבחירה בלי להתריע לאף אחד.
 */
const selectRecipients = async (week, now = new Date()) => {
  const msLeft = new Date(week.lockTime).getTime() - now.getTime();
  if (msLeft <= 0) return { users: [], reason: 'הנעילה כבר עברה' };

  const matches = await Match.find({ weekId: week._id }, '_id').lean();
  if (matches.length === 0) return { users: [], reason: 'אין משחקים בשבוע' };

  const [candidates, exclusions, bets] = await Promise.all([
    User.find({
      role: { $nin: ['admin', 'bot'] },
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },
        { 'pushSettings.subscription': { $exists: true, $ne: null } }
      ]
    }, 'name pushSettings.hoursBeforeLock').lean(),
    MonthExclusion.find({ month: week.month, season: week.season }, 'userId').lean(),
    Bet.find({ weekId: week._id }, 'userId matchId').lean()
  ]);

  const excluded = new Set(exclusions.map((e) => String(e.userId)));
  const alreadyReminded = new Set((week.lockRemindersSent || []).map(String));

  const betCount = new Map();
  for (const b of bets) {
    const key = String(b.userId);
    betCount.set(key, (betCount.get(key) || 0) + 1);
  }

  const users = candidates.filter((u) => {
    const id = String(u._id);
    if (excluded.has(id)) return false;
    if (alreadyReminded.has(id)) return false;

    // כבר מילא את הכל - אין מה להזכיר לו
    if ((betCount.get(id) || 0) >= matches.length) return false;

    const leadHours = Math.min(u.pushSettings?.hoursBeforeLock || 2, MAX_LEAD_HOURS);
    return msLeft <= leadHours * HOUR_MS;
  });

  return { users, matchCount: matches.length, betCount, msLeft };
};

/**
 * מצב "נעילה לפי משחק": לכל שחקן, המועד הקרוב שבו ננעל משחק שהוא עוד לא
 * הימר עליו. תזכורת אחת לכל שחקן לכל מועד כזה (משחקי שבת ומשחקי ראשון
 * מקבלים כל אחד תזכורת משלו), נשמר על השבוע ב-matchRemindersSent.
 */
const selectMatchModeRecipients = async (week, now = new Date()) => {
  const matches = await Match.find({ weekId: week._id }, '_id fullDate').lean();
  if (matches.length === 0) return { users: [], reason: 'אין משחקים בשבוע' };
  const open = matches
    .map((m) => ({ id: String(m._id), at: matchLockAt(week, m, matches) }))
    .filter((m) => m.at != null && m.at > now.getTime());
  if (open.length === 0) return { users: [], reason: 'כל המשחקים התחילו' };

  const [candidates, exclusions, bets] = await Promise.all([
    User.find({
      role: { $nin: ['admin', 'bot'] },
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },
        { 'pushSettings.subscription': { $exists: true, $ne: null } }
      ]
    }, 'name pushSettings.hoursBeforeLock').lean(),
    MonthExclusion.find({ month: week.month, season: week.season }, 'userId').lean(),
    Bet.find({ weekId: week._id }, 'userId matchId').lean()
  ]);
  const excluded = new Set(exclusions.map((e) => String(e.userId)));
  const sent = new Set(week.matchRemindersSent || []);
  const betsBy = new Map();
  for (const b of bets) {
    const k = String(b.userId);
    if (!betsBy.has(k)) betsBy.set(k, new Set());
    betsBy.get(k).add(String(b.matchId));
  }

  const users = [];
  for (const u of candidates) {
    const id = String(u._id);
    if (excluded.has(id)) continue;
    const mine = betsBy.get(id) || new Set();
    const missing = open.filter((m) => !mine.has(m.id));
    if (missing.length === 0) continue;
    const deadline = Math.min(...missing.map((m) => m.at));
    const key = `${id}:${deadline}`;
    if (sent.has(key)) continue;
    const leadHours = Math.min(u.pushSettings?.hoursBeforeLock || 2, MAX_LEAD_HOURS);
    if (deadline - now.getTime() > leadHours * HOUR_MS) continue;
    users.push({ ...u, deadline, key, missingNow: missing.filter((m) => m.at === deadline).length });
  }
  return { users };
};

/**
 * סורק את השבועות הפתוחים ושולח תזכורות למי שהגיע זמנו.
 * @param dryRun כשדולק - מחשב ומדווח בלי לשלוח ובלי לסמן
 */
const runLockReminders = async ({ dryRun = false, now = new Date() } = {}) => {
  const weeks = await Week.find({
    active: true,
    locked: false,
    $or: [
      { lockMode: 'match', lockTime: { $gt: now } },
      { lockTime: { $gt: now, $lte: new Date(now.getTime() + MAX_LEAD_HOURS * HOUR_MS) } }
    ]
  });

  const report = [];

  for (const week of weeks) {
    if (lockModeOf(week) === 'match') {
      const { users } = await selectMatchModeRecipients(week, now);
      if (!users || users.length === 0) { report.push({ week: week.name, sent: 0 }); continue; }
      // קבוצה לפי מועד, כדי שהנוסח יתאים לכל אחד
      const byDeadline = new Map();
      for (const u of users) {
        if (!byDeadline.has(u.deadline)) byDeadline.set(u.deadline, []);
        byDeadline.get(u.deadline).push(u);
      }
      for (const [deadline, group] of byDeadline) {
        const remaining = describeRemaining(deadline - now.getTime());
        const title = '⏰ משחק נסגר בקרוב';
        const body = `${week.name} — ${remaining} עד שהמשחק הבא שלא הימרת עליו מתחיל (${formatLock(deadline)})`;
        report.push({ week: week.name, sent: group.length, users: group.map((u) => ({ name: u.name })), title, body });
        if (dryRun) continue;
        await sendToUsers(group.map((u) => u._id), title, body, { type: 'lock-reminder', weekId: String(week._id), url: '/' });
        await Week.updateOne({ _id: week._id }, { $addToSet: { matchRemindersSent: { $each: group.map((u) => u.key) } } });
        console.log(`⏰ [REMINDER] ${week.name}: נשלח ל-${group.length} שחקנים (${remaining}, נעילה לפי משחק)`);
      }
      continue;
    }

    const { users, matchCount, betCount, msLeft } = await selectRecipients(week, now);
    if (!users || users.length === 0) {
      report.push({ week: week.name, sent: 0 });
      continue;
    }

    const remaining = describeRemaining(msLeft);
    const title = '⏰ ההימורים ננעלים בקרוב';
    const body = `${week.name} — ${remaining} עד הנעילה (${formatLock(week.lockTime)})`;

    report.push({
      week: week.name,
      sent: users.length,
      users: users.map((u) => ({
        name: u.name,
        placed: betCount.get(String(u._id)) || 0,
        of: matchCount
      })),
      title,
      body
    });

    if (dryRun) continue;

    await sendToUsers(
      users.map((u) => u._id),
      title,
      body,
      { type: 'lock-reminder', weekId: String(week._id), url: '/' }
    );

    // הסימון נשמר מיד אחרי השליחה. במקרה הגרוע משתמש לא יקבל תזכורת
    // בגלל כשל כתיבה - וזה עדיף על פני לקבל אותה שוב ושוב בכל סריקה.
    await Week.updateOne(
      { _id: week._id },
      { $addToSet: { lockRemindersSent: { $each: users.map((u) => u._id) } } }
    );

    console.log(`⏰ [REMINDER] ${week.name}: נשלח ל-${users.length} שחקנים (${remaining})`);
  }

  return report;
};

module.exports = { runLockReminders, selectRecipients, selectMatchModeRecipients, describeRemaining, MAX_LEAD_HOURS };
