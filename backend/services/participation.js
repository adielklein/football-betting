// חישוב השתתפות אמיתית.
//
// המדד הקודם היה שגוי בשלושה מקומות בו-זמנית, וכתוצאה מכך הראה כמעט לכל
// השחקנים 98% בעוד ההשתתפות בפועל נעה בין 15% ל-98%:
//
// 1. המונה ספר רשומות ניקוד. רשומת ניקוד נוצרת לכל משתמש בכל חישוב, גם
//    למי שלא הימר אף הימור - 277 מתוך 726 הרשומות היו כאלה.
// 2. המכנה ספר את כל השבועות אי פעם, גם למי שהצטרף אחרי חמישים מהם.
// 3. החרגות חודש לא נלקחו בחשבון בכלל.
//
// ההגדרה כאן: מתוך השבועות שבהם השחקן היה יכול להמר, בכמה הוא באמת הימר.

// שבוע נחשב "זמין" לשחקן אם יש בו משחקים, הוא נוצר אחרי שהשחקן הצטרף,
// והשחקן לא הוחרג מאותו חודש.
//
// יוצא מן הכלל אחד וחשוב: שבוע שהשחקן בפועל הימר בו נחשב תמיד זמין. יש
// בנתונים שחקנים שהימרו בחודש שהוחרגו ממנו, ובלעדי החריג הזה הם היו
// מקבלים יותר משבועות שהימרו בהם מאשר שבועות זמינים - כלומר מעל 100%.
const isAvailable = (week, { joinedAt, excludedMonths, betWeekIds }) => {
  if (betWeekIds.has(String(week._id))) return true;
  if (!week.hasMatches) return false;
  if (joinedAt && week.createdAt && new Date(week.createdAt) < new Date(joinedAt)) return false;
  return !excludedMonths.has(`${week.month}|${week.season}`);
};

/**
 * @param players  [{ _id, name, createdAt }]
 * @param weeks    [{ _id, month, season, createdAt, hasMatches }]
 * @param bets     [{ userId, weekId }]
 * @param exclusions [{ userId, month, season }]
 */
const buildParticipation = (players, weeks, bets, exclusions = []) => {
  const betsByUser = new Map();
  for (const b of bets) {
    const uid = String(b.userId);
    if (!betsByUser.has(uid)) betsByUser.set(uid, new Set());
    betsByUser.get(uid).add(String(b.weekId));
  }

  const exclByUser = new Map();
  for (const e of exclusions) {
    const uid = String(e.userId);
    if (!exclByUser.has(uid)) exclByUser.set(uid, new Set());
    exclByUser.get(uid).add(`${e.month}|${e.season}`);
  }

  return players.map((p) => {
    const uid = String(p._id);
    const betWeekIds = betsByUser.get(uid) || new Set();
    const excludedMonths = exclByUser.get(uid) || new Set();
    const ctx = { joinedAt: p.createdAt, excludedMonths, betWeekIds };

    const available = weeks.filter((w) => isAvailable(w, ctx));
    const played = available.filter((w) => betWeekIds.has(String(w._id))).length;

    return {
      userId: uid,
      name: p.name,
      weeksPlayed: played,
      weeksAvailable: available.length,
      // אחוז לתצוגה, אבל המספרים הגולמיים מוחזרים גם הם: "28 מתוך 48"
      // אומר הרבה יותר מ-58%, ומאפשר למי שרוצה לבדוק את המספר בעצמו.
      participation: available.length > 0 ? Math.round((played / available.length) * 100) : 0,
      // שבועות שהיו זמינים והשחקן פשוט לא הימר בהם
      weeksMissed: available.length - played
    };
  });
};

module.exports = { buildParticipation, isAvailable };
