// "התאום בהימורים": השחקן שמהמר הכי הרבה אותה תוצאה בדיוק כמוך.
//
// המדד הוא אחוז, לא ספירה: שחקן שמהמר כל שבוע יצבור יותר התאמות רק כי
// יש לו יותר משחקים משותפים איתך, גם אם הוא מהמר אחרת לגמרי. לכן סופרים
// מתוך המשחקים ששניכם הימרתם עליהם, ודורשים מינימום משחקים משותפים כדי
// ששני משחקים מקריים לא יהפכו מישהו ל"תאום" של 100%.
//
// הפונקציה מקבלת רק הימורים של שבועות נעולים - הסינון נעשה בנתיב. בשבוע
// פתוח ההשוואה הייתה חושפת מה אחרים הימרו לפני הנעילה.

const MIN_COMMON = 10;

const sameScore = (a, b) =>
  a.team1Goals === b.team1Goals && a.team2Goals === b.team2Goals;

const direction = (p) =>
  p.team1Goals > p.team2Goals ? 1 : p.team1Goals < p.team2Goals ? -1 : 0;

const validPrediction = (p) =>
  p && Number.isFinite(p.team1Goals) && Number.isFinite(p.team2Goals);

/**
 * @param myBets     [{ matchId, prediction }] - ההימורים של השחקן
 * @param otherBets  [{ userId, matchId, prediction }] - הימורים של אחרים על אותם משחקים
 * @param players    [{ _id, name }] - השחקנים שמותר להשוות אליהם (בלי אדמינים)
 */
function buildBettingTwins(myBets, otherBets, players, { minCommon = MIN_COMMON, limit = 3 } = {}) {
  const mine = new Map();
  for (const b of myBets || []) {
    if (validPrediction(b.prediction)) mine.set(String(b.matchId), b.prediction);
  }

  const nameById = new Map((players || []).map((p) => [String(p._id), p.name]));
  const tally = new Map();

  for (const b of otherBets || []) {
    const uid = String(b.userId);
    if (!nameById.has(uid)) continue; // אדמין, משתמש שנמחק או השחקן עצמו
    const my = mine.get(String(b.matchId));
    if (!my || !validPrediction(b.prediction)) continue;

    if (!tally.has(uid)) tally.set(uid, { common: 0, same: 0, sameDirection: 0 });
    const t = tally.get(uid);
    t.common++;
    if (sameScore(my, b.prediction)) t.same++;
    if (direction(my) === direction(b.prediction)) t.sameDirection++;
  }

  const rows = [...tally.entries()]
    .filter(([, t]) => t.common >= minCommon)
    .map(([userId, t]) => ({
      userId,
      name: nameById.get(userId),
      common: t.common,
      same: t.same,
      sameRate: Math.round((t.same / t.common) * 100),
      directionRate: Math.round((t.sameDirection / t.common) * 100),
    }))
    // אחוז מדויק (לא מעוגל) קובע, ובתיקו - מי שיש לו יותר התאמות בפועל
    .sort((a, b) => (b.same / b.common) - (a.same / a.common) || b.same - a.same || b.common - a.common);

  return { minCommon, twins: rows.slice(0, limit) };
}

module.exports = { buildBettingTwins, MIN_COMMON };
