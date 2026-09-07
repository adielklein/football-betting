// "כמה קרוב היית" - ניתוח ההחמצות של שחקן.
//
// הרעיון: כמעט כל הימור שלא פגע הפסיד נקודות, אבל לא כולם באותה מידה. ניחוש
// שהיה שער אחד מבול הוא סיפור אחר לגמרי מניחוש שפספס בארבעה, וההבדל הזה
// נעלם לגמרי בטבלה שמראה רק את הסכום.
//
// המדד הוא מרחק בשערים בין הניחוש לתוצאה, והשאלה שנגזרת ממנו: כמה נקודות
// היו נוספות אילו אותו שער בודד היה נופל, ואיזה מקום בטבלה השבועית זה היה
// נותן.
//
// חשוב איך שואלים את שאלת המקום. לתת לשחקן את כל ההחמצות שלו בבת אחת בעוד
// היריבים נשארים עם הניקוד האמיתי שלהם זה תרחיש נדיב מדי - בבדיקה על
// הנתונים האמיתיים הוא הפך כל אחד מ-13 השחקנים ל"היה מסיים ראשון", וטענה
// שנכונה לכולם לא אומרת כלום. לכן הכותרת נשענת על משחק בודד: מה ההחמצה
// הזאת, לבדה, עלתה במקומות.

const { nearMiss } = require('./scoring');

// עד כמה רחוק עוד נחשב "קרוב". שני שערים זה כבר לא סיפור, זה ניחוש אחר.
const NEAR_DISTANCE = 1;

const round1 = (n) => Math.round(n * 10) / 10;

// המקום בטבלה עבור ניקוד נתון, כשאר הניקודים ידועים. שוויון מקבל את
// המקום הגבוה מבין השניים, כמו בכל טבלת ליגה.
const rankFor = (score, otherScores) =>
  otherScores.filter((s) => s > score).length + 1;

/**
 * @param bets         הימורים של השחקן, כל אחד עם match (כולל result ו-odds) ו-weekId
 * @param weeklyRivals מפה weekId -> מערך ניקודים שבועיים של שאר השחקנים
 */
const buildNearMissReport = (bets, weeklyRivals = new Map()) => {
  const misses = [];
  const weekTotals = new Map(); // weekId -> { actual, potential, nearCount, weekName }

  for (const bet of bets) {
    const match = bet.match;
    const pred = bet.prediction;
    if (!match?.result || match.result.team1Goals == null || match.result.team2Goals == null) continue;
    if (!pred || pred.team1Goals == null || pred.team2Goals == null) continue;

    const nm = nearMiss(pred, match.result, match.odds);
    const weekId = String(bet.weekId || '');

    if (!weekTotals.has(weekId)) {
      weekTotals.set(weekId, { weekId, weekName: bet.weekName || '', actual: 0, potential: 0, nearCount: 0 });
    }
    const week = weekTotals.get(weekId);
    week.actual += nm.points;
    // "מה היה קורה" סופר רק החמצות של שער אחד. הרחבה מעבר לזה הופכת את
    // התרחיש לפנטזיה ולא לכמעט-שקרה.
    week.potential += nm.distance <= NEAR_DISTANCE ? nm.pointsIfExact : nm.points;
    if (nm.distance <= NEAR_DISTANCE && nm.lost > 0) week.nearCount++;

    if (nm.distance === 0 || nm.lost === 0) continue;

    misses.push({
      matchId: String(match._id || ''),
      team1: match.team1,
      team2: match.team2,
      weekId,
      weekName: bet.weekName || '',
      predicted: `${pred.team1Goals}-${pred.team2Goals}`,
      actual: `${match.result.team1Goals}-${match.result.team2Goals}`,
      distance: nm.distance,
      points: round1(nm.points),
      pointsIfExact: round1(nm.pointsIfExact),
      lost: nm.lost
    });
  }

  const near = misses.filter((m) => m.distance <= NEAR_DISTANCE);

  // השפעת כל החמצה בנפרד על המקום באותו שבוע
  for (const m of near) {
    const week = weekTotals.get(m.weekId);
    const rivals = weeklyRivals.get(m.weekId) || [];
    const withThisOne = week.actual - m.points + m.pointsIfExact;

    m.rankBefore = rankFor(week.actual, rivals);
    m.rankIfLanded = rankFor(withThisOne, rivals);
    m.rankGain = Math.max(0, m.rankBefore - m.rankIfLanded);
  }

  const weeks = [...weekTotals.values()]
    .filter((w) => w.nearCount > 0)
    .map((w) => {
      const rivals = weeklyRivals.get(w.weekId) || [];
      return {
        weekId: w.weekId,
        weekName: w.weekName,
        actual: round1(w.actual),
        potential: round1(w.potential),
        lost: round1(Math.max(0, w.potential - w.actual)),
        nearCount: w.nearCount,
        actualRank: rankFor(w.actual, rivals),
        potentialRank: rankFor(w.potential, rivals)
      };
    })
    .sort((a, b) => b.lost - a.lost);

  // הכותרת: ההחמצה הבודדת שעלתה הכי הרבה מקומות. בשוויון - זו שעלתה
  // יותר נקודות.
  const biggestRankMiss = near
    .filter((m) => m.rankGain > 0)
    .sort((a, b) => b.rankGain - a.rankGain || b.lost - a.lost)[0] || null;

  return {
    lostToOneGoal: round1(near.reduce((sum, m) => sum + m.lost, 0)),
    nearCount: near.length,
    totalMisses: misses.length,
    biggest: [...near].sort((a, b) => b.lost - a.lost).slice(0, 8),
    weeks: weeks.slice(0, 10),
    biggestRankMiss
  };
};

module.exports = { buildNearMissReport, rankFor, NEAR_DISTANCE };
