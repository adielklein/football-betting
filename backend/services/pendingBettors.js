// מי עדיין לא סיים להמר בשבוע נתון.
//
// "רשום לחודש" נקבע לפי MonthExclusion, שהיא רשימת מי שאינו משתתף בחודש
// מסוים. שחקן שהוחרג מהחודש של השבוע לא אמור לקבל דחיפה להמר בו - הוא
// בכלל לא בתחרות החודש הזה, וההתראה תיראה לו כטעות.
//
// הבחירה מופרדת מהשליחה בכוונה: אפשר להסתכל על הרשימה בלי לשלוח כלום.

/**
 * מסווג את השחקנים של שבוע לשלוש קבוצות.
 *
 * @param players    [{ _id, name, pushSettings }] - שחקנים בלבד, בלי מנהלים
 * @param matchIds   מזהי המשחקים בשבוע
 * @param bets       [{ userId, matchId }] - ההימורים של אותו שבוע
 * @param exclusions [{ userId }] - המוחרגים מהחודש של השבוע
 */
const classifyBettors = (players, matchIds, bets, exclusions = []) => {
  const total = matchIds.length;
  const excluded = new Set(exclusions.map((e) => String(e.userId)));

  // הימור אחד יכול להישמר יותר מפעם אחת לאותו משחק, ולכן סופרים משחקים
  // ייחודיים ולא שורות
  const placedByUser = new Map();
  const wanted = new Set(matchIds.map(String));
  for (const b of bets) {
    const uid = String(b.userId);
    const mid = String(b.matchId);
    if (!wanted.has(mid)) continue;
    if (!placedByUser.has(uid)) placedByUser.set(uid, new Set());
    placedByUser.get(uid).add(mid);
  }

  const pending = [];
  const complete = [];
  const notRegistered = [];

  for (const p of players) {
    const uid = String(p._id);
    const placed = placedByUser.get(uid)?.size || 0;
    const subs = [
      ...(Array.isArray(p.pushSettings?.subscriptions) ? p.pushSettings.subscriptions : []),
      ...(p.pushSettings?.subscription ? [p.pushSettings.subscription] : [])
    ];

    const row = {
      userId: uid,
      name: p.name,
      placed,
      of: total,
      missing: Math.max(0, total - placed),
      canBeNotified: !!p.pushSettings?.enabled && subs.length > 0,
      deviceCount: subs.length
    };

    if (excluded.has(uid)) notRegistered.push(row);
    else if (placed >= total && total > 0) complete.push(row);
    else pending.push(row);
  }

  // מי שלא התחיל בכלל קודם, ואז לפי כמה חסר לו
  const order = (a, b) => b.missing - a.missing || a.name.localeCompare(b.name, 'he');
  pending.sort(order);
  complete.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  notRegistered.sort((a, b) => a.name.localeCompare(b.name, 'he'));

  return {
    matchCount: total,
    pending,
    complete,
    notRegistered,
    // כמה מהחסרים בכלל אפשר להשיג בהתראה
    reachable: pending.filter((r) => r.canBeNotified).length
  };
};

// נוסח ההודעה. מזכיר כמה חסר, כי "לא הימרת" למי שמילא עשרה מתוך שלושה-עשר
// נשמע שגוי ומוריד את האמון בהתראות.
const nudgeMessage = (week, row) => {
  const body = row.placed === 0
    ? `${week.name} פתוח להימורים ועדיין לא הימרת`
    : `${week.name} — נשארו לך ${row.missing} משחקים מתוך ${row.of}`;
  return { title: '⚽ עוד לא סיימת להמר', body };
};

module.exports = { classifyBettors, nudgeMessage };
