// חישוב הניקוד להימור בודד. זו הלוגיקה המרכזית של האפליקציה, ולכן היא יושבת
// במודול נפרד בלי תלות במסד או ב-express - כדי שאפשר יהיה לבדוק אותה ישירות
// (ראה services/scoring.test.js).
//
// ללא יחסים: תוצאה מדויקת = 3, כיוון נכון = 1.
// עם יחסים:  תוצאה מדויקת = היחס * 2/3, כיוון נכון = היחס / 3 (מעוגל לעשירית).
// היחס שנלקח הוא זה שמתאים לתוצאה שקרתה בפועל, לא לזו שהמהמר ניחש.

const outcomeOf = (team1Goals, team2Goals) =>
  team1Goals > team2Goals ? 'home' : team1Goals < team2Goals ? 'away' : 'draw';

const roundToTenth = (n) => Math.round(n * 10) / 10;

function calculateMatchPoints(prediction, result, odds) {
  const predTeam1 = prediction.team1Goals;
  const predTeam2 = prediction.team2Goals;
  const resultTeam1 = result.team1Goals;
  const resultTeam2 = result.team2Goals;

  const predOutcome = outcomeOf(predTeam1, predTeam2);
  const resultOutcome = outcomeOf(resultTeam1, resultTeam2);

  const isExact = predTeam1 === resultTeam1 && predTeam2 === resultTeam2;
  const isDirection = predOutcome === resultOutcome;

  // יחס 0 או חסר נחשב כ"אין יחסים" - ככה זה התנהג מאז ומתמיד
  const hasOdds = !!(odds && (odds.homeWin || odds.draw || odds.awayWin));

  if (!hasOdds) {
    if (isExact) return 3;
    if (isDirection) return 1;
    return 0;
  }

  // אם דווקא היחס של התוצאה שקרתה חסר, נופלים ל-1 כדי לא לאפס את המהמר
  let relevantOdd = 1;
  if (resultOutcome === 'home' && odds.homeWin) relevantOdd = odds.homeWin;
  else if (resultOutcome === 'draw' && odds.draw) relevantOdd = odds.draw;
  else if (resultOutcome === 'away' && odds.awayWin) relevantOdd = odds.awayWin;

  if (isExact) return roundToTenth((relevantOdd * 2) / 3);
  if (isDirection) return roundToTenth(relevantOdd / 3);
  return 0;
}

// "כמה קרוב היית" - המרחק בשערים בין הניחוש לתוצאה שקרתה.
//
// מרחק 0 הוא בול. מרחק 1 אומר ששער אחד, לכאן או לכאן, היה הופך את הניחוש
// לבול מדויק - וזה בדיוק הסיפור שמעניין את המהמר. המדד עובד גם כשהכיוון
// היה שגוי: ניחוש 1-1 מול תוצאה 2-1 הוא מרחק 1, אף שלא זיכה בכלום.
const goalDistance = (prediction, result) =>
  Math.abs(prediction.team1Goals - result.team1Goals) +
  Math.abs(prediction.team2Goals - result.team2Goals);

// כמה נקודות עלה למהמר הפער הזה: מה שהיה מקבל על בול, פחות מה שקיבל בפועל.
// מוחזר גם המרחק, כדי שאפשר יהיה לסנן "שער אחד" מ"שלושה שערים".
const nearMiss = (prediction, result, odds) => {
  const distance = goalDistance(prediction, result);
  const actual = calculateMatchPoints(prediction, result, odds);
  // הניקוד על בול תלוי בתוצאה שקרתה, ולכן מחושב מול התוצאה עצמה
  const ifExact = calculateMatchPoints(result, result, odds);
  return {
    distance,
    points: actual,
    pointsIfExact: ifExact,
    lost: roundToTenth(Math.max(0, ifExact - actual))
  };
};

module.exports = { calculateMatchPoints, outcomeOf, goalDistance, nearMiss };
