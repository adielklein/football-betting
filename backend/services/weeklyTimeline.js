// ציר הזמן השבועי של שחקן: ניקוד לכל שבוע וסכום רץ עד אליו.
//
// שני דברים שהיו שבורים כאן בעבר, ולכן הם מפורשים:
// 1. הסידור לפי מועד השבוע נעשה בקוד ולא בשאילתה. ל-Score אין createdAt של
//    השבוע, ולכן sort({'weekId.createdAt': 1}) לא עשה דבר והשבועות חזרו
//    בסדר שרירותי.
// 2. הסכום המצטבר מחושב כאן. totalScore שנשמר על הרשומה הוא הסך הכולל של
//    השחקן, זהה בכל השבועות, ולכן גרף מצטבר שנשען עליו יוצא שטוח.

const round1 = (n) => Math.round(n * 10) / 10;

const weekTime = (week) => {
  const at = week && week.createdAt ? new Date(week.createdAt).getTime() : NaN;
  return Number.isFinite(at) ? at : Infinity; // שבוע בלי תאריך נדחף לסוף
};

function buildWeeklyTimeline(scores) {
  let running = 0;

  return (scores || [])
    .filter((s) => s && s.weekId)
    .slice()
    .sort((a, b) => weekTime(a.weekId) - weekTime(b.weekId))
    .map((s, i) => {
      const weeklyScore = round1(s.weeklyScore || 0);
      running += weeklyScore;
      return {
        weekId: String(s.weekId._id || s.weekId.id || ''),
        weekIndex: i + 1,
        weekName: s.weekId.name || '',
        month: s.weekId.month,
        season: s.weekId.season,
        weeklyScore,
        cumulativeScore: round1(running),
        totalScore: s.totalScore || 0,
      };
    });
}

module.exports = { buildWeeklyTimeline };
