// רצפים בסטטיסטיקה של שחקן.
//
// פגיעה = משחק שקיבל עליו נקודות: בול או כיוון נכון (ניצחון/תיקו/הפסד).
// בול = תוצאה מדויקת. הסדר לפי מועד המשחק (fullDate). עד עכשיו הסדר היה לפי
// הזמן שבו המשחק נוסף לאפליקציה, ומשחק שהמנהל הוסיף לשבוע באיחור נכנס
// לרצף במקום הלא נכון. משחק בלי מועד נופל חזרה לזמן ההוספה.
const dir = (a, b) => (a > b ? 'home' : a < b ? 'away' : 'draw');
const timeOf = (m) => new Date(m.fullDate || m.createdAt || 0).getTime();

const computeStreaks = (items) => {
  const sorted = (items || [])
    .filter((x) => x.match && x.match.result && x.match.result.team1Goals != null && x.match.result.team2Goals != null
      && x.prediction && x.prediction.team1Goals != null && x.prediction.team2Goals != null)
    .sort((a, b) => timeOf(a.match) - timeOf(b.match)
      || new Date(a.match.createdAt || 0) - new Date(b.match.createdAt || 0));

  let currentHitStreak = 0, bestHitStreak = 0, currentExactStreak = 0, bestExactStreak = 0;
  for (const { match, prediction: p } of sorted) {
    const r = match.result;
    const exact = p.team1Goals === r.team1Goals && p.team2Goals === r.team2Goals;
    const hit = exact || dir(p.team1Goals, p.team2Goals) === dir(r.team1Goals, r.team2Goals);
    currentHitStreak = hit ? currentHitStreak + 1 : 0;
    currentExactStreak = exact ? currentExactStreak + 1 : 0;
    bestHitStreak = Math.max(bestHitStreak, currentHitStreak);
    bestExactStreak = Math.max(bestExactStreak, currentExactStreak);
  }
  return { bestHitStreak, currentHitStreak, bestExactStreak, currentExactStreak };
};

module.exports = { computeStreaks };
