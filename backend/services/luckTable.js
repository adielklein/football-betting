// טבלת חוסר המזל: אצל מי שער בודד עלה הכי הרבה.
//
// למה זה החליף את "מה זה היה עושה לטבלה". הגרסה הקודמת נתנה לשחקן את כל
// ההחמצות שלו בעוד כל היריבים נשארים עם הניקוד האמיתי - תרחיש חד-צדדי
// שהעלה כמעט כל אחד למקום הראשון. טענה שנכונה לכולם לא אומרת כלום.
//
// כאן כולם מקבלים בדיוק את אותו יחס, ולכן יש מקום אחד אמיתי לכל שחקן.
//
// הדירוג לפי קצב ולא לפי סכום. מספר ההימורים נע כאן בין 52 ל-348, ודירוג
// לפי הסכום המוחלט היה בעיקר מדרג ותק: מי שהימר יותר בהכרח החמיץ יותר.
// הקצב עונה על השאלה האמיתית - אצל מי שער בודד עלה הכי הרבה - ובנתונים
// האמיתיים הוא מייצר סדר שונה לגמרי, כולל שחקן שהוא ראשון בקצב ורק
// שנים-עשר בסכום.

const { nearMiss } = require('./scoring');
const { NEAR_DISTANCE } = require('./nearMissReport');

// מתחת לזה הקצב רועש מדי - כמה הימורים בודדים יכולים לזרוק אותו לכל כיוון
const MIN_BETS_FOR_RANK = 20;

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * @param bets    כל ההימורים המוכרעים, עם userId ו-match (כולל result ו-odds)
 * @param players [{ _id, name }] - שחקנים בלבד, בלי מנהלים
 */
const buildLuckTable = (bets, players) => {
  const byUser = new Map(
    players.map((p) => [String(p._id), {
      userId: String(p._id),
      name: p.name,
      bets: 0,
      lost: 0,
      nearCount: 0,
      points: 0
    }])
  );

  for (const bet of bets) {
    const row = byUser.get(String(bet.userId));
    if (!row) continue; // מנהל, או משתמש שנמחק

    const match = bet.match;
    const pred = bet.prediction;
    if (!match?.result || match.result.team1Goals == null || match.result.team2Goals == null) continue;
    if (!pred || pred.team1Goals == null || pred.team2Goals == null) continue;

    const nm = nearMiss(pred, match.result, match.odds);
    row.bets++;
    row.points += nm.points;
    if (nm.distance <= NEAR_DISTANCE && nm.lost > 0) {
      row.lost += nm.lost;
      row.nearCount++;
    }
  }

  const rows = [...byUser.values()]
    .filter((r) => r.bets > 0)
    .map((r) => ({
      ...r,
      lost: round1(r.lost),
      points: round1(r.points),
      lostPerBet: round2(r.lost / r.bets),
      // אחוז ההימורים שהיו שער אחד מבול - הסיפור באחוזים, לא בנקודות
      nearRate: Math.round((r.nearCount / r.bets) * 100),
      ranked: r.bets >= MIN_BETS_FOR_RANK
    }))
    .sort((a, b) => {
      // מי שאין לו מספיק הימורים יורד לתחתית, בלי מקום
      if (a.ranked !== b.ranked) return a.ranked ? -1 : 1;
      return b.lostPerBet - a.lostPerBet || b.lost - a.lost;
    });

  let rank = 0;
  rows.forEach((r) => { r.rank = r.ranked ? ++rank : null; });
  return rows;
};

module.exports = { buildLuckTable, MIN_BETS_FOR_RANK };
